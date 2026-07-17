import type { Doc, Id } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { conflict, notFound } from "./errors.js";
import { requirePostInScope } from "./scope.js";
import { tagFeedProjection, tagSearchProjection } from "./tags.js";
import { isPostPubliclyVisible } from "./visibility.js";

export const MERGE_ATOMIC_LIMIT = 50;
export const MERGE_BATCH_SIZE = 50;

export type MergeJobState = Doc<"mergeJobs">["state"];
export type MergePhase = Doc<"mergeJobs">["phase"];
export type MergeKind = Doc<"mergeStages">["kind"];

export type ActorMembership = Readonly<{
  actorId: string;
  state?: "subscribed" | "opted_out";
}>;

export type MergeWrite = Readonly<{
  kind: MergeKind;
  originalId: string;
  logicalKey: string;
}>;

type DatabaseCtx = Pick<QueryCtx | MutationCtx, "db">;
type MergeRelation =
  | Doc<"votes">
  | Doc<"postSubscriptions">
  | Doc<"comments">
  | Doc<"postActivity">
  | Doc<"changelogPostLinks">
  | Doc<"changelogNotificationGuards">
  | Doc<"notificationEvents">
  | Doc<"postTags">;

const PREPARATION_PHASES = [
  "votes",
  "subscriptions",
  "comments",
  "activity",
  "changelog_links",
  "notification_guards",
  "notifications",
  "tags",
] as const satisfies readonly MergePhase[];

const TERMINAL_STATES = new Set<MergeJobState>(["done", "aborted"]);

