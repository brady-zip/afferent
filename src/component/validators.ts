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

export const postStatusKeyValidator = v.union(
  v.literal("open"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("complete"),
  v.literal("closed"),
);

export const feedbackOrderValidator = v.union(
  v.literal("newest"),
  v.literal("top"),
  v.literal("trending"),
);

export const tagDtoValidator = v.object({ id: v.string(), name: v.string() });

export const commentDtoValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  postId: v.string(),
  body: v.string(),
  author: actorDtoValidator,
  parentCommentId: v.optional(v.string()),
});

export const commentPageDtoValidator = v.object({
  contractVersion: v.literal(1),
  page: v.array(commentDtoValidator),
  comments: v.array(commentDtoValidator),
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

export const feedbackPostDtoValidator = v.object({
  contractVersion: v.literal(2),
  id: v.string(),
  boardId: v.string(),
  board: boardDtoValidator,
  title: v.string(),
  body: v.string(),
  author: actorDtoValidator,
  status: v.object({
    key: postStatusKeyValidator,
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
  tags: v.array(tagDtoValidator),
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

export const feedbackPageDtoValidator = v.object({
  contractVersion: v.literal(2),
  page: v.array(feedbackPostDtoValidator),
  posts: v.array(feedbackPostDtoValidator),
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

export const discoveryPostDtoValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  title: v.string(),
  board: boardDtoValidator,
  status: v.object({
    key: postStatusKeyValidator,
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

export const searchResultDtoValidator = v.object({
  contractVersion: v.literal(1),
  items: v.array(discoveryPostDtoValidator),
  hasMore: v.boolean(),
});

export const similarPostResultDtoValidator = v.object({
  contractVersion: v.literal(1),
  items: v.array(discoveryPostDtoValidator),
  hasMore: v.boolean(),
});

export const boardListDtoValidator = v.object({
  contractVersion: v.literal(1),
  boards: v.array(boardDtoValidator),
});

export const countDtoValidator = v.object({
  contractVersion: v.literal(1),
  count: v.number(),
  hasMore: v.boolean(),
});
