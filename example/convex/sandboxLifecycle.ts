import { v } from "convex/values";

import {
  deriveLogicalSandboxKey,
  derivePhysicalSandboxScope,
} from "./sandboxScope.js";

export const SANDBOX_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1_000;

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
  | "signed_out"
  | "preparing"
  | "ready"
  | "resetting"
  | "expired"
  | "error";

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

type GenerationRecord = {
  generation: number;
  physicalScopeId: string;
  state: GenerationState;
  createdAt: number;
  activatedAt?: number;
  retiredAt?: number;
  failedAt?: number;
  leaseVersion: number;
};

type OwnerRecord = {
  logicalOwnerKey: string;
  activeGeneration: number | null;
  pendingGeneration: number | null;
  nextGeneration: number;
  lastActivityAt: number;
  leaseVersion: number;
  generations: Map<number, GenerationRecord>;
};

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
    reason: PreparationReason,
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
      owner.lastActivityAt = now();
      return readyResult(owner);
    }
    return startPreparation(owner, "first_access");
  }

  async function reset(verifiedUserId: string) {
    const owner = ownerFor(await identify(verifiedUserId));
    const current = inFlight.get(owner.logicalOwnerKey);
    if (current !== undefined) return current;
    return startPreparation(
      owner,
      owner.activeGeneration === null ? "first_access" : "reset",
    );
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
