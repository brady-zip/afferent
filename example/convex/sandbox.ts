import { getAuthUserId } from "@convex-dev/auth/server";
import {
  addCommentIntentValidator,
  adminCapabilityIntentValidator,
  adminCapabilityResultValidator,
  adminChangelogEntryResultValidator,
  adminChangelogPageResultValidator,
  adminEditPostIntentValidator,
  adminFeedbackPageResultValidator,
  adminFeedbackPostResultValidator,
  boardListResultValidator,
  changelogPageResultValidator,
  commentPageResultValidator,
  countPostsIntentValidator,
  countResultValidator,
  createChangelogDraftIntentValidator,
  createPostIntentValidator,
  createTagIntentValidator,
  deleteTagIntentValidator,
  editChangelogIntentValidator,
  editPostIntentValidator,
  feedbackPageResultValidator,
  getAdminPostIntentValidator,
  getPostIntentValidator,
  getPostSubscriptionIntentValidator,
  getPublishedChangelogBySlugIntentValidator,
  getUnreadNotificationCountIntentValidator,
  listAdminChangelogIntentValidator,
  listAdminFeedbackIntentValidator,
  listBoardsIntentValidator,
  listCommentsIntentValidator,
  listFeedbackIntentValidator,
  listNotificationsIntentValidator,
  listPostActivityIntentValidator,
  listPostsIntentValidator,
  listPublishedChangelogIntentValidator,
  listRoadmapGroupIntentValidator,
  listTagsIntentValidator,
  markNotificationReadIntentValidator,
  mergePostIntentValidator,
  mergePostResultValidator,
  movePostIntentValidator,
  notificationPageResultValidator,
  notificationResultValidator,
  postActivityPageResultValidator,
  postLookupResultValidator,
  postPageResultValidator,
  postSubscriptionActionResultValidator,
  postSubscriptionResultValidator,
  publicCommentActionResultValidator,
  publicPostActionResultValidator,
  publicPostDtoValidator,
  publishChangelogIntentValidator,
  publishedChangelogLookupResultValidator,
  renameTagIntentValidator,
  roadmapGroupPageResultValidator,
  searchFeedbackIntentValidator,
  searchFeedbackResultValidator,
  setArchivedIntentValidator,
  setChangelogLinksIntentValidator,
  setDiscussionLockIntentValidator,
  setPostStatusIntentValidator,
  setPostSubscriptionIntentValidator,
  setPostTagIntentValidator,
  setVoteIntentValidator,
  similarPostResultValidator,
  suggestSimilarPostsIntentValidator,
  tagDeleteResultValidator,
  tagListResultValidator,
  tagResultValidator,
  unreadNotificationCountResultValidator,
  unpublishChangelogIntentValidator,
  withdrawPostIntentValidator,
} from "afferent";
import type { BoardId } from "afferent";
import type { ComponentApi } from "afferent/_generated/component.js";
import { paginationOptsValidator } from "convex/server";

import { createSandboxClient } from "./afferent.js";
import { components, internal } from "./_generated/api.js";
import {
  action,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server.js";
import {
  readSandboxLifecycle,
  resolveActivePhysicalScope,
  sandboxLifecycleResultValidator,
  type SandboxLifecycleResult,
} from "./sandboxLifecycle.js";
import { deriveLogicalSandboxKey } from "./sandboxScope.js";

const sandboxComponent = components.sandbox as ComponentApi;
const client = createSandboxClient(sandboxComponent, (ctx, verifiedUserId) =>
  resolveActivePhysicalScope(ctx, verifiedUserId),
);

async function requireVerifiedUser(ctx: Parameters<typeof getAuthUserId>[0]) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("AUTHENTICATION_REQUIRED");
  return userId;
}

async function prepareSandbox(
  ctx: ActionCtx,
  requestedReason: "ensure" | "reset",
): Promise<SandboxLifecycleResult> {
  const ownerKey = await deriveLogicalSandboxKey(
    await requireVerifiedUser(ctx),
  );
  const leaseOwner = crypto.randomUUID();
  const currentTime = Date.now();
  const preparation = (await ctx.runMutation(
    internal.sandboxLifecycle.beginPreparation,
    { ownerKey, requestedReason, leaseOwner, currentTime },
  )) as
    | { kind: "ready"; result: unknown }
    | { kind: "pending"; generation: number; leaseVersion: number };
  if (preparation.kind === "ready") {
    return preparation.result as SandboxLifecycleResult;
  }
  try {
    await ctx.runMutation(internal.sandboxLifecycle.seedPendingGeneration, {
      ownerKey,
      generation: preparation.generation,
      leaseVersion: preparation.leaseVersion,
    });
    return (await ctx.runMutation(
      internal.sandboxLifecycle.activatePendingGeneration,
      {
        ownerKey,
        generation: preparation.generation,
        leaseVersion: preparation.leaseVersion,
        currentTime: Date.now(),
      },
    )) as SandboxLifecycleResult;
  } catch {
    return (await ctx.runMutation(
      internal.sandboxLifecycle.failPendingGeneration,
      {
        ownerKey,
        generation: preparation.generation,
        leaseVersion: preparation.leaseVersion,
        currentTime: Date.now(),
      },
    )) as SandboxLifecycleResult;
  }
}

