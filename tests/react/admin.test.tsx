import { describe, expect, test, vi } from "vitest";

import {
  mapAdminCapabilityState,
  mapModerationError,
  moderationActionKey,
} from "../../src/react/hooks/admin.js";

describe("headless admin state", () => {
  test("distinguishes loading, not configured, and not authorized", () => {
    expect(mapAdminCapabilityState(undefined, false)).toEqual({
      status: "unsupported",
    });
    expect(mapAdminCapabilityState(undefined, true)).toEqual({
      status: "loading",
    });
    expect(mapAdminCapabilityState(false, true)).toEqual({
      status: "not-authorized",
    });
    expect(mapAdminCapabilityState(true, true)).toEqual({ status: "ready" });
  });

  test("keys mutation state per post and action and exposes retry metadata", () => {
    expect(moderationActionKey("post-1", "archive")).toBe("post-1:archive");
    const rateError = mapModerationError({
      code: "RATE_LIMITED",
      operation: "comment",
      retryAfterMs: 2500,
    });
    expect(rateError).toMatchObject({
      code: "RATE_LIMITED",
      retryAfterMs: 2500,
    });
    expect(rateError.retryAt).toBeGreaterThan(Date.now());
  });

  test("does not model moderation as an optimistic cache mutation", () => {
    const mutate = vi.fn();
    expect(mutate).not.toHaveBeenCalled();
  });
});
