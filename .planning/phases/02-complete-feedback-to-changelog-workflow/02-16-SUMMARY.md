---
phase: 02-complete-feedback-to-changelog-workflow
plan: "16"
subsystem: merged-reader-pagination
tags: [convex, merged-stream, comments, activity, cursor-pagination, merge]

requires:
  - phase: 02-15
    provides: Optional useComments binding over the atomic paginated watch store
provides:
  - One shared index-bounded paginator for single and merged comment/activity readers
  - Versioned opaque cursor envelopes covering start, end, continuation, and split boundaries
  - Real installed-component proof across cutover, cleanup repoint, completion, malformed cursors, and bounded late pages
affects: [phase-3-discussion-ui, phase-4-demo, headless-consumers]

tech-stack:
  added: []
  patterns:
    - Merge-aware readers use convex-helpers mergedStream for both one- and two-stream cardinalities
    - Cursor envelopes bind reader kind, order kind, and a deterministic stream-set signature
    - Invalid or stale cursor boundaries reset both ends to one fresh coherent prefix

key-files:
  created:
    - src/component/model/mergedPagination.ts
    - tests/model/merged-pagination.test.ts
  modified:
    - src/component/public/comments.ts
    - src/component/admin/activity.ts
    - src/component/_generated/api.ts
    - tests/component/merge.test.ts
    - tests/static/schema-scope.test.ts
    - tests/integration/headless-backend.test.mjs
    - scripts/test-merge-backend.mjs

key-decisions:
  - "Use the same mergedStream helper for one and two post IDs so cursor shape and reactive window semantics cannot diverge by reader cardinality."
  - "Bind opaque cursor positions to reader, order, and hashed stream-set identity; any mismatch resets cursor and endCursor together instead of attempting partial reuse."
  - "Keep comments ordered by _creationTime,_id and activity ordered by occurredAt,_creationTime,_id so cleanup repoints never change cursor position."

patterns-established:
  - "Repoint-invariant pagination: merge membership stays outside the helper position while the envelope detects reader-set transitions."
  - "Symmetric boundary validation: cursor and endCursor share one codec and one clean-reset path."

requirements-completed: [DISC-07, ADMN-10, UI-03, QUAL-01]

coverage:
  - id: D51
    description: Visitors page every canonical and source comment exactly once in full ascending index order after merge cutover.
    requirement: DISC-07
    verification:
      - kind: unit
        ref: tests/component/merge.test.ts#merged-comment-and-activity-pagination
        status: pass
      - kind: e2e
        ref: node scripts/test-merge-backend.mjs
        status: pass
    human_judgment: false
  - id: D52
    description: Authorized activity reads preserve the existing descending occurredAt,creation,id order across all merged pages.
    requirement: ADMN-10
    verification:
      - kind: unit
        ref: tests/component/merge.test.ts#merged-comment-and-activity-pagination
        status: pass
      - kind: e2e
        ref: node scripts/test-merge-backend.mjs
        status: pass
    human_judgment: false
  - id: D53
    description: Start, end, continuation, and split cursors share one versioned reader/order/stream envelope and stale inputs reset cleanly.
    requirement: UI-03
    verification:
      - kind: unit
        ref: tests/model/merged-pagination.test.ts#bounded-full-key-stream
        status: pass
      - kind: integration
        ref: tests/integration/headless-backend.test.mjs#real-merge-pagination
        status: pass
    human_judgment: false
  - id: D54
    description: Installed-product readers stay index-bounded through source redirect, cleanup repoint, completion, and late-page reads.
    requirement: QUAL-01
    verification:
      - kind: e2e
        ref: node scripts/test-merge-backend.mjs
        status: pass
      - kind: other
        ref: npm run test:phase2
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-07-20
status: complete
---

# Phase 02 Plan 16: Merged Reader Cursor Correction Summary

**Comments and admin activity now share one bounded full-key merged stream whose opaque cursors remain coherent through duplicate-merge cutover, cleanup, and completion.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-07-21T04:36:16Z
- **Completed:** 2026-07-21T04:53:06Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Replaced the independent timestamp-only merged comment and activity branches with `paginateMergedPostStream`, using scope/post equality indexes and the complete native tie keys for both one- and two-stream reads.
- Added one opaque versioned boundary envelope for cursor, endCursor, continueCursor, and splitCursor, with reader/order/stream-set validation and a symmetric fresh-prefix reset on malformed or stale inputs.
- Proved exact ordered traversal, pinned windows, source redirects, cleanup repoints, merged-to-single completion resets, malformed/version/reader/order/stream fuzz, and bounded late pages through the installed component's real queries.
- Preserved DTO versions, schema, indexes, merge writers, authority inputs, React cache behavior, and package dependencies unchanged.

