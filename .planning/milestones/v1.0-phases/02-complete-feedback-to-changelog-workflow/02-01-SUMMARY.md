---
phase: 02-complete-feedback-to-changelog-workflow
plan: "01"
subsystem: discovery-and-headless-react
tags: [convex, pagination, ranking, react, scope-isolation, tdd]
requires:
  - phase: 01-secure-installable-feedback-board
    provides: provider-neutral trusted host clients, scoped component pagination, canonical vote and comment counters, and versioned Phase 1 DTOs
provides:
  - scope-complete Newest, Top, and Trending feedback feeds with stable cursor order
  - indexed board, status, and one-tag feed filters with a shared visibility projection
  - provider-neutral React bindings, provider, and helper-backed feedback feed hook states
affects:
  [phase-02-search, phase-02-moderation, phase-03-copied-ui, phase-04-demo]
tech-stack:
  added: []
  patterns:
    - stored additive Trending score maintained in vote and comment transactions
    - v2 feedback DTO evolves discovery without widening the closed Phase 1 post DTO
    - convex-helpers React results remain the sole accumulated feed page source
key-files:
  created:
    - src/component/model/scoring.ts
    - src/component/model/visibility.ts
    - src/component/public/feeds.ts
    - src/react/provider.tsx
    - src/react/bindings.ts
    - src/react/hooks/feedback.ts
    - src/react/index.ts
    - tests/model/scoring.test.ts
    - tests/component/discovery.test.ts
    - tests/react/feedback.test.tsx
  modified:
    - src/component/schema.ts
    - src/component/validators.ts
    - src/component/model/views.ts
    - src/component/participation/posts.ts
    - src/component/participation/comments.ts
    - src/component/participation/votes.ts
    - src/client/contracts.ts
    - src/client/internal.ts
    - tsconfig.json
key-decisions:
  - "Introduce a contractVersion 2 feedback-page DTO while preserving the closed contractVersion 1 direct post and board-page contracts."
  - "Materialize one bounded postTagFeeds row per tag membership so tag feeds remain scope-first and rank-indexed without post-page filtering."
  - "Treat convex-helpers usePaginatedQuery results as canonical and serialize feed arguments through the helper instead of maintaining a second page cache."
patterns-established:
  - "Ranked feed keys: Newest uses createdAt and orderId; Top and Trending add their stored rank before the same stable tie breakers."
  - "Visibility projection: active, unarchived, non-merged posts alone receive the visible key consumed by every feed index."
requirements-completed:
  - DISC-01
  - DISC-02
  - DISC-03
  - DISC-05
  - UI-01
  - UI-02
  - UI-03
  - QUAL-01
coverage:
  - id: D1
    description: "Visitors can cursor-page visible feedback by deterministic Newest, Top, and stored additive Trending orders."
    requirement: DISC-01
    verification:
      - kind: integration
        ref: "tests/component/discovery.test.ts#pages Newest, Top, and Trending through the trusted scoped host client"
        status: pass
      - kind: unit
        ref: "tests/model/scoring.test.ts#ranked feedback scoring"
        status: pass
    human_judgment: false
  - id: D2
    description: "Board, six-status, and one-tag shapes are scope-leading indexed projections that uniformly exclude withdrawn, archived, merged-source, and cross-scope posts."
    requirement: DISC-05
    verification:
      - kind: integration
        ref: "tests/component/discovery.test.ts#serves board, status, and one-tag shapes without post-page filtering"
        status: pass
      - kind: unit
        ref: "tests/static/schema-scope.test.ts#scope-complete schema"
        status: pass
    human_judgment: false
  - id: D3
    description: "React consumers receive typed host-reference injection and loading, ready, empty, error, load-more, and loading-more feedback states without provider, router, toast, or design-system coupling."
    requirement: UI-02
    verification:
      - kind: unit
        ref: "tests/react/feedback.test.tsx#headless feedback feed"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D4
    description: "The Phase 1 release command remains green across direct reads, fixtures, real Convex pagination, and the clean packed consumer after the additive schema and contract work."
    requirement: QUAL-01
    verification:
      - kind: integration
        ref: "npm run test:phase1"
        status: pass
    human_judgment: false
duration: 12 min
completed: 2026-07-16
status: complete
---

# Phase 2 Plan 01: Ranked Feedback Discovery and Headless Feed Summary

**Afferent now serves scope-safe Newest, Top, and additive Trending feeds through trusted host capabilities and a provider-neutral React hook that delegates reactive page accumulation to Convex Helpers.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-16T21:34:52Z
- **Completed:** 2026-07-16T21:46:59Z
- **Tasks:** 3
- **Files modified:** 24

## Accomplishments

- Added stable stored rank fields, scope-leading installation/board/status indexes, and bounded one-tag projection indexes without using scans or post-page filtering.
- Centralized public visibility and additive score calculations, then recomputed rank projections in the same vote, comment, withdrawal, or post-creation transaction.
- Added a versioned v2 feedback page contract and trusted `listFeedback` host capability while preserving Phase 1's v1 direct-post and board-page DTOs.
- Added typed grouped React bindings, a provider-neutral auth adapter, and `useFeedbackFeed` with explicit helper-backed loading, ready, empty, error, and pagination states.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock ranked discovery as a failing end-to-end behavior contract** - `706f4c5` (test)
2. **Task 2: Implement indexed feed storage and component/host contracts** - `8b59494` (feat)
3. **Task 3: Expose the first framework-light provider and feedback feed hooks** - `2b42835` (feat)

