import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(await readFile("package.json", "utf8"));

function expandScript(name, seen = new Set()) {
  assert.equal(typeof manifest.scripts?.[name], "string", `missing ${name}`);
  if (seen.has(name)) return "";
  seen.add(name);
  const command = manifest.scripts[name];
  return `${command} ${[...command.matchAll(/npm run (?<name>[\w:-]+)/g)]
    .map((match) => expandScript(match.groups.name, seen))
    .join(" ")}`;
}

test("test:phase3 composes every release gate and the Phase 2 regression", () => {
  const command = expandScript("test:phase3");
  for (const required of [
    "scripts/generate-ui-artifacts.mjs",
    "git diff --exit-code -- registry examples/ui/afferent",
    "tests/integration/registry-ui.test.mjs",
    "tests/integration/ui-artifacts.test.mjs",
    "tests/ui",
    "tests/ui/hydration.test.tsx",
    "tests/static/ui-contracts.test.ts",
    "tests/accessibility/contrast.test.ts",
    "playwright test tests/accessibility/phase3.spec.ts",
    "npm run test:phase2",
    "tests/integration/phase3-gate.test.mjs",
  ]) {
    assert.match(command, new RegExp(required.replaceAll(".", String.raw`\.`)));
  }
});

test("the browser oracle is pinned, installed-source backed, and cannot skip", async () => {
  const [configuration, browserTest, server] = await Promise.all([
    readFile("playwright.config.ts", "utf8"),
    readFile("tests/accessibility/phase3.spec.ts", "utf8"),
    readFile("scripts/serve-ui-evidence-fixture.mjs", "utf8"),
  ]);
  assert.match(configuration, /browserName:\s*"chromium"/);
  assert.match(configuration, /reuseExistingServer:\s*false/);
  assert.match(server, /prepareRegistryConsumer/);
  assert.match(browserTest, /packed-registry-installed/);
  assert.doesNotMatch(browserTest, /test\.(?:skip|fixme|only)|describe\.skip/);
  assert.doesNotMatch(configuration, /ignoreHTTPSErrors|retries:\s*[1-9]/);
});

