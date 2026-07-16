import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// The disposable-deployment implementation is completed with the child-component
// integration in Task 2. These assertions intentionally fail during the RED commit.
const config = await readFile(
  new URL("../src/component/convex.config.ts", import.meta.url),
  "utf8",
);
const posts = await readFile(
  new URL("../src/component/participation/posts.ts", import.meta.url),
  "utf8",
);
assert.match(config, /@convex-dev\/rate-limiter/);
assert.match(posts, /reserve:\s*false/);
assert.match(posts, /RATE_LIMITED/);
assert.match(posts, /OCC/);
