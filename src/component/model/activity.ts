import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { toActorDto } from "./views.js";
import { fenceActiveMergeWrite } from "./merge.js";

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
    changelogEntryId?: Doc<"changelogEntries">["_id"];
  },
) {
  const [fromBoard, toBoard, tag, changelog] = await Promise.all([
    args.fromBoardId === undefined ? null : ctx.db.get(args.fromBoardId),
    args.toBoardId === undefined ? null : ctx.db.get(args.toBoardId),
    args.tagId === undefined ? null : ctx.db.get(args.tagId),
    args.changelogEntryId === undefined
      ? null
      : ctx.db.get(args.changelogEntryId),
  ]);
  const id = await ctx.db.insert("postActivity", {
    ...args,
    ...(fromBoard?.scopeId === args.scopeId
      ? { fromBoardSnapshot: { name: fromBoard.name, slug: fromBoard.slug } }
      : {}),
    ...(toBoard?.scopeId === args.scopeId
      ? { toBoardSnapshot: { name: toBoard.name, slug: toBoard.slug } }
      : {}),
    ...(tag?.scopeId === args.scopeId
      ? { tagSnapshot: { name: tag.name } }
      : {}),
    ...(changelog?.scopeId === args.scopeId
      ? { changelogSnapshot: { title: changelog.title, slug: changelog.slug } }
      : {}),
    occurredAt: Date.now(),
  });
  await fenceActiveMergeWrite(ctx, {
    scopeId: args.scopeId,
    postId: args.postId,
    writes: [
      { kind: "activity", originalId: String(id), logicalKey: String(id) },
    ],
  });
  return id;
}

export async function toPostActivityDto(
  ctx: QueryCtx,
  activity: Doc<"postActivity">,
) {
  const [actor, fromBoard, toBoard, tag, changelog] = await Promise.all([
    activity.actorId === undefined ? null : ctx.db.get(activity.actorId),
    activity.fromBoardId === undefined ? null : ctx.db.get(activity.fromBoardId),
    activity.toBoardId === undefined ? null : ctx.db.get(activity.toBoardId),
    activity.tagId === undefined ? null : ctx.db.get(activity.tagId),
    activity.changelogEntryId === undefined
      ? null
      : ctx.db.get(activity.changelogEntryId),
  ]);
  if (actor && actor.scopeId !== activity.scopeId) {
    throw new ConvexError({ code: "INVARIANT_VIOLATION" });
  }
  return {
    contractVersion: 2 as const,
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
      : {
          fromBoard: {
            contractVersion: 1 as const,
            ...(activity.fromBoardSnapshot ??
              (fromBoard?.scopeId === activity.scopeId
                ? { name: fromBoard.name, slug: fromBoard.slug }
                : { name: "Deleted board", slug: "deleted-board" })),
          },
        }),
    ...(activity.toBoardId === undefined
      ? {}
      : {
          toBoard: {
            contractVersion: 1 as const,
            ...(activity.toBoardSnapshot ??
              (toBoard?.scopeId === activity.scopeId
                ? { name: toBoard.name, slug: toBoard.slug }
                : { name: "Deleted board", slug: "deleted-board" })),
          },
        }),
    ...(activity.tagId === undefined
      ? {}
      : {
          tag: {
            contractVersion: 1 as const,
            ...(activity.tagSnapshot ??
              (tag?.scopeId === activity.scopeId
                ? { name: tag.name }
                : { name: "Deleted tag" })),
          },
        }),
    ...(activity.changelogEntryId === undefined
      ? {}
      : {
          changelog: {
            contractVersion: 1 as const,
            ...(activity.changelogSnapshot ??
              (changelog?.scopeId === activity.scopeId
                ? { title: changelog.title, slug: changelog.slug }
                : {
                    title: "Unavailable changelog entry",
                    slug: "unavailable-changelog-entry",
                  })),
          },
        }),
  };
}
