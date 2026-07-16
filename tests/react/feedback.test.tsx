import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { usePaginatedQuery } = vi.hoisted(() => ({
  usePaginatedQuery: vi.fn(),
}));

vi.mock("convex-helpers/react", () => ({ usePaginatedQuery }));

import {
  AfferentProvider,
  type AfferentBindings,
} from "../../src/react/index.js";
import {
  mapFeedbackFeedState,
  useFeedbackFeed,
} from "../../src/react/hooks/feedback.js";

const bindings = {
  public: { listFeedback: { _type: "query" } },
} as unknown as AfferentBindings;

function Probe() {
  const feed = useFeedbackFeed({ order: "top", boardId: "board-1" });
  return (
    <output>
      {JSON.stringify({
        status: feed.status,
        items: feed.items,
        isLoadingMore: feed.isLoadingMore,
        canLoadMore: feed.canLoadMore,
      })}
    </output>
  );
}

describe("headless feedback feed", () => {
  beforeEach(() => usePaginatedQuery.mockReset());

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

  test("maps an observed failure without requiring an error boundary", () => {
    const error = new Error("network unavailable");
    expect(
      mapFeedbackFeedState({
        results: [],
        status: "Error",
        error,
        loadMore: vi.fn(),
      }),
    ).toMatchObject({ status: "error", error, items: [] });
  });

  test("renders through injected public refs and exposes helper results directly", () => {
    const results = [{ id: "post-1", title: "Canonical helper result" }];
    usePaginatedQuery.mockReturnValue({
      results,
      status: "CanLoadMore",
      loadMore: vi.fn(),
    });

    const markup = renderToStaticMarkup(
      <AfferentProvider
        bindings={bindings}
        auth={{ status: "authenticated", sessionGeneration: "actor-a" }}
      >
        <Probe />
      </AfferentProvider>,
    );
    expect(markup).toContain("Canonical helper result");
    expect(markup).toContain("&quot;status&quot;:&quot;ready&quot;");
    expect(usePaginatedQuery).toHaveBeenCalledWith(
      bindings.public.listFeedback,
      { order: "top", boardId: "board-1" },
      { initialNumItems: 20 },
    );
  });

  test("uses serialized filters so a filter change resets helper pagination", () => {
    const first = { order: "newest" as const, status: "open" as const };
    const second = { order: "newest" as const, status: "planned" as const };
    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));
  });
});
