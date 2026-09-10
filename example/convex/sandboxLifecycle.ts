import { ConvexError, v } from "convex/values";
import { createScopedAfferentClient } from "afferent/server.js";
import type { ComponentApi } from "afferent/_generated/component.js";

import { components, internal } from "./_generated/api.js";
import { internalMutation, type QueryCtx } from "./_generated/server.js";
import {
  deriveLogicalSandboxKey,
  derivePhysicalSandboxScope,
} from "./sandboxScope.js";
import {
  REPRESENTATIVE_SEED_STEP_COUNT,
  SEED_VERSION,
  createComponentSeedOperations,
  createConvexSeedProgressStore,
  runRepresentativeSeed,
} from "./seeds.js";
import { SANDBOX_QUOTAS } from "./sandboxQuotas.js";

export const SANDBOX_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;
const PREPARATION_LEASE_MS = 5 * 60 * 1000;
const RESET_WINDOW_MS = 60 * 60 * 1000;
const sandboxComponent = components.sandbox as ComponentApi;

export const sandboxLifecycleStateValidator = v.union(
  v.literal("signed_out"),
  v.literal("preparing"),
  v.literal("ready"),
  v.literal("resetting"),
  v.literal("expired"),
  v.literal("error"),
);

export const sandboxLifecycleResultValidator = v.object({
  state: sandboxLifecycleStateValidator,
  message: v.string(),
  lastActivityAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
});

export type SandboxLifecycleState =
  "signed_out" | "preparing" | "ready" | "resetting" | "expired" | "error";

export type SandboxLifecycleResult = Readonly<{
  state: SandboxLifecycleState;
  message: string;
  lastActivityAt?: number;
  expiresAt?: number;
}>;

export type SeedGeneration = (input: {
  logicalOwnerKey: string;
  physicalScopeId: string;
  generation: number;
}) => Promise<void>;

type GenerationState = "pending" | "active" | "retired" | "failed";
type PreparationReason = "first_access" | "reset" | "expired";

function preparationState(reason: PreparationReason | undefined) {
  if (reason === "reset") return "resetting";
  if (reason === "expired") return "expired";
  return "preparing";
}

interface GenerationRecord {
  generation: number;
  physicalScopeId: string;
  state: GenerationState;
  createdAt: number;
  activatedAt?: number;
  retiredAt?: number;
  failedAt?: number;
  leaseVersion: number;
}

interface OwnerRecord {
  logicalOwnerKey: string;
  activeGeneration: number | null;
  pendingGeneration: number | null;
  nextGeneration: number;
  lastActivityAt: number;
  leaseVersion: number;
  generations: Map<number, GenerationRecord>;
}

type LifecycleOptions = Readonly<{
  seedGeneration: SeedGeneration;
  now?: () => number;
}>;

export type SandboxLifecycle = Readonly<{
  ensure: (verifiedUserId: string) => Promise<SandboxLifecycleResult>;
  reset: (verifiedUserId: string) => Promise<SandboxLifecycleResult>;
  resolvePhysicalScope: (verifiedUserId: string) => Promise<string>;
  inspectForTest: (verifiedUserId: string) => Promise<{
    activeGeneration: number | null;
    pendingGeneration: number | null;
    activePhysicalScope: string | null;
    retiredGenerations: number[];
    failedGenerations: number[];
    leaseVersion: number;
  }>;
}>;

type SandboxHostReadContext = Pick<QueryCtx, "db">;

function readyResult(owner: OwnerRecord): SandboxLifecycleResult {
  return {
    state: "ready",
    message: "Your private sandbox is ready.",
    lastActivityAt: owner.lastActivityAt,
    expiresAt: owner.lastActivityAt + SANDBOX_INACTIVITY_MS,
  };
}

function failureResult(hasActiveGeneration: boolean): SandboxLifecycleResult {
  return {
    state: "error",
    message: hasActiveGeneration
      ? "Your sandbox wasn't reset. Your previous content is still available."
      : "We couldn't open your sandbox. Try opening it again.",
  };
}

