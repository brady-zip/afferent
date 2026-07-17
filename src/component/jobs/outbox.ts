import { v } from "convex/values";

import { internalMutation } from "../_generated/server.js";
import { requireScope } from "../model/scope.js";

export const OUTBOX_PRUNE_BATCH_SIZE = 50;

export const pruneAckedDeliveries = internalMutation({
  args: { scopeId: v.string(), before: v.number() },
  returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const rows = await ctx.db
      .query("notificationDeliveries")
      .withIndex("by_scope_state_acked", (q) =>
        q
          .eq("scopeId", args.scopeId)
          .eq("state", "acked")
          .lte("ackedAt", args.before),
      )
      .take(OUTBOX_PRUNE_BATCH_SIZE + 1);
    for (const row of rows.slice(0, OUTBOX_PRUNE_BATCH_SIZE)) {
      await ctx.db.delete(row._id);
    }
    return {
      deleted: Math.min(rows.length, OUTBOX_PRUNE_BATCH_SIZE),
      hasMore: rows.length > OUTBOX_PRUNE_BATCH_SIZE,
    };
  },
});
