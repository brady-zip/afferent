import type { Doc, Id } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { conflict, notFound } from "./errors.js";
import { requirePostInScope } from "./scope.js";
import { isPostPubliclyVisible } from "./visibility.js";
import { tagFeedProjection, tagSearchProjection } from "./tags.js";

export const MERGE_BATCH_SIZE = 50;

export type ActorMembership = Readonly<{
  actorId: string;
  state?: "subscribed" | "opted_out";
}>;

export function unionActorMemberships(
  canonical: readonly ActorMembership[],
  source: readonly ActorMembership[],
) {
  const union = new Map<string, ActorMembership>();
  for (const membership of [...canonical, ...source]) {
    const existing = union.get(membership.actorId);
    if (!existing || existing.state === undefined) union.set(membership.actorId, membership);
  }
  return [...union.values()].sort((left, right) =>
    left.actorId.localeCompare(right.actorId),
  );
}

export function flattenMergeTarget(
  requestedId: string,
  redirects: ReadonlyMap<string, string>,
) {
  const seen = new Set<string>();
  let current = requestedId;
  while (redirects.has(current)) {
    if (seen.has(current)) throw new Error("MERGE_REDIRECT_CYCLE");
    seen.add(current);
    current = redirects.get(current)!;
  }
  if (seen.has(current)) throw new Error("MERGE_REDIRECT_CYCLE");
  return current;
}

type DatabaseCtx = Pick<QueryCtx | MutationCtx, "db">;

export async function requireLiveMergePost(
  ctx: DatabaseCtx,
  scopeId: string,
  postId: string,
) {
  const post = await requirePostInScope(ctx, scopeId, postId);
  if (!isPostPubliclyVisible(post) || post.mergedIntoPostId !== undefined) {
    notFound("post");
  }
  return post;
}

