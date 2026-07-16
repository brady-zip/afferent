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
    trendingScore: v.optional(v.number()),
    orderId: v.optional(v.string()),
    visibilityKey: v.optional(
      v.union(v.literal("visible"), v.literal("hidden")),
    ),
    archivedAt: v.optional(v.number()),
    mergedIntoPostId: v.optional(v.id("posts")),
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
    ]),
  tags: defineTable({
    scopeId: v.string(),
    name: v.string(),
  }).index("by_scope_name", ["scopeId", "name"]),
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
});
