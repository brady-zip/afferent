---
phase: 03-source-owned-product-interface
plan: "12"
subsystem: recovery-evidence-integrity
tags: [react, accessibility, registry, playwright, anti-skip]
requires: [{phase: 03-11, provides: Shared public query recovery guidance}]
provides: [Source-grounded anti-skip oracle, Exhaustive mounted recovery matrix, Packed installed recovery matrix]
affects: [phase-03-verification, phase-04-hosted-example]
tech-stack: {added: [], patterns: [Query-owned retry exposed through closed error states, Stable installed scenario controls with observable attempts]}
key-files:
  created: [.planning/phases/03-source-owned-product-interface/03-12-SUMMARY.md]
  modified: [tests/integration/phase3-gate.test.mjs, tests/ui/board.test.tsx, tests/ui/public-surfaces.test.tsx, fixtures/registry-vite/src/App.tsx, tests/accessibility/phase3.spec.ts, src/react/hooks/roadmap.ts, src/react/hooks/notifications.ts]
key-decisions:
  - Recovery anti-skip assertions inspect the artifact that owns each key, sentence, scenario, and executable action.
  - Paginated roadmap and notification error states expose retry; loadMore remains reserved for ready pagination.
  - Installed public recovery scenarios are independent from administrative scenarios and expose attempt counts only as hidden evidence metadata.
requirements-completed: [QUAL-07]
coverage:
  - id: D1
    description: Canonical, generated, mounted, and installed recovery evidence cannot be silently skipped or satisfied by dead strings.
    requirement: QUAL-07
    verification:
      - kind: integration
        ref: "node --test tests/integration/phase3-gate.test.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: Every public query error preserves exact default or custom guidance, its domain action, and the originating query arguments.
    requirement: QUAL-07
    verification:
      - kind: integration
        ref: "tests/ui/board.test.tsx and tests/ui/public-surfaces.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: The packed installed consumer drives twelve public recovery families under default and sentinel guidance with deterministic evidence.
    requirement: QUAL-07
    verification:
      - kind: e2e
        ref: "tests/accessibility/phase3.spec.ts#ST-06"
        status: pass
      - kind: integration
        ref: "npm run test:phase3"
        status: pass
    human_judgment: false
duration: 22min
completed: 2026-07-22
status: complete
---

# Phase 03 Plan 12: Recovery Evidence Integrity Summary

**The release gate now proves exact default/custom recovery copy, unchanged domain actions, and query-owned retries across every mounted and reachable packed public error surface.**

## Accomplishments

- Repaired the dead anti-skip assertion by checking typed copy where it is authored/generated and executable scenarios where they are actually driven.
- Added exhaustive default and sentinel mounted matrices for board feed/search/similar/detail/discussion/Activity, all roadmap groups, changelog feed/detail, and notifications, including exact retry arguments and retained notification rows.
- Added twelve dedicated packed-consumer public recovery scenarios, observable retry transitions, a non-Activity notification recovery capture, and byte-identical evidence across consecutive browser runs.
- Corrected a newly proven product defect: roadmap and notification error actions now invoke paginated `retry` rather than the no-op `loadMore` path used while the store is in `Error`.

## Task Commits

1. Anti-skip oracle: `682ea9b`
2. Mounted RED matrix and deviation: `9fd2567`
3. Roadmap/notification retry correction and generated parity: `49a632d`
4. Retained notification recovery evidence: `766c757`
5. Installed browser matrix and deterministic evidence: `7adb3bb`
6. Fixture lint closure: `bfd7978`

## Deviations from Plan

### [Rule 1 - Bug] Roadmap and notification recovery actions were no-ops

- **Found during:** Task 2 mounted callback matrix.
- **Issue:** Both views invoked `loadMore`, but their mapped error states discarded the paginated store's `retry`; `loadMore` intentionally performs no work in `Error`.
- **Fix:** Exposed `retry` only on both error-state unions, mapped the store callback, wired the two recovery buttons, and regenerated mirrors/registry items.
- **Files modified:** `src/react/hooks/roadmap.ts`, `src/react/hooks/notifications.ts`, canonical roadmap/notification UI, and generated artifacts.
- **Verification:** The original RED assertion now creates exactly one semantic retry attempt; typecheck, React tests, mounted matrices, clean packed consumer, and the full aggregate pass.
- **Commit:** `49a632d`.

**Total deviations:** 1 auto-fixed bug. **Impact:** Narrowly restores the existing recovery contract without changing authority, query arguments, DTOs, or ready-state pagination.

## Issues Encountered

- The first aggregate run hit a transient real-Convex startup timeout in the pre-existing tag-cleanup backend harness. The isolated script passed immediately on rerun, and the final full aggregate completed successfully.
- The first installed run exposed horizontal overflow from visible machine-readable attempt JSON in the evidence fixture. Making that evidence-only output hidden restored 320px reflow without changing product source.
- The explicit Phase 2 rerun caught two fixture-only `max-params` lint findings; typed options objects resolved them before the final aggregate.

## Verification

- Mounted board/public recovery matrix: 15/15 passed.
- React regression: 61/61 passed; typecheck and lint passed.
- Clean packed registry consumer and canonical/generated drift checks passed.
- Installed Playwright: 13/13 passed twice; all evidence SHA-256 hashes were byte-identical across consecutive runs.
- Anti-skip: 3/3 passed with all twelve fixture/browser scenario IDs and executable action/attempt anchors required.
- Final `npm run test:phase3`: passed, including the complete embedded Phase 2 regression and authority gates.
- Unrelated TypeScript 7/h5i/debug changes remained unstaged and untouched.

## Next Phase Readiness

Phase 3 is complete and ready for final verification/audit routing before Phase 4 hosted release work.

## Self-Check: PASSED
