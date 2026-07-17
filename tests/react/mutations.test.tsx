import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import {
  isRetryableAfferentError,
  mapAfferentError,
  normalizeAfferentResult,
  retryDelayMs,
} from "../../src/react/hooks/mutations.js";

describe("shared headless mutation contract", () => {
  test("normalizes every expected backend failure without rejecting", () => {
    for (const code of [
      "AUTHENTICATION_REQUIRED",
      "NOT_AUTHORIZED",
      "VALIDATION",
      "NOT_FOUND",
      "CONFLICT",
      "TRANSIENT",
      "UNKNOWN",
    ] as const) {
      expect(
        mapAfferentError({ data: { contractVersion: 1, code, message: code } }),
      ).toMatchObject({ contractVersion: 1, code });
    }
    expect(
      mapAfferentError({
        data: {
          contractVersion: 1,
          code: "RATE_LIMITED",
          operation: "comment",
          retryAfterMs: 1500,
        },
      }),
    ).toMatchObject({ code: "RATE_LIMITED", retryAfterMs: 1500 });
    expect(mapAfferentError(new TypeError("fetch failed"))).toMatchObject({
      code: "TRANSIENT",
    });
  });

  test("wraps raw success DTOs and preserves typed failure results", () => {
    const value = { contractVersion: 1, id: "post:1" };
    expect(normalizeAfferentResult(value)).toEqual({ ok: true, data: value });
    const failure = {
      ok: false as const,
      error: {
        contractVersion: 1 as const,
        code: "VALIDATION" as const,
        message: "invalid",
      },
    };
    expect(normalizeAfferentResult(failure)).toBe(failure);
  });

  test("retries only transient and rate-limited failures", () => {
    const transient = mapAfferentError(new TypeError("network"));
    expect(isRetryableAfferentError(transient)).toBe(true);
    expect(retryDelayMs(transient)).toBe(0);
    const limited = mapAfferentError({
      code: "RATE_LIMITED",
      operation: "vote",
      retryAfterMs: 2000,
    });
    expect(isRetryableAfferentError(limited)).toBe(true);
    expect(retryDelayMs(limited)).toBe(2000);
    expect(
      isRetryableAfferentError(
        mapAfferentError({ code: "VALIDATION", message: "invalid" }),
      ),
    ).toBe(false);
  });

  test("limits native optimism to vote subscription and mark-read", () => {
    const feedback = readFileSync("src/react/hooks/feedback.ts", "utf8");
    const notifications = readFileSync(
      "src/react/hooks/notifications.ts",
      "utf8",
    );
    const authorityHooks = [
      "src/react/hooks/admin.ts",
      "src/react/hooks/changelog.ts",
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(feedback).toContain("withOptimisticUpdate");
    expect(notifications.match(/function apply\w+Optimism/g)).toHaveLength(2);
    expect(authorityHooks).not.toContain("withOptimisticUpdate");
  });
});
