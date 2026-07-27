import { expect, test } from "@playwright/test";

import {
  recordPhase4Completion,
  runPhase4Internal,
} from "../../scripts/test-hosted-demo.mjs";
import {
  confirmSandboxReset,
  createFeedback,
  createPasswordAccount,
  searchForFeedback,
} from "./phase4-helpers";

test("keeps reset, expiry, quota, cleanup, and stale work isolated", async ({
  browser,
}, testInfo) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const emailA = "phase4-lifecycle-a@example.test";
  const emailB = "phase4-lifecycle-b@example.test";
  const titleA = "Lifecycle private alpha";
  const titleB = "Lifecycle private beta";

  try {
    await Promise.all([
      createPasswordAccount(pageA, emailA),
      createPasswordAccount(pageB, emailB),
    ]);
    await Promise.all([
      createFeedback(pageA, titleA, "Alpha survives only until reset."),
      createFeedback(pageB, titleB, "Beta must survive every alpha event."),
    ]);

    const liveB = await searchForFeedback(pageB, titleB);
    await expect(
      liveB.getByRole("link", { name: titleB, exact: true }),
    ).toHaveCount(1);
    await confirmSandboxReset(pageA);
    await pageA.getByLabel("Search feedback").fill(titleA);
    await expect(
      pageA.getByRole("heading", { name: "No matching feedback" }),
    ).toBeVisible({ timeout: 90_000 });
    await expect(
      pageA.getByRole("link", {
        name: "Make invoice history easier to export",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      liveB.getByRole("link", { name: titleB, exact: true }),
    ).toHaveCount(1);

    const resetState = await runPhase4Internal("inspect", { email: emailA });
    expect(resetState.retired).toBeGreaterThanOrEqual(1);
    const cleanup = await runPhase4Internal("exerciseCleanupRecovery", {
      email: emailA,
    });
    expect(cleanup.retryState).toBe("pending");
    expect(cleanup.staleState).toBe("stale");
    await expect
      .poll(
        async () =>
          (
            await runPhase4Internal("inspect", {
              email: emailA,
            })
          ).retiredCleanupComplete,
        { timeout: 90_000 },
      )
      .toBe(true);

    await runPhase4Internal("saturateWrites", { email: emailA });
    await pageA.goto("/sandbox");
    await pageA.getByRole("button", { name: "Create feedback" }).click();
    await pageA.getByLabel("Feedback title").fill("Rate limited alpha");
    await pageA
      .getByLabel("Feedback details")
      .fill("This write must be rejected only for Account A.");
    await pageA.getByRole("button", { name: "Post feedback" }).click();
    await expect(pageA.getByRole("alert")).toContainText(/rate|limit|wait/i, {
      timeout: 90_000,
    });
    await createFeedback(
      pageB,
      "Beta remains writable",
      "Account B is not charged against Account A quota.",
    );
    await runPhase4Internal("clearWriteWindow", { email: emailA });
    await createFeedback(
      pageA,
      "Alpha recovers after window",
      "Account A recovers after its isolated quota window.",
    );

    await runPhase4Internal("expire", { email: emailA });
    await pageA.reload();
    await expect(
      pageA.getByRole("heading", {
        name: "Preparing a fresh private sandbox…",
      }),
    ).toBeVisible({ timeout: 90_000 });
    await pageA
      .getByRole("button", { name: "Prepare a fresh private sandbox" })
      .click();
    await expect(
      pageA.getByRole("heading", { level: 1, name: "Sandbox feedback" }),
    ).toBeVisible({ timeout: 90_000 });
    await expect(
      pageA.getByRole("link", {
        name: "Make invoice history easier to export",
        exact: true,
      }),
    ).toBeVisible();

    await pageB.goto("/sandbox");
    await expect(
      pageB.getByRole("link", { name: titleB, exact: true }),
    ).toBeVisible();
    await expect(
      pageB.getByRole("link", { name: "Beta remains writable", exact: true }),
    ).toBeVisible();
    const finalB = await runPhase4Internal("inspect", { email: emailB });
    expect(finalB.activeGeneration).toBe(1);

    await recordPhase4Completion(testInfo);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
