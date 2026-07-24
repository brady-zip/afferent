---
phase: 04-hosted-production-release
plan: "04"
subsystem: hosted-sandbox-maintenance
tags: [convex, quotas, rate-limiter, cleanup, cron]
requires:
  - phase: 04-03
    provides: generation-fenced private sandbox lifecycle and deterministic seed
provides:
  - exhaustive indexed usage and cleanup disposition for all 26 scoped component tables
  - logical-owner quota and abuse budgets spanning active, pending, and retired generations
  - leased resumable retired-generation cleanup including exact rate-limiter child keys
  - scheduled seven-day expiry through the shared cleanup worker
affects: [04-05-hosted-ui, 04-06-browser-evidence, 04-09-production-release]
tech-stack:
  added: []
  patterns:
    - host-only maintenance intents over server-resolved physical scopes
    - compare-and-set cleanup leases with persisted table and cursor continuation
key-files:
  created:
    - src/component/maintenance/sandbox.ts
    - example/convex/sandboxQuotas.ts
    - example/convex/sandboxCleanup.ts
    - example/convex/crons.ts
    - tests/component/sandbox-maintenance.test.ts
    - tests/demo/sandbox-quotas.test.ts
    - tests/demo/sandbox-cleanup.test.ts
  modified:
    - src/component/model/rateLimits.ts
    - example/convex/schema.ts
    - example/convex/sandboxLifecycle.ts
    - example/convex/sandbox.ts
key-decisions:
  - "Count every active, pending, failed, and retired-not-cleaned physical generation toward one logical sandbox footprint."
  - "Reset installed rate-limiter 0.3.2 rows only through its documented exact name/key API, preserving actor IDs until all actor-prefixed keys are cleared."
  - "Keep write and reset windows on the logical owner record so generation replacement and cleanup cannot erase live abuse history."
requirements-completed: [DEMO-03, DEMO-06, DEMO-07, QUAL-06]
coverage:
  - id: D1
    description: "All 26 scoped component tables have explicit indexed usage and cleanup dispositions."
    requirement: QUAL-06
    verification:
      - kind: integration
        ref: "tests/static/schema-scope.test.ts#fails closed unless every scoped table has an indexed usage and cleanup disposition"
        status: pass
    human_judgment: false
  - id: D2
    description: "Logical sandbox quotas include uncleaned generations and return safe actionable failures."
    requirement: DEMO-07
    verification:
      - kind: integration
        ref: "tests/demo/sandbox-quotas.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Retired generations and limiter child state are deleted through leased resumable bounded batches."
    requirement: DEMO-06
    verification:
      - kind: integration
        ref: "tests/demo/sandbox-cleanup.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Seven-day expiry and logical-owner abuse throttles remain isolated under colliding two-owner data."
    requirement: DEMO-03
    verification:
      - kind: integration
        ref: "npm run test:demo:maintenance"
        status: pass
    human_judgment: false
duration: 68 min
completed: 2026-07-24
status: complete
---

# Phase 4 Plan 04: Hosted Sandbox Maintenance Summary

**Public sandboxes now have complete logical quotas, exact limiter lifecycle cleanup, leased resumable generation deletion, and scheduled seven-day expiry.**

## Performance

- **Duration:** 68 min
- **Started:** 2026-07-24T16:16:00Z
- **Completed:** 2026-07-24T17:24:10Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Added a fail-closed schema inventory and bounded usage snapshot covering every one of the 26 scope-bearing component tables.
- Enforced root and total-footprint limits across active, pending, failed, and retired-not-cleaned generations with safe versioned quota errors.
- Added leased cursor/stage cleanup with compare-and-set persistence, exact actor/scope limiter resets, host seed-metadata cleanup, retries, and final empty verification.
- Added indexed seven-day expiry plus logical-owner reset/write windows that survive generation replacement and cleanup.

## Task Commits

1. **Task 1 RED: complete quota contract** — `5c5a57f`
2. **Task 1 GREEN: logical sandbox quotas** — `63b93cf`
3. **Task 2 RED: leased cleanup contract** — `414fb79`
4. **Task 2 GREEN: retired-generation cleanup** — `27a1574`
5. **Task 3 RED: expiry and abuse lifecycle contract** — `0e7c26f`
6. **Task 3 GREEN: scheduled expiry and logical budgets** — `11a0ffd`
7. **Refactor: normalized maintenance implementation** — `41202e6`

## Decisions Made

- The component exposes only two narrow host maintenance intents: bounded aggregate usage and one bounded cleanup batch. No raw documents, arbitrary tables, or browser maintenance arguments are exposed.
- Cleanup processes explicit scope-leading indexes in dependency-safe order. Actor rows are deleted only after their exact `${scopeId}:${actorId}` limiter keys are reset.
- Scheduler IDs are non-authoritative. Every cleanup and expiry invocation validates current persisted generation state and safely no-ops when stale, duplicated, complete, or absent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical coverage] Included host seed metadata in quota and cleanup**

- **Found during:** Task 2
- **Issue:** Component-table cleanup alone would leave `demoSeedEntities` and `demoSeedProgress` growing per physical generation.
- **Fix:** Counted bounded host seed metadata in logical usage and drained it before marking a generation complete.
- **Verification:** `tests/demo/sandbox-cleanup.test.ts`
- **Committed in:** `27a1574`

**2. [Rule 1 - Test gate bug] Made the maintenance aggregate execute the scope matrix under its required Vitest configuration**

- **Found during:** Task 3 verification
- **Issue:** Naming `tests/integration/scope-matrix.test.ts` under the default Vitest config silently excluded it.
- **Fix:** The named aggregate now invokes `npm run test:scope`.
- **Verification:** `npm run test:demo:maintenance` reports the separate three-test scope matrix.
- **Committed in:** `11a0ffd`

**Total deviations:** 2 auto-fixed (one missing critical lifecycle path, one verification bug). **Impact:** Both fixes close required storage and isolation proof without broadening beyond Plan 04-04.

## Test Results

- `npm run test:demo:maintenance` — passed: 15 maintenance tests plus 3 scope-matrix tests.
- `npm run test:component` — passed: 57 tests.
- `npm run test:static` — passed: 44 tests.
- `npm run test:demo:lifecycle` — passed: 21 tests with demo codegen and hosted typecheck.
- Focused Oxlint on new maintenance, quota, cron, and test surfaces — passed.

## User Setup Required

None.

## Next Phase Readiness

- Plan 04-05 can render quota and lifecycle failures from stable server-owned contracts.
- Plan 04-06 can exercise scheduled expiry and two-user maintenance isolation against real Convex.
- No Plan 04-05 UI or browser evidence work was included here.

## Self-Check: PASSED

- All seven task/refactor commits and declared artifacts exist.
- The named maintenance, component, static, scope, and lifecycle regression gates pass.
- Unrelated TypeScript 7, package-lock, Codex/Claude hook, npm, debug, and Playwright files remain unstaged.

---

_Phase: 04-hosted-production-release_
_Completed: 2026-07-24_
