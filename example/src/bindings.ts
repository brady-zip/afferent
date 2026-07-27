import type { AfferentBindings } from "afferent/react.js";

import { api } from "../convex/_generated/api.js";

export type HostedAuthState =
  | Readonly<{ status: "checking" }>
  | Readonly<{ status: "signed_out" }>
  | Readonly<{ status: "signed_in"; sessionEpoch: string }>;

export type SandboxQuotaNotice =
  | Readonly<{
      contractVersion: 1;
      kind: "resource";
      resource: string;
      used: number;
      limit: number;
    }>
  | Readonly<{
      contractVersion: 1;
      kind: "storage";
    }>;

type LifecycleState =
  | "checking"
  | "signed_out"
  | "preparing"
  | "ready"
  | "resetting"
  | "expired"
  | "error";

export type SandboxLifecycleDto = Readonly<{
  state: LifecycleState;
  message: string;
  expiresAt?: number;
  quota?: SandboxQuotaNotice;
}>;

export const showcaseBindings = {
  public: {
    listFeedback: api.showcase.listFeedback,
    listComments: api.showcase.listComments,
    getPost: api.showcase.resolvePost,
    searchFeedback: api.showcase.searchFeedback,
  },
  roadmap: {
    listRoadmapGroup: api.showcase.listRoadmapGroup,
  },
  changelog: {
    listPublished: api.showcase.listPublishedChangelog,
    getPublishedBySlug: api.showcase.getPublishedChangelogBySlug,
  },
} as unknown as AfferentBindings;

export const sandboxBindings = {
  public: {
    listFeedback: api.sandbox.listFeedback,
    listComments: api.sandbox.listComments,
    getPost: api.sandbox.resolvePost,
    searchFeedback: api.sandbox.searchFeedback,
    suggestSimilarPosts: api.sandbox.suggestSimilarPosts,
  },
  participation: {
    createPost: api.sandbox.createPost,
    editPost: api.sandbox.editPost,
    withdrawPost: api.sandbox.withdrawPost,
    setVote: api.sandbox.setVote,
    addComment: api.sandbox.addComment,
  },
  notifications: {
    getPostSubscription: api.sandbox.getPostSubscription,
    setPostSubscription: api.sandbox.setPostSubscription,
    listNotifications: api.sandbox.listNotifications,
    getUnreadCount: api.sandbox.getUnreadCount,
    markNotificationRead: api.sandbox.markNotificationRead,
  },
  roadmap: {
    listRoadmapGroup: api.sandbox.listRoadmapGroup,
  },
  changelog: {
    listPublished: api.sandbox.listPublishedChangelog,
    getPublishedBySlug: api.sandbox.getPublishedChangelogBySlug,
  },
  admin: {
    capability: api.sandbox.adminCapability,
    listAdminFeedback: api.sandbox.listAdminFeedback,
    getAdminPost: api.sandbox.getAdminPost,
    listAdminChangelog: api.sandbox.listAdminChangelog,
    editPost: api.sandbox.adminEditPost,
    movePost: api.sandbox.movePost,
    setPostStatus: api.sandbox.setPostStatus,
    setDiscussionLock: api.sandbox.setDiscussionLock,
    setArchived: api.sandbox.setArchived,
    listPostActivity: api.sandbox.listPostActivity,
    listTags: api.sandbox.listTags,
    createTag: api.sandbox.createTag,
    renameTag: api.sandbox.renameTag,
    setPostTag: api.sandbox.setPostTag,
    deleteTag: api.sandbox.deleteTag,
    mergePost: api.sandbox.mergePost,
    createChangelogDraft: api.sandbox.createChangelogDraft,
    editChangelog: api.sandbox.editChangelog,
    setChangelogLinks: api.sandbox.setChangelogLinks,
    publishChangelog: api.sandbox.publishChangelog,
    unpublishChangelog: api.sandbox.unpublishChangelog,
  },
} as unknown as AfferentBindings;
