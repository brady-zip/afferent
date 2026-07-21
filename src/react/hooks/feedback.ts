import { useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { useEffect, useState } from "react";

import type {
  AfferentError,
  BoardId,
  CommentDto,
  CommentId,
  DiscoveryPostDto,
  FeedbackOrder,
  FeedbackPostDto,
  PostStatusKey,
  SearchResultDto,
  SimilarPostResultDto,
  TagId,
  PostId,
  PostLookupResult,
  PostDto,
} from "../../client/contracts.js";
import type {
  CommentFeedQueryReference,
  FeedbackFeedQueryReference,
  ParticipationBindings,
  PublicBindings,
} from "../bindings.js";
import { useAfferentContext } from "../provider.js";
import { useDirectWatchQuery, usePaginatedWatchQuery } from "../query.js";
import { mapAfferentError, useMutationController } from "./mutations.js";

const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_SEARCH_DEBOUNCE_MS = 250;

const UNCONFIGURED_PARTICIPATION_MUTATION = makeFunctionReference<"mutation">(
  "__afferent:unconfiguredParticipationMutation",
);

export type PostLookupState =
  | Readonly<{ status: "unsupported" | "loading" | "notFound" }>
  | Readonly<{ status: "error"; error: AfferentError }>
  | Readonly<{ status: "post"; post: FeedbackPostDto }>
  | Readonly<{
      status: "merged";
      requestedPostId: PostId;
      canonicalPostId: PostId;
    }>;

export function mapPostLookupState(
  result: PostLookupResult | undefined,
  configured: boolean,
): PostLookupState {
  if (!configured) return { status: "unsupported" };
  if (result === undefined) return { status: "loading" };
  if (result.status === "post") return { status: "post", post: result.post };
  if (result.status === "merged") {
    return {
      status: "merged",
      requestedPostId: result.requestedPostId,
      canonicalPostId: result.canonicalPostId,
    };
  }
  return { status: "notFound" };
}

export function usePost(postId: PostId): PostLookupState {
  const { bindings, client, generation } = useAfferentContext();
  const binding = bindings.public.getPost;
  const query = useDirectWatchQuery({
    client,
    query: binding,
    args: binding ? { postId, sessionGeneration: generation } : undefined,
    generation,
  });
  if (query.status === "error") return query;
  return mapPostLookupState(
    query.status === "ready" ? query.value : undefined,
    binding !== undefined,
  );
}

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
      error: AfferentError;
      isLoadingMore: false;
      canLoadMore: false;
      loadMore: () => void;
    }>;

export interface FeedbackPaginationState {
  results: FeedbackPostDto[];
  status:
    "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted" | "Error";
  error?: AfferentError;
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
      error:
        pagination.error ?? mapAfferentError(new Error("Feedback feed failed")),
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
  const { bindings, client, generation } = useAfferentContext();
  const pagination = usePaginatedWatchQuery<
    FeedbackPostDto,
    FeedbackFeedQueryReference
  >({
    client,
    query: bindings.public.listFeedback,
    args: { ...args, sessionGeneration: generation },
    generation,
    initialNumItems: DEFAULT_PAGE_SIZE,
  });
  return mapFeedbackFeedState(pagination);
}

export type CommentFeedState =
  | Readonly<{
      status: "unsupported" | "loading" | "empty";
      items: CommentDto[];
      error?: undefined;
      isLoadingMore: false;
      canLoadMore: false;
      loadMore: () => void;
    }>
  | Readonly<{
      status: "ready";
      items: CommentDto[];
      error?: undefined;
      isLoadingMore: boolean;
      canLoadMore: boolean;
      loadMore: () => void;
    }>
  | Readonly<{
      status: "error";
      items: CommentDto[];
      error: AfferentError;
      isLoadingMore: false;
      canLoadMore: false;
      loadMore: () => void;
    }>;

export interface CommentPaginationState {
  results: CommentDto[];
  status:
    "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted" | "Error";
  error?: AfferentError;
  loadMore: (count: number) => void;
}

