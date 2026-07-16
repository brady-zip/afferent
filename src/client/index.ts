import { createClientWithScope } from "./internal.js";
import type { ClientResolvers } from "./internal.js";

export type {
  ActorId,
  ActivityId,
  AfferentActionResult,
  AfferentErrorDto,
  AdminCapabilities,
  BoardDto,
  BoardId,
  CommentDto,
  CommentId,
  CommentPageDto,
  DiscoveryPostDto,
  FeedbackOrder,
  FeedbackPageDto,
  FeedbackPostDto,
  ParticipationCapabilities,
  PaginationOptions,
  PostCountDto,
  PostDto,
  PostPageDto,
  PostId,
  PostActivityDto,
  PostActivityPageDto,
  PostStatusKey,
  ReadCapabilities,
  SearchResultDto,
  SimilarPostResultDto,
  TagDeleteResultDto,
  TagDto,
  TagId,
  TagListDto,
  VerifiedActor,
} from "./contracts.js";
export {
  addCommentIntentValidator,
  adminEditPostIntentValidator,
  anonymizeActorIntentValidator,
  boardListResultValidator,
  commentPageResultValidator,
  configureInstallationIntentValidator,
  createTagIntentValidator,
  countPostsIntentValidator,
  countResultValidator,
  deleteTagIntentValidator,
  createPostIntentValidator,
  discoveryPostResultValidator,
  editPostIntentValidator,
  getPostIntentValidator,
  installationResultValidator,
  listBoardsIntentValidator,
  listCommentsIntentValidator,
  listPostActivityIntentValidator,
  listTagsIntentValidator,
  listFeedbackIntentValidator,
  listPostsIntentValidator,
  postListResultValidator,
  postPageResultValidator,
  feedbackPageResultValidator,
  publicFeedbackPostDtoValidator,
  publicAfferentErrorValidator,
  publicParticipationFailureValidator,
  publicPostActionResultValidator,
  publicCommentActionResultValidator,
  publicPostDtoValidator,
  publicCommentDtoValidator,
  searchFeedbackIntentValidator,
  searchFeedbackResultValidator,
  setVoteIntentValidator,
  setArchivedIntentValidator,
  setDiscussionLockIntentValidator,
  setPostTagIntentValidator,
  setPostStatusIntentValidator,
  movePostIntentValidator,
  renameTagIntentValidator,
  similarPostResultValidator,
  suggestSimilarPostsIntentValidator,
  tagDeleteResultValidator,
  tagListResultValidator,
  tagResultValidator,
  withdrawPostIntentValidator,
} from "./contracts.js";

const FIXED_SCOPE = "afferent:single-product:v1";

export type AfferentClientOptions = Omit<ClientResolvers, "resolveScope">;

export type { AfferentClient } from "./internal.js";

export function createAfferentClient(
  component: Parameters<typeof createClientWithScope>[0],
  options: AfferentClientOptions,
): ReturnType<typeof createClientWithScope> {
  return createClientWithScope(component, {
    ...options,
    resolveScope: async () => FIXED_SCOPE,
  });
}

export { createScopedAfferentClient } from "./server.js";
export type { ScopedAfferentClientOptions } from "./server.js";
