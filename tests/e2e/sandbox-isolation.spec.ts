import { expect, test } from "@playwright/test";

import { recordPhase4Completion } from "../../scripts/test-hosted-demo.mjs";
import {
  administerFeedback,
  createFeedback,
  createPasswordAccount,
  openFeedback,
  participateInFeedback,
  searchForFeedback,
} from "./phase4-helpers";

test("keeps colliding two-user reads, writes, search, counts, and reactivity isolated", async ({
  browser,
}, testInfo) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const title = "Colliding cross-scope release proof";
  const bodyA = "Account A private sentinel alpha.";
  const bodyB = "Account B private sentinel beta.";
  const commentA = "Account A private comment alpha.";
  const commentB = "Account B private comment beta.";

  try {
    await Promise.all([
      createPasswordAccount(pageA, "phase4-isolation-a@example.test"),
      createPasswordAccount(pageB, "phase4-isolation-b@example.test"),
    ]);
    const [hrefA, hrefB] = await Promise.all([
      createFeedback(pageA, title, bodyA),
      createFeedback(pageB, title, bodyB),
    ]);
    expect(hrefA).toBeTruthy();
    expect(hrefB).toBeTruthy();
    expect(hrefA).not.toBe(hrefB);

    const [resultsA, resultsB] = await Promise.all([
      searchForFeedback(pageA, title),
      searchForFeedback(pageB, title),
    ]);
    const linkA = resultsA.getByRole("link", { name: title, exact: true });
    const linkB = resultsB.getByRole("link", { name: title, exact: true });
    await expect(linkA).toHaveCount(1);
    await expect(linkB).toHaveCount(1);
    await expect(linkA).toHaveAttribute("href", hrefA!);
    await expect(linkB).toHaveAttribute("href", hrefB!);

    await pageB.goto(hrefA!);
    await expect(
      pageB.getByRole("heading", { name: "Feedback not found" }),
    ).toBeVisible();
    await pageA.goto(hrefB!);
    await expect(
      pageA.getByRole("heading", { name: "Feedback not found" }),
    ).toBeVisible();

    await Promise.all([pageA.goto(hrefA!), pageB.goto(hrefB!)]);
    const articleA = await openFeedback(pageA, title);
    const articleB = await openFeedback(pageB, title);
    await expect(articleA.getByText(bodyA, { exact: true })).toBeVisible();
    await expect(articleA.getByText(bodyB, { exact: true })).toHaveCount(0);
    await expect(articleB.getByText(bodyB, { exact: true })).toBeVisible();
    await expect(articleB.getByText(bodyA, { exact: true })).toHaveCount(0);

    await participateInFeedback(pageA, title, commentA);
    await expect(articleB.getByText(commentA, { exact: true })).toHaveCount(0);
    await expect(
      articleB
        .locator(".afferent-post-detail__metadata div")
        .filter({ hasText: "Votes" })
        .locator("dd"),
    ).toHaveText("0");
    await participateInFeedback(pageB, title, commentB);
    await expect(articleA.getByText(commentB, { exact: true })).toHaveCount(0);

    await Promise.all([
      administerFeedback(pageA, title, {
        body: bodyA,
        changelogTitle: "Colliding release publication",
        changelogBody: "Only Account A may read this alpha publication.",
        tag: "Collision",
      }),
      administerFeedback(pageB, title, {
        body: bodyB,
        changelogTitle: "Colliding release publication",
        changelogBody: "Only Account B may read this beta publication.",
        tag: "Collision",
      }),
    ]);

    await Promise.all([
      pageA.goto("/sandbox/changelog"),
      pageB.goto("/sandbox/changelog"),
    ]);
    await expect(
      pageA.getByRole("link", {
        name: "Colliding release publication",
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      pageB.getByRole("link", {
        name: "Colliding release publication",
        exact: true,
      }),
    ).toHaveCount(1);

    await recordPhase4Completion(testInfo);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