export const getSandboxLifecycle = query({
  args: {},
  returns: sandboxLifecycleResultValidator,
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId === null
      ? {
          state: "signed_out" as const,
          message: "Sign in to open your private sandbox.",
        }
      : readSandboxLifecycle(ctx, userId);
  },
});

export const ensureSandbox = action({
  args: {},
  returns: sandboxLifecycleResultValidator,
  handler: (ctx): Promise<SandboxLifecycleResult> =>
    prepareSandbox(ctx, "ensure"),
});

export const resetSandbox = action({
  args: {},
  returns: sandboxLifecycleResultValidator,
  handler: (ctx): Promise<SandboxLifecycleResult> =>
    prepareSandbox(ctx, "reset"),
});

export const listBoards = query({
  args: listBoardsIntentValidator.fields,
  returns: boardListResultValidator,
  handler: (ctx, args) => client.read.listBoards(ctx, args),
});

export const listPosts = query({
  args: {
    ...listPostsIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: postPageResultValidator,
  handler: (ctx, args) =>
    client.read.listPosts(ctx, {
      boardId: args.boardId as BoardId,
      paginationOpts: args.paginationOpts,
    }),
});

export const listFeedback = query({
  args: {
    ...listFeedbackIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: feedbackPageResultValidator,
  handler: (ctx, args) => client.read.listFeedback(ctx, args as never),
});

export const getPost = query({
  args: getPostIntentValidator.fields,
  returns: publicPostDtoValidator,
  handler: (ctx, args) => client.read.getPost(ctx, args as never),
});

export const resolvePost = query({
  args: getPostIntentValidator.fields,
  returns: postLookupResultValidator,
  handler: (ctx, args) => client.read.resolvePost(ctx, args as never),
});

export const countPosts = query({
  args: countPostsIntentValidator.fields,
  returns: countResultValidator,
  handler: (ctx, args) => client.read.countPosts(ctx, args as never),
});

export const listComments = query({
  args: {
    ...listCommentsIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: commentPageResultValidator,
  handler: (ctx, args) => client.read.listComments(ctx, args as never),
});

export const searchFeedback = query({
  args: searchFeedbackIntentValidator.fields,
  returns: searchFeedbackResultValidator,
  handler: (ctx, args) => client.read.searchFeedback(ctx, args as never),
});

export const suggestSimilarPosts = query({
  args: suggestSimilarPostsIntentValidator.fields,
  returns: similarPostResultValidator,
  handler: (ctx, args) => client.read.suggestSimilarPosts(ctx, args),
});

export const listRoadmapGroup = query({
  args: {
    ...listRoadmapGroupIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: roadmapGroupPageResultValidator,
  handler: (ctx, args) => client.read.listRoadmapGroup(ctx, args as never),
});

export const listPublishedChangelog = query({
  args: {
    ...listPublishedChangelogIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: changelogPageResultValidator,
  handler: (ctx, args) => client.read.listPublishedChangelog(ctx, args),
});

export const getPublishedChangelogBySlug = query({
  args: getPublishedChangelogBySlugIntentValidator.fields,
  returns: publishedChangelogLookupResultValidator,
  handler: (ctx, args) => client.read.getPublishedChangelogBySlug(ctx, args),
});

export const createPost = mutation({
  args: createPostIntentValidator.fields,
  returns: publicPostActionResultValidator,
  handler: (ctx, args) => client.participation.createPost(ctx, args as never),
});

export const editPost = mutation({
  args: editPostIntentValidator.fields,
  returns: publicPostActionResultValidator,
  handler: (ctx, args) => client.participation.editPost(ctx, args as never),
});

export const withdrawPost = mutation({
  args: withdrawPostIntentValidator.fields,
  returns: publicPostActionResultValidator,
  handler: (ctx, args) => client.participation.withdrawPost(ctx, args as never),
});

export const setVote = mutation({
  args: setVoteIntentValidator.fields,
  returns: publicPostActionResultValidator,
  handler: (ctx, args) => client.participation.setVote(ctx, args as never),
});

export const addComment = mutation({
  args: addCommentIntentValidator.fields,
  returns: publicCommentActionResultValidator,
  handler: (ctx, args) => client.participation.addComment(ctx, args as never),
});

export const getPostSubscription = query({
  args: getPostSubscriptionIntentValidator.fields,
  returns: postSubscriptionResultValidator,
  handler: (ctx, args) =>
    client.notifications.getPostSubscription(ctx, args as never),
});

export const setPostSubscription = mutation({
  args: setPostSubscriptionIntentValidator.fields,
  returns: postSubscriptionActionResultValidator,
  handler: (ctx, args) =>
    client.notifications.setPostSubscription(ctx, args as never),
});

export const listNotifications = query({
  args: {
    ...listNotificationsIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: notificationPageResultValidator,
  handler: (ctx, args) => client.notifications.listNotifications(ctx, args),
});

export const getUnreadCount = query({
  args: getUnreadNotificationCountIntentValidator.fields,
  returns: unreadNotificationCountResultValidator,
  handler: (ctx) => client.notifications.getUnreadCount(ctx, {}),
});

export const markNotificationRead = mutation({
  args: markNotificationReadIntentValidator.fields,
  returns: notificationResultValidator,
  handler: (ctx, args) =>
    client.notifications.markNotificationRead(ctx, args as never),
});

export const adminCapability = query({
  args: adminCapabilityIntentValidator.fields,
  returns: adminCapabilityResultValidator,
  handler: async (ctx) => {
    await client.admin.listTags(ctx, {});
    return true;
  },
});

export const listAdminFeedback = query({
  args: {
    ...listAdminFeedbackIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: adminFeedbackPageResultValidator,
  handler: (ctx, args) => client.admin.listAdminFeedback(ctx, args as never),
});

export const getAdminPost = query({
  args: getAdminPostIntentValidator.fields,
  returns: adminFeedbackPostResultValidator,
  handler: (ctx, args) => client.admin.getAdminPost(ctx, args as never),
});

export const listAdminChangelog = query({
  args: {
    ...listAdminChangelogIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: adminChangelogPageResultValidator,
  handler: (ctx, args) => client.admin.listAdminChangelog(ctx, args),
});

export const adminEditPost = mutation({
  args: adminEditPostIntentValidator.fields,
  returns: adminFeedbackPostResultValidator,
  handler: (ctx, args) => client.admin.editPost(ctx, args as never),
});

export const movePost = mutation({
  args: movePostIntentValidator.fields,
  returns: adminFeedbackPostResultValidator,
  handler: (ctx, args) => client.admin.movePost(ctx, args as never),
});

export const setPostStatus = mutation({
  args: setPostStatusIntentValidator.fields,
  returns: adminFeedbackPostResultValidator,
  handler: (ctx, args) => client.admin.setPostStatus(ctx, args as never),
});

export const setDiscussionLock = mutation({
  args: setDiscussionLockIntentValidator.fields,
  returns: adminFeedbackPostResultValidator,
  handler: (ctx, args) => client.admin.setDiscussionLock(ctx, args as never),
});

export const setArchived = mutation({
  args: setArchivedIntentValidator.fields,
  returns: adminFeedbackPostResultValidator,
  handler: (ctx, args) => client.admin.setArchived(ctx, args as never),
});

export const listPostActivity = query({
  args: {
    ...listPostActivityIntentValidator.fields,
    paginationOpts: paginationOptsValidator,
  },
  returns: postActivityPageResultValidator,
  handler: (ctx, args) => client.admin.listPostActivity(ctx, args as never),
});

export const listTags = query({
  args: listTagsIntentValidator.fields,
  returns: tagListResultValidator,
  handler: (ctx) => client.admin.listTags(ctx, {}),
});

export const createTag = mutation({
  args: createTagIntentValidator.fields,
  returns: tagResultValidator,
  handler: (ctx, args) => client.admin.createTag(ctx, args),
});

export const renameTag = mutation({
  args: renameTagIntentValidator.fields,
  returns: tagResultValidator,
  handler: (ctx, args) => client.admin.renameTag(ctx, args as never),
});

export const setPostTag = mutation({
  args: setPostTagIntentValidator.fields,
  returns: adminFeedbackPostResultValidator,
  handler: (ctx, args) => client.admin.setPostTag(ctx, args as never),
});

export const deleteTag = mutation({
  args: deleteTagIntentValidator.fields,
  returns: tagDeleteResultValidator,
  handler: (ctx, args) => client.admin.deleteTag(ctx, args as never),
});

export const mergePost = mutation({
  args: mergePostIntentValidator.fields,
  returns: mergePostResultValidator,
  handler: (ctx, args) => client.admin.mergePost(ctx, args as never),
});

export const createChangelogDraft = mutation({
  args: createChangelogDraftIntentValidator.fields,
  returns: adminChangelogEntryResultValidator,
  handler: (ctx, args) => client.admin.createChangelogDraft(ctx, args as never),
});

export const editChangelog = mutation({
  args: editChangelogIntentValidator.fields,
  returns: adminChangelogEntryResultValidator,
  handler: (ctx, args) => client.admin.editChangelog(ctx, args as never),
});

export const setChangelogLinks = mutation({
  args: setChangelogLinksIntentValidator.fields,
  returns: adminChangelogEntryResultValidator,
  handler: (ctx, args) => client.admin.setChangelogLinks(ctx, args as never),
});

export const publishChangelog = mutation({
  args: publishChangelogIntentValidator.fields,
  returns: adminChangelogEntryResultValidator,
  handler: (ctx, args) => client.admin.publishChangelog(ctx, args as never),
});

export const unpublishChangelog = mutation({
  args: unpublishChangelogIntentValidator.fields,
  returns: adminChangelogEntryResultValidator,
  handler: (ctx, args) => client.admin.unpublishChangelog(ctx, args as never),
});
