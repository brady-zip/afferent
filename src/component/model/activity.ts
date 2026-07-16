import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { toActorDto } from "./views.js";

export type ActivityType = Doc<"postActivity">["type"];

export async function appendPostActivity(
  ctx: MutationCtx,
  args: {
    scopeId: string;
    postId: Doc<"posts">["_id"];
    actorId?: Doc<"actors">["_id"];
    type: ActivityType;
    changedFields?: string[];
    fromStatus?: string;
    toStatus?: string;
    fromBoardId?: Doc<"boards">["_id"];
    toBoardId?: Doc<"boards">["_id"];
    tagId?: Doc<"tags">["_id"];
  },
) {
  return await ctx.db.insert("postActivity", {
    ...args,
    occurredAt: Date.now(),
  });
}

export async function toPostActivityDto(
  ctx: QueryCtx,
  activity: Doc<"postActivity">,
) {
  const actor =
    activity.actorId === undefined ? null : await ctx.db.get(activity.actorId);
  if (actor && actor.scopeId !== activity.scopeId) {
    throw new ConvexError({ code: "INVARIANT_VIOLATION" });
  }
  return {
    contractVersion: 1 as const,
    id: String(activity._id),
    postId: String(activity.postId),
    type: activity.type,
    occurredAt: activity.occurredAt,
    ...(actor ? { actor: toActorDto(actor) } : {}),
    ...(activity.changedFields === undefined
      ? {}
      : { changedFields: activity.changedFields }),
    ...(activity.fromStatus === undefined
      ? {}
      : { fromStatus: activity.fromStatus as Doc<"posts">["statusKey"] }),
    ...(activity.toStatus === undefined
      ? {}
      : { toStatus: activity.toStatus as Doc<"posts">["statusKey"] }),
    ...(activity.fromBoardId === undefined
      ? {}
      : { fromBoardId: String(activity.fromBoardId) }),
    ...(activity.toBoardId === undefined
      ? {}
      : { toBoardId: String(activity.toBoardId) }),
    ...(activity.tagId === undefined ? {} : { tagId: String(activity.tagId) }),
  };
}
