import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server.js";
import { expectedFailure, invalidInput, notOwner } from "../model/errors.js";
import { upsertActor } from "../model/actors.js";
import { appendPostActivity } from "../model/activity.js";
import { consumeParticipationLimit } from "../model/rateLimits.js";
import {
  requireBoardInScope,
  requirePostInScope,
  requireScope,
} from "../model/scope.js";
import { toPostDto } from "../model/views.js";
import { computeTrendingScore, patchPostRanking } from "../model/scoring.js";
import {
  HIDDEN_POST_VISIBILITY,
  PUBLIC_POST_VISIBILITY,
} from "../model/visibility.js";
import {
  postDtoValidator,
  postMutationResultValidator,
  verifiedActorValidator,
} from "../validators.js";
import { normalizePlainText, validateSafeMarkdown } from "../model/content.js";

function postSearchText(title: string, body: string) {
  return `${title}\n${body}`;
}

export const createPost = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    boardId: v.string(),
    title: v.string(),
    body: v.string(),
  },
  returns: postMutationResultValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const limited = await consumeParticipationLimit(ctx, {
      operation: "create_post",
      actorKey: String(actorId),
      scopeId: args.scopeId,
    });
    if (limited) return limited;
    let title: string;
    let body: string;
    let board;
    try {
      title = normalizePlainText(args.title, "title");
      body = validateSafeMarkdown(args.body, "body");
      board = await requireBoardInScope(ctx, args.scopeId, args.boardId);
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { code?: string; message?: string };
        return expectedFailure(
          data.code === "NOT_FOUND" ? "NOT_FOUND" : "VALIDATION",
          data.message ?? "Post creation failed",
        );
      }
      throw error;
    }
    const createdAt = Date.now();
    const postId = await ctx.db.insert("posts", {
      scopeId: args.scopeId,
      boardId: board._id,
      actorId,
      title,
      body,
      searchText: postSearchText(title, body),
      lifecycleState: "active",
      statusKey: "open",
      voteCount: 0,
      commentCount: 0,
      createdAt,
      currentStatusSince: createdAt,
      trendingScore: computeTrendingScore(createdAt, 0, 0),
      visibilityKey: PUBLIC_POST_VISIBILITY,
    });
    await ctx.db.patch(postId, { orderId: String(postId) });
    const post = await ctx.db.get(postId);
    if (!post) throw new ConvexError({ code: "INVARIANT_VIOLATION" });
    await appendPostActivity(ctx, {
      scopeId: args.scopeId,
      postId,
      actorId,
      type: "create",
    });
    return await toPostDto(ctx, post);
  },
});

export const editPost = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  returns: postMutationResultValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const limited = await consumeParticipationLimit(ctx, {
      operation: "edit_post",
      actorKey: String(actorId),
      scopeId: args.scopeId,
    });
    if (limited) return limited;
    if (args.title === undefined && args.body === undefined) {
      invalidInput("at least one editable field is required");
    }
    let post;
    try {
      post = await requirePostInScope(ctx, args.scopeId, args.postId);
      if (post.actorId !== actorId) notOwner();
      if (post.lifecycleState !== "active" || post.archivedAt !== undefined) {
        invalidInput("hidden posts cannot be edited");
      }
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { code?: string; message?: string };
        let code: "NOT_AUTHORIZED" | "NOT_FOUND" | "VALIDATION" = "VALIDATION";
        if (data.code === "NOT_OWNER") code = "NOT_AUTHORIZED";
        if (data.code === "NOT_FOUND") code = "NOT_FOUND";
        return expectedFailure(code, data.message ?? "Post edit failed");
      }
      throw error;
    }
    const title =
      args.title === undefined
        ? post.title
        : normalizePlainText(args.title, "title");
    const body =
      args.body === undefined
        ? post.body
        : validateSafeMarkdown(args.body, "body");
    const patch = {
      ...(args.title === undefined ? {} : { title }),
      ...(args.body === undefined ? {} : { body }),
      searchText: postSearchText(title, body),
    };
    await ctx.db.patch(post._id, patch);
    const projections = await ctx.db
      .query("postTagSearches")
      .withIndex("by_scope_post", (query) =>
        query.eq("scopeId", args.scopeId).eq("postId", post._id),
      )
      .take(21);
    if (projections.length > 20) invalidInput("posts may have at most 20 tags");
    await Promise.all(
      projections.map((projection) =>
        ctx.db.patch(projection._id, { searchText: patch.searchText }),
      ),
    );
    await appendPostActivity(ctx, {
      scopeId: args.scopeId,
      postId: post._id,
      actorId,
      type: "edit",
      changedFields: [
        ...(args.title === undefined ? [] : ["title"]),
        ...(args.body === undefined ? [] : ["body"]),
      ],
    });
    return await toPostDto(ctx, { ...post, ...patch });
  },
});

export const withdrawPost = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
  },
  returns: postDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const post = await requirePostInScope(ctx, args.scopeId, args.postId);
    if (post.actorId !== actorId) notOwner();
    if (post.lifecycleState !== "withdrawn") {
      await patchPostRanking(ctx, post, {
        lifecycleState: "withdrawn",
        visibilityKey: HIDDEN_POST_VISIBILITY,
      });
    }
    return await toPostDto(ctx, {
      ...post,
      lifecycleState: "withdrawn",
      visibilityKey: HIDDEN_POST_VISIBILITY,
    });
  },
});
