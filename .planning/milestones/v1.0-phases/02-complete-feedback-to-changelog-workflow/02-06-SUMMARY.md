---
phase: 02-complete-feedback-to-changelog-workflow
plan: "06"
subsystem: roadmap
tags:
  [
    convex-components,
    reactive-pagination,
    roadmap,
    react-hooks,
    scope-isolation,
  ]
requires:
  - phase: 02-03
    provides: Orthogonal status transitions, shared visibility state, trusted host authorization, and append-only activity
  - phase: 02-04
    provides: Current generated component bindings and scope-complete projection conventions
provides:
  - Three independently cursor-paginated Planned, In Progress, and Complete roadmap projections
  - Fixed 90-day Complete window with scope, board, and shared visibility enforcement inside roadmap indexes
  - Versioned RoadmapItemDto and RoadmapGroupPageDto contracts plus a trusted host read
  - Framework-light useRoadmap state with independent helper-owned pagination per group
affects: [02-07, 02-08, 02-10, phase-03]
tech-stack:
  added: []
  patterns:
    - Status-derived roadmap groups query scope-leading total-order indexes rather than an independent roadmap table
    - Each roadmap column owns one convex-helpers reactive pagination stream
key-files:
  created:
    - src/component/public/roadmap.ts
    - src/react/hooks/roadmap.ts
    - tests/component/roadmap.test.ts
    - tests/react/roadmap.test.tsx
  modified:
    - src/component/schema.ts
    - src/component/validators.ts
    - src/client/contracts.ts
    - src/client/internal.ts
    - src/react/bindings.ts
    - src/react/index.ts
key-decisions:
  - "Use a fixed 90-day currentStatusSince range for Complete while Planned and In Progress remain unbounded within their independently paginated status groups."
  - "Include an optional non-authoritative sessionGeneration in the host roadmap query identity so helper pagination resets on logout and account switches without passing actor authority to the component."
  - "Expose a dedicated minimal RoadmapItemDto instead of reusing full feedback documents or creating a separate roadmap entity."
patterns-established:
  - "Roadmap projection: scope/status/visibility/currentStatusSince/createdAt/opaque ID is the canonical total-order index, with an optional board-prefixed variant."
  - "Grouped headless state: fixed planned/inProgress/complete keys each map helper results directly and own loading, empty, error, and load-more state."
requirements-completed:
  [RMAP-01, RMAP-02, RMAP-03, UI-01, UI-02, UI-03, QUAL-01]
coverage:
  - id: D1
    description: Visitors independently page exactly Planned, In Progress, and recent Complete roadmap groups in current-status transition order.
    requirement: RMAP-01
    verification:
      - kind: integration
        ref: tests/component/roadmap.test.ts#pages fixed groups independently with scope board visibility and recency enforced in the query
        status: pass
    human_judgment: false
  - id: D2
    description: Board filters, two-scope isolation, authenticated-read policy, and shared hidden-post visibility apply before roadmap pagination.
    requirement: RMAP-03
    verification:
      - kind: integration
        ref: tests/component/roadmap.test.ts#status-derived public roadmap
        status: pass
      - kind: other
        ref: tests/static/schema-scope.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Status changes update the roadmap without publishing changelog activity, locking discussion, or disabling votes and comments.
    requirement: QUAL-01
    verification:
      - kind: integration
        ref: tests/component/roadmap.test.ts#status transitions update roadmap order without coupling workflow side effects
        status: pass
    human_judgment: false
  - id: D4
    description: Consumers render and page all three roadmap columns independently through optional provider-neutral refs with explicit async and unsupported states.
    requirement: UI-01
    verification:
      - kind: unit
        ref: tests/react/roadmap.test.tsx
        status: pass
      - kind: other
        ref: npm run typecheck && npm run lint
        status: pass
    human_judgment: false
  - id: D5
    description: The roadmap contract, generated component bindings, and React exports remain compatible with the complete packed-consumer release gate.
    requirement: QUAL-01
    verification:
      - kind: e2e
        ref: npm test
        status: pass
    human_judgment: false