## Files Created/Modified

- `src/component/schema.ts` - Adds optional migration-safe rank fields, fixed statuses, tags/joins, and every scope-leading ranked query index.
- `src/component/model/scoring.ts` - Freezes score constants, total-order comparators, and bounded transactional rank projection updates.
- `src/component/model/visibility.ts` - Defines the shared visible/hidden post key and not-found-equivalent visible-post guard.
- `src/component/public/feeds.ts` - Implements bounded helper pagination for installation, board, status, and one-tag Newest/Top/Trending shapes.
- `src/component/model/views.ts` and `src/component/validators.ts` - Project and validate the explicit v2 feedback DTO without exposing raw documents.
- `src/client/contracts.ts`, `src/client/internal.ts`, and `src/client/index.ts` - Add browser-intent-only feed filters and a trusted per-call scope/read-policy wrapper.
- `src/react/` - Supplies grouped bindings, provider/auth context, pure pagination-state mapping, and the domain feed hook.
- `tests/model/scoring.test.ts`, `tests/component/discovery.test.ts`, and `tests/react/feedback.test.tsx` - Cover formula/order, two-scope visibility/filter pagination, and headless async states.
- `tsconfig.json` - Includes strict TSX source and emits React-layer declarations without changing package dependencies.

## Decisions Made

- Used an explicit v2 feedback DTO for six-status and tag-rich discovery results, leaving Phase 1's closed v1 DTO contract intact.
- Stored `orderId` after insertion so every rank index finishes with an opaque-ID tie breaker rather than relying on implicit creation ordering.
- Kept new rank fields optional in the schema for additive Phase 1 document compatibility while all new writes populate the complete feed projection atomically.
- Kept public feedback reads active during auth loading; browser arguments carry only filters while the trusted host wrapper derives scope and authenticated-read state on every call.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test bug] Corrected the Trending fixture expectation to match the frozen formula**

- **Found during:** Task 2 focused component verification
- **Issue:** The RED fixture expected nine comments to outrank five votes, but the frozen constants make five vote weights larger.
- **Fix:** Preserved the required formula and corrected the expected Trending order.
- **Files modified:** `tests/component/discovery.test.ts`
- **Verification:** Model formula and component Trending order tests pass together.
- **Committed in:** `8b59494`

**2. [Rule 2 - Missing critical validation] Extended not-found equivalence to tag identifiers**

- **Found during:** Task 2 typecheck
- **Issue:** The existing structured not-found resource union did not admit the new scoped tag filter guard.
- **Fix:** Added `tag` to the closed resource union so malformed, nonexistent, and cross-scope tags follow one result path.
- **Files modified:** `src/component/model/errors.ts`
- **Verification:** Typecheck and two-scope discovery tests pass.
- **Committed in:** `8b59494`

**3. [Rule 3 - Blocking build configuration] Included TSX in the root declaration build**

- **Found during:** Task 3 typecheck
- **Issue:** The root TypeScript project included only `.ts` files and had no JSX mode, so the planned provider source could not enter the declaration build.
- **Fix:** Enabled `react-jsx`, included `.tsx`, and retained consumer/fixture-owned React declaration typing without changing package metadata.
- **Files modified:** `tsconfig.json`, `src/react/provider.tsx`
- **Verification:** React suite, root typecheck, lint, build, and the Phase 1 release gate pass.
- **Committed in:** `2b42835`

---

**Total deviations:** 3 auto-fixed (1 Rule 1, 1 Rule 2, 1 Rule 3). **Impact on plan:** Each fix was required to keep the frozen ranking contract correct, preserve tag privacy, or compile the planned React surface; no package, dependency, or product scope was added.

## Issues Encountered

None.

## User Setup Required

None - the feed and React layers add no service credentials or external configuration.

## Known Stubs

None - no TODO, FIXME, placeholder, unavailable data source, mock production result, or parallel empty page accumulator remains in the plan files.

## Verification

- Focused scoring, discovery, React, schema-scope, and static-contract matrix: 24 tests passed.
- `npm run typecheck` passed with the generated component bindings and TSX declaration surface.
- `npm run lint` passed.
- `npm run test:phase1` passed, including the clean build, three auth fixtures, conformance and scope matrices, component/static tests, real Convex pagination, and packed-artifact gate.

## Next Phase Readiness

Plan 02-02 can build bounded relevance-only search and compose-time similarity on the shared visibility keys, v2 DTO discipline, scope-first schema, and trusted host capability pattern. No Plan 02-01 blocker remains.

## Self-Check: PASSED

- All ten newly created implementation and test files exist.
- Task commits `706f4c5`, `8b59494`, and `2b42835` exist in history in RED-to-GREEN order.
- The coverage classifier accepted all four deliverables and classified each as automatically proven by passing evidence.
- Stub and threat-surface scans found no unplanned production stub or trust boundary beyond the plan's feed, host-wrapper, and React binding threat model.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-16_
