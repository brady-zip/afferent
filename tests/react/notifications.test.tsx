import { describe, expect, test, vi } from "vitest";

import { mapNotificationFeedState } from "../../src/react/index.js";

describe("headless notification hooks", () => {
  test("maps ordered watch results without a parallel inbox cache", () => {
    const target = {
      contractVersion: 1 as const,
      kind: "post" as const,
      postId: "post:1",
      commentId: "comment:1",
      label: "View comment on feedback: Keyboard navigation",
    };
    const results = [{ id: "notification:1", read: false, target }];
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
    expect(mapped.items[0].target).toBe(target);
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
