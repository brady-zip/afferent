import type { ComponentApi } from "afferent/_generated/component.js";
import { v } from "convex/values";

import { components, internal } from "./_generated/api.js";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server.js";
import { SANDBOX_INACTIVITY_MS } from "./sandboxLifecycle.js";

export const SANDBOX_CLEANUP_LEASE_MS = 30_000;
export const SANDBOX_CLEANUP_RETRY_MS = 1000;
export const SANDBOX_HOST_CLEANUP_BATCH = 50;
export const SANDBOX_EXPIRY_SCAN_BATCH = 25;

const sandboxComponent = components.sandbox as ComponentApi;

const cleanupResultValidator = v.object({
  contractVersion: v.literal(1),
  done: v.boolean(),
  deleted: v.number(),
  continuation: v.optional(
    v.object({
      stage: v.number(),
      cursor: v.optional(v.string()),
    }),
  ),
});

const workerStateValidator = v.union(
  v.object({ state: v.literal("stale") }),
  v.object({ state: v.literal("busy") }),
  v.object({ state: v.literal("pending") }),
  v.object({ state: v.literal("complete") }),
);

type WorkerState =
  | { state: "stale" }
  | { state: "busy" }
  | { state: "pending" }
  | { state: "complete" };

interface LeaseState {
  state: "leased";
  physicalScopeId: string;
  leaseVersion: number;
  continuation?: { stage: number; cursor?: string };
}

type HostReadContext = Pick<QueryCtx | MutationCtx, "db">;

async function generationByNumber(
  ctx: HostReadContext,
  ownerKey: string,
  generation: number,
) {
  return ctx.db
    .query("sandboxGenerations")
    .withIndex("by_owner_generation", (query) =>
      query.eq("ownerKey", ownerKey).eq("generation", generation),
    )
    .unique();
}

