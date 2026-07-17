import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server.js";
import { upsertActor } from "../model/actors.js";
import { requireRootParent, toCommentDto } from "../model/comments.js";
import { validateSafeMarkdown } from "../model/content.js";
import { invalidInput } from "../model/errors.js";
import { expectedFailure } from "../model/errors.js";
import { consumeParticipationLimit } from "../model/rateLimits.js";
import { requireScope } from "../model/scope.js";
import {
  commentMutationResultValidator,
  verifiedActorValidator,
} from "../validators.js";
import { patchPostRanking } from "../model/scoring.js";
import { resolveDeliverableMentionActorIds } from "../model/mentions.js";
import {
  captureNotificationEvent,
  listCurrentSubscriberActorIds,
} from "../notifications/events.js";
import { ensureAutoSubscription } from "./subscriptions.js";
import {
  fenceActiveMergeWrite,
  mergeReadPostIds,
  resolveMergeWritePost,
} from "../model/merge.js";

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
      post = await resolveMergeWritePost(ctx, args.scopeId, args.postId);
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
      const equivalentPostIds = await mergeReadPostIds(
        ctx,
        args.scopeId,
        post._id,
      );
      parent =
        args.parentCommentId === undefined
          ? undefined
          : await requireRootParent(ctx, {
              scopeId: args.scopeId,
              postId: post._id,
              equivalentPostIds,
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
    await fenceActiveMergeWrite(ctx, {
      scopeId: args.scopeId,
      postId: post._id,
      writes: [
        {
          kind: "comment",
          originalId: String(commentId),
          logicalKey: String(commentId),
        },
      ],
    });
    await patchPostRanking(ctx, post, {
      commentCount: post.commentCount + 1,
    });
    await ensureAutoSubscription(ctx, {
      scopeId: args.scopeId,
      postId: post._id,
      actorId,
    });
    const mentionActorIds = await resolveDeliverableMentionActorIds(
      ctx,
      args.scopeId,
      body,
    );
    if (args.isAdmin) {
      const subscriberActorIds = await listCurrentSubscriberActorIds(
        ctx,
        args.scopeId,
        post._id,
      );
      await captureNotificationEvent(ctx, {
        scopeId: args.scopeId,
        type: "admin_replied",
        initiatorActorId: actorId,
        postId: post._id,
        entityId: String(commentId),
        guardKey: `comment:${commentId}:admin`,
        subscriberActorIds,
        ...(parent === undefined ? {} : { replyActorId: parent.actorId }),
        mentionActorIds,
      });
    } else if (parent !== undefined) {
      await captureNotificationEvent(ctx, {
        scopeId: args.scopeId,
        type: "comment_replied",
        initiatorActorId: actorId,
        postId: post._id,
        entityId: String(commentId),
        guardKey: `comment:${commentId}:reply`,
        replyActorId: parent.actorId,
        mentionActorIds,
      });
    } else if (mentionActorIds.length > 0) {
      await captureNotificationEvent(ctx, {
        scopeId: args.scopeId,
        type: "mentioned",
        initiatorActorId: actorId,
        postId: post._id,
        entityId: String(commentId),
        guardKey: `comment:${commentId}:mention`,
        mentionActorIds,
      });
    }
    const comment = await ctx.db.get(commentId);
    if (!comment) throw new Error("COMMENT_INSERT_INVARIANT");
    return await toCommentDto(ctx, comment);
  },
});
