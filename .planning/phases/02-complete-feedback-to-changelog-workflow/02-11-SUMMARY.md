---
phase: 02-complete-feedback-to-changelog-workflow
plan: "11"
subsystem: merge-atomicity
tags: [convex, merge, staging, occ, scheduler, real-backend]

requires:
  - phase: 02-05
    provides: Duplicate preservation, redirect, host, and headless merge contracts
  - phase: 02-10
    provides: Complete Phase 2 component and headless integration surface
provides:
  - True one-transaction merge path for at most 50 total affected relation rows
  - Hidden scope-owned stage and delta truth for larger merges
  - One ready-to-cutover_done reader switch with flattened redirect and exact counters
  - Merge-aware write fencing, bounded inert cleanup, idempotent resume, and pre-cutover abort
  - Disposable real Convex observation, restart, concurrency, abort, and convergence proof
affects: [phase-3-copied-ui, phase-4-demo, merge-maintenance]

tech-stack:
  added: []
  patterns:
    - One merge job row is the OCC fence and complete reader-truth selector
    - Preparation copies logical pointers into hidden stage rows without changing originals
    - Cleanup normalizes one bounded batch while hybrid canonical/source truth remains stable

key-files:
  created: []
  modified:
    - src/component/model/merge.ts
    - src/component/schema.ts
    - src/component/admin/merge.ts
    - src/component/jobs/merge.ts
    - src/component/public/comments.ts
    - src/component/participation/votes.ts
    - src/component/participation/comments.ts
    - scripts/test-merge-backend.mjs

key-decisions:
  - "Count the complete source and canonical affected set before selecting the <=50 atomic path."
  - "Use preparing, ready, cutover_done, cleaning, done, and pre-cutover aborted as the closed durable state machine."
  - "Make every preparing/ready relation writer touch the job row and force a staged rebuild before cutover."
  - "Keep the ready-to-cutover_done transaction row-free with respect to staged relations."

patterns-established:
  - "Atomic logical bulk work: hidden preparation, one fenced public switch, then observationally inert cleanup."
  - "Real-backend crash oracle: continuously classify every sample as a complete pre-state or complete post-state."

requirements-completed: [DISC-07, DISC-08, QUAL-01]

coverage:
  - id: D1
    description: Small merges with no more than 50 total affected rows complete in one transaction while larger merges leave originals untouched during preparation.
    requirement: DISC-07
    verification:
      - kind: integration
        ref: tests/component/merge.test.ts#keeps every original untouched while a large merge is preparing
        status: pass
      - kind: integration
        ref: tests/component/merge.test.ts#preserves relation truth and exposes one flattened durable redirect
        status: pass
    human_judgment: false
  - id: D2
    description: Large jobs expose one complete reader truth across preparation, cutover, cleanup, concurrent writes, restart, and abort.
    requirement: DISC-08
    verification:
      - kind: e2e
        ref: node scripts/test-merge-backend.mjs
        status: pass
    human_judgment: false
  - id: D3
    description: Merge state, stage, delta, redirect, and relation paths remain scope-complete, typed, bounded, and regression-safe.
    requirement: QUAL-01
    verification:
      - kind: other
        ref: npm test and npm run typecheck and npm run lint and npm run build
        status: pass
      - kind: integration
        ref: tests/static/schema-scope.test.ts and tests/static/contracts.test.ts
        status: pass
    human_judgment: false

duration: 27min
completed: 2026-07-17
status: complete
---

# Phase 02 Plan 11: Atomic Merge Cutover Correction Summary

**Large duplicate merges now prepare invisible relation truth, publish one OCC-fenced atomic reader cutover, and converge through bounded cleanup proven on a disposable real Convex backend.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-07-17T17:58:00Z
- **Completed:** 2026-07-17T18:25:00Z
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments

- Replaced visible scheduled reparenting with scope-owned merge stages/deltas and a closed `preparing -> ready -> cutover_done -> cleaning -> done` state machine plus pre-cutover `aborted`.
- Preserved a true atomic fast path only when the complete affected source/canonical relation set is at most 50 rows; the large cutover does not iterate relation rows.
- Fenced votes, comments, subscriptions, activity, changelog relations, and notification events against the job row so ready is demoted and rebuilt when concurrent truth changes.
- Added merge-aware comment/activity/changelog readers and bounded hybrid cleanup so every post-cutover sample remains the exact logical union.
- Replaced the source-text probe with a disposable anonymous Convex deployment that restarts at boundaries, writes concurrently, aborts, repeats steps, isolates scopes, and checks final physical convergence.

