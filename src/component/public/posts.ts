import { paginationOptsValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import { v } from "convex/values";

import { query } from "../_generated/server.js";
import {
  countDtoValidator,
  postDtoValidator,
  postPageDtoValidator,
} from "../validators.js";
import schema from "../schema.js";
import { authenticationRequired, invalidInput } from "../model/errors.js";
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
    paginationOpts: paginationOptsValidator,
  },
  returns: postPageDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    await requireReadPolicy(ctx, args.scopeId, args.viewerAuthenticated);
    const board = await requireBoardInScope(ctx, args.scopeId, args.boardId);
    if (
      args.paginationOpts.numItems < 1 ||
      args.paginationOpts.numItems > MAX_POSTS
    ) {
      invalidInput(`pagination numItems must be between 1 and ${MAX_POSTS}`);
    }
    const result = await paginator(ctx.db, schema)
      .query("posts")
      .withIndex("by_scope_board_state", (q) =>
        q
          .eq("scopeId", args.scopeId)
          .eq("boardId", board._id)
          .eq("lifecycleState", "active"),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map((post) => toPostDto(ctx, post)),
    );
    return {
      contractVersion: 1 as const,
      ...result,
      page,
      posts: page,
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
