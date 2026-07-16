import type { ComponentApi } from "../component/_generated/component.js";
import type { VerifiedActor } from "./contracts.js";
import {
  createClientWithScope,
  type AfferentClient,
  type HostContext,
  type MutationContext,
  type ReadContext,
} from "./internal.js";

export type ScopedAfferentClientOptions = Readonly<{
  resolveScope: (ctx: HostContext) => Promise<string>;
  resolveActor: (ctx: MutationContext) => Promise<VerifiedActor | null>;
  authorizeAdmin: (ctx: HostContext) => Promise<boolean>;
  isAuthenticated?: (ctx: ReadContext) => Promise<boolean>;
}>;

export function createScopedAfferentClient(
  component: ComponentApi,
  options: ScopedAfferentClientOptions,
): AfferentClient {
  return createClientWithScope(component, options);
}

export { deriveScopeId } from "./scope.js";
