import { createAfferentClient } from "afferent";
import { createScopedAfferentClient } from "afferent/server.js";
import type { ComponentApi } from "afferent/_generated/component.js";

import {
  createSandboxResolvers,
  type ResolvePhysicalScope,
} from "./sandboxAuthority.js";

export function createShowcaseClient(component: ComponentApi) {
  return createAfferentClient(component, {
    resolveActor: async () => null,
    resolveViewerActor: async () => null,
    authorizeAdmin: async () => false,
    isAuthenticated: async () => false,
  });
}

export function createSandboxClient(
  component: ComponentApi,
  resolvePhysicalScope: ResolvePhysicalScope,
) {
  return createScopedAfferentClient(
    component,
    createSandboxResolvers(resolvePhysicalScope),
  );
}
