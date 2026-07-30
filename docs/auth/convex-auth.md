# Convex Auth

Convex Auth resolves the current user inside each host function. Afferent receives
only a provider-neutral actor after that check; the reusable component cannot
access the host application's `ctx.auth`.

## Trusted host factory

Use the executable fixture at
`fixtures/auth-convex-auth/convex/afferent.ts` as the source of truth:

<!-- afferent-docs: executable fixture=fixtures/auth-convex-auth/convex/afferent.ts mode=exact -->

```ts
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
  const resolveVerifiedActor = async (ctx: Parameters<AuthorizeAdmin>[0]) => {
    const userId = await resolveUserId(ctx);
    return userId === null ? null : normalizeConvexAuthUserId(userId);
  };
  return createAfferentClient(component, {
    resolveActor: resolveVerifiedActor,
    resolveViewerActor: resolveVerifiedActor,
    isAuthenticated: async (ctx) => (await resolveUserId(ctx)) !== null,
    authorizeAdmin,
  });
}
```

Pass an `authorizeAdmin` callback that looks up the current Convex Auth user in
host-owned membership data. The Afferent client invokes it on every admin call;
do not memoize a browser-provided role or reuse a result from an earlier
invocation.

`createAfferentClient` supplies the fixed, server-owned scope for the normal
one-product installation. The local demo's generated scopes are a separate,
server-only sandbox mechanism.

## Reject browser authority

Browser arguments may express narrow intent such as a post title, vote state, or
status change. They must never include `userId`, `isAdmin`, `scopeId`, a Convex
Auth user document, or an authorization decision. The host wrapper derives
identity and admin permission again before every call into the component.

Continue with [headless React](../ui/headless.md) or the
[copy-owned registry UI](../ui/registry.md).
