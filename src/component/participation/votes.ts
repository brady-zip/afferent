import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server.js";
import { upsertActor } from "../model/actors.js";
import { expectedFailure, invalidInput } from "../model/errors.js";
import { requirePostInScope, requireScope } from "../model/scope.js";
import { findVoteMembership, projectVoteState } from "../model/votes.js";
import { toPostDto } from "../model/views.js";
import {
  postMutationResultValidator,
  verifiedActorValidator,
} from "../validators.js";
import { patchPostRanking } from "../model/scoring.js";
import { consumeParticipationLimit } from "../model/rateLimits.js";

export const setVote = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    desired: v.boolean(),
  },
  returns: postMutationResultValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const limited = await consumeParticipationLimit(ctx, {
      operation: "vote",
      actorKey: String(actorId),
      scopeId: args.scopeId,
    });
    if (limited) return limited;
    let post;
    try {
      post = await requirePostInScope(ctx, args.scopeId, args.postId);
      if (post.lifecycleState !== "active" || post.archivedAt !== undefined) {
        invalidInput("hidden posts cannot be voted on");
      }
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { code?: string; message?: string };
        return expectedFailure(
          data.code === "NOT_FOUND" ? "NOT_FOUND" : "VALIDATION",
          data.message ?? "Vote failed",
        );
      }
      throw error;
    }

    const membership = await findVoteMembership(ctx, {
      scopeId: args.scopeId,
      postId: post._id,
      actorId,
    });
    const projection = projectVoteState(
      membership !== null,
      args.desired,
      post.voteCount,
    );
    if (!projection.membershipChanged) return await toPostDto(ctx, post);

    if (args.desired) {
      await ctx.db.insert("votes", {
        scopeId: args.scopeId,
        postId: post._id,
        actorId,
      });
    } else if (membership) {
      await ctx.db.delete(membership._id);
    }
    const updated = await patchPostRanking(ctx, post, {
      voteCount: projection.voteCount,
    });
    return await toPostDto(ctx, updated);
  },
});