export function createSandboxLifecycle(
  options: LifecycleOptions,
): SandboxLifecycle {
  const now = options.now ?? Date.now;
  const owners = new Map<string, OwnerRecord>();
  const inFlight = new Map<string, Promise<SandboxLifecycleResult>>();

  async function identify(verifiedUserId: string) {
    return deriveLogicalSandboxKey(verifiedUserId);
  }

  function ownerFor(logicalOwnerKey: string) {
    let owner = owners.get(logicalOwnerKey);
    if (owner === undefined) {
      owner = {
        logicalOwnerKey,
        activeGeneration: null,
        pendingGeneration: null,
        nextGeneration: 1,
        lastActivityAt: now(),
        leaseVersion: 0,
        generations: new Map(),
      };
      owners.set(logicalOwnerKey, owner);
    }
    return owner;
  }

  function startPreparation(
    owner: OwnerRecord,
  ): Promise<SandboxLifecycleResult> {
    const existing = inFlight.get(owner.logicalOwnerKey);
    if (existing !== undefined) return existing;

    const operation = (async () => {
      const generation = owner.nextGeneration;
      owner.nextGeneration += 1;
      owner.pendingGeneration = generation;
      owner.leaseVersion += 1;
      const physicalScopeId = await derivePhysicalSandboxScope(
        owner.logicalOwnerKey,
        generation,
      );
      const pending: GenerationRecord = {
        generation,
        physicalScopeId,
        state: "pending",
        createdAt: now(),
        leaseVersion: owner.leaseVersion,
      };
      owner.generations.set(generation, pending);

      try {
        await options.seedGeneration({
          logicalOwnerKey: owner.logicalOwnerKey,
          physicalScopeId,
          generation,
        });

        if (
          owner.pendingGeneration !== generation ||
          pending.state !== "pending" ||
          pending.leaseVersion !== owner.leaseVersion
        ) {
          throw new Error("SANDBOX_PREPARATION_LEASE_LOST");
        }

        const activatedAt = now();
        const previous =
          owner.activeGeneration === null
            ? undefined
            : owner.generations.get(owner.activeGeneration);
        if (previous !== undefined) {
          previous.state = "retired";
          previous.retiredAt = activatedAt;
        }
        pending.state = "active";
        pending.activatedAt = activatedAt;
        owner.activeGeneration = generation;
        owner.pendingGeneration = null;
        owner.lastActivityAt = activatedAt;
        owner.leaseVersion += 1;
        return readyResult(owner);
      } catch {
        pending.state = "failed";
        pending.failedAt = now();
        if (owner.pendingGeneration === generation) {
          owner.pendingGeneration = null;
        }
        owner.leaseVersion += 1;
        return failureResult(owner.activeGeneration !== null);
      }
    })();

    inFlight.set(owner.logicalOwnerKey, operation);
    void operation.finally(() => {
      if (inFlight.get(owner.logicalOwnerKey) === operation) {
        inFlight.delete(owner.logicalOwnerKey);
      }
    });
    return operation;
  }

  async function ensure(verifiedUserId: string) {
    const owner = ownerFor(await identify(verifiedUserId));
    const current = inFlight.get(owner.logicalOwnerKey);
    if (current !== undefined) return current;
    if (owner.activeGeneration !== null) {
      if (now() - owner.lastActivityAt > SANDBOX_INACTIVITY_MS) {
        return startPreparation(owner);
      }
      owner.lastActivityAt = now();
      return readyResult(owner);
    }
    return startPreparation(owner);
  }

  async function reset(verifiedUserId: string) {
    const owner = ownerFor(await identify(verifiedUserId));
    const current = inFlight.get(owner.logicalOwnerKey);
    if (current !== undefined) return current;
    return startPreparation(owner);
  }

  async function resolvePhysicalScope(verifiedUserId: string) {
    const owner = owners.get(await identify(verifiedUserId));
    if (
      owner === undefined ||
      owner.pendingGeneration !== null ||
      owner.activeGeneration === null
    ) {
      throw new Error("SANDBOX_NOT_READY");
    }
    const active = owner.generations.get(owner.activeGeneration);
    if (active?.state !== "active") throw new Error("SANDBOX_NOT_READY");
    owner.lastActivityAt = now();
    return active.physicalScopeId;
  }

  async function inspectForTest(verifiedUserId: string) {
    const owner = owners.get(await identify(verifiedUserId));
    if (owner === undefined) {
      return {
        activeGeneration: null,
        pendingGeneration: null,
        activePhysicalScope: null,
        retiredGenerations: [],
        failedGenerations: [],
        leaseVersion: 0,
      };
    }
    const generations = [...owner.generations.values()];
    return {
      activeGeneration: owner.activeGeneration,
      pendingGeneration: owner.pendingGeneration,
      activePhysicalScope:
        owner.activeGeneration === null
          ? null
          : (owner.generations.get(owner.activeGeneration)?.physicalScopeId ??
            null),
      retiredGenerations: generations
        .filter(({ state }) => state === "retired")
        .map(({ generation }) => generation),
      failedGenerations: generations
        .filter(({ state }) => state === "failed")
        .map(({ generation }) => generation),
      leaseVersion: owner.leaseVersion,
    };
  }

  return { ensure, reset, resolvePhysicalScope, inspectForTest };
}

