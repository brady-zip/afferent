import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

declare const idBrand: unique symbol;
type BrandedId<Name extends string> = string & { readonly [idBrand]: Name };

export type BoardId = BrandedId<"BoardId">;
export type ActorId = BrandedId<"ActorId">;
export type PostId = BrandedId<"PostId">;
export type CommentId = BrandedId<"CommentId">;
export type TagId = BrandedId<"TagId">;

export type PostStatusKey =
  "open" | "under_review" | "planned" | "in_progress" | "complete" | "closed";
export type FeedbackOrder = "newest" | "top" | "trending";

export type DiscoveryPostDto = Readonly<{
  contractVersion: 1;
  id: PostId;
  title: string;
  board: BoardDto;
  status: Readonly<{
    key: PostStatusKey;
    label:
      | "Open"
      | "Under Review"
      | "Planned"
      | "In Progress"
      | "Complete"
      | "Closed";
  }>;
}>;

export type SearchResultDto = Readonly<{
  contractVersion: 1;
  items: DiscoveryPostDto[];
  hasMore: boolean;
}>;

export type SimilarPostResultDto = Readonly<{
  contractVersion: 1;
  items: DiscoveryPostDto[];
  hasMore: boolean;
}>;

export type VerifiedActor = Readonly<{
  externalKey: string;
  displayName?: string;
  avatarUrl?: string;
}>;

export type BoardDto = Readonly<{
  id: BoardId;
  slug: string;
  name: string;
}>;

export type PostDto = Readonly<{
  contractVersion: 1;
  id: PostId;
  boardId: BoardId;
  board: BoardDto;
  title: string;
  body: string;
  author: Readonly<{
    id: ActorId;
    displayName?: string;
    avatarUrl?: string;
  }>;
  status: Readonly<{ key: "open"; label: "Open" }>;
  voteCount: number;
  commentCount: number;
  totals: Readonly<{ votes: number; comments: number }>;
  tags: string[];
}>;

export type TagDto = Readonly<{ id: TagId; name: string }>;

export type FeedbackPostDto = Readonly<{
  contractVersion: 2;
  id: PostId;
  boardId: BoardId;
  board: BoardDto;
  title: string;
  body: string;
  author: PostDto["author"];
  status: Readonly<{
    key: PostStatusKey;
    label:
      | "Open"
      | "Under Review"
      | "Planned"
      | "In Progress"
      | "Complete"
      | "Closed";
  }>;
  voteCount: number;
  commentCount: number;
  totals: Readonly<{ votes: number; comments: number }>;
  tags: TagDto[];
}>;

export type PaginationOptions = Readonly<{
  numItems: number;
  cursor: string | null;
  endCursor?: string | null;
  id?: number;
  maximumRowsRead?: number;
  maximumBytesRead?: number;
}>;

