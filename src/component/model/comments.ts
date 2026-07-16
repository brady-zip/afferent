import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { invalidInput, notFound } from "./errors.js";
import { requireScope } from "./scope.js";
import { toActorDto } from "./views.js";

const MAX_COMMENT_LENGTH = 10_000;
type DatabaseContext = Pick<QueryCtx | MutationCtx, "db">;

export function normalizeCommentBody(value: string) {
  const body = value.trim();
  if (!body || body.length > MAX_COMMENT_LENGTH) {
    invalidInput(`comment must contain 1 to ${MAX_COMMENT_LENGTH} characters`);
  }
  return body;
}

export async function requireRootParent(
  ctx: DatabaseContext,
  keys: {
    scopeId: string;
    postId: Id<"posts">;
    parentCommentId: string | Id<"comments">;
  },
) {
  requireScope(keys.scopeId);
  const normalized = ctx.db.normalizeId(
    "comments",
    String(keys.parentCommentId),
  );
  if (!normalized) notFound("comment");
  const parent = await ctx.db.get(normalized);
  if (!parent || parent.scopeId !== keys.scopeId) notFound("comment");
  if (parent.postId !== keys.postId) {
    invalidInput("parent comment must belong to the same post");
  }
  if (parent.parentCommentId !== undefined) {
    invalidInput("replies may only target root comments");
  }
  return parent;
}

export async function toCommentDto(
  ctx: DatabaseContext,
  comment: Doc<"comments">,
) {
  const actor = await ctx.db.get(comment.actorId);
  if (!actor || actor.scopeId !== comment.scopeId) {
    throw new ConvexError({ code: "INVARIANT_VIOLATION" });
  }
  return {
    contractVersion: 1 as const,
    id: String(comment._id),
    postId: String(comment.postId),
    body: comment.body,
    author: toActorDto(actor),
    ...(comment.parentCommentId === undefined
      ? {}
      : { parentCommentId: String(comment.parentCommentId) }),
  };
}
