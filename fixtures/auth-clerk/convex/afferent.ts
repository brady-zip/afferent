import {
  createAfferentClient,
  type AfferentClient,
  type AfferentClientOptions,
} from "afferent";
import { normalizeClerkIdentity } from "afferent/adapters/clerk.js";
import type { ComponentApi } from "afferent/_generated/component.js";

type AuthorizeAdmin = AfferentClientOptions["authorizeAdmin"];

/** Clerk verification remains in Convex; browser claims never enter this factory. */
export function createClerkAfferentFixture(
  component: ComponentApi,
  authorizeAdmin: AuthorizeAdmin,
): AfferentClient {
  const resolveVerifiedActor = async (
    ctx: Parameters<AuthorizeAdmin>[0],
  ) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity === null ? null : normalizeClerkIdentity(identity);
  };
  return createAfferentClient(component, {
    resolveActor: resolveVerifiedActor,
    resolveViewerActor: resolveVerifiedActor,
    isAuthenticated: async (ctx) =>
      (await ctx.auth.getUserIdentity()) !== null,
    authorizeAdmin,
  });
}
