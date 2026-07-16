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
  return createAfferentClient(component, {
    resolveActor: async (ctx) => {
      const identity = await ctx.auth.getUserIdentity();
      return identity === null ? null : normalizeClerkIdentity(identity);
    },
    isAuthenticated: async (ctx) =>
      (await ctx.auth.getUserIdentity()) !== null,
    authorizeAdmin,
  });
}
