import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

import {
  recordPhase4Completion,
  runPhase4Internal,
} from "../../scripts/test-demo.mjs";
import {
  PHASE4_TIMEOUT,
  phase4AccountEmail,
} from "./phase4-helpers";

type AccessibilityScenario = Readonly<{
  id: string;
  violations: readonly Readonly<{
    id: string;
    impact: string | null;
    nodes: number;
  }>[];
}>;

async function keyboardActivate(
  page: Page,
  locator: Locator,
  key = "Enter",
) {
  await locator.focus();
  await expect(locator).toBeFocused();
  await page.keyboard.press(key);
}

async function keyboardType(page: Page, locator: Locator, value: string) {
  await locator.focus();
  await expect(locator).toBeFocused();
  await page.keyboard.insertText(value);
}

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    return {
      clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll<HTMLElement>("body *")]
        .map((element) => {
          const rectangle = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: element.className.toString().slice(0, 80),
            right: Math.round(rectangle.right),
            width: Math.round(rectangle.width),
          };
        })
        .filter(({ right, width }) => right > clientWidth + 1 || width > clientWidth)
        .sort((left, right) => right.right - left.right)
        .slice(0, 8),
    };
  });
  expect(
    dimensions.scrollWidth,
    `page overflowed by ${
      dimensions.scrollWidth - dimensions.clientWidth
    }px: ${JSON.stringify(dimensions.offenders)}`,
  ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function audit(
  page: Page,
  scenarios: AccessibilityScenario[],
  id: string,
) {
  await assertNoHorizontalOverflow(page);
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
  }));
  scenarios.push({ id, violations });
  expect(violations, `${id} axe violations`).toEqual([]);
}

async function createAccountByKeyboard(
  page: Page,
  email: string,
) {
  await keyboardType(page, page.getByLabel("Email"), email);
  await keyboardType(
    page,
    page.getByLabel("Password"),
    "Phase4-password-2026!",
  );
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Create a demo account" }),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Sandbox feedback" }),
  ).toBeVisible({ timeout: PHASE4_TIMEOUT });
}

async function exerciseKeyboardProductJourney(
  page: Page,
  scenarios: AccessibilityScenario[],
  testInfo: TestInfo,
) {
  const title = `Keyboard release proof ${testInfo.project.name}`;
  await page.getByLabel("Board").focus();
  await page
    .getByLabel("Board")
    .selectOption({ label: "Product feedback" });
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Create feedback" }),
  );
  await keyboardType(page, page.getByLabel("Feedback title"), title);
  await keyboardType(
    page,
    page.getByLabel("Feedback details"),
    "Keyboard-only creation, participation, moderation, and publication proof.",
  );
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Post feedback" }),
  );
  const result = page
    .getByRole("region", { name: "Feedback results" })
    .getByRole("link", { name: title, exact: true });
  await expect(result).toBeVisible({ timeout: PHASE4_TIMEOUT });
  await keyboardActivate(page, result);

  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Vote for feedback" }),
  );
  await expect(
    page.getByRole("button", { name: "Remove feedback vote" }),
  ).toBeVisible();
  await keyboardType(
    page,
    page.getByLabel("Add a comment"),
    "Keyboard-only comment proof.",
  );
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Post comment" }),
  );
  await expect(
    page.getByText("Keyboard-only comment proof.", { exact: true }),
  ).toBeVisible();

  await keyboardActivate(
    page,
    page.getByRole("link", { name: "Administration", exact: true }),
  );
  const queue = page.getByRole("region", { name: "Feedback queue" });
  await expect(queue).toBeVisible({ timeout: PHASE4_TIMEOUT });
  await keyboardActivate(
    page,
    queue.getByRole("button").filter({ hasText: title }),
  );
  const moderation = page.getByRole("form", { name: "Moderation" });
  await expect(moderation).toBeVisible();
  const status = moderation.getByLabel("Update feedback status");
  await status.focus();
  await status.selectOption("in_progress");
  await expect(status).toHaveValue("in_progress");

  const changelogTitle = "Keyboard publication proof";
  await keyboardType(
    page,
    page.getByLabel("Changelog title"),
    changelogTitle,
  );
  await keyboardType(
    page,
    page.getByLabel("Changelog body"),
    "Published without a pointer.",
  );
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Save changelog draft" }),
  );
  const entry = page
    .getByRole("article")
    .filter({ hasText: changelogTitle });
  await expect(entry).toBeVisible({ timeout: PHASE4_TIMEOUT });
  const linked = entry.getByRole("checkbox", { name: title });
  await keyboardActivate(page, linked, "Space");
  await expect(linked).toBeChecked();
  await keyboardActivate(
    page,
    entry.getByRole("button", { name: "Publish changelog entry" }),
  );
  const publishDialog = page.getByRole("dialog");
  await expect(publishDialog).toBeVisible();
  await keyboardActivate(
    page,
    publishDialog.getByRole("button", {
      name: "Publish changelog entry",
    }),
  );
  await expect(publishDialog).toBeHidden({ timeout: PHASE4_TIMEOUT });
  await audit(page, scenarios, "AX-04-admin-ready");
}

