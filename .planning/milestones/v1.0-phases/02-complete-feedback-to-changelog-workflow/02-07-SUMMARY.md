---
phase: 02-complete-feedback-to-changelog-workflow
plan: "07"
subsystem: changelog
tags: [convex, changelog, editorial, pagination, react-hooks]

requires:
  - phase: 02-03
    provides: Safe Markdown, moderation activity, and shared visibility policy
  - phase: 02-06
    provides: Status-derived roadmap and framework-light grouped pagination
provides:
  - Explicit draft, edit, link, publish, unpublish, and republish changelog lifecycle
  - Immutable first-publish slug and ordering with deterministic draft slug allocation
  - Scope-safe public changelog pagination and stable slug lookup with merge-aware visible links
  - Provider-neutral host clients and headless changelog feed, entry, and editor hooks
affects: [02-05-merge, 02-08-notifications, phase-3-copied-ui]

tech-stack:
  added: []
  patterns:
    - Immutable first-publication identity with reversible current publication state
    - Scope-owned editorial joins and once-per-entry-post notification guards
    - Server-truth editorial hooks with per-entry action state and duplicate guards

key-files:
  created:
    - src/component/model/changelog.ts
    - src/component/public/changelog.ts
    - src/component/admin/changelog.ts
    - src/react/hooks/changelog.ts
    - tests/model/changelog.test.ts
    - tests/component/changelog.test.ts
    - tests/react/changelog.test.tsx
  modified:
    - src/component/schema.ts
    - src/client/contracts.ts
    - src/client/internal.ts
    - src/react/bindings.ts
    - src/react/hooks/admin.ts
    - src/react/index.ts

key-decisions:
  - "Store firstPublishedAt separately from current publishedAt so unpublish and republish preserve the original URL and list position."
  - "Keep changelog-post relationships as ordered scope-owned join rows and resolve current canonical visibility only while projecting public DTOs."
  - "Use compact linked-post DTOs with ID, title, and status so the documented 50-entry by 50-link maximum remains below Convex transaction query limits."
  - "Persist notification guards before the notification fan-out slice so first publish and newly linked published posts have durable once-per-pair truth."

patterns-established:
  - "Editorial identity: draft slugs may change, while first publish freezes slug and firstPublishedAt forever."
  - "Public relationships: hidden posts disappear from entry DTOs without deleting the admin relationship, and merged sources resolve to their visible canonical target."
  - "Headless editorial actions: wait for server truth and expose keyed pending, error, reset, and duplicate-submit behavior without navigation or toast policy."

requirements-completed:
  [
    CHLG-01,
    CHLG-02,
    CHLG-03,
    CHLG-04,
    CHLG-05,
    CHLG-06,
    UI-01,
    UI-02,
    UI-03,
    QUAL-01,
  ]

coverage:
  - id: D1
    description: Admins create and edit safe-Markdown drafts with deterministic or explicit scope-unique slugs.
    requirement: CHLG-01
    verification:
      - kind: integration
        ref: tests/component/changelog.test.ts#manual changelog lifecycle
        status: pass
      - kind: unit
        ref: tests/model/changelog.test.ts#changelog editorial model
        status: pass
    human_judgment: false
  - id: D2
    description: Explicit idempotent publish, unpublish, and republish preserve immutable first-publication URL and ordering without status coupling.
    requirement: CHLG-02
    verification:
      - kind: integration
        ref: tests/component/changelog.test.ts#locks first-publish identity pages public entries and keeps publication status-orthogonal
        status: pass
    human_judgment: false
  - id: D3
    description: Ordered optional feedback links are scope-checked, visibility-safe, merge-aware, and guarded once per entry-post notification pair.
    requirement: CHLG-03
    verification:
      - kind: integration
        ref: tests/component/changelog.test.ts#manual changelog lifecycle
        status: pass
      - kind: other
        ref: tests/static/schema-scope.test.ts
        status: pass
    human_judgment: false
  - id: D4
    description: Visitors cursor-page only published entries and resolve stable public slugs with draft and unpublished entries not-found-equivalent.
    requirement: CHLG-04
    verification:
      - kind: integration
        ref: tests/component/changelog.test.ts#locks first-publish identity pages public entries and keeps publication status-orthogonal
        status: pass
    human_judgment: false
  - id: D5
    description: Trusted host wrappers and framework-light hooks expose public browse, stable lookup, and editorial mutation state without client authority flags.
    requirement: UI-01
    verification:
      - kind: integration
        ref: tests/react/changelog.test.tsx#headless changelog hooks
        status: pass
      - kind: integration
        ref: tests/component/changelog.test.ts#re-authorizes every editorial mutation in the trusted host wrapper
        status: pass
    human_judgment: false
  - id: D6
    description: Changelog invariants remain scope-complete, bounded, safe-content validated, and regression-compatible with roadmap and component behavior.
    requirement: QUAL-01
    verification:
      - kind: other
        ref: npm run test:component and npm run typecheck and npm run lint and npm run build
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-07-16
status: complete
---

