# Afferent

Afferent is an Apache-2.0 Convex component for product feedback. It keeps
feedback data in your Convex deployment and keeps identity and permissions in
your host application. One installation represents one product and may contain
multiple feedback boards.

## Try the complete product locally

After cloning the repository and running `npm install`, start the evaluator
experience with one command:

<!-- afferent-docs: shell mode=script-reference context=repository -->

```sh
npm run dev:demo
```

The launcher prints one local URL. The showcase is readable while signed out;
creating a local Convex Auth account unlocks a private, seeded admin sandbox.
No Convex account, project, or deploy key is used. See the
[local-demo guide](./docs/guide/local-demo.md) for prerequisites, the security
model, and recovery steps.

## Build and install into a Convex application

Afferent v0.1 is not published to npm. Clone the immutable `v0.1.0` tag from
`AFFERENT_RELEASE_REPOSITORY_URL`, then build one local tarball from that source:

<!-- afferent-docs: shell mode=source-build context=adopter -->

```sh
npm ci
npm run build
npm pack --ignore-scripts
```

Install that exact tarball in the consuming application:

<!-- afferent-docs: shell mode=local-package-install context=adopter -->

```sh
npm install /absolute/path/to/afferent-0.1.0.tgz
```

Mount `afferent/convex.config.js`, run Convex code generation, and expose only
narrow host-owned wrapper functions:

<!-- afferent-docs: typescript mode=syntax-only context=component-mount -->

```ts
import afferent from "afferent/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(afferent);

export default app;
```

Continue through [installation](./docs/guide/install.md) and
[component mounting](./docs/guide/mount.md). Afferent supports Convex Auth,
Clerk, and the Convex Better Auth component. Each integration authenticates and
authorizes in the host application on every call; the isolated component never
reads host `ctx.auth`.

Use the framework-light hooks from `afferent/react.js`, or install the
source-owned shadcn interface from the static registry and customize the copied
files in your application.

## Compatibility

- Convex `^1.42.2`
- React `^18.3.1` or `^19.0.0`
- Node.js `>=22.14.0` and npm `>=11.5.1` for repository development and the
  local evaluator

Source/static release publication will replace these explicit markers with immutable public
links:

| Surface                   | Release marker                    |
| ------------------------- | --------------------------------- |
| documentation             | `AFFERENT_RELEASE_DOCS_URL`       |
| shadcn registry           | `AFFERENT_RELEASE_REGISTRY_URL`   |
| source repository and tag | `AFFERENT_RELEASE_REPOSITORY_URL` |

Source is licensed under [Apache-2.0](./LICENSE).
