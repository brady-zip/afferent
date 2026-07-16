import { paginationOptsValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import { v } from "convex/values";

import { query } from "../_generated/server.js";
import { authenticationRequired, invalidInput } from "../model/errors.js";
import {
  requireInstallation,
  requirePostInScope,
  requireScope,
} from "../model/scope.js";
import { toCommentDto } from "../model/comments.js";
import schema from "../schema.js";
import { commentPageDtoValidator } from "../validators.js";

const MAX_COMMENTS = 50;

export const listComments = query({
  args: {
    scopeId: v.string(),
    postId: v.string(),
    viewerAuthenticated: v.boolean(),
    paginationOpts: paginationOptsValidator,
  },
  returns: commentPageDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const installation = await requireInstallation(ctx, args.scopeId);
    if (installation.readPolicy === "authenticated" && !args.viewerAuthenticated) {
      authenticationRequired();
    }
    const post = await requirePostInScope(ctx, args.scopeId, args.postId);
    if (
      args.paginationOpts.numItems < 1 ||
      args.paginationOpts.numItems > MAX_COMMENTS
    ) {
      invalidInput(`pagination numItems must be between 1 and ${MAX_COMMENTS}`);
    }
    const result = await paginator(ctx.db, schema)
      .query("comments")
      .withIndex("by_scope_post", (q) =>
        q.eq("scopeId", args.scopeId).eq("postId", post._id),
      )
      .order("asc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map((comment) => toCommentDto(ctx, comment)),
    );
    return {
      contractVersion: 1 as const,
      ...result,
      page,
      comments: page,
    };
  },
});
