---
phase: 02-complete-feedback-to-changelog-workflow
plan: "04"
subsystem: tags
tags:
  [
    convex-components,
    scheduled-mutations,
    bounded-cleanup,
    react-hooks,
    authorization,
  ]
requires:
  - phase: 02-03
    provides: Trusted admin authorization, append-only activity, visibility, and headless mutation-state patterns
provides:
  - Stable scope-owned tags with normalized unique names and a fixed 20-tag post ceiling
  - Idempotent assignment/removal with coherent feed and search projections
  - Durable 50-row scheduled deletion continuations with scope isolation and retry safety
  - Trusted tag host capabilities and framework-light list/management hooks
affects: [02-05, 02-10, phase-03]
tech-stack:
  added: []
  patterns:
    - Deletion marks taxonomy state non-public before bounded canonical/projection cleanup begins
    - Tag membership is canonical while feed and search rows remain bounded materialized projections
    - Tag mutation state is keyed by entity and action without optimistic taxonomy writes
key-files:
  created:
    - src/component/model/tags.ts
    - src/component/admin/tags.ts
    - src/component/jobs/tag_cleanup.ts
    - tests/component/tags.test.ts
    - tests/integration/tag-cleanup-backend.test.ts
    - tests/react/tags.test.tsx
    - scripts/test-tag-cleanup-backend.mjs
  modified:
    - src/component/schema.ts
    - src/client/contracts.ts
    - src/client/internal.ts
    - src/react/hooks/admin.ts
key-decisions:
  - "Use active, deleting, and deleted tag states so public DTOs and filters hide a tag atomically before resumable relation cleanup."
  - "Process at most 50 rows from one canonical/projection table per scheduled mutation, retaining a durable job guard until all three tables are empty."
  - "Version TagDto explicitly at contractVersion 1 and key headless mutation state by tag or post-tag action."
patterns-established:
  - "Tag deletion: hide taxonomy state, drain canonical memberships with activity, drain feed projections, drain search projections, then finalize."
  - "Tag authority: every host method resolves scope and admin permission afresh; membership and deletion also resolve the initiating actor."
requirements-completed:
  [ADMN-03, ADMN-04, ADMN-10, UI-01, UI-02, UI-03, QUAL-01]
coverage:
  - id: D1
    description: Admins create, rename, list, delete, assign, and remove stable scope-owned tags through narrow authorized intents.
    requirement: ADMN-03
    verification:
      - kind: integration
        ref: tests/component/tags.test.ts#scope-owned-tag-lifecycle
        status: pass
    human_judgment: false
  - id: D2
    description: Canonical tag memberships update public feedback DTOs and one-tag feed/search projections idempotently with a 20-tag ceiling.
    requirement: ADMN-04
    verification:
      - kind: integration
        ref: tests/component/tags.test.ts#creates-renames-assigns-removes-filters-and-records-activity
        status: pass
    human_judgment: false
  - id: D3
    description: Large deletion drains memberships, feed rows, and search rows in retry-safe 50-row continuations without crossing scope.
    requirement: QUAL-01
    verification:
      - kind: integration
        ref: tests/integration/tag-cleanup-backend.test.ts#tag-cleanup-continuation-contract
        status: pass
      - kind: e2e
        ref: node scripts/test-tag-cleanup-backend.mjs
        status: pass
    human_judgment: false
  - id: D4
    description: Framework-light tag hooks expose unsupported, loading, not-authorized, empty, ready, pending, error, and reset states without optimistic taxonomy authority.
    requirement: UI-01
    verification:
      - kind: unit
        ref: tests/react/tags.test.tsx#headless-tag-administration
        status: pass
      - kind: other
        ref: npm run typecheck && npm run lint
        status: pass
    human_judgment: false
  - id: D5
    description: The complete tag slice preserves generated component bindings, scope-leading indexes, package compilation, and the full regression suite.
    requirement: QUAL-01
    verification:
      - kind: e2e
        ref: npm run build && npm test
        status: pass
    human_judgment: false
duration: 15min
completed: 2026-07-16
status: complete
---

# Phase 2 Plan 4: Bounded Tag Administration Summary

**Stable scope-owned tags with coherent one-tag discovery, resumable 50-row deletion, and trusted headless management controls**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-16T22:42:03Z
- **Completed:** 2026-07-16T22:57:06Z
- **Tasks:** 3
- **Files modified:** 26

## Accomplishments

- Added normalized stable tags, a fixed 20-tag membership ceiling, idempotent assignment/removal, public DTO projection, and scope-complete one-tag feed/search behavior.
- Added an atomic deleting state plus durable scheduled jobs that drain canonical membership, feed, and search rows in 50-row batches, record removal activity, resume safely, and never touch another scope.
- Added versioned browser intent/result contracts, freshly authorized host methods, and `useTags`/`useTagManagement` with explicit async and per-action mutation state.
- Proved every cleanup boundary with the in-memory scheduler and verified the complete 51-row continuation plus two-scope isolation on a disposable real Convex backend.

## Task Commits

1. **Task 1: Specify tag lifecycle and bounded cleanup** - `5d35042` (test)
2. **Task 2: Implement canonical tag memberships and resumable deletion** - `a700cad` (feat)
3. **Task 3: Expose tag admin capabilities and hooks** - `3571cf6` (feat)
4. **Real-backend cleanup and scope proof** - `8896a88` (test)

