import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";

export function toBoardDto(board: Doc<"boards">) {
  return { id: String(board._id), slug: board.slug, name: board.name };
}

export function toActorDto(actor: Doc<"actors">) {
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
