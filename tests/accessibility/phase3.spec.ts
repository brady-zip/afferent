import { mkdir } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const evidenceRoot = "docs/accessibility/phase-3";

test.beforeAll(async () => {
  await mkdir(evidenceRoot, { recursive: true });
});

async function activateSurface(page: Page, label: string) {
  const control = page.getByRole("button", { name: label, exact: true });
  await control.focus();
  await page.keyboard.press("Enter");
  await expect(control).toHaveAttribute("aria-current", "page");
  return control;
}

async function expectVisibleFocus(locator: Locator) {
  await expect(locator).toBeFocused();
  const result = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const center = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + Math.min(rect.height / 2, 8),
    );
    return {
      outline: Number.parseFloat(style.outlineWidth),
      visible:
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth,
      unobscured:
        center === element ||
        (center instanceof Node && element.contains(center)) ||
        (center instanceof Node && center.contains(element)),
    };
  });
  expect(result.outline).toBeGreaterThanOrEqual(2);
  expect(result.visible).toBe(true);
  expect(result.unobscured).toBe(true);
}

async function assertNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function measuredTargets(page: Page) {
  return page
    .locator(
      "[data-afferent-screen] button, [data-afferent-screen] a, [data-afferent-screen] input, [data-afferent-screen] select, [data-afferent-screen] textarea",
    )
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (
          style.visibility === "hidden" ||
          style.display === "none" ||
          rect.width === 0 ||
          rect.height === 0
        ) {
          return [];
        }
        const target =
          element instanceof HTMLInputElement && element.type === "checkbox"
            ? (element.closest("label") ?? element)
            : element;
        const targetRect = target.getBoundingClientRect();
        return [
          {
            name:
              element.getAttribute("aria-label") ??
              element.textContent?.trim() ??
              element.getAttribute("name") ??
              element.tagName.toLowerCase(),
            width: targetRect.width,
            height: targetRect.height,
          },
        ];
      }),
    );
}

test("KF-01 public board, search, create, detail, vote, and comment are keyboard complete", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator('[data-evidence-source="packed-registry-installed"]'),
  ).toBeVisible();

  const create = page.getByRole("button", { name: "Create feedback" });
  await create.focus();
  await expectVisibleFocus(create);
  await page.keyboard.press("Enter");
  const title = page.getByRole("textbox", { name: "Feedback title" });
  await title.focus();
  await page.keyboard.type("Accessible command palette");
  const body = page.getByRole("textbox", { name: "Feedback details" });
  await body.focus();
  await page.keyboard.type("Keep every editor action available by keyboard.");
  const submit = page.getByRole("button", { name: "Post feedback" });
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator("[data-afferent-composer] + [role='status']"),
  ).toContainText("Feedback posted");
  await expect(submit).toBeFocused();

  const search = page.getByRole("searchbox", { name: "Search feedback" });
  await search.focus();
  await page.keyboard.type("keyboard");
  await expect(
    page.locator(".afferent-board__results [role='status']"),
  ).toContainText("1 feedback result");
  await expect(search).toBeFocused();

  await activateSurface(page, "Feedback detail");
  const vote = page.getByRole("button", { name: "Vote for feedback" });
  await vote.focus();
  await expectVisibleFocus(vote);
  await page.keyboard.press("Enter");
  const comment = page.getByRole("textbox", { name: "Comment" });
  await comment.focus();
  await page.keyboard.type("Keyboard evidence comment");
  const postComment = page.getByRole("button", { name: "Post comment" });
  await postComment.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Discussion" })).toBeVisible();
});

