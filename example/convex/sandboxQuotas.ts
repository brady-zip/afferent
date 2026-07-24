import { ConvexError } from "convex/values";
import type { ComponentApi } from "afferent/_generated/component.js";

import { components } from "./_generated/api.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import { deriveLogicalSandboxKey } from "./sandboxScope.js";

export const SANDBOX_QUOTAS = {
  roots: {
    boards: 8,
    posts: 75,
    comments: 300,
    changelogEntries: 30,
    tags: 40,
    votes: 500,
    subscriptions: 500,
    notificationActivity: 1000,
    mergeWork: 100,
  },
  totalRecords: 2500,
  semanticBytes: 2_000_000,
  writesPerMinute: 120,
  resetAttemptsPerHour: 3,
} as const;

export type SandboxRootResource = keyof typeof SANDBOX_QUOTAS.roots;
export type SandboxQuotaResource =
  SandboxRootResource | "totalRecords" | "semanticBytes";

export interface SandboxQuotaUsage {
  complete: boolean;
  documentCount: number;
  semanticBytes: number;
  roots: Record<SandboxRootResource, number>;
}

export type SandboxQuotaError = Readonly<{
  contractVersion: 1;
  code: "SANDBOX_QUOTA_EXCEEDED";
  resource: SandboxQuotaResource;
  current: number;
  limit: number;
  recovery: string;
}>;

const sandboxComponent = components.sandbox as ComponentApi;
const RECOVERY =
  "Delete content to free space, or reset after the current rate-limit window.";
const WRITE_WINDOW_MS = 60_000;

function emptyUsage(): SandboxQuotaUsage {
  return {
    complete: true,
    documentCount: 0,
    semanticBytes: 0,
    roots: {
      boards: 0,
      posts: 0,
      comments: 0,
      changelogEntries: 0,
      tags: 0,
      votes: 0,
      subscriptions: 0,
      notificationActivity: 0,
      mergeWork: 0,
    },
  };
}

export function sumScopedUsage(
  generations: readonly SandboxQuotaUsage[],
): SandboxQuotaUsage {
  const total = emptyUsage();
  for (const generation of generations) {
    total.complete &&= generation.complete;
    total.documentCount += generation.documentCount;
    total.semanticBytes += generation.semanticBytes;
    for (const resource of Object.keys(total.roots) as SandboxRootResource[]) {
      total.roots[resource] += generation.roots[resource];
    }
  }
  return total;
}

function quotaError(
  resource: SandboxQuotaResource,
  current: number,
  limit: number,
): SandboxQuotaError {
  return {
    contractVersion: 1,
    code: "SANDBOX_QUOTA_EXCEEDED",
    resource,
    current,
    limit,
    recovery: RECOVERY,
  };
}

export function evaluateSandboxQuota(
  usage: SandboxQuotaUsage,
  expandingResource: SandboxQuotaResource,
): SandboxQuotaError | null {
  if (!usage.complete) {
    return quotaError(
      "totalRecords",
      SANDBOX_QUOTAS.totalRecords,
      SANDBOX_QUOTAS.totalRecords,
    );
  }
  if (
    expandingResource in SANDBOX_QUOTAS.roots &&
    usage.roots[expandingResource as SandboxRootResource] >=
      SANDBOX_QUOTAS.roots[expandingResource as SandboxRootResource]
  ) {
    const resource = expandingResource as SandboxRootResource;
    return quotaError(
      resource,
      usage.roots[resource],
      SANDBOX_QUOTAS.roots[resource],
    );
  }
  if (usage.documentCount >= SANDBOX_QUOTAS.totalRecords) {
    return quotaError(
      "totalRecords",
      usage.documentCount,
      SANDBOX_QUOTAS.totalRecords,
    );
  }
  if (usage.semanticBytes >= SANDBOX_QUOTAS.semanticBytes) {
    return quotaError(
      "semanticBytes",
      usage.semanticBytes,
      SANDBOX_QUOTAS.semanticBytes,
    );
  }
  return null;
}