export type PostPageDto = Readonly<{
  contractVersion: 1;
  page: PostDto[];
  posts: PostDto[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
}>;

export type FeedbackPageDto = Readonly<{
  contractVersion: 2;
  page: FeedbackPostDto[];
  posts: FeedbackPostDto[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
}>;

export type PostCountDto = Readonly<{
  contractVersion: 1;
  count: number;
  hasMore: boolean;
}>;

export type CommentDto = Readonly<{
  contractVersion: 1;
  id: CommentId;
  postId: PostId;
  body: string;
  author: PostDto["author"];
  parentCommentId?: CommentId;
}>;

export type CommentPageDto = Readonly<{
  contractVersion: 1;
  page: CommentDto[];
  comments: CommentDto[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
}>;

export const configureInstallationIntentValidator = v.object({
  readPolicy: v.union(v.literal("public"), v.literal("authenticated")),
  boards: v.array(v.object({ slug: v.string(), name: v.string() })),
});

export const anonymizeActorIntentValidator = v.object({ actorId: v.string() });

export const createPostIntentValidator = v.object({
  boardId: v.string(),
  title: v.string(),
  body: v.string(),
});

export const editPostIntentValidator = v.object({
  postId: v.string(),
  title: v.optional(v.string()),
  body: v.optional(v.string()),
});

export const withdrawPostIntentValidator = v.object({ postId: v.string() });

export const setVoteIntentValidator = v.object({
  postId: v.string(),
  desired: v.boolean(),
});

export const addCommentIntentValidator = v.object({
  postId: v.string(),
  body: v.string(),
  parentCommentId: v.optional(v.string()),
});

export const listCommentsIntentValidator = v.object({
  postId: v.string(),
  paginationOpts: v.optional(paginationOptsValidator),
});

export const listPostsIntentValidator = v.object({
  boardId: v.string(),
  paginationOpts: v.optional(paginationOptsValidator),
});

export const listFeedbackIntentValidator = v.object({
  order: v.union(v.literal("newest"), v.literal("top"), v.literal("trending")),
  boardId: v.optional(v.string()),
  status: v.optional(
    v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("closed"),
    ),
  ),
  tagId: v.optional(v.string()),
  paginationOpts: v.optional(paginationOptsValidator),
});

export const searchFeedbackIntentValidator = v.object({
  query: v.string(),
  boardId: v.optional(v.string()),
  status: v.optional(
    v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("closed"),
    ),
  ),
  tagId: v.optional(v.string()),
});

export const suggestSimilarPostsIntentValidator = v.object({
  title: v.string(),
  body: v.optional(v.string()),
  limit: v.optional(v.number()),
});

export const listBoardsIntentValidator = v.object({});

export const getPostIntentValidator = v.object({ postId: v.string() });

export const countPostsIntentValidator = v.object({ boardId: v.string() });

export const publicBoardDtoValidator = v.object({
  id: v.string(),
  slug: v.string(),
  name: v.string(),
});

export const publicPostDtoValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  boardId: v.string(),
  board: publicBoardDtoValidator,
  title: v.string(),
  body: v.string(),
  author: v.object({
    id: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }),
  status: v.object({ key: v.literal("open"), label: v.literal("Open") }),
  voteCount: v.number(),
  commentCount: v.number(),
  totals: v.object({ votes: v.number(), comments: v.number() }),
  tags: v.array(v.string()),
});

export const publicFeedbackPostDtoValidator = v.object({
  contractVersion: v.literal(2),
  id: v.string(),
  boardId: v.string(),
  board: publicBoardDtoValidator,
  title: v.string(),
  body: v.string(),
  author: v.object({
    id: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }),
  status: v.object({
    key: v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("closed"),
    ),
    label: v.union(
      v.literal("Open"),
      v.literal("Under Review"),
      v.literal("Planned"),
      v.literal("In Progress"),
      v.literal("Complete"),
      v.literal("Closed"),
    ),
  }),
  voteCount: v.number(),
  commentCount: v.number(),
  totals: v.object({ votes: v.number(), comments: v.number() }),
  tags: v.array(v.object({ id: v.string(), name: v.string() })),
});

export const publicCommentDtoValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  postId: v.string(),
  body: v.string(),
  author: v.object({
    id: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }),
  parentCommentId: v.optional(v.string()),
});

export const commentPageResultValidator = v.object({
  contractVersion: v.literal(1),
  page: v.array(publicCommentDtoValidator),
  comments: v.array(publicCommentDtoValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
  splitCursor: v.optional(v.union(v.string(), v.null())),
  pageStatus: v.optional(
    v.union(
      v.literal("SplitRecommended"),
      v.literal("SplitRequired"),
      v.null(),
    ),
  ),
});

export const installationResultValidator = v.object({
  contractVersion: v.literal(1),
  readPolicy: v.union(v.literal("public"), v.literal("authenticated")),
  boards: v.array(publicBoardDtoValidator),
});

export const postListResultValidator = v.object({
  contractVersion: v.literal(1),
  posts: v.array(publicPostDtoValidator),
});

export const postPageResultValidator = v.object({
  contractVersion: v.literal(1),
  page: v.array(publicPostDtoValidator),
  posts: v.array(publicPostDtoValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
  splitCursor: v.optional(v.union(v.string(), v.null())),
  pageStatus: v.optional(
    v.union(
      v.literal("SplitRecommended"),
      v.literal("SplitRequired"),
      v.null(),
    ),
  ),
});

export const feedbackPageResultValidator = v.object({
  contractVersion: v.literal(2),
  page: v.array(publicFeedbackPostDtoValidator),
  posts: v.array(publicFeedbackPostDtoValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
  splitCursor: v.optional(v.union(v.string(), v.null())),
  pageStatus: v.optional(
    v.union(
      v.literal("SplitRecommended"),
      v.literal("SplitRequired"),
      v.null(),
    ),
  ),
});

export const discoveryPostResultValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  title: v.string(),
  board: publicBoardDtoValidator,
  status: v.object({
    key: v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("closed"),
    ),
    label: v.union(
      v.literal("Open"),
      v.literal("Under Review"),
      v.literal("Planned"),
      v.literal("In Progress"),
      v.literal("Complete"),
      v.literal("Closed"),
    ),
  }),
});