## Task Commits

1. **Task 1: Specify merged-reader cursor correctness red-first** - `87780dd` (test)
2. **Task 2: Route every reader cardinality through one composite cursor stream** - `1828326` (fix)
3. **Task 3: Prove the installed-product merged reader lifecycle** - `ecf1cad` (test)

## Files Created/Modified

- `src/component/model/mergedPagination.ts` - Shared namespaced cursor codec and bounded one/two-stream paginator.
- `src/component/public/comments.ts` - Ascending comment reader delegated to the shared helper.
- `src/component/admin/activity.ts` - Descending activity reader delegated to the shared helper.
- `src/component/_generated/api.ts` - Generated module inventory refreshed for the new internal model module.
- `tests/model/merged-pagination.test.ts` - Full-key, end-boundary, budget, and no-filter source contract.
- `tests/component/merge.test.ts` - Real merge cutover traversal, ties, pinning, and reset behavior.
- `tests/static/schema-scope.test.ts` - Shared-helper and no-post-filter audit for both readers.
- `tests/integration/headless-backend.test.mjs` - Disposable harness source contract for both real readers.
- `scripts/test-merge-backend.mjs` - Installed-component exact-array oracle across cursor and merge lifecycle transitions.

## Decisions Made

- Both single-post and merged-post paths use `mergedStream`; there is no native-paginator cardinality branch that could issue incompatible cursors.
- The stream-set signature hashes scope plus sorted post IDs. It detects cutover/completion changes without placing post IDs in the helper position or treating the cursor as authority.
- Invalid start or end boundaries reset both boundaries together. Reusing only one side could publish an overlapping old/new window.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Refreshed the generated component API inventory**

- **Found during:** Task 3 aggregate build
- **Issue:** Adding the internal `mergedPagination.ts` module caused Convex code generation to update the checked-in module inventory.
- **Fix:** Included the generated type-only import and module mapping with the Task 3 evidence commit.
- **Files modified:** `src/component/_generated/api.ts`
- **Verification:** `npm run build`, `npm run typecheck`, `npm run test:package`, and `npm run test:phase2` pass.
- **Committed in:** `ecf1cad`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The generated inventory update is a direct build artifact of the planned module and adds no runtime API, schema, or authority surface.

## Issues Encountered

- The first aggregate Phase 2 run hit a transient local Convex startup timeout in the pre-existing search harness after several disposable backend runs reused port 3210. No contract assertion failed; after the prior process released the port, a clean `npm run test:phase2` rerun passed end-to-end.
- h5i's pending commit context acquired invalid trailing bytes while large captured outputs were being recorded. The corrupt internal file was preserved as `.git/.h5i/pending_context.json.corrupt-20260720T2152Z`, a fresh sync restored storage health, and `h5i capture commit` then recorded Task 3 normally.

## TDD Gate Compliance

- RED: `87780dd` committed failing model, real component, static, and disposable-harness source expectations before production changes.
- GREEN: `1828326` implemented the shared paginator and made the focused model/component/static matrix pass.
- ACCEPTANCE: `ecf1cad` added installed-product lifecycle evidence, followed by the complete Task 3 and Phase 2 regression gates.

## User Setup Required

None.

## Next Phase Readiness

- Phase 2 Plan 02-16 is executed and ready for independent phase verification.
- Phase 3 Plan 03-02 may resume only after the verifier confirms the grouped merged comments/activity gap is closed.
- The unrelated TypeScript 7 package experiment and Codex hook/debug changes remain byte-for-byte at their original tracked-diff baseline.

## Known Stubs

None.

## Self-Check: PASSED

- Commits `87780dd`, `1828326`, and `ecf1cad` exist and every declared source, test, harness, and summary artifact exists.
- Focused model/component/static tests, React 51/51, integration 4/4, real merge and headless backends, static 24/24, typecheck, lint, build, packed artifact 3/3, and the clean aggregate `npm run test:phase2` pass.
- Plan structure validates with three complete tasks and no warnings; the unrelated tracked-diff SHA-256 remains `09b5f7179dc749a197ec6a59c5ba188313b8c84536e0c35b6487ae7fcb058381`.
- No schema, index, writer, DTO, public authority input, React cache, package dependency, or production merge mutation changed.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-20_
