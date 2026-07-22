import { describe, expect, test, vi } from "vitest";

import {
  DEFAULT_SEARCH_DEBOUNCE_MS,
  mapBoundedDiscoveryState,
} from "../../src/react/hooks/feedback.js";

describe("bounded discovery hooks", () => {
  test("freezes a safe default debounce and explicit bounded states", () => {
    expect(DEFAULT_SEARCH_DEBOUNCE_MS).toBe(250);
    expect(mapBoundedDiscoveryState(undefined)).toMatchObject({
      status: "loading",
      items: [],
      hasMore: false,
    });
    expect(
      mapBoundedDiscoveryState({
        contractVersion: 1,
        items: [],
        hasMore: false,
      }),
    ).toMatchObject({ status: "empty", items: [], hasMore: false });
    expect(
      mapBoundedDiscoveryState({
        contractVersion: 1,
        items: [{ id: "post-1" }],
        hasMore: true,
      }),
    ).toMatchObject({ status: "ready", hasMore: true });
  });

  test("keeps bounded results free of pagination controls", () => {
    const state = mapBoundedDiscoveryState({
      contractVersion: 1,
      items: [],
      hasMore: false,
    });
    expect(state).not.toHaveProperty("loadMore");
    expect(state).not.toHaveProperty("continueCursor");
  });

  test("returns unsupported when an optional binding is absent", () => {
    expect(mapBoundedDiscoveryState(undefined, true)).toEqual({
      status: "unsupported",
      items: [],
      hasMore: false,
    });
  });

  test("preserves direct-watch retry only on reloadable discovery errors", () => {
    const retry = vi.fn();
    const state = mapBoundedDiscoveryState(new Error("offline"), false, retry);
    expect(state.status).toBe("error");
    if (state.status !== "error") throw new Error("expected error state");
    state.retry();
    expect(retry).toHaveBeenCalledOnce();
    expect(mapBoundedDiscoveryState(undefined, true)).not.toHaveProperty("retry");
  });
});
