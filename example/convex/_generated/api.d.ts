/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as afferent from "../afferent.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as sandbox from "../sandbox.js";
import type * as sandboxAuthority from "../sandboxAuthority.js";
import type * as sandboxCleanup from "../sandboxCleanup.js";
import type * as sandboxLifecycle from "../sandboxLifecycle.js";
import type * as sandboxQuotas from "../sandboxQuotas.js";
import type * as sandboxScope from "../sandboxScope.js";
import type * as seeds from "../seeds.js";
import type * as showcase from "../showcase.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  afferent: typeof afferent;
  auth: typeof auth;
  http: typeof http;
  sandbox: typeof sandbox;
  sandboxAuthority: typeof sandboxAuthority;
  sandboxCleanup: typeof sandboxCleanup;
  sandboxLifecycle: typeof sandboxLifecycle;
  sandboxQuotas: typeof sandboxQuotas;
  sandboxScope: typeof sandboxScope;
  seeds: typeof seeds;
  showcase: typeof showcase;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  showcase: import("/Users/bradywatkinson/dev/afferent/dist/component/_generated/component.js").ComponentApi<"showcase">;
  sandbox: import("/Users/bradywatkinson/dev/afferent/dist/component/_generated/component.js").ComponentApi<"sandbox">;
};
