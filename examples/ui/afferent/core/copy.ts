import { formatAfferentDateTime } from "@/components/afferent/core/format";

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
    postedFeedback: string;
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
    reloadFeedback: string;
    retrySearch: string;
    retrySimilar: string;
    loadMore: string;
    loadingMore: string;
    voteCount: (count: number) => string;
    commentCount: (count: number) => string;
  }>;
  detail: Readonly<{
    loading: string;
    loadErrorHeading: string;
    retryLoading: string;
    notFoundHeading: string;
    notFoundBody: string;
    returnToFeedback: string;
    mergedHeading: string;
    mergedBody: string;
    viewCanonical: string;
    votes: string;
    comments: string;
    author: string;
    signInBody: string;
    vote: string;
    removeVote: string;
    subscribe: string;
    unsubscribe: string;
    edit: string;
    withdraw: string;
    editTitle: string;
    editBody: string;
    saveChanges: string;
    returnToPost: string;
    withdrawTitle: (title: string) => string;
    withdrawBody: string;
    keepFeedback: string;
  }>;
  discussion: Readonly<{
    heading: string;
    loading: string;
    emptyHeading: string;
    emptyBody: string;
    loadErrorHeading: string;
    retryLoading: string;
    loadMore: string;
    loadingMore: string;
    anonymousAuthor: string;
    reply: string;
    commentLabel: string;
    replyLabel: string;
    postComment: string;
    postReply: string;
    postedComment: string;
    returnToCommenting: string;
    signInBody: string;
  }>;
  activity: Readonly<{
    heading: string;
    unsupportedHeading: string;
    unsupportedBody: string;
    loading: string;
    emptyHeading: string;
    emptyBody: string;
    errorHeading: string;
    retryLoading: string;
    loadMore: string;
    loadingMore: string;
  }>;
  roadmap: Readonly<{
    title: string;
    description: string;
    boardLabel: string;
    allBoards: string;
    loadingGroup: (groupName: string) => string;
    emptyGroup: (groupName: string) => string;
    emptyGroupBody: (groupName: string) => string;
    loadErrorHeading: (groupName: string) => string;
    loadMore: (groupName: string) => string;
    loadingMore: (groupName: string) => string;
  }>;
  changelog: Readonly<{
    title: string;
    description: string;
    loading: string;
    loadingEntry: string;
    loadErrorHeading: string;
    entryErrorHeading: string;
    retryFeed: string;
    retryEntry: string;
    notFoundHeading: string;
    notFoundBody: string;
    emptyHeading: string;
    emptyBody: string;
    entriesLabel: string;
    entryDetail: string;
    linkedFeedback: string;
    loadMore: string;
    loadingMore: string;
    publishedAt: (value: number) => string;
  }>;
  notifications: Readonly<{
    title: string;
    description: string;
    loading: string;
    loadErrorHeading: string;
    signInBody: string;
    emptyHeading: string;
    emptyBody: string;
    unreadCount: (count: number) => string;
    unread: string;
    typeLabel: (type: string) => string;
    markRead: string;
    markingRead: string;
    loadMore: string;
    loadingMore: string;
    trigger: string;
  }>;
  admin: Readonly<{
    title: string;
    queueHeading: string;
    moderationHeading: string;
    manageTags: string;
    changelogHeading: string;
    loadError: string;
    loadMore: string;
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
    loading: string;
    selectFeedbackHeading: string;
    selectFeedbackBody: string;
    selectedFeedback: string;
    returnToQueue: string;
    loadingDetail: string;
    detailUnsupportedHeading: string;
    detailErrorHeading: string;
    activityHeading: string;
    activityLoading: string;
    activityEmptyHeading: string;
    activityEmptyBody: string;
    activityErrorHeading: string;
    activityUnsupportedHeading: string;
    loadMoreActivity: string;
    loadingMoreActivity: string;
    tagsLoading: string;
    tagsEmptyHeading: string;
    tagsEmptyBody: string;
    tagsErrorHeading: string;
    createTag: string;
    newTagLabel: string;
    assignTag: string;
    removeTag: string;
    deleteTag: string;
    deleteTagTitle: (name: string) => string;
    deleteTagBody: string;
    keepTag: string;
    archiveTitle: (title: string) => string;
    archiveBody: string;
    mergeDescription: (
      duplicateTitle: string,
      canonicalTitle: string,
    ) => string;
    canonicalFeedback: string;
    duplicateTitle: string;
    changelogLoading: string;
    changelogEmptyHeading: string;
    changelogEmptyBody: string;
    changelogErrorHeading: string;
    changelogUnsupportedHeading: string;
    changelogNotAuthorizedHeading: string;
    loadMoreChangelog: string;
    loadingMoreChangelog: string;
    changelogTitleLabel: string;
    changelogBodyLabel: string;
    linkedFeedback: string;
    publishTitle: (title: string) => string;
    publishBody: string;
    returnToEditing: string;
    unpublishTitle: (title: string) => string;
    unpublishBody: string;
    keepChangelogPublished: string;
    mutationErrorHeading: (action: string) => string;
    dismissMutationError: string;
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
    postedFeedback: "Feedback posted.",
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
    reloadFeedback: "Reload feedback",
    retrySearch: "Retry feedback search",
    retrySimilar: "Retry similar feedback",
    loadMore: "Load more feedback",
    loadingMore: "Loading more feedback…",
    voteCount: (count) => `${count} ${count === 1 ? "vote" : "votes"}`,
    commentCount: (count) => `${count} ${count === 1 ? "comment" : "comments"}`,
  },
  detail: {
    loading: "Loading feedback detail…",
    loadErrorHeading: "We couldn't load feedback detail",
    retryLoading: "Retry feedback detail",
    notFoundHeading: "Feedback not found",
    notFoundBody: "It may have been withdrawn, archived, or made unavailable.",
    returnToFeedback: "Return to feedback",
    mergedHeading: "This feedback was merged",
    mergedBody: "Continue to the canonical feedback post.",
    viewCanonical: "View canonical feedback",
    votes: "Votes",
    comments: "Comments",
    author: "Author",
    signInBody: "Sign in through this application to participate in feedback.",
    vote: "Vote for feedback",
    removeVote: "Remove feedback vote",
    subscribe: "Subscribe to updates",
    unsubscribe: "Unsubscribe from updates",
    edit: "Edit feedback",
    withdraw: "Withdraw feedback",
    editTitle: "Feedback title",
    editBody: "Feedback details",
    saveChanges: "Save feedback changes",
    returnToPost: "Return to feedback detail",
    withdrawTitle: (title) => `Withdraw “${title}”?`,
    withdrawBody: "It will no longer appear in public feedback views.",
    keepFeedback: "Keep feedback",
  },
  discussion: {
    heading: "Discussion",
    loading: "Loading discussion…",
    emptyHeading: "Start the discussion",
    emptyBody: "Be the first to add a comment to this feedback.",
    loadErrorHeading: "We couldn't load discussion",
    retryLoading: "Retry discussion",
    loadMore: "Load more comments",
    loadingMore: "Loading more comments…",
    anonymousAuthor: "Anonymous contributor",
    reply: "Reply",
    commentLabel: "Add a comment",
    replyLabel: "Add a reply",
    postComment: "Post comment",
    postReply: "Post reply",
    postedComment: "Comment posted.",
    returnToCommenting: "Return to commenting",
    signInBody: "Sign in through this application to comment on feedback.",
  },
  activity: {
    heading: "Activity",
    unsupportedHeading: "Activity isn't configured",
    unsupportedBody:
      "The application needs to provide the activity function reference.",
    loading: "Loading activity…",
    emptyHeading: "No activity yet",
    emptyBody: "Updates to this feedback will appear here.",
    errorHeading: "We couldn't load activity",
    retryLoading: "Retry activity",
    loadMore: "Load more activity",
    loadingMore: "Loading more activity…",
  },
  roadmap: {
    title: "Roadmap",
    description: "See what is planned, in progress, and complete.",
    boardLabel: "Roadmap board",
    allBoards: "All boards",
    loadingGroup: (groupName) => `Loading ${groupName} roadmap…`,
    emptyGroup: (groupName) => `Nothing in ${groupName}`,
    emptyGroupBody: (groupName) =>
      `Feedback will appear here when its status changes to ${groupName}.`,
    loadErrorHeading: (groupName) => `We couldn't load ${groupName} roadmap`,
    loadMore: (groupName) => `Load more ${groupName}`,
    loadingMore: (groupName) => `Loading more ${groupName}…`,
  },
  changelog: {
    title: "Changelog",
    description: "Read published product updates in chronological order.",
    loading: "Loading changelog…",
    loadingEntry: "Loading changelog entry…",
    loadErrorHeading: "We couldn't load changelog",
    entryErrorHeading: "We couldn't load this changelog entry",
    retryFeed: "Reload changelog",
    retryEntry: "Retry changelog entry",
    notFoundHeading: "Changelog entry not found",
    notFoundBody: "It may have been unpublished or made unavailable.",
    emptyHeading: "Updates will appear here",
    emptyBody: "Published product updates haven't been added yet.",
    entriesLabel: "Published product updates",
    entryDetail: "Changelog entry detail",
    linkedFeedback: "Linked feedback",
    loadMore: "Load more changelog entries",
    loadingMore: "Loading more changelog entries…",
    publishedAt: (value) => `Published ${formatAfferentDateTime(value)}`,
  },
  notifications: {
    title: "Notifications",
    description:
      "Review replies, feedback status changes, and product updates.",
    loading: "Loading notifications…",
    loadErrorHeading: "We couldn't load notifications",
    signInBody: "Sign in through this application to view notifications.",
    emptyHeading: "You're all caught up",
    emptyBody:
      "New replies, status changes, and changelog updates will appear here.",
    unreadCount: (count) =>
      `${count} unread ${count === 1 ? "notification" : "notifications"}`,
    unread: "Unread",
    typeLabel: (type) => {
      const labels: Readonly<Record<string, string>> = {
        status_changed: "Feedback status changed",
        admin_replied: "Administrator replied",
        comment_replied: "New reply",
        mentioned: "You were mentioned",
        changelog_published: "Changelog published",
      };
      return labels[type] ?? "Notification";
    },
    markRead: "Mark notification read",
    markingRead: "Marking notification read…",
    loadMore: "Load more notifications",
    loadingMore: "Loading more notifications…",
    trigger: "Open notifications",
  },
  admin: {
    title: "Feedback management",
    queueHeading: "Feedback queue",
    moderationHeading: "Moderation",
    manageTags: "Manage tags",
    changelogHeading: "Changelog publishing",
    loadError: "We couldn't load feedback management",
    loadMore: "Load more managed feedback",
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
    loading: "Loading feedback management…",
    selectFeedbackHeading: "Select feedback",
    selectFeedbackBody: "Choose a queue item to open its management workspace.",
    selectedFeedback: "Selected feedback",
    returnToQueue: "Return to feedback queue",
    loadingDetail: "Loading feedback detail…",
    detailUnsupportedHeading: "Feedback detail isn't configured",
    detailErrorHeading: "We couldn't load feedback detail",
    activityHeading: "Activity",
    activityLoading: "Loading feedback activity…",
    activityEmptyHeading: "No feedback activity yet",
    activityEmptyBody:
      "Administrative changes to this feedback will appear here.",
    activityErrorHeading: "We couldn't load feedback activity",
    activityUnsupportedHeading: "Feedback activity isn't configured",
    loadMoreActivity: "Load more feedback activity",
    loadingMoreActivity: "Loading more feedback activity…",
    tagsLoading: "Loading feedback tags…",
    tagsEmptyHeading: "No feedback tags yet",
    tagsEmptyBody: "Create a feedback tag to organize managed feedback.",
    tagsErrorHeading: "We couldn't load feedback tags",
    createTag: "Create feedback tag",
    newTagLabel: "New feedback tag",
    assignTag: "Assign feedback tag",
    removeTag: "Remove feedback tag",
    deleteTag: "Delete feedback tag",
    deleteTagTitle: (name) => `Delete “${name}”?`,
    deleteTagBody:
      "The tag will be removed from assigned feedback without deleting feedback.",
    keepTag: "Keep tag",
    archiveTitle: (title) => `Archive “${title}”?`,
    archiveBody: "It will leave public feedback views until restored.",
    mergeDescription: (duplicateTitle, canonicalTitle) =>
      `Merge “${duplicateTitle}” into “${canonicalTitle}”? This moves its votes, comments, and history and cannot be undone. Type “${duplicateTitle}” to confirm.`,
    canonicalFeedback: "Canonical feedback",
    duplicateTitle: "Duplicate title",
    changelogLoading: "Loading changelog entries…",
    changelogEmptyHeading: "No changelog entries yet",
    changelogEmptyBody: "Save a changelog draft to begin an editorial update.",
    changelogErrorHeading: "We couldn't load changelog entries",
    changelogUnsupportedHeading: "Changelog publishing isn't configured",
    changelogNotAuthorizedHeading: "You can't manage changelog entries",
    loadMoreChangelog: "Load more changelog entries",
    loadingMoreChangelog: "Loading more changelog entries…",
    changelogTitleLabel: "Changelog title",
    changelogBodyLabel: "Changelog body",
    linkedFeedback: "Linked feedback",
    publishTitle: (title) => `Publish “${title}” now?`,
    publishBody: "It will become visible at its public changelog link.",
    returnToEditing: "Return to editing",
    unpublishTitle: (title) => `Unpublish “${title}”?`,
    unpublishBody:
      "Its public changelog link will stop showing the entry until republished.",
    keepChangelogPublished: "Keep changelog published",
    mutationErrorHeading: (action) => `${action} wasn't completed`,
    dismissMutationError: "Dismiss error and continue editing",
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
