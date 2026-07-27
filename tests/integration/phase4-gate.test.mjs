import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const requiredSuites = [
  ["chromium", "hosted-demo.spec.ts"],
  ["chromium", "sandbox-isolation.spec.ts"],
  ["chromium", "sandbox-lifecycle.spec.ts"],
  ["chromium", "hosted-accessibility.spec.ts"],
  ["tablet", "hosted-accessibility.spec.ts"],
  ["mobile", "hosted-accessibility.spec.ts"],
];

async function source(path) {
  return readFile(path, "utf8");
}

describe("Phase 4 real-browser release gate", () => {
  it("pins the revalidated Playwright and axe packages", async () => {
    const manifest = JSON.parse(await source("package.json"));
    expect(manifest.devDependencies["@playwright/test"]).toBe("1.59.1");
    expect(manifest.devDependencies["@axe-core/playwright"]).toBe("4.11.0");
  });

  it("declares local and explicit remote orchestration scripts", async () => {
    const manifest = JSON.parse(await source("package.json"));
    expect(manifest.scripts["test:e2e:phase4"]).toBe(
      "node scripts/test-hosted-demo.mjs",
    );
    expect(manifest.scripts["test:e2e:phase4:remote"]).toBe(
      "node scripts/test-hosted-demo.mjs --remote",
    );
  });

  it("uses the packed candidate, a real Convex process, and owned teardown", async () => {
    const [runner, server] = await Promise.all([
      source("scripts/test-hosted-demo.mjs"),
      source("scripts/serve-hosted-demo.mjs"),
    ]);
    expect(runner).toMatch(/prepareDemoConsumer/);
    expect(runner).toMatch(/convex(?:Binary)?[\s\S]*\bdev\b/);
    expect(runner).toMatch(/CONVEX_AGENT_MODE/);
    expect(runner).toMatch(/Convex functions ready!/);
    expect(runner).toMatch(/PHASE4_ARTIFACT_DIGEST/);
    expect(runner).toMatch(/PHASE4_TARGET_ID/);
    expect(runner).toMatch(/finally[\s\S]*stopOwned/);
    expect(runner).not.toMatch(/convex-test|mock(?:ed)?\s+convex/i);
    expect(server).toMatch(/__phase4\/identity/);
    expect(server).toMatch(/artifactDigest/);
    expect(server).toMatch(/backendUrl/);
  });

  it("requires the exact project/spec matrix without skip directives", async () => {
    const [{ PHASE4_REQUIRED_SUITES }, configuration] = await Promise.all([
      import("../../scripts/test-hosted-demo.mjs"),
      source("playwright.phase4.config.ts"),
    ]);
    expect(PHASE4_REQUIRED_SUITES).toEqual(
      requiredSuites.map(([project, spec]) => ({ project, spec })),
    );
    expect(configuration).toMatch(/Desktop Chrome/);
    expect(configuration).toMatch(/iPad \(gen 7\)/);
    expect(configuration).toMatch(/iPhone 13/);
    expect(configuration).toMatch(/reuseExistingServer/);
    expect(configuration).not.toMatch(/ignoreHTTPSErrors|retries:\s*[1-9]/);

    for (const [, spec] of requiredSuites) {
      const testSource = await source(`tests/e2e/${spec}`);
      expect(testSource).not.toMatch(
        /test\.(?:skip|fixme|only)|describe\.(?:skip|fixme|only)/,
      );
      expect(testSource).not.toMatch(/convex-test|mock(?:ed)?\s+convex/i);
    }
  });

  it("rejects missing, wrong-target, and wrong-artifact completion markers", async () => {
    const { PHASE4_REQUIRED_SUITES, validateCompletionMarkers } = await import(
      "../../scripts/test-hosted-demo.mjs"
    );
    const directory = await mkdtemp(join(tmpdir(), "afferent-phase4-markers-"));
    const artifactDigest = "a".repeat(64);
    const targetId = "local:http://127.0.0.1:3210";
    try {
      await mkdir(directory, { recursive: true });
      await expect(
        validateCompletionMarkers({
          directory,
          artifactDigest,
          targetId,
          requiredSuites: PHASE4_REQUIRED_SUITES,
        }),
      ).rejects.toThrow(/missing completion marker/i);

      for (const { project, spec } of PHASE4_REQUIRED_SUITES) {
        await writeFile(
          join(directory, `${project}--${spec}.json`),
          `${JSON.stringify({
            schemaVersion: 1,
            status: "complete",
            project,
            spec,
            artifactDigest,
            targetId,
          })}\n`,
        );
      }
      await validateCompletionMarkers({
        directory,
        artifactDigest,
        targetId,
        requiredSuites: PHASE4_REQUIRED_SUITES,
      });

      const first = PHASE4_REQUIRED_SUITES[0];
      await writeFile(
        join(directory, `${first.project}--${first.spec}.json`),
        `${JSON.stringify({
          schemaVersion: 1,
          status: "complete",
          ...first,
          artifactDigest: "b".repeat(64),
          targetId,
        })}\n`,
      );
      await expect(
        validateCompletionMarkers({
          directory,
          artifactDigest,
          targetId,
          requiredSuites: PHASE4_REQUIRED_SUITES,
        }),
      ).rejects.toThrow(/artifact digest mismatch/i);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });
});
