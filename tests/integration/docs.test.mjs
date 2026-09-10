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

  assert.match(install, /not published to npm/i);
  assert.match(install, /npm pack --ignore-scripts/);
  assert.match(
    install,
    /npm install \/absolute\/path\/to\/afferent-0\.1\.0\.tgz/,
  );
  assert.match(mount, /afferent\/convex\.config\.js/);
  assert.match(mount, /createAfferentClient/);
  assert.match(config, /defineConfig/);
  assert.equal(packageJson.scripts["docs:build"], "vitepress build docs");
  assert.equal(packageJson.devDependencies.vitepress, "1.6.4");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.publishConfig, undefined);
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
    assert.match(providerGuide, /component cannot\s+access.*ctx\.auth/is);
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
  assert.match(upgrades, /local.*artifact.*static registry/is);
  assert.match(upgrades, /source tag/i);
  assert.match(upgrades, /copied source/i);
  assert.match(upgrades, /migration/i);
  assert.match(upgrades, /rollback/i);
});

test("the documentation verifier rejects authority, link, and deployment drift", async () => {
  const {
    assertNoNpmPublicationClaims,
    assertNoRemoteDemoClaims,
    assertSafeTypeScriptSnippet,
    validateInternalLinks,
    validateRequirementCoverage,
    validateRegistryExamples,
    validateReleaseTokens,
    validateShellFence,
  } = await import("../../scripts/test-docs.mjs");

  const manifest = JSON.parse(await readRepositoryFile("package.json"));
  const releaseDestinations = [
    "https://brady-zip.github.io/afferent/",
    "https://brady-zip.github.io/afferent",
    "https://github.com/brady-zip/afferent",
  ];
  const releaseDocuments = (destinations) =>
    new Map([["README.md", destinations.map((url) => `\`${url}\``).join("\n")]]);
  assert.deepEqual(
    validateReleaseTokens(releaseDocuments(releaseDestinations), manifest),
    [],
  );
  for (const destination of releaseDestinations) {
    assert.throws(
      () => validateReleaseTokens(releaseDocuments(
        releaseDestinations.map((url) => url === destination ? `${url}.invalid` : url),
      ), manifest),
      /required release destination is missing/iu,
    );
  }
  assert.throws(
    () => validateReleaseTokens(releaseDocuments([
      ...releaseDestinations, "AFFERENT_RELEASE_UNKNOWN",
    ]), manifest),
    /unknown release placeholder/iu,
  );
  const registryFence = (registry) => ({
    source: `npx shadcn@${manifest.devDependencies.shadcn} add ${registry}/r/afferent-board.json`,
    metadata: { mode: "registry-install" },
    documentPath: "docs/ui/registry.md",
  });
  const registryItems = new Set(["afferent-board"]);
  for (const registry of [
    "AFFERENT_RELEASE_REGISTRY_URL",
    "https://brady-zip.github.io/afferent",
  ]) {
    assert.doesNotThrow(() =>
      validateShellFence(registryFence(registry), manifest, registryItems),
    );
  }
  for (const registry of [
    "https://attacker.github.io/afferent",
    "https://brady-zip.github.io/wrong-project",
    "http://brady-zip.github.io/afferent",
  ]) {
    assert.throws(
      () =>
        validateShellFence(registryFence(registry), manifest, registryItems),
      /registry install command drifted/iu,
    );
  }

  assert.doesNotThrow(() =>
    assertNoNpmPublicationClaims(
      "Afferent v0.1 is not published to npm. Build it from source.",
      "install.md",
    ),
  );
  assert.throws(
    () =>
      assertNoNpmPublicationClaims(
        "Run npm install afferent to continue.",
        "unsafe.md",
      ),
    /npm publication claim/i,
  );
  for (const command of [
    "npm install afferent@0.1.0",
    "npm i afferent",
    "npm add --save afferent@latest",
    "pnpm add afferent",
    "yarn add afferent",
  ]) {
    assert.throws(
      () => assertNoNpmPublicationClaims(command, "unsafe.md"),
      /npm publication claim/i,
    );
  }
  for (const command of [
    "npm install /absolute/path/to/afferent-0.1.0.tgz",
    "npm install afferent-other",
    "npm install @other/afferent",
  ]) {
    assert.doesNotThrow(() => assertNoNpmPublicationClaims(command, "safe.md"));
  }
  assert.deepEqual(
    validateRequirementCoverage(
      "requirements: [COMP-01, QUAL-09]",
      "**Removed from v1:** `COMP-01` was retired.\n- [x] **QUAL-09**: Docs.",
    ),
    { active: ["QUAL-09"], retired: ["COMP-01"] },
  );
  assert.deepEqual(
    validateRequirementCoverage(
      "requirements: [REL-05, REL-06, QUAL-09]",
      "**Removed from v1:**\n`REL-05` and `REL-06` are retired; `QUAL-09` remains active.",
    ),
    { active: ["QUAL-09"], retired: ["REL-05", "REL-06"] },
  );
  for (const malformed of [
    "**Removed from v1:** requirement `COMP-01` was retired.",
    "**Removed from v1:** the `component` requirement `COMP-01` was retired.",
    "**Removed from v1:** see `npm install` note, `COMP-01` was retired.",
    "**Removed from v1:** the requirement for npm-registry installation,\n`COMP-01`, is retired.",
    "**Removed from v1:** none; see `COMP-02` for the replacement.",
    "**Removed from v1:** superseded, do not use `QUAL-11` as a guide.",
    "**Removed from v1:** nothing here at all",
    "**Removed from v1:** `COMP-01` was retired.\n\n**Removed from v1:** no ID list",
  ]) {
    assert.throws(
      () =>
        validateRequirementCoverage(
          "requirements: [QUAL-09]",
          `${malformed}\nQUAL-09 remains active.`,
        ),
      /marker must be followed directly by a backticked requirement ID list/iu,
    );
  }

  assert.doesNotThrow(() =>
    assertSafeTypeScriptSnippet(
      "const userId = await getAuthUserId(ctx);",
      "safe.md",
    ),
  );
  assert.throws(
    () =>
      assertSafeTypeScriptSnippet(
        "export const unsafe = mutation({ handler: (ctx, args) => args.userId });",
        "unsafe.md",
      ),
    /browser authority.*userId/i,
  );
  assert.throws(
    () =>
      assertSafeTypeScriptSnippet(
        "type Args = { scopeId: string; isAdmin: boolean };",
        "unsafe.md",
      ),
    /browser authority.*scopeId|scopeId.*browser authority/i,
  );

  assert.doesNotThrow(() =>
    assertNoRemoteDemoClaims(
      "Afferent does not operate a hosted demo deployment.",
      "deployment.md",
    ),
  );
  assert.throws(
    () =>
      assertNoRemoteDemoClaims(
        "Try the demo at https://afferent-demo.example.vercel.app.",
        "deployment.md",
      ),
    /remote demo|hosted demo/i,
  );
  assert.throws(
    () =>
      assertNoRemoteDemoClaims(
        "VITE_CONVEX_URL=https://afferent-demo.convex.cloud",
        "deployment.md",
      ),
    /remote demo|hosted demo/i,
  );

  const documents = new Map([
    ["docs/index.md", "[Install](./guide/install.md)"],
    ["docs/guide/install.md", "# Install"],
  ]);
  assert.doesNotThrow(() => validateInternalLinks(documents));
  assert.throws(
    () =>
      validateInternalLinks(
        new Map([["docs/index.md", "[Missing](./guide/missing.md)"]]),
      ),
    /dead internal link/i,
  );

  assert.doesNotThrow(() =>
    validateRegistryExamples(
      "Install `afferent-board` from `registry/r/afferent-board.json`.",
      new Set(["afferent-board"]),
      "registry.md",
    ),
  );
  assert.throws(
    () =>
      validateRegistryExamples(
        "Install `afferent-invented`.",
        new Set(["afferent-board"]),
        "registry.md",
      ),
    /unknown registry item/i,
  );
});
