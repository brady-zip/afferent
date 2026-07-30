# Test an integration

Test Afferent at three boundaries: the immutable packed package, the consuming
host wrapper, and real browser behavior against local Convex.

## Packed consumer gate

Run:

<!-- afferent-docs: shell mode=script-reference context=repository -->

```sh
npm run test:release:package
```

This builds and packs the package once, installs that tarball into clean
Vite/Convex fixtures, checks public exports and package metadata, typechecks
provider integrations, builds consumers, and validates the generated registry.
Repository-relative imports are not an acceptable substitute.

The provider fixtures can also be checked directly:

<!-- afferent-docs: shell mode=script-reference context=repository -->

```sh
npm run test:fixtures
```

## Clone-and-run local demo

Run:

<!-- afferent-docs: shell mode=script-reference context=repository -->

```sh
npm run dev:demo
```

The script creates an owned `.demo-candidate`, installs the exact packed
tarball, starts an anonymous local Convex backend, generates ephemeral local
JWT/JWKS material, and serves the example. Signed-out users can browse the
showcase. Create local accounts to exercise sandbox participation and admin
flows.

Use two independent browser users when evaluating authorization and isolation:
create feedback as user A, confirm user B cannot edit or administer it, and
confirm one user's sandbox lifecycle never changes the other user's data.

## Phase 4 browser and accessibility gate

Run the real local-Convex suite:

<!-- afferent-docs: shell mode=script-reference context=repository -->

```sh
npm run test:e2e:phase4
```

It validates the desktop workflow, two-user isolation, sandbox lifecycle,
keyboard interaction, responsive layouts, and automated accessibility checks
for desktop, tablet, and mobile. The harness owns its backend and web processes
and emits evidence only after every required suite completes.

Before releasing, run the aggregate:

<!-- afferent-docs: shell mode=script-reference context=repository -->

```sh
npm run verify:phase4
```

That gate includes packed-package verification, scoped maintenance, demo
artifact drift checks, documentation verification, and the Phase 4 browser
suite. Treat unexpected console errors, missing evidence markers, generated UI
drift, and accessibility regressions as release failures.

Adopting applications should add their own auth-provider, route, theme,
permission, and copied-source tests on top of these repository gates.
