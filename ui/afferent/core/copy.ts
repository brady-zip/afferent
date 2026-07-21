export type AfferentUiCopy = Readonly<{
  common: Readonly<{
    signIn: string;
    signInHeading: string;
    notAuthorizedHeading: string;
    notAuthorizedBody: string;
    unsupportedHeading: string;
    unsupportedBody: string;
    loading: string;
    loadingParticipation: string;
    tryLoadingAgain: string;
    dismissError: string;
  }>;
  board: Readonly<{
    title: string;
    description: string;
    createFeedback: string;
    postFeedback: string;
    returnToFeedback: string;
    postingFeedback: string;
    browseHeading: string;
    resultsHeading: string;
    boardLabel: string;
    allBoards: string;
    searchLabel: string;
    statusLabel: string;
    allStatuses: string;
    sortLabel: string;
    titleLabel: string;
    titleHelp: string;
    bodyLabel: string;
    bodyHelp: string;
    createHelp: string;
    signInToCreate: string;
    createErrorHeading: string;
    similarHeading: string;
    similarHelp: string;
    loadingSimilar: string;
    noSimilarHeading: string;
    noSimilarBody: string;
    similarErrorHeading: string;
    loadingSearch: string;
    searchErrorHeading: string;
    searchResultsLabel: string;
    skipToFeedback: string;
    resultCount: (count: number) => string;
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
    loadingParticipation: "Loading participation…",
    tryLoadingAgain: "Try loading again",
    dismissError: "Dismiss error",
  },
  board: {
    title: "Feedback",
    description: "Share ideas and see what other people are requesting.",
    createFeedback: "Create feedback",
    postFeedback: "Post feedback",
    returnToFeedback: "Return to feedback",
    postingFeedback: "Posting feedback…",
    browseHeading: "Browse feedback",
    resultsHeading: "Feedback results",
    boardLabel: "Board",
    allBoards: "All boards",
    searchLabel: "Search feedback",
    statusLabel: "Status",
    allStatuses: "All statuses",
    sortLabel: "Sort feedback",
    titleLabel: "Feedback title",
    titleHelp: "Summarize the idea in a few words.",
    bodyLabel: "Feedback details",
    bodyHelp: "Describe the problem and the outcome you need.",
    createHelp:
      "Share enough detail for others to understand and discuss the idea.",
    signInToCreate: "Sign in through this application to create feedback.",
    createErrorHeading: "Feedback wasn't posted",
    similarHeading: "Similar feedback",
    similarHelp: "Review related feedback before posting a duplicate.",
    loadingSimilar: "Loading similar feedback…",
    noSimilarHeading: "No similar feedback found",
    noSimilarBody: "Continue creating your feedback post.",
    similarErrorHeading: "We couldn't load similar feedback",
    loadingSearch: "Loading feedback search…",
    searchErrorHeading: "We couldn't search feedback",
    searchResultsLabel: "Feedback search results",
    skipToFeedback: "Skip to feedback",
    resultCount: (count) =>
      `${count} feedback ${count === 1 ? "result" : "results"}`,
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
