---
phase: 03-source-owned-product-interface
plan: "02"
subsystem: public-feedback-ui
tags: [react, shadcn, accessibility, responsive, registry, headless-hooks]

requires:
  - phase: 03-01
    provides: Canonical copied-source registry pipeline and installable board skeleton
  - phase: 02.1-01
    provides: Server-derived viewer capability flags and generation-fenced actor state
provides:
  - Complete public feedback discovery, creation, detail, participation, discussion, and activity UI
  - Exhaustive mounted coverage for public feedback states, mutations, canonical redirects, and account changes
  - CSS-only phone, tablet, and desktop composition with stable DOM and keyboard order
  - Deterministic registry and byte-equal example mirrors for the complete board item
affects:
  [03-03-public-surfaces, 03-05-registry-completion, 03-06-release-evidence]

tech-stack:
  added: []
  patterns:
    - Copied UI renders closed headless hook unions exhaustively and owns browser intent only
    - Server-derived viewer capability fields control action presentation
    - Flat comment DTO order remains authoritative while parent IDs add presentation context only
    - Mobile-first CSS adds layout at 640px, 768px, and 1024px without viewport reads

key-files:
  created:
    - ui/afferent/board/feedback-card.tsx
    - ui/afferent/board/feedback-composer.tsx
    - ui/afferent/board/post-detail.tsx
    - ui/afferent/board/discussion.tsx
    - ui/afferent/board/activity.tsx
    - tests/ui/harness.tsx
  modified:
    - ui/afferent/board/board-screen.tsx
    - ui/afferent/afferent.css
    - ui/afferent/registry.ts
    - tests/ui/board.test.tsx

key-decisions:
  - "Keep search, filter, sort, form, edit, reply, and confirmation values as local browser intent while all results, pending state, errors, capabilities, and optimism remain hook-owned."
  - "Preserve exact flat comment order from useComments; parentCommentId adds indentation and reply context but never creates a second UI tree or cache."
  - "Use server viewerCanEdit, viewerCanWithdraw, and viewerHasVoted fields as presentation truth and retain trusted host mutations as the authority boundary."
  - "Keep one semantic result-then-detail DOM order at every width and add only CSS grid composition at wider breakpoints."

requirements-completed: [UI-04]
requirements-progressed: [QUAL-07, QUAL-08]

coverage:
  - id: D1
    description: Visitors can discover and deep-link feedback through labelled controls, native post hrefs, pagination, exhaustive feed/search states, and canonical merged links.
    requirement: UI-04
    verification:
      - kind: integration
        ref: tests/ui/board.test.tsx#discovery-and-closed-states
        status: pass
      - kind: e2e
        ref: tests/integration/registry-ui.test.mjs#packed-local-shadcn-consumer
        status: pass
    human_judgment: false
  - id: D2
    description: Authenticated users can create, edit, withdraw, vote, subscribe, comment, and reply through headless hook state and server capability truth.
    requirement: UI-04
    verification:
      - kind: integration
        ref: tests/ui/board.test.tsx#creation-participation-and-account-generation
        status: pass
    human_judgment: false
  - id: D3
    description: Public feedback composition preserves semantic DOM order and focus while CSS supplies phone-first, tablet, desktop, reduced-motion, and forced-color behavior.
    requirement: QUAL-07, QUAL-08
    verification:
      - kind: integration
        ref: tests/ui/board.test.tsx#focus-dom-and-responsive-source-contract
        status: pass
      - kind: other
        ref: ui/afferent/afferent.css
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-21
status: complete
---

# Phase 03 Plan 02: Public Feedback Lifecycle Summary

**The installable board now covers the complete public feedback lifecycle—from discovery and creation through deep-linked participation and flat discussion—using only the trusted headless contract.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-21T18:22:13Z
- **Completed:** 2026-07-21T18:37:13Z
- **Tasks:** 3
- **Files modified:** 32

## Accomplishments

- Added labelled board/search/status/sort controls, result cards, paging, a feedback composer, and similar-feedback guidance over the existing feed, search, similar, and mutation hooks.
- Added exhaustive deep-linked detail states, real canonical merged links, vote/subscription controls, server-gated edit and withdraw flows, focus restoration, flat comments/replies, and activity rendering.
- Kept user-authored content as React text, kept all authority and direct Convex access out of copied source, and rendered actor-sensitive presentation only from generation-fenced hook truth.
- Regenerated the complete board/core registry items and byte-identical examples, then proved the packed package and emitted board item typecheck and build in a clean Vite consumer.
- Added mobile-first responsive CSS and executable assertions for stable result-before-detail DOM order, 640/768/1024 composition, reduced motion, and focus preservation.

## Task Commits

1. **Task 1 RED: Specify the public feedback journey** - `851d96a` (test)
2. **Task 2 GREEN: Ship feedback discovery and creation** - `0b0b565` (feat)
3. **Task 3 GREEN: Complete the public feedback lifecycle** - `5aa64a3` (feat)
4. **Verification: Lock responsive feedback composition** - `43a7408` (test)

