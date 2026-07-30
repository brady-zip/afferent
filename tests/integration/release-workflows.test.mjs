import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  validateCandidateRecord,
  validateCiWorkflow,
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
});
