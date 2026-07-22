import { describe, expect, test, vi } from "vitest";

import {
  mapAdminChangelogState,
  mapChangelogEntryState,
  mapChangelogFeedState,
} from "../../src/react/index.js";

describe("headless changelog hooks", () => {
  test("maps the authorized all-state editorial feed verbatim", () => {
    const entry = { contractVersion: 2, id: "entry-1", links: [] } as never;
    const state = mapAdminChangelogState({ results: [entry], status: "Exhausted", loadMore: vi.fn() });
    expect(state).toMatchObject({ status: "ready", items: [entry] });
    expect(state.items[0]).toBe(entry);
  });

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

  test("preserves the matching watch retry on public feed errors", () => {
    const retry = vi.fn();
    const state = mapChangelogFeedState({
      results: [],
      status: "Error",
      error: { contractVersion: 1, code: "TRANSIENT", message: "offline" },
      loadMore: vi.fn(),
      retry,
    } as never);
    expect(state.status).toBe("error");
    if (state.status !== "error") throw new Error("expected error state");
    state.retry();
    expect(retry).toHaveBeenCalledOnce();
  });
});
