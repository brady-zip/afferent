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

export interface ReadCapabilities<Context> {
  listPosts(
    ctx: Context,
    args: { boardId: BoardId },
  ): Promise<{
    contractVersion: 1;
    posts: PostDto[];
  }>;
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
      boards: ReadonlyArray<{ slug: string; name: string }>;
    },
  ): Promise<{
    contractVersion: 1;
    readPolicy: "public" | "authenticated";
    boards: BoardDto[];
  }>;
}