test("the browser oracle retains every repaired state and deterministic capture", async () => {
  const [
    browserTest,
    fixture,
    evidenceIndex,
    canonicalCopy,
    mirroredCopy,
    registryCopy,
    boardRecoveryMatrix,
    publicRecoveryMatrix,
  ] = await Promise.all([
    readFile("tests/accessibility/phase3.spec.ts", "utf8"),
    readFile("fixtures/registry-vite/src/App.tsx", "utf8"),
    readFile("docs/accessibility/phase-3/README.md", "utf8"),
    readFile("ui/afferent/core/copy.ts", "utf8"),
    readFile("examples/ui/afferent/core/copy.ts", "utf8"),
    readFile("registry/r/afferent-ui-core.json", "utf8"),
    readFile("tests/ui/board.test.tsx", "utf8"),
    readFile("tests/ui/public-surfaces.test.tsx", "utf8"),
  ]);
  const approvedGuidance =
    "Try loading it again. If the problem continues, contact the application owner.";
  for (const copyArtifact of [canonicalCopy, mirroredCopy, registryCopy]) {
    assert.match(copyArtifact, /queryErrorGuidance/);
    assert.match(
      copyArtifact,
      new RegExp(approvedGuidance.replaceAll(".", String.raw`\.`)),
    );
  }
  for (const scenario of [
    "KF-04",
    "ST-03",
    "ST-04",
    "ST-05",
    "ST-06",
    "RZ-02",
    "VIS-01",
    "VIS-02",
  ]) {
    assert.match(browserTest, new RegExp(`\\b${scenario}\\b`));
  }
  for (const required of [
    "Archive feedback",
    "Delete feedback tag",
    "Publish changelog entry",
    "Unpublish changelog entry",
    "Merge duplicate",
    "data-mobile-view",
    "activity-error",
    "Retry activity",
    "buttonHeight",
    "cardGeometry",
    "data-admin-section",
    "No feedback to review",
    "2026-01-15T12:00:00.000Z",
  ]) {
    assert.match(
      `${browserTest}\n${fixture}`,
      new RegExp(required.replaceAll(".", String.raw`\.`)),
    );
  }
  assert.match(
    fixture,
    /"activity-error":\s*"evidence:activity"/,
  );
  assert.match(
    fixture,
    /<option value="activity-error">Activity error<\/option>/,
  );
  assert.match(
    browserTest,
    /selectEvidenceOption\(page, "Admin scenario", "activity-error"\)/,
  );
  assert.match(
    browserTest,
    new RegExp(approvedGuidance.replaceAll(".", String.raw`\.`)),
  );
  assert.match(
    boardRecoveryMatrix,
    /every board query error preserves its domain action and exact watch arguments under default and custom guidance/,
  );
  for (const binding of [
    "feed",
    "search",
    "similar",
    "post",
    "comments",
    "activity",
  ]) {
    assert.match(boardRecoveryMatrix, new RegExp(`binding: "${binding}"`));
  }
  assert.match(
    publicRecoveryMatrix,
    /every public surface query error preserves its domain action and exact watch arguments under default and custom guidance/,
  );
  for (const binding of [
    "roadmap",
    "changelogFeed",
    "changelogEntry",
    "notifications",
  ]) {
    assert.match(publicRecoveryMatrix, new RegExp(`binding: "${binding}"`));
  }
  assert.match(boardRecoveryMatrix, /sentinelGuidance/);
  assert.match(publicRecoveryMatrix, /sentinelGuidance/);
  const publicRecoveryScenarios = [
    "public-feed-error",
    "public-search-error",
    "public-similar-error",
    "public-detail-error",
    "public-discussion-error",
    "public-activity-error",
    "public-roadmap-planned-error",
    "public-roadmap-in-progress-error",
    "public-roadmap-complete-error",
    "public-changelog-feed-error",
    "public-changelog-entry-error",
    "public-notifications-error",
  ];
  for (const scenario of publicRecoveryScenarios) {
    assert.match(
      fixture,
      new RegExp(`<option value="${scenario}">`),
    );
    assert.match(browserTest, new RegExp(`scenario: "${scenario}"`));
  }
  assert.match(fixture, /publicFailures:\s*Partial<Record<PublicRecoveryScenario, string>>/);
  assert.match(fixture, /roadmapFailures:\s*Partial</);
  assert.match(fixture, /onPublicQueryAttempt\(attemptKey, queryAttempt\)/);
  assert.match(browserTest, /for \(const recovery of cases\)/);
  assert.match(browserTest, /name: recovery\.action, exact: true/);
  assert.match(browserTest, /data-public-query-attempts/);
  assert.match(browserTest, /document\.fonts\.ready/);
  assert.match(browserTest, /requestAnimationFrame/);
  assert.match(browserTest, /animations:\s*"disabled"/);
  assert.match(browserTest, /caret:\s*"hide"/);
  assert.match(browserTest, /transition:\s*none\s*!important/);
  assert.match(fixture, /Date\.UTC\(2026,/);
  assert.doesNotMatch(fixture, /Date\.now|Math\.random|randomUUID/);

  const captures = [
    "phone-320.png",
    "tablet-768.png",
    "desktop-1280.png",
    "reflow-320.png",
    "zoom-200.png",
    "board-1280.png",
    "detail-1280.png",
    "public-recovery-1280.png",
    "roadmap-1280.png",
    "changelog-1280.png",
    "notifications-1280.png",
    "notifications-popover-1280.png",
    "admin-queue-320.png",
    "admin-detail-320.png",
    "admin-confirmations-1280.png",
    "admin-states-1280.png",
    "admin-empty-1280.png",
    "dark-public-1280.png",
    "dark-admin-1280.png",
  ];
  for (const capture of captures) {
    const pattern = new RegExp(capture.replaceAll(".", String.raw`\.`));
    assert.match(browserTest, pattern);
    assert.match(evidenceIndex, pattern);
    const captureStat = await stat(`docs/accessibility/phase-3/${capture}`);
    assert.ok(captureStat.size > 0, `${capture} must be non-empty`);
  }
});