## Files Created/Modified

- `src/component/model/tags.ts` - Tag normalization, scope guards, capacity checks, DTO mapping, and bounded projection builders.
- `src/component/admin/tags.ts` - Narrow list/create/rename/assign/remove/delete operations.
- `src/component/jobs/tag_cleanup.ts` - Durable 50-row scheduled cleanup continuation.
- `src/component/schema.ts` - Tag lifecycle, cleanup job, exact projection indexes, and activity tag metadata.
- `src/component/model/views.ts`, `src/component/public/feeds.ts`, and `src/component/public/search.ts` - Coherent active-tag visibility and projection consumption.
- `src/client/contracts.ts` and `src/client/internal.ts` - Versioned tag DTOs, authority-free intents, and freshly authorized host methods.
- `src/react/bindings.ts` and `src/react/hooks/admin.ts` - Injected tag references plus explicit list and keyed mutation states.
- `tests/component/tags.test.ts` - Lifecycle, authorization, cross-scope equivalence, idempotency, projection, activity, and ceiling coverage.
- `tests/integration/tag-cleanup-backend.test.ts` - Deterministic resume checks at every canonical/projection boundary.
- `scripts/test-tag-cleanup-backend.mjs` - Disposable real Convex scheduler and scope-isolation matrix.

## Decisions Made

- A tag remains as durable history in `deleted` state and is revived with the same stable ID if an admin recreates its normalized name. This preserves one indexed row per scoped normalized name.
- A large delete first changes the tag to `deleting`; all public tag lookups, DTOs, feeds, and search treat non-active tags as absent while the guarded cleanup drains stale rows privately.
- Each continuation touches only one relation family and at most 50 rows, leaving transaction headroom for activity, job progress, and the next atomic schedule.
- Tag DTOs carry `contractVersion: 1` even when nested in the Phase 2 feedback DTO, preserving the explicit versioning rule for new public contracts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Renamed the scheduled module to a Convex-valid path**

- **Found during:** Task 2 component code generation
- **Issue:** Convex rejects module path components containing hyphens, so the planned `jobs/tag-cleanup.ts` could not deploy or generate bindings.
- **Fix:** Used the semantically equivalent `jobs/tag_cleanup.ts` filename and regenerated component APIs through the real codegen path.
- **Files modified:** `src/component/jobs/tag_cleanup.ts`, generated component bindings, imports, and tests.
- **Verification:** `npm run codegen:component`, build, focused tests, and the disposable backend all pass.
- **Committed in:** `a700cad`

**2. [Rule 2 - Missing Critical] Hid partially cleaned tags across every public projection**

- **Found during:** Task 2 cleanup coherence review
- **Issue:** Draining canonical and materialized rows over multiple transactions could otherwise expose a partial tag state through feedback DTOs, feeds, or search.
- **Fix:** Added an explicit tag lifecycle and required `active` state in DTO projection, public tag filters, feeds, and search before cleanup begins.
- **Files modified:** `src/component/schema.ts`, `src/component/model/views.ts`, `src/component/public/feeds.ts`, `src/component/public/search.ts`.
- **Verification:** Component lifecycle tests plus the scheduler boundary matrix pass.
- **Committed in:** `a700cad`

**3. [Rule 3 - Blocking] Allowed bounded plain-text limits below the default**

- **Found during:** Task 2 typecheck
- **Issue:** TypeScript inferred the shared normalizer's default maximum as literal `160`, preventing the planned 60-character tag-name bound.
- **Fix:** Annotated both shared normalization maximum parameters as `number` without changing their defaults or runtime behavior.
- **Files modified:** `src/component/model/content.ts`.
- **Verification:** Typecheck, content regressions, and full tests pass.
- **Committed in:** `a700cad`

---

**Total deviations:** 3 auto-fixed (1 critical visibility invariant, 2 blocking platform/type seams)
**Impact on plan:** Every change was required for the planned bounded, scope-safe, deployable tag contract; no product scope was added.

## Issues Encountered

- Convex component filenames permit only alphanumeric characters, underscores, and periods. The invalid planned hyphenated filename was caught by the real component deployment rather than hidden by local TypeScript compilation.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - T-02-12 through T-02-15 are covered by fresh host authorization, scoped tag/entity guards, active-state public visibility, fixed relation ceilings, durable job state, 50-row transaction bounds, and retry-idempotent deletion.

## Next Phase Readiness

- Plan 02-05 can merge tag memberships and projections using stable IDs and the established canonical-membership pattern.
- Plan 02-10 can consolidate tag list and mutation states into the final unified headless vocabulary.
- Phase 3 copied interfaces can consume the same injected `useTags` and `useTagManagement` behavior without recreating authority or caching.

## Self-Check: PASSED

- All created files and regenerated component bindings exist.
- Commits `5d35042`, `a700cad`, `3571cf6`, and `8896a88` exist.
- Component, React, static schema, deterministic scheduler, disposable real backend, typecheck, lint, build, full regression, and packed-consumer gates pass.
- No task-owned TODO, placeholder, empty implementation, or known stub remains.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-16_
