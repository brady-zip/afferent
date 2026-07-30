import { createHash } from "node:crypto";

import { expect, type Page, type TestInfo } from "@playwright/test";

export const PHASE4_TIMEOUT = 90_000;
export const PHASE4_PASSWORD = "Phase4-password-2026!";

export function phase4AccountEmail(label: string, testInfo: TestInfo) {
  const runIdentity = [
    process.env.PHASE4_TARGET_ID,
    testInfo.project.name,
    testInfo.repeatEachIndex,
    testInfo.retry,
    label,
  ].join(":");
  const suffix = createHash("sha256")
    .update(runIdentity)
    .digest("hex")
    .slice(0, 12);
  return `phase4-${label}-${suffix}@example.test`;
}

export async function createPasswordAccount(page: Page, email: string) {
  await page.goto("/sandbox");
  await expect(
    page.getByRole("heading", {
      name: "Sign in to open your private sandbox",
    }),
  ).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PHASE4_PASSWORD);
  await page.getByRole("button", { name: "Create a demo account" }).click();
  await expect(page.locator('[aria-label="Sandbox status"] strong')).toHaveText(
    "Private sandbox",
    { timeout: PHASE4_TIMEOUT },
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Sandbox feedback" }),
  ).toBeVisible({ timeout: PHASE4_TIMEOUT });
}

export async function createFeedback(page: Page, title: string, body: string) {
  await page.goto("/sandbox");
  await page.getByLabel("Board").selectOption({ label: "Product feedback" });
  await page.getByRole("button", { name: "Create feedback" }).click();
  await page.getByLabel("Feedback title").fill(title);
  await page.getByLabel("Feedback details").fill(body);
  await page.getByRole("button", { name: "Post feedback" }).click();
  const link = page
    .getByRole("region", { name: "Feedback results" })
    .getByRole("list", { name: "Feedback" })
    .getByRole("link", { name: title, exact: true });
  await expect(link).toBeVisible({ timeout: PHASE4_TIMEOUT });
  return await link.getAttribute("href");
}

export async function openFeedback(page: Page, title: string) {
  const link = page
    .getByRole("region", { name: "Feedback results" })
    .getByRole("list", { name: "Feedback" })
    .getByRole("link", { name: title, exact: true });
  await expect(link).toBeVisible({ timeout: PHASE4_TIMEOUT });
  await link.click();
  const article = page.locator("article[data-post-id]");
  await expect(
    article.getByRole("heading", { level: 2, name: title, exact: true }),
  ).toBeVisible();
  return article;
}

export async function participateInFeedback(
  page: Page,
  title: string,
  comment: string,
) {
  const article = await openFeedback(page, title);
  await article.getByRole("button", { name: "Vote for feedback" }).click();
  await expect(
    article.getByRole("button", { name: "Remove feedback vote" }),
  ).toBeVisible();
  const subscribe = article.getByRole("button", {
    name: "Subscribe to updates",
  });
  if (await subscribe.isVisible()) await subscribe.click();
  await expect(
    article.getByRole("button", { name: "Unsubscribe from updates" }),
  ).toBeVisible();
  await article.getByLabel("Add a comment").fill(comment);
  await article.getByRole("button", { name: "Post comment" }).click();
  await expect(article.getByText(comment, { exact: true })).toBeVisible({
    timeout: PHASE4_TIMEOUT,
  });
  await expect(
    article
      .locator(".afferent-post-detail__metadata div")
      .filter({ hasText: "Votes" })
      .locator("dd"),
  ).toHaveText("1");
  await expect(
    article
      .locator(".afferent-post-detail__metadata div")
      .filter({ hasText: "Comments" })
      .locator("dd"),
  ).toHaveText("1");
  return article;
}

export async function searchForFeedback(page: Page, title: string) {
  await page.goto("/sandbox");
  await page.getByLabel("Search feedback").fill(title);
  const results = page.getByRole("list", { name: "Feedback search results" });
  await expect(results).toBeVisible({ timeout: PHASE4_TIMEOUT });
  return results;
}

export async function administerFeedback(
  page: Page,
  title: string,
  options: Readonly<{
    body: string;
    changelogTitle: string;
    changelogBody: string;
    tag: string;
  }>,
) {
  await page.goto("/sandbox/admin");
  await expect(
    page.getByRole("heading", { level: 1, name: "Feedback management" }),
  ).toBeVisible({ timeout: PHASE4_TIMEOUT });
  const queue = page.getByRole("region", { name: "Feedback queue" });
  await expect(queue).toBeVisible();
  await queue.getByRole("button").filter({ hasText: title }).click();

  const moderation = page.getByRole("form", { name: "Moderation" });
  await expect(moderation).toBeVisible({ timeout: PHASE4_TIMEOUT });
  await moderation.getByLabel("Feedback details").fill(options.body);
  await moderation
    .getByRole("button", { name: "Save moderation changes" })
    .click();
  await moderation.getByLabel("Board").selectOption({ label: "Integrations" });
  await moderation
    .getByLabel("Update feedback status")
    .selectOption("in_progress");
  await moderation.getByRole("button", { name: "Lock discussion" }).click();
  await expect(
    moderation.getByRole("button", { name: "Unlock discussion" }),
  ).toBeVisible();

  const tags = page.locator(".afferent-tag-manager");
  await tags.getByLabel("New feedback tag").fill(options.tag);
  await tags.getByRole("button", { name: "Create feedback tag" }).click();
  const tagRow = tags.getByRole("listitem").filter({ hasText: options.tag });
  await expect(tagRow).toBeVisible();
  await tagRow.getByRole("button", { name: "Assign feedback tag" }).click();
  await expect(
    tagRow.getByRole("button", { name: "Remove feedback tag" }),
  ).toBeVisible();

  const changelog = page.locator(".afferent-changelog-editor");
  await changelog.getByLabel("Changelog title").fill(options.changelogTitle);
  await changelog.getByLabel("Changelog body").fill(options.changelogBody);
  await changelog.getByRole("button", { name: "Save changelog draft" }).click();
  const entry = changelog
    .getByRole("article")
    .filter({ hasText: options.changelogTitle });
  await expect(entry).toBeVisible({ timeout: PHASE4_TIMEOUT });
  const linked = entry.getByRole("checkbox", { name: title });
  await linked.check();
  await entry.getByRole("button", { name: "Publish changelog entry" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Publish changelog entry" }).click();
  await expect(dialog).toBeHidden({ timeout: PHASE4_TIMEOUT });

  return { moderation, entry };
}

export async function confirmSandboxReset(page: Page) {
  await page
    .locator('[aria-label="Sandbox status"]')
    .getByRole("button", { name: "Reset my sandbox" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Reset your private sandbox?",
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Reset my sandbox" }).click();
  await expect(page.locator('[aria-label="Sandbox status"] strong')).toHaveText(
    "Private sandbox",
    { timeout: PHASE4_TIMEOUT },
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Sandbox feedback" }),
  ).toBeVisible({ timeout: PHASE4_TIMEOUT });
}
