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
  assert.match(source, /assert\.deepEqual/);
  assert.match(source, /results\.map\(\(item\) => item\.label\)/);
  assert.match(source, /assertCanonicalWindow/);
  assert.match(source, /assertActiveBoundaries/);
  assert.match(source, /assertAllWatchesDisposedOnce/);
  assert.match(source, /insertItem/);
  assert.match(source, /deleteItem/);
  assert.match(source, /moveItem/);
  assert.match(source, /revision/);
  assert.match(source, /proveAtomicClientTransition/);
  assert.match(source, /sibling\.localQueryResult\(\)/);
  assert.match(source, /one installed client transition/);
  assert.match(source, /recordEveryPublication/);
  assert.match(source, /assertExactSince/);
  assert.match(source, /allowedKeys\.includes/);
  assert.match(source, /cross-window sort movement/);
  assert.match(source, /assertFaultSince/);
  assert.match(source, /first-page failure/);
  assert.match(source, /middle-page failure/);
  assert.match(source, /tail-page failure/);
  assert.match(source, /reverse cross-window sort movement/);
  assert.match(source, /seedComments/);
  assert.match(source, /insertComment/);
  assert.match(source, /deleteComment/);
  assert.match(source, /parentCommentId/);
  assert.match(source, /comment feed/);
  assert.match(source, /comment identity replacement/);
  assert.doesNotMatch(source, /new Set\(/);
  assert.doesNotMatch(source, /results\.length > 0/);

  const querySource = await readFile(
    join(repositoryRoot, "src/react/query.ts"),
    "utf8",
  );
  assert.doesNotMatch(querySource, /\b(?:revision|watermark)\b/i);
});
