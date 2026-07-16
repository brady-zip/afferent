import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

declare const idBrand: unique symbol;
type BrandedId<Name extends string> = string & { readonly [idBrand]: Name };

export type BoardId = BrandedId<"BoardId">;
export type ActorId = BrandedId<"ActorId">;
export type PostId = BrandedId<"PostId">;
export type CommentId = BrandedId<"CommentId">;

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

export const boardListResultValidator = v.object({
  contractVersion: v.literal(1),
  boards: v.array(publicBoardDtoValidator),
});

export const countResultValidator = v.object({
  contractVersion: v.literal(1),
  count: v.number(),
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
  getPost(ctx: Context, args: { postId: PostId }): Promise<PostDto>;
  countPosts(
    ctx: Context,
    args: { boardId: BoardId },
  ): Promise<{ contractVersion: 1; count: number }>;
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
