# Clerk

Clerk identity is trusted only after Convex verifies it in a host function.
Afferent receives the provider-neutral actor returned by
`normalizeClerkIdentity`; the reusable component cannot access the host
application's `ctx.auth`.

## Trusted host factory

Use the executable fixture at `fixtures/auth-clerk/convex/afferent.ts`:

<!-- afferent-docs: executable fixture=fixtures/auth-clerk/convex/afferent.ts mode=exact -->

```ts
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
  const resolveVerifiedActor = async (ctx: Parameters<AuthorizeAdmin>[0]) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity === null ? null : normalizeClerkIdentity(identity);
  };
  return createAfferentClient(component, {
    resolveActor: resolveVerifiedActor,
    resolveViewerActor: resolveVerifiedActor,
    isAuthenticated: async (ctx) => (await ctx.auth.getUserIdentity()) !== null,
    authorizeAdmin,
  });
}
```

The `authorizeAdmin` callback must query host-owned membership for the current
verified identity. It runs for every admin invocation. A Clerk client token,
client-side organization role, or cached React state is not an authorization
decision for Convex.

`createAfferentClient` fixes one normal installation to one server-owned scope.
Do not use organization IDs as browser-selected Afferent scopes.

## Reject browser authority

Never accept `userId`, `isAdmin`, `scopeId`, the Clerk identity object, or a
provider user record in a public function's arguments. The server host wrapper
reads `ctx.auth`, normalizes only minimal actor facts, and rechecks admin
permission on every call before forwarding a narrow intent.

Continue with [headless React](../ui/headless.md) or the
[copy-owned registry UI](../ui/registry.md).