export async function countMergeRelations(
  ctx: DatabaseCtx,
  scopeId: string,
  postId: Id<"posts">,
) {
  const [votes, subscriptions, comments, activity, links, guards, tags] =
    await Promise.all([
      ctx.db.query("votes").withIndex("by_scope_post_actor", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(MERGE_BATCH_SIZE + 1),
      ctx.db.query("postSubscriptions").withIndex("by_scope_post_actor", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(MERGE_BATCH_SIZE + 1),
      ctx.db.query("comments").withIndex("by_scope_post", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(MERGE_BATCH_SIZE + 1),
      ctx.db.query("postActivity").withIndex("by_scope_post_occurred", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(MERGE_BATCH_SIZE + 1),
      ctx.db.query("changelogPostLinks").withIndex("by_scope_post_entry", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(MERGE_BATCH_SIZE + 1),
      ctx.db.query("changelogNotificationGuards").withIndex("by_scope_post_entry", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(MERGE_BATCH_SIZE + 1),
      ctx.db.query("postTags").withIndex("by_scope_post_tag", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(MERGE_BATCH_SIZE + 1),
    ]);
  return { votes, subscriptions, comments, activity, links, guards, tags };
}

export function needsContinuation(
  relations: Awaited<ReturnType<typeof countMergeRelations>>,
) {
  return Object.values(relations).some((rows) => rows.length > MERGE_BATCH_SIZE);
}

export async function assertMergeIntent(
  source: Doc<"posts">,
  canonical: Doc<"posts">,
) {
  if (source._id === canonical._id) conflict("sourcePostId", "a post cannot merge into itself");
  if (source.mergedIntoPostId !== undefined || canonical.mergedIntoPostId !== undefined) {
    conflict("canonicalPostId", "merge tombstones cannot be merge targets");
  }
}

export type MergePhase = Doc<"mergeJobs">["phase"];

export const NEXT_MERGE_PHASE: Record<MergePhase, MergePhase> = {
  votes: "subscriptions",
  subscriptions: "comments",
  comments: "activity",
  activity: "changelog_links",
  changelog_links: "notification_guards",
  notification_guards: "notifications",
  notifications: "tags",
  tags: "finalize",
  finalize: "finalize",
};

export async function processMergePhase(
  ctx: MutationCtx,
  job: Doc<"mergeJobs">,
) {
  const { scopeId, sourcePostId, canonicalPostId } = job;
  let movedVotes = 0;
  let movedComments = 0;
  let processed = 0;
  if (job.phase === "votes") {
    const rows = await ctx.db.query("votes").withIndex("by_scope_post_actor", (q) => q.eq("scopeId", scopeId).eq("postId", sourcePostId)).take(MERGE_BATCH_SIZE);
    processed = rows.length;
    for (const row of rows) {
      const existing = await ctx.db.query("votes").withIndex("by_scope_post_actor", (q) => q.eq("scopeId", scopeId).eq("postId", canonicalPostId).eq("actorId", row.actorId)).unique();
      if (existing) await ctx.db.delete(row._id);
      else {
        await ctx.db.patch(row._id, { postId: canonicalPostId });
        movedVotes += 1;
      }
    }
  } else if (job.phase === "subscriptions") {
    const rows = await ctx.db.query("postSubscriptions").withIndex("by_scope_post_actor", (q) => q.eq("scopeId", scopeId).eq("postId", sourcePostId)).take(MERGE_BATCH_SIZE);
    processed = rows.length;
    for (const row of rows) {
      const existing = await ctx.db.query("postSubscriptions").withIndex("by_scope_post_actor", (q) => q.eq("scopeId", scopeId).eq("postId", canonicalPostId).eq("actorId", row.actorId)).unique();
      if (existing) await ctx.db.delete(row._id);
      else await ctx.db.patch(row._id, { postId: canonicalPostId });
    }
  } else if (job.phase === "comments") {
    const rows = await ctx.db.query("comments").withIndex("by_scope_post", (q) => q.eq("scopeId", scopeId).eq("postId", sourcePostId)).take(MERGE_BATCH_SIZE);
    processed = rows.length;
    movedComments = rows.length;
    for (const row of rows) await ctx.db.patch(row._id, { postId: canonicalPostId });
  } else if (job.phase === "activity") {
    const rows = await ctx.db.query("postActivity").withIndex("by_scope_post_occurred", (q) => q.eq("scopeId", scopeId).eq("postId", sourcePostId)).take(MERGE_BATCH_SIZE);
    processed = rows.length;
    for (const row of rows) await ctx.db.patch(row._id, { postId: canonicalPostId });
  } else if (job.phase === "changelog_links") {
    const rows = await ctx.db.query("changelogPostLinks").withIndex("by_scope_post_entry", (q) => q.eq("scopeId", scopeId).eq("postId", sourcePostId)).take(MERGE_BATCH_SIZE);
    processed = rows.length;
    for (const row of rows) {
      const existing = await ctx.db.query("changelogPostLinks").withIndex("by_scope_entry_post", (q) => q.eq("scopeId", scopeId).eq("entryId", row.entryId).eq("postId", canonicalPostId)).unique();
      if (existing) await ctx.db.delete(row._id);
      else await ctx.db.patch(row._id, { postId: canonicalPostId });
    }
  } else if (job.phase === "notification_guards") {
    const rows = await ctx.db.query("changelogNotificationGuards").withIndex("by_scope_post_entry", (q) => q.eq("scopeId", scopeId).eq("postId", sourcePostId)).take(MERGE_BATCH_SIZE);
    processed = rows.length;
    for (const row of rows) {
      const existing = await ctx.db.query("changelogNotificationGuards").withIndex("by_scope_entry_post", (q) => q.eq("scopeId", scopeId).eq("entryId", row.entryId).eq("postId", canonicalPostId)).unique();
      if (existing) await ctx.db.delete(row._id);
      else await ctx.db.patch(row._id, { postId: canonicalPostId });
    }
  } else if (job.phase === "notifications") {
    const rows = await ctx.db.query("notificationEvents").withIndex("by_scope_post_time", (q) => q.eq("scopeId", scopeId).eq("postId", sourcePostId)).take(MERGE_BATCH_SIZE);
    processed = rows.length;
    for (const row of rows) await ctx.db.patch(row._id, { postId: canonicalPostId, entityId: String(canonicalPostId) });
  } else if (job.phase === "tags") {
    const source = await ctx.db.get(sourcePostId);
    const canonical = await ctx.db.get(canonicalPostId);
    if (!source || !canonical) throw new Error("MERGE_POST_MISSING");
    const rows = await ctx.db.query("postTags").withIndex("by_scope_post_tag", (q) => q.eq("scopeId", scopeId).eq("postId", sourcePostId)).take(MERGE_BATCH_SIZE);
    processed = rows.length;
    for (const row of rows) {
      const existing = await ctx.db.query("postTags").withIndex("by_scope_post_tag", (q) => q.eq("scopeId", scopeId).eq("postId", canonicalPostId).eq("tagId", row.tagId)).unique();
      if (existing) await ctx.db.delete(row._id);
      else {
        await ctx.db.patch(row._id, { postId: canonicalPostId });
        await ctx.db.insert("postTagFeeds", tagFeedProjection(canonical, row.tagId));
        await ctx.db.insert("postTagSearches", tagSearchProjection(canonical, row.tagId));
      }
    }
    for (const table of ["postTagFeeds", "postTagSearches"] as const) {
      const projections = await ctx.db.query(table).withIndex("by_scope_post", (q) => q.eq("scopeId", scopeId).eq("postId", sourcePostId)).take(MERGE_BATCH_SIZE);
      for (const projection of projections) await ctx.db.delete(projection._id);
    }
  }
  return { processed, movedVotes, movedComments };
}

export async function finalizeMerge(ctx: MutationCtx, job: Doc<"mergeJobs">) {
  const source = await ctx.db.get(job.sourcePostId);
  const canonical = await ctx.db.get(job.canonicalPostId);
  if (!source || !canonical || source.scopeId !== job.scopeId || canonical.scopeId !== job.scopeId) {
    throw new Error("MERGE_SCOPE_INVARIANT");
  }
  const now = Date.now();
  const history = await ctx.db.query("mergeHistories").withIndex("by_scope_source", (q) => q.eq("scopeId", job.scopeId).eq("sourcePostId", source._id)).unique();
  if (!history) {
    await ctx.db.insert("mergeHistories", {
      scopeId: job.scopeId,
      sourcePostId: source._id,
      canonicalPostId: canonical._id,
      actorId: job.actorId,
      sourceTitle: source.title,
      sourceBody: source.body,
      sourceBoardId: source.boardId,
      sourceActorId: source.actorId,
      sourceStatusKey: source.statusKey,
      mergedAt: now,
    });
  }
  await ctx.db.patch(canonical._id, {
    voteCount: job.voteCount,
    commentCount: job.commentCount,
  });
  await ctx.db.patch(source._id, {
    mergedIntoPostId: canonical._id,
    mergeJobId: job._id,
    visibilityKey: "hidden",
  });
  await ctx.db.insert("postActivity", {
    scopeId: job.scopeId,
    postId: canonical._id,
    actorId: job.actorId,
    type: "merge",
    occurredAt: now,
  });
  await ctx.db.patch(job._id, { state: "complete", phase: "finalize", completedAt: now });
}
