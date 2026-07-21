import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

import { testRegistryConsumer } from "../../scripts/test-registry-consumer.mjs";

const root = resolve(new URL("../..", import.meta.url).pathname);

test(
  "packed Afferent and all local feature items typecheck and build in a clean consumer",
  { timeout: 300_000 },
  async () => {
    const result = await testRegistryConsumer(root);
    assert.deepEqual(result.featureItems, [
      "board",
      "roadmap",
      "changelog",
      "notifications",
      "admin",
    ]);
    assert.deepEqual(result.runtime, [
      "class-variance-authority",
      "clsx",
      "lucide-react",
      "radix-ui",
      "tailwind-merge",
    ]);
    assert.doesNotMatch(
      result.transcript,
      /\/Users\/|examples\/ui|ui\/afferent\//,
    );
  },
);

test("registry acceptance uses pinned local tooling and no moving package executor", async () => {
  const source = await readFile(
    join(root, "scripts/test-registry-consumer.mjs"),
    "utf8",
  );
  assert.match(source, /node_modules\/\.bin\/shadcn/);
  assert.equal(source.includes(`n${"px"}`), false);
  assert.equal(source.includes(`@${"latest"}`), false);
  const fixture = JSON.parse(
    await readFile(join(root, "fixtures/registry-vite/package.json"), "utf8"),
  );
  assert.equal(fixture.dependencies?.afferent, undefined);
  assert.equal(fixture.dependencies?.convex, "1.42.2");
});
