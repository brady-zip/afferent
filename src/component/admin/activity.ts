import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { query } from "../_generated/server.js";
import { toPostActivityDto } from "../model/activity.js";
import { invalidInput } from "../model/errors.js";
import { mergeReadPostIds } from "../model/merge.js";
import { paginateMergedPostStream } from "../model/mergedPagination.js";
import { requirePostInScope, requireScope } from "../model/scope.js";
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
    const result = await paginateMergedPostStream(ctx, {
      scopeId: args.scopeId,
      postIds: readPostIds,
      reader: "activity",
      order: "occurred_desc",
      paginationOpts: args.paginationOpts,
    });
    return {
      contractVersion: 1 as const,
      ...result,
      page: await Promise.all(
        result.page.map((entry) => toPostActivityDto(ctx, entry)),
      ),
    };
  },
});
