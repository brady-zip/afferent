import type {
  AfferentError,
  BoardId,
  RoadmapItemDto,
  RoadmapStatusKey,
} from "../../client/contracts.js";
import type { RoadmapGroupQueryReference } from "../bindings.js";
import { useAfferentContext } from "../provider.js";
import { usePaginatedWatchQuery } from "../query.js";

const DEFAULT_ROADMAP_PAGE_SIZE = 20;
export interface RoadmapPaginationState {
  results: RoadmapItemDto[];
  status:
    "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted" | "Error";
  error?: AfferentError;
  loadMore: (count: number) => void;
}

export type RoadmapGroupState =
  | Readonly<{
      status: "unsupported" | "loading" | "empty";
      items: RoadmapItemDto[];
      error?: undefined;
      isLoadingMore: false;
      canLoadMore: false;
      loadMore: () => void;
    }>
  | Readonly<{
      status: "ready";
      items: RoadmapItemDto[];
      error?: undefined;
      isLoadingMore: boolean;
      canLoadMore: boolean;
      loadMore: () => void;
    }>
  | Readonly<{
      status: "error";
      items: RoadmapItemDto[];
      error: AfferentError;
      isLoadingMore: false;
      canLoadMore: false;
      loadMore: () => void;
    }>;

export function mapRoadmapGroupState(
  pagination: RoadmapPaginationState,
  unsupported = false,
): RoadmapGroupState {
  const loadMore = () => pagination.loadMore(DEFAULT_ROADMAP_PAGE_SIZE);
  if (unsupported) {
    return {
      status: "unsupported",
      items: [],
      isLoadingMore: false,
      canLoadMore: false,
      loadMore,
    };
  }
  if (pagination.status === "LoadingFirstPage") {
    return {
      status: "loading",
      items: pagination.results,
      isLoadingMore: false,
      canLoadMore: false,
      loadMore,
    };
  }
  if (pagination.status === "Error") {
    return {
      status: "error",
      items: pagination.results,
      error: pagination.error!,
      isLoadingMore: false,
      canLoadMore: false,
      loadMore,
    };
  }
  if (pagination.status === "Exhausted" && pagination.results.length === 0) {
    return {
      status: "empty",
      items: pagination.results,
      isLoadingMore: false,
      canLoadMore: false,
      loadMore,
    };
  }
  return {
    status: "ready",
    items: pagination.results,
    isLoadingMore: pagination.status === "LoadingMore",
    canLoadMore:
      pagination.status === "CanLoadMore" ||
      pagination.status === "LoadingMore",
    loadMore,
  };
}

export interface RoadmapArgs {
  boardId?: BoardId;
}

export type RoadmapState = Readonly<{
  boardId?: BoardId;
  authStatus: "loading" | "authenticated" | "unauthenticated";
  groups: Readonly<{
    planned: RoadmapGroupState;
    inProgress: RoadmapGroupState;
    complete: RoadmapGroupState;
  }>;
}>;

function roadmapQueryArgs(
  status: RoadmapStatusKey,
  boardId: BoardId | undefined,
  sessionGeneration: number,
) {
  return {
    status,
    ...(boardId === undefined ? {} : { boardId }),
    sessionGeneration,
  };
}

export function useRoadmap(args: RoadmapArgs = {}): RoadmapState {
  const { bindings, auth, client, generation } = useAfferentContext();
  const binding = bindings.roadmap?.listRoadmapGroup;
  const planned = usePaginatedWatchQuery<
    RoadmapItemDto,
    RoadmapGroupQueryReference
  >({
    client,
    query: binding,
    args: binding
      ? roadmapQueryArgs("planned", args.boardId, generation)
      : undefined,
    generation,
    initialNumItems: DEFAULT_ROADMAP_PAGE_SIZE,
  });
  const inProgress = usePaginatedWatchQuery<
    RoadmapItemDto,
    RoadmapGroupQueryReference
  >({
    client,
    query: binding,
    args: binding
      ? roadmapQueryArgs("in_progress", args.boardId, generation)
      : undefined,
    generation,
    initialNumItems: DEFAULT_ROADMAP_PAGE_SIZE,
  });
  const complete = usePaginatedWatchQuery<
    RoadmapItemDto,
    RoadmapGroupQueryReference
  >({
    client,
    query: binding,
    args: binding
      ? roadmapQueryArgs("complete", args.boardId, generation)
      : undefined,
    generation,
    initialNumItems: DEFAULT_ROADMAP_PAGE_SIZE,
  });
  const unsupported = binding === undefined;
  return {
    ...(args.boardId === undefined ? {} : { boardId: args.boardId }),
    authStatus: auth.status,
    groups: {
      planned: mapRoadmapGroupState(planned, unsupported),
      inProgress: mapRoadmapGroupState(inProgress, unsupported),
      complete: mapRoadmapGroupState(complete, unsupported),
    },
  };
}