test("KF-02 dialog and popover contain or restore focus without traps", async ({
  page,
}) => {
  await page.goto("/");
  await activateSurface(page, "Notifications popover");
  const popoverTrigger = page.getByRole("button", {
    name: /Open notifications, 1 unread notification/,
  });
  await popoverTrigger.focus();
  await page.keyboard.press("Enter");
  const popover = page.locator("[data-afferent-notifications-popover]");
  await expect(popover).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(popoverTrigger).toBeFocused();

  await activateSurface(page, "Feedback detail");
  const withdrawTrigger = page.getByRole("button", {
    name: "Withdraw feedback",
  });
  await withdrawTrigger.focus();
  await page.keyboard.press("Enter");
  const withdrawDialog = page.getByRole("dialog", {
    name: /Withdraw “Keyboard shortcuts”/,
  });
  await expect(withdrawDialog).toBeVisible();
  expect(
    await withdrawDialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(withdrawDialog).toBeHidden();
  await expect(withdrawTrigger).toBeFocused();

  await activateSurface(page, "Administration");
  const firstRow = page.locator("[data-admin-feedback] button").first();
  await firstRow.focus();
  await page.keyboard.press("Enter");
  const mergeTrigger = page.getByRole("button", { name: "Merge duplicate" });
  await mergeTrigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Merge duplicate" });
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(mergeTrigger).toBeFocused();
});

test("KF-03 admin moderation, status, archive, merge, and changelog actions remain keyboard reachable", async ({
  page,
}) => {
  await page.goto("/");
  await activateSurface(page, "Administration");
  const firstRow = page.locator("[data-admin-feedback] button").first();
  await firstRow.focus();
  await page.keyboard.press("Enter");

  const status = page.getByRole("combobox", {
    name: "Update feedback status",
  });
  await status.focus();
  await page.keyboard.press("ArrowDown");
  const archive = page.getByRole("button", { name: "Archive feedback" });
  await archive.focus();
  await expectVisibleFocus(archive);
  await page.keyboard.press("Enter");

  const changelogTitle = page.getByRole("textbox", { name: "Changelog title" });
  await changelogTitle.focus();
  await page.keyboard.type("Keyboard release");
  const changelogBody = page.getByRole("textbox", { name: "Changelog body" });
  await changelogBody.focus();
  await page.keyboard.type("Every action remains keyboard reachable.");
  const saveDraft = page.getByRole("button", { name: "Save changelog draft" });
  await saveDraft.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Publish changelog entry" }),
  ).toBeVisible();
});

test("AX-01 axe is a supplemental regression net for stable public and admin states", async ({
  page,
}) => {
  await page.goto("/");
  const publicResult = await new AxeBuilder({ page })
    .include("[data-afferent-screen]")
    .analyze();
  expect(publicResult.violations).toEqual([]);

  await activateSurface(page, "Administration");
  await page.locator("[data-admin-feedback] button").first().press("Enter");
  const adminResult = await new AxeBuilder({ page })
    .include("[data-afferent-screen]")
    .analyze();
  expect(adminResult.violations).toEqual([]);
});

test("RZ-01 reflow, responsive layouts, zoom, and measured targets preserve every action", async ({
  browser,
  page,
}) => {
  const captures = [
    { width: 320, height: 800, file: "phone-320.png" },
    { width: 768, height: 1024, file: "tablet-768.png" },
    { width: 1280, height: 800, file: "desktop-1280.png" },
  ] as const;

  for (const capture of captures) {
    await page.setViewportSize(capture);
    await page.goto("/");
    await activateSurface(page, "Administration");
    await page.locator("[data-admin-feedback] button").first().press("Enter");
    for (const action of [
      "Save moderation changes",
      "Archive feedback",
      "Merge duplicate",
      "Save changelog draft",
      "Publish changelog entry",
    ]) {
      await expect(page.getByRole("button", { name: action })).toBeVisible();
    }
    await assertNoPageOverflow(page);
    const targets = await measuredTargets(page);
    expect(targets.length).toBeGreaterThan(0);
    expect(
      targets.filter((target) => target.width < 24 || target.height < 24),
    ).toEqual([]);
    await page.screenshot({
      path: `${evidenceRoot}/${capture.file}`,
      fullPage: true,
      animations: "disabled",
    });
    if (capture.width === 320) {
      await page.screenshot({
        path: `${evidenceRoot}/reflow-320.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
  }

  await page.setViewportSize({ width: 640, height: 800 });
  await page.goto("/");
  await activateSurface(page, "Administration");
  await page.locator("[data-admin-feedback] button").first().press("Enter");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await assertNoPageOverflow(page);
  await expect(
    page.getByRole("button", { name: "Merge duplicate" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${evidenceRoot}/zoom-200.png`,
    fullPage: true,
    animations: "disabled",
  });

  const coarse = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    hasTouch: true,
    viewport: { width: 320, height: 800 },
  });
  const coarsePage = await coarse.newPage();
  await coarsePage.goto("/");
  await activateSurface(coarsePage, "Administration");
  await coarsePage
    .locator("[data-admin-feedback] button")
    .first()
    .press("Enter");
  const coarseTargets = await measuredTargets(coarsePage);
  expect(
    coarseTargets.filter((target) => target.width < 44 || target.height < 44),
  ).toEqual([]);
  await coarse.close();
});
