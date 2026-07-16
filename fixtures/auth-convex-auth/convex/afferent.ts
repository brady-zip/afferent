import { getAuthUserId } from "@convex-dev/auth/server";
import {
  createAfferentClient,
  type AfferentClient,
  type AfferentClientOptions,
} from "afferent";
import { normalizeConvexAuthUserId } from "afferent/adapters/convex-auth.js";
import type { ComponentApi } from "afferent/_generated/component.js";

type AuthorizeAdmin = AfferentClientOptions["authorizeAdmin"];
type ResolveConvexAuthUserId = typeof getAuthUserId;

/** Host-owned wiring: identity and admin permission are resolved independently. */
export function createConvexAuthAfferentFixture(
  component: ComponentApi,
  authorizeAdmin: AuthorizeAdmin,
  resolveUserId: ResolveConvexAuthUserId = getAuthUserId,
): AfferentClient {
  return createAfferentClient(component, {
    resolveActor: async (ctx) => {
      const userId = await resolveUserId(ctx);
      return userId === null ? null : normalizeConvexAuthUserId(userId);
    },
    isAuthenticated: async (ctx) => (await resolveUserId(ctx)) !== null,
    authorizeAdmin,
  });
}
