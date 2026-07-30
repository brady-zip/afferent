import { v } from "convex/values";

import { mutation, query } from "../_generated/server.js";
import {
  resetActorParticipationLimits,
  resetScopeParticipationLimits,
} from "../model/rateLimits.js";
import { requireScope } from "../model/scope.js";

export const SCOPED_TABLE_DISPOSITIONS = {
  notificationEventRecipients: {
    scopeIndex: "by_scope_event_actor",
    usage: "activity",
    cleanupOrder: 0,
  },
  notificationDeliveries: {
    scopeIndex: "by_scope_event_actor",
    usage: "activity",
    cleanupOrder: 1,
  },
  notificationInbox: {
    scopeIndex: "by_scope_actor_time",
    usage: "activity",
    cleanupOrder: 2,
  },
  notificationUnreadCounts: {
    scopeIndex: "by_scope_actor",
    usage: "activity",
    cleanupOrder: 3,
  },
  notificationFanoutJobs: {
    scopeIndex: "by_scope_event",
    usage: "work",
    cleanupOrder: 4,
  },
  notificationEvents: {
    scopeIndex: "by_scope_guard",
    usage: "activity",
    cleanupOrder: 5,
  },
  mergeStages: {
    scopeIndex: "by_scope_job_original",
    usage: "work",
    cleanupOrder: 6,
  },
  mergeDeltas: {
    scopeIndex: "by_scope_job",
    usage: "work",
    cleanupOrder: 7,
  },
  mergeHistories: {
    scopeIndex: "by_scope_source",
    usage: "work",
    cleanupOrder: 8,
  },
  mergeJobs: {
    scopeIndex: "by_scope_state_created",
    usage: "work",
    cleanupOrder: 9,
  },
  tagCleanupJobs: {
    scopeIndex: "by_scope_state_created",
    usage: "work",
    cleanupOrder: 10,
  },
  postTagFeeds: {
    scopeIndex: "by_scope_post",
    usage: "derived",
    cleanupOrder: 11,
  },
  postTagSearches: {
    scopeIndex: "by_scope_post",
    usage: "derived",
    cleanupOrder: 12,
  },
  postTags: {
    scopeIndex: "by_scope_post_tag",
    usage: "derived",
    cleanupOrder: 13,
  },
  changelogNotificationGuards: {
    scopeIndex: "by_scope_entry_post",
    usage: "derived",
    cleanupOrder: 14,
  },
  changelogPostLinks: {
    scopeIndex: "by_scope_entry_order",
    usage: "derived",
    cleanupOrder: 15,
  },
  postSubscriptions: {
    scopeIndex: "by_scope_actor_post",
    usage: "root",
    cleanupOrder: 16,
  },
  votes: {
    scopeIndex: "by_scope_post_actor",
    usage: "root",
    cleanupOrder: 17,
  },
  comments: {
    scopeIndex: "by_scope_post",
    usage: "root",
    cleanupOrder: 18,
  },
  postActivity: {
    scopeIndex: "by_scope_post_occurred",
    usage: "activity",
    cleanupOrder: 19,
  },
  changelogEntries: {
    scopeIndex: "by_scope_created",
    usage: "root",
    cleanupOrder: 20,
  },
  tags: {
    scopeIndex: "by_scope_name",
    usage: "root",
    cleanupOrder: 21,
  },
  posts: {
    scopeIndex: "by_scope_visibility_created",
    usage: "root",
    cleanupOrder: 22,
  },
  boards: {
    scopeIndex: "by_scope_order",
    usage: "root",
    cleanupOrder: 23,
  },
  actors: {
    scopeIndex: "by_scope_external_key",
    usage: "identity",
    cleanupOrder: 24,
  },
  installations: {
    scopeIndex: "by_scope",
    usage: "installation",
    cleanupOrder: 25,
  },
} as const;

export type ScopedTableName = keyof typeof SCOPED_TABLE_DISPOSITIONS;

const TABLES_IN_CLEANUP_ORDER = (
  Object.entries(SCOPED_TABLE_DISPOSITIONS) as [
    ScopedTableName,
    (typeof SCOPED_TABLE_DISPOSITIONS)[ScopedTableName],
  ][]
).sort((left, right) => left[1].cleanupOrder - right[1].cleanupOrder);

export const SANDBOX_MAINTENANCE_TABLES = TABLES_IN_CLEANUP_ORDER.map(
  ([tableName]) => tableName,
);

export const SANDBOX_USAGE_DOCUMENT_BUDGET = 2501;
export const SANDBOX_CLEANUP_DOCUMENT_BUDGET = 50;

const rootUsageValidator = v.object({
  boards: v.number(),
  posts: v.number(),
  comments: v.number(),
  changelogEntries: v.number(),
  tags: v.number(),
  votes: v.number(),
  subscriptions: v.number(),
  notificationActivity: v.number(),
  mergeWork: v.number(),
});

const scopedUsageValidator = v.object({
  contractVersion: v.literal(1),
  complete: v.boolean(),
  scannedTableCount: v.number(),
  documentCount: v.number(),
  semanticBytes: v.number(),
  roots: rootUsageValidator,
});

interface RootUsage {
  boards: number;
  posts: number;
  comments: number;
  changelogEntries: number;
  tags: number;
  votes: number;
  subscriptions: number;
  notificationActivity: number;
  mergeWork: number;
}

function emptyRoots(): RootUsage {
  return {
    boards: 0,
    posts: 0,
    comments: 0,
    changelogEntries: 0,
    tags: 0,
    votes: 0,
    subscriptions: 0,
    notificationActivity: 0,
    mergeWork: 0,
  };
}

