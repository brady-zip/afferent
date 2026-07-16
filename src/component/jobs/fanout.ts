import { v } from "convex/values";

import { internal } from "../_generated/api.js";
import { internalMutation } from "../_generated/server.js";
import type { MutationCtx } from "../_generated/server.js";
import { FANOUT_BATCH_SIZE } from "../model/notifications.js";
import { materializeRecipientRow } from "../notifications/fanout.js";

async function scheduleNext(ctx: MutationCtx, jobId: string) {
  await ctx.scheduler.runAfter(0, internal.jobs.fanout.continueFanout, { jobId });
}

export const continueFanout = internalMutation({
  args: { jobId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const jobId = ctx.db.normalizeId("notificationFanoutJobs", args.jobId);
    if (!jobId) return null;
    const job = await ctx.db.get(jobId);
    if (!job || job.state === "complete") return null;
    const event = await ctx.db.get(job.eventId);
    if (!event || event.scopeId !== job.scopeId) {
      throw new Error("NOTIFICATION_FANOUT_SCOPE_INVARIANT");
    }
    const pending = await ctx.db
      .query("notificationEventRecipients")
      .withIndex("by_scope_event_state_actor", (q) =>
        q
          .eq("scopeId", job.scopeId)
          .eq("eventId", job.eventId)
          .eq("state", "pending"),
      )
      .take(FANOUT_BATCH_SIZE);
    for (const recipient of pending) {
      await materializeRecipientRow(ctx, recipient);
    }
    const remaining = await ctx.db
      .query("notificationEventRecipients")
      .withIndex("by_scope_event_state_actor", (q) =>
        q
          .eq("scopeId", job.scopeId)
          .eq("eventId", job.eventId)
          .eq("state", "pending"),
      )
      .take(1);
    if (remaining.length === 0) {
      await ctx.db.patch(job._id, { state: "complete", completedAt: Date.now() });
    } else {
      await scheduleNext(ctx, args.jobId);
    }
    return null;
  },
});
