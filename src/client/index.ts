import { createClientWithScope } from "./internal.js";
import type { ClientResolvers } from "./internal.js";

export type {
  ActorId,
  AdminCapabilities,
  BoardDto,
  BoardId,
  ParticipationCapabilities,
  PaginationOptions,
  PostDto,
  PostPageDto,
  PostId,
  ReadCapabilities,
  VerifiedActor,
} from "./contracts.js";
export {
  boardListResultValidator,
  configureInstallationIntentValidator,
  countPostsIntentValidator,
  countResultValidator,
  createPostIntentValidator,
  editPostIntentValidator,
  getPostIntentValidator,
  installationResultValidator,
  listBoardsIntentValidator,
  listPostsIntentValidator,
  postListResultValidator,
  postPageResultValidator,
  publicPostDtoValidator,
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
