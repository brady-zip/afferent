---
phase: 04-hosted-production-release
plan: "01"
subsystem: package-release
tags: [npm, convex-test, tarball, publint, attw, provenance]
requires:
  - phase: 01-secure-installable-feedback-board
    provides: packed external consumer, explicit public exports, and clean Convex codegen/typecheck/build proof
provides:
  - compiled and declared afferent/test export that registers Afferent and its rate-limiter child from installed JavaScript
  - one fail-closed package release-candidate verifier over a single packed tarball
  - current npm-name and trusted-publishing runtime preflight
affects: [04-05-hosted-candidate, 04-07-documentation, 04-08-release-automation]
tech-stack:
  added: []
  patterns:
    - validate every runtime and declaration export against the exact packed file list
    - pass one tarball through clean consumer, publint, and ATTW checks
    - separate deterministic offline artifact verification from explicit online identity checks
key-files:
  created:
    - scripts/verify-package-release.mjs
    - tests/integration/release-package.test.mjs
  modified:
    - src/test.ts
    - package.json
    - scripts/test-packed-consumer.mjs
    - tests/integration/packed-artifact.test.mjs
key-decisions:
  - "Publish afferent/test only as dist/test.js plus dist/test.d.ts and exclude raw src from the npm files allowlist."
  - "Resolve test component modules from installed package directories because externalized package JavaScript cannot execute an untransformed import.meta.glob."
  - "Keep offline candidate validation deterministic and require an explicit npm >=11.5.1 online preflight immediately before release."
patterns-established:
  - "Single-tarball proof: build and pack once, then reuse the exact path for inspection, clean installation, publint, and ATTW."
  - "Release identity drift fails closed; an E404 is recorded only as available-at-check-time and never as permanent ownership."
requirements-completed:
  - COMP-01
  - QUAL-11
coverage:
  - id: D1
    description: "The packed package exposes a compiled, declared, consumer-proven afferent/test helper with no raw TypeScript public target."
    requirement: COMP-01
    verification:
      - kind: integration
        ref: "npm run test:package"
        status: pass
    human_judgment: false
  - id: D2
    description: "One deterministic command validates package metadata, tarball files, exports, declarations, clean consumer behavior, publint, ATTW, and registry identity."
    requirement: QUAL-11
    verification:
      - kind: integration
        ref: "npm run test:release:package"
        status: pass
      - kind: unit
        ref: "tests/integration/release-package.test.mjs"
        status: pass
    human_judgment: false
  - id: D3
    description: "The online preflight enforces Node/npm trusted-publishing floors and accepts the afferent npm name only when currently unregistered or canonically owned at 0.1.0."
    requirement: QUAL-11
    verification:
      - kind: other
        ref: "npx --yes --package=npm@11.5.1 -- npm run test:release:package -- --online-preflight"
        status: pass
    human_judgment: false
duration: 12 min
completed: 2026-07-24
status: complete
---

# Phase 4 Plan 01: Package Release Baseline Summary

**A compiled Convex test helper and single-tarball release gate now prove `afferent@0.1.0` before publication credentials are used.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-24T04:12:00Z
- **Completed:** 2026-07-24T04:24:47Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Replaced the raw `./src/test.ts` package escape hatch with explicit `dist/test.js` and `dist/test.d.ts` conditions, removed `src` from the published allowlist, and proved installed registration of both component instances.
- Added a deterministic release-candidate verifier that builds and packs once, validates metadata and every export target, installs that exact tarball into the clean Convex/Vite consumer, and runs strict publint plus ATTW.
- Added an explicit online preflight that locks Node `>=22.14.0`, npm `>=11.5.1`, canonical `afferent@0.1.0` identity, and current name availability without silently renaming or publishing.

## Task Commits

