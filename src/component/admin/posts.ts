import { v } from "convex/values";

import { mutation } from "../_generated/server.js";
import { appendPostActivity } from "../model/activity.js";
import { upsertActor } from "../model/actors.js";
import { normalizePlainText, validateSafeMarkdown } from "../model/content.js";
import { invalidInput } from "../model/errors.js";
import { patchPostRanking } from "../model/scoring.js";
import {
  requireBoardInScope,
  requirePostInScope,
  requireScope,
} from "../model/scope.js";
import {
  HIDDEN_POST_VISIBILITY,
  isPostPubliclyVisible,
  PUBLIC_POST_VISIBILITY,
} from "../model/visibility.js";
import { toFeedbackPostDto } from "../model/views.js";
import {
  feedbackPostDtoValidator,
  postStatusKeyValidator,
  verifiedActorValidator,
} from "../validators.js";
import {
  captureNotificationEvent,
  listCurrentSubscriberActorIds,
} from "../notifications/events.js";

async function loadAdminPost(
  ctx: Parameters<typeof requirePostInScope>[0],
  scopeId: string,
  postId: string,
) {
  requireScope(scopeId);
  return await requirePostInScope(ctx, scopeId, postId);
}

export const editPost = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  returns: feedbackPostDtoValidator,
  handler: async (ctx, args) => {
    const post = await loadAdminPost(ctx, args.scopeId, args.postId);
    if (args.title === undefined && args.body === undefined) {
      invalidInput("at least one editable field is required");
    }
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const title =
      args.title === undefined
        ? post.title
        : normalizePlainText(args.title, "title");
    const body =
      args.body === undefined
        ? post.body
        : validateSafeMarkdown(args.body, "body");
    const changedFields = [
      ...(title === post.title ? [] : ["title"]),
      ...(body === post.body ? [] : ["body"]),
    ];
    await ctx.db.patch(post._id, {
      title,
      body,
      searchText: `${title}\n${body}`,
    });
    const searches = await ctx.db
      .query("postTagSearches")
      .withIndex("by_scope_post", (q) =>
        q.eq("scopeId", args.scopeId).eq("postId", post._id),
      )
      .take(21);
    if (searches.length > 20) invalidInput("posts may have at most 20 tags");
    await Promise.all(
      searches.map((row) =>
        ctx.db.patch(row._id, { searchText: `${title}\n${body}` }),
      ),
    );
    await appendPostActivity(ctx, {
      scopeId: args.scopeId,
      postId: post._id,
      actorId,
      type: "edit",
      changedFields,
    });
    return await toFeedbackPostDto(ctx, {
      ...post,
      title,
      body,
      searchText: `${title}\n${body}`,
    });
  },
});

export const movePost = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    boardId: v.string(),
  },
  returns: feedbackPostDtoValidator,
  handler: async (ctx, args) => {
    const post = await loadAdminPost(ctx, args.scopeId, args.postId);
    const board = await requireBoardInScope(ctx, args.scopeId, args.boardId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const updated = await patchPostRanking(ctx, post, { boardId: board._id });
    if (post.boardId !== board._id)
      await appendPostActivity(ctx, {
        scopeId: args.scopeId,
        postId: post._id,
        actorId,
        type: "board_move",
        fromBoardId: post.boardId,
        toBoardId: board._id,
      });
    return await toFeedbackPostDto(ctx, updated);
  },
});

export const setPostStatus = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    status: postStatusKeyValidator,
  },
  returns: feedbackPostDtoValidator,
  handler: async (ctx, args) => {
    const post = await loadAdminPost(ctx, args.scopeId, args.postId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const now = Date.now();
    const updated = await patchPostRanking(ctx, post, {
      statusKey: args.status,
    });
    if (post.statusKey !== args.status) {
      await ctx.db.patch(post._id, { currentStatusSince: now });
      await appendPostActivity(ctx, {
        scopeId: args.scopeId,
        postId: post._id,
        actorId,
        type: "status_change",
        fromStatus: post.statusKey,
        toStatus: args.status,
      });
      if (isPostPubliclyVisible(post)) {
        const subscriberActorIds = await listCurrentSubscriberActorIds(
          ctx,
          args.scopeId,
          post._id,
        );
        await captureNotificationEvent(ctx, {
          scopeId: args.scopeId,
          type: "status_changed",
          initiatorActorId: actorId,
          postId: post._id,
          entityId: String(post._id),
          guardKey: `status:${post._id}:${args.status}:${now}`,
          subscriberActorIds,
        });
      }
    }
    return await toFeedbackPostDto(ctx, {
      ...updated,
      currentStatusSince:
        post.statusKey === args.status ? post.currentStatusSince : now,
    });
  },
});

export const setDiscussionLock = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    locked: v.boolean(),
  },
  returns: feedbackPostDtoValidator,
  handler: async (ctx, args) => {
    const post = await loadAdminPost(ctx, args.scopeId, args.postId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    if ((post.discussionLocked ?? false) !== args.locked) {
      await ctx.db.patch(post._id, { discussionLocked: args.locked });
      await appendPostActivity(ctx, {
        scopeId: args.scopeId,
        postId: post._id,
        actorId,
        type: args.locked ? "lock" : "unlock",
      });
    }
    return await toFeedbackPostDto(ctx, {
      ...post,
      discussionLocked: args.locked,
    });
  },
});

export const setArchived = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    archived: v.boolean(),
  },
  returns: feedbackPostDtoValidator,
  handler: async (ctx, args) => {
    const post = await loadAdminPost(ctx, args.scopeId, args.postId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const isArchived = post.archivedAt !== undefined;
    if (isArchived === args.archived) return await toFeedbackPostDto(ctx, post);
    const archivedAt = args.archived ? Date.now() : undefined;
    const updated = await patchPostRanking(ctx, post, {
      visibilityKey: args.archived
        ? HIDDEN_POST_VISIBILITY
        : PUBLIC_POST_VISIBILITY,
    });
    await ctx.db.patch(post._id, { archivedAt });
    await appendPostActivity(ctx, {
      scopeId: args.scopeId,
      postId: post._id,
      actorId,
      type: args.archived ? "archive" : "restore",
    });
    return await toFeedbackPostDto(ctx, { ...updated, archivedAt });
  },
});