function addRootUsage(
  roots: RootUsage,
  tableName: ScopedTableName,
  count: number,
) {
  if (tableName === "boards") roots.boards += count;
  else if (tableName === "posts") roots.posts += count;
  else if (tableName === "comments") roots.comments += count;
  else if (tableName === "changelogEntries") {
    roots.changelogEntries += count;
  } else if (tableName === "tags") roots.tags += count;
  else if (tableName === "votes") roots.votes += count;
  else if (tableName === "postSubscriptions") roots.subscriptions += count;
  else {
    const usage = SCOPED_TABLE_DISPOSITIONS[tableName].usage;
    if (usage === "activity") roots.notificationActivity += count;
    if (usage === "work") roots.mergeWork += count;
  }
}

function semanticSize(document: unknown) {
  return new TextEncoder().encode(JSON.stringify(document)).byteLength;
}

/**
 * A host-only maintenance intent. Component functions are never browser
 * endpoints; the demo host resolves the physical scope and invokes this
 * bounded aggregate from trusted quota enforcement.
 */
export const getScopedUsage = query({
  args: {
    scopeId: v.string(),
    documentBudget: v.optional(v.number()),
  },
  returns: scopedUsageValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const requestedBudget = Math.floor(
      args.documentBudget ?? SANDBOX_USAGE_DOCUMENT_BUDGET,
    );
    const documentBudget = Math.max(
      1,
      Math.min(requestedBudget, SANDBOX_USAGE_DOCUMENT_BUDGET),
    );
    const roots = emptyRoots();
    let documentCount = 0;
    let semanticBytes = 0;
    let scannedTableCount = 0;

    for (const [tableName, disposition] of TABLES_IN_CLEANUP_ORDER) {
      const remaining = documentBudget - documentCount;
      const pageSize = Math.max(1, remaining + 1);
      const documents = await (
        ctx.db as unknown as {
          query: (table: string) => {
            withIndex: (
              index: string,
              range: (query: {
                eq: (field: string, value: string) => unknown;
              }) => unknown,
            ) => { take: (count: number) => Promise<unknown[]> };
          };
        }
      )
        .query(tableName)
        .withIndex(disposition.scopeIndex, (index) =>
          index.eq("scopeId", args.scopeId),
        )
        .take(pageSize);

      scannedTableCount += 1;
      documentCount += documents.length;
      addRootUsage(roots, tableName, documents.length);
      for (const document of documents) {
        semanticBytes += semanticSize(document);
      }
      if (documentCount > documentBudget) {
        return {
          contractVersion: 1 as const,
          complete: false,
          scannedTableCount,
          documentCount,
          semanticBytes,
          roots,
        };
      }
    }

    return {
      contractVersion: 1 as const,
      complete: true,
      scannedTableCount,
      documentCount,
      semanticBytes,
      roots,
    };
  },
});

const cleanupContinuationValidator = v.object({
  stage: v.number(),
  cursor: v.optional(v.string()),
});

const cleanupResultValidator = v.object({
  contractVersion: v.literal(1),
  done: v.boolean(),
  deleted: v.number(),
  continuation: v.optional(cleanupContinuationValidator),
});

/**
 * Deletes one indexed page from one explicit disposition. The host may only
 * call this after leasing a retired generation; callers cannot enumerate
 * documents or request an arbitrary table.
 */
export const cleanupScopeBatch = mutation({
  args: {
    scopeId: v.string(),
    continuation: v.optional(cleanupContinuationValidator),
    documentBudget: v.optional(v.number()),
  },
  returns: cleanupResultValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const stage = Math.max(0, Math.floor(args.continuation?.stage ?? 0));
    const documentBudget = Math.max(
      1,
      Math.min(
        Math.floor(args.documentBudget ?? SANDBOX_CLEANUP_DOCUMENT_BUDGET),
        SANDBOX_CLEANUP_DOCUMENT_BUDGET,
      ),
    );

    if (stage > TABLES_IN_CLEANUP_ORDER.length) {
      return {
        contractVersion: 1 as const,
        done: true,
        deleted: 0,
        continuation: { stage },
      };
    }
    if (stage === TABLES_IN_CLEANUP_ORDER.length) {
      await resetScopeParticipationLimits(ctx, args.scopeId);
      return {
        contractVersion: 1 as const,
        done: false,
        deleted: 0,
        continuation: { stage: stage + 1 },
      };
    }

    const [tableName, disposition] = TABLES_IN_CLEANUP_ORDER[stage]!;
    // Components do not support cursor pagination. Delete a bounded prefix and
    // revisit the same stage until the scope-leading index returns no rows.
    const documents = await (
      ctx.db as unknown as {
        query: (table: string) => {
          withIndex: (
            index: string,
            range: (query: {
              eq: (field: string, value: string) => unknown;
            }) => unknown,
          ) => { take: (count: number) => Promise<{ _id: string }[]> };
        };
      }
    )
      .query(tableName)
      .withIndex(disposition.scopeIndex, (index) =>
        index.eq("scopeId", args.scopeId),
      )
      .take(documentBudget);

    if (tableName === "actors") {
      for (const actor of documents) {
        await resetActorParticipationLimits(
          ctx,
          args.scopeId,
          String(actor._id),
        );
      }
    }
    for (const document of documents) {
      await ctx.db.delete(document._id as never);
    }

    return {
      contractVersion: 1 as const,
      done: false,
      deleted: documents.length,
      continuation: {
        stage: documents.length === 0 ? stage + 1 : stage,
      },
    };
  },
});
