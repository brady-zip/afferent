import type { Id } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { installationNotConfigured, invalidInput, notFound } from "./errors.js";

type DatabaseContext = Pick<QueryCtx | MutationCtx, "db">;

export function requireScope(scopeId: string): string {
  if (!scopeId.trim()) invalidInput("trusted scope is required");
  return scopeId;
}

export async function requireInstallation(
  ctx: DatabaseContext,
  scopeId: string,
) {
  requireScope(scopeId);
  const installation = await ctx.db
    .query("installations")
    .withIndex("by_scope", (q) => q.eq("scopeId", scopeId))
    .unique();
  if (!installation) installationNotConfigured();
  return installation;
}

export async function requireBoardInScope(
  ctx: DatabaseContext,
  scopeId: string,
  boardId: Id<"boards">,
) {
  requireScope(scopeId);
  const board = await ctx.db.get(boardId);
  if (!board || board.scopeId !== scopeId) notFound("board");
  return board;
}

export async function requirePostInScope(
  ctx: DatabaseContext,
  scopeId: string,
  postId: Id<"posts">,
) {
  requireScope(scopeId);
  const post = await ctx.db.get(postId);
  if (!post || post.scopeId !== scopeId) notFound("post");
  return post;
}
