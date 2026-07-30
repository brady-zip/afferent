import { expect, test } from "@playwright/test";

import { recordPhase4Completion } from "../../scripts/test-demo.mjs";
import {
  administerFeedback,
  createFeedback,
  createPasswordAccount,
  participateInFeedback,
  phase4AccountEmail,
  searchForFeedback,
} from "./phase4-helpers";

test("completes the immutable showcase and private admin evaluator journey", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator('[aria-label="Showcase mode"] strong')).toHaveText(
    "Immutable showcase",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Representative feedback" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Make invoice history easier to export",
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Create feedback" }).click();
  await expect(
    page.getByRole("heading", { name: "This feature isn't configured" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Post feedback" })).toHaveCount(
    0,
  );

  await page.goto("/");
  await page
    .getByRole("link", {
      name: "Make invoice history easier to export",
      exact: true,
    })
    .click();
  await expect(
    page.locator("article[data-post-id]").getByRole("heading", {
      level: 2,
      name: "Make invoice history easier to export",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Vote for feedback" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "This feature isn't configured" }),
  ).toBeVisible();

  await page.goto("/roadmap");
  await expect(
    page.getByRole("heading", { level: 1, name: "Roadmap" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Planned", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "In Progress", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Complete", exact: true }),
  ).toBeVisible();

  await page.goto("/changelog");
  await expect(
    page.getByRole("heading", { level: 1, name: "Changelog" }),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: "Invoice export is now available",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Changelog entry detail" })
      .getByRole("region", { name: "Linked feedback" })
      .getByRole("link", {
        name: "Make invoice history easier to export",
      }),
  ).toBeVisible();

  const title = "Evaluator-controlled release notes";
  const body = "Evaluator body proves the installed artifact can accept data.";
  const moderatedBody =
    "Moderated evaluator body proves trusted host administration.";
  const changelogTitle = "Evaluator journey shipped";
  await createPasswordAccount(page, phase4AccountEmail("evaluator", testInfo));
  await createFeedback(page, title, body);
  await participateInFeedback(page, title, "Evaluator journey comment");

  const results = await searchForFeedback(page, title);
  await expect(
    results.getByRole("link", { name: title, exact: true }),
  ).toHaveCount(1);

  await administerFeedback(page, title, {
    body: moderatedBody,
    changelogTitle,
    changelogBody: "The evaluator journey now exercises publication.",
    tag: "Evaluator",
  });

  await page.goto("/sandbox/roadmap");
  const inProgress = page
    .locator('[data-roadmap-group="in_progress"]')
    .getByRole("link", { name: title, exact: true });
  await expect(inProgress).toBeVisible({ timeout: 90_000 });
  await page.goto("/sandbox/changelog");
  await page.getByRole("link", { name: changelogTitle, exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Changelog entry detail" })
      .getByRole("region", { name: "Linked feedback" })
      .getByRole("link", {
        name: title,
        exact: true,
      }),
  ).toBeVisible();
  await expect(page.getByText(moderatedBody, { exact: true })).toHaveCount(0);

  await recordPhase4Completion(testInfo);
});
