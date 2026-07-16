import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const environment = { ...process.env, npm_config_workspaces: "false" };
    delete environment.NODE_TEST_CONTEXT;
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", rejectRun);
    child.once("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

test("the release gate covers every suite and every supported packed export", async () => {
  const manifest = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  );
  assert.equal(
    manifest.scripts["test:package"],
    "node --test tests/integration/packed-artifact.test.mjs",
  );

  const gate = await readFile(
    join(repositoryRoot, "scripts/test-packed-consumer.mjs"),
    "utf8",
  );
  for (const command of [
    "test:static",
    "test:model",
    "test:component",
    "test:auth-conformance",
    "test:scope",
    "test:backend",
  ]) {
    assert.ok(gate.includes(command), `release gate is missing ${command}`);
  }
  for (const exported of [
    "afferent",
    "afferent/server.js",
    "afferent/adapters/convex-auth.js",
    "afferent/adapters/clerk.js",
    "afferent/adapters/better-auth.js",
    "afferent/convex.config.js",
    "afferent/test",
  ]) {
    assert.ok(gate.includes(exported), `release gate is missing ${exported}`);
  }
  assert.match(gate, /--typecheck-components/);
  assert.match(gate, /private data-model export/);
});

test(
  "the complete release gate passes through the external packed consumer",
  { timeout: 300_000 },
  async () => {
    const result = await run(process.execPath, [
      "--test",
      "tests/integration/walking-skeleton.test.mjs",
    ]);
    assert.equal(
      result.code,
      0,
      `Packed release gate failed:\n${result.stderr || result.stdout}`,
    );
  },
);
