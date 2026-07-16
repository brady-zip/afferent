import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel.js";
import { query } from "../_generated/server.js";
import type { QueryCtx } from "../_generated/server.js";
import { normalizePlainText } from "../model/content.js";
import { authenticationRequired, invalidInput } from "../model/errors.js";
import {
  SIMILAR_CANDIDATE_LIMIT,
  SIMILAR_DEFAULT_LIMIT,
  SIMILAR_HARD_LIMIT,
  rankSimilarCandidates,
} from "../model/similarity.js";
import {
  requireBoardInScope,
  requireInstallation,
  requireScope,
} from "../model/scope.js";
import { PUBLIC_POST_VISIBILITY } from "../model/visibility.js";
import {
  postStatusKeyValidator,
  searchResultDtoValidator,
  similarPostResultDtoValidator,
} from "../validators.js";

export const SEARCH_HARD_LIMIT = 50;
export const SEARCH_MAX_TERMS = 16;
export const SEARCH_MAX_TERM_BYTES = 32;

const STATUS_LABELS = {
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  complete: "Complete",
  closed: "Closed",
} as const;

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

function normalizeSearchQuery(value: string) {
  const queryValue = normalizePlainText(value, "search query");
  const terms = queryValue.split(" ");
  if (terms.length > SEARCH_MAX_TERMS) {
    invalidInput(`search query may contain at most ${SEARCH_MAX_TERMS} terms`);
  }
  const encoder = new TextEncoder();
  if (
    terms.some(
      (term) => encoder.encode(term).byteLength > SEARCH_MAX_TERM_BYTES,
    )
  ) {
    invalidInput(
      `search terms may contain at most ${SEARCH_MAX_TERM_BYTES} bytes`,
    );
  }
  return queryValue;
}

async function toDiscoveryPostDto(ctx: QueryCtx, post: Doc<"posts">) {
  const board = await ctx.db.get(post.boardId);
  if (!board || board.scopeId !== post.scopeId) {
    throw new Error("SEARCH_BOARD_INVARIANT");
  }
  return {
    contractVersion: 1 as const,
    id: String(post._id),
    title: post.title,
    board: { id: String(board._id), slug: board.slug, name: board.name },
    status: {
      key: post.statusKey,
      label: STATUS_LABELS[post.statusKey],
    },
  };
}

async function queryCanonicalPosts(
  ctx: QueryCtx,
  args: {
    scopeId: string;
    queryValue: string;
    boardId?: Id<"boards">;
    status?: Doc<"posts">["statusKey"];
    take: number;
  },
) {
  return await ctx.db
    .query("posts")
    .withSearchIndex("search_posts", (search) => {
      let filtered = search
        .search("searchText", args.queryValue)
        .eq("scopeId", args.scopeId)
        .eq("visibilityKey", PUBLIC_POST_VISIBILITY);
      if (args.boardId !== undefined) {
        filtered = filtered.eq("boardId", args.boardId);
      }
      if (args.status !== undefined) {
        filtered = filtered.eq("statusKey", args.status);
      }
      return filtered;
    })
    .take(args.take);
}

async function queryTaggedPosts(
  ctx: QueryCtx,
  args: {
    scopeId: string;
    queryValue: string;
    tagId: Id<"tags">;
    boardId?: Id<"boards">;
    status?: Doc<"posts">["statusKey"];
    take: number;
  },
) {
  const projections = await ctx.db
    .query("postTagSearches")
    .withSearchIndex("search_tagged_posts", (search) => {
      let filtered = search
        .search("searchText", args.queryValue)
        .eq("scopeId", args.scopeId)
        .eq("visibilityKey", PUBLIC_POST_VISIBILITY)
        .eq("tagId", args.tagId);
      if (args.boardId !== undefined) {
        filtered = filtered.eq("boardId", args.boardId);
      }
      if (args.status !== undefined) {
        filtered = filtered.eq("statusKey", args.status);
      }
      return filtered;
    })
    .take(args.take);
  const posts = await Promise.all(
    projections.map((projection) => ctx.db.get(projection.postId)),
  );
  if (
    posts.some(
      (post) =>
        post === null ||
        post.scopeId !== args.scopeId ||
        post.visibilityKey !== PUBLIC_POST_VISIBILITY,
    )
  ) {
    throw new Error("SEARCH_PROJECTION_INVARIANT");
  }
  return posts as Doc<"posts">[];
}

