import { v } from "convex/values";

import { internal } from "../_generated/api.js";
import { internalMutation } from "../_generated/server.js";
import { continueMergeJob } from "../model/merge.js";

export const continueMerge = internalMutation({
  args: { jobId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("mergeJobs", args.jobId);
    if (!id) return null;
    const job = await ctx.db.get(id);
    if (!job || job.state === "done" || job.state === "aborted") return null;
    await continueMergeJob(ctx, job.scopeId, args.jobId);
    const updated = await ctx.db.get(id);
    if (!updated || updated.state === "done" || updated.state === "aborted") {
      return null;
    }
    await ctx.db.patch(id, { continuationScheduled: true });
    await ctx.scheduler.runAfter(0, internal.jobs.merge.continueMerge, {
      jobId: args.jobId,
    });
    return null;
  },
});
