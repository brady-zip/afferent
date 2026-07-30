# Convex Better Auth

The Convex Better Auth component owns session verification. Afferent receives
only the result of `normalizeBetterAuthUser`; the reusable component cannot
access the host application's `ctx.auth` or the Better Auth component directly.

## Trusted host factory

Use the executable fixture at
`fixtures/auth-better-auth/convex/afferent.ts`:

<!-- afferent-docs: typescript mode=fixture context=better-auth executable fixture=fixtures/auth-better-auth/convex/afferent.ts -->

```ts
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
    resolveViewerActor: async (ctx) => {
      const user = await authComponent.safeGetAuthUser(ctx);
      return user === undefined ? null : normalizeBetterAuthUser(user);
    },
    isAuthenticated: async (ctx) =>
      (await authComponent.safeGetAuthUser(ctx)) !== undefined,
    authorizeAdmin,
  });
}
```

Implement `authorizeAdmin` as a host-owned membership lookup for the current
session. The Afferent client calls it for every admin call, independently of
actor normalization. Keep Better Auth configuration and generated component
references in the host application.

`createAfferentClient` supplies one fixed server-owned scope. The generated
scopes in the local demo exist only to isolate its sandbox and are not a
multi-product API.

## Reject browser authority

Never accept `userId`, `isAdmin`, `scopeId`, a Better Auth session, or its user
record in browser arguments. The server host wrapper validates the current
session, normalizes minimal actor facts, and rechecks admin authorization before
every invocation into the component.

Continue with [headless React](../ui/headless.md) or the
[copy-owned registry UI](../ui/registry.md).
