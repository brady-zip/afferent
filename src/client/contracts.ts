import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

declare const idBrand: unique symbol;
type BrandedId<Name extends string> = string & { readonly [idBrand]: Name };

export type BoardId = BrandedId<"BoardId">;
export type ActorId = BrandedId<"ActorId">;
export type PostId = BrandedId<"PostId">;
export type CommentId = BrandedId<"CommentId">;
export type TagId = BrandedId<"TagId">;
export type ActivityId = BrandedId<"ActivityId">;
export type ChangelogId = BrandedId<"ChangelogId">;
export type NotificationId = BrandedId<"NotificationId">;
export type DeliveryId = BrandedId<"DeliveryId">;

export type RoadmapStatusKey = "planned" | "in_progress" | "complete";

export type PostStatusKey =
  "open" | "under_review" | "planned" | "in_progress" | "complete" | "closed";
export type FeedbackOrder = "newest" | "top" | "trending";

export type AfferentErrorDto =
  | Readonly<{
      contractVersion: 1;
      code: "RATE_LIMITED";
      operation: "create_post" | "edit_post" | "comment" | "vote" | "subscribe";
      retryAfterMs: number;
    }>
  | Readonly<{
      contractVersion: 1;
      code:
        | "AUTHENTICATION_REQUIRED"
        | "VALIDATION"
        | "NOT_FOUND"
        | "DISCUSSION_LOCKED"
        | "NOT_AUTHORIZED"
        | "CONFLICT"
        | "TRANSIENT"
        | "UNKNOWN";
      message: string;
      field?: string;
    }>;

export type AfferentError = AfferentErrorDto & Readonly<{ retryAt?: number }>;

export type AfferentResult<T> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; error: AfferentError }>;

export type AfferentActionResult<T> =
  T | Readonly<{ ok: false; error: AfferentErrorDto }>;

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
  contractVersion: 2;
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
  viewerHasVoted: boolean;
  viewerCanEdit: boolean;
  viewerCanWithdraw: boolean;
}>;

export type TagDto = Readonly<{
  contractVersion: 1;
  id: TagId;
  name: string;
}>;

export type TagListDto = Readonly<{ contractVersion: 1; tags: TagDto[] }>;

export type TagDeleteResultDto = Readonly<{
  contractVersion: 1;
  tagId: TagId;
  status: "pending" | "deleted";
}>;

export type FeedbackPostDto = Readonly<{
  contractVersion: 3;
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
  viewerHasVoted: boolean;
  viewerCanEdit: boolean;
  viewerCanWithdraw: boolean;
}>;

export type PostLookupResult =
  | Readonly<{ contractVersion: 2; status: "post"; post: FeedbackPostDto }>
  | Readonly<{
      contractVersion: 2;
      status: "merged";
      requestedPostId: PostId;
      canonicalPostId: PostId;
    }>
  | Readonly<{ contractVersion: 2; status: "notFound" }>;

