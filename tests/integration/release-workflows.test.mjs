import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { parse, stringify } from "yaml";

import { afterEach, describe, expect, test } from "vitest";

import {
  createReleaseManifest,
  repositoryFromMetadata,
} from "../../scripts/generate-release-manifest.mjs";
import { plannedReleasePolicy } from "../../scripts/release-policy.mjs";
import {
  validateArtifactActionCompatibility,
  validateCandidateRecord,
  validateCiRunMetadata,
  validateCiWorkflow,
  validateExternalConfiguration,
  validateReleaseWorkflow,
  preparePagesSite,
  verifyPublishedStatic,
  originRepository,
  validateReleaseCheckout,
} from "../../scripts/verify-release-candidate.mjs";

const repositoryRoot = new URL("../..", import.meta.url).pathname;
const packageManifest = JSON.parse(
  await readFile(join(repositoryRoot, "package.json"), "utf8"),
);
const declaredRepository = repositoryFromMetadata(packageManifest.repository);

const sha = "a".repeat(64);
const candidateRecord = {
  schemaVersion: 2,
  artifactName: "afferent-release-candidate-0.1.0",
  source: {
    commit: "b".repeat(40),
    tag: "v0.1.0",
  },
  package: {
    name: "afferent",
    publication: "none",
    version: "0.1.0",
    tarball: "package/afferent-0.1.0.tgz",
    sha256: sha,
  },
  artifacts: [
    {
      path: "package/afferent-0.1.0.tgz",
      sha256: sha,
    },
    {
      path: "release-manifest.json",
      sha256: "c".repeat(64),
    },
  ],
  evidence: {
    checksums: "checksums.sha256",
    phase4: "evidence/phase4.json",
  },
};

const ciRunMetadata = {
  id: 123_456_789,
  path: ".github/workflows/ci.yml",
  event: "push",
  status: "completed",
  conclusion: "success",
  head_branch: "main",
  head_sha: "b".repeat(40),
  repository: {
    full_name: declaredRepository,
  },
  head_repository: {
    full_name: declaredRepository,
  },
};

const temporaryRoots = [];
const execFileAsync = promisify(execFile);

async function gitFixture() {
  const root = await mkdtemp(join(tmpdir(), "afferent-release-git-"));
  temporaryRoots.push(root);
  const git = async (...args) => {
    const result = await execFileAsync("git", args, {
      cwd: root,
      encoding: "utf8",
    });
    return result.stdout.trim();
  };
  await git("init", "--quiet");
  await git("config", "user.name", "Release fixture");
  await git("config", "user.email", "fixture@example.invalid");
  await git("config", "commit.gpgsign", "false");
  await git("config", "tag.gpgsign", "false");
  await git(
    "remote",
    "add",
    "origin",
    `https://github.com/${declaredRepository}.git`,
  );
  return { root, git };
}

describe("real Git release identity", () => {
  test("rejects insteadOf and pushInsteadOf rewrites to another host", async () => {
    for (const setting of ["insteadOf", "pushInsteadOf"]) {
      const { root, git } = await gitFixture();
      expect(await originRepository(root)).toBe(declaredRepository);
      await git(
        "config",
        `url.https://example.invalid/mirror/.${setting}`,
        "https://github.com/",
      );
      await expect(originRepository(root)).rejects.toThrow(
        /fetch and push destinations/iu,
      );
    }
  });

  test("checks all explicit fetch and push URLs", async () => {
    for (const setting of ["url", "pushurl"]) {
      const { root, git } = await gitFixture();
      if (setting === "pushurl") {
        await git(
          "config",
          "--add",
          "remote.origin.pushurl",
          `git@github.com:${declaredRepository}.git`,
        );
      }
      expect(await originRepository(root)).toBe(declaredRepository);
      await git(
        "config",
        "--add",
        `remote.origin.${setting}`,
        "https://github.com/attacker/afferent.git",
      );
      await expect(originRepository(root)).rejects.toThrow(
        /fetch and push destinations/iu,
      );
    }
  });

  test("accepts lightweight and annotated tags only at the clean candidate commit", async () => {
    const { root, git } = await gitFixture();
    await writeFile(join(root, "fixture.txt"), "candidate");
    await git("add", "fixture.txt");
    await git("commit", "--quiet", "-m", "fixture candidate");
    const commit = await git("rev-parse", "HEAD");
    await git("tag", "v0.1.0-lightweight");
    await git("tag", "-a", "v0.1.0", "-m", "annotated release");
    expect(await git("rev-parse", "refs/tags/v0.1.0")).not.toBe(commit);
    await expect(
      validateReleaseCheckout(commit, "v0.1.0-lightweight", root),
    ).resolves.toBeUndefined();
    await expect(
      validateReleaseCheckout(commit, "v0.1.0", root),
    ).resolves.toBeUndefined();
    await writeFile(join(root, "fixture.txt"), "changed");
    await expect(
      validateReleaseCheckout(commit, "v0.1.0", root),
    ).rejects.toThrow(/clean checkout/iu);
    await git("add", "fixture.txt");
    await git("commit", "--quiet", "-m", "next candidate");
    await expect(
      validateReleaseCheckout(await git("rev-parse", "HEAD"), "v0.1.0", root),
    ).rejects.toThrow(/tag, commit/iu);
  });
});

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true })),
  );
});

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }),
  );
  return nested.flat().sort();
}

