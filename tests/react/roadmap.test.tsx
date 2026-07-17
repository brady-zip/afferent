import { describe, expect, test, vi } from "vitest";

import { mapRoadmapGroupState } from "../../src/react/hooks/roadmap.js";

describe("headless grouped roadmap", () => {
  test("maps each helper state without a second page accumulator", () => {
    const loadMore = vi.fn();
    const results = [{ id: "planned-1" }];
    const state = mapRoadmapGroupState({
      results,
      status: "CanLoadMore",
      loadMore,
    });
    expect(state).toMatchObject({
      status: "ready",
      items: results,
      isLoadingMore: false,
      canLoadMore: true,
    });
    expect(state.items).toBe(results);
    state.loadMore();
    expect(loadMore).toHaveBeenCalledWith(20);

    expect(
      mapRoadmapGroupState({
        results: [],
        status: "Exhausted",
        loadMore: vi.fn(),
      }),
    ).toMatchObject({ status: "empty", items: [] });
  });
});
