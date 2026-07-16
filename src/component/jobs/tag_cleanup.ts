import { v } from "convex/values";

import { internal } from "../_generated/api.js";
import { internalMutation } from "../_generated/server.js";
import type { MutationCtx } from "../_generated/server.js";
import { appendPostActivity } from "../model/activity.js";

export const TAG_CLEANUP_BATCH_SIZE = 50;

export function nextTagCleanupState(counts: {
  memberships: number;
  feeds: number;
  searches: number;
}) {
  const done =
    counts.memberships === 0 && counts.feeds === 0 && counts.searches === 0;
  return { done, scheduleNext: !done };
}

async function scheduleNext(ctx: MutationCtx, jobId: string) {
  await ctx.scheduler.runAfter(
    0,
    internal.jobs.tag_cleanup.continueTagCleanup,
    { jobId },
  );
}

export const continueTagCleanup = internalMutation({
  args: { jobId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedJobId = ctx.db.normalizeId("tagCleanupJobs", args.jobId);
    if (!normalizedJobId) return null;
    const job = await ctx.db.get(normalizedJobId);
    if (!job || job.state === "complete") return null;
    const tag = await ctx.db.get(job.tagId);
    if (!tag || tag.scopeId !== job.scopeId) {
      throw new Error("TAG_CLEANUP_SCOPE_INVARIANT");
    }

    const memberships = await ctx.db
      .query("postTags")
      .withIndex("by_scope_tag_post", (query) =>
        query.eq("scopeId", job.scopeId).eq("tagId", job.tagId),
      )
      .take(TAG_CLEANUP_BATCH_SIZE);
    if (memberships.length > 0) {
      for (const membership of memberships) {
        await appendPostActivity(ctx, {
          scopeId: job.scopeId,
          postId: membership.postId,
          actorId: job.actorId,
          type: "tag_remove",
          tagId: job.tagId,
        });
        await ctx.db.delete(membership._id);
      }
      await scheduleNext(ctx, args.jobId);
      return null;
    }

    const feeds = await ctx.db
      .query("postTagFeeds")
      .withIndex("by_scope_tag_post", (query) =>
        query.eq("scopeId", job.scopeId).eq("tagId", job.tagId),
      )
      .take(TAG_CLEANUP_BATCH_SIZE);
    if (feeds.length > 0) {
      await Promise.all(feeds.map((row) => ctx.db.delete(row._id)));
      await scheduleNext(ctx, args.jobId);
      return null;
    }

    const searches = await ctx.db
      .query("postTagSearches")
      .withIndex("by_scope_tag_post", (query) =>
        query.eq("scopeId", job.scopeId).eq("tagId", job.tagId),
      )
      .take(TAG_CLEANUP_BATCH_SIZE);
    if (searches.length > 0) {
      await Promise.all(searches.map((row) => ctx.db.delete(row._id)));
      await scheduleNext(ctx, args.jobId);
      return null;
    }

    await ctx.db.patch(tag._id, { state: "deleted" });
    await ctx.db.patch(job._id, { state: "complete", completedAt: Date.now() });
    return null;
  },
});
