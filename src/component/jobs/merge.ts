import { v } from "convex/values";

import { internal } from "../_generated/api.js";
import { internalMutation } from "../_generated/server.js";
import {
  MERGE_BATCH_SIZE,
  NEXT_MERGE_PHASE,
  finalizeMerge,
  processMergePhase,
} from "../model/merge.js";

export const continueMerge = internalMutation({
  args: { jobId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("mergeJobs", args.jobId);
    if (!id) return null;
    const job = await ctx.db.get(id);
    if (!job || job.state === "complete") return null;
    if (job.phase === "finalize") {
      await finalizeMerge(ctx, job);
      return null;
    }
    const result = await processMergePhase(ctx, job);
    const patch = {
      voteCount: job.voteCount + result.movedVotes,
      commentCount: job.commentCount + result.movedComments,
      ...(result.processed < MERGE_BATCH_SIZE ? { phase: NEXT_MERGE_PHASE[job.phase] } : {}),
    };
    await ctx.db.patch(job._id, patch);
    await ctx.scheduler.runAfter(0, internal.jobs.merge.continueMerge, { jobId: args.jobId });
    return null;
  },
});
