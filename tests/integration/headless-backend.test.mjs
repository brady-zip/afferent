import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("the Phase 2 gate includes mounted headless and real watch-query proofs", async () => {
  const manifest = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  );
  assert.match(manifest.scripts["test:react"], /vitest\.react\.config\.ts/);
  assert.match(
    manifest.scripts["test:backend:phase2"],
    /scripts\/test-headless-backend\.mjs/,
  );
  assert.match(manifest.scripts["test:phase2"], /test:react/);
  assert.match(manifest.scripts["test:phase2"], /test:backend:phase2/);
});

test("the real watch harness distinguishes setup failures from assertions", async () => {
  const source = await readFile(
    join(repositoryRoot, "scripts/test-headless-backend.mjs"),
    "utf8",
  );
  assert.match(source, /Headless backend harness setup failed/);
  assert.match(source, /Headless backend contract assertion failed/);
  assert.match(source, /ConvexReactClient/);
  assert.match(source, /watchQuery/);
  assert.match(source, /createDirectWatchStore/);
  assert.match(source, /createPaginatedWatchStore/);
});
