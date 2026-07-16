import { v } from "convex/values";

import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import { internalMutation } from "../_generated/server.js";
import type { MutationCtx } from "../_generated/server.js";
import {
  dedupeNotificationRecipients,
  FANOUT_INLINE_LIMIT,
  MAX_EVENT_RECIPIENTS,
  type NotificationEventType,
} from "../model/notifications.js";
import { isAnonymizedExternalKey } from "../model/actors.js";
import { notificationEventTypeValidator } from "../validators.js";
import { materializeRecipientRow } from "./fanout.js";

async function scheduleFanout(ctx: MutationCtx, jobId: Id<"notificationFanoutJobs">) {
  await ctx.scheduler.runAfter(0, internal.jobs.fanout.continueFanout, {
    jobId: String(jobId),
  });
}

export async function listCurrentSubscriberActorIds(
  ctx: MutationCtx,
  scopeId: string,
  postId: Id<"posts">,
) {
  const rows = await ctx.db
    .query("postSubscriptions")
    .withIndex("by_scope_post_state_actor", (q) =>
      q
        .eq("scopeId", scopeId)
        .eq("postId", postId)
        .eq("state", "subscribed"),
    )
    .take(MAX_EVENT_RECIPIENTS + 1);
  if (rows.length > MAX_EVENT_RECIPIENTS) {
    throw new Error("NOTIFICATION_RECIPIENT_LIMIT_EXCEEDED");
  }
  return rows.map((row) => row.actorId);
}

export async function captureNotificationEvent(
  ctx: MutationCtx,
  args: {
    scopeId: string;
    type: NotificationEventType;
    initiatorActorId: Id<"actors">;
    postId?: Id<"posts">;
    entityId: string;
    guardKey: string;
    subscriberActorIds?: readonly Id<"actors">[];
    replyActorId?: Id<"actors">;
    mentionActorIds?: readonly Id<"actors">[];
  },
) {
  const existing = await ctx.db
    .query("notificationEvents")
    .withIndex("by_scope_guard", (q) =>
      q.eq("scopeId", args.scopeId).eq("guardKey", args.guardKey),
    )
    .unique();
  if (existing) return { eventId: existing._id, jobId: undefined };

  const candidateIds = dedupeNotificationRecipients({
    initiatorActorId: String(args.initiatorActorId),
    subscriberActorIds: args.subscriberActorIds?.map(String),
    ...(args.replyActorId === undefined
      ? {}
      : { replyActorId: String(args.replyActorId) }),
    mentionActorIds: args.mentionActorIds?.map(String),
  });
  const recipients: Id<"actors">[] = [];
  for (const value of candidateIds) {
    const actorId = ctx.db.normalizeId("actors", value);
    if (!actorId) continue;
    const actor = await ctx.db.get(actorId);
    if (
      actor &&
      actor.scopeId === args.scopeId &&
      !isAnonymizedExternalKey(actor.externalKey)
    ) {
      recipients.push(actorId);
    }
  }
  if (recipients.length === 0) return { eventId: undefined, jobId: undefined };

  const occurredAt = Date.now();
  const eventId = await ctx.db.insert("notificationEvents", {
    scopeId: args.scopeId,
    type: args.type,
    initiatorActorId: args.initiatorActorId,
    ...(args.postId === undefined ? {} : { postId: args.postId }),
    entityId: args.entityId,
    occurredAt,
    guardKey: args.guardKey,
  });
  const recipientRows: Id<"notificationEventRecipients">[] = [];
  for (const actorId of recipients) {
    recipientRows.push(
      await ctx.db.insert("notificationEventRecipients", {
        scopeId: args.scopeId,
        eventId,
        actorId,
        state: "pending",
      }),
    );
  }

  if (recipientRows.length <= FANOUT_INLINE_LIMIT) {
    for (const recipientId of recipientRows) {
      const recipient = await ctx.db.get(recipientId);
      if (recipient) await materializeRecipientRow(ctx, recipient);
    }
    return { eventId, jobId: undefined };
  }
  const jobId = await ctx.db.insert("notificationFanoutJobs", {
    scopeId: args.scopeId,
    eventId,
    state: "pending",
    createdAt: occurredAt,
  });
  await scheduleFanout(ctx, jobId);
  return { eventId, jobId };
}

export const captureTestEvent = internalMutation({
  args: {
    scopeId: v.string(),
    initiatorActorId: v.string(),
    postId: v.string(),
    type: notificationEventTypeValidator,
  },
  returns: v.object({ eventId: v.string(), jobId: v.string() }),
  handler: async (ctx, args) => {
    const initiatorActorId = ctx.db.normalizeId("actors", args.initiatorActorId);
    const postId = ctx.db.normalizeId("posts", args.postId);
    if (!initiatorActorId || !postId) throw new Error("INVALID_TEST_EVENT");
    const subscriberActorIds = await listCurrentSubscriberActorIds(
      ctx,
      args.scopeId,
      postId,
    );
    const result = await captureNotificationEvent(ctx, {
      scopeId: args.scopeId,
      type: args.type,
      initiatorActorId,
      postId,
      entityId: String(postId),
      guardKey: `test:${postId}:${args.type}`,
      subscriberActorIds,
    });
    if (!result.eventId || !result.jobId) throw new Error("TEST_EVENT_NOT_QUEUED");
    return { eventId: String(result.eventId), jobId: String(result.jobId) };
  },
});
