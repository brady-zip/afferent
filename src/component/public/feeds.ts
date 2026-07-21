import { paginationOptsValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel.js";
import { query } from "../_generated/server.js";
import type { QueryCtx } from "../_generated/server.js";
import {
  feedbackOrderValidator,
  feedbackPageDtoValidator,
  postStatusKeyValidator,
} from "../validators.js";
import schema from "../schema.js";
import { authenticationRequired, invalidInput } from "../model/errors.js";
import {
  requireBoardInScope,
  requireInstallation,
  requireScope,
} from "../model/scope.js";
import { toFeedbackPostDto } from "../model/views.js";
import { PUBLIC_POST_VISIBILITY } from "../model/visibility.js";
import { requireTagInScope as loadTagInScope } from "../model/tags.js";
import { findExistingActor } from "../model/actors.js";
import { verifiedActorValidator } from "../validators.js";

const MAX_FEED_PAGE_SIZE = 50;

type FeedOrder = "newest" | "top" | "trending";
interface FeedPagination {
  numItems: number;
  cursor: string | null;
  endCursor?: string | null;
  id?: number;
  maximumRowsRead?: number;
  maximumBytesRead?: number;
}

async function requireReadPolicy(
  ctx: QueryCtx,
  scopeId: string,
  viewerAuthenticated: boolean,
) {
  const installation = await requireInstallation(ctx, scopeId);
  if (installation.readPolicy === "authenticated" && !viewerAuthenticated) {
    authenticationRequired();
  }
}

async function requireTagInScope(
  ctx: QueryCtx,
  scopeId: string,
  tagId: string,
) {
  return await loadTagInScope(ctx, scopeId, tagId);
}

function pagePosts(
  ctx: QueryCtx,
  args: {
    scopeId: string;
    order: FeedOrder;
    boardId?: Id<"boards">;
    status?: Doc<"posts">["statusKey"];
    paginationOpts: FeedPagination;
  },
) {
  const stream = paginator(ctx.db, schema).query("posts");
  if (args.order === "newest") {
    if (args.boardId && args.status) {
      return stream
        .withIndex("by_scope_board_status_visibility_created", (index) =>
          index
            .eq("scopeId", args.scopeId)
            .eq("boardId", args.boardId!)
            .eq("statusKey", args.status!)
            .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    if (args.boardId) {
      return stream
        .withIndex("by_scope_board_visibility_created", (index) =>
          index
            .eq("scopeId", args.scopeId)
            .eq("boardId", args.boardId!)
            .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    if (args.status) {
      return stream
        .withIndex("by_scope_status_visibility_created", (index) =>
          index
            .eq("scopeId", args.scopeId)
            .eq("statusKey", args.status!)
            .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return stream
      .withIndex("by_scope_visibility_created", (index) =>
        index
          .eq("scopeId", args.scopeId)
          .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  }
  if (args.order === "top") {
    if (args.boardId && args.status) {
      return stream
        .withIndex("by_scope_board_status_visibility_top", (index) =>
          index
            .eq("scopeId", args.scopeId)
            .eq("boardId", args.boardId!)
            .eq("statusKey", args.status!)
            .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    if (args.boardId) {
      return stream
        .withIndex("by_scope_board_visibility_top", (index) =>
          index
            .eq("scopeId", args.scopeId)
            .eq("boardId", args.boardId!)
            .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    if (args.status) {
      return stream
        .withIndex("by_scope_status_visibility_top", (index) =>
          index
            .eq("scopeId", args.scopeId)
            .eq("statusKey", args.status!)
            .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return stream
      .withIndex("by_scope_visibility_top", (index) =>
        index
          .eq("scopeId", args.scopeId)
          .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  }
  if (args.boardId && args.status) {
    return stream
      .withIndex("by_scope_board_status_visibility_trending", (index) =>
        index
          .eq("scopeId", args.scopeId)
          .eq("boardId", args.boardId!)
          .eq("statusKey", args.status!)
          .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  }
  if (args.boardId) {
    return stream
      .withIndex("by_scope_board_visibility_trending", (index) =>
        index
          .eq("scopeId", args.scopeId)
          .eq("boardId", args.boardId!)
          .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  }
  if (args.status) {
    return stream
      .withIndex("by_scope_status_visibility_trending", (index) =>
        index
          .eq("scopeId", args.scopeId)
          .eq("statusKey", args.status!)
          .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  }
  return stream
    .withIndex("by_scope_visibility_trending", (index) =>
      index
        .eq("scopeId", args.scopeId)
        .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
    )
    .order("desc")
    .paginate(args.paginationOpts);
}

function pageTaggedPosts(
  ctx: QueryCtx,
  args: {
    scopeId: string;
    order: FeedOrder;
    tagId: Id<"tags">;
    boardId?: Id<"boards">;
    paginationOpts: FeedPagination;
  },
) {
  const stream = paginator(ctx.db, schema).query("postTagFeeds");
  if (args.order === "newest") {
    return args.boardId
      ? stream
          .withIndex("by_scope_tag_board_visibility_created", (index) =>
            index
              .eq("scopeId", args.scopeId)
              .eq("tagId", args.tagId)
              .eq("boardId", args.boardId!)
              .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : stream
          .withIndex("by_scope_tag_visibility_created", (index) =>
            index
              .eq("scopeId", args.scopeId)
              .eq("tagId", args.tagId)
              .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
          )
          .order("desc")
          .paginate(args.paginationOpts);
  }
  if (args.order === "top") {
    return args.boardId
      ? stream
          .withIndex("by_scope_tag_board_visibility_top", (index) =>
            index
              .eq("scopeId", args.scopeId)
              .eq("tagId", args.tagId)
              .eq("boardId", args.boardId!)
              .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : stream
          .withIndex("by_scope_tag_visibility_top", (index) =>
            index
              .eq("scopeId", args.scopeId)
              .eq("tagId", args.tagId)
              .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
          )
          .order("desc")
          .paginate(args.paginationOpts);
  }
  return args.boardId
    ? stream
        .withIndex("by_scope_tag_board_visibility_trending", (index) =>
          index
            .eq("scopeId", args.scopeId)
            .eq("tagId", args.tagId)
            .eq("boardId", args.boardId!)
            .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
        )
        .order("desc")
        .paginate(args.paginationOpts)
    : stream
        .withIndex("by_scope_tag_visibility_trending", (index) =>
          index
            .eq("scopeId", args.scopeId)
            .eq("tagId", args.tagId)
            .eq("visibilityKey", PUBLIC_POST_VISIBILITY),
        )
        .order("desc")
        .paginate(args.paginationOpts);
}

export const listFeedback = query({
  args: {
    scopeId: v.string(),
    viewerAuthenticated: v.boolean(),
    viewerActor: v.optional(verifiedActorValidator),
    order: feedbackOrderValidator,
    boardId: v.optional(v.string()),
    status: v.optional(postStatusKeyValidator),
    tagId: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: feedbackPageDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    await requireReadPolicy(ctx, args.scopeId, args.viewerAuthenticated);
    const viewer = await findExistingActor(ctx, args.scopeId, args.viewerActor);
    if (
      args.paginationOpts.numItems < 1 ||
      args.paginationOpts.numItems > MAX_FEED_PAGE_SIZE
    ) {
      invalidInput(
        `pagination numItems must be between 1 and ${MAX_FEED_PAGE_SIZE}`,
      );
    }
    if (args.status !== undefined && args.tagId !== undefined) {
      invalidInput("feedback supports one status or one tag filter at a time");
    }
    const board =
      args.boardId === undefined
        ? undefined
        : await requireBoardInScope(ctx, args.scopeId, args.boardId);

    if (args.tagId !== undefined) {
      const tag = await requireTagInScope(ctx, args.scopeId, args.tagId);
      const result = await pageTaggedPosts(ctx, {
        scopeId: args.scopeId,
        order: args.order,
        tagId: tag._id,
        ...(board === undefined ? {} : { boardId: board._id }),
        paginationOpts: args.paginationOpts,
      });
      const posts = await Promise.all(
        result.page.map(async (projection) => {
          const post = await ctx.db.get(projection.postId);
          if (!post || post.scopeId !== args.scopeId) {
            throw new Error("TAG_FEED_PROJECTION_INVARIANT");
          }
          return await toFeedbackPostDto(ctx, post, viewer?._id);
        }),
      );
      return { contractVersion: 3 as const, ...result, page: posts, posts };
    }

    const result = await pagePosts(ctx, {
      scopeId: args.scopeId,
      order: args.order,
      ...(board === undefined ? {} : { boardId: board._id }),
      ...(args.status === undefined ? {} : { status: args.status }),
      paginationOpts: args.paginationOpts,
    });
    const posts = await Promise.all(
      result.page.map((post) => toFeedbackPostDto(ctx, post, viewer?._id)),
    );
    return { contractVersion: 3 as const, ...result, page: posts, posts };
  },
});
