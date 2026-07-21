import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
