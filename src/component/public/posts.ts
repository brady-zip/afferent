import { v } from "convex/values";

import { query } from "../_generated/server.js";
import {
  countDtoValidator,
  postDtoValidator,
  postListDtoValidator,
} from "../validators.js";
import { authenticationRequired } from "../model/errors.js";
import {
  requireBoardInScope,
  requireInstallation,
  requirePostInScope,
  requireScope,
} from "../model/scope.js";
import { toPostDto } from "../model/views.js";

const MAX_POSTS = 50;

async function requireReadPolicy(
  ctx: Parameters<typeof requireInstallation>[0],
  scopeId: string,
  viewerAuthenticated: boolean,
) {
  const installation = await requireInstallation(ctx, scopeId);
  if (installation.readPolicy === "authenticated" && !viewerAuthenticated) {
    authenticationRequired();
  }
}

export const listPosts = query({
  args: {
    scopeId: v.string(),
    boardId: v.string(),
    viewerAuthenticated: v.boolean(),
  },
  returns: postListDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    await requireReadPolicy(ctx, args.scopeId, args.viewerAuthenticated);
    const board = await requireBoardInScope(ctx, args.scopeId, args.boardId);
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_scope_board_state", (q) =>
        q
          .eq("scopeId", args.scopeId)
          .eq("boardId", board._id)
          .eq("lifecycleState", "active"),
      )
      .order("desc")
      .take(MAX_POSTS);
    return {
      contractVersion: 1 as const,
      posts: await Promise.all(posts.map((post) => toPostDto(ctx, post))),
    };
  },
});

export const getPost = query({
  args: {
    scopeId: v.string(),
    postId: v.string(),
    viewerAuthenticated: v.boolean(),
  },
  returns: postDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    await requireReadPolicy(ctx, args.scopeId, args.viewerAuthenticated);
    const post = await requirePostInScope(ctx, args.scopeId, args.postId);
    return await toPostDto(ctx, post);
  },
});

export const countPosts = query({
  args: {
    scopeId: v.string(),
    boardId: v.string(),
    viewerAuthenticated: v.boolean(),
  },
  returns: countDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    await requireReadPolicy(ctx, args.scopeId, args.viewerAuthenticated);
    const board = await requireBoardInScope(ctx, args.scopeId, args.boardId);
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_scope_board_state", (q) =>
        q
          .eq("scopeId", args.scopeId)
          .eq("boardId", board._id)
          .eq("lifecycleState", "active"),
      )
      .take(MAX_POSTS + 1);
    return { contractVersion: 1 as const, count: posts.length };
  },
});
