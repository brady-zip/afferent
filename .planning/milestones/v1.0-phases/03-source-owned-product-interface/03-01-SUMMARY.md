---
phase: 03-source-owned-product-interface
plan: "01"
subsystem: source-owned-ui-registry
tags: [shadcn, registry, react, vite, accessibility, packed-consumer]

requires:
  - phase: 02-14
    provides: Atomic, generation-fenced headless feedback feed state over trusted host bindings
provides:
  - One canonical UI core and public board source tree over afferent/react.js
  - Deterministic shadcn item generation and byte-equal repository mirrors
  - Packed tarball plus emitted-local-item install, typecheck, and Vite build acceptance
  - Exact Phase 3 authoring dependency closure committed from TypeScript 6
affects:
  [
    03-02-public-feedback-ui,
    03-05-registry-completion,
    03-06-release-evidence,
    phase-4-demo,
  ]

tech-stack:
  added:
    - class-variance-authority 0.7.1
    - clsx 2.1.1
    - tailwind-merge 3.6.0
    - lucide-react 1.20.0
    - radix-ui 1.6.0
    - shadcn 4.11.0
    - tailwindcss 4.3.0
    - "@tailwindcss/vite 4.3.0"
    - "@playwright/test 1.59.1"
    - "@axe-core/playwright 4.11.0"
  patterns:
    - Canonical copied source emits schema-validated registry JSON and byte-equal mirrors
    - Copied screens consume only afferent/react.js and injected UI/navigation adapters
    - Generated sibling items use explicit relative JSON addresses and exact consumer pins

key-files:
  created:
    - ui/afferent/board/board-screen.tsx
    - ui/afferent/core/afferent-ui-provider.tsx
    - ui/afferent/core/copy.ts
    - ui/afferent/registry.ts
    - scripts/generate-ui-artifacts.mjs
    - registry/r/afferent-board.json
    - tests/integration/registry-ui.test.mjs
  modified:
    - package.json
    - package-lock.json
    - fixtures/registry-vite/src/App.tsx

key-decisions:
  - "Keep the five copied-source runtime packages in registry metadata and all ten approved packages in root devDependencies; do not widen the afferent runtime or peer surface."
  - "Preserve explicit ./afferent-ui-core.json metadata and place emitted sibling JSON files together in the disposable consumer because shadcn 4.11.0 resolves relative local dependencies from its cwd."
  - "Restore TypeScript 7.0.2 only after the TypeScript 6 dependency/product commit and leave the regenerated two-file experiment unstaged."

requirements-completed: [UI-04, UI-06, UI-07, QUAL-04]

coverage:
  - id: D1
    description: A clean consumer installs the packed Afferent tarball and emitted board item with the pinned local shadcn CLI, then typechecks and builds.
    requirement: QUAL-04
    verification:
      - kind: e2e
        ref: tests/integration/registry-ui.test.mjs#packed-local-shadcn-consumer
        status: pass
    human_judgment: false
  - id: D2
    description: One canonical core and board source deterministically emits schema-valid items, a stable hash manifest, and byte-equal repository examples.
    requirement: UI-06, UI-07
    verification:
      - kind: integration
        ref: tests/integration/ui-artifacts.test.mjs#canonical-generation-and-mirror
        status: pass
      - kind: other
        ref: npm run ui:check
        status: pass
    human_judgment: false
  - id: D3
    description: The copied board screen renders the closed feedback feed vocabulary with real hrefs, accessible state regions, and no direct backend/router/auth dependency.
    requirement: UI-04
    verification:
      - kind: integration
        ref: tests/integration/ui-artifacts.test.mjs#deterministic-board-state-contract
        status: pass
      - kind: e2e
        ref: fixtures/registry-vite/src/App.tsx#controlled-real-hook-provider
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-07-17
status: complete
---

# Phase 03 Plan 01: Canonical Registry Board Slice Summary

