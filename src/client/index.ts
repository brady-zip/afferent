import type { ComponentApi } from "../component/_generated/component.js";
import type { VerifiedActor } from "./contracts.js";
import {
  createClientWithScope,
  type AfferentClient,
  type MutationContext,
  type ReadContext,
} from "./internal.js";

export type {
  ActorId,
  AdminCapabilities,
  BoardDto,
  BoardId,
  ParticipationCapabilities,
  PostDto,
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
  getPostIntentValidator,
  installationResultValidator,
  listBoardsIntentValidator,
  listPostsIntentValidator,
  postListResultValidator,
  publicPostDtoValidator,
} from "./contracts.js";

const FIXED_SCOPE = "afferent:single-product:v1";

export type AfferentClientOptions = Readonly<{
  resolveActor: (ctx: MutationContext) => Promise<VerifiedActor | null>;
  authorizeAdmin: (ctx: MutationContext) => Promise<boolean>;
  isAuthenticated?: (ctx: ReadContext) => Promise<boolean>;
}>;

export type { AfferentClient };

export function createAfferentClient(
  component: ComponentApi,
  options: AfferentClientOptions,
): AfferentClient {
  return createClientWithScope(component, {
    ...options,
    resolveScope: async () => FIXED_SCOPE,
  });
}

export { createScopedAfferentClient } from "./server.js";
export type { ScopedAfferentClientOptions } from "./server.js";
