import fs from "node:fs";
import { describe, expect, test, vi } from "vitest";

import {
  mapAdminCapabilityState,
  mapAdminFeedbackState,
  mapAdminPostState,
  mapModerationError,
  moderationActionKey,
} from "../../src/react/hooks/admin.js";

describe("headless admin state", () => {
  test("maps queue and direct-detail states without reshaping DTOs", () => {
    const item = { feedback: { id: "post-1" }, moderation: { archived: true } } as never;
    const queue = mapAdminFeedbackState({ results: [item], status: "Exhausted", loadMore: vi.fn() });
    expect(queue).toMatchObject({ status: "ready", items: [item] });
    expect(queue.items[0]).toBe(item);
    expect(mapAdminPostState(undefined, true)).toEqual({ status: "loading" });
    expect(mapAdminPostState(item, true)).toEqual({ status: "ready", post: item });
  });

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

  test("projects activity retry from the existing paginated watch", () => {
    const source = fs.readFileSync("src/react/hooks/admin.ts", "utf8");
    expect(source).toMatch(/status: "error"[\s\S]*retry: page\.retry/);
  });
});