**A packed Afferent consumer can now install a real source-owned board through deterministic emitted shadcn JSON, render the actual feedback hook contract, and typecheck/build without repository-relative shortcuts.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-17T21:21:38Z
- **Completed:** 2026-07-17T21:34:58Z
- **Tasks:** 3
- **Files modified:** 35

## Accomplishments

- Added the canonical UI provider, complete English copy seam, injectable lucide slots, native navigation adapter, semantic state regions, shadcn-token stylesheet, and first exhaustive board feed screen.
- Added one stable registry catalog that drives pinned shadcn item generation, a SHA-256 manifest, and byte-identical repository examples with no timestamps or hand-edited generated authority.
- Added a disposable Vite fixture that installs the packed package and emitted sibling items through the repository-local shadcn binary, renders `AfferentBoardScreen` through an actual `AfferentProvider` watch client, then typechecks and builds.
- Committed the approved ten-package authoring/evidence matrix from TypeScript 6 without changing Afferent runtime or peer dependencies, then restored the user's TypeScript 7 experiment unstaged.

## Task Commits

1. **Task 1 RED: Lock the packed registry happy path** - `1789208` (test)
2. **Task 2 GREEN: Ship the canonical registry board slice** - `e586648` (feat)
3. **Task 3 RED: Close deterministic board state expectations** - `57d21b4` (test)
4. **Task 3 GREEN: Implement exhaustive retryable states** - `26abd14` (feat)
5. **Verification correction: Satisfy the project lint profile** - `ac8aeaf` (fix)
6. **Acceptance correction: Exercise the actual hook provider** - `54bdce9` (test)
7. **Clean-room correction: Install the declared Convex peer** - `2ac6aff` (fix)

## Decisions Made

- Kept copied-source UI libraries out of `dependencies` and `peerDependencies`; registry metadata installs exactly CVA, clsx, tailwind-merge, lucide-react, and radix-ui into adopters.
- Kept `./afferent-ui-core.json` as the emitted dependency contract. The acceptance fixture copies both emitted JSON siblings into the same disposable consumer cwd before invoking shadcn 4.11.0, matching that CLI's actual relative-resolution behavior.
- Used a controlled `AfferentProvider` watch client in the clean fixture so the installed board exercises `useFeedbackFeed` and its ready page rather than bypassing the hook with a presentation-only prop.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Matched shadcn 4.11.0 local sibling resolution**

- **Found during:** Task 2 real local registry install
- **Issue:** The CLI resolves `./afferent-ui-core.json` from the consumer cwd rather than the parent item URL/path, so an HTTP-served board item stopped at registry checking.
- **Fix:** Preserved the required emitted relative address and copied the two emitted item JSON siblings into the disposable consumer root before the pinned local CLI invocation.
- **Files modified:** `tests/integration/registry-ui.test.mjs`
- **Verification:** The packed/local shadcn install, consumer typecheck, and Vite build pass.
- **Commit:** `e586648`

**2. [Rule 3 - Blocking] Completed the clean Tailwind v4 fixture tool placement**

- **Found during:** Task 2 consumer typecheck
- **Issue:** The fixture imported `@tailwindcss/vite` but did not own the two exact Tailwind tool dependencies.
- **Fix:** Added `tailwindcss@4.3.0` and `@tailwindcss/vite@4.3.0` to the fixture devDependencies; neither appears in registry runtime metadata.
- **Files modified:** `fixtures/registry-vite/package.json`
- **Verification:** Clean install, typecheck, and build pass.
- **Commit:** `e586648`

**3. [Rule 1 - Bug] Corrected strict TypeScript and lint failures**

- **Found during:** Task 2 and final verification
- **Issue:** The initial fixture used deprecated `baseUrl`, the error union read a non-universal `message`, and the copied exhaustive switch/test expressions violated the project lint profile.
- **Fix:** Removed `baseUrl`, narrowed the error union, braced switch cases, and simplified test expressions.
- **Files modified:** `fixtures/registry-vite/tsconfig.json`, `ui/afferent/board/board-screen.tsx`, `tests/integration/ui-artifacts.test.mjs`
- **Verification:** Build, typecheck, lint, registry tests, static tests, and React tests pass.
- **Commits:** `e586648`, `ac8aeaf`

