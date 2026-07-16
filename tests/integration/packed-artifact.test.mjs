import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("the release gate covers every suite and every supported packed export", async () => {
  const manifest = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
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
    assert.match(gate, new RegExp(command.replace(":", "\\:")));
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
    assert.match(gate, new RegExp(exported.replaceAll("/", "\\/")));
  }
  assert.match(gate, /--typecheck-components/);
  assert.match(gate, /private data-model export/);
});
