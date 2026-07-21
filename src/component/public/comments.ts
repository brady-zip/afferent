import { paginationOptsValidator } from "convex/server";
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
import { paginateMergedPostStream } from "../model/mergedPagination.js";
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
    const result = await paginateMergedPostStream(ctx, {
      scopeId: args.scopeId,
      postIds: readPostIds,
      reader: "comments",
      order: "creation_asc",
      paginationOpts: args.paginationOpts,
    });
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
