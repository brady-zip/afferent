# Run the local demo

The repository includes a complete Afferent evaluator that runs on an
**anonymous local Convex development backend**. Anonymous describes the
credential-free infrastructure: the command does not use a Convex account,
cloud project, login, or deploy key. It does not grant anonymous application
authority.

## Prerequisites

- A clone of the Afferent repository
- Node.js 22.14.0 or newer
- npm 11.5.1 or newer
- Network access for `npm install` and the clean candidate installation
- A current browser with JavaScript, cookies, and local storage enabled
- Free local loopback ports for the owned Convex backend and Vite server

The required Convex and shadcn CLIs are pinned repository dependencies. Do not
install unrelated global packages to satisfy the launcher.

## Start it

Install the pinned dependencies once, then run the one evaluator command:

```sh
npm install
npm run dev:demo
```

Wait for `Afferent local demo is ready`, then open the printed
`http://127.0.0.1:<port>` URL. Keep the terminal open. Press Ctrl-C once to stop
only the Vite and Convex processes started by that invocation.

The launcher:

1. builds and packs the current `afferent` candidate;
2. installs that tarball plus generated registry source in `.demo-candidate`;
3. allocates loopback ports and starts Convex with
   `CONVEX_AGENT_MODE=anonymous`;
4. generates a new RSA JWT private key and JWKS for the owned local backend;
5. seeds the immutable showcase; and
6. builds and starts the registry-installed Vite application.

The generated `.demo-candidate/.env.local`, JWT private key, JWKS, local backend
state, and ports are ephemeral local runtime state. They are ignored by Git.
**Never commit** them, copy them into application configuration, or reuse them
as production credentials.

## What you can do

The default showcase is available while signed out. It is server-enforced
read-only data demonstrating boards, feedback, discussions, roadmap groups, and
published changelog entries.

Select **My sandbox** to create or sign in to a local Convex Auth account.
Signed-in users receive a private, seeded sandbox with participation and admin
capabilities. Each local account has isolated data, quotas, reset state, and
expiry. Reset affects only the current account's sandbox. Signing out removes
sandbox and admin access.

The normal package still models one product per installation. Generated,
per-user demo scopes are a server-only evaluator mechanism and are not a
multi-product API.

## Recover from startup failures

### A prerequisite is missing

If the launcher reports an old Node.js version, unavailable npm, or missing
`convex`/`shadcn`, verify the versions above and rerun:

```sh
npm install
npm run dev:demo
```

Use the repository lockfile. Do not work around a missing binary by changing the
package name or installing a similarly named package.

### Package or registry preparation fails

The candidate is installed from a newly packed tarball and current generated
registry. Confirm network access, remove no source files, and run:

```sh
npm run test:release:package
npm run verify:demo:artifacts
```

Fix the first reported package, export, registry, or build error before retrying
the launcher.

### Convex never becomes ready

Convex has a bounded 90-second startup window, and the launcher waits up to 120
seconds for backend readiness. Read the first Convex error in the terminal.
Common causes are an unsupported Node/npm version, interrupted dependency
installation, or a local resource limit. Stop with Ctrl-C, confirm no child
process remains, and retry. A Convex login or deploy key is never the remedy for
this local mode.

### Vite exits or the page never becomes ready

Vite must bind its allocated loopback port and answer within 60 seconds. If
another process acquired that port during startup, stop the launcher and rerun
so it allocates a fresh port. Do not kill unrelated machine-wide Node or Convex
processes.

### Authentication or sandbox preparation fails

Create an account through the local form rather than supplying a user ID, admin
flag, or scope. If preparation reports a recoverable error, retry the offered
action. If it persists, stop and restart the local demo; the showcase remains
readable while signed out.

For the complete real-backend and browser release matrix, run
`npm run verify:phase4`. That command is longer than the evaluator startup and
also requires the Playwright Chromium installation used by the repository.