async function exerciseResetDialog(
  page: Page,
  scenarios: AccessibilityScenario[],
  confirm: boolean,
) {
  const trigger = page
    .locator('[aria-label="Sandbox status"]')
    .getByRole("button", { name: "Reset my sandbox" });
  await keyboardActivate(page, trigger);
  const dialog = page.getByRole("dialog", {
    name: "Reset your private sandbox?",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await audit(page, scenarios, "AX-05-reset-dialog");
  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }

  if (!confirm) {
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    return;
  }

  await keyboardActivate(
    page,
    dialog.getByRole("button", { name: "Reset my sandbox" }),
  );
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { level: 1, name: "Sandbox feedback" }),
  ).toBeVisible({ timeout: PHASE4_TIMEOUT });
  await expect(trigger).toBeFocused();
}

async function writeEvidence({
  browser,
  page,
  scenarios,
  testInfo,
}: Readonly<{
  browser: Browser;
  page: Page;
  scenarios: AccessibilityScenario[];
  testInfo: TestInfo;
}>) {
  const directory = process.env.PHASE4_EVIDENCE_DIR;
  const artifactDigest = process.env.PHASE4_ARTIFACT_DIGEST;
  const backendKind = process.env.PHASE4_BACKEND_KIND;
  const sourceCommit = process.env.PHASE4_SOURCE_COMMIT;
  if (!directory || !artifactDigest || !backendKind || !sourceCommit) {
    throw new Error("Phase 4 accessibility evidence environment is incomplete");
  }
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, `accessibility--${testInfo.project.name}.json`),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        status: "complete",
        artifactDigest,
        backendKind,
        sourceCommit,
        project: testInfo.project.name,
        browser: {
          name: "chromium",
          version: browser.version(),
        },
        tools: {
          axe: "4.11.0",
          playwright: "1.59.1",
        },
        viewport: page.viewportSize(),
        media: {
          reducedMotion: "reduce",
        },
        scenarios,
      },
      null,
      2,
    )}\n`,
  );
}

test("gates keyboard, responsive, reduced-motion, reflow, and axe behavior", async ({
  browser,
  page,
}, testInfo) => {
  const scenarios: AccessibilityScenario[] = [];
  const originalViewport = page.viewportSize();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Showcase", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page).toHaveTitle("Feedback — Afferent showcase");
  await audit(page, scenarios, "AX-01-showcase");

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await keyboardActivate(page, skip);
  await expect(page.locator("#host-main")).toBeFocused();

  await keyboardActivate(
    page,
    page.getByRole("link", { name: "My sandbox", exact: true }),
  );
  await expect(
    page.getByRole("heading", {
      name: "Sign in to open your private sandbox",
    }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Feedback — Afferent private sandbox");
  await audit(page, scenarios, "AX-02-sign-in");

  const email = phase4AccountEmail("accessibility", testInfo);
  await createAccountByKeyboard(page, email);
  await audit(page, scenarios, "AX-03-sandbox-ready");

  if (testInfo.project.name === "chromium") {
    await exerciseKeyboardProductJourney(page, scenarios, testInfo);
    await exerciseResetDialog(page, scenarios, true);

    await runPhase4Internal("saturateWrites", { email });
    await keyboardActivate(
      page,
      page.getByRole("link", { name: "Feedback", exact: true }),
    );
    await page
      .getByLabel("Board")
      .selectOption({ label: "Product feedback" });
    await keyboardActivate(
      page,
      page.getByRole("button", { name: "Create feedback" }),
    );
    await keyboardType(
      page,
      page.getByLabel("Feedback title"),
      "Keyboard quota proof",
    );
    await keyboardType(
      page,
      page.getByLabel("Feedback details"),
      "The server rejects this write without losing keyboard focus.",
    );
    await keyboardActivate(
      page,
      page.getByRole("button", { name: "Post feedback" }),
    );
    const quotaAlert = page.getByRole("alert");
    await expect(quotaAlert).toContainText(
      "Please wait before trying again.",
      {
        timeout: PHASE4_TIMEOUT,
      },
    );
    await expect(quotaAlert).not.toContainText(
      /Request ID|CONVEX M|scopeId|generation|Server Error|at async/i,
      {
        timeout: PHASE4_TIMEOUT,
      },
    );
    await audit(page, scenarios, "AX-06-quota-error");

    // Browser zoom reduces the available CSS viewport.
    // This is the 200% equivalent of a 640px physical browser viewport.
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => innerWidth)).toBe(320);
    await assertNoHorizontalOverflow(page);
    scenarios.push({ id: "RZ-01-zoom-200", violations: [] });
    if (originalViewport) await page.setViewportSize(originalViewport);

    await keyboardActivate(
      page,
      page.getByRole("button", { name: "Sign out" }),
    );
    await expect(
      page.getByRole("heading", {
        name: "Sign in to open your private sandbox",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Keyboard quota proof", { exact: true }),
    ).toHaveCount(0);
  } else {
    await exerciseResetDialog(page, scenarios, false);
  }

  await writeEvidence({ browser, page, scenarios, testInfo });
  await recordPhase4Completion(testInfo);
});
