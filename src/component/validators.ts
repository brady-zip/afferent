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

export const roadmapStatusKeyValidator = v.union(
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("complete"),
);

export const tagDtoValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  name: v.string(),
});

export const tagListDtoValidator = v.object({
  contractVersion: v.literal(1),
  tags: v.array(tagDtoValidator),
});

export const tagDeleteResultValidator = v.object({
  contractVersion: v.literal(1),
  tagId: v.string(),
  status: v.union(v.literal("pending"), v.literal("deleted")),
});

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

export const roadmapItemDtoValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  boardId: v.string(),
  board: boardDtoValidator,
  title: v.string(),
  status: v.object({
    key: roadmapStatusKeyValidator,
    label: v.union(
      v.literal("Planned"),
      v.literal("In Progress"),
      v.literal("Complete"),
    ),
  }),
  currentStatusSince: v.number(),
  createdAt: v.number(),
  voteCount: v.number(),
  commentCount: v.number(),
});

export const roadmapGroupPageDtoValidator = v.object({
  contractVersion: v.literal(1),
  page: v.array(roadmapItemDtoValidator),
  items: v.array(roadmapItemDtoValidator),
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

export const changelogLinkedPostDtoValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  title: v.string(),
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

export const publicChangelogEntryDtoValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  title: v.string(),
  body: v.string(),
  slug: v.string(),
  firstPublishedAt: v.number(),
  updatedAt: v.number(),
  links: v.array(changelogLinkedPostDtoValidator),
});

export const changelogPageDtoValidator = v.object({
  contractVersion: v.literal(1),
  page: v.array(publicChangelogEntryDtoValidator),
  entries: v.array(publicChangelogEntryDtoValidator),
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

export const publishedChangelogLookupDtoValidator = v.union(
  v.object({ contractVersion: v.literal(1), status: v.literal("notFound") }),
  v.object({
    contractVersion: v.literal(1),
    status: v.literal("entry"),
    entry: publicChangelogEntryDtoValidator,
  }),
);

export const adminChangelogEntryDtoValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  title: v.string(),
  body: v.string(),
  slug: v.string(),
  state: v.union(
    v.literal("draft"),
    v.literal("published"),
    v.literal("unpublished"),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  firstPublishedAt: v.optional(v.number()),
  publishedAt: v.optional(v.number()),
  postIds: v.array(v.string()),
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

export const participationFailureValidator = v.object({
  ok: v.literal(false),
  error: v.union(
    v.object({
      contractVersion: v.literal(1),
      code: v.union(
        v.literal("VALIDATION"),
        v.literal("NOT_FOUND"),
        v.literal("DISCUSSION_LOCKED"),
        v.literal("NOT_AUTHORIZED"),
      ),
      message: v.string(),
    }),
    v.object({
      contractVersion: v.literal(1),
      code: v.literal("RATE_LIMITED"),
      operation: v.union(
        v.literal("create_post"),
        v.literal("edit_post"),
        v.literal("comment"),
        v.literal("vote"),
        v.literal("subscribe"),
      ),
      retryAfterMs: v.number(),
    }),
  ),
});

export const postMutationResultValidator = v.union(
  postDtoValidator,
  participationFailureValidator,
);

export const commentMutationResultValidator = v.union(
  commentDtoValidator,
  participationFailureValidator,
);

export const activityTypeValidator = v.union(
  v.literal("create"),
  v.literal("edit"),
  v.literal("status_change"),
  v.literal("board_move"),
  v.literal("tag_add"),
  v.literal("tag_remove"),
  v.literal("lock"),
  v.literal("unlock"),
  v.literal("archive"),
  v.literal("restore"),
  v.literal("merge"),
  v.literal("changelog_publish"),
  v.literal("changelog_unpublish"),
);

export const postActivityDtoValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  postId: v.string(),
  type: activityTypeValidator,
  occurredAt: v.number(),
  actor: v.optional(actorDtoValidator),
  changedFields: v.optional(v.array(v.string())),
  fromStatus: v.optional(postStatusKeyValidator),
  toStatus: v.optional(postStatusKeyValidator),
  fromBoardId: v.optional(v.string()),
  toBoardId: v.optional(v.string()),
  tagId: v.optional(v.string()),
  changelogEntryId: v.optional(v.string()),
});

export const postActivityPageDtoValidator = v.object({
  contractVersion: v.literal(1),
  page: v.array(postActivityDtoValidator),
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
  hasMore: v.boolean(),
});
