import { v } from "convex/values";

import { internal } from "./_generated/api.js";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server.js";
import { SANDBOX_INACTIVITY_MS } from "./sandboxLifecycle.js";
import { SANDBOX_QUOTAS } from "./sandboxQuotas.js";
import { deriveLogicalSandboxKey } from "./sandboxScope.js";

type ReadContext = Pick<QueryCtx | MutationCtx, "db">;

async function ownerForEmail(ctx: ReadContext, email: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("email", (query) => query.eq("email", email))
    .unique();
  if (user === null) throw new Error("PHASE4_TEST_USER_NOT_FOUND");
  const ownerKey = await deriveLogicalSandboxKey(String(user._id));
  const owner = await ctx.db
    .query("sandboxOwners")
    .withIndex("by_owner_key", (query) => query.eq("ownerKey", ownerKey))
    .unique();
  if (owner === null) throw new Error("PHASE4_TEST_OWNER_NOT_FOUND");
  return { owner, ownerKey };
}

async function generationsForOwner(ctx: ReadContext, ownerKey: string) {
  return await ctx.db
    .query("sandboxGenerations")
    .withIndex("by_owner_generation", (query) => query.eq("ownerKey", ownerKey))
    .take(65);
}

function result(value: unknown) {
  return JSON.stringify(value);
}

export const inspect = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const { owner, ownerKey } = await ownerForEmail(ctx, args.email);
    const generations = await generationsForOwner(ctx, ownerKey);
    const retired = generations.filter(
      (generation) => generation.state === "retired",
    );
    return result({
      activeGeneration: owner.activeGeneration ?? null,
      pendingGeneration: owner.pendingGeneration ?? null,
      generationCount: generations.length,
      retired: retired.length,
      retiredCleanupComplete:
        retired.length > 0 &&
        retired.every((generation) => generation.cleanupState === "complete"),
      retiredGenerations: retired.map((generation) => ({
        generation: generation.generation,
        cleanupState: generation.cleanupState ?? null,
        cleanupStage: generation.cleanupStage ?? null,
        cleanupRetries: generation.cleanupRetries ?? 0,
        cleanupLastError: generation.cleanupLastError ?? null,
      })),
      lifecycleState: owner.lifecycleState,
      writeCount: owner.writeCount ?? 0,
    });
  },
});

export const saturateWrites = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const { owner } = await ownerForEmail(ctx, args.email);
    await ctx.db.patch(owner._id, {
      writeWindowStartedAt: Date.now(),
      writeCount: SANDBOX_QUOTAS.writesPerMinute,
    });
    return result({ writeCount: SANDBOX_QUOTAS.writesPerMinute });
  },
});

export const clearWriteWindow = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const { owner } = await ownerForEmail(ctx, args.email);
    await ctx.db.patch(owner._id, {
      writeWindowStartedAt: Date.now() - 61_000,
      writeCount: 0,
    });
    return result({ writeCount: 0 });
  },
});

export const expire = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const { owner } = await ownerForEmail(ctx, args.email);
    const currentTime = Date.now();
    await ctx.db.patch(owner._id, {
      lastActivityAt: currentTime - SANDBOX_INACTIVITY_MS - 1,
    });
    const scan = await ctx.runMutation(
      internal.sandboxCleanup.scanExpiredSandboxes,
      { currentTime },
    );
    return result(scan);
  },
});

export const exerciseCleanupRecovery = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const { ownerKey } = await ownerForEmail(ctx, args.email);
    const generations = await generationsForOwner(ctx, ownerKey);
    const retired = generations
      .filter((generation) => generation.state === "retired")
      .sort((left, right) => right.generation - left.generation)[0];
    if (retired === undefined) {
      throw new Error("PHASE4_TEST_RETIRED_GENERATION_NOT_FOUND");
    }
    const leaseVersion = (retired.cleanupLeaseVersion ?? 0) + 1;
    const workerId = "phase4-test-failed-worker";
    await ctx.db.patch(retired._id, {
      cleanupState: "leased",
      cleanupStage: 0,
      cleanupCursor: undefined,
      cleanupLeaseOwner: workerId,
      cleanupLeaseUntil: Date.now() + 30_000,
      cleanupLeaseVersion: leaseVersion,
    });
    const retry = await ctx.runMutation(
      internal.sandboxCleanup.releaseCleanupLease,
      {
        ownerKey,
        generation: retired.generation,
        workerId,
        leaseVersion,
      },
    );
    const stale = await ctx.runMutation(
      internal.sandboxCleanup.releaseCleanupLease,
      {
        ownerKey,
        generation: retired.generation,
        workerId,
        leaseVersion,
      },
    );
    return result({
      generation: retired.generation,
      retryState: retry.state,
      staleState: stale.state,
    });
  },
});
