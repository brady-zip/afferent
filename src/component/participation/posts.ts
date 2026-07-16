import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server.js";
import { invalidInput, notOwner } from "../model/errors.js";
import { upsertActor } from "../model/actors.js";
import {
  requireBoardInScope,
  requirePostInScope,
  requireScope,
} from "../model/scope.js";
import { toPostDto } from "../model/views.js";
import { computeTrendingScore, patchPostRanking } from "../model/scoring.js";
import {
  HIDDEN_POST_VISIBILITY,
  PUBLIC_POST_VISIBILITY,
} from "../model/visibility.js";
import { postDtoValidator, verifiedActorValidator } from "../validators.js";

const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 10_000;

function validatedTitle(value: string) {
  const title = value.trim();
  if (!title || title.length > MAX_TITLE_LENGTH) {
    invalidInput(`title must contain 1 to ${MAX_TITLE_LENGTH} characters`);
  }
  return title;
}

function validatedBody(value: string) {
  const body = value.trim();
  if (!body || body.length > MAX_BODY_LENGTH) {
    invalidInput(`body must contain 1 to ${MAX_BODY_LENGTH} characters`);
  }
  return body;
}

export const createPost = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    boardId: v.string(),
    title: v.string(),
    body: v.string(),
  },
  returns: postDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const title = validatedTitle(args.title);
    const body = validatedBody(args.body);
    const board = await requireBoardInScope(ctx, args.scopeId, args.boardId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const createdAt = Date.now();
    const postId = await ctx.db.insert("posts", {
      scopeId: args.scopeId,
      boardId: board._id,
      actorId,
      title,
      body,
      lifecycleState: "active",
      statusKey: "open",
      voteCount: 0,
      commentCount: 0,
      createdAt,
      currentStatusSince: createdAt,
      trendingScore: computeTrendingScore(createdAt, 0, 0),
      visibilityKey: PUBLIC_POST_VISIBILITY,
    });
    await ctx.db.patch(postId, { orderId: String(postId) });
    const post = await ctx.db.get(postId);
    if (!post) throw new ConvexError({ code: "INVARIANT_VIOLATION" });
    return await toPostDto(ctx, post);
  },
});

export const editPost = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  returns: postDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    if (args.title === undefined && args.body === undefined) {
      invalidInput("at least one editable field is required");
    }
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const post = await requirePostInScope(ctx, args.scopeId, args.postId);
    if (post.actorId !== actorId) notOwner();
    if (post.lifecycleState !== "active") {
      invalidInput("withdrawn posts cannot be edited");
    }
    const patch = {
      ...(args.title === undefined
        ? {}
        : { title: validatedTitle(args.title) }),
      ...(args.body === undefined ? {} : { body: validatedBody(args.body) }),
    };
    await ctx.db.patch(post._id, patch);
    return await toPostDto(ctx, { ...post, ...patch });
  },
});

export const withdrawPost = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    postId: v.string(),
  },
  returns: postDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const post = await requirePostInScope(ctx, args.scopeId, args.postId);
    if (post.actorId !== actorId) notOwner();
    if (post.lifecycleState !== "withdrawn") {
      await patchPostRanking(ctx, post, {
        lifecycleState: "withdrawn",
        visibilityKey: HIDDEN_POST_VISIBILITY,
      });
    }
    return await toPostDto(ctx, {
      ...post,
      lifecycleState: "withdrawn",
      visibilityKey: HIDDEN_POST_VISIBILITY,
    });
  },
});
