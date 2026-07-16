import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server.js";
import { upsertActor } from "../model/actors.js";
import { requireRootParent, toCommentDto } from "../model/comments.js";
import { validateSafeMarkdown } from "../model/content.js";
import { invalidInput } from "../model/errors.js";
import { expectedFailure } from "../model/errors.js";
import { consumeParticipationLimit } from "../model/rateLimits.js";
import { requirePostInScope, requireScope } from "../model/scope.js";
import {
  commentMutationResultValidator,
  verifiedActorValidator,
} from "../validators.js";
import { patchPostRanking } from "../model/scoring.js";

export const addComment = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    body: v.string(),
    parentCommentId: v.optional(v.string()),
    isAdmin: v.boolean(),
  },
  returns: commentMutationResultValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const limited = await consumeParticipationLimit(ctx, {
      operation: "comment",
      actorKey: String(actorId),
      scopeId: args.scopeId,
    });
    if (limited) return limited;
    let post;
    try {
      post = await requirePostInScope(ctx, args.scopeId, args.postId);
      if (post.lifecycleState !== "active" || post.archivedAt !== undefined) {
        invalidInput("hidden posts cannot be commented on");
      }
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { code?: string; message?: string };
        return expectedFailure(
          data.code === "NOT_FOUND" ? "NOT_FOUND" : "VALIDATION",
          data.message ?? "Comment failed",
        );
      }
      throw error;
    }
    if ((post.discussionLocked ?? false) && !args.isAdmin) {
      return expectedFailure("DISCUSSION_LOCKED", "Discussion is locked");
    }
    let body: string;
    let parent;
    try {
      body = validateSafeMarkdown(args.body, "comment");
      parent =
        args.parentCommentId === undefined
          ? undefined
          : await requireRootParent(ctx, {
              scopeId: args.scopeId,
              postId: post._id,
              parentCommentId: args.parentCommentId,
            });
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { code?: string; message?: string };
        return expectedFailure(
          data.code === "NOT_FOUND" ? "NOT_FOUND" : "VALIDATION",
          data.message ?? "Comment failed",
        );
      }
      throw error;
    }
    const commentId = await ctx.db.insert("comments", {
      scopeId: args.scopeId,
      postId: post._id,
      actorId,
      body,
      ...(parent === undefined ? {} : { parentCommentId: parent._id }),
    });
    await patchPostRanking(ctx, post, {
      commentCount: post.commentCount + 1,
    });
    const comment = await ctx.db.get(commentId);
    if (!comment) throw new Error("COMMENT_INSERT_INVARIANT");
    return await toCommentDto(ctx, comment);
  },
});
