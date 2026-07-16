import { v } from "convex/values";

import { mutation } from "../_generated/server.js";
import { upsertActor } from "../model/actors.js";
import {
  normalizeCommentBody,
  requireRootParent,
  toCommentDto,
} from "../model/comments.js";
import { invalidInput } from "../model/errors.js";
import { requirePostInScope, requireScope } from "../model/scope.js";
import { commentDtoValidator, verifiedActorValidator } from "../validators.js";
import { patchPostRanking } from "../model/scoring.js";

export const addComment = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    body: v.string(),
    parentCommentId: v.optional(v.string()),
  },
  returns: commentDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const post = await requirePostInScope(ctx, args.scopeId, args.postId);
    if (post.lifecycleState !== "active") {
      invalidInput("withdrawn posts cannot be commented on");
    }
    const body = normalizeCommentBody(args.body);
    const parent =
      args.parentCommentId === undefined
        ? undefined
        : await requireRootParent(ctx, {
            scopeId: args.scopeId,
            postId: post._id,
            parentCommentId: args.parentCommentId,
          });
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
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
