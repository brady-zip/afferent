import type { Doc, Id } from "../_generated/dataModel.js";
import type { MutationCtx } from "../_generated/server.js";
import { INBOX_RETENTION_CAP } from "../model/notifications.js";

async function loadUnreadCounter(
  ctx: MutationCtx,
  scopeId: string,
  actorId: Id<"actors">,
) {
  return await ctx.db
    .query("notificationUnreadCounts")
    .withIndex("by_scope_actor", (q) =>
      q.eq("scopeId", scopeId).eq("actorId", actorId),
    )
    .unique();
}

async function adjustUnreadCount(
  ctx: MutationCtx,
  scopeId: string,
  actorId: Id<"actors">,
  delta: number,
) {
  const counter = await loadUnreadCounter(ctx, scopeId, actorId);
  if (counter) {
    await ctx.db.patch(counter._id, {
      count: Math.max(0, counter.count + delta),
    });
  } else {
    await ctx.db.insert("notificationUnreadCounts", {
      scopeId,
      actorId,
      count: Math.max(0, delta),
    });
  }
}

export async function reconcileUnreadCount(
  ctx: MutationCtx,
  scopeId: string,
  actorId: Id<"actors">,
) {
  const unread = await ctx.db
    .query("notificationInbox")
    .withIndex("by_scope_actor_unread", (q) =>
      q
        .eq("scopeId", scopeId)
        .eq("actorId", actorId)
        .eq("unreadKey", "unread"),
    )
    .take(INBOX_RETENTION_CAP + 1);
  if (unread.length > INBOX_RETENTION_CAP) {
    throw new Error("INBOX_RETENTION_INVARIANT");
  }
  const counter = await loadUnreadCounter(ctx, scopeId, actorId);
  if (counter) {
    await ctx.db.patch(counter._id, { count: unread.length });
  } else {
    await ctx.db.insert("notificationUnreadCounts", {
      scopeId,
      actorId,
      count: unread.length,
    });
  }
  return unread.length;
}

export async function enforceActorInboxRetention(
  ctx: MutationCtx,
  scopeId: string,
  actorId: Id<"actors">,
) {
  const rows = await ctx.db
    .query("notificationInbox")
    .withIndex("by_scope_actor_time", (q) =>
      q.eq("scopeId", scopeId).eq("actorId", actorId),
    )
    .order("asc")
    .take(INBOX_RETENTION_CAP + 1);
  const excess = Math.max(0, rows.length - INBOX_RETENTION_CAP);
  for (const row of rows.slice(0, excess)) {
    await ctx.db.delete(row._id);
    if (row.unreadKey === "unread") {
      await adjustUnreadCount(ctx, scopeId, actorId, -1);
    }
  }
}

export async function materializeInboxRecipient(
  ctx: MutationCtx,
  event: Doc<"notificationEvents">,
  actorId: Id<"actors">,
) {
  const actor = await ctx.db.get(actorId);
  if (!actor || actor.scopeId !== event.scopeId) return;
  const existing = await ctx.db
    .query("notificationInbox")
    .withIndex("by_scope_event_actor", (q) =>
      q
        .eq("scopeId", event.scopeId)
        .eq("eventId", event._id)
        .eq("actorId", actorId),
    )
    .unique();
  if (existing) return;
  const rowId = await ctx.db.insert("notificationInbox", {
    scopeId: event.scopeId,
    actorId,
    eventId: event._id,
    type: event.type,
    entityId: event.entityId,
    occurredAt: event.occurredAt,
    orderId: "pending",
    unreadKey: "unread",
  });
  await ctx.db.patch(rowId, { orderId: String(rowId) });
  await adjustUnreadCount(ctx, event.scopeId, actorId, 1);
  await enforceActorInboxRetention(ctx, event.scopeId, actorId);
}

export async function materializeRecipientRow(
  ctx: MutationCtx,
  recipient: Doc<"notificationEventRecipients">,
) {
  if (recipient.state === "materialized") return;
  const event = await ctx.db.get(recipient.eventId);
  if (!event || event.scopeId !== recipient.scopeId) {
    throw new Error("NOTIFICATION_EVENT_SCOPE_INVARIANT");
  }
  await materializeInboxRecipient(ctx, event, recipient.actorId);
  await ctx.db.patch(recipient._id, { state: "materialized" });
}