async function normalizeFilters(
  ctx: QueryCtx,
  args: { scopeId: string; boardId?: string; tagId?: string },
) {
  const board =
    args.boardId === undefined
      ? undefined
      : await requireBoardInScope(ctx, args.scopeId, args.boardId);
  if (args.tagId === undefined) return { boardId: board?._id };
  const tagId = ctx.db.normalizeId("tags", args.tagId);
  if (!tagId) invalidInput("tag does not exist");
  const tag = await ctx.db.get(tagId);
  if (!tag || tag.scopeId !== args.scopeId) invalidInput("tag does not exist");
  return { boardId: board?._id, tagId: tag._id };
}

export const searchFeedback = query({
  args: {
    scopeId: v.string(),
    viewerAuthenticated: v.boolean(),
    query: v.string(),
    boardId: v.optional(v.string()),
    status: v.optional(postStatusKeyValidator),
    tagId: v.optional(v.string()),
  },
  returns: searchResultDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    await requireReadPolicy(ctx, args.scopeId, args.viewerAuthenticated);
    const queryValue = normalizeSearchQuery(args.query);
    const filters = await normalizeFilters(ctx, args);
    const posts =
      filters.tagId === undefined
        ? await queryCanonicalPosts(ctx, {
            scopeId: args.scopeId,
            queryValue,
            boardId: filters.boardId,
            status: args.status,
            take: SEARCH_HARD_LIMIT + 1,
          })
        : await queryTaggedPosts(ctx, {
            scopeId: args.scopeId,
            queryValue,
            boardId: filters.boardId,
            status: args.status,
            tagId: filters.tagId,
            take: SEARCH_HARD_LIMIT + 1,
          });
    return {
      contractVersion: 1 as const,
      items: await Promise.all(
        posts
          .slice(0, SEARCH_HARD_LIMIT)
          .map((post) => toDiscoveryPostDto(ctx, post)),
      ),
      hasMore: posts.length > SEARCH_HARD_LIMIT,
    };
  },
});

export const suggestSimilarPosts = query({
  args: {
    scopeId: v.string(),
    viewerAuthenticated: v.boolean(),
    title: v.string(),
    body: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: similarPostResultDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    await requireReadPolicy(ctx, args.scopeId, args.viewerAuthenticated);
    const title = normalizePlainText(args.title, "title");
    const body = args.body?.trim();
    const requestedLimit = args.limit ?? SIMILAR_DEFAULT_LIMIT;
    if (
      !Number.isInteger(requestedLimit) ||
      requestedLimit < 1 ||
      requestedLimit > SIMILAR_HARD_LIMIT
    ) {
      invalidInput(
        `similar-post limit must be between 1 and ${SIMILAR_HARD_LIMIT}`,
      );
    }
    const candidates = await queryCanonicalPosts(ctx, {
      scopeId: args.scopeId,
      queryValue: normalizeSearchQuery(title),
      take: SIMILAR_CANDIDATE_LIMIT + 1,
    });
    const ranked = rankSimilarCandidates(
      { title, body },
      candidates.slice(0, SIMILAR_CANDIDATE_LIMIT).map((post) => ({
        id: String(post._id),
        title: post.title,
        body: post.body,
        createdAt: post.createdAt ?? post._creationTime,
        post,
      })),
      requestedLimit,
    );
    return {
      contractVersion: 1 as const,
      items: await Promise.all(
        ranked.map(({ post }) => toDiscoveryPostDto(ctx, post)),
      ),
      hasMore:
        candidates.length > SIMILAR_CANDIDATE_LIMIT ||
        ranked.length === requestedLimit,
    };
  },
});
