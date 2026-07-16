import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { ANONYMIZED_AUTHOR_LABEL, isAnonymizedExternalKey } from "./actors.js";
import { MAX_TAGS_PER_POST } from "./scoring.js";

const STATUS_LABELS = {
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  complete: "Complete",
  closed: "Closed",
} as const;

export function toBoardDto(board: Doc<"boards">) {
  return { id: String(board._id), slug: board.slug, name: board.name };
}

export function toActorDto(actor: Doc<"actors">) {
  if (isAnonymizedExternalKey(actor.externalKey)) {
    return { id: String(actor._id), displayName: ANONYMIZED_AUTHOR_LABEL };
  }
  return {
    id: String(actor._id),
    ...(actor.displayName === undefined
      ? {}
      : { displayName: actor.displayName }),
    ...(actor.avatarUrl === undefined ? {} : { avatarUrl: actor.avatarUrl }),
  };
}

export async function toPostDto(
  ctx: QueryCtx | MutationCtx,
  post: Doc<"posts">,
) {
  const [board, actor] = await Promise.all([
    ctx.db.get(post.boardId),
    ctx.db.get(post.actorId),
  ]);
  if (
    !board ||
    board.scopeId !== post.scopeId ||
    !actor ||
    actor.scopeId !== post.scopeId
  ) {
    throw new ConvexError({ code: "INVARIANT_VIOLATION" });
  }
  return {
    contractVersion: 1 as const,
    id: String(post._id),
    boardId: String(post.boardId),
    board: toBoardDto(board),
    title: post.title,
    body: post.body,
    author: toActorDto(actor),
    status: { key: "open" as const, label: "Open" as const },
    voteCount: post.voteCount,
    commentCount: post.commentCount,
    totals: { votes: post.voteCount, comments: post.commentCount },
    tags: [] as string[],
  };
}

export async function toFeedbackPostDto(
  ctx: QueryCtx | MutationCtx,
  post: Doc<"posts">,
) {
  const [board, actor, memberships] = await Promise.all([
    ctx.db.get(post.boardId),
    ctx.db.get(post.actorId),
    ctx.db
      .query("postTags")
      .withIndex("by_scope_post_tag", (query) =>
        query.eq("scopeId", post.scopeId).eq("postId", post._id),
      )
      .take(MAX_TAGS_PER_POST + 1),
  ]);
  if (
    !board ||
    board.scopeId !== post.scopeId ||
    !actor ||
    actor.scopeId !== post.scopeId ||
    memberships.length > MAX_TAGS_PER_POST
  ) {
    throw new ConvexError({ code: "INVARIANT_VIOLATION" });
  }
  const tagRows = await Promise.all(
    memberships.map((membership) => ctx.db.get(membership.tagId)),
  );
  if (tagRows.some((tag) => tag === null || tag.scopeId !== post.scopeId)) {
    throw new ConvexError({ code: "INVARIANT_VIOLATION" });
  }
  return {
    contractVersion: 2 as const,
    id: String(post._id),
    boardId: String(post.boardId),
    board: toBoardDto(board),
    title: post.title,
    body: post.body,
    author: toActorDto(actor),
    status: {
      key: post.statusKey,
      label: STATUS_LABELS[post.statusKey],
    },
    voteCount: post.voteCount,
    commentCount: post.commentCount,
    totals: { votes: post.voteCount, comments: post.commentCount },
    tags: tagRows
      .filter((tag) => tag!.state === "active")
      .map((tag) => ({
        contractVersion: 1 as const,
        id: String(tag!._id),
        name: tag!.name,
      })),
  };
}
