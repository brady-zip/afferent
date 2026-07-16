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
import { normalizePlainText, validateSafeMarkdown } from "../model/content.js";

function postSearchText(title: string, body: string) {
  return `${title}\n${body}`;
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
    const title = normalizePlainText(args.title, "title");
    const body = validateSafeMarkdown(args.body, "body");
    const board = await requireBoardInScope(ctx, args.scopeId, args.boardId);
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    const createdAt = Date.now();
    const postId = await ctx.db.insert("posts", {
      scopeId: args.scopeId,
      boardId: board._id,
      actorId,
      title,
      body,
      searchText: postSearchText(title, body),
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
    const title =
      args.title === undefined
        ? post.title
        : normalizePlainText(args.title, "title");
    const body =
      args.body === undefined
        ? post.body
        : validateSafeMarkdown(args.body, "body");
    const patch = {
      ...(args.title === undefined ? {} : { title }),
      ...(args.body === undefined ? {} : { body }),
      searchText: postSearchText(title, body),
    };
    await ctx.db.patch(post._id, patch);
    const projections = await ctx.db
      .query("postTagSearches")
      .withIndex("by_scope_post", (query) =>
        query.eq("scopeId", args.scopeId).eq("postId", post._id),
      )
      .take(21);
    if (projections.length > 20) invalidInput("posts may have at most 20 tags");
    await Promise.all(
      projections.map((projection) =>
        ctx.db.patch(projection._id, { searchText: patch.searchText }),
      ),
    );
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
