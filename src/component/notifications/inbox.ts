import { paginationOptsValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import { v } from "convex/values";

import type { Doc } from "../_generated/dataModel.js";
import { internalMutation, mutation, query } from "../_generated/server.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { upsertActor } from "../model/actors.js";
import { invalidInput, notFound } from "../model/errors.js";
import { requireScope } from "../model/scope.js";
import { toActorDto } from "../model/views.js";
import schema from "../schema.js";
import {
  notificationDtoValidator,
  notificationPageDtoValidator,
  unreadNotificationCountDtoValidator,
  verifiedActorValidator,
} from "../validators.js";
import {
  enforceActorInboxRetention,
  reconcileUnreadCount,
} from "./fanout.js";

const MAX_NOTIFICATION_PAGE_SIZE = 50;

async function findActor(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  scopeId: string,
  externalKey: string,
) {
  return await ctx.db
    .query("actors")
    .withIndex("by_scope_external_key", (q) =>
      q.eq("scopeId", scopeId).eq("externalKey", externalKey),
    )
    .unique();
}

async function toNotificationDto(
  ctx: QueryCtx | MutationCtx,
  row: Doc<"notificationInbox">,
) {
  const event = await ctx.db.get(row.eventId);
  const initiator = event
    ? await ctx.db.get(event.initiatorActorId)
    : null;
  if (
    !event ||
    event.scopeId !== row.scopeId ||
    !initiator ||
    initiator.scopeId !== row.scopeId
  ) {
    throw new Error("NOTIFICATION_INBOX_SCOPE_INVARIANT");
  }
  return {
    contractVersion: 1 as const,
    id: String(row._id),
    eventId: String(row.eventId),
    type: row.type,
    entityId: row.entityId,
    occurredAt: row.occurredAt,
    read: row.unreadKey === "read",
    initiator: toActorDto(initiator),
  };
}

export const listNotifications = query({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: notificationPageDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    if (
      args.paginationOpts.numItems < 1 ||
      args.paginationOpts.numItems > MAX_NOTIFICATION_PAGE_SIZE
    ) {
      invalidInput(
        `pagination numItems must be between 1 and ${MAX_NOTIFICATION_PAGE_SIZE}`,
      );
    }
    const actor = await findActor(ctx, args.scopeId, args.actor.externalKey);
    if (!actor) {
      return {
        contractVersion: 1 as const,
        page: [],
        notifications: [],
        isDone: true,
        continueCursor: args.paginationOpts.cursor ?? "",
      };
    }
    const result = await paginator(ctx.db, schema)
      .query("notificationInbox")
      .withIndex("by_scope_actor_time", (q) =>
        q.eq("scopeId", args.scopeId).eq("actorId", actor._id),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map((row) => toNotificationDto(ctx, row)),
    );
    return {
      contractVersion: 1 as const,
      ...result,
      page,
      notifications: page,
    };
  },
});

export const getUnreadCount = query({
  args: { scopeId: v.string(), actor: verifiedActorValidator },
  returns: unreadNotificationCountDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const actor = await findActor(ctx, args.scopeId, args.actor.externalKey);
    if (!actor) return { contractVersion: 1 as const, count: 0 };
    const counter = await ctx.db
      .query("notificationUnreadCounts")
      .withIndex("by_scope_actor", (q) =>
        q.eq("scopeId", args.scopeId).eq("actorId", actor._id),
      )
      .unique();
    return { contractVersion: 1 as const, count: counter?.count ?? 0 };
  },
});

export const markNotificationRead = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    notificationId: v.string(),
  },
  returns: notificationDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const notificationId = ctx.db.normalizeId(
      "notificationInbox",
      args.notificationId,
    );
    if (!notificationId) notFound("notification");
    const row = await ctx.db.get(notificationId);
    if (
      !row ||
      row.scopeId !== args.scopeId ||
      row.actorId !== actorId
    ) {
      notFound("notification");
    }
    if (row.unreadKey === "unread") {
      await ctx.db.patch(row._id, {
        unreadKey: "read",
        readAt: Date.now(),
      });
      await reconcileUnreadCount(ctx, args.scopeId, actorId);
      return await toNotificationDto(ctx, {
        ...row,
        unreadKey: "read",
        readAt: Date.now(),
      });
    }
    return await toNotificationDto(ctx, row);
  },
});

export const enforceInboxRetention = internalMutation({
  args: { scopeId: v.string(), actorId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actorId = ctx.db.normalizeId("actors", args.actorId);
    if (!actorId) return null;
    const actor = await ctx.db.get(actorId);
    if (!actor || actor.scopeId !== args.scopeId) return null;
    await enforceActorInboxRetention(ctx, args.scopeId, actorId);
    await reconcileUnreadCount(ctx, args.scopeId, actorId);
    return null;
  },
});
