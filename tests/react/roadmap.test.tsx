import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { usePaginatedQuery } = vi.hoisted(() => ({
  usePaginatedQuery: vi.fn(),
}));

vi.mock("convex-helpers/react", () => ({ usePaginatedQuery }));

import {
  AfferentProvider,
  type AfferentBindings,
  useRoadmap,
} from "../../src/react/index.js";
import { mapRoadmapGroupState } from "../../src/react/hooks/roadmap.js";

const listRoadmapGroup = { _type: "query" };
const bindings = {
  public: { listFeedback: { _type: "query" } },
  roadmap: { listRoadmapGroup },
} as unknown as AfferentBindings;

function Probe({ boardId }: { boardId?: string }) {
  const roadmap = useRoadmap(boardId === undefined ? {} : { boardId });
  return (
    <output>
      {JSON.stringify({
        boardId: roadmap.boardId,
        authStatus: roadmap.authStatus,
        planned: roadmap.groups.planned.status,
        inProgress: roadmap.groups.inProgress.status,
        complete: roadmap.groups.complete.status,
      })}
    </output>
  );
}

describe("headless grouped roadmap", () => {
  beforeEach(() => usePaginatedQuery.mockReset());

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
    const error = new Error("roadmap unavailable");
    expect(
      mapRoadmapGroupState({
        results: [],
        status: "Error",
        error,
        loadMore: vi.fn(),
      }),
    ).toMatchObject({ status: "error", error });
  });

  test("runs and pages Planned, In Progress, and Complete independently", () => {
    usePaginatedQuery.mockImplementation(
      (_reference: unknown, args?: { status: string }) => {
        const loadMore = vi.fn();
        if (args === undefined) {
          return { results: [], status: "LoadingFirstPage", loadMore };
        }
        let status = "Exhausted";
        if (args.status === "planned") status = "CanLoadMore";
        if (args.status === "in_progress") status = "LoadingFirstPage";
        return {
          results: args.status === "planned" ? [{ id: "planned-1" }] : [],
          status,
          loadMore,
        };
      },
    );

    const markup = renderToStaticMarkup(
      <AfferentProvider
        bindings={bindings}
        auth={{ status: "authenticated", sessionGeneration: "actor-a" }}
      >
        <Probe boardId="board-1" />
      </AfferentProvider>,
    );
    expect(markup).toContain("&quot;planned&quot;:&quot;ready&quot;");
    expect(markup).toContain("&quot;inProgress&quot;:&quot;loading&quot;");
    expect(markup).toContain("&quot;complete&quot;:&quot;empty&quot;");
    expect(usePaginatedQuery).toHaveBeenCalledTimes(3);
    for (const status of ["planned", "in_progress", "complete"]) {
      expect(usePaginatedQuery).toHaveBeenCalledWith(
        listRoadmapGroup,
        { status, boardId: "board-1", sessionGeneration: "actor-a" },
        { initialNumItems: 20 },
      );
    }
  });

  test("reports unsupported without roadmap refs and changes query identity across auth generations", () => {
    usePaginatedQuery.mockReturnValue({
      results: [],
      status: "LoadingFirstPage",
      loadMore: vi.fn(),
    });
    const withoutRoadmap = {
      public: bindings.public,
    } as unknown as AfferentBindings;
    const unsupported = renderToStaticMarkup(
      <AfferentProvider
        bindings={withoutRoadmap}
        auth={{ status: "unauthenticated" }}
      >
        <Probe />
      </AfferentProvider>,
    );
    expect(unsupported).toContain(
      "&quot;planned&quot;:&quot;unsupported&quot;",
    );

    renderToStaticMarkup(
      <AfferentProvider
        bindings={bindings}
        auth={{ status: "authenticated", sessionGeneration: "actor-b" }}
      >
        <Probe />
      </AfferentProvider>,
    );
    expect(usePaginatedQuery).toHaveBeenCalledWith(
      listRoadmapGroup,
      { status: "planned", sessionGeneration: "actor-b" },
      { initialNumItems: 20 },
    );
  });
});