**4. [Rule 2 - Missing Critical] Proved the happy path through the actual headless hook**

- **Found during:** Final acceptance audit
- **Issue:** The first clean fixture compiled an injected presentation state, which did not prove the installed screen consumed the real Phase 2 hook contract.
- **Fix:** Wrapped `AfferentBoardScreen` in the packed `AfferentProvider` with a controlled watch client that returns the ready feedback page.
- **Files modified:** `fixtures/registry-vite/src/App.tsx`, `tests/integration/registry-ui.test.mjs`
- **Verification:** The clean installed consumer typechecks and builds while static assertions require the actual provider, screen, and watch path.
- **Commit:** `54bdce9`

**5. [Rule 1 - Bug] Installed the packed package's declared Convex peer in the clean fixture**

- **Found during:** Final aggregate Phase 3 rerun
- **Issue:** A subsequent shadcn dependency installation could prune the peer auto-installed with the packed tarball, leaving Vite unable to resolve `convex/react` from the packed React export graph.
- **Fix:** Declared exact `convex@1.42.2` in the clean consumer fixture and asserted the fixture keeps that supported peer explicit.
- **Files modified:** `fixtures/registry-vite/package.json`, `tests/integration/registry-ui.test.mjs`
- **Verification:** `npm run test:phase3` passes 6/6 after a complete clean pack/install/shadcn/typecheck/build cycle.
- **Commit:** `2ac6aff`

**Total deviations:** 5 auto-fixed (2 Rule 1, 1 Rule 2, 2 Rule 3). **Impact:** All fixes make the planned installation and headless-integration proof exact without changing backend, public DTO, package runtime, or product scope.

## Known Stubs

- `ui/afferent/board/board-screen.tsx` — The visible `Create feedback` control is the intentional Plan 03-01 board skeleton boundary and is not yet wired to composition mutations; Plan 03-02 owns the complete composer, similar-feedback, participation, and detail journey.

## Threat Review

- The registry-to-consumer executable-source boundary is covered by exact pins, `--ignore-scripts` package installation, shadcn schema build, deterministic hashes, clean temporary installation, and source import audits.
- No new backend endpoint, auth path, schema, identity prop, scope prop, or component authority surface was introduced.

## Verification

- `npm run ui:generate` and a second `npm run ui:check` — pass with no generated drift.
- `node --test tests/integration/registry-ui.test.mjs tests/integration/ui-artifacts.test.mjs` — 6/6 pass, including packed/local shadcn install, consumer typecheck, and Vite build.
- `npm run build`, `npm run typecheck`, `npm run lint` — pass.
- `npm run test:static` — 21/21 pass.
- `npm run test:react` — 43/43 pass.
- Codebase drift gate — skipped cleanly because this repository has no `.planning/codebase/STRUCTURE.md` map.
- Dirty package audit — exactly `package.json` and `package-lock.json`; manifest change is only TypeScript 6.0.3 to 7.0.2 and lock changes are only the TypeScript/native-platform closure.

## Issues Encountered

None remain.

## User Setup Required

None.

## Next Phase Readiness

- Plan 03-02 can split the installable board skeleton into complete discovery, composer, detail, participation, discussion, and activity primitives while retaining the now-proven registry path.
- The intentional `Create feedback` skeleton control must be wired by Plan 03-02 before the public board workflow is considered complete.

## Self-Check: PASSED

- All declared canonical, generated, fixture, and test artifacts exist.
- Commits `1789208`, `e586648`, `57d21b4`, `26abd14`, `ac8aeaf`, `54bdce9`, and `2ac6aff` resolve.
- Structured coverage classification reports 3/3 deliverables automatically covered with passing evidence.
