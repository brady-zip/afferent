import { v } from "convex/values";

import { internal } from "../_generated/api.js";
import { mutation, query } from "../_generated/server.js";
import { appendPostActivity } from "../model/activity.js";
import { upsertActor } from "../model/actors.js";
import { invalidInput } from "../model/errors.js";
import { requirePostInScope, requireScope } from "../model/scope.js";
import {
  findPostTag,
  MAX_TAGS_PER_SCOPE,
  normalizeTagName,
  requireAnyTagInScope,
  requireTagCapacity,
  requireTagInScope,
  tagFeedProjection,
  tagSearchProjection,
  toTagDto,
} from "../model/tags.js";
import { toFeedbackPostDto } from "../model/views.js";
import {
  feedbackPostDtoValidator,
  tagDeleteResultValidator,
  tagDtoValidator,
  tagListDtoValidator,
  verifiedActorValidator,
} from "../validators.js";
import { TAG_CLEANUP_BATCH_SIZE } from "../jobs/tag_cleanup.js";

export const listTags = query({
  args: { scopeId: v.string() },
  returns: tagListDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_scope_state_name", (index) =>
        index.eq("scopeId", args.scopeId).eq("state", "active"),
      )
      .take(MAX_TAGS_PER_SCOPE + 1);
    if (tags.length > MAX_TAGS_PER_SCOPE) {
      throw new Error("TAG_SCOPE_LIMIT_INVARIANT");
    }
    return { contractVersion: 1 as const, tags: tags.map(toTagDto) };
  },
});

export const createTag = mutation({
  args: { scopeId: v.string(), name: v.string() },
  returns: tagDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const normalized = normalizeTagName(args.name);
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_scope_name", (index) =>
        index
          .eq("scopeId", args.scopeId)
          .eq("normalizedName", normalized.normalizedName),
      )
      .unique();
    if (existing?.state === "deleted") {
      await ctx.db.patch(existing._id, { ...normalized, state: "active" });
      return toTagDto({ ...existing, ...normalized, state: "active" });
    }
    if (existing) invalidInput("tag name already exists");
    const active = await ctx.db
      .query("tags")
      .withIndex("by_scope_state_name", (index) =>
        index.eq("scopeId", args.scopeId).eq("state", "active"),
      )
      .take(MAX_TAGS_PER_SCOPE);
    if (active.length >= MAX_TAGS_PER_SCOPE) {
      invalidInput(`installations may have at most ${MAX_TAGS_PER_SCOPE} tags`);
    }
    const tagId = await ctx.db.insert("tags", {
      scopeId: args.scopeId,
      ...normalized,
      state: "active",
    });
    const tag = await ctx.db.get(tagId);
    if (!tag) throw new Error("TAG_CREATE_INVARIANT");
    return toTagDto(tag);
  },
});

export const renameTag = mutation({
  args: { scopeId: v.string(), tagId: v.string(), name: v.string() },
  returns: tagDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const tag = await requireTagInScope(ctx, args.scopeId, args.tagId);
    const normalized = normalizeTagName(args.name);
    if (normalized.normalizedName !== tag.normalizedName) {
      const collision = await ctx.db
        .query("tags")
        .withIndex("by_scope_name", (index) =>
          index
            .eq("scopeId", args.scopeId)
            .eq("normalizedName", normalized.normalizedName),
        )
        .unique();
      if (collision && collision.state !== "deleted") {
        invalidInput("tag name already exists");
      }
      if (collision?.state === "deleted") {
        invalidInput("tag name is reserved by deleted tag history");
      }
    }
    if (tag.name !== normalized.name) await ctx.db.patch(tag._id, normalized);
    return toTagDto({ ...tag, ...normalized });
  },
});

