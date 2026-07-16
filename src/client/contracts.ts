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
  tags: readonly string[];
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

export interface ReadCapabilities<Context> {
  listPosts(ctx: Context, args: { boardId: BoardId }): Promise<{
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
