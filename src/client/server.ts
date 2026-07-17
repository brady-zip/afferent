import type { ComponentApi } from "../component/_generated/component.js";
import type { VerifiedActor } from "./contracts.js";
import {
  createClientWithScope,
  createDeliveryClientWithScope,
  type AfferentClient,
  type DeliveryClient,
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

export type DeliveryClientOptions = Readonly<{
  resolveScope: (ctx: MutationContext) => Promise<string>;
  authorizeDelivery: (ctx: MutationContext) => Promise<boolean>;
}>;

export function createScopedAfferentClient(
  component: ComponentApi,
  options: ScopedAfferentClientOptions,
): AfferentClient {
  return createClientWithScope(component, options);
}

export function createDeliveryClient(
  component: ComponentApi,
  options: DeliveryClientOptions,
): DeliveryClient {
  return createDeliveryClientWithScope(component, options);
}

export type {
  DeliveryBatchDto,
  DeliveryCapabilities,
  DeliveryEventDto,
  DeliveryId,
  DeliveryLeaseDto,
  DeliveryOperationResult,
} from "./contracts.js";

export { deriveScopeId } from "./scope.js";
