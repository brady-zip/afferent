export type AfferentUiCopy = Readonly<{
  common: Readonly<{
    signIn: string;
    signInHeading: string;
    notAuthorizedHeading: string;
    notAuthorizedBody: string;
    unsupportedHeading: string;
    unsupportedBody: string;
    loading: string;
    tryLoadingAgain: string;
  }>;
  board: Readonly<{
    title: string;
    description: string;
    createFeedback: string;
    postFeedback: string;
    emptyHeading: string;
    emptyBody: string;
    noMatchesHeading: string;
    noMatchesBody: string;
    clearFilters: string;
    loadErrorHeading: string;
    loadErrorBody: string;
    loadMore: string;
    loadingMore: string;
    voteCount: (count: number) => string;
    commentCount: (count: number) => string;
  }>;
  roadmap: Readonly<{
    title: string;
    emptyGroup: (groupName: string) => string;
    emptyGroupBody: (groupName: string) => string;
  }>;
  changelog: Readonly<{
    title: string;
    emptyHeading: string;
    emptyBody: string;
  }>;
  notifications: Readonly<{
    title: string;
    emptyHeading: string;
    emptyBody: string;
    markRead: string;
    loadMore: string;
  }>;
  admin: Readonly<{
    title: string;
    emptyHeading: string;
    emptyBody: string;
    saveModeration: string;
    updateStatus: string;
    mergeDuplicate: string;
    archiveFeedback: string;
    restoreFeedback: string;
    saveChangelogDraft: string;
    publishChangelog: string;
    unpublishChangelog: string;
  }>;
}>;

export type DeepPartial<T> = {
  [Key in keyof T]?: T[Key] extends (...args: never[]) => unknown
    ? T[Key]
    : T[Key] extends object
      ? DeepPartial<T[Key]>
      : T[Key];
};

export const englishAfferentUiCopy: AfferentUiCopy = {
  common: {
    signIn: "Sign in",
    signInHeading: "Sign in to continue",
    notAuthorizedHeading: "You don't have access to this area",
    notAuthorizedBody:
      "Ask an application administrator if you need feedback management access.",
    unsupportedHeading: "This feature isn't configured",
    unsupportedBody:
      "The application needs to provide the required Afferent function references.",
    loading: "Loading",
    tryLoadingAgain: "Try loading again",
  },
  board: {
    title: "Feedback",
    description: "Share ideas and see what other people are requesting.",
    createFeedback: "Create feedback",
    postFeedback: "Post feedback",
    emptyHeading: "No feedback yet",
    emptyBody: "Start the conversation by creating the first feedback post.",
    noMatchesHeading: "No matching feedback",
    noMatchesBody: "Try a different search or clear the active filters.",
    clearFilters: "Clear feedback filters",
    loadErrorHeading: "We couldn't load feedback",
    loadErrorBody:
      "Try loading it again. If the problem continues, contact the application owner.",
    loadMore: "Load more feedback",
    loadingMore: "Loading more feedback…",
    voteCount: (count) => `${count} ${count === 1 ? "vote" : "votes"}`,
    commentCount: (count) => `${count} ${count === 1 ? "comment" : "comments"}`,
  },
  roadmap: {
    title: "Roadmap",
    emptyGroup: (groupName) => `Nothing in ${groupName}`,
    emptyGroupBody: (groupName) =>
      `Feedback will appear here when its status changes to ${groupName}.`,
  },
  changelog: {
    title: "Changelog",
    emptyHeading: "Updates will appear here",
    emptyBody: "Published product updates haven't been added yet.",
  },
  notifications: {
    title: "Notifications",
    emptyHeading: "You're all caught up",
    emptyBody:
      "New replies, status changes, and changelog updates will appear here.",
    markRead: "Mark notification read",
    loadMore: "Load more notifications",
  },
  admin: {
    title: "Feedback management",
    emptyHeading: "No feedback to review",
    emptyBody: "Feedback matching this queue will appear here.",
    saveModeration: "Save moderation changes",
    updateStatus: "Update feedback status",
    mergeDuplicate: "Merge duplicate",
    archiveFeedback: "Archive feedback",
    restoreFeedback: "Restore feedback",
    saveChangelogDraft: "Save changelog draft",
    publishChangelog: "Publish changelog entry",
    unpublishChangelog: "Unpublish changelog entry",
  },
};

function mergeRecord<T extends object>(base: T, override: DeepPartial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override) as (keyof T)[]) {
    const next = override[key];
    if (next === undefined) continue;
    const current = base[key];
    result[String(key)] =
      typeof current === "object" &&
      current !== null &&
      typeof next === "object" &&
      next !== null
        ? mergeRecord(current, next as DeepPartial<typeof current>)
        : next;
  }
  return result as T;
}

export function mergeAfferentUiCopy(
  override: DeepPartial<AfferentUiCopy> = {},
): AfferentUiCopy {
  return mergeRecord(englishAfferentUiCopy, override);
}
