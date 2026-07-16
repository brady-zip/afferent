import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock("convex/react", () => ({ useQuery }));

import {
  AfferentProvider,
  type AfferentBindings,
} from "../../src/react/index.js";
import {
  DEFAULT_SEARCH_DEBOUNCE_MS,
  mapBoundedDiscoveryState,
  useFeedbackSearch,
  useSimilarPosts,
} from "../../src/react/hooks/feedback.js";

const bindings = {
  public: {
    listFeedback: { _type: "query" },
    searchFeedback: { _type: "query" },
    suggestSimilarPosts: { _type: "query" },
  },
} as unknown as AfferentBindings;

function Probe() {
  const search = useFeedbackSearch({ query: "export feedback" });
  const similar = useSimilarPosts({ title: "Export feedback" });
  return <output>{`${search.status}:${similar.status}`}</output>;
}

describe("bounded discovery hooks", () => {
  beforeEach(() => useQuery.mockReset());

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
    expect(
      mapBoundedDiscoveryState(new Error("network unavailable")),
    ).toMatchObject({
      status: "error",
      error: new Error("network unavailable"),
    });
  });

  test("uses injected bounded refs without fabricating pagination controls", () => {
    useQuery
      .mockReturnValueOnce({
        contractVersion: 1,
        items: [{ id: "search-1", title: "Search" }],
        hasMore: false,
      })
      .mockReturnValueOnce({
        contractVersion: 1,
        items: [{ id: "similar-1", title: "Similar" }],
        hasMore: false,
      });

    const markup = renderToStaticMarkup(
      <AfferentProvider bindings={bindings} auth={{ status: "loading" }}>
        <Probe />
      </AfferentProvider>,
    );
    expect(markup).toContain("ready:ready");
    expect(useQuery).toHaveBeenNthCalledWith(
      1,
      bindings.public.searchFeedback,
      expect.objectContaining({ query: "export feedback" }),
    );
    expect(useQuery).toHaveBeenNthCalledWith(
      2,
      bindings.public.suggestSimilarPosts,
      expect.objectContaining({ title: "Export feedback" }),
    );
    const state = mapBoundedDiscoveryState({
      contractVersion: 1,
      items: [],
      hasMore: false,
    });
    expect(state).not.toHaveProperty("loadMore");
    expect(state).not.toHaveProperty("continueCursor");
  });

  test("returns unsupported when an optional binding is absent", () => {
    const incomplete = {
      public: { listFeedback: bindings.public.listFeedback },
    } as unknown as AfferentBindings;
    const markup = renderToStaticMarkup(
      <AfferentProvider
        bindings={incomplete}
        auth={{ status: "unauthenticated" }}
      >
        <Probe />
      </AfferentProvider>,
    );
    expect(markup).toContain("unsupported:unsupported");
    expect(useQuery).toHaveBeenNthCalledWith(1, expect.anything(), "skip");
    expect(useQuery).toHaveBeenNthCalledWith(2, expect.anything(), "skip");
  });
});
