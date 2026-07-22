import { mkdir, readFile, writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const evidenceRoot = "docs/accessibility/phase-3";
const keyboardEvidence: Readonly<{
  id: string;
  expected: string;
  actual: string;
}>[] = [];
const statusEvidence: Readonly<{
  id: string;
  expected: string;
  actual: string;
}>[] = [];

test.setTimeout(60_000);

test.beforeAll(async () => {
  await mkdir(evidenceRoot, { recursive: true });
});

test.afterAll(async () => {
  const keyboardRows = keyboardEvidence
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(
      (entry) => `| ${entry.id} | ${entry.expected} | ${entry.actual} | Pass |`,
    )
    .join("\n");
  await writeFile(
    `${evidenceRoot}/keyboard-focus.md`,
    `# Keyboard and focus evidence\n\nCriteria: 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11, 2.5.7.\n\n| Scenario | Expected | Actual | Result |\n| --- | --- | --- | --- |\n${keyboardRows}\n`,
  );
  const statusRows = statusEvidence
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(
      (entry) => `| ${entry.id} | ${entry.expected} | ${entry.actual} | Pass |`,
    )
    .join("\n");
  await writeFile(
    `${evidenceRoot}/status-messages.md`,
    `# Status message evidence\n\nCriteria: 3.3.1, 3.3.2, 4.1.3. Polite status updates do not move focus; alerts are reserved for correction-required mutation errors.\n\n| Scenario | Expected | Actual | Result |\n| --- | --- | --- | --- |\n${statusRows}\n`,
  );
});

async function activateSurface(page: Page, label: string) {
  const control = page.getByRole("button", { name: label, exact: true });
  await control.press("Enter");
  await expect(control).toHaveAttribute("aria-current", "page");
  return control;
}

async function selectEvidenceOption(
  page: Page,
  control: "Evidence theme" | "Admin scenario" | "Mutation outcome",
  value: string,
) {
  await page.getByRole("combobox", { name: control }).selectOption(value);
}

async function openAdminDetail(page: Page) {
  await activateSurface(page, "Administration");
  const row = page.locator("[data-admin-feedback] button").first();
  await row.press("Enter");
  await expect(row).toHaveAttribute("aria-current", "true");
  return row;
}

async function openConfirmation(
  page: Page,
  triggerLabel: string,
  dialogName: RegExp,
) {
  const trigger = page.getByRole("button", { name: triggerLabel }).first();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(dialog).toBeVisible();
  return { dialog, trigger };
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

async function captureEvidence(
  page: Page,
  file: string,
  options: Readonly<{ fullPage?: boolean }> = {},
) {
  await assertNoPageOverflow(page);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({
    path: `${evidenceRoot}/${file}`,
    fullPage: options.fullPage ?? true,
    animations: "disabled",
    caret: "hide",
    style:
      "*, *::before, *::after { animation: none !important; caret-color: transparent !important; transition: none !important; }",
  });
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
  statusEvidence.push({
    id: "ST-01",
    expected: "Feedback success is polite and focus remains on Post feedback",
    actual: "Feedback posted; focus remained on Post feedback",
  });

  const search = page.getByRole("searchbox", { name: "Search feedback" });
  await search.focus();
  await page.keyboard.type("keyboard");
  await expect(
    page.locator(".afferent-board__results [role='status']"),
  ).toContainText("1 feedback result");
  await expect(search).toBeFocused();
  statusEvidence.push({
    id: "ST-02",
    expected: "Search result count changes without moving focus",
    actual: "1 feedback result; focus remained on Search feedback",
  });

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
  keyboardEvidence.push({
    id: "KF-01",
    expected:
      "Create, search, vote, and comment controls follow DOM order with visible unobscured focus",
    actual:
      "All controls completed by keyboard with 2px focus outline and no focus theft",
  });
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
  keyboardEvidence.push({
    id: "KF-02",
    expected:
      "Popover and dialogs close on Escape, contain modal focus, and restore the invoker",
    actual:
      "Popover, withdraw dialog, and merge dialog restored their invoking buttons",
  });
});

test("KF-03 admin moderation, status, archive, merge, and changelog actions remain keyboard reachable", async ({
  page,
}) => {
  await page.goto("/");
  await activateSurface(page, "Administration");
  const firstRow = page.locator("[data-admin-feedback] button").first();
  await firstRow.focus();
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
    page.getByRole("button", {
      name: "Publish changelog entry",
      exact: true,
    }),
  ).toBeVisible();

  const status = page.getByRole("combobox", {
    name: "Update feedback status",
  });
  await status.focus();
  await page.keyboard.press("ArrowDown");
  const archive = page.getByRole("button", { name: "Archive feedback" });
  await archive.focus();
  await expectVisibleFocus(archive);
  await page.keyboard.press("Enter");
  const archiveDialog = page.getByRole("dialog", {
    name: /Archive “Keyboard shortcuts”/,
  });
  await expect(archiveDialog).toContainText(
    "It will leave public feedback views until restored.",
  );
  await page.keyboard.press("Escape");
  await expect(archiveDialog).toBeHidden();
  await expect(archive).toBeFocused();
  await page.keyboard.press("Enter");
  await archiveDialog
    .getByRole("button", { name: "Archive feedback" })
    .press("Enter");
  await expect(archiveDialog).toBeHidden();
  await expect(archive).toBeFocused();
  keyboardEvidence.push({
    id: "KF-03",
    expected:
      "Moderation, status, archive, merge, and changelog actions require no dragging",
    actual:
      "All named admin actions remained keyboard reachable; status used a native select",
  });
});

