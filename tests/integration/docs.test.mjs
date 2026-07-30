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

test("provider, UI, and operations guides preserve the release contract", async () => {
  const [
    convexAuth,
    clerk,
    betterAuth,
    headless,
    registry,
    customization,
    testing,
    deployment,
    upgrades,
  ] = await Promise.all([
    readRepositoryFile("docs/auth/convex-auth.md"),
    readRepositoryFile("docs/auth/clerk.md"),
    readRepositoryFile("docs/auth/better-auth.md"),
    readRepositoryFile("docs/ui/headless.md"),
    readRepositoryFile("docs/ui/registry.md"),
    readRepositoryFile("docs/ui/customization.md"),
    readRepositoryFile("docs/operations/testing.md"),
    readRepositoryFile("docs/operations/deployment.md"),
    readRepositoryFile("docs/operations/upgrades.md"),
  ]);

  for (const providerGuide of [convexAuth, clerk, betterAuth]) {
    assert.match(providerGuide, /authorizeAdmin/);
    assert.match(providerGuide, /every (?:admin )?(?:call|invocation)/i);
    assert.match(providerGuide, /component cannot access.*ctx\.auth/is);
    assert.match(providerGuide, /userId/);
    assert.match(providerGuide, /isAdmin/);
    assert.match(providerGuide, /scopeId/);
    assert.match(providerGuide, /server|host wrapper/i);
  }
  assert.match(convexAuth, /normalizeConvexAuthUserId/);
  assert.match(convexAuth, /fixtures\/auth-convex-auth/);
  assert.match(clerk, /normalizeClerkIdentity/);
  assert.match(clerk, /fixtures\/auth-clerk/);
  assert.match(betterAuth, /normalizeBetterAuthUser/);
  assert.match(betterAuth, /fixtures\/auth-better-auth/);

  assert.match(headless, /AfferentProvider/);
  assert.match(headless, /AfferentBindings/);
  assert.match(headless, /useFeedbackFeed/);
  assert.match(headless, /afferent\/react\.js/);
  assert.match(headless, /generated function references/i);

  for (const item of [
    "afferent-ui-core",
    "afferent-board",
    "afferent-admin",
    "afferent-roadmap",
    "afferent-changelog",
    "afferent-notifications",
  ]) {
    assert.match(registry, new RegExp(`\\b${item}\\b`));
  }
  assert.match(registry, /registry\/r/);
  assert.match(registry, /copy-owned|source-owned/i);
  assert.match(customization, /AfferentUiProvider/);
  assert.match(customization, /currentLocation/);
  assert.match(customization, /WCAG 2\.2 AA/);
  assert.match(customization, /forced colors/i);

  assert.match(testing, /npm run test:release:package/);
  assert.match(testing, /npm run dev:demo/);
  assert.match(testing, /npm run test:e2e:phase4/);
  assert.match(testing, /two-user|two user/i);
  assert.match(testing, /accessibility/i);

  assert.match(deployment, /host application/i);
  assert.match(deployment, /preview/i);
  assert.match(deployment, /production/i);
  assert.match(deployment, /chosen frontend platform/i);
  assert.doesNotMatch(deployment, /hosted Afferent demo/i);
  assert.doesNotMatch(deployment, /Vercel-specific/i);

  assert.match(upgrades, /Changesets/);
  assert.match(upgrades, /package.*registry/is);
  assert.match(upgrades, /copied source/i);
  assert.match(upgrades, /migration/i);
  assert.match(upgrades, /rollback/i);
});
