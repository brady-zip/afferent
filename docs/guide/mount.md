# Mount the component

This guide connects the package to one Convex application, creates generated
component references, and establishes the trusted host-wrapper boundary.

## 1. Add the static component instance

Create or update `convex/convex.config.ts`:

<!-- afferent-docs: typescript mode=syntax-only context=component-mount -->

```ts
import afferent from "afferent/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(afferent);

export default app;
```

One mounted instance represents one product. Configure multiple boards inside
that installation rather than mounting dynamic product instances.

## 2. Generate host references

Run the normal Convex development/code-generation path in the consuming
application:

<!-- afferent-docs: shell mode=syntax-only context=adopter reason=convex-codegen -->

```sh
npx convex dev --once
```

The generated `components.afferent` reference stays in host code. Component
documents and provider records must not cross into browser responses.

## 3. Create the trusted client in host code

The provider-specific guide supplies `resolveVerifiedActor` and
`authorizeCurrentAdmin`. Both execute in Convex host functions and inspect
current server-side identity or host-owned membership:

<!-- afferent-docs: typescript mode=syntax-only context=trusted-host -->

```ts
import { createAfferentClient, type AfferentClientOptions } from "afferent";
import type { ComponentApi } from "afferent/_generated/component.js";

import { components } from "./_generated/api.js";
import { authorizeCurrentAdmin, resolveVerifiedActor } from "./auth.js";

const installedComponent: ComponentApi = components.afferent;

export const afferent = createAfferentClient(installedComponent, {
  resolveActor: resolveVerifiedActor,
  resolveViewerActor: resolveVerifiedActor,
  isAuthenticated: async (ctx) => (await resolveVerifiedActor(ctx)) !== null,
  authorizeAdmin:
    authorizeCurrentAdmin satisfies AfferentClientOptions["authorizeAdmin"],
});
```

Never accept `userId`, `isAdmin`, or `scopeId` in a wrapper's browser arguments.
Authentication and admin authorization are separate checks and must run on
every call. `createAfferentClient` supplies the fixed normal-installation scope
itself.

## 4. Expose narrow intent functions

For example, an admin-only installation mutation forwards only the validated
installation intent:

<!-- afferent-docs: typescript mode=syntax-only context=trusted-host -->

```ts
import {
  configureInstallationIntentValidator,
  installationResultValidator,
} from "afferent";

import { mutation } from "./_generated/server.js";
import { afferent } from "./afferent.js";

export const configureAfferent = mutation({
  args: configureInstallationIntentValidator.fields,
  returns: installationResultValidator,
  handler: (ctx, args) => afferent.admin.configureInstallation(ctx, args),
});
```

Call it once with the initial board configuration:

<!-- afferent-docs: typescript mode=syntax-only context=adopter-client -->

```ts
await convex.mutation(api.afferent.configureAfferent, {
  readPolicy: "public",
  boards: [{ slug: "feedback", name: "Product Feedback" }],
});
```

That browser input expresses configuration intent; it grants no authority.
`afferent.admin.configureInstallation` invokes the host's
`authorizeCurrentAdmin` again.

Use the exported intent and result validators for each wrapper. Avoid generic
CRUD functions, raw component documents, and provider-shaped DTOs.

## 5. Add a frontend

For a custom interface, wrap the relevant route subtree in
`AfferentProvider` from `afferent/react.js`. Pass host-generated function
references, the host's current auth state, and a Convex client; hooks then own
query generations, pagination, optimism, pending states, and normalized errors.

For the copy-owned interface, install only the blocks you need from
`https://brady-zip.github.io/afferent`. The board block is named `afferent-board`; its
generated dependency on `afferent-ui-core` installs the shared provider,
navigation seam, tokens, and styles. The copied files belong to your
application—review and version them like application source.

Next, choose the provider-specific host recipe and the headless or registry UI
guide from the documentation navigation.
