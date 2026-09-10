---
phase: 02-complete-feedback-to-changelog-workflow
plan: "05"
subsystem: duplicate-merge
tags: [convex, merge, redirect, react-hooks, staging]

requires:
  - phase: 02-08
    provides: Subscription, notification, and changelog relation truth
  - phase: 02-11
    provides: Corrective hidden staging and atomic large-merge cutover
provides:
  - Preserved and deduplicated duplicate-post relation history
  - Durable flattened redirect tombstones with canonical visibility privacy
  - Stable host and headless direct-resolution and merge contracts
  - Corrected atomic reader semantics for both small and large merges
affects: [phase-3-copied-ui, phase-4-demo]

tech-stack:
  added: []
  patterns:
    - Membership truth is unioned by actor and counters are reconciled from truth
    - Redirect disclosure follows final canonical visibility
    - Large merges rely on Plan 02-11 hidden staging and one atomic cutover

key-files:
  created:
    - src/component/admin/merge.ts
    - src/component/jobs/merge.ts
    - src/component/model/merge.ts
    - tests/component/merge.test.ts
    - tests/model/merge.test.ts
    - tests/react/merge.test.tsx
  modified:
    - src/component/public/posts.ts
    - src/client/contracts.ts
    - src/client/internal.ts
    - src/react/hooks/admin.ts
    - src/react/hooks/feedback.ts

key-decisions:
  - "Return an explicit post, merged, or notFound direct result and never silently substitute the canonical post."
  - "Flatten durable redirects and make their disclosure depend on the final canonical visibility."
  - "Treat Plan 02-11 as the required corrective implementation for D-12 large-merge atomicity."

patterns-established:
  - "Duplicate resolution: preserve bounded source history, union relation truth, and expose a privacy-safe final redirect."

requirements-completed: [DISC-07, DISC-08, UI-01, UI-02, UI-03, QUAL-01]

coverage:
  - id: D1
    description: Duplicate merge preserves relation truth, deduplicates memberships, reconciles counters, and stores bounded source history.
    requirement: DISC-07
    verification:
      - kind: integration
        ref: tests/component/merge.test.ts#preserves relation truth and exposes one flattened durable redirect
        status: pass
      - kind: e2e
        ref: node scripts/test-merge-backend.mjs
        status: pass
    human_judgment: false
  - id: D2
    description: Direct lookup returns privacy-safe post, merged, or notFound results and hidden/cross-scope targets do not disclose redirects.
    requirement: DISC-08
    verification:
      - kind: integration
        ref: tests/component/merge.test.ts#does not disclose cross-scope or hidden canonical targets
        status: pass
      - kind: integration
        ref: tests/react/merge.test.tsx
        status: pass
    human_judgment: false
  - id: D3
    description: Large merges have one atomic logical reader transition and bounded crash-safe physical convergence.
    requirement: QUAL-01
    verification:
      - kind: e2e
        ref: 02-11-SUMMARY.md#Self-Check
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-07-17
status: complete
---

# Phase 02 Plan 05: Duplicate Merge and Durable Redirect Summary

**Afferent now preserves complete duplicate history behind privacy-safe flattened redirects, with stable host/headless contracts and the Plan 02-11 atomic large-merge correction.**

## Performance

- **Duration:** 55 min across the original implementation and corrective closure
- **Completed:** 2026-07-17
- **Tasks:** 3 original tasks plus one required additive correction plan
- **Files modified:** 23 original planned paths, with corrective reader/writer paths documented in 02-11

## Accomplishments

- Added irreversible admin duplicate merge, bounded source-history preservation, actor-membership union/dedupe, physical normalization, and counter reconciliation.
- Added durable flattened source tombstones whose redirect is visible only when the final canonical post is visible in the same scope.
- Added provider-neutral host capabilities, explicit `post | merged | notFound` resolution, `usePost`, and `useMergePost` without client authority, navigation, toasts, or optimistic merge state.
- Closed the original large-continuation D-12 gap through Plan 02-11 hidden staging, OCC fencing, one row-free reader cutover, and real-backend crash/concurrency proof.

## Task Commits

1. **Task 1: Specify merge preservation, redirect privacy, and crash boundaries** - `9a3ef59` (test)
2. **Task 2: Implement the guarded resumable merge state machine** - `2ee2c0c` (feat)
3. **Task 3: Expose direct resolution and merge through host/headless APIs** - `380fe8a` (feat)
4. **Legacy direct-post compatibility correction** - `7504e98` (fix)
5. **Required D-12 corrective dependency** - Plan 02-11 commits `209a5cc`, `37ba60b`, `0f53278`, `5f00257`, `be5147e`

## Decisions Made

- The canonical post wins duplicate subscription state while genuinely new actors are unioned; vote and comment counters derive from deduplicated membership/relation truth.
- A merged direct result discloses only requested and final canonical IDs and never fetches/substitutes the canonical DTO automatically.
- The original visible batch reparent implementation was not accepted as complete. Plan 02-05 closes only with Plan 02-11's hidden preparation and real Convex observation matrix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved the Phase 1 direct-post contract**
- **Found during:** Original Task 3 integration
- **Issue:** Replacing the legacy direct getter would break packed consumers.
- **Fix:** Kept the legacy getter and added explicit resolution as an additive contract.
- **Committed in:** `7504e98`

**2. [Rule 1 - Critical Atomicity] Replaced visible batch reparenting**
- **Found during:** Original Plan 02-05 execution review
- **Issue:** A combined source-plus-canonical observer could see relations move before the final tombstone.
- **Fix:** Added Plan 02-11 rather than claiming the unsafe path satisfied D-12.
- **Verification:** Disposable real Convex pre/post-only observation, restart, abort, concurrency, repeated-step, two-scope, and final convergence matrix.
- **Committed in:** `209a5cc`, `37ba60b`, `0f53278`, `5f00257`, `be5147e`

---

**Total deviations:** 2 auto-fixed Rule 1 issues. **Impact on plan:** The public contract remains additive and the originally unmet atomicity success criterion is now fully implemented.

## Issues Encountered

- The original static merge backend script inspected source text and could not validate runtime atomicity. Plan 02-11 replaced it with an actual disposable Convex deployment.

## User Setup Required

None.

## Next Phase Readiness

- All 11 Phase 2 plans now have summaries and the duplicate lifecycle is ready for phase verification and copied UI consumption.

## Known Stubs

None.

## Self-Check: PASSED

- Original commits `9a3ef59`, `2ee2c0c`, `380fe8a`, and `7504e98` exist.
- Corrective Plan 02-11 commits and `02-11-SUMMARY.md` exist.
- Component, model, React, static, full package, packed consumer, and disposable real Convex gates pass.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-17_