type QuotaContext = Pick<QueryCtx | MutationCtx, "db" | "runQuery">;

export async function readLogicalSandboxUsage(
  ctx: QuotaContext,
  ownerKey: string,
) {
  const owner = await ctx.db
    .query("sandboxOwners")
    .withIndex("by_owner_key", (query) => query.eq("ownerKey", ownerKey))
    .unique();
  if (owner?.activeGeneration === undefined) {
    throw new Error("SANDBOX_NOT_READY");
  }
  const generations = await ctx.db
    .query("sandboxGenerations")
    .withIndex("by_owner_generation", (query) => query.eq("ownerKey", ownerKey))
    .take(65);
  if (generations.length > 64) {
    return {
      ...emptyUsage(),
      complete: false,
      documentCount: SANDBOX_QUOTAS.totalRecords,
    };
  }
  const snapshots: SandboxQuotaUsage[] = [];
  for (const generation of generations) {
    if (generation.cleanupState === "complete") continue;
    const snapshot = await ctx.runQuery(
      sandboxComponent.maintenance.sandbox.getScopedUsage,
      { scopeId: generation.physicalScopeId },
    );
    const seedEntities = await ctx.db
      .query("demoSeedEntities")
      .withIndex("by_scope_key", (query) =>
        query.eq("physicalScopeId", generation.physicalScopeId),
      )
      .take(129);
    const seedProgress = await ctx.db
      .query("demoSeedProgress")
      .withIndex("by_physical_scope", (query) =>
        query.eq("physicalScopeId", generation.physicalScopeId),
      )
      .unique();
    snapshots.push({
      complete: snapshot.complete,
      documentCount:
        snapshot.documentCount +
        seedEntities.length +
        (seedProgress === null ? 0 : 1),
      semanticBytes:
        snapshot.semanticBytes +
        seedEntities.reduce(
          (bytes, entity) => bytes + JSON.stringify(entity).length,
          0,
        ) +
        (seedProgress === null ? 0 : JSON.stringify(seedProgress).length),
      roots: snapshot.roots,
    });
    if (seedEntities.length > 128) snapshots.at(-1)!.complete = false;
  }
  return sumScopedUsage(snapshots);
}

export async function enforceSandboxQuota(
  ctx: MutationCtx,
  verifiedUserId: string,
  expandingResource: SandboxQuotaResource,
) {
  const ownerKey = await deriveLogicalSandboxKey(verifiedUserId);
  const rejected = evaluateSandboxQuota(
    await readLogicalSandboxUsage(ctx, ownerKey),
    expandingResource,
  );
  if (rejected !== null) throw new ConvexError(rejected);
  const owner = await ctx.db
    .query("sandboxOwners")
    .withIndex("by_owner_key", (query) => query.eq("ownerKey", ownerKey))
    .unique();
  if (owner?.activeGeneration === undefined) {
    throw new Error("SANDBOX_NOT_READY");
  }
  const currentTime = Date.now();
  const writeWindowStartedAt = owner.writeWindowStartedAt ?? currentTime;
  const inCurrentWindow = currentTime - writeWindowStartedAt < WRITE_WINDOW_MS;
  const writeCount = inCurrentWindow ? (owner.writeCount ?? 0) : 0;
  if (writeCount >= SANDBOX_QUOTAS.writesPerMinute) {
    throw new ConvexError({
      contractVersion: 1,
      code: "SANDBOX_WRITE_RATE_LIMITED",
      retryAfterMs: Math.max(
        1,
        WRITE_WINDOW_MS - (currentTime - writeWindowStartedAt),
      ),
      current: writeCount,
      limit: SANDBOX_QUOTAS.writesPerMinute,
      recovery: "Wait before making another sandbox change.",
    });
  }
  await ctx.db.patch(owner._id, {
    writeWindowStartedAt: inCurrentWindow ? writeWindowStartedAt : currentTime,
    writeCount: writeCount + 1,
  });
}
