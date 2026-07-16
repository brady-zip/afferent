import { usePaginatedQuery } from "convex-helpers/react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { useEffect, useState } from "react";

import type {
  BoardId,
  DiscoveryPostDto,
  FeedbackOrder,
  FeedbackPostDto,
  PostStatusKey,
  SearchResultDto,
  SimilarPostResultDto,
  TagId,
} from "../../client/contracts.js";
import type {
  FeedbackSearchQueryReference,
  SimilarPostsQueryReference,
} from "../bindings.js";
import { useAfferentContext } from "../provider.js";

const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_SEARCH_DEBOUNCE_MS = 250;

const UNCONFIGURED_SEARCH_REFERENCE = makeFunctionReference<"query">(
  "__afferent:unconfiguredSearch",
) as FeedbackSearchQueryReference;
const UNCONFIGURED_SIMILAR_REFERENCE = makeFunctionReference<"query">(
  "__afferent:unconfiguredSimilar",
) as SimilarPostsQueryReference;

export interface FeedbackFeedArgs {
  order: FeedbackOrder;
  boardId?: BoardId;
  status?: PostStatusKey;
  tagId?: TagId;
}

export type FeedbackFeedState =
  | Readonly<{
      status: "loading";
      items: FeedbackPostDto[];
      error?: undefined;
      isLoadingMore: false;
      canLoadMore: false;
      loadMore: () => void;
    }>
  | Readonly<{
      status: "ready";
      items: FeedbackPostDto[];
      error?: undefined;
      isLoadingMore: boolean;
      canLoadMore: boolean;
      loadMore: () => void;
    }>
  | Readonly<{
      status: "empty";
      items: FeedbackPostDto[];
      error?: undefined;
      isLoadingMore: false;
      canLoadMore: false;
      loadMore: () => void;
    }>
  | Readonly<{
      status: "error";
      items: FeedbackPostDto[];
      error: Error;
      isLoadingMore: false;
      canLoadMore: false;
      loadMore: () => void;
    }>;

export interface FeedbackPaginationState {
  results: FeedbackPostDto[];
  status:
    "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted" | "Error";
  error?: Error;
  loadMore: (count: number) => void;
}

export function mapFeedbackFeedState(
  pagination: FeedbackPaginationState,
): FeedbackFeedState {
  const loadMore = () => pagination.loadMore(DEFAULT_PAGE_SIZE);
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
      error: pagination.error ?? new Error("Feedback feed failed"),
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

export function useFeedbackFeed(args: FeedbackFeedArgs): FeedbackFeedState {
  const { bindings } = useAfferentContext();
  const pagination = usePaginatedQuery(bindings.public.listFeedback, args, {
    initialNumItems: DEFAULT_PAGE_SIZE,
  });
  return mapFeedbackFeedState(pagination);
}

export interface FeedbackSearchArgs {
  query: string;
  boardId?: BoardId;
  status?: PostStatusKey;
  tagId?: TagId;
  debounceMs?: number;
}

export interface SimilarPostsArgs {
  title: string;
  body?: string;
  limit?: number;
  debounceMs?: number;
}

export type BoundedDiscoveryState =
  | Readonly<{
      status: "unsupported" | "loading" | "empty";
      items: DiscoveryPostDto[];
      hasMore: false;
      error?: undefined;
    }>
  | Readonly<{
      status: "ready";
      items: DiscoveryPostDto[];
      hasMore: boolean;
      error?: undefined;
    }>
  | Readonly<{
      status: "error";
      items: DiscoveryPostDto[];
      hasMore: false;
      error: Error;
    }>;

export function mapBoundedDiscoveryState(
  result: SearchResultDto | SimilarPostResultDto | Error | undefined,
  unsupported = false,
): BoundedDiscoveryState {
  if (unsupported) {
    return { status: "unsupported", items: [], hasMore: false };
  }
  if (result === undefined) {
    return { status: "loading", items: [], hasMore: false };
  }
  if (result instanceof Error) {
    return { status: "error", items: [], hasMore: false, error: result };
  }
  if (result.items.length === 0) {
    return { status: "empty", items: [], hasMore: false };
  }
  return {
    status: "ready",
    items: result.items,
    hasMore: result.hasMore,
  };
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  const serialized = JSON.stringify(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), Math.max(0, delay));
    return () => clearTimeout(timeout);
  }, [serialized, delay]);
  return debounced;
}

export function useFeedbackSearch(
  args: FeedbackSearchArgs,
): BoundedDiscoveryState {
  const { bindings } = useAfferentContext();
  const binding = bindings.public.searchFeedback;
  const debounced = useDebouncedValue(
    {
      query: args.query,
      ...(args.boardId === undefined ? {} : { boardId: args.boardId }),
      ...(args.status === undefined ? {} : { status: args.status }),
      ...(args.tagId === undefined ? {} : { tagId: args.tagId }),
    },
    args.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS,
  );
  const enabled = binding !== undefined && debounced.query.trim().length > 0;
  const result = useQuery(
    binding ?? UNCONFIGURED_SEARCH_REFERENCE,
    enabled ? debounced : "skip",
  );
  if (binding === undefined) return mapBoundedDiscoveryState(undefined, true);
  if (!enabled) return { status: "empty", items: [], hasMore: false };
  return mapBoundedDiscoveryState(result);
}

export function useSimilarPosts(args: SimilarPostsArgs): BoundedDiscoveryState {
  const { bindings } = useAfferentContext();
  const binding = bindings.public.suggestSimilarPosts;
  const debounced = useDebouncedValue(
    {
      title: args.title,
      ...(args.body === undefined ? {} : { body: args.body }),
      ...(args.limit === undefined ? {} : { limit: args.limit }),
    },
    args.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS,
  );
  const enabled = binding !== undefined && debounced.title.trim().length > 0;
  const result = useQuery(
    binding ?? UNCONFIGURED_SIMILAR_REFERENCE,
    enabled ? debounced : "skip",
  );
  if (binding === undefined) return mapBoundedDiscoveryState(undefined, true);
  if (!enabled) return { status: "empty", items: [], hasMore: false };
  return mapBoundedDiscoveryState(result);
}