export const searchFeedbackResultValidator = v.object({
  contractVersion: v.literal(1),
  items: v.array(discoveryPostResultValidator),
  hasMore: v.boolean(),
});

export const similarPostResultValidator = v.object({
  contractVersion: v.literal(1),
  items: v.array(discoveryPostResultValidator),
  hasMore: v.boolean(),
});

export const boardListResultValidator = v.object({
  contractVersion: v.literal(1),
  boards: v.array(publicBoardDtoValidator),
});

export const countResultValidator = v.object({
  contractVersion: v.literal(1),
  count: v.number(),
  hasMore: v.boolean(),
});

export interface ReadCapabilities<Context> {
  listBoards(
    ctx: Context,
    args: Record<string, never>,
  ): Promise<{ contractVersion: 1; boards: BoardDto[] }>;
  listPosts(
    ctx: Context,
    args: { boardId: BoardId; paginationOpts?: PaginationOptions },
  ): Promise<PostPageDto>;
  listFeedback(
    ctx: Context,
    args: {
      order: FeedbackOrder;
      boardId?: BoardId;
      status?: PostStatusKey;
      tagId?: TagId;
      paginationOpts?: PaginationOptions;
    },
  ): Promise<FeedbackPageDto>;
  searchFeedback(
    ctx: Context,
    args: {
      query: string;
      boardId?: BoardId;
      status?: PostStatusKey;
      tagId?: TagId;
    },
  ): Promise<SearchResultDto>;
  suggestSimilarPosts(
    ctx: Context,
    args: { title: string; body?: string; limit?: number },
  ): Promise<SimilarPostResultDto>;
  getPost(ctx: Context, args: { postId: PostId }): Promise<PostDto>;
  countPosts(ctx: Context, args: { boardId: BoardId }): Promise<PostCountDto>;
  listComments(
    ctx: Context,
    args: { postId: PostId; paginationOpts?: PaginationOptions },
  ): Promise<CommentPageDto>;
}

export interface ParticipationCapabilities<Context> {
  createPost(
    ctx: Context,
    args: { boardId: BoardId; title: string; body: string },
  ): Promise<PostDto>;
  editPost(
    ctx: Context,
    args: { postId: PostId; title?: string; body?: string },
  ): Promise<PostDto>;
  withdrawPost(ctx: Context, args: { postId: PostId }): Promise<PostDto>;
  setVote(
    ctx: Context,
    args: { postId: PostId; desired: boolean },
  ): Promise<PostDto>;
  addComment(
    ctx: Context,
    args: { postId: PostId; body: string; parentCommentId?: CommentId },
  ): Promise<CommentDto>;
}

export interface AdminCapabilities<Context> {
  configureInstallation(
    ctx: Context,
    args: {
      readPolicy: "public" | "authenticated";
      boards: readonly { slug: string; name: string }[];
    },
  ): Promise<{
    contractVersion: 1;
    readPolicy: "public" | "authenticated";
    boards: BoardDto[];
  }>;
  anonymizeActor(
    ctx: Context,
    args: { actorId: ActorId },
  ): Promise<PostDto["author"]>;
}
