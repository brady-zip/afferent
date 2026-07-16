import { usePaginatedQuery } from "convex-helpers/react";

import type {
  BoardId,
  FeedbackOrder,
  FeedbackPostDto,
  PostStatusKey,
  TagId,
} from "../../client/contracts.js";
import { useAfferentContext } from "../provider.js";

const DEFAULT_PAGE_SIZE = 20;

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