function safeLifecycleResult(
  state: SandboxLifecycleState,
  owner?: { lastActivityAt: number },
): SandboxLifecycleResult {
  if (state === "ready" && owner !== undefined) {
    return {
      state,
      message: "Your private sandbox is ready.",
      lastActivityAt: owner.lastActivityAt,
      expiresAt: owner.lastActivityAt + SANDBOX_INACTIVITY_MS,
    };
  }
  const message: Record<Exclude<SandboxLifecycleState, "ready">, string> = {
    signed_out: "Sign in to open your private sandbox.",
    preparing: "We're restoring the deterministic demo content.",
    resetting: "Resetting your private sandbox.",
    expired:
      "The previous sandbox expired after 7 days without activity. We're restoring the demo baseline now.",
    error:
      "We couldn't open your sandbox. Your previous sandbox has not been changed.",
  };
  return { state, message: message[state as Exclude<typeof state, "ready">] };
}

async function ownerByKey(ctx: SandboxHostReadContext, ownerKey: string) {
  return ctx.db
    .query("sandboxOwners")
    .withIndex("by_owner_key", (query) => query.eq("ownerKey", ownerKey))
    .unique();
}

async function generationByNumber(
  ctx: SandboxHostReadContext,
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

export async function readSandboxLifecycle(
  ctx: SandboxHostReadContext,
  verifiedUserId: string,
  currentTime = Date.now(),
): Promise<SandboxLifecycleResult> {
  const owner = await ownerByKey(
    ctx,
    await deriveLogicalSandboxKey(verifiedUserId),
  );
  if (owner === null) return safeLifecycleResult("preparing");
  if (
    owner.activeGeneration !== undefined &&
    owner.pendingGeneration === undefined &&
    currentTime - owner.lastActivityAt > SANDBOX_INACTIVITY_MS
  ) {
    return safeLifecycleResult("expired");
  }
  if (owner.pendingGeneration !== undefined) {
    return safeLifecycleResult(preparationState(owner.preparationReason));
  }
  if (owner.lifecycleState === "error") {
    return safeLifecycleResult("error");
  }
  if (owner.lifecycleState === "expired") {
    return safeLifecycleResult("expired");
  }
  if (owner.activeGeneration !== undefined) {
    return safeLifecycleResult("ready", owner);
  }
  return safeLifecycleResult("preparing");
}

export async function resolveActivePhysicalScope(
  ctx: SandboxHostReadContext,
  verifiedUserId: string,
  currentTime = Date.now(),
) {
  const ownerKey = await deriveLogicalSandboxKey(verifiedUserId);
  const owner = await ownerByKey(ctx, ownerKey);
  if (
    owner === null ||
    owner.pendingGeneration !== undefined ||
    owner.activeGeneration === undefined
  ) {
    throw new Error("SANDBOX_NOT_READY");
  }
  if (currentTime - owner.lastActivityAt > SANDBOX_INACTIVITY_MS) {
    throw new Error("SANDBOX_EXPIRED");
  }
  const active = await generationByNumber(
    ctx,
    ownerKey,
    owner.activeGeneration,
  );
  if (active?.state !== "active") throw new Error("SANDBOX_NOT_READY");
  return active.physicalScopeId;
}

export const beginPreparation = internalMutation({
  args: {
    ownerKey: v.string(),
    requestedReason: v.union(v.literal("ensure"), v.literal("reset")),
    leaseOwner: v.string(),
    currentTime: v.number(),
  },
  handler: async (ctx, args) => {
    let owner = await ownerByKey(ctx, args.ownerKey);
    if (
      owner?.pendingGeneration !== undefined &&
      owner.leaseUntil !== undefined &&
      owner.leaseUntil > args.currentTime
    ) {
      const pending = await generationByNumber(
        ctx,
        args.ownerKey,
        owner.pendingGeneration,
      );
      if (pending?.state === "pending") {
        return {
          kind: "pending" as const,
          generation: pending.generation,
          leaseVersion: pending.leaseVersion,
        };
      }
    }

    if (owner?.pendingGeneration !== undefined) {
      const stale = await generationByNumber(
        ctx,
        args.ownerKey,
        owner.pendingGeneration,
      );
      if (stale?.state === "pending") {
        await ctx.db.patch(stale._id, {
          state: "failed",
          failedAt: args.currentTime,
          cleanupState: "pending",
          cleanupStage: 0,
          cleanupLeaseVersion: stale.cleanupLeaseVersion ?? 0,
          cleanupRetries: stale.cleanupRetries ?? 0,
        });
        await ctx.scheduler.runAfter(
          0,
          internal.sandboxCleanup.runRetiredGenerationCleanup,
          { ownerKey: args.ownerKey, generation: stale.generation },
        );
      }
      await ctx.db.patch(owner._id, {
        pendingGeneration: undefined,
        lifecycleState:
          owner.activeGeneration === undefined ? "error" : "ready",
        preparationReason: undefined,
        leaseOwner: undefined,
        leaseUntil: undefined,
      });
      owner = await ownerByKey(ctx, args.ownerKey);
    }

    const isExpired =
      owner?.activeGeneration !== undefined &&
      args.currentTime - owner.lastActivityAt > SANDBOX_INACTIVITY_MS;
    if (
      args.requestedReason === "ensure" &&
      owner?.activeGeneration !== undefined &&
      !isExpired
    ) {
      await ctx.db.patch(owner._id, {
        lastActivityAt: args.currentTime,
        lifecycleState: "ready",
      });
      return {
        kind: "ready" as const,
        result: safeLifecycleResult("ready", {
          lastActivityAt: args.currentTime,
        }),
      };
    }

    let resetBudget:
      { resetWindowStartedAt: number; resetAttempts: number } | undefined;
    if (
      args.requestedReason === "reset" &&
      owner?.activeGeneration !== undefined
    ) {
      const resetWindowStartedAt =
        owner.resetWindowStartedAt ?? args.currentTime;
      const inCurrentWindow =
        args.currentTime - resetWindowStartedAt < RESET_WINDOW_MS;
      const resetAttempts = inCurrentWindow ? (owner.resetAttempts ?? 0) : 0;
      if (resetAttempts >= SANDBOX_QUOTAS.resetAttemptsPerHour) {
        throw new ConvexError({
          contractVersion: 1,
          code: "SANDBOX_RESET_RATE_LIMITED",
          retryAfterMs: Math.max(
            1,
            RESET_WINDOW_MS - (args.currentTime - resetWindowStartedAt),
          ),
          recovery: "Wait before resetting this private sandbox again.",
        });
      }
      resetBudget = {
        resetWindowStartedAt: inCurrentWindow
          ? resetWindowStartedAt
          : args.currentTime,
        resetAttempts: resetAttempts + 1,
      };
    }

    let reason: PreparationReason = "first_access";
    if (args.requestedReason === "reset") {
      reason = "reset";
    } else if (isExpired || owner?.lifecycleState === "expired") {
      reason = "expired";
    }
    const generation = owner?.nextGeneration ?? 1;
    const leaseVersion = (owner?.leaseVersion ?? 0) + 1;
    const physicalScopeId = await derivePhysicalSandboxScope(
      args.ownerKey,
      generation,
    );
    await ctx.db.insert("sandboxGenerations", {
      ownerKey: args.ownerKey,
      generation,
      physicalScopeId,
      state: "pending",
      createdAt: args.currentTime,
      seedVersion: 0,
      seedStep: 0,
      leaseVersion,
    });
    const ownerPatch = {
      pendingGeneration: generation,
      nextGeneration: generation + 1,
      lastActivityAt: owner?.lastActivityAt ?? args.currentTime,
      lifecycleState: preparationState(reason),
      preparationReason: reason,
      leaseOwner: args.leaseOwner,
      leaseUntil: args.currentTime + PREPARATION_LEASE_MS,
      leaseVersion,
      ...resetBudget,
    };
    if (owner === null) {
      await ctx.db.insert("sandboxOwners", {
        ownerKey: args.ownerKey,
        ...ownerPatch,
      });
    } else {
      await ctx.db.patch(owner._id, ownerPatch);
    }
    return { kind: "pending" as const, generation, leaseVersion };
  },
});

export const seedPendingGeneration = internalMutation({
  args: {
    ownerKey: v.string(),
    generation: v.number(),
    leaseVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const owner = await ownerByKey(ctx, args.ownerKey);
    const pending = await generationByNumber(
      ctx,
      args.ownerKey,
      args.generation,
    );
    if (
      owner?.pendingGeneration !== args.generation ||
      owner.leaseVersion !== args.leaseVersion ||
      pending?.state !== "pending" ||
      pending.leaseVersion !== args.leaseVersion
    ) {
      throw new Error("SANDBOX_PREPARATION_LEASE_LOST");
    }
    await runRepresentativeSeed({
      physicalScopeId: pending.physicalScopeId,
      operations: createComponentSeedOperations({
        context: ctx,
        createClient: (actor) =>
          createScopedAfferentClient(sandboxComponent, {
            resolveScope: async () => pending.physicalScopeId,
            resolveActor: async () => actor,
            resolveViewerActor: async () => actor,
            authorizeAdmin: async () => true,
            isAuthenticated: async () => true,
          }),
      }),
      progress: createConvexSeedProgressStore(ctx),
    });
    await ctx.db.patch(pending._id, {
      seedVersion: SEED_VERSION,
      seedStep: REPRESENTATIVE_SEED_STEP_COUNT,
    });
  },
});

export const activatePendingGeneration = internalMutation({
  args: {
    ownerKey: v.string(),
    generation: v.number(),
    leaseVersion: v.number(),
    currentTime: v.number(),
  },
  handler: async (ctx, args) => {
    const owner = await ownerByKey(ctx, args.ownerKey);
    const pending = await generationByNumber(
      ctx,
      args.ownerKey,
      args.generation,
    );
    if (
      owner === null ||
      owner.pendingGeneration !== args.generation ||
      owner.leaseVersion !== args.leaseVersion ||
      pending?.state !== "pending" ||
      pending.seedVersion !== SEED_VERSION ||
      pending.seedStep !== REPRESENTATIVE_SEED_STEP_COUNT
    ) {
      if (
        owner?.activeGeneration === args.generation &&
        pending?.state === "active"
      ) {
        return safeLifecycleResult("ready", owner);
      }
      throw new Error("SANDBOX_PREPARATION_LEASE_LOST");
    }
    if (owner.activeGeneration !== undefined) {
      const previous = await generationByNumber(
        ctx,
        args.ownerKey,
        owner.activeGeneration,
      );
      if (previous?.state === "active") {
        await ctx.db.patch(previous._id, {
          state: "retired",
          retiredAt: args.currentTime,
          cleanupState: "pending",
          cleanupStage: 0,
          cleanupLeaseVersion: previous.cleanupLeaseVersion ?? 0,
          cleanupRetries: previous.cleanupRetries ?? 0,
        });
        await ctx.scheduler.runAfter(
          0,
          internal.sandboxCleanup.runRetiredGenerationCleanup,
          { ownerKey: args.ownerKey, generation: previous.generation },
        );
      }
    }
    await ctx.db.patch(pending._id, {
      state: "active",
      activatedAt: args.currentTime,
    });
    await ctx.db.patch(owner._id, {
      activeGeneration: args.generation,
      pendingGeneration: undefined,
      lastActivityAt: args.currentTime,
      lifecycleState: "ready",
      preparationReason: undefined,
      leaseOwner: undefined,
      leaseUntil: undefined,
      leaseVersion: owner.leaseVersion + 1,
    });
    return safeLifecycleResult("ready", { lastActivityAt: args.currentTime });
  },
});

export const failPendingGeneration = internalMutation({
  args: {
    ownerKey: v.string(),
    generation: v.number(),
    leaseVersion: v.number(),
    currentTime: v.number(),
  },
  handler: async (ctx, args) => {
    const owner = await ownerByKey(ctx, args.ownerKey);
    const pending = await generationByNumber(
      ctx,
      args.ownerKey,
      args.generation,
    );
    if (pending?.state === "pending") {
      await ctx.db.patch(pending._id, {
        state: "failed",
        failedAt: args.currentTime,
        cleanupState: "pending",
        cleanupStage: 0,
        cleanupLeaseVersion: pending.cleanupLeaseVersion ?? 0,
        cleanupRetries: pending.cleanupRetries ?? 0,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.sandboxCleanup.runRetiredGenerationCleanup,
        { ownerKey: args.ownerKey, generation: pending.generation },
      );
    }
    if (
      owner !== null &&
      owner.pendingGeneration === args.generation &&
      owner.leaseVersion === args.leaseVersion
    ) {
      await ctx.db.patch(owner._id, {
        pendingGeneration: undefined,
        lifecycleState: "error",
        preparationReason: undefined,
        leaseOwner: undefined,
        leaseUntil: undefined,
        leaseVersion: owner.leaseVersion + 1,
      });
    }
    return safeLifecycleResult("error");
  },
});