export function mapCommentFeedState(
  pagination: CommentPaginationState,
  configured = true,
): CommentFeedState {
  const loadMore = () => pagination.loadMore(DEFAULT_PAGE_SIZE);
  if (!configured) {
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
      error:
        pagination.error ?? mapAfferentError(new Error("Comment feed failed")),
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

export function useComments(postId: PostId): CommentFeedState {
  const { bindings, client, generation } = useAfferentContext();
  const binding = bindings.public.listComments;
  const pagination = usePaginatedWatchQuery<
    CommentDto,
    CommentFeedQueryReference
  >({
    client,
    query: binding,
    args: binding ? { postId, sessionGeneration: generation } : undefined,
    generation,
    initialNumItems: DEFAULT_PAGE_SIZE,
  });
  return mapCommentFeedState(pagination, binding !== undefined);
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
      error: AfferentError;
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
    return {
      status: "error",
      items: [],
      hasMore: false,
      error: mapAfferentError(result),
    };
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
  const { bindings, client, generation } = useAfferentContext();
  const binding = bindings.public.searchFeedback;
  const debounced = useDebouncedValue(
    {
      query: args.query,
      ...(args.boardId === undefined ? {} : { boardId: args.boardId }),
      ...(args.status === undefined ? {} : { status: args.status }),
      ...(args.tagId === undefined ? {} : { tagId: args.tagId }),
      sessionGeneration: generation,
    },
    args.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS,
  );
  const enabled = binding !== undefined && debounced.query.trim().length > 0;
  const result = useDirectWatchQuery({
    client,
    query: binding,
    args: enabled ? debounced : undefined,
    generation,
  });
  if (binding === undefined) return mapBoundedDiscoveryState(undefined, true);
  if (!enabled) return { status: "empty", items: [], hasMore: false };
  if (result.status === "error") {
    return { status: "error", items: [], hasMore: false, error: result.error };
  }
  return mapBoundedDiscoveryState(
    result.status === "ready" ? result.value : undefined,
  );
}

export function useSimilarPosts(args: SimilarPostsArgs): BoundedDiscoveryState {
  const { bindings, client, generation } = useAfferentContext();
  const binding = bindings.public.suggestSimilarPosts;
  const debounced = useDebouncedValue(
    {
      title: args.title,
      ...(args.body === undefined ? {} : { body: args.body }),
      ...(args.limit === undefined ? {} : { limit: args.limit }),
      sessionGeneration: generation,
    },
    args.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS,
  );
  const enabled = binding !== undefined && debounced.title.trim().length > 0;
  const result = useDirectWatchQuery({
    client,
    query: binding,
    args: enabled ? debounced : undefined,
    generation,
  });
  if (binding === undefined) return mapBoundedDiscoveryState(undefined, true);
  if (!enabled) return { status: "empty", items: [], hasMore: false };
  if (result.status === "error") {
    return { status: "error", items: [], hasMore: false, error: result.error };
  }
  return mapBoundedDiscoveryState(
    result.status === "ready" ? result.value : undefined,
  );
}

export type FeedbackMutationAction =
  "create" | "edit" | "withdraw" | "vote" | "comment";

export function feedbackMutationKey(
  entityId: string,
  action: FeedbackMutationAction,
) {
  return `${entityId}:${action}`;
}

function participationUnavailable(
  configured: boolean,
  authenticated: boolean,
): AfferentError | undefined {
  if (!configured) {
    return {
      contractVersion: 1,
      code: "NOT_AUTHORIZED",
      message: "Participation capabilities are not configured",
    };
  }
  if (!authenticated) {
    return {
      contractVersion: 1,
      code: "AUTHENTICATION_REQUIRED",
      message: "Participation requires an authenticated actor",
    };
  }
  return undefined;
}

function applyVoteOptimism(options: {
  mutation: ReturnType<typeof useMutation>;
  binding: ParticipationBindings["setVote"] | undefined;
  feedBinding: FeedbackFeedQueryReference;
  detailBinding: PublicBindings["getPost"];
  sessionGeneration: number;
}) {
  const {
    mutation,
    binding,
    feedBinding,
    detailBinding,
    sessionGeneration,
  } = options;
  const candidate = mutation as typeof mutation & {
    withOptimisticUpdate?: (
      handler: (store: any, args: { postId: PostId; desired: boolean }) => void,
    ) => typeof mutation;
  };
  if (!candidate.withOptimisticUpdate || !binding) return mutation;
  return candidate.withOptimisticUpdate((store, args) => {
    const update = (post: FeedbackPostDto) => {
      if (post.id !== args.postId) return post;
      const delta =
        (args.desired ? 1 : 0) - (post.viewerHasVoted ? 1 : 0);
      const voteCount = Math.max(0, post.voteCount + delta);
      return {
        ...post,
        voteCount,
        totals: { ...post.totals, votes: voteCount },
        viewerHasVoted: args.desired,
      };
    };
    for (const query of store.getAllQueries(feedBinding)) {
      if (query.args.sessionGeneration !== sessionGeneration) continue;
      if (!query.value) continue;
      store.setQuery(feedBinding, query.args, {
        ...query.value,
        page: query.value.page.map(update),
        posts: query.value.posts.map(update),
      });
    }
    if (detailBinding) {
      const detailArgs = {
        postId: args.postId,
        sessionGeneration,
      };
      const lookup = store.getQuery(detailBinding, detailArgs);
      if (lookup?.status === "post") {
        store.setQuery(detailBinding, detailArgs, {
          ...lookup,
          post: update(lookup.post),
        });
      }
    }
  });
}

export function useFeedbackMutations() {
  const { bindings, auth, generation } = useAfferentContext();
  const participation = bindings.participation;
  const createPost = useMutation(
    (participation?.createPost ??
      UNCONFIGURED_PARTICIPATION_MUTATION) as ParticipationBindings["createPost"],
  );
  const editPost = useMutation(
    (participation?.editPost ??
      UNCONFIGURED_PARTICIPATION_MUTATION) as ParticipationBindings["editPost"],
  );
  const withdrawPost = useMutation(
    (participation?.withdrawPost ??
      UNCONFIGURED_PARTICIPATION_MUTATION) as ParticipationBindings["withdrawPost"],
  );
  const rawVote = useMutation(
    (participation?.setVote ??
      UNCONFIGURED_PARTICIPATION_MUTATION) as ParticipationBindings["setVote"],
  );
  const setVote = applyVoteOptimism({
    mutation: rawVote,
    binding: participation?.setVote,
    feedBinding: bindings.public.listFeedback,
    detailBinding: bindings.public.getPost,
    sessionGeneration: generation,
  });
  const addComment = useMutation(
    (participation?.addComment ??
      UNCONFIGURED_PARTICIPATION_MUTATION) as ParticipationBindings["addComment"],
  );
  const controller = useMutationController(generation);
  const unavailable = participationUnavailable(
    participation !== undefined,
    auth.status === "authenticated",
  );
  let status: "unsupported" | "loading" | "unauthenticated" | "ready" = "ready";
  if (participation === undefined) status = "unsupported";
  else if (auth.status === "loading") status = "loading";
  else if (auth.status === "unauthenticated") status = "unauthenticated";

  return {
    status,
    pending: controller.pending,
    errors: controller.errors,
    reset: controller.reset,
    retry: controller.retry,
    createPost: (args: { boardId: BoardId; title: string; body: string }) =>
      controller.run<PostDto>(
        feedbackMutationKey("post", "create"),
        () => createPost(args),
        unavailable,
      ),
    editPost: (args: { postId: PostId; title?: string; body?: string }) =>
      controller.run<PostDto>(
        feedbackMutationKey(args.postId, "edit"),
        () => editPost(args),
        unavailable,
      ),
    withdrawPost: (postId: PostId) =>
      controller.run<PostDto>(
        feedbackMutationKey(postId, "withdraw"),
        () => withdrawPost({ postId }),
        unavailable,
      ),
    setVote: (postId: PostId, desired: boolean) =>
      controller.run<PostDto>(
        feedbackMutationKey(postId, "vote"),
        () => setVote({ postId, desired }),
        unavailable,
      ),
    addComment: (args: {
      postId: PostId;
      body: string;
      parentCommentId?: CommentId;
    }) =>
      controller.run<CommentDto>(
        feedbackMutationKey(args.postId, "comment"),
        () => addComment(args),
        unavailable,
      ),
  };
}
