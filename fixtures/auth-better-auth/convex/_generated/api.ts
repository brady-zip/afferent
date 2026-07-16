/* eslint-disable */
/**
 * Generated `api` utility for the committed Better Auth fixture.
 *
 * This fixture keeps the generated component references in source control so
 * its provider boundary can be typechecked without a live Convex deployment.
 */

import type { ComponentApi as BetterAuthComponentApi } from "@convex-dev/better-auth/_generated/component.js";
import type { ComponentApi as AfferentComponentApi } from "afferent/_generated/component.js";
import { componentsGeneric } from "convex/server";

export const components = componentsGeneric() as unknown as {
  afferent: AfferentComponentApi;
  betterAuth: BetterAuthComponentApi;
};
