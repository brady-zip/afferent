import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  installations: defineTable({
    scopeId: v.string(),
    readPolicy: v.union(v.literal("public"), v.literal("authenticated")),
  }).index("by_scope", ["scopeId"]),
  boards: defineTable({
    scopeId: v.string(),
    slug: v.string(),
    name: v.string(),
    sortOrder: v.number(),
  })
    .index("by_scope_order", ["scopeId", "sortOrder"])
    .index("by_scope_slug", ["scopeId", "slug"]),
  actors: defineTable({
    scopeId: v.string(),
    externalKey: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }).index("by_scope_external_key", ["scopeId", "externalKey"]),
  posts: defineTable({
    scopeId: v.string(),
    boardId: v.id("boards"),
    actorId: v.id("actors"),
    title: v.string(),
    body: v.string(),
    searchText: v.optional(v.string()),
    lifecycleState: v.union(v.literal("active"), v.literal("withdrawn")),
    statusKey: v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("closed"),
    ),
    voteCount: v.number(),
    commentCount: v.number(),
    createdAt: v.optional(v.number()),
    currentStatusSince: v.optional(v.number()),
    discussionLocked: v.optional(v.boolean()),
    trendingScore: v.optional(v.number()),
    orderId: v.optional(v.string()),
    visibilityKey: v.optional(
      v.union(v.literal("visible"), v.literal("hidden")),
    ),
    archivedAt: v.optional(v.number()),
    mergedIntoPostId: v.optional(v.id("posts")),
    mergeJobId: v.optional(v.id("mergeJobs")),
  })
    .index("by_scope_board_state", ["scopeId", "boardId", "lifecycleState"])
    .index("by_scope_visibility_created", [
      "scopeId",
      "visibilityKey",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_visibility_top", [
      "scopeId",
      "visibilityKey",
      "voteCount",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_visibility_trending", [
      "scopeId",
      "visibilityKey",
      "trendingScore",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_board_visibility_created", [
      "scopeId",
      "boardId",
      "visibilityKey",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_board_visibility_top", [
      "scopeId",
      "boardId",
      "visibilityKey",
      "voteCount",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_board_visibility_trending", [
      "scopeId",
      "boardId",
      "visibilityKey",
      "trendingScore",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_status_visibility_created", [
      "scopeId",
      "statusKey",
      "visibilityKey",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_status_visibility_top", [
      "scopeId",
      "statusKey",
      "visibilityKey",
      "voteCount",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_status_visibility_trending", [
      "scopeId",
      "statusKey",
      "visibilityKey",
      "trendingScore",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_board_status_visibility_created", [
      "scopeId",
      "boardId",
      "statusKey",
      "visibilityKey",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_board_status_visibility_top", [
      "scopeId",
      "boardId",
      "statusKey",
      "visibilityKey",
      "voteCount",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_board_status_visibility_trending", [
      "scopeId",
      "boardId",
      "statusKey",
      "visibilityKey",
      "trendingScore",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_status_visibility_roadmap", [
      "scopeId",
      "statusKey",
      "visibilityKey",
      "currentStatusSince",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_board_status_visibility_roadmap", [
      "scopeId",
      "boardId",
      "statusKey",
      "visibilityKey",
      "currentStatusSince",
      "createdAt",
      "orderId",
    ])
    .searchIndex("search_posts", {
      searchField: "searchText",
      filterFields: ["scopeId", "visibilityKey", "boardId", "statusKey"],
    }),
  tags: defineTable({
    scopeId: v.string(),
    name: v.string(),
    normalizedName: v.string(),
    state: v.union(
      v.literal("active"),
      v.literal("deleting"),
      v.literal("deleted"),
    ),
  })
    .index("by_scope_name", ["scopeId", "normalizedName"])
    .index("by_scope_state_name", ["scopeId", "state", "normalizedName"]),
  postTags: defineTable({
    scopeId: v.string(),
    postId: v.id("posts"),
    tagId: v.id("tags"),
  })
    .index("by_scope_post_tag", ["scopeId", "postId", "tagId"])
    .index("by_scope_tag_post", ["scopeId", "tagId", "postId"]),
  postTagFeeds: defineTable({
    scopeId: v.string(),
    postId: v.id("posts"),
    tagId: v.id("tags"),
    boardId: v.id("boards"),
    statusKey: v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("closed"),
    ),
    visibilityKey: v.union(v.literal("visible"), v.literal("hidden")),
    createdAt: v.number(),
    voteCount: v.number(),
    trendingScore: v.number(),
    orderId: v.string(),
  })
    .index("by_scope_post", ["scopeId", "postId"])
    .index("by_scope_tag_post", ["scopeId", "tagId", "postId"])
    .index("by_scope_tag_visibility_created", [
      "scopeId",
      "tagId",
      "visibilityKey",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_tag_visibility_top", [
      "scopeId",
      "tagId",
      "visibilityKey",
      "voteCount",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_tag_visibility_trending", [
      "scopeId",
      "tagId",
      "visibilityKey",
      "trendingScore",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_tag_board_visibility_created", [
      "scopeId",
      "tagId",
      "boardId",
      "visibilityKey",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_tag_board_visibility_top", [
      "scopeId",
      "tagId",
      "boardId",
      "visibilityKey",
      "voteCount",
      "createdAt",
      "orderId",
    ])
    .index("by_scope_tag_board_visibility_trending", [
      "scopeId",
      "tagId",
      "boardId",
      "visibilityKey",
      "trendingScore",
      "createdAt",
      "orderId",
    ]),
  postTagSearches: defineTable({
    scopeId: v.string(),
    postId: v.id("posts"),
    tagId: v.id("tags"),
    boardId: v.id("boards"),
    statusKey: v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("closed"),
    ),
    visibilityKey: v.union(v.literal("visible"), v.literal("hidden")),
    searchText: v.string(),
  })
    .index("by_scope_post", ["scopeId", "postId"])
    .index("by_scope_post_tag", ["scopeId", "postId", "tagId"])
    .index("by_scope_tag_post", ["scopeId", "tagId", "postId"])
    .searchIndex("search_tagged_posts", {
      searchField: "searchText",
      filterFields: [
        "scopeId",
        "visibilityKey",
        "tagId",
        "boardId",
        "statusKey",
      ],
    }),
  votes: defineTable({
    scopeId: v.string(),
    postId: v.id("posts"),
    actorId: v.id("actors"),
  }).index("by_scope_post_actor", ["scopeId", "postId", "actorId"]),
  comments: defineTable({
    scopeId: v.string(),
    postId: v.id("posts"),
    actorId: v.id("actors"),
    body: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  }).index("by_scope_post", ["scopeId", "postId"]),
  postSubscriptions: defineTable({
    scopeId: v.string(),
    postId: v.id("posts"),
    actorId: v.id("actors"),
    state: v.union(v.literal("subscribed"), v.literal("opted_out")),
    updatedAt: v.number(),
  })
    .index("by_scope_post_actor", ["scopeId", "postId", "actorId"])
    .index("by_scope_post_state_actor", [
      "scopeId",
      "postId",
      "state",
      "actorId",
    ])
    .index("by_scope_actor_post", ["scopeId", "actorId", "postId"]),
  mergeHistories: defineTable({
    scopeId: v.string(),
    sourcePostId: v.id("posts"),
    canonicalPostId: v.id("posts"),
    actorId: v.id("actors"),
    sourceTitle: v.string(),
    sourceBody: v.string(),
    sourceBoardId: v.id("boards"),
    sourceActorId: v.id("actors"),
    sourceStatusKey: v.string(),
    mergedAt: v.number(),
  })
    .index("by_scope_source", ["scopeId", "sourcePostId"])
    .index("by_scope_canonical_time", [
      "scopeId",
      "canonicalPostId",
      "mergedAt",
    ]),
  mergeJobs: defineTable({
    scopeId: v.string(),
    sourcePostId: v.id("posts"),
    canonicalPostId: v.id("posts"),
    actorId: v.id("actors"),
    state: v.union(
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("cutover_done"),
      v.literal("cleaning"),
      v.literal("done"),
      v.literal("aborted"),
    ),
    phase: v.union(
      v.literal("votes"),
      v.literal("subscriptions"),
      v.literal("comments"),
      v.literal("activity"),
      v.literal("changelog_links"),
      v.literal("notification_guards"),
      v.literal("notifications"),
      v.literal("tags"),
      v.literal("cutover"),
      v.literal("cleanup"),
    ),
    phaseSide: v.union(v.literal("source"), v.literal("canonical")),
    phaseCursor: v.optional(v.number()),
    generation: v.number(),
    continuationScheduled: v.boolean(),
    createdAt: v.number(),
    voteCount: v.number(),
    commentCount: v.number(),
    cutoverAt: v.optional(v.number()),
    abortedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_scope_source", ["scopeId", "sourcePostId"])
    .index("by_scope_canonical", ["scopeId", "canonicalPostId"])
    .index("by_scope_state_created", ["scopeId", "state", "createdAt"]),
  mergeStages: defineTable({
    scopeId: v.string(),
    mergeJobId: v.id("mergeJobs"),
    sourcePostId: v.id("posts"),
    canonicalPostId: v.id("posts"),
    kind: v.union(
      v.literal("vote"),
      v.literal("subscription"),
      v.literal("comment"),
      v.literal("activity"),
      v.literal("changelog_link"),
      v.literal("notification_guard"),
      v.literal("notification"),
      v.literal("tag"),
    ),
    originalId: v.string(),
    logicalKey: v.string(),
    sourceSide: v.boolean(),
    generation: v.number(),
  })
    .index("by_scope_job_kind_key", [
      "scopeId",
      "mergeJobId",
      "kind",
      "logicalKey",
    ])
    .index("by_scope_job_kind_original", [
      "scopeId",
      "mergeJobId",
      "kind",
      "originalId",
    ])
    .index("by_scope_job_original", [
      "scopeId",
      "mergeJobId",
      "originalId",
    ]),
  mergeDeltas: defineTable({
    scopeId: v.string(),
    mergeJobId: v.id("mergeJobs"),
    kind: v.union(
      v.literal("vote"),
      v.literal("subscription"),
      v.literal("comment"),
      v.literal("activity"),
      v.literal("changelog_link"),
      v.literal("notification_guard"),
      v.literal("notification"),
      v.literal("tag"),
    ),
    originalId: v.string(),
    logicalKey: v.string(),
    generation: v.number(),
  })
    .index("by_scope_job", ["scopeId", "mergeJobId"])
    .index("by_scope_job_original", [
      "scopeId",
      "mergeJobId",
      "originalId",
    ]),
  notificationEvents: defineTable({
    scopeId: v.string(),
    type: v.union(
      v.literal("status_changed"),
      v.literal("admin_replied"),
      v.literal("comment_replied"),
      v.literal("mentioned"),
      v.literal("changelog_published"),
    ),
    initiatorActorId: v.id("actors"),
    postId: v.optional(v.id("posts")),
    entityId: v.string(),
    occurredAt: v.number(),
    guardKey: v.string(),
  })
    .index("by_scope_guard", ["scopeId", "guardKey"])
    .index("by_scope_post_time", ["scopeId", "postId", "occurredAt"]),
  notificationEventRecipients: defineTable({
    scopeId: v.string(),
    eventId: v.id("notificationEvents"),
    actorId: v.id("actors"),
    state: v.union(v.literal("pending"), v.literal("materialized")),
  })
    .index("by_scope_event_actor", ["scopeId", "eventId", "actorId"])
    .index("by_scope_event_state_actor", [
      "scopeId",
      "eventId",
      "state",
      "actorId",
    ]),
  notificationDeliveries: defineTable({
    scopeId: v.string(),
    eventId: v.id("notificationEvents"),
    actorId: v.id("actors"),
    type: v.union(
      v.literal("status_changed"),
      v.literal("admin_replied"),
      v.literal("comment_replied"),
      v.literal("mentioned"),
      v.literal("changelog_published"),
    ),
    entityId: v.string(),
    occurredAt: v.number(),
    sequence: v.number(),
    state: v.union(
      v.literal("pending"),
      v.literal("leased"),
      v.literal("acked"),
      v.literal("dead_letter"),
    ),
    availableAt: v.number(),
    attempts: v.number(),
    leaseOwner: v.optional(v.string()),
    leaseUntil: v.optional(v.number()),
    leaseVersion: v.number(),
    ackedAt: v.optional(v.number()),
    deadLetterAt: v.optional(v.number()),
  })
    .index("by_scope_event_actor", ["scopeId", "eventId", "actorId"])
    .index("by_scope_state_available", ["scopeId", "state", "availableAt"])
    .index("by_scope_state_lease", ["scopeId", "state", "leaseUntil"])
    .index("by_scope_state_acked", ["scopeId", "state", "ackedAt"]),
  notificationFanoutJobs: defineTable({
    scopeId: v.string(),
    eventId: v.id("notificationEvents"),
    state: v.union(v.literal("pending"), v.literal("complete")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_scope_event", ["scopeId", "eventId"])
    .index("by_scope_state_created", ["scopeId", "state", "createdAt"]),
  notificationInbox: defineTable({
    scopeId: v.string(),
    actorId: v.id("actors"),
    eventId: v.id("notificationEvents"),
    type: v.union(
      v.literal("status_changed"),
      v.literal("admin_replied"),
      v.literal("comment_replied"),
      v.literal("mentioned"),
      v.literal("changelog_published"),
    ),
    entityId: v.string(),
    occurredAt: v.number(),
    orderId: v.string(),
    unreadKey: v.union(v.literal("unread"), v.literal("read")),
    readAt: v.optional(v.number()),
  })
    .index("by_scope_actor_time", [
      "scopeId",
      "actorId",
      "occurredAt",
      "orderId",
    ])
    .index("by_scope_event_actor", ["scopeId", "eventId", "actorId"])
    .index("by_scope_actor_unread", [
      "scopeId",
      "actorId",
      "unreadKey",
    ]),
  notificationUnreadCounts: defineTable({
    scopeId: v.string(),
    actorId: v.id("actors"),
    count: v.number(),
  }).index("by_scope_actor", ["scopeId", "actorId"]),
  postActivity: defineTable({
    scopeId: v.string(),
    postId: v.id("posts"),
    actorId: v.optional(v.id("actors")),
    type: v.union(
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
    ),
    occurredAt: v.number(),
    changedFields: v.optional(v.array(v.string())),
    fromStatus: v.optional(v.string()),
    toStatus: v.optional(v.string()),
    fromBoardId: v.optional(v.id("boards")),
    toBoardId: v.optional(v.id("boards")),
    tagId: v.optional(v.id("tags")),
    changelogEntryId: v.optional(v.id("changelogEntries")),
  }).index("by_scope_post_occurred", ["scopeId", "postId", "occurredAt"]),
  changelogEntries: defineTable({
    scopeId: v.string(),
    title: v.string(),
    body: v.string(),
    slug: v.string(),
    publishedKey: v.union(v.literal("published"), v.literal("hidden")),
    createdAt: v.number(),
    updatedAt: v.number(),
    firstPublishedAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    orderId: v.string(),
  })
    .index("by_scope_slug", ["scopeId", "slug"])
    .index("by_scope_published_first", [
      "scopeId",
      "publishedKey",
      "firstPublishedAt",
      "orderId",
    ]),
  changelogPostLinks: defineTable({
    scopeId: v.string(),
    entryId: v.id("changelogEntries"),
    postId: v.id("posts"),
    sortOrder: v.number(),
  })
    .index("by_scope_entry_order", ["scopeId", "entryId", "sortOrder"])
    .index("by_scope_entry_post", ["scopeId", "entryId", "postId"])
    .index("by_scope_post_entry", ["scopeId", "postId", "entryId"]),
  changelogNotificationGuards: defineTable({
    scopeId: v.string(),
    entryId: v.id("changelogEntries"),
    postId: v.id("posts"),
    createdAt: v.number(),
  })
    .index("by_scope_entry_post", ["scopeId", "entryId", "postId"])
    .index("by_scope_post_entry", ["scopeId", "postId", "entryId"]),
  tagCleanupJobs: defineTable({
    scopeId: v.string(),
    tagId: v.id("tags"),
    actorId: v.id("actors"),
    state: v.union(v.literal("pending"), v.literal("complete")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_scope_tag", ["scopeId", "tagId"])
    .index("by_scope_state_created", ["scopeId", "state", "createdAt"]),
});