export const acquireCleanupLease = internalMutation({
  args: {
    ownerKey: v.string(),
    generation: v.number(),
    workerId: v.string(),
    currentTime: v.number(),
  },
  returns: v.union(
    workerStateValidator,
    v.object({
      state: v.literal("leased"),
      physicalScopeId: v.string(),
      leaseVersion: v.number(),
      continuation: v.optional(
        v.object({
          stage: v.number(),
          cursor: v.optional(v.string()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const generation = await generationByNumber(
      ctx,
      args.ownerKey,
      args.generation,
    );
    if (
      generation === null ||
      (generation.state !== "retired" && generation.state !== "failed")
    ) {
      return { state: "stale" as const };
    }
    if (generation.cleanupState === "complete") {
      return { state: "complete" as const };
    }
    if (
      generation.cleanupState === "leased" &&
      generation.cleanupLeaseUntil !== undefined &&
      generation.cleanupLeaseUntil > args.currentTime &&
      generation.cleanupLeaseOwner !== args.workerId
    ) {
      return { state: "busy" as const };
    }
    const leaseVersion = (generation.cleanupLeaseVersion ?? 0) + 1;
    await ctx.db.patch(generation._id, {
      cleanupState: "leased",
      cleanupLeaseOwner: args.workerId,
      cleanupLeaseUntil: args.currentTime + SANDBOX_CLEANUP_LEASE_MS,
      cleanupLeaseVersion: leaseVersion,
    });
    return {
      state: "leased" as const,
      physicalScopeId: generation.physicalScopeId,
      leaseVersion,
      continuation:
        generation.cleanupStage === undefined
          ? undefined
          : {
              stage: generation.cleanupStage,
              ...(generation.cleanupCursor === undefined
                ? {}
                : { cursor: generation.cleanupCursor }),
            },
    };
  },
});

async function scheduleNext(
  ctx: Pick<MutationCtx, "scheduler">,
  args: { ownerKey: string; generation: number; delay?: number },
) {
  await ctx.scheduler.runAfter(
    args.delay ?? 0,
    internal.sandboxCleanup.runRetiredGenerationCleanup,
    { ownerKey: args.ownerKey, generation: args.generation },
  );
}

export const recordCleanupBatch = internalMutation({
  args: {
    ownerKey: v.string(),
    generation: v.number(),
    workerId: v.string(),
    leaseVersion: v.number(),
    result: cleanupResultValidator,
    currentTime: v.number(),
  },
  returns: workerStateValidator,
  handler: async (ctx, args) => {
    const generation = await generationByNumber(
      ctx,
      args.ownerKey,
      args.generation,
    );
    if (
      generation === null ||
      (generation.state !== "retired" && generation.state !== "failed") ||
      generation.cleanupState !== "leased" ||
      generation.cleanupLeaseOwner !== args.workerId ||
      generation.cleanupLeaseVersion !== args.leaseVersion
    ) {
      return { state: "stale" as const };
    }

    if (!args.result.done) {
      await ctx.db.patch(generation._id, {
        cleanupState: "pending",
        cleanupStage: args.result.continuation?.stage ?? 0,
        cleanupCursor: args.result.continuation?.cursor,
        cleanupLeaseOwner: undefined,
        cleanupLeaseUntil: undefined,
      });
      await scheduleNext(ctx, args);
      return { state: "pending" as const };
    }

    const seedEntities = await ctx.db
      .query("demoSeedEntities")
      .withIndex("by_scope_key", (query) =>
        query.eq("physicalScopeId", generation.physicalScopeId),
      )
      .take(SANDBOX_HOST_CLEANUP_BATCH);
    if (seedEntities.length > 0) {
      for (const entity of seedEntities) await ctx.db.delete(entity._id);
      await ctx.db.patch(generation._id, {
        cleanupState: "pending",
        cleanupLeaseOwner: undefined,
        cleanupLeaseUntil: undefined,
      });
      await scheduleNext(ctx, args);
      return { state: "pending" as const };
    }
    const progress = await ctx.db
      .query("demoSeedProgress")
      .withIndex("by_physical_scope", (query) =>
        query.eq("physicalScopeId", generation.physicalScopeId),
      )
      .unique();
    if (progress !== null) {
      await ctx.db.delete(progress._id);
      await ctx.db.patch(generation._id, {
        cleanupState: "pending",
        cleanupLeaseOwner: undefined,
        cleanupLeaseUntil: undefined,
      });
      await scheduleNext(ctx, args);
      return { state: "pending" as const };
    }

    await ctx.db.patch(generation._id, {
      cleanupState: "complete",
      cleanupCursor: undefined,
      cleanupLeaseOwner: undefined,
      cleanupLeaseUntil: undefined,
      cleanedAt: args.currentTime,
    });
    return { state: "complete" as const };
  },
});

export const releaseCleanupLease = internalMutation({
  args: {
    ownerKey: v.string(),
    generation: v.number(),
    workerId: v.string(),
    leaseVersion: v.number(),
  },
  returns: workerStateValidator,
  handler: async (ctx, args) => {
    const generation = await generationByNumber(
      ctx,
      args.ownerKey,
      args.generation,
    );
    if (
      generation === null ||
      generation.cleanupState !== "leased" ||
      generation.cleanupLeaseOwner !== args.workerId ||
      generation.cleanupLeaseVersion !== args.leaseVersion
    ) {
      return { state: "stale" as const };
    }
    await ctx.db.patch(generation._id, {
      cleanupState: "pending",
      cleanupLeaseOwner: undefined,
      cleanupLeaseUntil: undefined,
      cleanupRetries: (generation.cleanupRetries ?? 0) + 1,
    });
    await scheduleNext(ctx, { ...args, delay: SANDBOX_CLEANUP_RETRY_MS });
    return { state: "pending" as const };
  },
});

export const scanExpiredSandboxes = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    currentTime: v.optional(v.number()),
  },
  returns: v.object({
    contractVersion: v.literal(1),
    expired: v.number(),
    done: v.boolean(),
    cursor: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    contractVersion: 1;
    expired: number;
    done: boolean;
    cursor?: string;
  }> => {
    const currentTime = args.currentTime ?? Date.now();
    const page = await ctx.db
      .query("sandboxOwners")
      .withIndex("by_last_activity", (query) =>
        query.lt("lastActivityAt", currentTime - SANDBOX_INACTIVITY_MS),
      )
      .paginate({
        numItems: SANDBOX_EXPIRY_SCAN_BATCH,
        cursor: args.cursor ?? null,
      });
    let expired = 0;
    for (const owner of page.page) {
      if (
        owner.activeGeneration === undefined ||
        owner.pendingGeneration !== undefined
      ) {
        continue;
      }
      const generation = await generationByNumber(
        ctx,
        owner.ownerKey,
        owner.activeGeneration,
      );
      if (generation?.state !== "active") continue;
      await ctx.db.patch(generation._id, {
        state: "retired",
        retiredAt: currentTime,
        cleanupState: "pending",
        cleanupStage: 0,
        cleanupLeaseVersion: generation.cleanupLeaseVersion ?? 0,
        cleanupRetries: generation.cleanupRetries ?? 0,
      });
      await ctx.db.patch(owner._id, {
        activeGeneration: undefined,
        lifecycleState: "expired",
        preparationReason: undefined,
        leaseOwner: undefined,
        leaseUntil: undefined,
        leaseVersion: owner.leaseVersion + 1,
      });
      await scheduleNext(ctx, {
        ownerKey: owner.ownerKey,
        generation: generation.generation,
      });
      expired += 1;
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.sandboxCleanup.scanExpiredSandboxes,
        { cursor: page.continueCursor },
      );
    }
    return {
      contractVersion: 1,
      expired,
      done: page.isDone,
      ...(page.isDone ? {} : { cursor: page.continueCursor }),
    };
  },
});

export const runRetiredGenerationCleanup = internalAction({
  args: {
    ownerKey: v.string(),
    generation: v.number(),
  },
  returns: workerStateValidator,
  handler: async (ctx, args): Promise<WorkerState> => {
    const workerId = crypto.randomUUID();
    const lease: LeaseState | WorkerState = await ctx.runMutation(
      internal.sandboxCleanup.acquireCleanupLease,
      {
        ...args,
        workerId,
        currentTime: Date.now(),
      },
    );
    if (lease.state !== "leased") return lease;
    try {
      const result = await ctx.runMutation(
        sandboxComponent.maintenance.sandbox.cleanupScopeBatch,
        {
          scopeId: lease.physicalScopeId,
          continuation: lease.continuation,
        },
      );
      return await ctx.runMutation(internal.sandboxCleanup.recordCleanupBatch, {
        ...args,
        workerId,
        leaseVersion: lease.leaseVersion,
        result,
        currentTime: Date.now(),
      });
    } catch {
      return await ctx.runMutation(
        internal.sandboxCleanup.releaseCleanupLease,
        {
          ...args,
          workerId,
          leaseVersion: lease.leaseVersion,
        },
      );
    }
  },
});
