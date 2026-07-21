---
phase: 02-complete-feedback-to-changelog-workflow
plan: "17"
subsystem: exact-installed-publication-oracle
tags: [convex, react, pagination, temporal-oracle, stale-generation, merge]

requires:
  - phase: 02-16
    provides: Installed merged comment/activity readers and the atomic paginated watch store
provides:
  - Rejection-capable exact publication and descriptor-chain oracle with negative meta-tests
  - Exact installed comment/activity lifecycle evidence across merge, cleanup, faults, append, restart, and A-to-B-to-A replacement
  - Descriptor-safe restart behavior with late old-generation result/error rejection
affects: [phase-2-verification, phase-3-discussion-ui, headless-consumers]

tech-stack:
  added: []
  patterns:
    - Every installed publication occupies one exact expected sequence slot
    - Error code and maximal contiguous prefix are asserted on the same publication object
    - Deferred real-watch callbacks carry explicit origin-generation rejection evidence

key-files:
  created:
    - tests/helpers/headless-publication-oracle.mjs
  modified:
    - tests/integration/headless-backend.test.mjs
    - tests/react/live-headless.test.tsx
    - scripts/test-headless-backend.mjs
    - src/react/query.ts

key-decisions:
  - "Model exact count, order, status, IDs, typed error, and active boundaries for every installed-reader notification; eventual equality is never acceptance evidence."
  - "Treat a restart notification without an attached replacement descriptor as a production defect, and let start() publish the retained loading state through the normal descriptor-backed path."
  - "Keep opaque cursor expectations independent of the publication recorder by extracting the scoped active reader chain from tracked real watches."

requirements-completed: [DISC-07, ADMN-10, UI-03, QUAL-01]

duration: 23min
completed: 2026-07-21
status: complete
---

# Phase 02 Plan 17: Exact Installed Publication Oracle Summary

**Installed comment and activity watches now pass a falsifiable exact temporal oracle across merge lifecycle, descriptor faults, append/restart, cleanup, and stale A-to-B-to-A deliveries.**

## Performance

- **Duration:** 23 min
- **Started:** 2026-07-21T14:48:44Z
- **Completed:** 2026-07-21T15:11:32Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added pure exact-sequence and exact-boundary assertions whose negative fixtures independently reject truncated normal publications, mismatched fault prefix/code pairs, overlap, gaps, vacuous recorders, and accepted stale result/error deliveries.
- Replaced the installed-product prefix-membership seam with exact per-reader schedules over the real installed `listComments` and `listPostActivity` queries, including mandatory cleanup publications, exact five-notification append transitions, three-page first/middle/tail faults, recovery, and restart.
- Held real old-generation result and error callbacks, disposed A, settled B and a fresh A, then proved both late deliveries left the current snapshot, descriptor chain, publication count, and error state unchanged.
- Preserved the full unrelated tracked-diff fingerprint and added no schema, DTO, authority input, package, cache, or merge-truth surface.

## Task Commits

1. **Task 1: Build a rejection-capable expected temporal oracle red-first** - `2df87b0`, `f57199d`
2. **Task 2: Drive exact installed-reader publications, boundaries, and stale deliveries** - `86d2be8`, `7f3d5b3`
3. **Task 3: Fix only proven product defects and enforce the no-flake gate** - `1d786ca`, `9e7f0fa`, `a5f9e77`

## Production Defect Proven and Fixed

The strict restart scenario failed because `restart()` stopped the old chain, published `LoadingFirstPage` with no active descriptor, and only then attached the replacement watch. Commit `1d786ca` preserves the red exact-boundary reproducer. Commit `9e7f0fa` removes that descriptorless explicit publication; `start()` now attaches the replacement and emits the retained loading state through the existing staged reread path. No other production code changed.

## Verification

- Pure integration/meta oracle: 7/7 passed.
- Focused mounted React generation fence: 21/21 passed.
- Typecheck and oxlint passed.
- Three consecutive direct `node scripts/test-headless-backend.mjs` runs passed in one fail-fast command with no retry.
- Complete `npm run test:phase2` passed once after the consecutive-run gate.
- Unrelated tracked diff SHA-256 remained `09b5f7179dc749a197ec6a59c5ba188313b8c84536e0c35b6487ae7fcb058381`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Attached the restart descriptor before its loading publication**

- **Found during:** Task 3 strict restart oracle
- **Issue:** The published snapshot temporarily had no active descriptor chain.
- **Fix:** Removed the pre-start explicit publish and reused the descriptor-backed `start()` path.
- **Files modified:** `src/react/query.ts`
- **Committed in:** `9e7f0fa`

**2. [Rule 3 - Blocking] Removed a pre-existing incomplete-comment scheduler race**

- **Found during:** Repeated direct-harness development runs
- **Issue:** The synthetic pending-comment scenario sometimes settled at the newly inserted two-row prefix while still loadable, then timed out waiting for an unrequested third row.
- **Fix:** After the mutation settles, request the remaining tail explicitly when needed and include that exact intermediate prefix in the synthetic regression's allowed states.
- **Files modified:** `scripts/test-headless-backend.mjs`
- **Committed in:** `a5f9e77`

## TDD Gate Compliance

- **RED:** `2df87b0` added eight rejection fixtures; `86d2be8` required exact installed wiring; `1d786ca` preserved the descriptorless restart failure.
- **GREEN:** `f57199d` implemented the pure oracle; `7f3d5b3` installed it over real readers; `9e7f0fa` made restart descriptor-backed.
- **ACCEPTANCE:** Focused suites, one fail-fast three-run direct command, the complete Phase 2 gate, and the unrelated fingerprint all pass.

## Next Phase Readiness

- Plan 02-17 is complete and ready for independent Phase 2 re-verification against the unchanged canonical `02-VERIFICATION.md`.
- Phase 3 Plan 03-02 remains gated only on that verifier result.

## Self-Check: PASSED

- All seven implementation/test commits exist and every declared artifact exists.
- The final no-retry direct and aggregate gates pass.
- Only the proven private restart defect changed production; unrelated dirty work remains untouched.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-21_
