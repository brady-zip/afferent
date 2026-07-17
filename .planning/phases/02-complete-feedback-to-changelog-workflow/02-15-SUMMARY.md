---
phase: 02-complete-feedback-to-changelog-workflow
plan: "15"
subsystem: headless-react-comments
tags: [react, convex, comments, watch-query, pagination, packed-consumer]

requires:
  - phase: 02-14
    provides: Atomic all-descriptor paginated watch snapshots, coherent-prefix errors, and generation fencing
provides:
  - Optional provider-injected public comment-feed query reference
  - Closed non-throwing useComments state over the existing atomic pagination substrate
  - Flat bounded CommentDto rows preserving root parentCommentId links
  - Mounted, disposable-real-Convex, and packed-consumer comment coherence proof
affects: [phase-3-public-discussion-ui, phase-4-demo, headless-consumers]

tech-stack:
  added: []
  patterns:
    - Optional query capabilities map to explicit unsupported hook states
    - Domain hooks map the shared watch store without owning parallel query machinery
    - Trusted wrappers validate and strip browser-local cache generations

key-files:
  created: []
  modified:
    - src/react/bindings.ts
    - src/react/hooks/feedback.ts
    - src/react/index.ts
    - fixtures/packed-vite-convex/convex/afferent.ts
    - fixtures/packed-vite-convex/src/App.tsx
    - tests/react/live-headless.test.tsx
    - scripts/test-headless-backend.mjs

key-decisions:
  - "Expose comment reads as one optional public binding; omission is an inert unsupported state and never starts a watch."
  - "Reuse CommentDto, CommentPageDto, and usePaginatedWatchQuery unchanged; add no recursive tree, comment cache, direct client path, or product mutation."
  - "Treat sessionGeneration only as browser-local query identity, validate it in the trusted host wrapper, and strip it before client.read.listComments."

patterns-established:
  - "Optional read seam: injected host reference plus closed unsupported/loading/empty/ready/error domain state."
  - "Flat discussion projection: replies retain parentCommentId while React consumes one bounded creation-ordered page stream."

requirements-completed: [UI-01, UI-02, UI-03, QUAL-01]

coverage:
  - id: D48
    description: React consumers can read one post's bounded flat comment feed through an optional injected binding and closed useComments state.
    requirement: UI-01
    verification:
      - kind: unit
        ref: tests/react/feedback.test.tsx#comment-feed-state
        status: pass
      - kind: integration
        ref: tests/react/live-headless.test.tsx#mounted-useComments
        status: pass
    human_judgment: false
  - id: D49
    description: Comment publications preserve exact creation order and parent IDs across loading, insert, reply, delete, fault recovery, and identity replacement.
    requirement: UI-03
    verification:
      - kind: integration
        ref: tests/react/live-headless.test.tsx#mounted-useComments
        status: pass
      - kind: e2e
        ref: node scripts/test-headless-backend.mjs
        status: pass
    human_judgment: false
  - id: D50
    description: The clean packed fixture validates and strips cache generation in a trusted wrapper and consumes useComments from the installed package export.
    requirement: UI-02
    verification:
      - kind: integration
        ref: tests/integration/headless-backend.test.mjs#packed-fixture-comment-feed
        status: pass
      - kind: other
        ref: npm run test:package
        status: pass
    human_judgment: false
  - id: QUAL01
    description: React, static, integration, real-backend, type, lint, build, packed-consumer, and aggregate Phase 2 gates cover the additive comment seam.
    requirement: QUAL-01
    verification:
      - kind: other
        ref: npm run test:phase2
        status: pass
    human_judgment: false

duration: 100min
completed: 2026-07-17
status: complete
---

# Phase 02 Plan 15: Headless Comment Feed Closure Summary

**The public React contract now exposes bounded flat comment reads through one optional injected query and the existing atomic paginated watch substrate.**

## Performance