export const setPostTag = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    tagId: v.string(),
    desired: v.boolean(),
  },
  returns: feedbackPostDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const [post, tag] = await Promise.all([
      requirePostInScope(ctx, args.scopeId, args.postId),
      requireTagInScope(ctx, args.scopeId, args.tagId),
    ]);
    const membership = await findPostTag(ctx, {
      scopeId: args.scopeId,
      postId: post._id,
      tagId: tag._id,
    });
    if ((membership !== null) === args.desired) {
      return await toFeedbackPostDto(ctx, post);
    }
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    if (args.desired) {
      await requireTagCapacity(ctx, args.scopeId, post._id);
      await ctx.db.insert("postTags", {
        scopeId: args.scopeId,
        postId: post._id,
        tagId: tag._id,
      });
      await ctx.db.insert("postTagFeeds", tagFeedProjection(post, tag._id));
      await ctx.db.insert(
        "postTagSearches",
        tagSearchProjection(post, tag._id),
      );
    } else {
      await ctx.db.delete(membership!._id);
      const [feed, search] = await Promise.all([
        ctx.db
          .query("postTagFeeds")
          .withIndex("by_scope_tag_post", (index) =>
            index
              .eq("scopeId", args.scopeId)
              .eq("tagId", tag._id)
              .eq("postId", post._id),
          )
          .unique(),
        ctx.db
          .query("postTagSearches")
          .withIndex("by_scope_post_tag", (index) =>
            index
              .eq("scopeId", args.scopeId)
              .eq("postId", post._id)
              .eq("tagId", tag._id),
          )
          .unique(),
      ]);
      if (feed) await ctx.db.delete(feed._id);
      if (search) await ctx.db.delete(search._id);
    }
    await appendPostActivity(ctx, {
      scopeId: args.scopeId,
      postId: post._id,
      actorId,
      type: args.desired ? "tag_add" : "tag_remove",
      tagId: tag._id,
    });
    return await toFeedbackPostDto(ctx, post);
  },
});

export const deleteTag = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    tagId: v.string(),
  },
  returns: tagDeleteResultValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const tag = await requireAnyTagInScope(ctx, args.scopeId, args.tagId);
    if (tag.state === "deleted") {
      return {
        contractVersion: 1 as const,
        tagId: String(tag._id),
        status: "deleted" as const,
      };
    }
    if (tag.state === "deleting") {
      return {
        contractVersion: 1 as const,
        tagId: String(tag._id),
        status: "pending" as const,
      };
    }
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const [memberships, feeds, searches] = await Promise.all([
      ctx.db
        .query("postTags")
        .withIndex("by_scope_tag_post", (index) =>
          index.eq("scopeId", args.scopeId).eq("tagId", tag._id),
        )
        .take(TAG_CLEANUP_BATCH_SIZE + 1),
      ctx.db
        .query("postTagFeeds")
        .withIndex("by_scope_tag_post", (index) =>
          index.eq("scopeId", args.scopeId).eq("tagId", tag._id),
        )
        .take(TAG_CLEANUP_BATCH_SIZE + 1),
      ctx.db
        .query("postTagSearches")
        .withIndex("by_scope_tag_post", (index) =>
          index.eq("scopeId", args.scopeId).eq("tagId", tag._id),
        )
        .take(TAG_CLEANUP_BATCH_SIZE + 1),
    ]);
    if (
      memberships.length <= TAG_CLEANUP_BATCH_SIZE &&
      feeds.length <= TAG_CLEANUP_BATCH_SIZE &&
      searches.length <= TAG_CLEANUP_BATCH_SIZE
    ) {
      for (const membership of memberships) {
        await appendPostActivity(ctx, {
          scopeId: args.scopeId,
          postId: membership.postId,
          actorId,
          type: "tag_remove",
          tagId: tag._id,
        });
        await ctx.db.delete(membership._id);
      }
      await Promise.all([
        ...feeds.map((row) => ctx.db.delete(row._id)),
        ...searches.map((row) => ctx.db.delete(row._id)),
      ]);
      await ctx.db.patch(tag._id, { state: "deleted" });
      return {
        contractVersion: 1 as const,
        tagId: String(tag._id),
        status: "deleted" as const,
      };
    }

    await ctx.db.patch(tag._id, { state: "deleting" });
    const jobId = await ctx.db.insert("tagCleanupJobs", {
      scopeId: args.scopeId,
      tagId: tag._id,
      actorId,
      state: "pending",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.jobs.tag_cleanup.continueTagCleanup,
      { jobId: String(jobId) },
    );
    return {
      contractVersion: 1 as const,
      tagId: String(tag._id),
      status: "pending" as const,
    };
  },
});
