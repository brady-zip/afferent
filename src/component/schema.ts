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
    statusKey: v.literal("open"),
    voteCount: v.number(),
    commentCount: v.number(),
  }).index("by_scope_board_state", ["scopeId", "boardId", "lifecycleState"]),
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
