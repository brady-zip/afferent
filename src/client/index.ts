import { createClientWithScope } from "./internal.js";
import type { ClientResolvers } from "./internal.js";

export type {
  ActorId,
  AdminCapabilities,
  BoardDto,
  BoardId,
  CommentDto,
  CommentId,
  CommentPageDto,
  FeedbackOrder,
  FeedbackPageDto,
  FeedbackPostDto,
  ParticipationCapabilities,
  PaginationOptions,
  PostCountDto,
  PostDto,
  PostPageDto,
  PostId,
  PostStatusKey,
  ReadCapabilities,
  TagDto,
  TagId,
  VerifiedActor,
} from "./contracts.js";
export {
  addCommentIntentValidator,
  anonymizeActorIntentValidator,
  boardListResultValidator,
  commentPageResultValidator,
  configureInstallationIntentValidator,
  countPostsIntentValidator,
  countResultValidator,
  createPostIntentValidator,
  editPostIntentValidator,
  getPostIntentValidator,
  installationResultValidator,
  listBoardsIntentValidator,
  listCommentsIntentValidator,
  listFeedbackIntentValidator,
  listPostsIntentValidator,
  postListResultValidator,
  postPageResultValidator,
  feedbackPageResultValidator,
  publicFeedbackPostDtoValidator,
  publicPostDtoValidator,
  publicCommentDtoValidator,
  setVoteIntentValidator,
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
