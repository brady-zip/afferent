import { createClient } from "@convex-dev/better-auth";
import {
  createAfferentClient,
  type AfferentClient,
  type AfferentClientOptions,
} from "afferent";
import { normalizeBetterAuthUser } from "afferent/adapters/better-auth.js";
import type { ComponentApi } from "afferent/_generated/component.js";

import { components } from "./_generated/api.js";

const authComponent = createClient(components.betterAuth);
type AuthorizeAdmin = AfferentClientOptions["authorizeAdmin"];

/** Every call validates the current Better Auth session before normalization. */
export function createBetterAuthAfferentFixture(
  component: ComponentApi,
  authorizeAdmin: AuthorizeAdmin,
): AfferentClient {
  return createAfferentClient(component, {
    resolveActor: async (ctx) =>
      normalizeBetterAuthUser(await authComponent.getAuthUser(ctx)),
    isAuthenticated: async (ctx) =>
      (await authComponent.safeGetAuthUser(ctx)) !== undefined,
    authorizeAdmin,
  });
}
