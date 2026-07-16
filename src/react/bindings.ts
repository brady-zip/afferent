import type { DefaultFunctionArgs, FunctionReference } from "convex/server";

import type {
  BoardId,
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
  PostActivityPageDto,
  PostId,
  PublishedChangelogLookupDto,
  RoadmapGroupPageDto,
  RoadmapStatusKey,
  TagDeleteResultDto,
  TagDto,
  TagListDto,
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
  searchFeedback?: FeedbackSearchQueryReference;
  suggestSimilarPosts?: SimilarPostsQueryReference;
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

type AdminMutationReference<
  Args extends DefaultFunctionArgs,
  Result = FeedbackPostDto,
> = FunctionReference<"mutation", "public", Args, Result>;

export interface AdminBindings {
  capability: FunctionReference<
    "query",
    "public",
    Record<string, never>,
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
    { postId: PostId; paginationOpts: PaginationOptions },
    PostActivityPageDto
  >;
  listTags: FunctionReference<
    "query",
    "public",
    Record<string, never>,
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
  participation?: Readonly<Record<string, unknown>>;
  notifications?: Readonly<Record<string, unknown>>;
  roadmap?: RoadmapBindings;
  changelog?: ChangelogBindings;
  admin?: AdminBindings;
}
