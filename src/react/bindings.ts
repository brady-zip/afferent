import type { DefaultFunctionArgs, FunctionReference } from "convex/server";

import type {
  BoardId,
  FeedbackOrder,
  FeedbackPageDto,
  PaginationOptions,
  PostStatusKey,
  TagId,
  SearchResultDto,
  SimilarPostResultDto,
  FeedbackPostDto,
  PostActivityPageDto,
  PostId,
} from "../client/contracts.js";

export type FeedbackFeedQueryReference = FunctionReference<
  "query",
  "public",
  {
    order: FeedbackOrder;
    boardId?: BoardId;
    status?: PostStatusKey;
    tagId?: TagId;
    paginationOpts: PaginationOptions;
  },
  FeedbackPageDto
>;

export type FeedbackSearchQueryReference = FunctionReference<
  "query",
  "public",
  {
    query: string;
    boardId?: BoardId;
    status?: PostStatusKey;
    tagId?: TagId;
  },
  SearchResultDto
>;

export type SimilarPostsQueryReference = FunctionReference<
  "query",
  "public",
  { title: string; body?: string; limit?: number },
  SimilarPostResultDto
>;

export interface PublicBindings {
  listFeedback: FeedbackFeedQueryReference;
  searchFeedback?: FeedbackSearchQueryReference;
  suggestSimilarPosts?: SimilarPostsQueryReference;
}

type AdminMutationReference<Args extends DefaultFunctionArgs> =
  FunctionReference<"mutation", "public", Args, FeedbackPostDto>;

export interface AdminBindings {
  capability: FunctionReference<
    "query",
    "public",
    Record<string, never>,
    boolean
  >;
  editPost: AdminMutationReference<{
    postId: PostId;
    title?: string;
    body?: string;
  }>;
  movePost: AdminMutationReference<{ postId: PostId; boardId: BoardId }>;
  setPostStatus: AdminMutationReference<{
    postId: PostId;
    status: PostStatusKey;
  }>;
  setDiscussionLock: AdminMutationReference<{
    postId: PostId;
    locked: boolean;
  }>;
  setArchived: AdminMutationReference<{ postId: PostId; archived: boolean }>;
  listPostActivity: FunctionReference<
    "query",
    "public",
    { postId: PostId; paginationOpts: PaginationOptions },
    PostActivityPageDto
  >;
}

export interface AfferentBindings {
  public: PublicBindings;
  participation?: Readonly<Record<string, unknown>>;
  notifications?: Readonly<Record<string, unknown>>;
  roadmap?: Readonly<Record<string, unknown>>;
  changelog?: Readonly<Record<string, unknown>>;
  admin?: AdminBindings;
}
