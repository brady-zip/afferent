import {
  addCommentIntentValidator,
  adminCapabilityIntentValidator,
  adminCapabilityResultValidator,
  adminChangelogEntryResultValidator,
  adminEditPostIntentValidator,
  changelogPageResultValidator,
  commentPageResultValidator,
  configureInstallationIntentValidator,
  createAfferentClient,
  createChangelogDraftIntentValidator,
  createPostIntentValidator,
  createTagIntentValidator,
  deleteTagIntentValidator,
  editChangelogIntentValidator,
  editPostIntentValidator,
  feedbackPageResultValidator,
  getPostIntentValidator,
  getPostSubscriptionIntentValidator,
  getPublishedChangelogBySlugIntentValidator,
  getUnreadNotificationCountIntentValidator,
  installationResultValidator,
  listFeedbackIntentValidator,
  listCommentsIntentValidator,
  listNotificationsIntentValidator,
  listPostActivityIntentValidator,
  listPostsIntentValidator,
  listPublishedChangelogIntentValidator,
  listRoadmapGroupIntentValidator,
  listTagsIntentValidator,
  markNotificationReadIntentValidator,
  mergePostResultValidator,
  mergePostIntentValidator,
  movePostIntentValidator,
  notificationPageResultValidator,
  notificationResultValidator,
  postLookupResultValidator,
  postActivityPageResultValidator,
  postPageResultValidator,
  postSubscriptionResultValidator,
  postSubscriptionActionResultValidator,
  publicCommentActionResultValidator,
  publicFeedbackPostDtoValidator,
  publicPostActionResultValidator,
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
import { v } from "convex/values";

import { components } from "./_generated/api.js";
import { mutation, query } from "./_generated/server.js";

const installedComponent: ComponentApi = components.afferent;
const authorizeAdmin = async () => true;
const client = createAfferentClient(installedComponent, {
  resolveActor: async () => ({
    externalKey: "fixture:trusted-user",
    displayName: "Fixture User",
  }),
  authorizeAdmin,
  isAuthenticated: async () => true,
});

const cacheGenerationValidator = { sessionGeneration: v.number() };

function withoutSessionGeneration<T extends { sessionGeneration: number }>(
  args: T,
): Omit<T, "sessionGeneration"> {
  const { sessionGeneration: _sessionGeneration, ...intent } = args;
  return intent;
}

export const configureInstallation = mutation({
  args: configureInstallationIntentValidator.fields,
  returns: installationResultValidator,
  handler: (ctx, args) => client.admin.configureInstallation(ctx, args),
});

export const listPosts = query({
  args: listPostsIntentValidator.fields,
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
    ...cacheGenerationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: feedbackPageResultValidator,
  handler: (ctx, args) =>
    client.read.listFeedback(ctx, withoutSessionGeneration(args) as never),
});

export const listComments = query({
  args: {
    ...listCommentsIntentValidator.fields,
    ...cacheGenerationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: commentPageResultValidator,
  handler: (ctx, args) =>
    client.read.listComments(ctx, withoutSessionGeneration(args) as never),
});

export const resolvePost = query({
  args: { ...getPostIntentValidator.fields, ...cacheGenerationValidator },
  returns: postLookupResultValidator,
  handler: (ctx, args) =>
    client.read.resolvePost(ctx, withoutSessionGeneration(args) as never),
});

export const searchFeedback = query({
  args: { ...searchFeedbackIntentValidator.fields, ...cacheGenerationValidator },
  returns: searchFeedbackResultValidator,
  handler: (ctx, args) =>
    client.read.searchFeedback(ctx, withoutSessionGeneration(args) as never),
});

export const suggestSimilarPosts = query({
  args: {
    ...suggestSimilarPostsIntentValidator.fields,
    ...cacheGenerationValidator,
  },
  returns: similarPostResultValidator,
  handler: (ctx, args) =>
    client.read.suggestSimilarPosts(ctx, withoutSessionGeneration(args)),
});

export const listRoadmapGroup = query({
  args: {
    ...listRoadmapGroupIntentValidator.fields,
    ...cacheGenerationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: roadmapGroupPageResultValidator,
  handler: (ctx, args) =>
    client.read.listRoadmapGroup(ctx, withoutSessionGeneration(args) as never),
});

export const listPublishedChangelog = query({
  args: {
    ...listPublishedChangelogIntentValidator.fields,
    ...cacheGenerationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: changelogPageResultValidator,
  handler: (ctx, args) =>
    client.read.listPublishedChangelog(ctx, withoutSessionGeneration(args)),
});

export const getPublishedChangelogBySlug = query({
  args: {
    ...getPublishedChangelogBySlugIntentValidator.fields,
    ...cacheGenerationValidator,
  },
  returns: publishedChangelogLookupResultValidator,
  handler: (ctx, args) =>
    client.read.getPublishedChangelogBySlug(
      ctx,
      withoutSessionGeneration(args),
    ),
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
  args: {
    ...getPostSubscriptionIntentValidator.fields,
    ...cacheGenerationValidator,
  },
  returns: postSubscriptionResultValidator,
  handler: (ctx, args) =>
    client.notifications.getPostSubscription(
      ctx,
      withoutSessionGeneration(args) as never,
    ),
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
    ...cacheGenerationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: notificationPageResultValidator,
  handler: (ctx, args) =>
    client.notifications.listNotifications(ctx, withoutSessionGeneration(args)),
});

export const getUnreadCount = query({
  args: {
    ...getUnreadNotificationCountIntentValidator.fields,
    ...cacheGenerationValidator,
  },
  returns: unreadNotificationCountResultValidator,
  handler: (ctx, args) =>
    client.notifications.getUnreadCount(ctx, withoutSessionGeneration(args)),
});

export const markNotificationRead = mutation({
  args: markNotificationReadIntentValidator.fields,
  returns: notificationResultValidator,
  handler: (ctx, args) =>
    client.notifications.markNotificationRead(ctx, args as never),
});

export const adminCapability = query({
  args: {
    ...adminCapabilityIntentValidator.fields,
    ...cacheGenerationValidator,
  },
  returns: adminCapabilityResultValidator,
  handler: () => authorizeAdmin(),
});

export const adminEditPost = mutation({
  args: adminEditPostIntentValidator.fields,
  returns: publicFeedbackPostDtoValidator,
  handler: (ctx, args) => client.admin.editPost(ctx, args as never),
});

export const movePost = mutation({
  args: movePostIntentValidator.fields,
  returns: publicFeedbackPostDtoValidator,
  handler: (ctx, args) => client.admin.movePost(ctx, args as never),
});

export const setPostStatus = mutation({
  args: setPostStatusIntentValidator.fields,
  returns: publicFeedbackPostDtoValidator,
  handler: (ctx, args) => client.admin.setPostStatus(ctx, args as never),
});

export const setDiscussionLock = mutation({
  args: setDiscussionLockIntentValidator.fields,
  returns: publicFeedbackPostDtoValidator,
  handler: (ctx, args) => client.admin.setDiscussionLock(ctx, args as never),
});

export const setArchived = mutation({
  args: setArchivedIntentValidator.fields,
  returns: publicFeedbackPostDtoValidator,
  handler: (ctx, args) => client.admin.setArchived(ctx, args as never),
});

export const listPostActivity = query({
  args: {
    ...listPostActivityIntentValidator.fields,
    ...cacheGenerationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: postActivityPageResultValidator,
  handler: (ctx, args) =>
    client.admin.listPostActivity(ctx, withoutSessionGeneration(args) as never),
});

export const listTags = query({
  args: { ...listTagsIntentValidator.fields, ...cacheGenerationValidator },
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
  returns: publicFeedbackPostDtoValidator,
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
