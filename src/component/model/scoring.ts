import type { Doc } from "../_generated/dataModel.js";
import type { MutationCtx } from "../_generated/server.js";
import { invalidInput } from "./errors.js";

export const VOTE_SCORE_WEIGHT = 43_200_000;
export const COMMENT_SCORE_WEIGHT = 21_600_000;
export const MAX_TAGS_PER_POST = 20;

export type RankedPost = Readonly<{
  id: string;
  createdAt: number;
  voteCount: number;
  trendingScore: number;
}>;

export function computeTrendingScore(
  createdAt: number,
  voteCount: number,
  commentCount: number,
) {
  return (
    createdAt +
    voteCount * VOTE_SCORE_WEIGHT +
    commentCount * COMMENT_SCORE_WEIGHT
  );
}

function descendingNumber(left: number, right: number) {
  return right - left;
}

function descendingId(left: string, right: string) {
  return right.localeCompare(left);
}

export function compareNewest(left: RankedPost, right: RankedPost) {
  return (
    descendingNumber(left.createdAt, right.createdAt) ||
    descendingId(left.id, right.id)
  );
}

export function compareTop(left: RankedPost, right: RankedPost) {
  return (
    descendingNumber(left.voteCount, right.voteCount) ||
    compareNewest(left, right)
  );
}

export function compareTrending(left: RankedPost, right: RankedPost) {
  return (
    descendingNumber(left.trendingScore, right.trendingScore) ||
    compareNewest(left, right)
  );
}

export async function patchPostRanking(
  ctx: MutationCtx,
  post: Doc<"posts">,
  patch: Partial<
    Pick<
      Doc<"posts">,
      | "boardId"
      | "statusKey"
      | "lifecycleState"
      | "visibilityKey"
      | "voteCount"
      | "commentCount"
    >
  >,
) {
  const createdAt = post.createdAt ?? post._creationTime;
  const voteCount = patch.voteCount ?? post.voteCount;
  const commentCount = patch.commentCount ?? post.commentCount;
  const trendingScore = computeTrendingScore(
    createdAt,
    voteCount,
    commentCount,
  );
  const rankingPatch = {
    ...patch,
    createdAt,
    orderId: post.orderId ?? String(post._id),
    trendingScore,
  };
  await ctx.db.patch(post._id, rankingPatch);

  const projections = await ctx.db
    .query("postTagFeeds")
    .withIndex("by_scope_post", (query) =>
      query.eq("scopeId", post.scopeId).eq("postId", post._id),
    )
    .take(MAX_TAGS_PER_POST + 1);
  if (projections.length > MAX_TAGS_PER_POST) {
    invalidInput(`posts may have at most ${MAX_TAGS_PER_POST} tags`);
  }
  await Promise.all(
    projections.map((projection) =>
      ctx.db.patch(projection._id, {
        boardId: patch.boardId ?? post.boardId,
        statusKey: patch.statusKey ?? post.statusKey,
        visibilityKey: patch.visibilityKey ?? post.visibilityKey ?? "visible",
        voteCount,
        trendingScore,
      }),
    ),
  );

  const searchProjections = await ctx.db
    .query("postTagSearches")
    .withIndex("by_scope_post", (query) =>
      query.eq("scopeId", post.scopeId).eq("postId", post._id),
    )
    .take(MAX_TAGS_PER_POST + 1);
  if (searchProjections.length > MAX_TAGS_PER_POST) {
    invalidInput(`posts may have at most ${MAX_TAGS_PER_POST} tags`);
  }
  await Promise.all(
    searchProjections.map((projection) =>
      ctx.db.patch(projection._id, {
        boardId: patch.boardId ?? post.boardId,
        statusKey: patch.statusKey ?? post.statusKey,
        visibilityKey: patch.visibilityKey ?? post.visibilityKey ?? "visible",
      }),
    ),
  );

  return { ...post, ...rankingPatch };
}
