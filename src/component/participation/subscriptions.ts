import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel.js";
import { mutation, query } from "../_generated/server.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { upsertActor } from "../model/actors.js";
import { consumeParticipationLimit } from "../model/rateLimits.js";
import { requirePostInScope, requireScope } from "../model/scope.js";
import { isPostPubliclyVisible } from "../model/visibility.js";
import {
  participationFailureValidator,
  postSubscriptionDtoValidator,
  verifiedActorValidator,
} from "../validators.js";
import {
  fenceActiveMergeWrite,
  resolveMergeWritePost,
} from "../model/merge.js";

type DatabaseCtx = Pick<QueryCtx | MutationCtx, "db">;

async function findActorByExternalKey(
  ctx: DatabaseCtx,
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

export async function findSubscription(
  ctx: DatabaseCtx,
  args: {
    scopeId: string;
    postId: Id<"posts">;
    actorId: Id<"actors">;
  },
) {
  return await ctx.db
    .query("postSubscriptions")
    .withIndex("by_scope_post_actor", (q) =>
      q
        .eq("scopeId", args.scopeId)
        .eq("postId", args.postId)
        .eq("actorId", args.actorId),
    )
    .unique();
}

export async function ensureAutoSubscription(
  ctx: MutationCtx,
  args: {
    scopeId: string;
    postId: Id<"posts">;
    actorId: Id<"actors">;
  },
) {
  const existing = await findSubscription(ctx, args);
  if (existing?.state === "opted_out" || existing?.state === "subscribed") {
    return existing;
  }
  const id = await ctx.db.insert("postSubscriptions", {
    ...args,
    state: "subscribed",
    updatedAt: Date.now(),
  });
  await fenceActiveMergeWrite(ctx, {
    scopeId: args.scopeId,
    postId: args.postId,
    writes: [
      {
        kind: "subscription",
        originalId: String(id),
        logicalKey: String(args.actorId),
      },
    ],
  });
  return (await ctx.db.get(id))!;
}

function toSubscriptionDto(
  postId: string | Id<"posts">,
  row: Doc<"postSubscriptions"> | null,
) {
  return {
    contractVersion: 1 as const,
    postId: String(postId),
    subscribed: row?.state === "subscribed",
    explicitOptOut: row?.state === "opted_out",
  };
}

export const getPostSubscription = query({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
  },
  returns: postSubscriptionDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const post = await resolveMergeWritePost(ctx, args.scopeId, args.postId);
    if (!isPostPubliclyVisible(post)) {
      return toSubscriptionDto(post._id, null);
    }
    const actor = await findActorByExternalKey(
      ctx,
      args.scopeId,
      args.actor.externalKey,
    );
    const row = actor
      ? await findSubscription(ctx, {
          scopeId: args.scopeId,
          postId: post._id,
          actorId: actor._id,
        })
      : null;
    return toSubscriptionDto(post._id, row);
  },
});

export const setSubscription = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    desired: v.boolean(),
  },
  returns: v.union(postSubscriptionDtoValidator, participationFailureValidator),
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const post = await requirePostInScope(ctx, args.scopeId, args.postId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const limited = await consumeParticipationLimit(ctx, {
      operation: "subscribe",
      actorKey: String(actorId),
      scopeId: args.scopeId,
    });
    if (limited) return limited;
    const existing = await findSubscription(ctx, {
      scopeId: args.scopeId,
      postId: post._id,
      actorId,
    });
    const state = args.desired ? "subscribed" : "opted_out";
    if (existing) {
      if (existing.state !== state) {
        await ctx.db.patch(existing._id, { state, updatedAt: Date.now() });
        await fenceActiveMergeWrite(ctx, {
          scopeId: args.scopeId,
          postId: post._id,
          writes: [
            {
              kind: "subscription",
              originalId: String(existing._id),
              logicalKey: String(actorId),
            },
          ],
        });
      }
      return toSubscriptionDto(post._id, { ...existing, state });
    }
    const id = await ctx.db.insert("postSubscriptions", {
      scopeId: args.scopeId,
      postId: post._id,
      actorId,
      state,
      updatedAt: Date.now(),
    });
    await fenceActiveMergeWrite(ctx, {
      scopeId: args.scopeId,
      postId: post._id,
      writes: [
        {
          kind: "subscription",
          originalId: String(id),
          logicalKey: String(actorId),
        },
      ],
    });
    return toSubscriptionDto(post._id, (await ctx.db.get(id))!);
  },
});