## Task Commits

1. **Task 1: Make atomic merge visibility executable on a real Convex backend** - `209a5cc` (test)
2. **Task 2: Replace live batch reparenting with hidden staged truth and one atomic cutover** - `37ba60b` (fix)
3. **Task 3: Fence concurrent writes and prove inert cleanup, resume, and abort** - `0f53278` (fix)
4. **Verification seam cleanup** - `5f00257` (fix)
5. **Expanded real-backend overlap, repeated-delivery, small-path, and hidden-target matrix** - `be5147e` (test)

## Files Created/Modified

- `src/component/model/merge.ts` - Atomic threshold selection, hidden staging, job transitions, OCC write fencing, abort, cutover, cleanup, and observation truth.
- `src/component/schema.ts` - Scope-owned stage/delta tables and the closed durable job state.
- `src/component/admin/merge.ts` and `src/component/jobs/merge.ts` - Atomic intent selection plus idempotent scheduled continuation/resume/abort control.
- `src/component/public/comments.ts`, `src/component/admin/activity.ts`, and `src/component/model/changelog.ts` - Complete logical reads during cutover and cleanup.
- Participation/activity/changelog/notification writers - Transactional delta fencing and post-cutover canonical routing.
- `scripts/test-merge-backend.mjs` - Actual disposable Convex continuous-observation, restart, concurrent-write, abort, two-scope, and convergence matrix.

## Decisions Made

- A large merge stages pointers to original relation truth rather than copying unversioned public documents or mutating originals.
- The job row is the single reader selector and OCC fence; every ready writer demotes it to preparing before a cutover can commit.
- Cleanup reads the union of remaining source rows and already-normalized canonical rows, deduplicated by logical key, so deleting each stage beside its physical normalization is observationally inert.
- Existing `post | merged | notFound` and `pending | complete` public/headless result shapes remain unchanged; maintenance state stays component-internal/admin-only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rebuilt all staged counters after a fenced relation deletion**
- **Found during:** Task 3 concurrent writer integration
- **Issue:** Removing a membership after its stage row existed could leave a stale precomputed counter.
- **Fix:** Preserve delta rows while deleting the prior hidden stage in bounded batches, then reset counters and rebuild before returning to ready.
- **Files modified:** `src/component/model/merge.ts`
- **Verification:** Affected component regressions and the real Convex concurrent source/canonical matrix pass.
- **Committed in:** `0f53278`

**2. [Rule 2 - Missing Critical] Added merge-aware reader composition during cleanup**
- **Found during:** Task 2 reader-truth integration
- **Issue:** Physical cleanup could otherwise move a comment or activity row between source and canonical queries mid-page.
- **Fix:** Added bounded two-stream cursors and canonical changelog resolution selected by the one merge job state.
- **Files modified:** `src/component/public/comments.ts`, `src/component/admin/activity.ts`, `src/component/model/changelog.ts`
- **Verification:** Component suites, full package test, and continuous real-backend observations pass.
- **Committed in:** `37ba60b`, `5f00257`

---

**Total deviations:** 2 auto-fixed (1 Rule 1, 1 Rule 2). **Impact on plan:** Both fixes enforce the locked D-12 atomicity and counter requirements without widening product scope.

## Issues Encountered

- The first real-backend oracle treated writes made during preparation as the original seed snapshot. It was corrected to establish a new fenced pre-state after the accepted concurrent writes, then require every subsequent sample to equal that pre-state or the final post-state.

## User Setup Required

None - the proof uses a disposable anonymous local Convex deployment.

## Next Phase Readiness

- Plan 02-05 is now genuinely complete and Phase 3 can consume its unchanged direct-resolution and headless contracts.
- No merge correctness or verification blocker remains for Phase 2 verification.

## Known Stubs

None.

## Self-Check: PASSED

- Commits `209a5cc`, `37ba60b`, `0f53278`, `5f00257`, and `be5147e` exist and all declared key files exist.
- `npm test`, typecheck, lint, build, the 34-test affected matrix, and `node scripts/test-merge-backend.mjs` pass.
- Source relations converge to zero after cleanup; abort preserves the complete pre-state and post-cutover abort is rejected.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-17_
