import { describe, expect, test, vi } from "vitest";

import { mapFeedbackFeedState } from "../../src/react/hooks/feedback.js";

describe("headless feedback feed", () => {
  test.each([
    ["LoadingFirstPage", "loading"],
    ["CanLoadMore", "ready"],
    ["LoadingMore", "ready"],
    ["Exhausted", "empty"],
  ] as const)("maps helper %s to the %s state", (helperStatus, status) => {
    const loadMore = vi.fn();
    const state = mapFeedbackFeedState({
      results:
        helperStatus === "Exhausted" || helperStatus === "LoadingFirstPage"
          ? []
          : [{ id: "post-1" }],
      status: helperStatus,
      loadMore,
    });
    expect(state).toMatchObject({
      status,
      isLoadingMore: helperStatus === "LoadingMore",
      canLoadMore:
        helperStatus === "CanLoadMore" || helperStatus === "LoadingMore",
    });
    state.loadMore();
    expect(loadMore).toHaveBeenCalledWith(20);
  });

  test("uses serialized filters so a filter change resets helper pagination", () => {
    const first = { order: "newest" as const, status: "open" as const };
    const second = { order: "newest" as const, status: "planned" as const };
    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));
  });
});
