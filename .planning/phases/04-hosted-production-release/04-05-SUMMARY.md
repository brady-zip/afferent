---
phase: 04-hosted-production-release
plan: "05"
subsystem: hosted-demo-consumer
tags: [vite, react-router, convex-auth, shadcn, provenance]
requires:
  - phase: 04-01
    provides: release-shaped package build and packed-artifact verification
  - phase: 03
    provides: headless React bindings and source-owned canonical product UI
  - phase: 04-04
    provides: private sandbox lifecycle, reset, expiry, and safe quota contracts
provides:
  - clean disposable Vite consumer installed from the exact npm tarball and generated registry bytes
  - one responsive hosted shell separating immutable showcase and authenticated private sandbox routes
  - closed lifecycle, reset confirmation, expiry, quota, and recovery presentation without browser authority inputs
  - digest-backed aggregate gate proving candidate typecheck, build, and installed-source host tests
affects:
  [
    04-06-browser-evidence,
    04-07-deployment,
    04-08-release-candidate,
    04-09-production-release,
  ]
tech-stack:
  added:
    - react-router@8.3.0
  patterns:
    - release-shaped disposable consumer with tarball, registry, example, build, and test digests
    - environment and lifecycle epoch keyed provider boundaries
    - candidate-installed module aliases for provenance-sensitive component tests
key-files:
  created:
    - scripts/prepare-demo-consumer.mjs
    - example/src/App.tsx
    - example/src/router.tsx
    - example/src/bindings.ts
    - example/src/components/host/AppShell.tsx
    - example/src/components/host/SandboxLifecycle.tsx
    - example/src/components/host/ResetSandboxDialog.tsx
    - tests/integration/demo-artifacts.test.mjs
    - tests/ui/hosted-shell.test.tsx
  modified:
    - example/convex/showcase.ts
    - example/vite.config.ts
    - example/tsconfig.json
    - vitest.config.ts
    - vitest.react.config.ts
    - package.json
key-decisions:
  - "Expose separate typed showcase and sandbox binding maps; the showcase map has no participation, notification, or admin mutation references."
  - "Remount the complete provider and product subtree on environment, authenticated-session epoch, and lifecycle cache epoch changes."
  - "Run provenance-sensitive UI tests with Afferent headless code and canonical UI resolved from the prepared candidate, while sharing that candidate's React runtime."
  - "Pin react-router 8.3.0 exactly and synthesize the packed manifest from committed package metadata so the unrelated TypeScript 7 experiment cannot enter release artifacts."
requirements-completed: [DEMO-01, DEMO-02, DEMO-03, DEMO-06, DEMO-07]
coverage:
  - id: D1
    description: "The hosted app installs and resolves only the exact packed package and generated registry artifacts, rejecting example imports into repository src/, ui/, and examples/ui/ roots."
    requirement: DEMO-01
    verification:
      - kind: integration
        ref: "tests/integration/demo-artifacts.test.mjs"
        status: pass
      - kind: aggregate
        ref: "npm run verify:demo:artifacts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Anonymous visitors open an explicitly immutable showcase with representative feedback, detail, roadmap, and changelog routes."
    requirement: DEMO-02
    verification:
      - kind: component
        ref: "tests/ui/hosted-shell.test.tsx#opens on an explicitly immutable read-only showcase"
        status: pass
    human_judgment: false
  - id: D3
    description: "Verified authentication opens one private sandbox with public, notification, and complete administrative route families."
    requirement: DEMO-03
    verification:
      - kind: component
        ref: "tests/ui/hosted-shell.test.tsx#ready sandbox exposes every public and administrative route family"
        status: pass
    human_judgment: false
  - id: D4
    description: "Lifecycle fencing, destructive reset, expiry, quota, responsive, and keyboard contracts fail closed without internal identifiers."
    requirement: DEMO-06
    verification:
      - kind: component
        ref: "tests/ui/hosted-shell.test.tsx"
        status: pass
    human_judgment: false
duration: 37 min
completed: 2026-07-27
status: complete
---

# Phase 4 Plan 05: Hosted Production Demo Consumer Summary

**A release-shaped Vite evaluator now proves the exact packed Afferent package and generated registry UI through one immutable showcase, one authenticated private sandbox, and a digest-backed installed-consumer gate.**

## Performance

- **Duration:** 37 min
- **Started:** 2026-07-27T21:57:16Z
- **Completed:** 2026-07-27T22:33:56Z
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments

- Added a disposable `.demo-candidate` preparation path that builds once, packs once, installs the exact tarball, installs deterministic registry output, rejects repository-source resolution, and records package/registry/example/UI digests.
- Built one responsive host shell with explicit showcase and sandbox navigation, coherent release/source identity, stable landmarks, Convex Auth controls, and all canonical public, notification, and administrative screens.
- Added lifecycle fencing that unmounts sandbox data before reset, sign-out, expiry recovery, or environment changes, plus accessible reset confirmation and safe quota recovery.
- Added `verify:demo:artifacts`, which freshly prepares the candidate, typechecks, builds, runs 15 host-shell tests against candidate-installed package/UI roots, and fails on missing stages or digest evidence.

