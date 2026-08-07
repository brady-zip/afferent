# Phase 4 scope pivot: local demo

**Approved:** 2026-07-30
**Status:** Locked
**Historical directory slug:** `04-hosted-production-release` is retained so completed
plans, summaries, commits, and references remain stable.

**Distribution update:** `04-DISTRIBUTION-PIVOT.md` supersedes the npm-specific
statements in this document as of 2026-08-07.

## User decision

The Afferent demo is not a hosted service or public deployment. Evaluators clone the
repository and run one documented development command. That command starts the Vite
example against a real anonymous Convex development backend, seeds representative data,
and exposes the complete interactive product surface locally.

The lack of a public evaluator URL is an accepted v1 tradeoff. It must not be silently
reintroduced by preview, Vercel, production Convex, remote-smoke, or hosted-demo work.

## Terminology

- **Anonymous Convex development backend** means `CONVEX_AGENT_MODE=anonymous`: no
  Convex account, login, project, deployment key, or cloud deployment is required.
- It does **not** mean anonymous application authority. The showcase is browsable while
  signed out, but sandbox participation and administration still require a locally
  created Convex Auth account.
- The clone/install step may require network access for dependencies. The deliverable is
  credential-free, not a fully offline distribution.

## Preserved deliverables and gates

- The reusable component remains locally packable with explicit exports,
  declarations, and exact tarball verification; v1 does not publish it to npm.
- The static shadcn registry and versioned documentation remain public release surfaces.
- The demo still installs separate immutable-showcase and private-sandbox component
  instances and uses the exact packed package plus generated registry source.
- The signed-out showcase, locally authenticated sandbox/admin experience, deterministic
  seed/reset, quotas, expiry, leased cleanup, and all interactive feedback, roadmap,
  changelog, and in-app notification surfaces remain feature-complete.
- Scope and admin authority remain server-derived on every call. No browser-supplied
  `userId`, `isAdmin`, `scopeId`, generation, seed, reset, quota, or cleanup authority is
  accepted.
- Real-Convex Playwright, adversarial two-user isolation, keyboard, focus, axe, reflow,
  reduced-motion, tablet, and mobile gates remain release-blocking.
- Test-only lifecycle controls remain injected into the acceptance candidate only. They
  are never added to `example/convex`, exposed as public functions, or shipped by the
  user-facing demo command.
- The component delivery outbox remains covered by component tests. The local demo
  demonstrates in-app notifications but does not claim or simulate an external delivery
  provider.

## Removed deliverables

- Public or hosted demo URL
- Vercel project, configuration, preview, promotion, or production deployment
- Convex Cloud preview/production projects or deploy keys for the demo
- Remote HTTPS Playwright mode and public production smoke
- Demo badge/version as a separately deployed release surface
- Demo-specific production account provisioning and operational storage obligations

## Bootstrap security and UX

- JWT private keys, JWKS, site configuration, ports, and backend state are generated for
  the owned local process and are never committed.
- The command must fail with actionable Node/npm/Convex/browser prerequisite guidance.
- Readiness has bounded timeouts, process ownership is explicit, and teardown cannot kill
  unrelated services.
- A gate rejects committed auth material, deploy keys, generated `.env.local`, public
  lifecycle controls, skipped browser suites, or an in-memory/mock Convex substitute.

## Requirement migration

- `DEMO-01` is retained as historical completed scope and explicitly superseded.
- `DEMO-08` is the new clone-and-run local-demo requirement.
- `DEMO-02` through `DEMO-06`, `QUAL-05`, and `QUAL-06` retain their behavioral meaning.
- `DEMO-07` retains quotas, expiry, and cleanup but no longer cites public-service growth.
- `QUAL-09` distinguishes adopter host-application deployment guidance from local-demo
  operation.
- `QUAL-11` synchronizes tagged source, registry, and docs while binding local
  tarball evidence; it no longer requires npm or a deployed demo version/badge.

## Remaining plan impact

- **04-06:** Convert the partial hosted harness into the user-facing local dev command and
  local real-Convex acceptance gate; delete remote mode; finish lifecycle and accessibility
  proof.
- **04-07:** Document the clone-and-run demo and its troubleshooting while keeping adopter
  installation, auth, UI, testing, host deployment, and upgrade guidance.
- **04-08:** Preserve release manifests, CI, drift checks, Changesets, and static
  publication work as historical implementation; Plan 04-09 removes the npm path.
- **04-09:** Keep the human GitHub ownership checkpoint and publish/verify only
  the source tag, registry, and docs; remove npm plus Convex/Vercel provisioning
  and demo deployment/smoke.
