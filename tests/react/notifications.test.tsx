import { describe, expect, test, vi } from "vitest";

import { mapNotificationFeedState } from "../../src/react/index.js";

describe("headless notification hooks", () => {
  test("maps ordered watch results without a parallel inbox cache", () => {
    const results = [{ id: "notification:1", read: false }];
    const loadMore = vi.fn();
    const mapped = mapNotificationFeedState({
      results,
      status: "CanLoadMore",
      loadMore,
    });
    expect(mapped).toMatchObject({
      status: "ready",
      items: results,
      canLoadMore: true,
    });
    expect(mapped.items).toBe(results);
    mapped.loadMore();
    expect(loadMore).toHaveBeenCalledWith(20);
  });

  test("preserves unsupported state without notification bindings", () => {
    expect(
      mapNotificationFeedState(
        { results: [], status: "LoadingFirstPage", loadMore: vi.fn() },
        "unsupported",
      ),
    ).toMatchObject({ status: "unsupported", items: [] });
  });
});