export type MergePostResult = Readonly<{
  contractVersion: 1;
  status: "pending" | "complete";
  sourcePostId: PostId;
  canonicalPostId: PostId;
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
  contractVersion: 2;
  page: PostDto[];
  posts: PostDto[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
}>;

export type FeedbackPageDto = Readonly<{
  contractVersion: 3;
  page: FeedbackPostDto[];
  posts: FeedbackPostDto[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
}>;

export type AdminFeedbackPostDto = Readonly<{
  contractVersion: 1;
  feedback: FeedbackPostDto;
  moderation: Readonly<{
    contractVersion: 1;
    discussionLocked: boolean;
    archived: boolean;
    disposition: "active" | "withdrawn" | "merged";
    mergedIntoPostId?: PostId;
  }>;
}>;

export type AdminFeedbackPageDto = Readonly<{
  contractVersion: 1;
  page: AdminFeedbackPostDto[];
  posts: AdminFeedbackPostDto[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
}>;

export type RoadmapItemDto = Readonly<{
  contractVersion: 1;
  id: PostId;
  boardId: BoardId;
  board: BoardDto;
  title: string;
  status: Readonly<{
    key: RoadmapStatusKey;
    label: "Planned" | "In Progress" | "Complete";
  }>;
  currentStatusSince: number;
  createdAt: number;
  voteCount: number;
  commentCount: number;
}>;

export type RoadmapGroupPageDto = Readonly<{
  contractVersion: 1;
  page: RoadmapItemDto[];
  items: RoadmapItemDto[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
}>;

export type ChangelogLinkedPostDto = Readonly<{
  contractVersion: 1;
  id: PostId;
  title: string;
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

export type PublicChangelogEntryDto = Readonly<{
  contractVersion: 1;
  id: ChangelogId;
  title: string;
  body: string;
  slug: string;
  firstPublishedAt: number;
  updatedAt: number;
  links: ChangelogLinkedPostDto[];
}>;

export type ChangelogPageDto = Readonly<{
  contractVersion: 1;
  page: PublicChangelogEntryDto[];
  entries: PublicChangelogEntryDto[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
}>;

export type PublishedChangelogLookupDto =
  | Readonly<{ contractVersion: 1; status: "notFound" }>
  | Readonly<{
      contractVersion: 1;
      status: "entry";
      entry: PublicChangelogEntryDto;
    }>;

export type AdminChangelogEntryDto = Readonly<{
  contractVersion: 2;
  id: ChangelogId;
  title: string;
  body: string;
  slug: string;
  state: "draft" | "published" | "unpublished";
  createdAt: number;
  updatedAt: number;
  firstPublishedAt?: number;
  publishedAt?: number;
  links: ChangelogLinkedPostDto[];
}>;

export type AdminChangelogPageDto = Readonly<{
  contractVersion: 1;
  page: AdminChangelogEntryDto[];
  entries: AdminChangelogEntryDto[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
}>;

export type NotificationEventType =
  | "status_changed"
  | "admin_replied"
  | "comment_replied"
  | "mentioned"
  | "changelog_published";

export type NotificationTarget =
  | Readonly<{
      contractVersion: 1;
      kind: "post";
      postId: PostId;
      commentId?: CommentId;
      label: string;
    }>
  | Readonly<{
      contractVersion: 1;
      kind: "changelog";
      slug: string;
      label: string;
    }>;

export type PostSubscriptionDto = Readonly<{
  contractVersion: 1;
  postId: PostId;
  subscribed: boolean;
  explicitOptOut: boolean;
}>;

export type NotificationDto = Readonly<{
  contractVersion: 2;
  id: NotificationId;
  eventId: string;
  type: NotificationEventType;
  target: NotificationTarget;
  occurredAt: number;
  read: boolean;
  initiator: PostDto["author"];
}>;

export type NotificationPageDto = Readonly<{
  contractVersion: 2;
  page: NotificationDto[];
  notifications: NotificationDto[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
}>;

export type UnreadNotificationCountDto = Readonly<{
  contractVersion: 1;
  count: number;
}>;

export type DeliveryEventDto = Readonly<{
  contractVersion: 1;
  eventId: string;
  type: NotificationEventType;
  entityId: string;
  sequence: number;
  occurredAt: number;
  recipientKey: string;
}>;

export type DeliveryLeaseDto = Readonly<{
  contractVersion: 1;
  id: DeliveryId;
  event: DeliveryEventDto;
  leaseOwner: string;
  leaseVersion: number;
  leaseUntil: number;
  attempts: number;
}>;

export type DeliveryBatchDto = Readonly<{
  contractVersion: 1;
  leases: DeliveryLeaseDto[];
}>;

export type DeliveryOperationResult =
  | Readonly<{ contractVersion: 1; ok: true; status: "acked" }>
  | Readonly<{ contractVersion: 1; ok: true; status: "dead_letter" }>
  | Readonly<{
      contractVersion: 1;
      ok: true;
      status: "pending";
      availableAt: number;
    }>
  | Readonly<{
      contractVersion: 1;
      ok: false;
      error: Readonly<{ code: "LEASE_LOST" }>;
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

export type PostActivityDto = Readonly<{
  contractVersion: 2;
  id: ActivityId;
  postId: PostId;
  type:
    | "create"
    | "edit"
    | "status_change"
    | "board_move"
    | "tag_add"
    | "tag_remove"
    | "lock"
    | "unlock"
    | "archive"
    | "restore"
    | "merge"
    | "changelog_publish"
    | "changelog_unpublish";
  occurredAt: number;
  actor?: PostDto["author"];
  changedFields?: string[];
  fromStatus?: PostStatusKey;
  toStatus?: PostStatusKey;
  fromBoard?: Readonly<{ contractVersion: 1; name: string; slug: string }>;
  toBoard?: Readonly<{ contractVersion: 1; name: string; slug: string }>;
  tag?: Readonly<{ contractVersion: 1; name: string }>;
  changelog?: Readonly<{
    contractVersion: 1;
    title: string;
    slug: string;
  }>;
}>;

export type PostActivityPageDto = Readonly<{
  contractVersion: 2;
  page: PostActivityDto[];
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

export const getPostSubscriptionIntentValidator = v.object({
  postId: v.string(),
});
export const setPostSubscriptionIntentValidator = v.object({
  postId: v.string(),
  desired: v.boolean(),
});
export const listNotificationsIntentValidator = v.object({
  paginationOpts: v.optional(paginationOptsValidator),
});
export const getUnreadNotificationCountIntentValidator = v.object({});
export const markNotificationReadIntentValidator = v.object({
  notificationId: v.string(),
});
export const claimDeliveryBatchIntentValidator = v.object({
  leaseOwner: v.string(),
  limit: v.optional(v.number()),
});
export const ackDeliveryIntentValidator = v.object({
  deliveryId: v.string(),
  leaseOwner: v.string(),
  leaseVersion: v.number(),
});
export const releaseDeliveryIntentValidator = ackDeliveryIntentValidator;

export const adminEditPostIntentValidator = editPostIntentValidator;
export const movePostIntentValidator = v.object({
  postId: v.string(),
  boardId: v.string(),
});
export const setPostStatusIntentValidator = v.object({
  postId: v.string(),
  status: v.union(
    v.literal("open"),
    v.literal("under_review"),
    v.literal("planned"),
    v.literal("in_progress"),
    v.literal("complete"),
    v.literal("closed"),
  ),
});
export const setDiscussionLockIntentValidator = v.object({
  postId: v.string(),
  locked: v.boolean(),
});
export const setArchivedIntentValidator = v.object({
  postId: v.string(),
  archived: v.boolean(),
});
export const listPostActivityIntentValidator = v.object({
  postId: v.string(),
  paginationOpts: v.optional(paginationOptsValidator),
});
export const listAdminFeedbackIntentValidator = v.object({
  visibility: v.union(v.literal("visible"), v.literal("hidden")),
  paginationOpts: v.optional(paginationOptsValidator),
});
export const getAdminPostIntentValidator = v.object({ postId: v.string() });
export const listAdminChangelogIntentValidator = v.object({
  paginationOpts: v.optional(paginationOptsValidator),
});
export const publicPostStatusKeyValidator = v.union(
  v.literal("open"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("complete"),
  v.literal("closed"),
);
export const postActivityTypeResultValidator = v.union(
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
export const postActivityResultValidator = v.object({
  contractVersion: v.literal(2),
  id: v.string(),
  postId: v.string(),
  type: postActivityTypeResultValidator,
  occurredAt: v.number(),
  actor: v.optional(
    v.object({
      id: v.string(),
      displayName: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
    }),
  ),
  changedFields: v.optional(v.array(v.string())),
  fromStatus: v.optional(publicPostStatusKeyValidator),
  toStatus: v.optional(publicPostStatusKeyValidator),
  fromBoard: v.optional(v.object({ contractVersion: v.literal(1), name: v.string(), slug: v.string() })),
  toBoard: v.optional(v.object({ contractVersion: v.literal(1), name: v.string(), slug: v.string() })),
  tag: v.optional(v.object({ contractVersion: v.literal(1), name: v.string() })),
  changelog: v.optional(v.object({ contractVersion: v.literal(1), title: v.string(), slug: v.string() })),
});
export const postActivityPageResultValidator = v.object({
  contractVersion: v.literal(2),
  page: v.array(postActivityResultValidator),
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
export const listTagsIntentValidator = v.object({});
export const adminCapabilityIntentValidator = v.object({});
export const adminCapabilityResultValidator = v.boolean();
export const mergePostIntentValidator = v.object({
  sourcePostId: v.string(),
  canonicalPostId: v.string(),
});
export const createTagIntentValidator = v.object({ name: v.string() });
export const renameTagIntentValidator = v.object({
  tagId: v.string(),
  name: v.string(),
});
export const setPostTagIntentValidator = v.object({
  postId: v.string(),
  tagId: v.string(),
  desired: v.boolean(),
});
export const deleteTagIntentValidator = v.object({ tagId: v.string() });

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

export const listRoadmapGroupIntentValidator = v.object({
  status: v.union(
    v.literal("planned"),
    v.literal("in_progress"),
    v.literal("complete"),
  ),
  boardId: v.optional(v.string()),
  paginationOpts: v.optional(paginationOptsValidator),
});

export const listPublishedChangelogIntentValidator = v.object({
  paginationOpts: v.optional(paginationOptsValidator),
});

export const getPublishedChangelogBySlugIntentValidator = v.object({
  slug: v.string(),
});

export const createChangelogDraftIntentValidator = v.object({
  title: v.string(),
  body: v.string(),
  slug: v.optional(v.string()),
});

export const editChangelogIntentValidator = v.object({
  entryId: v.string(),
  title: v.optional(v.string()),
  body: v.optional(v.string()),
  slug: v.optional(v.string()),
});

export const setChangelogLinksIntentValidator = v.object({
  entryId: v.string(),
  postIds: v.array(v.string()),
});

export const publishChangelogIntentValidator = v.object({
  entryId: v.string(),
});
export const unpublishChangelogIntentValidator =
  publishChangelogIntentValidator;

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
  status: v.object({ key: v.literal("open"), label: v.literal("Open") }),
  voteCount: v.number(),
  commentCount: v.number(),
  totals: v.object({ votes: v.number(), comments: v.number() }),
  tags: v.array(v.string()),
  viewerHasVoted: v.boolean(),
  viewerCanEdit: v.boolean(),
  viewerCanWithdraw: v.boolean(),
});

export const publicAfferentErrorValidator = v.union(
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
  v.object({
    contractVersion: v.literal(1),
    code: v.union(
      v.literal("AUTHENTICATION_REQUIRED"),
      v.literal("VALIDATION"),
      v.literal("NOT_FOUND"),
      v.literal("DISCUSSION_LOCKED"),
      v.literal("NOT_AUTHORIZED"),
      v.literal("CONFLICT"),
      v.literal("TRANSIENT"),
      v.literal("UNKNOWN"),
    ),
    message: v.string(),
    field: v.optional(v.string()),
  }),
);

export const publicParticipationFailureValidator = v.object({
  ok: v.literal(false),
  error: publicAfferentErrorValidator,
});

export const publicPostActionResultValidator = v.union(
  publicPostDtoValidator,
  publicParticipationFailureValidator,
);

export const publicFeedbackPostDtoValidator = v.object({
  contractVersion: v.literal(3),
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
  tags: v.array(
    v.object({
      contractVersion: v.literal(1),
      id: v.string(),
      name: v.string(),
    }),
  ),
  viewerHasVoted: v.boolean(),
  viewerCanEdit: v.boolean(),
  viewerCanWithdraw: v.boolean(),
});

export const tagResultValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  name: v.string(),
});
export const tagListResultValidator = v.object({
  contractVersion: v.literal(1),
  tags: v.array(tagResultValidator),
});
export const tagDeleteResultValidator = v.object({
  contractVersion: v.literal(1),
  tagId: v.string(),
  status: v.union(v.literal("pending"), v.literal("deleted")),
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

export const publicCommentActionResultValidator = v.union(
  publicCommentDtoValidator,
  publicParticipationFailureValidator,
);

export const postSubscriptionResultValidator = v.object({
  contractVersion: v.literal(1),
  postId: v.string(),
  subscribed: v.boolean(),
  explicitOptOut: v.boolean(),
});
export const postSubscriptionActionResultValidator = v.union(
  postSubscriptionResultValidator,
  publicParticipationFailureValidator,
);

export const notificationEventTypeResultValidator = v.union(
  v.literal("status_changed"),
  v.literal("admin_replied"),
  v.literal("comment_replied"),
  v.literal("mentioned"),
  v.literal("changelog_published"),
);

export const deliveryEventResultValidator = v.object({
  contractVersion: v.literal(1),
  eventId: v.string(),
  type: notificationEventTypeResultValidator,
  entityId: v.string(),
  sequence: v.number(),
  occurredAt: v.number(),
  recipientKey: v.string(),
});
export const deliveryLeaseResultValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  event: deliveryEventResultValidator,
  leaseOwner: v.string(),
  leaseVersion: v.number(),
  leaseUntil: v.number(),
  attempts: v.number(),
});
export const deliveryBatchResultValidator = v.object({
  contractVersion: v.literal(1),
  leases: v.array(deliveryLeaseResultValidator),
});
export const deliveryOperationResultValidator = v.union(
  v.object({
    contractVersion: v.literal(1),
    ok: v.literal(true),
    status: v.literal("acked"),
  }),
  v.object({
    contractVersion: v.literal(1),
    ok: v.literal(true),
    status: v.literal("dead_letter"),
  }),
  v.object({
    contractVersion: v.literal(1),
    ok: v.literal(true),
    status: v.literal("pending"),
    availableAt: v.number(),
  }),
  v.object({
    contractVersion: v.literal(1),
    ok: v.literal(false),
    error: v.object({ code: v.literal("LEASE_LOST") }),
  }),
);

export const notificationTargetResultValidator = v.union(
  v.object({
    contractVersion: v.literal(1),
    kind: v.literal("post"),
    postId: v.string(),
    commentId: v.optional(v.string()),
    label: v.string(),
  }),
  v.object({
    contractVersion: v.literal(1),
    kind: v.literal("changelog"),
    slug: v.string(),
    label: v.string(),
  }),
);

export const notificationResultValidator = v.object({
  contractVersion: v.literal(2),
  id: v.string(),
  eventId: v.string(),
  type: notificationEventTypeResultValidator,
  target: notificationTargetResultValidator,
  occurredAt: v.number(),
  read: v.boolean(),
  initiator: v.object({
    id: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }),
});

export const notificationPageResultValidator = v.object({
  contractVersion: v.literal(2),
  page: v.array(notificationResultValidator),
  notifications: v.array(notificationResultValidator),
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

export const unreadNotificationCountResultValidator = v.object({
  contractVersion: v.literal(1),
  count: v.number(),
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
  contractVersion: v.literal(2),
  posts: v.array(publicPostDtoValidator),
});

export const postPageResultValidator = v.object({
  contractVersion: v.literal(2),
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
  contractVersion: v.literal(3),
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

export const postLookupResultValidator = v.union(
  v.object({
    contractVersion: v.literal(2),
    status: v.literal("post"),
    post: publicFeedbackPostDtoValidator,
  }),
  v.object({
    contractVersion: v.literal(2),
    status: v.literal("merged"),
    requestedPostId: v.string(),
    canonicalPostId: v.string(),
  }),
  v.object({ contractVersion: v.literal(2), status: v.literal("notFound") }),
);

export const mergePostResultValidator = v.object({
  contractVersion: v.literal(1),
  status: v.union(v.literal("pending"), v.literal("complete")),
  sourcePostId: v.string(),
  canonicalPostId: v.string(),
});

export const roadmapItemResultValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  boardId: v.string(),
  board: publicBoardDtoValidator,
  title: v.string(),
  status: v.object({
    key: v.union(
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("complete"),
    ),
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

export const roadmapGroupPageResultValidator = v.object({
  contractVersion: v.literal(1),
  page: v.array(roadmapItemResultValidator),
  items: v.array(roadmapItemResultValidator),
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

export const changelogLinkedPostResultValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  title: v.string(),
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

export const publicChangelogEntryResultValidator = v.object({
  contractVersion: v.literal(1),
  id: v.string(),
  title: v.string(),
  body: v.string(),
  slug: v.string(),
  firstPublishedAt: v.number(),
  updatedAt: v.number(),
  links: v.array(changelogLinkedPostResultValidator),
});

export const changelogPageResultValidator = v.object({
  contractVersion: v.literal(1),
  page: v.array(publicChangelogEntryResultValidator),
  entries: v.array(publicChangelogEntryResultValidator),
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

export const publishedChangelogLookupResultValidator = v.union(
  v.object({ contractVersion: v.literal(1), status: v.literal("notFound") }),
  v.object({
    contractVersion: v.literal(1),
    status: v.literal("entry"),
    entry: publicChangelogEntryResultValidator,
  }),
);

export const adminChangelogEntryResultValidator = v.object({
  contractVersion: v.literal(2),
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
  links: v.array(changelogLinkedPostResultValidator),
});

export const adminChangelogPageResultValidator = v.object({
  contractVersion: v.literal(1),
  page: v.array(adminChangelogEntryResultValidator),
  entries: v.array(adminChangelogEntryResultValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
  splitCursor: v.optional(v.union(v.string(), v.null())),
  pageStatus: v.optional(v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null())),
});

export const adminFeedbackPostResultValidator = v.object({
  contractVersion: v.literal(1),
  feedback: publicFeedbackPostDtoValidator,
  moderation: v.object({
    contractVersion: v.literal(1),
    discussionLocked: v.boolean(),
    archived: v.boolean(),
    disposition: v.union(v.literal("active"), v.literal("withdrawn"), v.literal("merged")),
    mergedIntoPostId: v.optional(v.string()),
  }),
});

export const adminFeedbackPageResultValidator = v.object({
  contractVersion: v.literal(1),
  page: v.array(adminFeedbackPostResultValidator),
  posts: v.array(adminFeedbackPostResultValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
  splitCursor: v.optional(v.union(v.string(), v.null())),
  pageStatus: v.optional(v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null())),
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
  listRoadmapGroup(
    ctx: Context,
    args: {
      status: RoadmapStatusKey;
      boardId?: BoardId;
      paginationOpts?: PaginationOptions;
    },
  ): Promise<RoadmapGroupPageDto>;
  listPublishedChangelog(
    ctx: Context,
    args: { paginationOpts?: PaginationOptions },
  ): Promise<ChangelogPageDto>;
  getPublishedChangelogBySlug(
    ctx: Context,
    args: { slug: string },
  ): Promise<PublishedChangelogLookupDto>;
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
  resolvePost(
    ctx: Context,
    args: { postId: PostId },
  ): Promise<PostLookupResult>;
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
  ): Promise<AfferentActionResult<PostDto>>;
  editPost(
    ctx: Context,
    args: { postId: PostId; title?: string; body?: string },
  ): Promise<AfferentActionResult<PostDto>>;
  withdrawPost(ctx: Context, args: { postId: PostId }): Promise<PostDto>;
  setVote(
    ctx: Context,
    args: { postId: PostId; desired: boolean },
  ): Promise<AfferentActionResult<PostDto>>;
  addComment(
    ctx: Context,
    args: { postId: PostId; body: string; parentCommentId?: CommentId },
  ): Promise<AfferentActionResult<CommentDto>>;
}

export interface NotificationCapabilities<
  QueryContext,
  MutationContext = QueryContext,
> {
  getPostSubscription(
    ctx: QueryContext,
    args: { postId: PostId },
  ): Promise<PostSubscriptionDto>;
  setPostSubscription(
    ctx: MutationContext,
    args: { postId: PostId; desired: boolean },
  ): Promise<AfferentActionResult<PostSubscriptionDto>>;
  listNotifications(
    ctx: QueryContext,
    args: { paginationOpts?: PaginationOptions },
  ): Promise<NotificationPageDto>;
  getUnreadCount(
    ctx: QueryContext,
    args: Record<string, never>,
  ): Promise<UnreadNotificationCountDto>;
  markNotificationRead(
    ctx: MutationContext,
    args: { notificationId: NotificationId },
  ): Promise<NotificationDto>;
}

export interface DeliveryCapabilities<Context> {
  claimDeliveryBatch(
    ctx: Context,
    args: { leaseOwner: string; limit?: number },
  ): Promise<DeliveryBatchDto>;
  ackDelivery(
    ctx: Context,
    args: {
      deliveryId: DeliveryId;
      leaseOwner: string;
      leaseVersion: number;
    },
  ): Promise<DeliveryOperationResult>;
  releaseDelivery(
    ctx: Context,
    args: {
      deliveryId: DeliveryId;
      leaseOwner: string;
      leaseVersion: number;
    },
  ): Promise<DeliveryOperationResult>;
}

export interface AdminCapabilities<
  QueryContext,
  MutationContext = QueryContext,
> {
  listAdminFeedback(
    ctx: QueryContext,
    args: { visibility: "visible" | "hidden"; paginationOpts?: PaginationOptions },
  ): Promise<AdminFeedbackPageDto>;
  getAdminPost(
    ctx: QueryContext,
    args: { postId: PostId },
  ): Promise<AdminFeedbackPostDto>;
  listAdminChangelog(
    ctx: QueryContext,
    args: { paginationOpts?: PaginationOptions },
  ): Promise<AdminChangelogPageDto>;
  configureInstallation(
    ctx: MutationContext,
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
    ctx: MutationContext,
    args: { actorId: ActorId },
  ): Promise<PostDto["author"]>;
  editPost(
    ctx: MutationContext,
    args: { postId: PostId; title?: string; body?: string },
  ): Promise<AdminFeedbackPostDto>;
  movePost(
    ctx: MutationContext,
    args: { postId: PostId; boardId: BoardId },
  ): Promise<AdminFeedbackPostDto>;
  setPostStatus(
    ctx: MutationContext,
    args: { postId: PostId; status: PostStatusKey },
  ): Promise<AdminFeedbackPostDto>;
  setDiscussionLock(
    ctx: MutationContext,
    args: { postId: PostId; locked: boolean },
  ): Promise<AdminFeedbackPostDto>;
  setArchived(
    ctx: MutationContext,
    args: { postId: PostId; archived: boolean },
  ): Promise<AdminFeedbackPostDto>;
  listPostActivity(
    ctx: QueryContext,
    args: { postId: PostId; paginationOpts?: PaginationOptions },
  ): Promise<PostActivityPageDto>;
  listTags(ctx: QueryContext, args: Record<string, never>): Promise<TagListDto>;
  createTag(ctx: MutationContext, args: { name: string }): Promise<TagDto>;
  renameTag(
    ctx: MutationContext,
    args: { tagId: TagId; name: string },
  ): Promise<TagDto>;
  setPostTag(
    ctx: MutationContext,
    args: { postId: PostId; tagId: TagId; desired: boolean },
  ): Promise<AdminFeedbackPostDto>;
  deleteTag(
    ctx: MutationContext,
    args: { tagId: TagId },
  ): Promise<TagDeleteResultDto>;
  mergePost(
    ctx: MutationContext,
    args: { sourcePostId: PostId; canonicalPostId: PostId },
  ): Promise<MergePostResult>;
  createChangelogDraft(
    ctx: MutationContext,
    args: { title: string; body: string; slug?: string },
  ): Promise<AdminChangelogEntryDto>;
  editChangelog(
    ctx: MutationContext,
    args: {
      entryId: ChangelogId;
      title?: string;
      body?: string;
      slug?: string;
    },
  ): Promise<AdminChangelogEntryDto>;
  setChangelogLinks(
    ctx: MutationContext,
    args: { entryId: ChangelogId; postIds: PostId[] },
  ): Promise<AdminChangelogEntryDto>;
  publishChangelog(
    ctx: MutationContext,
    args: { entryId: ChangelogId },
  ): Promise<AdminChangelogEntryDto>;
  unpublishChangelog(
    ctx: MutationContext,
    args: { entryId: ChangelogId },
  ): Promise<AdminChangelogEntryDto>;
}
