import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel.js";
import { mutation } from "../_generated/server.js";
import type { MutationCtx } from "../_generated/server.js";
import { isAnonymizedExternalKey } from "../model/actors.js";
import { invalidInput } from "../model/errors.js";
import { requireScope } from "../model/scope.js";
import {
  deliveryBatchDtoValidator,
  deliveryOperationResultValidator,
} from "../validators.js";

export const DELIVERY_CLAIM_LIMIT = 50;
export const DELIVERY_LEASE_MS = 5 * 60 * 1000;
export const DELIVERY_MAX_ATTEMPTS = 8;
export const DELIVERY_BACKOFF_BASE_MS = 30_000;
export const DELIVERY_BACKOFF_MAX_MS = 3_600_000;

type DeliveryRow = Doc<"notificationDeliveries">;

export async function materializeDeliveryRecipient(
  ctx: MutationCtx,
  event: Doc<"notificationEvents">,
  actorId: Id<"actors">,
) {
  const existing = await ctx.db
    .query("notificationDeliveries")
    .withIndex("by_scope_event_actor", (q) =>
      q
        .eq("scopeId", event.scopeId)
        .eq("eventId", event._id)
        .eq("actorId", actorId),
    )
    .unique();
  if (existing) return existing._id;
  return await ctx.db.insert("notificationDeliveries", {
    scopeId: event.scopeId,
    eventId: event._id,
    actorId,
    type: event.type,
    entityId: event.entityId,
    occurredAt: event.occurredAt,
    sequence: event.occurredAt,
    state: "pending",
    availableAt: event.occurredAt,
    attempts: 0,
    leaseVersion: 0,
  });
}

function leaseLost() {
  return {
    contractVersion: 1 as const,
    ok: false as const,
    error: { code: "LEASE_LOST" as const },
  };
}

function validLease(
  row: DeliveryRow | null,
  args: { scopeId: string; leaseOwner: string; leaseVersion: number },
): row is DeliveryRow {
  return Boolean(
    row &&
      row.scopeId === args.scopeId &&
      row.state === "leased" &&
      row.leaseOwner === args.leaseOwner &&
      row.leaseVersion === args.leaseVersion,
  );
}

async function claimRow(
  ctx: MutationCtx,
  row: DeliveryRow,
  args: { leaseOwner: string; now: number },
) {
  const actor = await ctx.db.get(row.actorId);
  if (
    !actor ||
    actor.scopeId !== row.scopeId ||
    isAnonymizedExternalKey(actor.externalKey)
  ) {
    await ctx.db.delete(row._id);
    return null;
  }
  const leaseVersion = row.leaseVersion + 1;
  const leaseUntil = args.now + DELIVERY_LEASE_MS;
  await ctx.db.patch(row._id, {
    state: "leased",
    leaseOwner: args.leaseOwner,
    leaseUntil,
    leaseVersion,
  });
  return {
    contractVersion: 1 as const,
    id: String(row._id),
    event: {
      contractVersion: 1 as const,
      eventId: String(row.eventId),
      type: row.type,
      entityId: row.entityId,
      sequence: row.sequence,
      occurredAt: row.occurredAt,
      recipientKey: actor.externalKey,
    },
    leaseOwner: args.leaseOwner,
    leaseVersion,
    leaseUntil,
    attempts: row.attempts,
  };
}

export const claimDeliveryBatch = mutation({
  args: {
    scopeId: v.string(),
    leaseOwner: v.string(),
    limit: v.number(),
  },
  returns: deliveryBatchDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const leaseOwner = args.leaseOwner.trim();
    if (!leaseOwner || leaseOwner.length > 200) {
      invalidInput("leaseOwner must contain between 1 and 200 characters");
    }
    if (!Number.isSafeInteger(args.limit) || args.limit < 1) {
      invalidInput("delivery claim limit must be a positive integer");
    }
    const limit = Math.min(args.limit, DELIVERY_CLAIM_LIMIT);
    const now = Date.now();
    const pending = await ctx.db
      .query("notificationDeliveries")
      .withIndex("by_scope_state_available", (q) =>
        q
          .eq("scopeId", args.scopeId)
          .eq("state", "pending")
          .lte("availableAt", now),
      )
      .take(limit);
    const expired =
      pending.length >= limit
        ? []
        : await ctx.db
            .query("notificationDeliveries")
            .withIndex("by_scope_state_lease", (q) =>
              q
                .eq("scopeId", args.scopeId)
                .eq("state", "leased")
                .lte("leaseUntil", now),
            )
            .take(limit - pending.length);
    const leases = [];
    for (const row of [...pending, ...expired]) {
      const lease = await claimRow(ctx, row, { leaseOwner, now });
      if (lease) leases.push(lease);
    }
    return { contractVersion: 1 as const, leases };
  },
});

export const ackDelivery = mutation({
  args: {
    scopeId: v.string(),
    deliveryId: v.string(),
    leaseOwner: v.string(),
    leaseVersion: v.number(),
  },
  returns: deliveryOperationResultValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const deliveryId = ctx.db.normalizeId(
      "notificationDeliveries",
      args.deliveryId,
    );
    const row = deliveryId ? await ctx.db.get(deliveryId) : null;
    if (!validLease(row, args)) return leaseLost();
    await ctx.db.patch(row._id, {
      state: "acked",
      ackedAt: Date.now(),
      leaseOwner: undefined,
      leaseUntil: undefined,
    });
    return { contractVersion: 1 as const, ok: true as const, status: "acked" as const };
  },
});

export const releaseDelivery = mutation({
  args: {
    scopeId: v.string(),
    deliveryId: v.string(),
    leaseOwner: v.string(),
    leaseVersion: v.number(),
  },
  returns: deliveryOperationResultValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const deliveryId = ctx.db.normalizeId(
      "notificationDeliveries",
      args.deliveryId,
    );
    const row = deliveryId ? await ctx.db.get(deliveryId) : null;
    if (!validLease(row, args)) return leaseLost();
    const attempts = row.attempts + 1;
    if (attempts >= DELIVERY_MAX_ATTEMPTS) {
      await ctx.db.patch(row._id, {
        state: "dead_letter",
        attempts,
        deadLetterAt: Date.now(),
        leaseOwner: undefined,
        leaseUntil: undefined,
      });
      return {
        contractVersion: 1 as const,
        ok: true as const,
        status: "dead_letter" as const,
      };
    }
    const availableAt =
      Date.now() +
      Math.min(
        DELIVERY_BACKOFF_MAX_MS,
        DELIVERY_BACKOFF_BASE_MS * 2 ** (attempts - 1),
      );
    await ctx.db.patch(row._id, {
      state: "pending",
      attempts,
      availableAt,
      leaseOwner: undefined,
      leaseUntil: undefined,
    });
    return {
      contractVersion: 1 as const,
      ok: true as const,
      status: "pending" as const,
      availableAt,
    };
  },
});