## Decisions Made

- Local React state represents browser intent only. Hook states remain the sole source for loaded data, mutation pending/errors, generation fencing, subscription truth, and optimistic vote presentation.
- Replies remain flat and ordered exactly as `useComments` emits them. `parentCommentId` is used only for accessible reply context and visual indentation.
- The copied UI shows edit, withdraw, and vote behavior from server-derived capability fields and still delegates every authorization decision to trusted host wrappers.
- The phone layout is the baseline; tablet and desktop use CSS-only enhancement without moving DOM nodes or reading viewport globals during render.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Included mounted UI tests in the React Vitest project**

- **Found during:** Task 1 RED gate
- **Issue:** The existing React test project included only `tests/react`, so the planned `tests/ui/board.test.tsx` command exited without collecting the new oracle; canonical copied-source imports also needed explicit local aliases.
- **Fix:** Narrowly included `tests/ui/**/*.test.tsx` and mapped the generated consumer aliases to canonical UI/headless sources.
- **Files modified:** `vitest.react.config.ts`
- **Verification:** The planned mounted board command runs and passes 7/7 tests.
- **Commit:** `851d96a`

**2. [Rule 3 - Blocking] Registered every extracted board primitive for deterministic emission**

- **Found during:** Task 3 registry generation
- **Issue:** The plan required generated copies for seven new board modules but did not list the canonical registry catalog that declares an item's source closure.
- **Fix:** Added all board primitives to the existing `afferent-board` catalog entry and regenerated the catalogs, item JSON, manifest, and mirrors.
- **Files modified:** `ui/afferent/registry.ts`, `registry/**`, `examples/ui/afferent/**`
- **Verification:** `npm run ui:check` and the byte-equality registry integration test pass.
- **Commit:** `5aa64a3`

**3. [Rule 1 - Bug] Closed clean-consumer TypeScript union and inference failures**

- **Found during:** Task 3 packed consumer gate
- **Issue:** The extracted components required children for title-only states, read a non-universal error message, inferred the first board ID too narrowly, and asserted the activity union at the wrong discriminant.
- **Fix:** Made state-region children optional, added total public-error text handling, typed selected board state explicitly, and exhausted the activity status discriminant.
- **Files modified:** `ui/afferent/core/state-region.tsx`, `ui/afferent/board/board-screen.tsx`, `ui/afferent/board/activity.tsx`, generated mirrors
- **Verification:** The packed package plus emitted local board item typecheck and build in a clean consumer.
- **Commit:** `5aa64a3`

**4. [Rule 1 - Bug] Updated the registry source invariant after component extraction**

- **Found during:** Task 3 registry integration gate
- **Issue:** The pre-existing assertion expected post href construction inside `board-screen.tsx`, although the planned split correctly moved it to `feedback-card.tsx`.
- **Fix:** Kept the component boundary and made the invariant inspect the composed screen/card source.
- **Files modified:** `tests/integration/ui-artifacts.test.mjs`
- **Verification:** All 6 registry integration tests pass.
- **Commit:** `5aa64a3`

**Total deviations:** 4 auto-fixed (2 Rule 1, 2 Rule 3). **Impact:** The fixes make the specified mounted and clean-install gates executable without widening product scope, backend contracts, public DTOs, package dependencies, or authority surfaces.

## Known Stubs

None.

## Threat Review

- User-authored post and comment content is rendered as React text only; copied board source contains no `dangerouslySetInnerHTML`, direct Convex import/read, executable router dependency, viewport read, or browser authority field.
- Visible participation controls reflect only server-derived viewer flags and generation-fenced hook state. Trusted host wrappers remain the authorization boundary on every mutation.
- Pagination/search bounds and flat comment ordering remain hook-owned, avoiding UI-side caches, trees, or unbounded reads.

## Verification

- `npm exec -- vitest run --config vitest.react.config.ts tests/ui/board.test.tsx` — 7/7 pass.
- `npm run test:phase3` — pass, including deterministic generation, no registry/example drift, 6/6 integration tests, packed install, clean-consumer typecheck, and Vite build.
- `npm run typecheck` and `npm run lint` — pass.
- Copied-source trust scan for raw HTML, direct Convex reads, viewport branching, authority props, and toast state — no findings.
- Unrelated package/Codex experiment fingerprint — unchanged at `09b5f7179dc749a197ec6a59c5ba188313b8c84536e0c35b6487ae7fcb058381`.

## Issues Encountered

None remain.

## User Setup Required

None.

## Next Phase Readiness

- Plan 03-03 can build the roadmap, changelog, and notification public surfaces over the same canonical registry, headless-state, and responsive composition patterns.
- QUAL-07/08 component-level public feedback coverage is in place; final real-browser accessibility, zoom, and reflow evidence remains assigned to Plan 03-06.

## Self-Check: PASSED

- All declared canonical, generated, and mounted-test artifacts exist.
- Commits `851d96a`, `0b0b565`, `5aa64a3`, and `43a7408` resolve.
- Structured coverage classifies all 3 deliverables with passing automated evidence.
