import type { Doc, Id } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { normalizePlainText } from "./content.js";
import { invalidInput, notFound } from "./errors.js";
import { MAX_TAGS_PER_POST } from "./scoring.js";

export const MAX_TAG_NAME_LENGTH = 60;
export const MAX_TAGS_PER_SCOPE = 200;

type DatabaseContext = Pick<QueryCtx | MutationCtx, "db">;

export function normalizeTagName(value: string) {
  const name = normalizePlainText(value, "tag name", MAX_TAG_NAME_LENGTH);
  return { name, normalizedName: name.toLocaleLowerCase("en-US") };
}

export function toTagDto(tag: Doc<"tags">) {
  return { contractVersion: 1 as const, id: String(tag._id), name: tag.name };
}

async function loadTagInScope(
  ctx: DatabaseContext,
  args: {
    scopeId: string;
    tagId: string | Id<"tags">;
    includeInactive: boolean;
  },
) {
  const normalized = ctx.db.normalizeId("tags", String(args.tagId));
  if (!normalized) notFound("tag");
  const tag = await ctx.db.get(normalized);
  if (
    !tag ||
    tag.scopeId !== args.scopeId ||
    (!args.includeInactive && tag.state !== "active")
  ) {
    notFound("tag");
  }
  return tag;
}

export async function requireTagInScope(
  ctx: DatabaseContext,
  scopeId: string,
  tagId: string | Id<"tags">,
) {
  return await loadTagInScope(ctx, {
    scopeId,
    tagId,
    includeInactive: false,
  });
}

export async function requireAnyTagInScope(
  ctx: DatabaseContext,
  scopeId: string,
  tagId: string | Id<"tags">,
) {
  return await loadTagInScope(ctx, { scopeId, tagId, includeInactive: true });
}

export async function findPostTag(
  ctx: DatabaseContext,
  args: {
    scopeId: string;
    postId: Id<"posts">;
    tagId: Id<"tags">;
  },
) {
  return await ctx.db
    .query("postTags")
    .withIndex("by_scope_post_tag", (query) =>
      query
        .eq("scopeId", args.scopeId)
        .eq("postId", args.postId)
        .eq("tagId", args.tagId),
    )
    .unique();
}

export async function requireTagCapacity(
  ctx: DatabaseContext,
  scopeId: string,
  postId: Id<"posts">,
) {
  const memberships = await ctx.db
    .query("postTags")
    .withIndex("by_scope_post_tag", (query) =>
      query.eq("scopeId", scopeId).eq("postId", postId),
    )
    .take(MAX_TAGS_PER_POST + 1);
  if (memberships.length >= MAX_TAGS_PER_POST) {
    invalidInput(`posts may have at most ${MAX_TAGS_PER_POST} tags`);
  }
}

export function tagFeedProjection(post: Doc<"posts">, tagId: Id<"tags">) {
  return {
    scopeId: post.scopeId,
    postId: post._id,
    tagId,
    boardId: post.boardId,
    statusKey: post.statusKey,
    visibilityKey: post.visibilityKey ?? ("visible" as const),
    createdAt: post.createdAt ?? post._creationTime,
    voteCount: post.voteCount,
    trendingScore: post.trendingScore ?? post._creationTime,
    orderId: post.orderId ?? String(post._id),
  };
}

export function tagSearchProjection(post: Doc<"posts">, tagId: Id<"tags">) {
  return {
    scopeId: post.scopeId,
    postId: post._id,
    tagId,
    boardId: post.boardId,
    statusKey: post.statusKey,
    visibilityKey: post.visibilityKey ?? ("visible" as const),
    searchText: post.searchText ?? `${post.title}\n${post.body}`,
  };
}
