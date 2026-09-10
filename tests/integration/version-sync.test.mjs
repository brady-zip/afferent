import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  createReleaseManifest,
  loadReleaseIdentity,
  repositoryFromMetadata,
  validateReleaseManifest,
} from "../../scripts/generate-release-manifest.mjs";
import {
  validatePackageSurface,
  validateVersionSurfaces,
} from "../../scripts/verify-version-sync.mjs";
import { plannedReleasePolicy } from "../../scripts/release-policy.mjs";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const temporaryRoots = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true })),
  );
});

describe("canonical release identity", () => {
  it("derives package, documentation, registry, and tag metadata from package.json", async () => {
    const packageManifest = JSON.parse(
      await readFile(join(repositoryRoot, "package.json"), "utf8"),
    );
    const identity = await loadReleaseIdentity(repositoryRoot);

    expect(identity).toMatchObject({
      packageName: packageManifest.name,
      version: packageManifest.version,
      docsVersion: packageManifest.version,
      sourceTag: `v${packageManifest.version}`,
      repository: repositoryFromMetadata(packageManifest.repository),
      releaseWorkflow: plannedReleasePolicy.workflow,
    });
    expect(identity.registryVersion).toBe(packageManifest.version);
  });

  it("creates a deterministic manifest that binds one local tarball and registry digest", async () => {
    const temporaryRoot = await mkdtemp(
      join(tmpdir(), "afferent-version-sync-"),
    );
    temporaryRoots.push(temporaryRoot);
    const tarball = join(temporaryRoot, "afferent-0.1.0.tgz");
    await writeFile(tarball, "exact packed candidate");

    const options = {
      repositoryRoot,
      tarball,
      sourceCommit: "a".repeat(40),
      sourceDateEpoch: 1_700_000_000,
    };
    const first = await createReleaseManifest(options);
    const second = await createReleaseManifest(options);

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schemaVersion: 2,
      distribution: {
        packagePublication: "none",
        sourcePublication: "github-tag",
        staticPublication: "github-pages",
      },
      package: {
        name: "afferent",
        publication: "none",
        version: "0.1.0",
        tarball: "afferent-0.1.0.tgz",
        sha256: createHash("sha256")
          .update("exact packed candidate")
          .digest("hex"),
      },
      source: {
        commit: "a".repeat(40),
        tag: "v0.1.0",
        sourceDateEpoch: 1_700_000_000,
        timestampPolicy: "git-commit-source-date-epoch",
      },
      documentation: { version: "0.1.0" },
      registry: { version: "0.1.0" },
    });
    expect(first.registry.sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.evidence.manifestSha256).toMatch(/^[a-f0-9]{64}$/u);
    const identity = await loadReleaseIdentity(repositoryRoot);
    expect(() => validateReleaseManifest(first, identity)).not.toThrow();
    expect(() =>
      validateReleaseManifest(
        {
          ...first,
          registry: { ...first.registry, version: "9.9.9" },
        },
        identity,
      ),
    ).toThrow(/registry version/i);
    expect(() =>
      validateReleaseManifest(
        {
          ...first,
          repository: {
            ...first.repository,
            name: "unrelated-owner/afferent",
          },
        },
        identity,
      ),
    ).toThrow(/declared repository identity/i);
  });
});

describe("versioned release surfaces", () => {
  it("keeps private local package metadata and compiled exports release-safe", async () => {
    const packageManifest = JSON.parse(
      await readFile(join(repositoryRoot, "package.json"), "utf8"),
    );

    expect(() => validatePackageSurface(packageManifest)).not.toThrow();
    const upperRepository = repositoryFromMetadata(
      packageManifest.repository,
    ).toUpperCase();
    expect(() =>
      validatePackageSurface({
        ...packageManifest,
        repository: {
          type: "git",
          url: `git+https://github.com/${upperRepository}.git`,
        },
        homepage: `https://github.com/${upperRepository}#readme`,
        bugs: { url: `https://github.com/${upperRepository}/issues` },
      }),
    ).not.toThrow();
    expect(() =>
      validatePackageSurface({
        ...packageManifest,
        homepage: `https://github.com/${upperRepository}#README`,
      }),
    ).toThrow(/homepage/iu);
    expect(() =>
      validatePackageSurface({
        ...packageManifest,
        exports: {
          ...packageManifest.exports,
          "./test": "./src/test.ts",
        },
      }),
    ).toThrow(/raw TypeScript export/i);
    expect(() =>
      validatePackageSurface({
        ...packageManifest,
        private: false,
      }),
    ).toThrow(/private local package/i);
    expect(() =>
      validatePackageSurface({
        ...packageManifest,
        publishConfig: { access: "public" },
      }),
    ).toThrow(/publishConfig/i);
  });

  it("derives generated registry, docs, and changelog versions without abbreviated literals", async () => {
    const [packageManifest, registry, docsConfig, generator, changelog] =
      await Promise.all([
        readFile(join(repositoryRoot, "package.json"), "utf8").then(JSON.parse),
        readFile(join(repositoryRoot, "registry/registry.json"), "utf8").then(
          JSON.parse,
        ),
        readFile(join(repositoryRoot, "docs/.vitepress/config.ts"), "utf8"),
        readFile(
          join(repositoryRoot, "scripts/generate-ui-artifacts.mjs"),
          "utf8",
        ),
        readFile(join(repositoryRoot, "CHANGELOG.md"), "utf8"),
      ]);

    expect(() =>
      validateVersionSurfaces({
        packageManifest,
        registry,
        docsConfig,
        generator,
        changelog,
      }),
    ).not.toThrow();
    expect(registry.packageVersion).toBe(packageManifest.version);
    expect(registry.sourceTag).toBe(`v${packageManifest.version}`);
    expect(docsConfig).toContain("loadReleaseIdentity");
    expect(docsConfig).not.toMatch(/text:\s*["']v0\.1["']/u);
    expect(generator).toContain("loadReleaseIdentity");
    expect(changelog).toContain(`## ${packageManifest.version}`);
  });

  it("configures one private version-only Changesets package with an exact CLI pin", async () => {
    const [packageManifest, changesets] = await Promise.all([
      readFile(join(repositoryRoot, "package.json"), "utf8").then(JSON.parse),
      readFile(join(repositoryRoot, ".changeset/config.json"), "utf8").then(
        JSON.parse,
      ),
    ]);

    expect(changesets.access).toBe("restricted");
    expect(changesets.baseBranch).toBe("main");
    expect(changesets.privatePackages?.version).toBe(true);
    expect(changesets.privatePackages?.tag).toBe(false);
    expect(packageManifest.devDependencies["@changesets/cli"]).toMatch(
      /^\d+\.\d+\.\d+$/u,
    );
  });
});
