import { v } from "convex/values";

export interface VerifiedActorValue {
  externalKey: string;
  displayName?: string;
  avatarUrl?: string;
}

export const readPolicyValidator = v.union(
  v.literal("public"),
  v.literal("authenticated"),
);

export const verifiedActorValidator = v.object({
  externalKey: v.string(),
  displayName: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
});

export const boardInputValidator = v.object({
  slug: v.string(),
  name: v.string(),
});

export const boardDtoValidator = v.object({
  id: v.string(),
  slug: v.string(),
  name: v.string(),
});

export const actorDtoValidator = v.object({
  id: v.string(),
  displayName: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
});

export const postDtoValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  boardId: v.string(),
  board: boardDtoValidator,
  title: v.string(),
  body: v.string(),
  author: actorDtoValidator,
  status: v.object({
    key: v.literal("open"),
    label: v.literal("Open"),
  }),
  voteCount: v.number(),
  commentCount: v.number(),
  totals: v.object({
    votes: v.number(),
    comments: v.number(),
  }),
  tags: v.array(v.string()),
});

export const installationDtoValidator = v.object({
  contractVersion: v.literal(1),
  readPolicy: readPolicyValidator,
  boards: v.array(boardDtoValidator),
});

export const postListDtoValidator = v.object({
  contractVersion: v.literal(1),
  posts: v.array(postDtoValidator),
});

export const postPageDtoValidator = v.object({
  contractVersion: v.literal(1),
  page: v.array(postDtoValidator),
  posts: v.array(postDtoValidator),
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

export const boardListDtoValidator = v.object({
  contractVersion: v.literal(1),
  boards: v.array(boardDtoValidator),
});

export const countDtoValidator = v.object({
  contractVersion: v.literal(1),
  count: v.number(),
});