- **Duration:** 100 min
- **Started:** 2026-07-17T21:20:23Z
- **Completed:** 2026-07-17T23:00:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Added the optional `CommentFeedQueryReference`/`public.listComments` capability and a closed `useComments` state that maps unsupported, loading, empty, ready, loading-more, exhausted, and coherent-prefix error behavior without opening a second cache or query path.
- Proved every mounted and disposable-real-Convex comment publication across root/reply insertion, deletion, pending load, first/middle/tail faults, recovery, listener orders, identity replacement, stale callbacks, and exact-once disposal.
- Wired the trusted packed fixture through `client.read.listComments`, validating and stripping the browser-local generation before the component call, and compiled `useComments` through the installed tarball export.
- Kept comments as the existing closed/versioned flat `CommentDto` rows, including optional `parentCommentId`; no schema, recursive tree, generic CRUD, product mutation, or browser authority field was added.

## Task Commits

1. **Task 1: Specify the missing comment-read contract red-first** - `3757aba` (test)
2. **Task 2: Add useComments on the existing atomic pagination substrate** - `b558a62` (test correction), `e097a90` (feat)
3. **Task 3: Prove packed host wiring and real comment coherence** - `1d0cb7c` (test), `2ca496c` (test/fixture)

## Files Created/Modified

- `src/react/bindings.ts` - Optional comment-feed function-reference contract.
- `src/react/hooks/feedback.ts` - Closed comment state mapping and `useComments` domain hook.
- `src/react/index.ts` - Public comment binding, state, mapper, and hook exports.
- `fixtures/packed-vite-convex/convex/afferent.ts` - Trusted validated host comment query.
- `fixtures/packed-vite-convex/src/App.tsx` - Installed-package binding and hook consumer.
- `tests/react/feedback.test.tsx` - Comment state-mapping and unsupported-capability unit matrix.
- `tests/react/live-headless.test.tsx` - Mounted exact-publication, pagination, recovery, identity, and disposal oracle.
- `scripts/test-headless-backend.mjs` - Disposable real Convex comment table, query, test mutations, and temporal oracle.
- `tests/integration/headless-backend.test.mjs` - Release-source and packed-fixture boundary audit.
- `tests/static/contracts.test.ts` - Narrow validator/DTO/authority contract checks.
- `tests/static/exports.test.ts` - Public export and no-parallel-cache/tree/client-access checks.

## Decisions Made

- Comment reads are optional so existing consumers remain compatible; the missing capability is explicit `unsupported` state rather than a fallback direct backend call.
- `useComments` delegates all watch, retry, cursor-window, atomic-publication, and generation behavior to `usePaginatedWatchQuery`; it only supplies the post intent and maps the closed domain state.
- The disposable harness owns its test-only delete mutation. The product component contract remains unchanged and exposes no comment deletion or generic CRUD API.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The initial temporal oracle expected a pending window after the real client had already installed the next coherent prefix. Calibrating the assertion to the exact client publication and waiting for the settled structural boundary removed timing assumptions without weakening any prior/current-prefix constraint.
- The mounted identity test initially returned identical fixture data for both actors, which could not distinguish clearing from immediate repopulation. Actor B now deliberately has no resolved page, making synchronous old-identity removal observable.

## User Setup Required

None.

## Next Phase Readiness

- Phase 3 Plan 03-02 can now render discussion exclusively through `useComments` and the existing participation hook.
- All 15 Phase 2 plans and the aggregate Phase 2 gate are complete; Phase 3 remains current at Plan 03-02.
- The unrelated TypeScript 7 package experiment and Codex hook/debug worktree changes remain unstaged and untouched.

## Known Stubs

None.

## Self-Check: PASSED

- Commits `3757aba`, `b558a62`, `e097a90`, `1d0cb7c`, and `2ca496c` exist and all declared artifacts exist.
- React 51/51, integration 3/3, static 23/23, the disposable real Convex comment matrix, typecheck, lint, build, clean packed consumer, and `npm run test:phase2` pass.
- Plan structure and artifact verification pass; no `.planning/codebase/STRUCTURE.md` exists, so no source-authority drift scan applies.
- No package, schema, DTO, recursive tree, generic CRUD, product comment mutation, or direct React client-read contract was added.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-17_
