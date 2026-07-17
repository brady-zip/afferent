import { describe, expect, test, vi } from "vitest";

import {
  mapChangelogEntryState,
  mapChangelogFeedState,
} from "../../src/react/index.js";

describe("headless changelog hooks", () => {
  test("maps ordered pagination and public slug lookup states", () => {
    const results = [{ id: "entry-1" }];
    const loadMore = vi.fn();
    const feed = mapChangelogFeedState({
      results,
      status: "CanLoadMore",
      loadMore,
    });
    expect(feed).toMatchObject({
      status: "ready",
      items: results,
      canLoadMore: true,
    });
    expect(feed.items).toBe(results);
    feed.loadMore();
    expect(loadMore).toHaveBeenCalledWith(20);
    expect(mapChangelogEntryState(undefined, true)).toMatchObject({
      status: "loading",
    });
    expect(
      mapChangelogEntryState({ contractVersion: 1, status: "notFound" }, true),
    ).toMatchObject({ status: "notFound" });
  });

  test("preserves unsupported states without configured bindings", () => {
    expect(
      mapChangelogFeedState(
        { results: [], status: "LoadingFirstPage", loadMore: vi.fn() },
        true,
      ),
    ).toMatchObject({ status: "unsupported", items: [] });
    expect(mapChangelogEntryState(undefined, false)).toEqual({
      status: "unsupported",
    });
  });
});
