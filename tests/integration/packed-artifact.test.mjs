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
  assert.equal(
    manifest.scripts["test:fixtures"],
    "tsc --project fixtures/auth-convex-auth/tsconfig.json && tsc --project fixtures/auth-clerk/tsconfig.json && tsc --project fixtures/auth-better-auth/tsconfig.json",
  );
  assert.equal(
    manifest.scripts["test:backend:real"],
    "node scripts/test-pagination-backend.mjs",
  );
  assert.notEqual(
    manifest.scripts["test:backend:real"],
    manifest.scripts["test:backend"],
  );
  for (const command of [
    "build",
    "test:fixtures",
    "test:auth-conformance",
    "test:scope",
    "test:component",
    "test:static",
    "test:backend:real",
    "test:package",
  ]) {
    assert.ok(
      manifest.scripts["test:phase1"].includes(command),
      `Phase 1 release gate is missing ${command}`,
    );
  }

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
  assert.match(gate, /"--typecheck",\s*"enable"/);
  assert.match(gate, /rate-limiter child component/i);
  assert.match(gate, /private data-model export/);
});

test("the Phase 2 gate covers the public React artifact and complete consumer", async () => {
  const manifest = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  );
  assert.deepEqual(manifest.exports["./react.js"], {
    types: "./dist/react/index.d.ts",
    default: "./dist/react/index.js",
  });
  for (const command of [
    "test:model",
    "test:component",
    "test:backend",
    "test:static",
    "test:react",
    "test:package",
    "typecheck",
    "lint",
    "build",
  ]) {
    assert.ok(
      manifest.scripts["test:phase2"].includes(command),
      `Phase 2 gate is missing ${command}`,
    );
  }
  const gate = await readFile(
    join(repositoryRoot, "scripts/test-packed-consumer.mjs"),
    "utf8",
  );
  assert.match(gate, /afferent\/react\.js/);
  assert.match(gate, /fixtures\/packed-vite-convex/);
  const packedApp = await readFile(
    join(repositoryRoot, "fixtures/packed-vite-convex/src/App.tsx"),
    "utf8",
  );
  assert.match(packedApp, /NotificationTarget/);
  assert.match(packedApp, /target\.kind/);
  assert.match(packedApp, /target\.label/);
  for (const adminRead of [
    "useAdminFeedback",
    "useAdminPost",
    "useAdminChangelog",
  ]) {
    assert.match(packedApp, new RegExp(adminRead));
  }
  const wrapper = await readFile(
    join(repositoryRoot, "fixtures/packed-vite-convex/convex/afferent.ts"),
    "utf8",
  );
  for (const adminRead of [
    "listAdminFeedback",
    "getAdminPost",
    "listAdminChangelog",
  ]) {
    assert.match(wrapper, new RegExp(adminRead));
  }
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
