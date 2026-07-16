import { usePaginatedQuery } from "convex-helpers/react";
import { makeFunctionReference } from "convex/server";

import type {
  BoardId,
  RoadmapItemDto,
  RoadmapStatusKey,
} from "../../client/contracts.js";
import type { RoadmapGroupQueryReference } from "../bindings.js";
import { useAfferentContext } from "../provider.js";

const DEFAULT_ROADMAP_PAGE_SIZE = 20;
const UNCONFIGURED_ROADMAP_REFERENCE = makeFunctionReference<"query">(
  "__afferent:unconfiguredRoadmap",
) as RoadmapGroupQueryReference;

export interface RoadmapPaginationState {
  results: RoadmapItemDto[];
  status:
    "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted" | "Error";
  error?: Error;
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
      error: Error;
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
      error: pagination.error ?? new Error("Roadmap group failed"),
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
  sessionGeneration: string,
) {
  return {
    status,
    ...(boardId === undefined ? {} : { boardId }),
    sessionGeneration,
  };
}

export function useRoadmap(args: RoadmapArgs = {}): RoadmapState {
  const { bindings, auth } = useAfferentContext();
  const binding = bindings.roadmap?.listRoadmapGroup;
  const sessionGeneration =
    auth.status === "authenticated"
      ? (auth.sessionGeneration ?? "authenticated")
      : auth.status;
  const planned = usePaginatedQuery(
    binding ?? UNCONFIGURED_ROADMAP_REFERENCE,
    binding
      ? roadmapQueryArgs("planned", args.boardId, sessionGeneration)
      : "skip",
    { initialNumItems: DEFAULT_ROADMAP_PAGE_SIZE },
  );
  const inProgress = usePaginatedQuery(
    binding ?? UNCONFIGURED_ROADMAP_REFERENCE,
    binding
      ? roadmapQueryArgs("in_progress", args.boardId, sessionGeneration)
      : "skip",
    { initialNumItems: DEFAULT_ROADMAP_PAGE_SIZE },
  );
  const complete = usePaginatedQuery(
    binding ?? UNCONFIGURED_ROADMAP_REFERENCE,
    binding
      ? roadmapQueryArgs("complete", args.boardId, sessionGeneration)
      : "skip",
    { initialNumItems: DEFAULT_ROADMAP_PAGE_SIZE },
  );
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
