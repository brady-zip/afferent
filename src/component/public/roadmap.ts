import { paginationOptsValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel.js";
import { query } from "../_generated/server.js";
import type { QueryCtx } from "../_generated/server.js";
import { authenticationRequired, invalidInput } from "../model/errors.js";
import {
  requireBoardInScope,
  requireInstallation,
  requireScope,
} from "../model/scope.js";
import { toBoardDto } from "../model/views.js";
import {
  isPostPubliclyVisible,
  PUBLIC_POST_VISIBILITY,
} from "../model/visibility.js";
import schema from "../schema.js";
import {
  roadmapGroupPageDtoValidator,
  roadmapStatusKeyValidator,
} from "../validators.js";

export const ROADMAP_COMPLETE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_ROADMAP_PAGE_SIZE = 50;

type RoadmapStatus = "planned" | "in_progress" | "complete";
type RoadmapPagination = Readonly<{
  numItems: number;
  cursor: string | null;
  endCursor?: string | null;
  id?: number;
  maximumRowsRead?: number;
  maximumBytesRead?: number;
}>;

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

function pageRoadmap(
  ctx: QueryCtx,
  args: {
    scopeId: string;
    status: RoadmapStatus;
    boardId?: Id<"boards">;
    paginationOpts: RoadmapPagination;
    completeCutoff: number;
  },
) {
  const stream = paginator(ctx.db, schema).query("posts");
  if (args.boardId !== undefined) {
    const indexed = stream.withIndex(
      "by_scope_board_status_visibility_roadmap",
      (index) => {
        const range = index
          .eq("scopeId", args.scopeId)
          .eq("boardId", args.boardId!)
          .eq("statusKey", args.status)
          .eq("visibilityKey", PUBLIC_POST_VISIBILITY);
        return args.status === "complete"
          ? range.gte("currentStatusSince", args.completeCutoff)
          : range;
      },
    );
    return indexed.order("desc").paginate(args.paginationOpts);
  }
  const indexed = stream.withIndex(
    "by_scope_status_visibility_roadmap",
    (index) => {
      const range = index
        .eq("scopeId", args.scopeId)
        .eq("statusKey", args.status)
        .eq("visibilityKey", PUBLIC_POST_VISIBILITY);
      return args.status === "complete"
        ? range.gte("currentStatusSince", args.completeCutoff)
        : range;
    },
  );
  return indexed.order("desc").paginate(args.paginationOpts);
}

async function toRoadmapItemDto(ctx: QueryCtx, post: Doc<"posts">) {
  if (
    !isPostPubliclyVisible(post) ||
    post.currentStatusSince === undefined ||
    post.createdAt === undefined ||
    (post.statusKey !== "planned" &&
      post.statusKey !== "in_progress" &&
      post.statusKey !== "complete")
  ) {
    throw new ConvexError({ code: "INVARIANT_VIOLATION" });
  }
  const board = await ctx.db.get(post.boardId);
  if (!board || board.scopeId !== post.scopeId) {
    throw new ConvexError({ code: "INVARIANT_VIOLATION" });
  }
  const label = {
    planned: "Planned",
    in_progress: "In Progress",
    complete: "Complete",
  }[post.statusKey] as "Planned" | "In Progress" | "Complete";
  return {
    contractVersion: 1 as const,
    id: String(post._id),
    boardId: String(post.boardId),
    board: toBoardDto(board),
    title: post.title,
    status: { key: post.statusKey, label },
    currentStatusSince: post.currentStatusSince,
    createdAt: post.createdAt,
    voteCount: post.voteCount,
    commentCount: post.commentCount,
  };
}

export const listRoadmapGroup = query({
  args: {
    scopeId: v.string(),
    viewerAuthenticated: v.boolean(),
    status: roadmapStatusKeyValidator,
    boardId: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: roadmapGroupPageDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    await requireReadPolicy(ctx, args.scopeId, args.viewerAuthenticated);
    if (
      args.paginationOpts.numItems < 1 ||
      args.paginationOpts.numItems > MAX_ROADMAP_PAGE_SIZE
    ) {
      invalidInput(
        `pagination numItems must be between 1 and ${MAX_ROADMAP_PAGE_SIZE}`,
      );
    }
    const board =
      args.boardId === undefined
        ? undefined
        : await requireBoardInScope(ctx, args.scopeId, args.boardId);
    const result = await pageRoadmap(ctx, {
      scopeId: args.scopeId,
      status: args.status,
      ...(board === undefined ? {} : { boardId: board._id }),
      paginationOpts: args.paginationOpts,
      completeCutoff: Date.now() - ROADMAP_COMPLETE_WINDOW_MS,
    });
    const items = await Promise.all(
      result.page.map((post) => toRoadmapItemDto(ctx, post)),
    );
    return { contractVersion: 1 as const, ...result, page: items, items };
  },
});
