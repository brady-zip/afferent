import type { DefaultFunctionArgs, FunctionReference } from "convex/server";

import type {
  BoardId,
  CommentDto,
  AdminChangelogEntryDto,
  ChangelogId,
  ChangelogPageDto,
  FeedbackOrder,
  FeedbackPageDto,
  PaginationOptions,
  PostStatusKey,
  TagId,
  SearchResultDto,
  SimilarPostResultDto,
  FeedbackPostDto,
  PostDto,
  PostActivityPageDto,
  PostId,
  NotificationDto,
  NotificationId,
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
    boardId?: BoardId;
    status?: PostStatusKey;
    tagId?: TagId;
    paginationOpts: PaginationOptions;
  },
  FeedbackPageDto
>;

export type FeedbackSearchQueryReference = FunctionReference<
  "query",
  "public",
  {
    query: string;
    boardId?: BoardId;
    status?: PostStatusKey;
    tagId?: TagId;
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
    { postId: PostId },
    PostLookupResult
  >;
  searchFeedback?: FeedbackSearchQueryReference;
  suggestSimilarPosts?: SimilarPostsQueryReference;
}

export interface ParticipationBindings {
  createPost: FunctionReference<
    "mutation",
    "public",
    { boardId: BoardId; title: string; body: string },
    AfferentActionResult<PostDto>
  >;
  editPost: FunctionReference<
    "mutation",
    "public",
    { postId: PostId; title?: string; body?: string },
    AfferentActionResult<PostDto>
  >;
  withdrawPost: FunctionReference<
    "mutation",
    "public",
    { postId: PostId },
    PostDto
  >;
  setVote: FunctionReference<
    "mutation",
    "public",
    { postId: PostId; desired: boolean },
    AfferentActionResult<PostDto>
  >;
  addComment: FunctionReference<
    "mutation",
    "public",
    { postId: PostId; body: string; parentCommentId?: CommentDto["id"] },
    AfferentActionResult<CommentDto>
  >;
}

export type RoadmapGroupQueryReference = FunctionReference<
  "query",
  "public",
  {
    status: RoadmapStatusKey;
    boardId?: BoardId;
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
    { postId: PostId; sessionGeneration?: string },
    PostSubscriptionDto
  >;
  setPostSubscription: FunctionReference<
    "mutation",
    "public",
    { postId: PostId; desired: boolean },
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
    { notificationId: NotificationId },
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
    postId: PostId;
    title?: string;
    body?: string;
  }>;
  movePost: AdminMutationReference<{ postId: PostId; boardId: BoardId }>;
  setPostStatus: AdminMutationReference<{
    postId: PostId;
    status: PostStatusKey;
  }>;
  setDiscussionLock: AdminMutationReference<{
    postId: PostId;
    locked: boolean;
  }>;
  setArchived: AdminMutationReference<{ postId: PostId; archived: boolean }>;
  listPostActivity: FunctionReference<
    "query",
    "public",
    {
      postId: PostId;
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
  renameTag: AdminMutationReference<{ tagId: TagId; name: string }, TagDto>;
  setPostTag: AdminMutationReference<{
    postId: PostId;
    tagId: TagId;
    desired: boolean;
  }>;
  deleteTag: AdminMutationReference<{ tagId: TagId }, TagDeleteResultDto>;
  mergePost?: AdminMutationReference<
    { sourcePostId: PostId; canonicalPostId: PostId },
    MergePostResult
  >;
  createChangelogDraft?: AdminMutationReference<
    { title: string; body: string; slug?: string },
    AdminChangelogEntryDto
  >;
  editChangelog?: AdminMutationReference<
    {
      entryId: ChangelogId;
      title?: string;
      body?: string;
      slug?: string;
    },
    AdminChangelogEntryDto
  >;
  setChangelogLinks?: AdminMutationReference<
    { entryId: ChangelogId; postIds: PostId[] },
    AdminChangelogEntryDto
  >;
  publishChangelog?: AdminMutationReference<
    { entryId: ChangelogId },
    AdminChangelogEntryDto
  >;
  unpublishChangelog?: AdminMutationReference<
    { entryId: ChangelogId },
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