async function createFinalCandidate() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-static-test-"));
  temporaryRoots.push(temporaryRoot);
  const candidateRoot = join(temporaryRoot, "release-candidate-fixture");
  const tarball = join(candidateRoot, "package/afferent-0.1.0.tgz");
  await Promise.all([
    mkdir(join(candidateRoot, "docs"), { recursive: true }),
    mkdir(join(candidateRoot, "evidence"), { recursive: true }),
    mkdir(join(candidateRoot, "package"), { recursive: true }),
  ]);
  await Promise.all([
    cp(join(repositoryRoot, "registry"), join(candidateRoot, "registry"), {
      recursive: true,
    }),
    writeFile(join(candidateRoot, "docs/index.html"), "<h1>Afferent</h1>"),
    writeFile(tarball, "local package only"),
  ]);
  const manifest = await createReleaseManifest({
    repositoryRoot,
    sourceCommit: "b".repeat(40),
    sourceDateEpoch: 1_700_000_000,
    tarball,
  });
  await writeFile(
    join(candidateRoot, "release-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const phase4 = {
    schemaVersion: 1,
    status: "complete",
    backendKind: "local-real-convex",
    artifactDigest: manifest.package.sha256,
    sourceCommit: manifest.source.commit,
  };
  await writeFile(
    join(candidateRoot, "evidence/phase4.json"),
    `${JSON.stringify(phase4, null, 2)}\n`,
  );
  const candidateFiles = await filesUnder(candidateRoot);
  const artifactPaths = candidateFiles.map((path) =>
    path.slice(candidateRoot.length + 1),
  );
  const artifacts = await Promise.all(
    artifactPaths.map(async (path) => ({
      path,
      sha256: digest(await readFile(join(candidateRoot, path))),
    })),
  );
  const record = {
    ...candidateRecord,
    artifacts,
    evidence: {
      checksums: "checksums.sha256",
      phase4: "evidence/phase4.json",
      phase4Status: "complete",
    },
    package: {
      ...candidateRecord.package,
      sha256: manifest.package.sha256,
    },
    source: {
      ...candidateRecord.source,
      commit: manifest.source.commit,
    },
  };
  await writeFile(
    join(candidateRoot, "candidate.json"),
    `${JSON.stringify(record, null, 2)}\n`,
  );
  const checksumFiles = await filesUnder(candidateRoot);
  const checksumLines = await Promise.all(
    checksumFiles.map(async (path) => {
      const candidatePath = path.slice(candidateRoot.length + 1);
      return `${digest(await readFile(path))}  ${candidatePath}`;
    }),
  );
  await writeFile(
    join(candidateRoot, "checksums.sha256"),
    `${checksumLines.join("\n")}\n`,
  );
  return { candidateRoot, temporaryRoot };
}

