import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readRepositoryFile = (path) =>
  readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("the adopter entry path is concise, local-first, and versioned", async () => {
  const [readme, localDemo, install, mount, config, packageSource] =
    await Promise.all([
      readRepositoryFile("README.md"),
      readRepositoryFile("docs/guide/local-demo.md"),
      readRepositoryFile("docs/guide/install.md"),
      readRepositoryFile("docs/guide/mount.md"),
      readRepositoryFile("docs/.vitepress/config.ts"),
      readRepositoryFile("package.json"),
    ]);
  const packageJson = JSON.parse(packageSource);

  assert.match(readme, /npm run dev:demo/);
  assert.match(readme, /Convex Auth/);
  assert.match(readme, /Clerk/);
  assert.match(readme, /Better Auth/);
  assert.match(readme, /Apache-2\.0/);
  assert.doesNotMatch(readme, /hosted demo/i);

  assert.match(localDemo, /Node\.js 22\.14\.0 or newer/);
  assert.match(localDemo, /npm 11\.5\.1 or newer/);
  assert.match(localDemo, /anonymous local Convex/i);
  assert.match(localDemo, /JWT|JWKS/);
  assert.match(localDemo, /signed out/i);
  assert.match(localDemo, /local.*account/is);
  assert.match(localDemo, /never commit/i);

  assert.match(install, /npm install afferent/);
  assert.match(mount, /afferent\/convex\.config\.js/);
  assert.match(mount, /createAfferentClient/);
  assert.match(config, /defineConfig/);
  assert.equal(
    packageJson.scripts["docs:build"],
    "vitepress build docs",
  );
  assert.equal(packageJson.devDependencies.vitepress, "1.6.4");
});
