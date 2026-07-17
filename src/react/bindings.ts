import type { DefaultFunctionArgs, FunctionReference } from "convex/server";

import type {
  CommentDto,
  AdminChangelogEntryDto,
  ChangelogPageDto,
  FeedbackOrder,
  FeedbackPageDto,
  PaginationOptions,
  PostStatusKey,
  SearchResultDto,
  SimilarPostResultDto,
  FeedbackPostDto,
  PostDto,
  PostActivityPageDto,
  NotificationDto,
  NotificationPageDto,
  PostSubscriptionDto,
  UnreadNotificationCountDto,
  AfferentActionResult,
  PublishedChangelogLookupDto,
  RoadmapGroupPageDto,
  RoadmapStatusKey,
  TagDeleteResultDto,
  TagDto,
  TagListDto,
  PostLookupResult,
  MergePostResult,
} from "../client/contracts.js";

export type FeedbackFeedQueryReference = FunctionReference<
  "query",
  "public",
  {
    order: FeedbackOrder;
    boardId?: string;
    status?: PostStatusKey;
    tagId?: string;
    paginationOpts: PaginationOptions;
  },
  FeedbackPageDto
>;

export type FeedbackSearchQueryReference = FunctionReference<
  "query",
  "public",
  {
    query: string;
    boardId?: string;
    status?: PostStatusKey;
    tagId?: string;
  },
  SearchResultDto
>;

export type SimilarPostsQueryReference = FunctionReference<
  "query",
  "public",
  { title: string; body?: string; limit?: number },
  SimilarPostResultDto
>;

export interface PublicBindings {
  listFeedback: FeedbackFeedQueryReference;
  getPost?: FunctionReference<
    "query",
    "public",
    { postId: string },
    PostLookupResult
  >;
  searchFeedback?: FeedbackSearchQueryReference;
  suggestSimilarPosts?: SimilarPostsQueryReference;
}

export interface ParticipationBindings {
  createPost: FunctionReference<
    "mutation",
    "public",
    { boardId: string; title: string; body: string },
    AfferentActionResult<PostDto>
  >;
  editPost: FunctionReference<
    "mutation",
    "public",
    { postId: string; title?: string; body?: string },
    AfferentActionResult<PostDto>
  >;
  withdrawPost: FunctionReference<
    "mutation",
    "public",
    { postId: string },
    PostDto
  >;
  setVote: FunctionReference<
    "mutation",
    "public",
    { postId: string; desired: boolean },
    AfferentActionResult<PostDto>
  >;
  addComment: FunctionReference<
    "mutation",
    "public",
    { postId: string; body: string; parentCommentId?: string },
    AfferentActionResult<CommentDto>
  >;
}

export type RoadmapGroupQueryReference = FunctionReference<
  "query",
  "public",
  {
    status: RoadmapStatusKey;
    boardId?: string;
    sessionGeneration?: string;
    paginationOpts: PaginationOptions;
  },
  RoadmapGroupPageDto
>;

export interface RoadmapBindings {
  listRoadmapGroup: RoadmapGroupQueryReference;
}

export type ChangelogFeedQueryReference = FunctionReference<
  "query",
  "public",
  { sessionGeneration?: string; paginationOpts: PaginationOptions },
  ChangelogPageDto
>;

export type ChangelogEntryQueryReference = FunctionReference<
  "query",
  "public",
  { slug: string; sessionGeneration?: string },
  PublishedChangelogLookupDto
>;

export interface ChangelogBindings {
  listPublished: ChangelogFeedQueryReference;
  getPublishedBySlug: ChangelogEntryQueryReference;
}

export interface NotificationBindings {
  getPostSubscription: FunctionReference<
    "query",
    "public",
    { postId: string; sessionGeneration?: string },
    PostSubscriptionDto
  >;
  setPostSubscription: FunctionReference<
    "mutation",
    "public",
    { postId: string; desired: boolean },
    AfferentActionResult<PostSubscriptionDto>
  >;
  listNotifications: FunctionReference<
    "query",
    "public",
    { sessionGeneration?: string; paginationOpts: PaginationOptions },
    NotificationPageDto
  >;
  getUnreadCount: FunctionReference<
    "query",
    "public",
    { sessionGeneration?: string },
    UnreadNotificationCountDto
  >;
  markNotificationRead: FunctionReference<
    "mutation",
    "public",
    { notificationId: string },
    NotificationDto
  >;
}

type AdminMutationReference<
  Args extends DefaultFunctionArgs,
  Result = FeedbackPostDto,
> = FunctionReference<"mutation", "public", Args, Result>;

export interface AdminBindings {
  capability: FunctionReference<
    "query",
    "public",
    { sessionGeneration?: string },
    boolean
  >;
  editPost: AdminMutationReference<{
    postId: string;
    title?: string;
    body?: string;
  }>;
  movePost: AdminMutationReference<{ postId: string; boardId: string }>;
  setPostStatus: AdminMutationReference<{
    postId: string;
    status: PostStatusKey;
  }>;
  setDiscussionLock: AdminMutationReference<{
    postId: string;
    locked: boolean;
  }>;
  setArchived: AdminMutationReference<{ postId: string; archived: boolean }>;
  listPostActivity: FunctionReference<
    "query",
    "public",
    {
      postId: string;
      sessionGeneration?: string;
      paginationOpts: PaginationOptions;
    },
    PostActivityPageDto
  >;
  listTags: FunctionReference<
    "query",
    "public",
    { sessionGeneration?: string },
    TagListDto
  >;
  createTag: AdminMutationReference<{ name: string }, TagDto>;
  renameTag: AdminMutationReference<{ tagId: string; name: string }, TagDto>;
  setPostTag: AdminMutationReference<{
    postId: string;
    tagId: string;
    desired: boolean;
  }>;
  deleteTag: AdminMutationReference<{ tagId: string }, TagDeleteResultDto>;
  mergePost?: AdminMutationReference<
    { sourcePostId: string; canonicalPostId: string },
    MergePostResult
  >;
  createChangelogDraft?: AdminMutationReference<
    { title: string; body: string; slug?: string },
    AdminChangelogEntryDto
  >;
  editChangelog?: AdminMutationReference<
    {
      entryId: string;
      title?: string;
      body?: string;
      slug?: string;
    },
    AdminChangelogEntryDto
  >;
  setChangelogLinks?: AdminMutationReference<
    { entryId: string; postIds: string[] },
    AdminChangelogEntryDto
  >;
  publishChangelog?: AdminMutationReference<
    { entryId: string },
    AdminChangelogEntryDto
  >;
  unpublishChangelog?: AdminMutationReference<
    { entryId: string },
    AdminChangelogEntryDto
  >;
}

export interface AfferentBindings {
  public: PublicBindings;
  participation?: ParticipationBindings;
  notifications?: NotificationBindings;
  roadmap?: RoadmapBindings;
  changelog?: ChangelogBindings;
  admin?: AdminBindings;
}
