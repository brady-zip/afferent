import { v } from "convex/values";

import { mutation } from "../_generated/server.js";
import { upsertActor } from "../model/actors.js";
import { invalidInput } from "../model/errors.js";
import { requirePostInScope, requireScope } from "../model/scope.js";
import { findVoteMembership, projectVoteState } from "../model/votes.js";
import { toPostDto } from "../model/views.js";
import { postDtoValidator, verifiedActorValidator } from "../validators.js";
import { patchPostRanking } from "../model/scoring.js";

export const setVote = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    desired: v.boolean(),
  },
  returns: postDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const post = await requirePostInScope(ctx, args.scopeId, args.postId);
    if (post.lifecycleState !== "active") {
      invalidInput("withdrawn posts cannot be voted on");
    }

    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
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
