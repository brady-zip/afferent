import { v } from "convex/values";

declare const idBrand: unique symbol;
type BrandedId<Name extends string> = string & { readonly [idBrand]: Name };

export type BoardId = BrandedId<"BoardId">;
export type ActorId = BrandedId<"ActorId">;
export type PostId = BrandedId<"PostId">;

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

export const configureInstallationIntentValidator = v.object({
  readPolicy: v.union(v.literal("public"), v.literal("authenticated")),
  boards: v.array(v.object({ slug: v.string(), name: v.string() })),
});

export const createPostIntentValidator = v.object({
  boardId: v.string(),
  title: v.string(),
  body: v.string(),
});

export const listPostsIntentValidator = v.object({
  boardId: v.string(),
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

export const installationResultValidator = v.object({
  contractVersion: v.literal(1),
  readPolicy: v.union(v.literal("public"), v.literal("authenticated")),
  boards: v.array(publicBoardDtoValidator),
});

export const postListResultValidator = v.object({
  contractVersion: v.literal(1),
  posts: v.array(publicPostDtoValidator),
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
    args: { boardId: BoardId },
  ): Promise<{
    contractVersion: 1;
    posts: PostDto[];
  }>;
  getPost(ctx: Context, args: { postId: PostId }): Promise<PostDto>;
  countPosts(
    ctx: Context,
    args: { boardId: BoardId },
  ): Promise<{ contractVersion: 1; count: number }>;
}

export interface ParticipationCapabilities<Context> {
  createPost(
    ctx: Context,
    args: { boardId: BoardId; title: string; body: string },
  ): Promise<PostDto>;
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
}