export function unionActorMemberships(
  canonical: readonly ActorMembership[],
  source: readonly ActorMembership[],
) {
  const union = new Map<string, ActorMembership>();
  for (const membership of [...canonical, ...source]) {
    const existing = union.get(membership.actorId);
    if (!existing || existing.state === undefined) {
      union.set(membership.actorId, membership);
    }
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

export function mergeReaderTruth(state: MergeJobState) {
  if (state === "preparing" || state === "ready" || state === "aborted") {
    return "originals" as const;
  }
  if (state === "done") return "normalized" as const;
  return "staged" as const;
}

export function canAbortMergeState(state: MergeJobState) {
  return state === "preparing" || state === "ready";
}

export function nextMergePreparationState(
  state: MergeJobState,
  deltaQueueEmpty: boolean,
) {
  if (state === "ready" && !deltaQueueEmpty) return "preparing" as const;
  if (state === "preparing" && deltaQueueEmpty) return "ready" as const;
  return state;
}

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

export async function assertMergeIntent(
  source: Doc<"posts">,
  canonical: Doc<"posts">,
) {
  if (source._id === canonical._id) {
    conflict("sourcePostId", "a post cannot merge into itself");
  }
  if (
    source.mergedIntoPostId !== undefined ||
    canonical.mergedIntoPostId !== undefined
  ) {
    conflict("canonicalPostId", "merge tombstones cannot be merge targets");
  }
}

function phaseKind(phase: MergePhase): MergeKind | null {
  switch (phase) {
    case "votes": {
      return "vote";
    }
    case "subscriptions": {
      return "subscription";
    }
    case "comments": {
      return "comment";
    }
    case "activity": {
      return "activity";
    }
    case "changelog_links": {
      return "changelog_link";
    }
    case "notification_guards": {
      return "notification_guard";
    }
    case "notifications": {
      return "notification";
    }
    case "tags": {
      return "tag";
    }
    default: {
      return null;
    }
  }
}

function logicalKey(kind: MergeKind, row: MergeRelation) {
  if ((kind === "vote" || kind === "subscription") && "actorId" in row) {
    return String(row.actorId);
  }
  if (
    (kind === "changelog_link" || kind === "notification_guard") &&
    "entryId" in row
  ) {
    return String(row.entryId);
  }
  if (kind === "tag" && "tagId" in row) return String(row.tagId);
  return String(row._id);
}

async function relationBatch(
  ctx: DatabaseCtx,
  args: {
    scopeId: string;
    postId: Id<"posts">;
    phase: MergePhase;
    after?: number;
    limit: number;
  },
): Promise<MergeRelation[]> {
  const after = args.after ?? -1;
  switch (args.phase) {
    case "votes": {
      return await ctx.db
        .query("votes")
        .withIndex("by_scope_post_actor", (q) =>
          q.eq("scopeId", args.scopeId).eq("postId", args.postId),
        )
        .filter((q) => q.gt(q.field("_creationTime"), after))
        .order("asc")
        .take(args.limit);
    }
    case "subscriptions": {
      return await ctx.db
        .query("postSubscriptions")
        .withIndex("by_scope_post_actor", (q) =>
          q.eq("scopeId", args.scopeId).eq("postId", args.postId),
        )
        .filter((q) => q.gt(q.field("_creationTime"), after))
        .order("asc")
        .take(args.limit);
    }
    case "comments": {
      return await ctx.db
        .query("comments")
        .withIndex("by_scope_post", (q) =>
          q.eq("scopeId", args.scopeId).eq("postId", args.postId),
        )
        .filter((q) => q.gt(q.field("_creationTime"), after))
        .order("asc")
        .take(args.limit);
    }
    case "activity": {
      return await ctx.db
        .query("postActivity")
        .withIndex("by_scope_post_occurred", (q) =>
          q.eq("scopeId", args.scopeId).eq("postId", args.postId),
        )
        .filter((q) => q.gt(q.field("_creationTime"), after))
        .order("asc")
        .take(args.limit);
    }
    case "changelog_links": {
      return await ctx.db
        .query("changelogPostLinks")
        .withIndex("by_scope_post_entry", (q) =>
          q.eq("scopeId", args.scopeId).eq("postId", args.postId),
        )
        .filter((q) => q.gt(q.field("_creationTime"), after))
        .order("asc")
        .take(args.limit);
    }
    case "notification_guards": {
      return await ctx.db
        .query("changelogNotificationGuards")
        .withIndex("by_scope_post_entry", (q) =>
          q.eq("scopeId", args.scopeId).eq("postId", args.postId),
        )
        .filter((q) => q.gt(q.field("_creationTime"), after))
        .order("asc")
        .take(args.limit);
    }
    case "notifications": {
      return await ctx.db
        .query("notificationEvents")
        .withIndex("by_scope_post_time", (q) =>
          q.eq("scopeId", args.scopeId).eq("postId", args.postId),
        )
        .filter((q) => q.gt(q.field("_creationTime"), after))
        .order("asc")
        .take(args.limit);
    }
    case "tags": {
      return await ctx.db
        .query("postTags")
        .withIndex("by_scope_post_tag", (q) =>
          q.eq("scopeId", args.scopeId).eq("postId", args.postId),
        )
        .filter((q) => q.gt(q.field("_creationTime"), after))
        .order("asc")
        .take(args.limit);
    }
    default: {
      return [];
    }
  }
}

export async function countAffectedMergeRelations(
  ctx: DatabaseCtx,
  args: {
    scopeId: string;
    sourcePostId: Id<"posts">;
    canonicalPostId: Id<"posts">;
  },
) {
  let total = 0;
  for (const phase of PREPARATION_PHASES) {
    for (const postId of [args.sourcePostId, args.canonicalPostId]) {
      const rows = await relationBatch(ctx, {
        scopeId: args.scopeId,
        postId,
        phase,
        limit: MERGE_ATOMIC_LIMIT + 1,
      });
      total += rows.length;
      if (total > MERGE_ATOMIC_LIMIT) return total;
    }
  }
  return total;
}

async function activeJobsForPost(
  ctx: DatabaseCtx,
  scopeId: string,
  postId: Id<"posts">,
) {
  const [asSource, asCanonical] = await Promise.all([
    ctx.db
      .query("mergeJobs")
      .withIndex("by_scope_source", (q) =>
        q.eq("scopeId", scopeId).eq("sourcePostId", postId),
      )
      .take(20),
    ctx.db
      .query("mergeJobs")
      .withIndex("by_scope_canonical", (q) =>
        q.eq("scopeId", scopeId).eq("canonicalPostId", postId),
      )
      .take(20),
  ]);
  return [...asSource, ...asCanonical].filter(
    (job) => !TERMINAL_STATES.has(job.state),
  );
}

export async function findActiveMergeJob(
  ctx: DatabaseCtx,
  scopeId: string,
  postId: Id<"posts">,
) {
  const jobs = await activeJobsForPost(ctx, scopeId, postId);
  if (jobs.length > 1) throw new Error("MERGE_ACTIVE_JOB_INVARIANT");
  return jobs[0] ?? null;
}

export async function createMergeJob(
  ctx: MutationCtx,
  args: {
    scopeId: string;
    sourcePostId: Id<"posts">;
    canonicalPostId: Id<"posts">;
    actorId: Id<"actors">;
  },
) {
  const [sourceJobs, canonicalJobs] = await Promise.all([
    activeJobsForPost(ctx, args.scopeId, args.sourcePostId),
    activeJobsForPost(ctx, args.scopeId, args.canonicalPostId),
  ]);
  if (sourceJobs.length > 0 || canonicalJobs.length > 0) {
    conflict("sourcePostId", "one of the posts already has an active merge");
  }
  const jobId = await ctx.db.insert("mergeJobs", {
    ...args,
    state: "preparing",
    phase: "votes",
    phaseSide: "source",
    generation: 1,
    continuationScheduled: false,
    createdAt: Date.now(),
    voteCount: 0,
    commentCount: 0,
  });
  return { jobId, state: "preparing" as const };
}

async function insertStage(
  ctx: MutationCtx,
  args: {
    job: Doc<"mergeJobs">;
    kind: MergeKind;
    row: MergeRelation;
    sourceSide: boolean;
  },
) {
  const { job, kind, row, sourceSide } = args;
  const key = logicalKey(kind, row);
  const existingOriginal = await ctx.db
    .query("mergeStages")
    .withIndex("by_scope_job_kind_original", (q) =>
      q
        .eq("scopeId", job.scopeId)
        .eq("mergeJobId", job._id)
        .eq("kind", kind)
        .eq("originalId", String(row._id)),
    )
    .unique();
  if (existingOriginal) return { vote: 0, comment: 0 };
  const existingLogical = await ctx.db
    .query("mergeStages")
    .withIndex("by_scope_job_kind_key", (q) =>
      q
        .eq("scopeId", job.scopeId)
        .eq("mergeJobId", job._id)
        .eq("kind", kind)
        .eq("logicalKey", key),
    )
    .first();
  await ctx.db.insert("mergeStages", {
    scopeId: job.scopeId,
    mergeJobId: job._id,
    sourcePostId: job.sourcePostId,
    canonicalPostId: job.canonicalPostId,
    kind,
    originalId: String(row._id),
    logicalKey: key,
    sourceSide,
    generation: job.generation,
  });
  return {
    vote: kind === "vote" && !existingLogical ? 1 : 0,
    comment: kind === "comment" && !existingLogical ? 1 : 0,
  };
}

function nextPhase(phase: MergePhase) {
  const index = PREPARATION_PHASES.indexOf(
    phase as (typeof PREPARATION_PHASES)[number],
  );
  return index === -1 || index === PREPARATION_PHASES.length - 1
    ? null
    : PREPARATION_PHASES[index + 1];
}

async function prepareBatch(ctx: MutationCtx, job: Doc<"mergeJobs">) {
  const kind = phaseKind(job.phase);
  if (!kind) return { complete: true };
  const sourceSide = job.phaseSide === "source";
  const postId = sourceSide ? job.sourcePostId : job.canonicalPostId;
  const rows = await relationBatch(ctx, {
    scopeId: job.scopeId,
    postId,
    phase: job.phase,
    after: job.phaseCursor,
    limit: MERGE_BATCH_SIZE,
  });
  let voteIncrement = 0;
  let commentIncrement = 0;
  for (const row of rows) {
    const increment = await insertStage(ctx, {
      job,
      kind,
      row,
      sourceSide,
    });
    voteIncrement += increment.vote;
    commentIncrement += increment.comment;
  }
  if (rows.length > 0) {
    await ctx.db.patch(job._id, {
      phaseCursor: rows.at(-1)!._creationTime,
      voteCount: job.voteCount + voteIncrement,
      commentCount: job.commentCount + commentIncrement,
    });
    return { complete: false };
  }
  if (sourceSide) {
    await ctx.db.patch(job._id, {
      phaseSide: "canonical",
      phaseCursor: undefined,
    });
    return { complete: false };
  }
  const following = nextPhase(job.phase);
  if (following) {
    await ctx.db.patch(job._id, {
      phase: following,
      phaseSide: "source",
      phaseCursor: undefined,
    });
    return { complete: false };
  }
  const delta = await ctx.db
    .query("mergeDeltas")
    .withIndex("by_scope_job", (q) =>
      q.eq("scopeId", job.scopeId).eq("mergeJobId", job._id),
    )
    .first();
  if (delta) {
    await ctx.db.patch(job._id, {
      phase: "votes",
      phaseSide: "source",
      phaseCursor: undefined,
      generation: job.generation + 1,
    });
    return { complete: false };
  }
  await ctx.db.patch(job._id, {
    state: "ready",
    phase: "cutover",
    phaseSide: "source",
    phaseCursor: undefined,
  });
  return { complete: true };
}

async function writeMergeHistory(
  ctx: MutationCtx,
  args: {
    job: Doc<"mergeJobs">;
    source: Doc<"posts">;
    now: number;
  },
) {
  const { job, source, now } = args;
  const existing = await ctx.db
    .query("mergeHistories")
    .withIndex("by_scope_source", (q) =>
      q.eq("scopeId", job.scopeId).eq("sourcePostId", source._id),
    )
    .unique();
  if (existing) return;
  await ctx.db.insert("mergeHistories", {
    scopeId: job.scopeId,
    sourcePostId: source._id,
    canonicalPostId: job.canonicalPostId,
    actorId: job.actorId,
    sourceTitle: source.title,
    sourceBody: source.body,
    sourceBoardId: source.boardId,
    sourceActorId: source.actorId,
    sourceStatusKey: source.statusKey,
    mergedAt: now,
  });
}

export async function cutoverMerge(
  ctx: MutationCtx,
  job: Doc<"mergeJobs">,
) {
  if (job.state !== "ready") return job.state;
  const [source, canonical, delta] = await Promise.all([
    ctx.db.get(job.sourcePostId),
    ctx.db.get(job.canonicalPostId),
    ctx.db
      .query("mergeDeltas")
      .withIndex("by_scope_job", (q) =>
        q.eq("scopeId", job.scopeId).eq("mergeJobId", job._id),
      )
      .first(),
  ]);
  if (
    !source ||
    !canonical ||
    source.scopeId !== job.scopeId ||
    canonical.scopeId !== job.scopeId
  ) {
    throw new Error("MERGE_SCOPE_INVARIANT");
  }
  if (delta) {
    await ctx.db.patch(job._id, {
      state: "preparing",
      phase: "votes",
      phaseSide: "source",
      phaseCursor: undefined,
      generation: job.generation + 1,
    });
    return "preparing" as const;
  }
  const now = Date.now();
  await writeMergeHistory(ctx, { job, source, now });
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
  await ctx.db.patch(job._id, {
    state: "cutover_done",
    phase: "cleanup",
    cutoverAt: now,
  });
  return "cutover_done" as const;
}

async function normalizeSourceRelation(
  ctx: MutationCtx,
  job: Doc<"mergeJobs">,
  stage: Doc<"mergeStages">,
) {
  switch (stage.kind) {
    case "vote": {
      const id = ctx.db.normalizeId("votes", stage.originalId);
      const row = id ? await ctx.db.get(id) : null;
      if (!row || row.postId === job.canonicalPostId) return;
      const existing = await ctx.db
        .query("votes")
        .withIndex("by_scope_post_actor", (q) =>
          q
            .eq("scopeId", job.scopeId)
            .eq("postId", job.canonicalPostId)
            .eq("actorId", row.actorId),
        )
        .unique();
      if (existing) await ctx.db.delete(row._id);
      else await ctx.db.patch(row._id, { postId: job.canonicalPostId });
      return;
    }
    case "subscription": {
      const id = ctx.db.normalizeId("postSubscriptions", stage.originalId);
      const row = id ? await ctx.db.get(id) : null;
      if (!row || row.postId === job.canonicalPostId) return;
      const existing = await ctx.db
        .query("postSubscriptions")
        .withIndex("by_scope_post_actor", (q) =>
          q
            .eq("scopeId", job.scopeId)
            .eq("postId", job.canonicalPostId)
            .eq("actorId", row.actorId),
        )
        .unique();
      if (existing) await ctx.db.delete(row._id);
      else await ctx.db.patch(row._id, { postId: job.canonicalPostId });
      return;
    }
    case "comment": {
      const id = ctx.db.normalizeId("comments", stage.originalId);
      const row = id ? await ctx.db.get(id) : null;
      if (row && row.postId !== job.canonicalPostId) {
        await ctx.db.patch(row._id, { postId: job.canonicalPostId });
      }
      return;
    }
    case "activity": {
      const id = ctx.db.normalizeId("postActivity", stage.originalId);
      const row = id ? await ctx.db.get(id) : null;
      if (row && row.postId !== job.canonicalPostId) {
        await ctx.db.patch(row._id, { postId: job.canonicalPostId });
      }
      return;
    }
    case "changelog_link": {
      const id = ctx.db.normalizeId("changelogPostLinks", stage.originalId);
      const row = id ? await ctx.db.get(id) : null;
      if (!row || row.postId === job.canonicalPostId) return;
      const existing = await ctx.db
        .query("changelogPostLinks")
        .withIndex("by_scope_entry_post", (q) =>
          q
            .eq("scopeId", job.scopeId)
            .eq("entryId", row.entryId)
            .eq("postId", job.canonicalPostId),
        )
        .unique();
      if (existing) await ctx.db.delete(row._id);
      else await ctx.db.patch(row._id, { postId: job.canonicalPostId });
      return;
    }
    case "notification_guard": {
      const id = ctx.db.normalizeId(
        "changelogNotificationGuards",
        stage.originalId,
      );
      const row = id ? await ctx.db.get(id) : null;
      if (!row || row.postId === job.canonicalPostId) return;
      const existing = await ctx.db
        .query("changelogNotificationGuards")
        .withIndex("by_scope_entry_post", (q) =>
          q
            .eq("scopeId", job.scopeId)
            .eq("entryId", row.entryId)
            .eq("postId", job.canonicalPostId),
        )
        .unique();
      if (existing) await ctx.db.delete(row._id);
      else await ctx.db.patch(row._id, { postId: job.canonicalPostId });
      return;
    }
    case "notification": {
      const id = ctx.db.normalizeId("notificationEvents", stage.originalId);
      const row = id ? await ctx.db.get(id) : null;
      if (row?.postId === job.sourcePostId) {
        await ctx.db.patch(row._id, {
          postId: job.canonicalPostId,
          entityId: String(job.canonicalPostId),
        });
      }
      return;
    }
    case "tag": {
      const id = ctx.db.normalizeId("postTags", stage.originalId);
      const row = id ? await ctx.db.get(id) : null;
      if (!row || row.postId === job.canonicalPostId) return;
      const existing = await ctx.db
        .query("postTags")
        .withIndex("by_scope_post_tag", (q) =>
          q
            .eq("scopeId", job.scopeId)
            .eq("postId", job.canonicalPostId)
            .eq("tagId", row.tagId),
        )
        .unique();
      if (existing) await ctx.db.delete(row._id);
      else await ctx.db.patch(row._id, { postId: job.canonicalPostId });
      const canonical = await ctx.db.get(job.canonicalPostId);
      if (!canonical) throw new Error("MERGE_CANONICAL_MISSING");
      for (const table of ["postTagFeeds", "postTagSearches"] as const) {
        const projections = await ctx.db
          .query(table)
          .withIndex("by_scope_post", (q) =>
            q.eq("scopeId", job.scopeId).eq("postId", job.sourcePostId),
          )
          .take(MERGE_BATCH_SIZE);
        for (const projection of projections) await ctx.db.delete(projection._id);
      }
      const canonicalFeed = await ctx.db
        .query("postTagFeeds")
        .withIndex("by_scope_tag_post", (q) =>
          q
            .eq("scopeId", job.scopeId)
            .eq("tagId", row.tagId)
            .eq("postId", job.canonicalPostId),
        )
        .unique();
      if (!canonicalFeed) {
        await ctx.db.insert("postTagFeeds", tagFeedProjection(canonical, row.tagId));
      }
      const canonicalSearch = await ctx.db
        .query("postTagSearches")
        .withIndex("by_scope_post_tag", (q) =>
          q
            .eq("scopeId", job.scopeId)
            .eq("postId", job.canonicalPostId)
            .eq("tagId", row.tagId),
        )
        .unique();
      if (!canonicalSearch) {
        await ctx.db.insert(
          "postTagSearches",
          tagSearchProjection(canonical, row.tagId),
        );
      }
    }
  }
}

async function cleanupBatch(ctx: MutationCtx, job: Doc<"mergeJobs">) {
  const rows = await ctx.db
    .query("mergeStages")
    .withIndex("by_scope_job_kind_key", (q) =>
      q.eq("scopeId", job.scopeId).eq("mergeJobId", job._id),
    )
    .take(MERGE_BATCH_SIZE);
  if (rows.length === 0) {
    await ctx.db.patch(job._id, {
      state: "done",
      completedAt: Date.now(),
      continuationScheduled: false,
    });
    return "done" as const;
  }
  for (const row of rows) {
    if (row.sourceSide) await normalizeSourceRelation(ctx, job, row);
    await ctx.db.delete(row._id);
  }
  return "cleaning" as const;
}

export async function continueMergeJob(
  ctx: MutationCtx,
  scopeId: string,
  jobId: string,
) {
  const id = ctx.db.normalizeId("mergeJobs", jobId);
  if (!id) notFound("post");
  const job = await ctx.db.get(id);
  if (!job || job.scopeId !== scopeId) notFound("post");
  if (TERMINAL_STATES.has(job.state)) return { state: job.state };
  await ctx.db.patch(job._id, { continuationScheduled: false });
  if (job.state === "preparing") {
    const deltas = await ctx.db
      .query("mergeDeltas")
      .withIndex("by_scope_job", (q) =>
        q.eq("scopeId", job.scopeId).eq("mergeJobId", job._id),
      )
      .take(MERGE_BATCH_SIZE);
    if (deltas.length > 0) {
      const staged = await ctx.db
        .query("mergeStages")
        .withIndex("by_scope_job_kind_key", (q) =>
          q.eq("scopeId", job.scopeId).eq("mergeJobId", job._id),
        )
        .take(MERGE_BATCH_SIZE);
      if (staged.length > 0) {
        for (const row of staged) await ctx.db.delete(row._id);
        return { state: "preparing" as const };
      }
      for (const delta of deltas) await ctx.db.delete(delta._id);
      await ctx.db.patch(job._id, {
        phase: "votes",
        phaseSide: "source",
        phaseCursor: undefined,
        voteCount: 0,
        commentCount: 0,
      });
      return { state: "preparing" as const };
    }
    await prepareBatch(ctx, job);
  } else if (job.state === "ready") {
    await cutoverMerge(ctx, job);
  } else if (job.state === "cutover_done") {
    await ctx.db.patch(job._id, { state: "cleaning" });
  } else if (job.state === "cleaning") {
    await cleanupBatch(ctx, job);
  }
  const updated = await ctx.db.get(job._id);
  return { state: updated?.state ?? job.state };
}

export async function abortMergeJob(
  ctx: MutationCtx,
  scopeId: string,
  jobId: string,
) {
  const id = ctx.db.normalizeId("mergeJobs", jobId);
  if (!id) notFound("post");
  const job = await ctx.db.get(id);
  if (!job || job.scopeId !== scopeId) notFound("post");
  if (job.state === "aborted") return { state: "aborted" as const };
  if (!canAbortMergeState(job.state)) {
    conflict("mergeJobId", "merge cannot be aborted after cutover");
  }
  await ctx.db.patch(job._id, {
    state: "aborted",
    abortedAt: Date.now(),
    continuationScheduled: false,
  });
  const [stages, deltas] = await Promise.all([
    ctx.db
      .query("mergeStages")
      .withIndex("by_scope_job_kind_key", (q) =>
        q.eq("scopeId", scopeId).eq("mergeJobId", job._id),
      )
      .take(MERGE_BATCH_SIZE),
    ctx.db
      .query("mergeDeltas")
      .withIndex("by_scope_job", (q) =>
        q.eq("scopeId", scopeId).eq("mergeJobId", job._id),
      )
      .take(MERGE_BATCH_SIZE),
  ]);
  for (const row of [...stages, ...deltas]) await ctx.db.delete(row._id);
  return { state: "aborted" as const };
}

export async function fenceMergeWrite(
  ctx: MutationCtx,
  args: {
    scopeId: string;
    jobId: string;
    postId: Id<"posts">;
    writes: readonly MergeWrite[];
  },
) {
  const id = ctx.db.normalizeId("mergeJobs", args.jobId);
  const job = id ? await ctx.db.get(id) : null;
  if (!job || job.scopeId !== args.scopeId || TERMINAL_STATES.has(job.state)) {
    return;
  }
  if (
    args.postId !== job.sourcePostId &&
    args.postId !== job.canonicalPostId
  ) {
    return;
  }
  if (job.state === "cutover_done" || job.state === "cleaning") return;
  const generation = job.generation + 1;
  for (const write of args.writes) {
    const existing = await ctx.db
      .query("mergeDeltas")
      .withIndex("by_scope_job_original", (q) =>
        q
          .eq("scopeId", args.scopeId)
          .eq("mergeJobId", job._id)
          .eq("originalId", write.originalId),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("mergeDeltas", {
        scopeId: args.scopeId,
        mergeJobId: job._id,
        ...write,
        generation,
      });
    }
  }
  await ctx.db.patch(job._id, {
    generation,
    ...(job.state === "ready"
      ? {
          state: "preparing" as const,
          phase: "votes" as const,
          phaseSide: "source" as const,
          phaseCursor: undefined,
        }
      : {}),
  });
}

export async function fenceActiveMergeWrite(
  ctx: MutationCtx,
  args: {
    scopeId: string;
    postId: Id<"posts">;
    writes: readonly MergeWrite[];
  },
) {
  const job = await findActiveMergeJob(ctx, args.scopeId, args.postId);
  if (!job) return;
  await fenceMergeWrite(ctx, { ...args, jobId: String(job._id) });
}

export async function resolveMergeWritePost(
  ctx: DatabaseCtx,
  scopeId: string,
  postId: string,
) {
  const post = await requirePostInScope(ctx, scopeId, postId);
  if (post.mergedIntoPostId !== undefined) {
    return await requirePostInScope(ctx, scopeId, post.mergedIntoPostId);
  }
  const job = await findActiveMergeJob(ctx, scopeId, post._id);
  if (
    job &&
    (job.state === "cutover_done" ||
      job.state === "cleaning" ||
      job.state === "done")
  ) {
    return await requirePostInScope(ctx, scopeId, job.canonicalPostId);
  }
  return post;
}

export async function mergeReadPostIds(
  ctx: DatabaseCtx,
  scopeId: string,
  postId: Id<"posts">,
) {
  const post = await ctx.db.get(postId);
  if (!post || post.scopeId !== scopeId) return [postId] as const;
  if (post.mergedIntoPostId !== undefined) {
    return [post.mergedIntoPostId, post._id] as const;
  }
  const jobs = await ctx.db
    .query("mergeJobs")
    .withIndex("by_scope_canonical", (q) =>
      q.eq("scopeId", scopeId).eq("canonicalPostId", postId),
    )
    .order("desc")
    .take(20);
  const job = jobs.find(
    (candidate) =>
      candidate.state === "cutover_done" || candidate.state === "cleaning",
  );
  return job ? ([job.canonicalPostId, job.sourcePostId] as const) : ([postId] as const);
}

async function sourceRowsForAtomicMerge(
  ctx: DatabaseCtx,
  job: Doc<"mergeJobs">,
) {
  const rows: { kind: MergeKind; row: MergeRelation }[] = [];
  for (const phase of PREPARATION_PHASES) {
    const kind = phaseKind(phase)!;
    const phaseRows = await relationBatch(ctx, {
      scopeId: job.scopeId,
      postId: job.sourcePostId,
      phase,
      limit: MERGE_ATOMIC_LIMIT + 1,
    });
    for (const row of phaseRows) rows.push({ kind, row });
  }
  return rows;
}

export async function runAtomicMerge(
  ctx: MutationCtx,
  job: Doc<"mergeJobs">,
) {
  const relations = await sourceRowsForAtomicMerge(ctx, job);
  if (relations.length > MERGE_ATOMIC_LIMIT) {
    throw new Error("MERGE_ATOMIC_LIMIT_EXCEEDED");
  }
  for (const relation of relations) {
    await normalizeSourceRelation(ctx, job, {
      _id: "atomic" as Id<"mergeStages">,
      _creationTime: 0,
      scopeId: job.scopeId,
      mergeJobId: job._id,
      sourcePostId: job.sourcePostId,
      canonicalPostId: job.canonicalPostId,
      kind: relation.kind,
      originalId: String(relation.row._id),
      logicalKey: logicalKey(relation.kind, relation.row),
      sourceSide: true,
      generation: job.generation,
    });
  }
  const [votes, comments] = await Promise.all([
    ctx.db
      .query("votes")
      .withIndex("by_scope_post_actor", (q) =>
        q.eq("scopeId", job.scopeId).eq("postId", job.canonicalPostId),
      )
      .take(MERGE_ATOMIC_LIMIT + 1),
    ctx.db
      .query("comments")
      .withIndex("by_scope_post", (q) =>
        q.eq("scopeId", job.scopeId).eq("postId", job.canonicalPostId),
      )
      .take(MERGE_ATOMIC_LIMIT + 1),
  ]);
  await ctx.db.patch(job._id, {
    state: "ready",
    phase: "cutover",
    voteCount: votes.length,
    commentCount: comments.length,
  });
  await cutoverMerge(ctx, {
    ...job,
    state: "ready",
    phase: "cutover",
    voteCount: votes.length,
    commentCount: comments.length,
  });
  await ctx.db.patch(job._id, {
    state: "done",
    completedAt: Date.now(),
  });
  return { state: "done" as const };
}

async function observationRows(
  ctx: DatabaseCtx,
  scopeId: string,
  postId: Id<"posts">,
) {
  const [votes, subscriptions, comments, activity, links, guards, events, tags] =
    await Promise.all([
      ctx.db.query("votes").withIndex("by_scope_post_actor", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(1000),
      ctx.db.query("postSubscriptions").withIndex("by_scope_post_actor", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(1000),
      ctx.db.query("comments").withIndex("by_scope_post", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(1000),
      ctx.db.query("postActivity").withIndex("by_scope_post_occurred", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(1000),
      ctx.db.query("changelogPostLinks").withIndex("by_scope_post_entry", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(1000),
      ctx.db.query("changelogNotificationGuards").withIndex("by_scope_post_entry", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(1000),
      ctx.db.query("notificationEvents").withIndex("by_scope_post_time", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(1000),
      ctx.db.query("postTags").withIndex("by_scope_post_tag", (q) => q.eq("scopeId", scopeId).eq("postId", postId)).take(1000),
    ]);
  return {
    votes: votes.map((row) => String(row.actorId)),
    subscriptions: subscriptions.map((row) => `${row.actorId}:${row.state}`),
    comments: comments.map((row) => String(row._id)),
    activity: activity.map((row) => String(row._id)),
    links: links.map((row) => String(row.entryId)),
    guards: guards.map((row) => String(row.entryId)),
    notifications: events.map((row) => String(row._id)),
    tags: tags.map((row) => String(row.tagId)),
  };
}

function sortedUnique(values: readonly string[]) {
  return [...new Set(values)].sort();
}

function unionObservation(
  left: Awaited<ReturnType<typeof observationRows>>,
  right: Awaited<ReturnType<typeof observationRows>>,
) {
  return {
    votes: sortedUnique([...left.votes, ...right.votes]),
    subscriptions: sortedUnique([...left.subscriptions, ...right.subscriptions]),
    comments: sortedUnique([...left.comments, ...right.comments]),
    activity: sortedUnique([...left.activity, ...right.activity]),
    links: sortedUnique([...left.links, ...right.links]),
    guards: sortedUnique([...left.guards, ...right.guards]),
    notifications: sortedUnique([...left.notifications, ...right.notifications]),
    tags: sortedUnique([...left.tags, ...right.tags]),
  };
}

export async function mergeObservation(
  ctx: DatabaseCtx,
  scopeId: string,
  jobId: string,
) {
  const id = ctx.db.normalizeId("mergeJobs", jobId);
  if (!id) notFound("post");
  const job = await ctx.db.get(id);
  if (!job || job.scopeId !== scopeId) notFound("post");
  const [source, canonical, sourceRows, canonicalRows, stages] = await Promise.all([
    ctx.db.get(job.sourcePostId),
    ctx.db.get(job.canonicalPostId),
    observationRows(ctx, scopeId, job.sourcePostId),
    observationRows(ctx, scopeId, job.canonicalPostId),
    ctx.db.query("mergeStages").withIndex("by_scope_job_kind_key", (q) => q.eq("scopeId", scopeId).eq("mergeJobId", job._id)).take(1000),
  ]);
  if (!source || !canonical) throw new Error("MERGE_OBSERVATION_INVARIANT");
  const postCutover =
    job.state === "cutover_done" || job.state === "cleaning" || job.state === "done";
  const union = unionObservation(canonicalRows, sourceRows);
  const empty = unionObservation(sourceRows, sourceRows);
  for (const key of Object.keys(empty) as (keyof typeof empty)[]) empty[key] = [];
  return {
    scopeId,
    state: job.state,
    redirect: postCutover ? String(job.canonicalPostId) : null,
    canonical: postCutover ? union : canonicalRows,
    source: postCutover ? empty : sourceRows,
    counters: postCutover
      ? { votes: canonical.voteCount, comments: canonical.commentCount }
      : {
          canonicalVotes: canonical.voteCount,
          canonicalComments: canonical.commentCount,
          sourceVotes: source.voteCount,
          sourceComments: source.commentCount,
        },
    physical: {
      sourceRelations: Object.values(sourceRows).reduce(
        (sum, rows) => sum + rows.length,
        0,
      ),
      stageRows: stages.length,
    },
  };
}
