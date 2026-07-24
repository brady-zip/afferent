---
phase: 04-hosted-production-release
plan: "03"
subsystem: hosted-sandbox-lifecycle
tags: [convex-auth, sandbox, deterministic-seed, reset, expiry]
requires:
  - phase: 04-02
    provides: generated dual-instance Convex host and server-derived sandbox authority
provides:
  - generation-fenced logical sandbox lifecycle with opaque physical scopes
  - deterministic representative showcase and private-sandbox seed
  - authenticated ready-gated public and admin sandbox wrappers
  - reset, failure retention, and seven-day expiry behavior
affects: [04-04-sandbox-operations, 04-05-hosted-ui, 04-06-browser-evidence]
tech-stack:
  added: []
  patterns:
    - seed a pending physical scope completely before atomically switching the active generation
    - expose only closed lifecycle DTOs while keeping owner, scope, generation, and lease identifiers server-side
    - verify the persisted host lifecycle with two registered component instances under convex-test
key-files:
  created:
    - example/convex/sandboxScope.ts
    - example/convex/sandboxLifecycle.ts
    - example/convex/seeds.ts
    - example/convex/sandbox.ts
    - tests/demo/sandbox-lifecycle.test.ts
    - tests/demo/seeds.test.ts
  modified:
    - example/convex/schema.ts
    - example/convex/showcase.ts
    - example/convex/_generated/api.d.ts
    - package.json
key-decisions:
  - "Map one verified Convex Auth user to a logical owner key, then derive a distinct opaque physical scope for each monotonic generation."
  - "Keep the prior active generation readable after preparation failure, but hide all active data while a reset or expiry replacement is pending."
  - "Use one semantic seed manifest for showcase and sandbox so reset restores the same story with new opaque document identifiers."
requirements-completed: [DEMO-02, DEMO-03, DEMO-05, DEMO-06]
coverage:
  - id: D1
    description: "First access, reset, and expiry activate only a completely seeded generation and never expose lifecycle authority identifiers."
    requirement: DEMO-06
    verification:
      - kind: integration
        ref: "npm run test:demo:lifecycle"
        status: pass
    human_judgment: false
  - id: D2
    description: "The representative seed is deterministic, resumable, scope-disjoint, and available through immutable showcase and authenticated sandbox surfaces."
    requirement: DEMO-02
    verification:
      - kind: integration
        ref: "tests/demo/seeds.test.ts"
        status: pass
    human_judgment: false
duration: 697 min
completed: 2026-07-24
status: complete
---

# Phase 4 Plan 03: Hosted Sandbox Lifecycle Summary

**The hosted backend now prepares a deterministic private sandbox in an opaque generation, atomically activates it, and safely replaces it on reset or seven-day expiry.**

## Performance

- **Duration:** 697 min elapsed
- **Completed:** 2026-07-24
- **Tasks:** 3
- **Focused gate:** 21 tests across lifecycle, seeds, host authority, and static boundary coverage

## Accomplishments

- Added host-owned logical owner and generation records plus domain-separated physical scope derivation without widening the reusable one-product API.
- Added a deterministic 21-step representative seed shared by the immutable showcase and private sandbox.
- Added real Convex actions and queries for ensure, reset, lifecycle state, public participation, notifications, and administration, all behind freshly verified Convex Auth authority.
- Added persisted convex-test coverage proving anonymous failure, complete activation, deterministic reset into new document IDs, expiry replacement, and preservation of another visitor.

## Task Commits

1. **Task 1 RED: generation lifecycle contract** — `1b88857`
2. **Task 1 GREEN: generation-fenced lifecycle** — `c484f74`
3. **Task 2 RED: deterministic seed contract** — `7679c0c`
4. **Task 2 GREEN: representative seed** — `398a14c`
5. **Task 3 RED: ready sandbox workflow contract** — `236217a`
6. **Task 3 GREEN: persisted generation activation and wrappers** — `ac0f988`

## Decisions Made

- A lifecycle action accepts no browser arguments; it derives the owner from the current verified session, then uses internal leased mutations for preparation, seeding, activation, and failure.
- A pending generation is never queryable through the sandbox client. Activation requires the exact complete seed version and step count.
- Reset and expiry retire the previous physical scope only after the replacement is active. Bounded physical deletion and quota accounting remain Plan 04-04 responsibilities.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Remediated the prior type-only hosted scaffold**

- **Found before:** Task 1
- **Issue:** Plan 04-02 had no generated dual-instance references or browser-callable Convex functions.
- **Fix:** Reopened Plan 04-02 and added rejection-capable codegen/deployment coverage before any lifecycle work began.
- **Commits:** `dbe7096`, `75c5cf6`, `83e59d8`

**2. [Rule 2 - Missing critical coverage] Exercised the persisted lifecycle**

- **Found during:** Task 3 final audit
- **Issue:** The initial focused tests proved the pure state machine and wrapper shape but did not execute persisted host tables and component calls together.
- **Fix:** Registered both Afferent instances under convex-test and added authenticated ensure, reset, expiry, and cross-visitor preservation scenarios.
- **Verification:** `npm run test:demo:lifecycle` passes 21/21 tests after real anonymous Convex codegen and hosted typecheck.

## Verification

- `npm run test:demo:lifecycle` — passed.
- Anonymous disposable Convex codegen/deployment — passed with showcase, sandbox, and both rate-limiter children installed.
- Hosted TypeScript project — passed.
- Lifecycle/seed/authority/static suites — 21/21 passed.

## Known Stubs

- Physical quota accounting, leased retired-scope deletion, rate-limiter shard cleanup, and scheduled expiry cleanup are intentionally assigned to Plan 04-04.
- Real authenticated browser evidence remains assigned to Plan 04-06.

## Self-Check: PASSED

- All declared artifacts and six task commits exist.
- Browser-callable lifecycle intents accept no identity, admin, scope, generation, or lease arguments.
- Unrelated TypeScript 7 and tooling changes remain unstaged.

---

_Phase: 04-hosted-production-release_
_Completed: 2026-07-24_