## Task Commits

1. **Task 1 RED: artifact provenance contract** — `d153edd`
2. **Task 1 GREEN: release-shaped demo consumer** — `52f0e70`
3. **Task 2 RED: hosted shell lifecycle contract** — `d4a2d75`
4. **Task 2 GREEN: showcase and private sandbox shell** — `d187fcf`
5. **Task 3 RED: installed aggregate gate contract** — `e544c37`
6. **Task 3 GREEN: installed hosted demo gate** — `92a5a60`
7. **Follow-up: all forbidden import-origin boundaries** — `b5d9561`

## Decisions Made

- Showcase immutability is enforced by its binding shape: public reads, roadmap reads, and changelog reads only. The browser receives no showcase participation or admin references.
- The provider subtree is keyed by host-only environment and safe epochs. Reset and sign-out advance the cache epoch before server work so previous sandbox content cannot flash.
- Candidate-sensitive Vitest resolution points Afferent, the registry UI, React, Router, Convex React, Radix, and Lucide at one candidate dependency graph; standalone development tests retain repository aliases.
- The aggregate provenance manifest records `prepare`, `typecheck`, `build`, and `host-tests` plus six SHA-256 values, including exact build output and host-test source.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking verification configuration] Included the integration provenance test in the default Vitest gate**

- **Found during:** Task 1 RED
- **Issue:** The repository's default Vitest configuration excluded `tests/integration/**`, so the named focused command reported no tests.
- **Fix:** Added only `tests/integration/demo-artifacts.test.mjs` to the default include list.
- **Verification:** `npm exec -- vitest run tests/integration/demo-artifacts.test.mjs`
- **Committed in:** `d153edd`

**2. [Rule 2 - Missing critical showcase reads] Added narrow read-only wrappers for complete showcase routes**

- **Found during:** Task 2
- **Issue:** Post detail/comments and changelog detail routes had no showcase host references even though the plan required complete anonymous representative journeys.
- **Fix:** Added validated `resolvePost`, `listComments`, and `getPublishedChangelogBySlug` queries without adding any showcase write or admin surface.
- **Verification:** Candidate typecheck/build and `tests/ui/hosted-shell.test.tsx`
- **Committed in:** `d187fcf`

**3. [Rule 2 - Missing critical provenance isolation] Made installed-source UI tests use one candidate runtime graph**

- **Found during:** Task 3 aggregate verification
- **Issue:** Repository aliases could hide installed-artifact defects, while mixing root and candidate React copies caused invalid-hook failures.
- **Fix:** Added fail-closed candidate aliases for the installed Afferent package, registry UI, and their shared React-dependent runtime modules whenever provenance mode is required.
- **Verification:** `npm run verify:demo:artifacts`
- **Committed in:** `92a5a60`

**Total deviations:** 3 auto-fixed (one blocking test configuration, two missing correctness/provenance requirements). **Impact:** Each change closes a declared verification or showcase-completeness requirement without adding a new product domain or authority path.

## Test Results

- `npm run verify:demo:artifacts` — passed: clean preparation, candidate typecheck, Vite production build, 15 candidate-installed host-shell tests, and complete digest evidence.
- `npm exec -- vitest run tests/integration/demo-artifacts.test.mjs` — passed: 6 artifact/provenance tests, including real-file resolutions into each forbidden `src/`, `ui/`, and `examples/ui/` root.
- `node scripts/prepare-demo-consumer.mjs --verify` — passed after the focused import-origin follow-up.
- `npm exec -- vitest run --config vitest.react.config.ts tests/ui/hosted-shell.test.tsx` — passed: 15 shell, lifecycle, quota, responsive, keyboard, reset, authority, and provenance tests.
- Focused Oxlint and Prettier checks across hosted source, preparation, bindings, and tests — passed.

## Known Stubs

None. The committed example has no second product UI tree, mock product data source, placeholder route, or empty UI-bound collection.

## User Setup Required

None for this plan's deterministic local gate. A real `VITE_CONVEX_URL` and immutable source commit are fail-closed runtime inputs handled by the later deployment/release plans.

## Next Phase Readiness

- Plan 04-06 can drive real-browser showcase, authentication, complete sandbox, reset, expiry, quota, accessibility, and cross-user isolation journeys against this single candidate-built app.
- The candidate provenance manifest exposes exact package, registry, example, installed UI, build, and host-test digests for later release coherence checks.
- The user's TypeScript 7 and package-lock experiment remains unstaged and was not absorbed into any release artifact or commit.

## Self-Check: PASSED

- All 20 plan files, six RED/GREEN commits, and the import-origin follow-up commit exist.
- Every declared task verification and the final aggregate installed-consumer gate pass.
- The final candidate records source commit `92a5a60d54fc0a42721b9746c00e16334fe1d208` with complete four-stage evidence.
- Unrelated TypeScript 7, package-lock, Codex/Claude hook, npm, debug, and Playwright files remain unstaged.

---

_Phase: 04-hosted-production-release_
_Completed: 2026-07-27_
