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
import { mergeReadPostIds } from "../model/merge.js";
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
    const readPostIds = await mergeReadPostIds(ctx, args.scopeId, post._id);
    if (readPostIds.length === 2) {
      const cursor = args.paginationOpts.cursor?.startsWith("merge:")
        ? Number(args.paginationOpts.cursor.slice("merge:".length))
        : -1;
      const pages = await Promise.all(
        readPostIds.map((readPostId) =>
          ctx.db
            .query("comments")
            .withIndex("by_scope_post", (q) =>
              q.eq("scopeId", args.scopeId).eq("postId", readPostId),
            )
            .filter((q) => q.gt(q.field("_creationTime"), cursor))
            .order("asc")
            .take(args.paginationOpts.numItems + 1),
        ),
      );
      const combined = pages
        .flat()
        .sort(
          (left, right) =>
            left._creationTime - right._creationTime ||
            String(left._id).localeCompare(String(right._id)),
        );
      const selected = combined.slice(0, args.paginationOpts.numItems);
      const page = await Promise.all(selected.map((comment) => toCommentDto(ctx, comment)));
      const isDone = combined.length <= args.paginationOpts.numItems;
      return {
        contractVersion: 1 as const,
        page,
        comments: page,
        isDone,
        continueCursor: isDone
          ? ""
          : `merge:${selected.at(-1)!._creationTime}`,
      };
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