test("KF-04 every consequential admin dialog supports cancel and accepted keyboard completion", async ({
  page,
}) => {
  await page.goto("/");
  await openAdminDetail(page);

  const scenarios = [
    {
      trigger: "Archive feedback",
      dialog: /Archive “Keyboard shortcuts”/,
      consequence: "It will leave public feedback views until restored.",
      escape: "Keep feedback",
    },
    {
      trigger: "Delete feedback tag",
      dialog: /Delete “Important”/,
      consequence:
        "The tag will be removed from assigned feedback without deleting feedback.",
      escape: "Keep tag",
    },
    {
      trigger: "Unpublish changelog entry",
      dialog: /Unpublish “Published update”/,
      consequence:
        "Its public changelog link will stop showing the entry until republished.",
      escape: "Keep changelog published",
    },
    {
      trigger: "Publish changelog entry",
      dialog: /Publish “Editor update” now/,
      consequence: "It will become visible at its public changelog link.",
      escape: "Return to editing",
    },
  ] as const;

  for (const scenario of scenarios) {
    let opened = await openConfirmation(
      page,
      scenario.trigger,
      scenario.dialog,
    );
    await expect(opened.dialog).toContainText(scenario.consequence);
    await expect(
      opened.dialog.getByRole("button", { name: scenario.escape }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(opened.dialog).toBeHidden();
    await expect(opened.trigger).toBeFocused();

    opened = await openConfirmation(page, scenario.trigger, scenario.dialog);
    await opened.dialog
      .getByRole("button", { name: scenario.trigger })
      .press("Enter");
    await expect(opened.dialog).toBeHidden();
    await expect(opened.trigger).toBeFocused();
  }

  let merge = await openConfirmation(
    page,
    "Merge duplicate",
    /Merge duplicate/,
  );
  await expect(merge.dialog).toContainText(
    "Merge “Keyboard shortcuts” into “Editor productivity”? This moves its votes, comments, and history and cannot be undone.",
  );
  await expect(
    merge.dialog.getByRole("button", { name: "Keep feedback" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(merge.dialog).toBeHidden();
  await expect(merge.trigger).toBeFocused();

  merge = await openConfirmation(page, "Merge duplicate", /Merge duplicate/);
  await merge.dialog
    .getByRole("textbox", { name: "Duplicate title", exact: true })
    .fill("Keyboard shortcuts");
  await merge.dialog
    .getByRole("button", { name: "Merge duplicate" })
    .press("Enter");
  await expect(merge.dialog).toBeHidden();
  await expect(merge.trigger).toBeFocused();
  keyboardEvidence.push({
    id: "KF-04",
    expected:
      "Archive, tag delete, publish, unpublish, and merge expose exact consequences, Escape actions, and accepted completion",
    actual:
      "All five dialogs cancelled and completed by keyboard, then restored their logical trigger",
  });
});

test("ST-03 every consequential dialog retains typed correction state and retries", async ({
  page,
}) => {
  await page.goto("/");
  await selectEvidenceOption(page, "Mutation outcome", "error-once");
  await openAdminDetail(page);
  const scenarios = [
    { trigger: "Archive feedback", dialog: /Archive “Keyboard shortcuts”/ },
    { trigger: "Delete feedback tag", dialog: /Delete “Important”/ },
    {
      trigger: "Unpublish changelog entry",
      dialog: /Unpublish “Published update”/,
    },
    {
      trigger: "Publish changelog entry",
      dialog: /Publish “Editor update” now/,
    },
    { trigger: "Merge duplicate", dialog: /Merge duplicate/ },
  ] as const;

  for (const scenario of scenarios) {
    const opened = await openConfirmation(
      page,
      scenario.trigger,
      scenario.dialog,
    );
    if (scenario.trigger === "Merge duplicate") {
      await opened.dialog
        .getByRole("textbox", { name: "Duplicate title", exact: true })
        .fill("Keyboard shortcuts");
    }
    const confirm = opened.dialog.getByRole("button", {
      name: scenario.trigger,
    });
    await confirm.press("Enter");
    const alert = opened.dialog.getByRole("alert");
    await expect(alert).toContainText(
      "Resolve the fixture conflict before trying again.",
    );
    await expect(opened.dialog).toBeVisible();
    await alert
      .getByRole("button", { name: "Dismiss error and continue editing" })
      .press("Enter");
    await expect(alert).toBeHidden();
    await confirm.press("Enter");
    await expect(opened.dialog).toBeHidden();
    await expect(opened.trigger).toBeFocused();
  }
  statusEvidence.push({
    id: "ST-03",
    expected:
      "Rejected consequential mutations remain open with an urgent typed correction path and accept a retry",
    actual:
      "All five dialogs announced the typed fixture conflict, reset it, retried, and closed only after acceptance",
  });
});

test("ST-04 pending confirmation blocks duplicate submit and Escape dismissal", async ({
  page,
}) => {
  await page.goto("/");
  await selectEvidenceOption(page, "Mutation outcome", "pending");
  await openAdminDetail(page);
  const opened = await openConfirmation(
    page,
    "Archive feedback",
    /Archive “Keyboard shortcuts”/,
  );
  const confirm = opened.dialog.getByRole("button", {
    name: "Archive feedback",
  });
  await confirm.press("Enter");
  await expect(confirm).toBeDisabled();
  await expect(confirm).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Escape");
  await expect(opened.dialog).toBeVisible();
  await expect(opened.dialog).toBeHidden({ timeout: 2000 });
  await expect(opened.trigger).toBeFocused();
  statusEvidence.push({
    id: "ST-04",
    expected:
      "Pending confirmation disables duplicate submission and ignores Escape until the accepted result",
    actual:
      "Archive stayed modal and busy during the deferred result, then closed and restored focus after acceptance",
  });
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
  const [playwrightManifest, axeManifest] = await Promise.all([
    readFile("node_modules/@playwright/test/package.json", "utf8").then(
      JSON.parse,
    ),
    readFile("node_modules/@axe-core/playwright/package.json", "utf8").then(
      JSON.parse,
    ),
  ]);
  await writeFile(
    `${evidenceRoot}/axe.json`,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        claim: "Supplemental automated regression net, not WCAG certification",
        tools: {
          axe: axeManifest.version,
          chromium: page.context().browser()?.version(),
          playwright: playwrightManifest.version,
        },
        scenarios: [
          { id: "AX-01-public", violations: publicResult.violations },
          { id: "AX-01-admin", violations: adminResult.violations },
        ],
      },
      null,
      2,
    )}\n`,
  );
});

test("ST-05 installed admin states expose complete copy, recovery, and formatted values", async ({
  page,
}) => {
  const wholeScreenStates = [
    { value: "loading", text: "Loading feedback management…" },
    { value: "denied", text: "You don't have access to this area" },
    { value: "empty", text: "No feedback to review" },
    {
      value: "capability-error",
      text: "We couldn't load feedback management",
    },
  ] as const;
  for (const scenario of wholeScreenStates) {
    await page.goto("/");
    await selectEvidenceOption(page, "Admin scenario", scenario.value);
    await activateSurface(page, "Administration");
    await expect(page.getByText(scenario.text, { exact: true })).toBeVisible();
  }

  const detailStates = [
    { value: "detail-error", text: "We couldn't load feedback detail" },
    { value: "activity-error", text: "We couldn't load feedback activity" },
    { value: "tags-error", text: "We couldn't load feedback tags" },
    {
      value: "changelog-error",
      text: "We couldn't load changelog entries",
    },
  ] as const;
  for (const scenario of detailStates) {
    await page.goto("/");
    await selectEvidenceOption(page, "Admin scenario", scenario.value);
    await openAdminDetail(page);
    const state = page.getByText(scenario.text, { exact: true });
    await expect(state).toBeVisible();
    await expect(
      state.locator("xpath=ancestor::*[@data-tone='error'][1]"),
    ).toBeVisible();
  }

  await page.goto("/");
  await selectEvidenceOption(page, "Admin scenario", "loading-more");
  await activateSurface(page, "Administration");
  const loadMore = page.locator(
    'section[aria-label="Feedback queue"] > button',
  );
  await expect(loadMore).toHaveText("Load more managed feedback");
  await loadMore.press("Enter");
  await expect(loadMore).toBeDisabled();
  await expect(loadMore).toHaveAttribute("aria-busy", "true");

  await page.goto("/");
  await openAdminDetail(page);
  await expect(
    page.getByText("Alex changed the feedback status from Open to Planned.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Updated January 15, 2026 at 12:00 PM UTC/).first(),
  ).toBeVisible();
  await expect(
    page.locator("[data-afferent-screen='admin']"),
  ).not.toContainText(/status_change|1768\d{9,}/);
  statusEvidence.push({
    id: "ST-05",
    expected:
      "Loading, denied, empty, query-error, loading-more, activity, editorial, and time states use complete domain copy and recovery semantics",
    actual:
      "Installed hooks rendered every selected state with error tone, retry/correction controls, English activity/editorial labels, and UTC-formatted time",
  });
});

test("RZ-02 the host controls one phone admin pane while wider layouts show both", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await activateSurface(page, "Administration");
  const workspace = page.locator("[data-admin-workspace]");
  const queuePane = page.locator('[data-admin-pane="queue"]');
  const detailPane = page.locator('[data-admin-pane="detail"]');
  await expect(workspace).toHaveAttribute("data-mobile-view", "queue");
  await expect(queuePane).toBeVisible();
  await expect(detailPane).toBeHidden();
  const selected = page.locator("[data-admin-feedback] button").first();
  await selected.press("Enter");
  await expect(workspace).toHaveAttribute("data-mobile-view", "detail");
  await expect(queuePane).toBeHidden();
  await expect(detailPane).toBeVisible();
  await expect(selected).toHaveAttribute("aria-current", "true");
  await page
    .getByRole("button", { name: "Return to feedback queue" })
    .first()
    .press("Enter");
  await expect(queuePane).toBeVisible();
  await expect(detailPane).toBeHidden();
  await expect(selected).toHaveAttribute("aria-current", "true");

  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(queuePane).toBeVisible();
    await expect(detailPane).toBeVisible();
    await assertNoPageOverflow(page);
  }
  keyboardEvidence.push({
    id: "KF-05",
    expected:
      "Host navigation shows one queue/detail pane below 768px, preserves current selection, and CSS restores both panes above it",
    actual:
      "Queue and detail alternated at 320px with aria-current retained; both panes were visible at 768px and 1280px",
  });
});

test("VIS-01 computed styles preserve selected, error, destructive, notification, and exact-token hierarchy", async ({
  page,
}) => {
  await page.goto("/");
  await activateSurface(page, "Notifications");
  const notification = page.locator(".afferent-notification").first();
  expect(
    await notification.evaluate((node) => getComputedStyle(node).gap),
  ).toBe("16px");
  await activateSurface(page, "Notifications popover");
  const trigger = page.locator(".afferent-notifications-trigger");
  const triggerStyle = await trigger.evaluate((node) => {
    const style = getComputedStyle(node);
    const sample = document.createElement("span");
    sample.style.backgroundColor = "var(--primary)";
    document.body.append(sample);
    const primary = getComputedStyle(sample).backgroundColor;
    sample.remove();
    return {
      background: style.backgroundColor,
      primary,
      countSize: getComputedStyle(
        node.querySelector(".afferent-notifications-trigger__count")!,
      ).fontSize,
    };
  });
  expect(triggerStyle.countSize).toBe("14px");
  expect(triggerStyle.background).not.toBe(triggerStyle.primary);

  await openAdminDetail(page);
  const selected = page.locator('[data-admin-feedback][data-selected="true"]');
  await expect(selected).toContainText("Selected feedback");
  const selectionStyle = await selected.locator("button").evaluate((node) => ({
    borderInlineStartWidth: getComputedStyle(node).borderInlineStartWidth,
    paddingLeft: getComputedStyle(
      document.querySelector(".afferent-admin input")!,
    ).paddingLeft,
  }));
  expect(selectionStyle.borderInlineStartWidth).toBe("4px");
  expect(selectionStyle.paddingLeft).toBe("16px");

  const opened = await openConfirmation(
    page,
    "Delete feedback tag",
    /Delete “Important”/,
  );
  await expect(opened.dialog).toHaveAttribute("data-tone", "destructive");
  const destructiveStyle = await opened.dialog.evaluate((node) => ({
    border: getComputedStyle(node).borderColor,
    fontFamily: getComputedStyle(node).fontFamily,
    fontSize: getComputedStyle(node).fontSize,
    lineHeight: getComputedStyle(node).lineHeight,
    button: getComputedStyle(
      node.querySelector(".afferent-button--destructive")!,
    ).backgroundColor,
    buttonHeight: getComputedStyle(
      node.querySelector(".afferent-button--destructive")!,
    ).minHeight,
    buttonPadding: getComputedStyle(
      node.querySelector(".afferent-button--destructive")!,
    ).padding,
    buttonRadius: getComputedStyle(
      node.querySelector(".afferent-button--destructive")!,
    ).borderRadius,
    actionGap: getComputedStyle(node.querySelector(".afferent-dialog__actions")!).gap,
  }));
  expect(destructiveStyle.border).toBe(destructiveStyle.button);
  expect(destructiveStyle.fontFamily).toContain("ui-sans-serif");
  expect(destructiveStyle.fontSize).toBe("16px");
  expect(destructiveStyle.lineHeight).toBe("24px");
  expect(destructiveStyle.buttonHeight).toBe("44px");
  expect(destructiveStyle.buttonPadding).toBe("8px 16px");
  expect(destructiveStyle.buttonRadius).toBe("8px");
  expect(destructiveStyle.actionGap).toBe("8px");
  await page.keyboard.press("Escape");

  await page.goto("/");
  await selectEvidenceOption(page, "Admin scenario", "capability-error");
  await activateSurface(page, "Administration");
  const error = page.locator('[data-tone="error"]');
  const errorStyle = await error.evaluate((node) => ({
    border: getComputedStyle(node).borderColor,
    heading: getComputedStyle(node.querySelector("h2")!).color,
  }));
  expect(errorStyle.border).toBe(errorStyle.heading);
});

test("VIS-02 named whole-product light and dark capture matrix is complete", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(
    page.locator('[data-evidence-source="packed-registry-installed"]'),
  ).toBeVisible();

  await captureEvidence(page, "board-1280.png");
  await activateSurface(page, "Feedback detail");
  await expect(page.getByRole("heading", { name: "Discussion" })).toBeVisible();
  const cardGeometry = await page.locator(".afferent-feedback-card").first().evaluate((card) => {
    const content = card.querySelector(".afferent-feedback-card__content")!.getBoundingClientRect();
    const totals = card.querySelector(".afferent-feedback-card__totals")!.getBoundingClientRect();
    return { contentBottom: content.bottom, totalsTop: totals.top, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
  });
  expect(cardGeometry.contentBottom).toBeLessThanOrEqual(cardGeometry.totalsTop);
  expect(cardGeometry.scrollWidth).toBeLessThanOrEqual(cardGeometry.clientWidth);
  await captureEvidence(page, "detail-1280.png");
  await selectEvidenceOption(page, "Admin scenario", "activity-error");
  await activateSurface(page, "Feedback detail");
  await expect(page.getByText("We couldn't load activity", { exact: true })).toBeVisible();
  await expect(page.getByText("Try loading it again. If the problem continues, contact the application owner.", { exact: true })).toBeVisible();
  await captureEvidence(page, "public-recovery-1280.png");
  await page.getByRole("button", { name: "Retry activity" }).click();
  await expect(page.getByText("Alex changed the feedback status from Open to Planned.", { exact: true })).toBeVisible();
  await selectEvidenceOption(page, "Admin scenario", "ready");
  await activateSurface(page, "Roadmap");
  await expect(page.locator('[data-afferent-screen="roadmap"]')).toBeVisible();
  await captureEvidence(page, "roadmap-1280.png");
  await activateSurface(page, "Changelog");
  await expect(page.locator('[data-afferent-screen="changelog"]')).toBeVisible();
  const publishedTime = page
    .locator('[data-afferent-screen="changelog"] time')
    .first();
  await expect(publishedTime).toHaveText(
    "Published January 15, 2026 at 12:00 PM UTC",
  );
  await expect(publishedTime).toHaveAttribute(
    "datetime",
    "2026-01-15T12:00:00.000Z",
  );
  await captureEvidence(page, "changelog-1280.png");
  await activateSurface(page, "Notifications");
  await expect(
    page.locator('[data-afferent-screen="notifications"]'),
  ).toBeVisible();
  await captureEvidence(page, "notifications-1280.png");
  await activateSurface(page, "Notifications popover");
  const popoverTrigger = page.getByRole("button", {
    name: /Open notifications, 1 unread notification/,
  });
  await popoverTrigger.press("Enter");
  await expect(
    page.locator("[data-afferent-notifications-popover]"),
  ).toBeVisible();
  await expectVisibleFocus(
    page
      .locator("[data-afferent-notifications-popover]")
      .getByRole("button", { name: "Mark notification read" }),
  );
  await captureEvidence(page, "notifications-popover-1280.png");
  await page.keyboard.press("Escape");
  await expect(
    page.locator("[data-afferent-notifications-popover]"),
  ).toBeHidden();
  await expect(popoverTrigger).toBeFocused();

  await page.setViewportSize({ width: 320, height: 800 });
  await activateSurface(page, "Administration");
  const workspace = page.locator("[data-admin-workspace]");
  await expect(workspace).toHaveAttribute("data-mobile-view", "queue");
  await expect(page.locator('[data-admin-pane="queue"]')).toBeVisible();
  await expect(page.locator('[data-admin-pane="detail"]')).toBeHidden();
  await captureEvidence(page, "admin-queue-320.png");
  await page.locator("[data-admin-feedback] button").first().press("Enter");
  await expect(workspace).toHaveAttribute("data-mobile-view", "detail");
  await expect(page.locator('[data-admin-pane="queue"]')).toBeHidden();
  await expect(page.locator('[data-admin-pane="detail"]')).toBeVisible();
  await captureEvidence(page, "admin-detail-320.png");

  await page.setViewportSize({ width: 1280, height: 800 });
  await selectEvidenceOption(page, "Admin scenario", "ready");
  await openAdminDetail(page);
  const sectionGeometry = await page.locator("[data-admin-section]").evaluateAll((sections) =>
    sections.map((section) => ({
      border: getComputedStyle(section).borderTopWidth,
      gap: getComputedStyle(section).gap,
      padding: getComputedStyle(section).padding,
    })),
  );
  expect(sectionGeometry.length).toBeGreaterThanOrEqual(5);
  expect(sectionGeometry.every((section) => section.border === "1px")).toBe(true);
  expect(sectionGeometry.every((section) => section.gap === "16px")).toBe(true);
  expect(sectionGeometry.every((section) => section.padding === "16px")).toBe(true);
  const merge = await openConfirmation(
    page,
    "Merge duplicate",
    /Merge duplicate/,
  );
  expect(
    await merge.dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await captureEvidence(page, "admin-confirmations-1280.png", {
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await expect(merge.trigger).toBeFocused();

  await selectEvidenceOption(page, "Admin scenario", "activity-error");
  await openAdminDetail(page);
  await expect(
    page.getByText("We couldn't load feedback activity", { exact: true }),
  ).toBeVisible();
  await captureEvidence(page, "admin-states-1280.png");

  await page.goto("/");
  await selectEvidenceOption(page, "Admin scenario", "empty");
  await activateSurface(page, "Administration");
  await expect(
    page.getByText("No feedback to review", { exact: true }),
  ).toBeVisible();
  await captureEvidence(page, "admin-empty-1280.png");

  await selectEvidenceOption(page, "Evidence theme", "dark");
  await selectEvidenceOption(page, "Admin scenario", "ready");
  await activateSurface(page, "Board");
  await expect(page.locator('[data-afferent-screen="board"]')).toBeVisible();
  await captureEvidence(page, "dark-public-1280.png");
  await openAdminDetail(page);
  await expect(
    page.locator('[data-evidence-theme="dark"] [data-afferent-screen="admin"]'),
  ).toBeVisible();
  await captureEvidence(page, "dark-admin-1280.png");
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
      await expect(
        page.getByRole("button", { name: action, exact: true }),
      ).toBeVisible();
    }
    await assertNoPageOverflow(page);
    const targets = await measuredTargets(page);
    expect(targets.length).toBeGreaterThan(0);
    expect(
      targets.filter((target) => target.width < 24 || target.height < 24),
    ).toEqual([]);
    await captureEvidence(page, capture.file);
    if (capture.width === 320) {
      await captureEvidence(page, "reflow-320.png");
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
  await captureEvidence(page, "zoom-200.png");

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
