---
phase: 02-complete-feedback-to-changelog-workflow
plan: "14"
subsystem: headless-react-pagination
tags: [react, convex, watch-query, pagination, atomic-snapshots, concurrency]

requires:
  - phase: 02-13
    provides: End-cursor-pinned contiguous page windows and atomic structural replacements
provides:
  - Full-chain synchronous local-query rereads for every paginated watch notification
  - Last-coherent publication gating across loading and structural replacement
  - Same-transition maximal-prefix typed errors with live recovery
  - Every-publication mounted and disposable-real-Convex temporal oracles
affects: [phase-3-copied-ui, phase-4-demo, headless-consumers]

tech-stack:
  added: []
  patterns:
    - Watch callbacks as dirty signals over the atomically installed Convex client store
    - Full descriptor-set staging before cache mutation or public notification
    - Exact prior-or-current temporal assertions in addition to settled canonical checks

key-files:
  created: []
  modified:
    - src/react/query.ts
    - tests/react/live-headless.test.tsx
    - scripts/test-headless-backend.mjs
    - tests/integration/headless-backend.test.mjs

key-decisions:
  - "Use Convex's atomically installed local query-result map as the coherence source; add no schema field, DTO member, public token, revision, or watermark."
  - "Treat every page callback as a dirty signal and synchronously stage the complete committed or candidate descriptor chain before one atomic cache/publication decision."
  - "Retain the last coherent result array while any descriptor is unavailable, and publish errors only with the maximal same-reread boundary-contiguous prefix."

patterns-established:
  - "Atomic full-chain reread: committed and structural candidate pages share one synchronous staging and identity-fence model."
  - "Temporal release oracle: every store notification must be an exact allowed canonical array, never merely eventually correct."

requirements-completed: [UI-03, QUAL-01]

coverage:
  - id: D47
    description: Every paginated-store publication is derived from one synchronous full-chain Convex client-store reread and cannot mix sibling query revisions.
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
    description: Mounted, direct-client, disposable backend, static audit, packed consumer, and aggregate Phase 2 gates inspect temporal and settled pagination behavior.
    requirement: QUAL-01
    verification:
      - kind: integration
        ref: tests/integration/headless-backend.test.mjs
        status: pass
      - kind: other
        ref: npm run test:phase2
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-07-17
status: complete
---

# Phase 02 Plan 14: Atomic Watch Snapshot Closure Summary

**Paginated headless stores now publish only snapshots staged from one complete synchronous Convex client transition, with executable temporal proof against every notification.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-17T20:10:20Z
- **Completed:** 2026-07-17T20:24:35Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Proved against a disposable real Convex 1.42.2 client that one backend mutation installs all changed page results before any individual listener runs; every listener synchronously reread three sibling watches at the same revision.
- Replaced per-page cache publication with a full committed/candidate-chain reread that stages values and errors, rechecks epoch/page/replacement/operation identities, validates cursor contiguity, and publishes once.
- Kept the exact last coherent array through unavailable append/split/collapse candidates, then synchronously swapped descriptor sets and routed them through the same full-current-chain reread.
- Added every-publication prior/current or exact prefix/error assertions across both listener orders, insertions, deletions, collapse, forward/reverse moves, rapid pending load, first/middle/tail faults, recovery, native split modes, invalid required split, and exact disposal.
- Passed React, integration, real backend, static, typecheck, lint, build, packed consumer, and aggregate Phase 2 gates without changing the public/package contract.

## Task Commits

1. **Task 1: Add red every-publication coherence oracles and prove the client transition premise** - `81cb6cd` (test)
2. **Task 2: Gate publication on one synchronous all-descriptor reread** - `a9b287c` (fix)
3. **Task 3: Stress every transition and close the packed Phase 2 gate** - `75398f7` (test)

## Files Created/Modified

- `src/react/query.ts` - Full-chain staging, identity/generation fences, coherent retention, typed prefix errors, and atomic candidate swaps.
- `tests/react/live-headless.test.tsx` - Transaction-style controlled client plus both changed-listener orders and exact every-publication assertions.
- `scripts/test-headless-backend.mjs` - Direct Convex client atomicity probe and lifetime recorders for ordinary, loading, structural, fault, recovery, and reverse-movement scenarios.
- `tests/integration/headless-backend.test.mjs` - Release audit requiring atomicity evidence, per-notification capture, exact equality, typed fault coverage, and absence of a revision/watermark contract.

## Decisions Made

- Convex's installed local result map is the only coherence source. A watermark was rejected because unchanged sibling queries need not advance with a changed page and could cause false loading or broad invalidation.
- Structural candidates are evaluated as the complete would-be descriptor chain, including unchanged siblings, rather than as replacement pages in isolation.
- Query errors keep every watch live but expose only the maximal boundary-contiguous prefix from that same full-chain reread plus the closed typed error.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first green implementation retained a candidate operation's prior error after recovery; clearing that operation-local error only after a successful full reread restored atomic recovery.
- The initial full-chain path queued structural scans for split signals but not newly empty pages; adding empty-window scheduling restored deterministic collapse without changing publication semantics.

## User Setup Required

None.

## Next Phase Readiness

- The aggregate Phase 2 release gate and clean packed consumer pass with the temporal oracle active.
- The existing `02-VERIFICATION.md` was intentionally preserved so the parent workflow can perform an independent clean 39/39 re-verification.

## Known Stubs

None.

## Self-Check: PASSED

- Commits `81cb6cd`, `a9b287c`, and `75398f7` exist and all four declared key files exist.
- React 43/43, integration 2/2, static 21/21, the disposable real Convex temporal matrix, typecheck, lint, build, packed consumer 3/3, and `npm run test:phase2` pass.
- No dependency, schema field, DTO member, public revision/watermark, or package contract was added; unrelated dirty paths remain untouched.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-17_