duration: 8min
completed: 2026-07-16
status: complete
---

# Phase 2 Plan 6: Status-Derived Public Roadmap Summary

**Three scope-safe status projections with a 90-day Complete window and independently reactive Planned, In Progress, and Complete headless columns**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-16T23:01:19Z
- **Completed:** 2026-07-16T23:08:56Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Added two scope-leading roadmap index shapes and one narrow component query that pages a single fixed roadmap status per call, validates optional boards, enforces read policy, and applies the shared public visibility key before pagination.
- Frozen a versioned roadmap DTO and trusted host read whose Complete group is bounded to the latest 90 days while older completed feedback remains untouched in ordinary discovery.
- Shipped `useRoadmap` with three independent `convex-helpers` streams, canonical helper results, fixed group keys, explicit loading/empty/error/unsupported states, and account-generation reset identity.
- Proved currentStatusSince/creation/opaque-ID total ordering, two-scope and authenticated-policy isolation, hidden/withdrawn/merged exclusion, board filtering, workflow orthogonality, and packed-consumer compatibility.

## Task Commits

Each task was committed atomically:

1. **Task 1: Specify the grouped roadmap projection** - `97302ee` (test)
2. **Task 2: Implement scope-complete independently paginated roadmap groups** - `b301726` (feat)
3. **Task 3: Expose grouped roadmap state through headless React** - `d30fe09` (feat)
4. **Invariant closure: Prove the complete roadmap total order** - `573e57d` (test)

## Files Created/Modified

- `src/component/public/roadmap.ts` - Fixed-status roadmap pagination, 90-day Complete window, policy checks, and minimal DTO projection.
- `src/component/schema.ts` - Scope/status/visibility/currentStatusSince/creation/ID indexes with an optional board prefix.
- `src/component/validators.ts` and `src/client/contracts.ts` - Versioned roadmap item/page validators, intent, result, and branded TypeScript contracts.
- `src/client/internal.ts` - Trusted scope and authenticated-view derivation on every roadmap read.
- `src/react/bindings.ts` and `src/react/hooks/roadmap.ts` - Optional roadmap binding plus three independently mapped helper streams.
- `tests/component/roadmap.test.ts` and `tests/react/roadmap.test.tsx` - Projection, ordering, visibility, policy, scope, orthogonality, and grouped-hook matrices.

## Decisions Made

- Selected 90 days as the fixed Complete recency window and applied it to `currentStatusSince`, the transition time that defines roadmap membership order.
- Kept roadmap as a read-only post projection. There is no roadmap table, write API, manual order, status-triggered changelog publication, or status-triggered participation behavior.
- Added `sessionGeneration` only to the host/headless query identity. The trusted host discards it before the component call, so it resets client pagination without becoming identity or authorization input.

## Deviations from Plan

None - the plan executed as written. The additional ordering assertion commit strengthens the planned D-25 total-order proof without changing product scope.

## Issues Encountered

- The first red React suite correctly failed because the roadmap module did not exist, and component suites failed at the missing trusted host method. After implementation, the focused, type, lint, build, full repository, and packed-consumer gates all passed.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - T-02-20 and T-02-21 are covered by scope-leading visibility indexes, direct board scope validation, shared visibility defense, server-derived scope/auth state, and total-order/two-scope tests. T-02-22 is accepted as planned through independent max-50 pages and the fixed Complete range.

## Next Phase Readiness

- Plan 02-07 can link changelog entries to canonical feedback without coupling publication to status or roadmap membership.
- Plans 02-08 and 02-10 can reuse the grouped optional binding and helper-state patterns for notifications and unified headless state.
- Phase 3 can render the fixed roadmap groups without inventing data ownership, manual ordering, or a parallel client cache.

## Self-Check: PASSED

- All four new-path artifacts and every generated/contract modification exist.
- Commits `97302ee`, `b301726`, `d30fe09`, and `573e57d` exist.
- Focused roadmap/discovery/moderation/static/React suites, typecheck, lint, build, full `npm test`, and packed-consumer verification pass.
- No task-owned TODO, placeholder, empty implementation, or known stub remains.
