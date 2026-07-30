import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  validateArtifactActionCompatibility,
  validateCandidateRecord,
  validateCiRunMetadata,
  validateCiWorkflow,
  validateExternalConfiguration,
  validateReleaseWorkflow,
} from "../../scripts/verify-release-candidate.mjs";

const repositoryRoot = new URL("../..", import.meta.url).pathname;

const sha = "a".repeat(64);
const candidateRecord = {
  schemaVersion: 1,
  artifactName: "afferent-release-candidate-0.1.0",
  source: {
    commit: "b".repeat(40),
    tag: "v0.1.0",
  },
  package: {
    name: "afferent",
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
  id: 123456789,
  path: ".github/workflows/ci.yml",
  event: "push",
  status: "completed",
  conclusion: "success",
  head_branch: "main",
  head_sha: "b".repeat(40),
  repository: {
    full_name: "bradywatkinson/afferent",
  },
  head_repository: {
    full_name: "bradywatkinson/afferent",
  },
};

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
  });

  test("package exposes the local release-candidate verifier", async () => {
    const packageManifest = JSON.parse(
      await readFile(join(repositoryRoot, "package.json"), "utf8"),
    );
    expect(packageManifest.scripts["verify:release-candidate"]).toBe(
      "node scripts/verify-release-candidate.mjs",
    );
  });

  test("release publication is manual, protected, OIDC-only, and artifact preserving", async () => {
    const [ciSource, releaseSource] = await Promise.all([
      readFile(join(repositoryRoot, ".github/workflows/ci.yml"), "utf8"),
      readFile(join(repositoryRoot, ".github/workflows/release.yml"), "utf8"),
    ]);

    expect(() => validateReleaseWorkflow(releaseSource)).not.toThrow();
    expect(() =>
      validateArtifactActionCompatibility(ciSource, releaseSource),
    ).not.toThrow();
    expect(releaseSource).toContain(
      'npm publish "$RUNNER_TEMP/release-candidate/package/afferent-0.1.0.tgz" --access public --provenance',
    );
    expect(releaseSource).toContain("npm audit signatures");
    expect(releaseSource).toContain(
      'gh api --method GET "repos/$GITHUB_REPOSITORY/actions/runs/$AFFERENT_CI_RUN_ID"',
    );
    expect(releaseSource).not.toContain("registry-url:");
    expect(releaseSource).not.toMatch(
      /NODE_AUTH_TOKEN|NPM_TOKEN|convex deploy|vercel|test:e2e:phase4:remote/iu,
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
      { ...ciRunMetadata, id: 987654321 },
      { ...ciRunMetadata, path: ".github/workflows/release.yml" },
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
      join(repositoryRoot, ".github/workflows/release.yml"),
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
      join(repositoryRoot, ".github/workflows/release.yml"),
      "utf8",
    );

    expect(source).toContain(
      "changesets/action@a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d",
    );
    expect(() =>
      validateReleaseWorkflow(
        source.replace(
          "version: npm run version:packages",
          "publish: npm publish\n          version: npm run version:packages",
        ),
      ),
    ).toThrow(/Changesets.*publish/iu);
  });

  test("release validation rejects missing OIDC and reordered static publication", async () => {
    const source = await readFile(
      join(repositoryRoot, ".github/workflows/release.yml"),
      "utf8",
    );

    expect(() =>
      validateReleaseWorkflow(
        source.replace("id-token: write", "id-token: none"),
      ),
    ).toThrow(/OIDC|id-token/iu);
    expect(() =>
      validateReleaseWorkflow(
        source.replace("needs: verify-public-npm", "needs: release-readiness"),
      ),
    ).toThrow(/dependency|public npm|publication/iu);
  });

  test("external release configuration fails closed outside the protected workflow", () => {
    expect(() => validateExternalConfiguration({})).toThrow(
      /external release configuration/iu,
    );
    expect(() =>
      validateExternalConfiguration({
        githubActions: true,
        repository: "bradywatkinson/afferent",
        workflowRef:
          "bradywatkinson/afferent/.github/workflows/release.yml@refs/heads/main",
        runnerEnvironment: "github-hosted",
        releaseOwner: "bradywatkinson/afferent",
        trustedPublisher:
          "bradywatkinson/afferent:release.yml:npm-production:allow-publish",
        staticPublication: "github-pages",
        approvedTag: "v0.1.0",
      }),
    ).not.toThrow();
  });

  test("release runbook records first-package bootstrap and action compatibility", async () => {
    const source = await readFile(
      join(repositoryRoot, "docs/operations/releases.md"),
      "utf8",
    );

    expect(source).toMatch(/0\.0\.0-bootstrap\.0/iu);
    expect(source).toMatch(/--tag bootstrap/iu);
    expect(source).toMatch(/npm trust github[\s\S]*--allow-publish/iu);
    expect(source).toMatch(/upload-artifact@v7[\s\S]*download-artifact@v8/iu);
    expect(source).toMatch(/never.*successful.*v1/iu);
    expect(source).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/iu);
  });
});
