import type { Id } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { requirePostInScope, requireScope } from "./scope.js";

type DatabaseContext = Pick<QueryCtx | MutationCtx, "db">;

export function projectVoteState(
  hasMembership: boolean,
  desired: boolean,
  currentVoteCount: number,
) {
  const membershipChanged = hasMembership !== desired;
  if (!membershipChanged) {
    return { membershipChanged, voteCount: Math.max(0, currentVoteCount) };
  }
  return {
    membershipChanged,
    voteCount: desired
      ? Math.max(0, currentVoteCount) + 1
      : Math.max(0, currentVoteCount - 1),
  };
}

export async function findVoteMembership(
  ctx: DatabaseContext,
  keys: {
    scopeId: string;
    postId: Id<"posts">;
    actorId: Id<"actors">;
  },
) {
  requireScope(keys.scopeId);
  return await ctx.db
    .query("votes")
    .withIndex("by_scope_post_actor", (q) =>
      q
        .eq("scopeId", keys.scopeId)
        .eq("postId", keys.postId)
        .eq("actorId", keys.actorId),
    )
    .unique();
}

export async function reconcileVoteCount(
  ctx: MutationCtx,
  scopeId: string,
  postId: string | Id<"posts">,
) {
  const post = await requirePostInScope(ctx, scopeId, postId);
  const memberships = await ctx.db
    .query("votes")
    .withIndex("by_scope_post_actor", (q) =>
      q.eq("scopeId", scopeId).eq("postId", post._id),
    )
    .collect();
  if (post.voteCount !== memberships.length) {
    await ctx.db.patch(post._id, { voteCount: memberships.length });
  }
  return memberships.length;
}
