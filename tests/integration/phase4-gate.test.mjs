import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const requiredSuites = [
  ["chromium", "demo.spec.ts"],
  ["chromium", "sandbox-isolation.spec.ts"],
  ["chromium", "sandbox-lifecycle.spec.ts"],
  ["chromium", "demo-accessibility.spec.ts"],
  ["tablet", "demo-accessibility.spec.ts"],
  ["mobile", "demo-accessibility.spec.ts"],
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

  it("declares only the one-command local demo and local E2E scripts", async () => {
    const manifest = JSON.parse(await source("package.json"));
    expect(manifest.scripts["dev:demo"]).toBe("node scripts/dev-demo.mjs");
    expect(manifest.scripts["test:e2e:phase4"]).toBe(
      "node scripts/test-demo.mjs",
    );
    expect(manifest.scripts["test:e2e:phase4:remote"]).toBeUndefined();
    expect(manifest.scripts["typecheck:demo"]).toBe(
      "node scripts/prepare-demo-consumer.mjs --gate",
    );
    expect(manifest.scripts["verify:phase4"]).toBe(
      "npm run test:release:contracts && npm run verify:docs && npm run test:release:package && npm run test:demo:maintenance && npm run verify:demo:artifacts && npm run test:e2e:phase4",
    );
  });

  it("uses one packed candidate bootstrap, a real Convex process, and owned teardown", async () => {
    const [launcher, runner, server] = await Promise.all([
      source("scripts/dev-demo.mjs"),
      source("scripts/test-demo.mjs"),
      source("scripts/serve-demo.mjs"),
    ]);
    expect(runner).toMatch(/prepareDemoConsumer/);
    expect(runner).toMatch(/convex(?:Binary)?[\s\S]*\bdev\b/);
    expect(runner).toMatch(/CONVEX_AGENT_MODE/);
    expect(runner).toMatch(/Convex functions ready!/);
    expect(runner).toMatch(/JWT_PRIVATE_KEY/);
    expect(runner).toMatch(/JWKS/);
    expect(runner).toMatch(/SITE_URL/);
    expect(runner).toMatch(/PHASE4_ARTIFACT_DIGEST/);
    expect(runner).toMatch(/PHASE4_TARGET_ID/);
    expect(runner).toMatch(/finally[\s\S]*stopOwned/);
    expect(runner).not.toMatch(/convex-test|mock(?:ed)?\s+convex/i);
    expect(launcher).toMatch(/prepareLocalDemoTarget\(\{/);
    expect(launcher).toMatch(/detachedProcesses:\s*false/);
    expect(launcher).toMatch(/includeTestControls:\s*false/);
    expect(launcher).toMatch(/npm[\s\S]*run[\s\S]*dev[\s\S]*--strictPort/);
    expect(launcher).toMatch(/finally[\s\S]*stop/);
    expect(server).toMatch(/__phase4\/identity/);
    expect(server).toMatch(/artifactDigest/);
    expect(server).toMatch(/backendUrl/);
  });

  it("injects lifecycle controls only into the generated test candidate", async () => {
    const [launcher, runner, fixture] = await Promise.all([
      source("scripts/dev-demo.mjs"),
      source("scripts/test-demo.mjs"),
      source("tests/e2e/fixtures/phase4Test.ts"),
    ]);
    expect(runner).toMatch(/tests\/e2e\/fixtures\/phase4Test\.ts/);
    expect(runner).toMatch(/candidateRoot,\s*"convex\/phase4Test\.ts"/);
    expect(runner).toMatch(/if \(includeTestControls\)/);
    expect(launcher).toMatch(/includeTestControls:\s*false/);
    expect(fixture).toMatch(/internal(?:Mutation|Query)/);
    expect(fixture).toMatch(/ownerForEmail/);
    expect(fixture).not.toMatch(
      /export const \w+\s*=\s*(?:query|mutation|action)\(/,
    );
    await expect(access("example/convex/phase4Test.ts")).rejects.toThrow();
  });

  it("requires the exact project/spec matrix without skip directives", async () => {
    const [{ PHASE4_REQUIRED_SUITES }, configuration] = await Promise.all([
      import("../../scripts/test-demo.mjs"),
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

  it("rejects remote branches, committed secrets, generated env, and broad teardown", async () => {
    const paths = [
      "playwright.phase4.config.ts",
      "scripts/dev-demo.mjs",
      "scripts/serve-demo.mjs",
      "scripts/test-demo.mjs",
    ];
    const sources = await Promise.all(paths.map(source));
    const combined = sources.join("\n");
    expect(combined).not.toMatch(
      /PHASE4_REMOTE|--base-url|test:e2e:phase4:remote|vercel|https:\/\//i,
    );
    expect(combined).not.toMatch(
      /-----BEGIN (?:RSA )?PRIVATE KEY-----|CONVEX_DEPLOY_KEY\s*[:=]\s*["'][^"']+/,
    );
    expect(combined).not.toMatch(/\b(?:pkill|killall)\b/);
    expect(combined).toMatch(/process\.kill\(-child\.pid/);

    const { stdout } = await execFileAsync("git", ["ls-files", "-z"]);
    const trackedEnv = stdout
      .split("\0")
      .filter((path) => path === ".env.local" || path.endsWith("/.env.local"));
    expect(trackedEnv).toEqual([]);
  });

  it("rejects missing, wrong-target, and wrong-artifact completion markers", async () => {
    const { PHASE4_REQUIRED_SUITES, validateCompletionMarkers } =
      await import("../../scripts/test-demo.mjs");
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
