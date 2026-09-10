---
phase: 04-hosted-production-release
plan: "06"
subsystem: local-demo-verification
tags: [convex, playwright, accessibility, sandbox, release-gate]
requires:
  - phase: 04-05
    provides: release-shaped packed-package and registry-installed Vite consumer
  - phase: 04-04
    provides: bounded sandbox quota, reset, expiry, and cleanup contracts
provides:
  - one credential-free clone-and-run launcher for a real anonymous local Convex backend
  - complete showcase and authenticated private-admin browser journeys against release artifacts
  - adversarial two-user scope, reset, expiry, quota, cleanup, and stale-work isolation proof
  - desktop, tablet, mobile, keyboard, reflow, reduced-motion, and axe release evidence
  - clean-install Phase 4 aggregate spanning package, maintenance, installed consumer, and browser gates
affects: [04-07-documentation, 04-08-release-candidate, 04-09-production-release]
tech-stack:
  added: []
  patterns:
    - ephemeral local JWT and JWKS material owned by one launcher invocation
    - candidate-only internal lifecycle controls absent from the user-facing demo
    - digest and target-bound browser completion markers
    - structured host-error normalization that never displays Convex transport details
key-files:
  created:
    - scripts/dev-demo.mjs
    - scripts/serve-demo.mjs
    - tests/e2e/fixtures/phase4Test.ts
    - docs/accessibility/phase-4/README.md
  modified:
    - scripts/test-demo.mjs
    - playwright.phase4.config.ts
    - tests/e2e/demo.spec.ts
    - tests/e2e/sandbox-isolation.spec.ts
    - tests/e2e/sandbox-lifecycle.spec.ts
    - tests/e2e/demo-accessibility.spec.ts
    - src/component/maintenance/sandbox.ts
    - src/react/hooks/mutations.ts
    - package.json
    - package-lock.json
key-decisions:
  - "Run the public showcase and authenticated sandbox entirely on an anonymous local Convex backend; no public URL, cloud project, deploy key, or hosted-demo branch remains."
  - "Create real local Password accounts through Convex Auth for sandbox/admin proof while preserving signed-out showcase browsing."
  - "Inject clock, quota, and cleanup controls only into the generated test candidate; the user launcher never ships or mounts them."
  - "Normalize structured host recovery data before native Error text so request IDs, stack frames, scopes, and generations cannot reach copied UI."
requirements-completed: [DEMO-04, DEMO-05, DEMO-08, QUAL-05, QUAL-06]
duration: 81 min
completed: 2026-07-30
status: complete
---

# Phase 4 Plan 06: Local Anonymous Convex Demo and Browser Evidence Summary

**A clean clone can now launch the feature-full seeded Afferent example against real anonymous Convex, and one fail-closed aggregate proves its product, isolation, lifecycle, and accessibility behavior.**

## Performance

- **Duration:** 81 min active work across an interrupted execution and scope pivot
- **Started:** 2026-07-27T22:48:12Z
- **Completed:** 2026-07-30T20:01:00Z
- **Tasks:** 3
- **Task/follow-up commits:** 7

## Accomplishments

- Replaced the partial hosted/remote runner with `npm run dev:demo`, which packs the exact package, installs generated registry UI, creates ephemeral auth configuration, starts an owned anonymous Convex process and Vite server, seeds the showcase, prints one local URL, and tears down only its children.
- Completed real-browser showcase, authentication, feedback, vote, comment, search/count, administration, status, changelog, notification, reset, expiry, quota, cleanup-retry, and stale-work journeys.
- Proved two locally authenticated visitors remain isolated even with colliding titles, slugs, queries, and actor-local sequences.
- Added desktop, tablet, and mobile keyboard/axe/reflow/reduced-motion gates, deterministic evidence metadata, route-title/focus behavior, reset focus restoration, and safe quota recovery copy.
- Repaired real Convex cleanup pagination assumptions, the clean TypeScript 6 lockfile, and candidate-backed demo typechecking discovered only by the detached clean-clone aggregate.

## Task Commits

1. **Initial RED browser release gates** — `90ed4c53`
2. **Initial real Convex browser harness** — `8a786a1a`
3. **Initial RED real Convex journeys** — `d8e67c20`
4. **Local anonymous Convex launcher and harness** — `50551b8a`
5. **Real-runtime sandbox lifecycle correction** — `d9311bfc`
6. **Accessibility and safe error gate** — `349804d8`
7. **Clean-install lock and demo verification repair** — `74b7f17a`

The approved local-demo scope pivot itself is recorded in `909aa855`.

## Decisions Made

- The local demo uses `CONVEX_AGENT_MODE=anonymous`; adopters need Node/npm and the repository, but no Convex account, cloud project, Vercel account, deployment key, or committed `.env.local`.
- Showcase reads remain available while signed out. Sandbox and complete admin behavior require an account created locally through the example's Convex Auth Password flow.
- The test runner may inject internal server fixtures into its disposable candidate. The example source, package tarball, and `dev:demo` path do not contain that authority.
- Browser completion evidence is accepted only when every required project/spec marker matches the exact packed artifact digest and local backend target.

## Deviations from Plan

### Auto-fixed Issues

**1. Real Convex component functions do not support the test-only pagination assumption**

- Replaced cleanup `.paginate()` calls with bounded indexed front-deletion and same-stage continuation.
- Added safe cleanup failure diagnostics and real-runtime lifecycle assertions.

**2. Reset route and focus recovery were incomplete**

- Reset now returns to the sandbox route, suppresses competing route focus, and restores focus to the reset trigger after the ready transition.

**3. Narrow screens could overflow on long error text**

- Added `min-width: 0` and safe wrapping to the canonical inline-error source and regenerated both distribution mirrors.

**4. Structured Convex errors could display transport metadata**

- Structured recovery/rate-limit payloads now map before native Error text; E2E explicitly rejects request IDs, stack text, scope IDs, and generation details.

**5. Warm dependencies hid clean-clone lock and typecheck assumptions**

- Regenerated the canonical TypeScript 6 lock with npm 11.5.1 and routed `typecheck:demo` through the actual packed-and-registry-installed candidate gate.

## Verification

- `npm run verify:phase4` from a detached clean TypeScript 6 worktree — passed package validation, maintenance, scope matrix, installed consumer typecheck/build/tests, and all six required real-Convex browser suites.
- `npm run test:e2e:phase4` — 6/6 desktop/tablet/mobile suites passed.
- Focused maintenance, boundary, gate, and headless error matrix — 41/41 passed.
- `npm run ui:check` — generated registry and mirrored examples are byte-synchronized.
- Focused Oxlint and the Phase 4 static gate — passed.

## Known Stubs

None. Test-only lifecycle controls exist only in the disposable candidate assembled by the browser runner.

## User Setup Required

None for the local demo beyond the documented runtime/browser prerequisites. npm publication and static documentation hosting remain later human-present release work.

## Next Phase Readiness

- Plan 04-07 can document the exact `npm run dev:demo` contract, local authentication boundary, supported provider wrappers, UI installation, testing, deployment, and upgrades.
- The separate TypeScript 7 manifest/lock experiment remains present in the working tree and unstaged.

## Self-Check: PASSED

- All task and follow-up commits exist.
- The full clean-clone aggregate and required browser matrix pass.
- No remote runner, cloud deployment, public lifecycle control, checked-in auth material, or broad process-kill path remains.

---

_Phase: 04-hosted-production-release_
_Completed: 2026-07-30_
