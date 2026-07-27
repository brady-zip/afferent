import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DEMO_CANDIDATE_DIR,
  assertImportOrigins,
  prepareDemoConsumer,
  validateDemoGateEvidence,
  verifyDemoCandidate,
} from "../../scripts/prepare-demo-consumer.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const candidate = join(root, DEMO_CANDIDATE_DIR);

describe("hosted demo release artifacts", () => {
  it(
    "prepares one clean consumer from the exact packed package and registry payload",
    { timeout: 300_000 },
    async () => {
      const result = await prepareDemoConsumer({
        candidateDir: candidate,
        force: true,
      });
      const verified = await verifyDemoCandidate(candidate);

      expect(result.candidateDir).toBe(candidate);
      expect(result.steps).toEqual([
        "build",
        "pack",
        "install-package",
        "install-registry",
      ]);
      expect(verified.package).toEqual({
        name: "afferent",
        version: "0.1.0",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      expect(verified.registry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(verified.registry.files).toContain("r/afferent-admin.json");
      expect(verified.registry.files).toContain("r/afferent-ui-core.json");
      expect(verified.example.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(verified.reactRouter).toBe("8.3.0");

      await access(
        join(candidate, "node_modules/afferent/dist/react/index.js"),
      );
      await access(
        join(candidate, "src/components/afferent/board/board-screen.tsx"),
      );
    },
  );

  it("fails closed when an example import resolves into repository product source", async () => {
    const fixtureRoot = await mkdtemp(
      join(tmpdir(), "afferent-demo-origin-test"),
    );
    try {
      const sourceRoot = join(fixtureRoot, "example");
      await mkdir(sourceRoot, { recursive: true });
      await writeFile(
        join(sourceRoot, "App.tsx"),
        `import ${JSON.stringify(join(root, "src/react/index.ts"))};\n`,
      );

      await expect(
        assertImportOrigins({
          sourceRoot,
          candidateRoot: fixtureRoot,
          repositoryRoot: root,
        }),
      ).rejects.toThrow(/repository product source/i);
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });

  it("keeps the committed example artifact-shaped instead of checking in product UI", async () => {
    const [manifest, ignore, packageManifest] = await Promise.all([
      readFile(join(candidate, ".afferent-provenance.json"), "utf8").then(
        JSON.parse,
      ),
      readFile(join(root, ".gitignore"), "utf8"),
      readFile(join(root, "package.json"), "utf8").then(JSON.parse),
    ]);

    expect(ignore).toContain(`${DEMO_CANDIDATE_DIR}/`);
    expect(packageManifest.devDependencies["react-router"]).toBe("8.3.0");
    expect(manifest.artifacts.package.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.artifacts.registry.sha256).toMatch(/^[a-f0-9]{64}$/);
    await expect(
      access(join(root, "example/src/components/afferent")),
    ).rejects.toThrow();
  });

  it("defines a fail-closed aggregate gate with complete digest evidence", async () => {
    const packageManifest = await readFile(
      join(root, "package.json"),
      "utf8",
    ).then(JSON.parse);
    expect(packageManifest.scripts["verify:demo:artifacts"]).toBe(
      "node scripts/prepare-demo-consumer.mjs --gate",
    );

    const digest = "a".repeat(64);
    const complete = {
      schemaVersion: 1,
      status: "complete",
      steps: ["prepare", "typecheck", "build", "host-tests"],
      digests: {
        package: digest,
        registry: digest,
        example: digest,
        installedUi: digest,
        build: digest,
        hostTests: digest,
      },
    };
    expect(validateDemoGateEvidence(complete)).toEqual(complete);
    expect(() =>
      validateDemoGateEvidence({
        ...complete,
        steps: complete.steps.filter((step) => step !== "host-tests"),
      }),
    ).toThrow(/skipped or reordered/i);
    expect(() =>
      validateDemoGateEvidence({
        ...complete,
        digests: { ...complete.digests, installedUi: undefined },
      }),
    ).toThrow(/digest evidence/i);
  });
});