describe("release workflow contracts", () => {
  test("CI is least-privilege, immutable, bounded, and dependency ordered", async () => {
    const source = await readFile(
      join(repositoryRoot, ".github/workflows/ci.yml"),
      "utf8",
    );

    expect(() => validateCiWorkflow(source)).not.toThrow();
    expect(source).toContain("npm run verify:release-candidate -- --build");
    expect(source).toContain("npm run verify:phase4");
    expect(source).not.toMatch(
      /NODE_AUTH_TOKEN|NPM_TOKEN|CONVEX_DEPLOY_KEY|VITE_CONVEX_URL|vercel|convex deploy|remote playwright/iu,
    );
  });

  test("CI validation rejects mutable actions and credential-bearing paths", async () => {
    const source = await readFile(
      join(repositoryRoot, ".github/workflows/ci.yml"),
      "utf8",
    );

    expect(() =>
      validateCiWorkflow(
        source.replace(
          "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
          "actions/checkout@v7",
        ),
      ),
    ).toThrow(/immutable action pin/iu);
    expect(() =>
      validateCiWorkflow(`${source}\n# NODE_AUTH_TOKEN: forbidden\n`),
    ).toThrow(/credential|forbidden/iu);
  });

  test("candidate records bind the tested tarball to checksummed evidence", () => {
    expect(() => validateCandidateRecord(candidateRecord)).not.toThrow();
    expect(() =>
      validateCandidateRecord({
        ...candidateRecord,
        package: {
          ...candidateRecord.package,
          sha256: "d".repeat(64),
        },
      }),
    ).toThrow(/checksum|digest/iu);
    expect(() =>
      validateCandidateRecord({
        ...candidateRecord,
        source: { ...candidateRecord.source, tag: "v9.9.9" },
      }),
    ).toThrow(/tag|version/iu);
    expect(() =>
      validateCandidateRecord({
        ...candidateRecord,
        package: { ...candidateRecord.package, publication: "npm" },
      }),
    ).toThrow(/package tag|version/iu);
  });

  test("Pages publishes exact static bytes and never the local tarball", async () => {
    const { candidateRoot, temporaryRoot } = await createFinalCandidate();
    const output = join(temporaryRoot, "pages-site-fixture");
    const prepared = await preparePagesSite(candidateRoot, output);
    const outputFiles = await filesUnder(prepared.outputRoot);
    const publicPaths = outputFiles.map((path) =>
      path.slice(prepared.outputRoot.length + 1),
    );
    expect(publicPaths).toContain("release.json");
    expect(publicPaths).toContain("release-manifest.json");
    expect(publicPaths).toContain("registry.json");
    expect(publicPaths.some((path) => path.endsWith(".tgz"))).toBe(false);

    const fetchStatic = async (input) => {
      const url = new URL(input);
      const prefix = "/afferent/";
      if (!url.pathname.startsWith(prefix)) {
        return new Response(null, { status: 404 });
      }
      const path = decodeURIComponent(url.pathname.slice(prefix.length));
      try {
        return new Response(await readFile(join(prepared.outputRoot, path)), {
          status: 200,
        });
      } catch {
        return new Response(null, { status: 404 });
      }
    };
    await expect(
      verifyPublishedStatic(candidateRoot, "https://example.test/afferent/", {
        attempts: 1,
        delayMs: 0,
        fetchImpl: fetchStatic,
      }),
    ).resolves.toMatchObject({
      baseUrl: "https://example.test/afferent/",
    });

    await expect(
      verifyPublishedStatic(candidateRoot, "https://example.test/afferent/", {
        attempts: 1,
        delayMs: 0,
        fetchImpl: async (input) =>
          new URL(input).pathname.endsWith(".tgz")
            ? new Response("leaked", { status: 200 })
            : fetchStatic(input),
      }),
    ).rejects.toThrow(/local package artifact was published unexpectedly/iu);
  });

  test("package exposes the local release-candidate verifier", async () => {
    const packageManifest = JSON.parse(
      await readFile(join(repositoryRoot, "package.json"), "utf8"),
    );
    expect(packageManifest.scripts["verify:release-candidate"]).toBe(
      "node scripts/verify-release-candidate.mjs",
    );
  });

  test("source and static publication is manual, protected, and artifact preserving", async () => {
    const [ciSource, releaseSource] = await Promise.all([
      readFile(join(repositoryRoot, ".github/workflows/ci.yml"), "utf8"),
      readFile(
        join(
          repositoryRoot,
          ".github/workflows",
          plannedReleasePolicy.workflow,
        ),
        "utf8",
      ),
    ]);

    expect(() => validateReleaseWorkflow(releaseSource)).not.toThrow();
    expect(() =>
      validateArtifactActionCompatibility(ciSource, releaseSource),
    ).not.toThrow();
    expect(() =>
      validateArtifactActionCompatibility(
        ciSource,
        releaseSource.replace(
          "repository: $" + "{{ github.repository }}",
          "repository: attacker/afferent",
        ),
      ),
    ).toThrow(/continuity/iu);
    expect(releaseSource).toContain("inputs.allow_release == true");
    expect(releaseSource).toContain(
      "npm run verify:release-candidate -- --prepare-pages",
    );
    expect(releaseSource).toContain(
      'npm run verify:release-candidate -- --public-static "$AFFERENT_PUBLIC_BASE_URL"',
    );
    expect(releaseSource).toContain("actions/deploy-pages@");
    expect(releaseSource).toContain(
      'gh api --method GET "repos/$GITHUB_REPOSITORY/actions/runs/$AFFERENT_CI_RUN_ID"',
    );
    expect(releaseSource).not.toContain("registry-url:");
    expect(releaseSource).not.toMatch(
      /npm\s+(?:stage\s+)?publish|npm audit signatures|NODE_AUTH_TOKEN|NPM_TOKEN|convex deploy|vercel|test:e2e:phase4:remote/iu,
    );
  });

  test("selected CI run metadata is bound to the successful main push candidate", () => {
    expect(() =>
      validateCiRunMetadata(ciRunMetadata, {
        runId: "123456789",
        sourceCommit: "b".repeat(40),
      }),
    ).not.toThrow();

    for (const metadata of [
      { ...ciRunMetadata, id: 987_654_321 },
      {
        ...ciRunMetadata,
        path: `.github/workflows/${plannedReleasePolicy.workflow}`,
      },
      { ...ciRunMetadata, event: "workflow_dispatch" },
      { ...ciRunMetadata, conclusion: "failure" },
      { ...ciRunMetadata, head_branch: "feature/spoof" },
      { ...ciRunMetadata, head_sha: "c".repeat(40) },
      {
        ...ciRunMetadata,
        head_repository: { full_name: "attacker/afferent" },
      },
    ]) {
      expect(() =>
        validateCiRunMetadata(metadata, {
          runId: "123456789",
          sourceCommit: "b".repeat(40),
        }),
      ).toThrow(/CI run metadata|candidate provenance/iu);
    }
  });

  test("release validation rejects a missing CI run identity gate", async () => {
    const source = await readFile(
      join(repositoryRoot, ".github/workflows", plannedReleasePolicy.workflow),
      "utf8",
    );

    expect(() =>
      validateReleaseWorkflow(
        source.replace(
          'gh api --method GET "repos/$GITHUB_REPOSITORY/actions/runs/$AFFERENT_CI_RUN_ID"',
          "echo skipped-run-identity-check",
        ),
      ),
    ).toThrow(/CI run identity|candidate provenance/iu);
  });

  test("Changesets can only open a version pull request", async () => {
    const source = await readFile(
      join(repositoryRoot, ".github/workflows", plannedReleasePolicy.workflow),
      "utf8",
    );

    expect(source).toContain(
      "changesets/action@a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d",
    );
    expect(() =>
      validateReleaseWorkflow(
        source.replace(
          "version: npm run version:packages",
          "publish: npm run version:packages\n          version: npm run version:packages",
        ),
      ),
    ).toThrow(/Changesets.*publish/iu);
  });

  test("release validation rejects missing Pages OIDC and reordered static publication", async () => {
    const source = await readFile(
      join(repositoryRoot, ".github/workflows", plannedReleasePolicy.workflow),
      "utf8",
    );

    expect(() =>
      validateReleaseWorkflow(
        source.replace("id-token: write", "id-token: none"),
      ),
    ).toThrow(/OIDC|id-token|permissions/iu);
    expect(() =>
      validateReleaseWorkflow(
        source.replace("needs: prepare-static", "needs: release-readiness"),
      ),
    ).toThrow(/dependency|prepared candidate|publication/iu);
    expect(() =>
      validateReleaseWorkflow(`${source}\n# npm publish is forbidden\n`),
    ).toThrow(/forbidden|publication/iu);
  });

  test("static jobs cannot rebuild or repack the verified candidate", async () => {
    const source = await readFile(
      join(repositoryRoot, ".github/workflows/release.yml"),
      "utf8",
    );
    for (const name of ["prepare-static", "publish-static", "verify-static"]) {
      for (const command of ["npm run build", "npm pack --ignore-scripts"]) {
        const workflow = parse(source);
        workflow.jobs[name].steps.push({ name: "Rebuild", run: command });
        expect(() => validateReleaseWorkflow(stringify(workflow))).toThrow(
          /rebuild or repack/iu,
        );
      }
    }
  });

  test("workflow repository casing is normalized without weakening branch or filename identity", () => {
    const configuration = {
      githubActions: true,
      repository: declaredRepository.toUpperCase(),
      originRepository: declaredRepository,
      workflowRef: `${declaredRepository.toUpperCase()}/.github/workflows/${plannedReleasePolicy.workflow}@refs/heads/${plannedReleasePolicy.branch}`,
      runnerEnvironment: "github-hosted",
      releaseOwner: declaredRepository,
      repositoryVisibility: "public",
      staticPublication: plannedReleasePolicy.staticPublication,
      approvedTag: `v${packageManifest.version}`,
    };
    expect(() => validateExternalConfiguration(configuration)).not.toThrow();
    for (const workflowRef of [
      configuration.workflowRef.replace("release.yml", "Release.yml"),
      configuration.workflowRef.replace("refs/heads/main", "refs/heads/Main"),
    ]) {
      expect(() =>
        validateExternalConfiguration({ ...configuration, workflowRef }),
      ).toThrow(/workflowRef/iu);
    }
  });

  test("external release configuration fails closed outside the protected workflow", () => {
    expect(() => validateExternalConfiguration({})).toThrow(
      /external release configuration/iu,
    );
    expect(() =>
      validateExternalConfiguration({
        githubActions: true,
        repository: declaredRepository,
        originRepository: declaredRepository,
        workflowRef: `${declaredRepository}/.github/workflows/${plannedReleasePolicy.workflow}@refs/heads/${plannedReleasePolicy.branch}`,
        runnerEnvironment: "github-hosted",
        releaseOwner: declaredRepository,
        repositoryVisibility: "public",
        staticPublication: plannedReleasePolicy.staticPublication,
        approvedTag: `v${packageManifest.version}`,
      }),
    ).not.toThrow();

    expect(() =>
      validateExternalConfiguration({
        githubActions: true,
        repository: declaredRepository,
        originRepository: "unrelated-owner/afferent",
        workflowRef: `${declaredRepository}/.github/workflows/${plannedReleasePolicy.workflow}@refs/heads/${plannedReleasePolicy.branch}`,
        runnerEnvironment: "github-hosted",
        releaseOwner: declaredRepository,
        repositoryVisibility: "public",
        staticPublication: plannedReleasePolicy.staticPublication,
        approvedTag: `v${packageManifest.version}`,
      }),
    ).toThrow(/originRepository/iu);
  });

  test("repository metadata normalizes supported GitHub remote forms", () => {
    for (const remote of [
      "git@github.com:Owner/Repository.git",
      "ssh://git@github.com/Owner/Repository.git",
      "git+ssh://git@github.com/Owner/Repository.git",
      "git+https://github.com/Owner/Repository.git",
      "https://github.com/Owner/Repository",
      "https://github.com/Owner/Repository.git",
      "https://github.com/Owner/Repository/",
    ]) {
      expect(repositoryFromMetadata(remote)).toBe("owner/repository");
    }
    expect(repositoryFromMetadata("https://example.com/owner/repository")).toBe(
      undefined,
    );
    for (const remote of [
      "https://evilgithub.com/owner/repository",
      "https://github.com.evil.example/owner/repository",
      "https://example.com/github.com/owner/repository",
      "https://github.com@evil.example/owner/repository",
    ]) {
      expect(repositoryFromMetadata(remote)).toBeUndefined();
    }
  });

  test("release runbook records the no-npm source and Pages boundary", async () => {
    const source = await readFile(
      join(repositoryRoot, "docs/operations/releases.md"),
      "utf8",
    );

    expect(source).toMatch(/package publication[\s\S]*none/iu);
    expect(source).toMatch(/private:\s*true/iu);
    expect(source).toMatch(/npm pack --ignore-scripts/iu);
    expect(source).toMatch(/immutable GitHub tag `v0\.1\.0`/iu);
    expect(source).toMatch(/github-pages/iu);
    expect(source).toMatch(/no `\.tgz` file|no \.tgz file/iu);
    expect(source).toMatch(/upload-artifact@v7[\s\S]*download-artifact@v8/iu);
    expect(source).toMatch(/h5i share push[\s\S]*explicitly authorizes/iu);
    expect(source).not.toMatch(
      /npm\s+(?:stage\s+)?publish|NPM_TOKEN|NODE_AUTH_TOKEN|npm-production/iu,
    );
  });
});
