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
  const [browserTest, fixture, evidenceIndex] = await Promise.all([
    readFile("tests/accessibility/phase3.spec.ts", "utf8"),
    readFile("fixtures/registry-vite/src/App.tsx", "utf8"),
    readFile("docs/accessibility/phase-3/README.md", "utf8"),
  ]);
  for (const scenario of [
    "KF-04",
    "ST-03",
    "ST-04",
    "ST-05",
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
    "Try loading it again. If the problem continues, contact the application owner.",
    "queryErrorGuidance",
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