1. **Task 1 RED: require a compiled test export** - `0af9f93` (test)
2. **Task 1 GREEN: ship compiled test registration** - `881027a` (feat)
3. **Task 2 RED: specify release-candidate validation** - `e1c9fd7` (test)
4. **Task 2 GREEN: add the single-tarball verifier** - `4ac9e15` (feat)
5. **Task 3: add npm identity/runtime preflight** - `2ddb6c7` (feat)

**Plan metadata:** committed with this summary and the final Phase 4 state update.

## Files Created/Modified

- `src/test.ts` - Registers Afferent and the rate-limiter child from source or installed component module directories.
- `package.json` - Adds canonical release metadata, runtime floors, compiled test export, strict files allowlist, and the named candidate command.
- `scripts/test-packed-consumer.mjs` - Accepts an already-packed tarball and proves the installed helper through the external consumer.
- `scripts/verify-package-release.mjs` - Orchestrates build, one pack, content/export validation, consumer installation, publint, ATTW, and optional online preflight.
- `tests/integration/packed-artifact.test.mjs` - Locks the compiled helper and tarball contract.
- `tests/integration/release-package.test.mjs` - Exercises metadata, files, export, version, runtime, and npm-name failure paths.

## Decisions Made

- The testing subpath is a deliberate Node/Vitest-oriented public surface. Its declaration exposes only `register`; Node filesystem implementation details do not leak into the public type contract.
- The generated registry catalog name is checked against the package candidate now; cross-surface version/digest generation remains assigned to Plan 04-08.
- Current npm E404 is evidence only for this check time. A future resolved package must match the canonical repository and exact `0.1.0` identity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced installed `import.meta.glob` execution with package-directory module discovery**

- **Found during:** Task 1 clean packed-consumer verification
- **Issue:** Vitest externalizes installed package JavaScript, leaving `import.meta.glob` untransformed; the compiled helper failed before registration. The rate-limiter package's own test export also routes to raw TypeScript.
- **Fix:** Discover Afferent and rate-limiter component modules from their installed compiled directories and register only those installed files, while keeping the helper declaration Node-type-free.
- **Files modified:** `src/test.ts`
- **Verification:** `npm run build` and `npm run test:package` passed through the clean external consumer.
- **Committed in:** `881027a`

---

**Total deviations:** 1 auto-fixed (1 Rule 3 blocking issue). **Impact on plan:** The adjustment is narrower than publishing source and directly enforces the compiled-artifact requirement.

## Issues Encountered

- The first online attempt correctly failed because the active npm `10.9.7` was below the locked `11.5.1` floor. The human-present checkpoint reran the exact gate with official `npm@11.5.1`; it passed and reported `afferent@0.1.0`, 291 packed files, and npm name status `available-at-check-time`.
- The user's unrelated TypeScript 7 package and lockfile experiment remained unstaged. Task commits contain only the intended package metadata, files, export, and script hunks.

## User Setup Required

None for deterministic candidate verification. Final trusted publication still requires the operator-provisioned GitHub/npm configuration assigned to Plans 04-08 and 04-09.

## Verification

- `npm run build` - passed.
- `npm run test:package` - 3/3 passed, including the external packed Convex/Vite consumer.
- `node --test tests/integration/release-package.test.mjs` - 4/4 passed.
- `npm run test:release:package` - passed against one 291-file tarball.
- `npx --yes --package=npm@11.5.1 -- npm run test:release:package -- --online-preflight` - passed; current npm name status is `available-at-check-time`.

## Known Stubs

None.

## Next Phase Readiness

- Plan 04-02 can install the package under two static demo component instances without relying on raw repository source.
- Later release automation must invoke the same candidate gate with a pinned compliant npm runtime and preserve the single-tarball path.

## Self-Check: PASSED

- Both created files and all four modified implementation/test files exist.
- All five task commits are present in git history.
- Deterministic and online verification claims are backed by passing commands.
- No dependency, product schema, authentication surface, or publication credential was added.

---

_Phase: 04-hosted-production-release_
_Completed: 2026-07-24_
