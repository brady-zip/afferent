---
phase: 02-complete-feedback-to-changelog-workflow
plan: "13"
subsystem: headless-react-pagination
tags: [react, convex, watch-query, pagination, cursor-windows, concurrency]

requires:
  - phase: 02-12
    provides: Non-throwing live query stores and identity-generation isolation
provides:
  - End-cursor-pinned contiguous page-window state machine with one unbounded tail
  - Atomic append, split, and empty-window collapse replacements
  - Maximal coherent-prefix errors, live recovery, and generation-fenced structural work
  - Exact ordered canonical real-Convex oracle with active-boundary and disposal accounting
affects: [phase-3-copied-ui, phase-4-demo, headless-consumers]

tech-stack:
  added: []
  patterns:
    - Serialized atomic structural replacements over explicit cursor windows
    - Exact canonical-array verification without deduplication or count proxies
    - Store-epoch fencing for queued work and stale watch callbacks

key-files:
  created: []
  modified:
    - src/react/query.ts
    - tests/react/live-headless.test.tsx
    - scripts/test-headless-backend.mjs
    - tests/integration/headless-backend.test.mjs

key-decisions:
  - "Pin every committed non-tail page at the next page cursor and never rebase downstream descriptors after an earlier-page update."
  - "Permit only one append, split, or collapse replacement at a time and commit it only after every candidate watch is complete."
  - "Map Convex 1.42.2 null-status pages with a backend splitCursor to the opportunistic split path; never fabricate a status or cursor."
  - "Treat SplitRequired without a cursor as a typed UNKNOWN invariant error while keeping its watch live for recovery."

patterns-established:
  - "Cursor-window exactness: visible results are the ordered concatenation of the maximal boundary-contiguous complete prefix."
  - "Structural isolation: replacement candidates remain hidden until one validated atomic commit and are disposed exactly once."

requirements-completed: [UI-03, QUAL-01]

coverage:
  - id: D47
    description: Reactive loaded pagination remains exact across insert, delete, reorder, append, split, collapse, failure, recovery, and generation changes.
    requirement: UI-03
    verification:
      - kind: integration
        ref: tests/react/live-headless.test.tsx#mounted-ordered-pagination
        status: pass
      - kind: e2e
        ref: node scripts/test-headless-backend.mjs
        status: pass
    human_judgment: false
  - id: QUAL01
    description: The release gate requires exact ordered canonical arrays, contiguous active boundaries, and exact-once watch disposal while rejecting Set and nonempty substitutes.
    requirement: QUAL-01
    verification:
      - kind: integration
        ref: tests/integration/headless-backend.test.mjs
        status: pass
      - kind: other
        ref: npm run test:phase2
        status: pass
    human_judgment: false

duration: 47min
completed: 2026-07-17
status: complete
---

# Phase 02 Plan 13: Contiguous Cursor-Window Closure Summary

**Every loaded headless page is now an explicit contiguous cursor window, and mounted plus real Convex tests prove its exact ordered contents under reactive mutation and structural concurrency.**

## Performance

- **Duration:** 47 min
- **Started:** 2026-07-17T19:07:15Z
- **Completed:** 2026-07-17T19:53:45Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Replaced independent cursor descriptors with an ordered chain whose non-tail pages are end-cursor pinned and whose adjacent boundaries are identical.
- Made load-more, recommended/required split, and empty-window collapse serialized atomic replacements that retain the last coherent visible data until all candidates are ready.
- Added maximal coherent-prefix error publication, required-split missing-cursor failure and live recovery, invalid-cursor restart, and store-epoch fencing for queued and stale work.
- Upgraded the disposable backend matrix to stable logical labels, narrow insert/delete/move operations, revision-tagged canonical truth, real split thresholds, exact arrays, active-boundary validation, and exact-once watch disposal.
- Passed all React, integration, real backend, static, typecheck, lint, build, clean packed-consumer, and aggregate Phase 2 gates.

## Task Commits

1. **Task 1: Add failing exact cursor-window acceptance oracles** - `e954a50` (test)
2. **Task 2: Implement the contiguous cursor-window state machine** - `009052a` (fix)
3. **Task 3: Stress structural interleavings and close the full gate** - `cc49194` (test)

## Files Created/Modified

- `src/react/query.ts` - End-cursor-pinned descriptor chain, structural queue, coherent-prefix state, split/collapse logic, and epoch fences.
- `tests/react/live-headless.test.tsx` - Mounted exact-window, rapid-load, split, collapse, middle-error, recovery, stale-generation, and disposal matrix.
- `scripts/test-headless-backend.mjs` - Disposable real Convex canonical-window mutation and native split-threshold oracle.
- `tests/integration/headless-backend.test.mjs` - Release audit requiring exact ordered/canonical and disposal evidence while rejecting weak proxies.

## Decisions Made

- Earlier pages are fixed cursor ranges. Their reactive growth or shrink never changes the start cursor of a later page, so downstream rebasing and ID deduplication are unnecessary and prohibited.
- A complete current window remains visible while replacement watches load; SplitRequired data stays hidden until valid children commit, and an omitted required cursor becomes a closed typed error.
- Convex 1.42.2 empirically emitted `SplitRequired` at 1200/1800/2300/2800/4300 byte thresholds, with no cursor at 1200/1800 and a cursor at 2300/2800/4300. At 8000 it emitted a backend `splitCursor` with null status. The latter is the real opportunistic signal for this pinned version; future native `SplitRecommended` maps to the same path.
- Structural invariant messages include the operation kind and offending descriptor boundary pair, and every attached real or controlled watch must be disposed once.

## Deviations from Plan

### Acceptance Clarification

**1. Real Convex 1.42.2 did not emit the literal `SplitRecommended` enum in the measured threshold matrix**
- **Found during:** Task 2 real-backend threshold probing
- **Issue:** Fabricating a status would invalidate the real oracle, while ignoring the native null-status `splitCursor` would leave the opportunistic branch untested.
- **Resolution:** After the required live-radio checkpoint, mapped a genuine backend `splitCursor` on a complete null-status page to the same opportunistic path. Required-with-cursor remains eager; required-without-cursor remains a typed error. No status or cursor is synthesized.
- **Verification:** The exact threshold table, opportunistic growth/split, eager required split, missing-cursor error, and recovery all pass against disposable Convex 1.42.2.
- **Committed in:** `009052a`

---

**Total deviations:** 1 acceptance clarification. **Impact on plan:** The real backend behavior is covered without weakening the contract or using a fabricated signal.

## Issues Encountered

- The full aggregate Phase 2 gate includes multiple disposable Convex deployments and completed successfully in approximately six minutes.
- A source audit initially rejected a legitimate nonempty wait predicate; the predicate was replaced with the exact expected ordered label array rather than weakening the audit.

## User Setup Required

None.

## Next Phase Readiness

- The sole D-47 gap has mounted, real backend, packed-artifact, and aggregate release evidence.
- The existing `02-VERIFICATION.md` remains preserved for the parent workflow's clean 39/39 re-verification.

## Known Stubs

None.

## Self-Check: PASSED

- Commits `e954a50`, `009052a`, and `cc49194` exist and all four declared key files exist.
- React 41/41, integration 2/2, static 21/21, the exact real Convex matrix, typecheck, lint, build, packed consumer 3/3, and `npm run test:phase2` pass.
- No dependency was added, no weak uniqueness/nonempty oracle remains, and the prior verification report was not modified.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-17_
