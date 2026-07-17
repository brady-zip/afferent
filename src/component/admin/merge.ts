import { v } from "convex/values";

import { internal } from "../_generated/api.js";
import { mutation } from "../_generated/server.js";
import { upsertActor } from "../model/actors.js";
import {
  assertMergeIntent,
  countMergeRelations,
  finalizeMerge,
  needsContinuation,
  processMergePhase,
  requireLiveMergePost,
} from "../model/merge.js";
import { conflict } from "../model/errors.js";
import { mergePostResultValidator, verifiedActorValidator } from "../validators.js";

export const mergePost = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    sourcePostId: v.string(),
    canonicalPostId: v.string(),
  },
  returns: mergePostResultValidator,
  handler: async (ctx, args) => {
    const [source, canonical] = await Promise.all([
      requireLiveMergePost(ctx, args.scopeId, args.sourcePostId),
      requireLiveMergePost(ctx, args.scopeId, args.canonicalPostId),
    ]);
    await assertMergeIntent(source, canonical);
    const existing = await ctx.db.query("mergeJobs").withIndex("by_scope_source", (q) => q.eq("scopeId", args.scopeId).eq("sourcePostId", source._id)).unique();
    if (existing) {
      if (existing.canonicalPostId !== canonical._id) conflict("canonicalPostId", "source already has a different merge target");
      return {
        contractVersion: 1 as const,
        status: existing.state,
        sourcePostId: String(source._id),
        canonicalPostId: String(canonical._id),
      };
    }
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const relations = await countMergeRelations(ctx, args.scopeId, source._id);
    const jobId = await ctx.db.insert("mergeJobs", {
      scopeId: args.scopeId,
      sourcePostId: source._id,
      canonicalPostId: canonical._id,
      actorId,
      state: "pending",
      phase: "votes",
      createdAt: Date.now(),
      voteCount: canonical.voteCount,
      commentCount: canonical.commentCount,
    });
    let job = (await ctx.db.get(jobId))!;
    if (needsContinuation(relations)) {
      await ctx.scheduler.runAfter(0, internal.jobs.merge.continueMerge, { jobId: String(jobId) });
      return { contractVersion: 1 as const, status: "pending" as const, sourcePostId: String(source._id), canonicalPostId: String(canonical._id) };
    }
    const phases = ["votes", "subscriptions", "comments", "activity", "changelog_links", "notification_guards", "notifications", "tags"] as const;
    for (const phase of phases) {
      job = { ...job, phase };
      const result = await processMergePhase(ctx, job);
      job = { ...job, voteCount: job.voteCount + result.movedVotes, commentCount: job.commentCount + result.movedComments };
    }
    await ctx.db.patch(jobId, { voteCount: job.voteCount, commentCount: job.commentCount });
    await finalizeMerge(ctx, job);
    return { contractVersion: 1 as const, status: "complete" as const, sourcePostId: String(source._id), canonicalPostId: String(canonical._id) };
  },
});
