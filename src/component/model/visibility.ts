import type { Doc } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { notFound } from "./errors.js";
import { requirePostInScope } from "./scope.js";

export const PUBLIC_POST_VISIBILITY = "visible" as const;
export const HIDDEN_POST_VISIBILITY = "hidden" as const;

export function postVisibilityKey(
  post: Pick<
    Doc<"posts">,
    "lifecycleState" | "archivedAt" | "mergedIntoPostId"
  >,
) {
  return post.lifecycleState === "active" &&
    post.archivedAt === undefined &&
    post.mergedIntoPostId === undefined
    ? PUBLIC_POST_VISIBILITY
    : HIDDEN_POST_VISIBILITY;
}

export function isPostPubliclyVisible(post: Doc<"posts">) {
  return (
    postVisibilityKey(post) === PUBLIC_POST_VISIBILITY &&
    (post.visibilityKey === undefined ||
      post.visibilityKey === PUBLIC_POST_VISIBILITY)
  );
}

export async function requireVisiblePost(
  ctx: QueryCtx | MutationCtx,
  scopeId: string,
  postId: string,
) {
  const post = await requirePostInScope(ctx, scopeId, postId);
  if (!isPostPubliclyVisible(post)) notFound("post");
  return post;
}
