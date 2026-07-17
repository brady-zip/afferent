import { v } from "convex/values";

import { internal } from "../_generated/api.js";
import { mutation } from "../_generated/server.js";
import { upsertActor } from "../model/actors.js";
import { conflict } from "../model/errors.js";
import {
  abortMergeJob,
  assertMergeIntent,
  countAffectedMergeRelations,
  createMergeJob,
  requireLiveMergePost,
  runAtomicMerge,
} from "../model/merge.js";
import { requirePostInScope } from "../model/scope.js";
import { mergePostResultValidator, verifiedActorValidator } from "../validators.js";

function publicStatus(state: "preparing" | "ready" | "cutover_done" | "cleaning" | "done" | "aborted") {
  return state === "done" ? ("complete" as const) : ("pending" as const);
}

export const mergePost = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    sourcePostId: v.string(),
    canonicalPostId: v.string(),
  },
  returns: mergePostResultValidator,
  handler: async (ctx, args) => {
    const sourceRecord = await requirePostInScope(ctx, args.scopeId, args.sourcePostId);
    if (sourceRecord.mergedIntoPostId !== undefined) {
      if (String(sourceRecord.mergedIntoPostId) !== args.canonicalPostId) {
        conflict("canonicalPostId", "source already has a different merge target");
      }
      return {
        contractVersion: 1 as const,
        status: "complete" as const,
        sourcePostId: String(sourceRecord._id),
        canonicalPostId: String(sourceRecord.mergedIntoPostId),
      };
    }
    const [source, canonical] = await Promise.all([
      requireLiveMergePost(ctx, args.scopeId, args.sourcePostId),
      requireLiveMergePost(ctx, args.scopeId, args.canonicalPostId),
    ]);
    await assertMergeIntent(source, canonical);
    const existing = await ctx.db
      .query("mergeJobs")
      .withIndex("by_scope_source", (q) =>
        q.eq("scopeId", args.scopeId).eq("sourcePostId", source._id),
      )
      .order("desc")
      .first();
    if (existing) {
      if (existing.canonicalPostId !== canonical._id) {
        conflict("canonicalPostId", "source already has a different merge target");
      }
      return {
        contractVersion: 1 as const,
        status: publicStatus(existing.state),
        sourcePostId: String(source._id),
        canonicalPostId: String(canonical._id),
      };
    }
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const affected = await countAffectedMergeRelations(
      ctx,
      args.scopeId,
      source._id,
      canonical._id,
    );
    const created = await createMergeJob(ctx, {
      scopeId: args.scopeId,
      sourcePostId: source._id,
      canonicalPostId: canonical._id,
      actorId,
    });
    let state: "preparing" | "done" = created.state;
    if (affected <= 50) {
      const job = await ctx.db.get(created.jobId);
      if (!job) throw new Error("MERGE_JOB_INSERT_INVARIANT");
      state = (await runAtomicMerge(ctx, job)).state;
    } else {
      await ctx.db.patch(created.jobId, { continuationScheduled: true });
      await ctx.scheduler.runAfter(0, internal.jobs.merge.continueMerge, {
        jobId: String(created.jobId),
      });
    }
    return {
      contractVersion: 1 as const,
      status: publicStatus(state),
      sourcePostId: String(source._id),
      canonicalPostId: String(canonical._id),
    };
  },
});

const mergeControlResult = v.object({
  contractVersion: v.literal(1),
  state: v.union(
    v.literal("preparing"),
    v.literal("ready"),
    v.literal("cutover_done"),
    v.literal("cleaning"),
    v.literal("done"),
    v.literal("aborted"),
  ),
});

export const resumeMerge = mutation({
  args: { scopeId: v.string(), jobId: v.string() },
  returns: mergeControlResult,
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("mergeJobs", args.jobId);
    const job = id ? await ctx.db.get(id) : null;
    if (!job || job.scopeId !== args.scopeId) {
      conflict("jobId", "merge job was not found");
    }
    if (
      job.state !== "done" &&
      job.state !== "aborted" &&
      !job.continuationScheduled
    ) {
      await ctx.db.patch(job._id, { continuationScheduled: true });
      await ctx.scheduler.runAfter(0, internal.jobs.merge.continueMerge, {
        jobId: String(job._id),
      });
    }
    return { contractVersion: 1 as const, state: job.state };
  },
});

export const abortMerge = mutation({
  args: { scopeId: v.string(), jobId: v.string() },
  returns: mergeControlResult,
  handler: async (ctx, args) => ({
    contractVersion: 1 as const,
    ...(await abortMergeJob(ctx, args.scopeId, args.jobId)),
  }),
});
