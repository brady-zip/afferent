import { paginationOptsValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import { v } from "convex/values";

import { query } from "../_generated/server.js";
import { toPostActivityDto } from "../model/activity.js";
import { invalidInput } from "../model/errors.js";
import { mergeReadPostIds } from "../model/merge.js";
import { requirePostInScope, requireScope } from "../model/scope.js";
import schema from "../schema.js";
import { postActivityPageDtoValidator } from "../validators.js";

export const listPostActivity = query({
  args: {
    scopeId: v.string(),
    postId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: postActivityPageDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const post = await requirePostInScope(ctx, args.scopeId, args.postId);
    if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 50) {
      invalidInput("pagination numItems must be between 1 and 50");
    }
    const readPostIds = await mergeReadPostIds(ctx, args.scopeId, post._id);
    if (readPostIds.length === 2) {
      const cursor = args.paginationOpts.cursor?.startsWith("merge:")
        ? Number(args.paginationOpts.cursor.slice("merge:".length))
        : Number.POSITIVE_INFINITY;
      const pages = await Promise.all(
        readPostIds.map((readPostId) =>
          ctx.db
            .query("postActivity")
            .withIndex("by_scope_post_occurred", (q) =>
              q.eq("scopeId", args.scopeId).eq("postId", readPostId),
            )
            .filter((q) => q.lt(q.field("occurredAt"), cursor))
            .order("desc")
            .take(args.paginationOpts.numItems + 1),
        ),
      );
      const combined = pages
        .flat()
        .sort(
          (left, right) =>
            right.occurredAt - left.occurredAt ||
            String(right._id).localeCompare(String(left._id)),
        );
      const selected = combined.slice(0, args.paginationOpts.numItems);
      const isDone = combined.length <= args.paginationOpts.numItems;
      return {
        contractVersion: 1 as const,
        page: await Promise.all(
          selected.map((entry) => toPostActivityDto(ctx, entry)),
        ),
        isDone,
        continueCursor: isDone ? "" : `merge:${selected.at(-1)!.occurredAt}`,
      };
    }
    const result = await paginator(ctx.db, schema)
      .query("postActivity")
      .withIndex("by_scope_post_occurred", (q) =>
        q.eq("scopeId", args.scopeId).eq("postId", post._id),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      contractVersion: 1 as const,
      ...result,
      page: await Promise.all(
        result.page.map((entry) => toPostActivityDto(ctx, entry)),
      ),
    };
  },
});
