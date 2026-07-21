import type { Doc, Id } from "../_generated/dataModel.js";

export function canActorWithdrawPost(
  post: Doc<"posts">,
  actorId: Id<"actors"> | undefined,
) {
  return actorId !== undefined && post.actorId === actorId;
}

export function canActorEditPost(
  post: Doc<"posts">,
  actorId: Id<"actors"> | undefined,
) {
  return (
    canActorWithdrawPost(post, actorId) &&
    post.lifecycleState === "active" &&
    post.archivedAt === undefined
  );
}