# Phase 02 Plan 07: Manual Changelog Lifecycle Summary

**Scope-owned changelog drafts now publish to stable first-publication URLs, retain merge- and visibility-safe feedback links, and flow through provider-neutral host clients and headless React hooks.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-16T23:12:00Z
- **Completed:** 2026-07-16T23:25:01Z
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments

- Added an explicit draft/edit/link/publish/unpublish lifecycle with stable IDs, deterministic slug collision suffixes, immutable first-publish slugs and ordering, and safe Markdown validation.
- Added bounded public changelog pagination and stable slug lookup whose linked feedback projection shares current scope, canonical redirect, and visibility rules.
- Added fresh-authority host wrappers plus framework-light feed, entry, and editor hooks with unsupported/auth/loading/empty/error/pending/reset and duplicate-submit states.

## Task Commits

Each task was committed atomically:

1. **Task 1: Specify changelog editorial and public lifecycle** - `918fd50` (test)
2. **Task 2: Implement explicit changelog publication and link invariants** - `951aab6` (feat)
3. **Task 3: Expose changelog browse and editorial mutation hooks** - `a79512b` (feat)

## Files Created/Modified

- `src/component/model/changelog.ts` - Slug allocation, scoped entry/link loading, canonical link resolution, and DTO projection.
- `src/component/public/changelog.ts` - Published cursor feed and not-found-equivalent stable slug lookup.
- `src/component/admin/changelog.ts` - Narrow draft, edit, link, publish, and unpublish intents with activity and notification guards.
- `src/component/schema.ts` - Scope-owned entries, ordered links, and pair-deduplicated publication guards.
- `src/client/contracts.ts` - Branded changelog IDs, versioned DTOs, validators, capabilities, and closed error outcomes.
- `src/client/internal.ts` - Trusted scope/admin/actor derivation for every changelog operation.
- `src/react/hooks/changelog.ts` - Headless public feed/entry and server-truth editorial mutation state.
- `tests/model/changelog.test.ts` - Slug normalization and deterministic collision allocation.
- `tests/component/changelog.test.ts` - Two-scope editorial/public lifecycle, authority, visibility, activity, merge, and dedupe invariants.
- `tests/react/changelog.test.tsx` - Pagination/lookup states, optional bindings, auth state, and duplicate-submit behavior.

## Decisions Made

- Separated immutable `firstPublishedAt` from current `publishedAt`; republishing restores the original URL and sort position while current publication remains reversible.
- Kept link membership as ordered scope-owned rows. Public reads resolve current canonical targets and hide inaccessible links without destroying editorial relationships.
- Kept linked-post public DTOs compact enough that a maximum page with maximum links remains within Convex's bounded query budget.
- Materialized once-per-entry/post notification guards now; Plan 02-08 can fan out from durable canonical truth without reinterpreting publication history.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first activity assertion counted only initial publication, while the locked activity taxonomy also records a later republish transition. The assertion was corrected to distinguish repeat activity from once-only notification guards.
- Initial linked-post projection included a board lookup per relation, which could exceed the query-range ceiling at the documented 50-by-50 maximum. The stable linked DTO was reduced to the fields required by this slice: ID, title, and status.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-08 can consume durable changelog publication guards when implementing subscriptions and notification fan-out.
- Plan 02-05 can physically repoint and deduplicate `changelogPostLinks` and guard rows during merge while the current public projection already follows canonical visibility.
- Phase 3 copied interfaces can consume the stable feed, entry, and editor hooks without reimplementing authority or async state.

## Known Stubs

None.

## Self-Check: PASSED

- All declared created files exist.
- Commits `918fd50`, `951aab6`, and `a79512b` exist.
- Changelog, roadmap regression, component, static, typecheck, lint, and build gates pass.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-16_
