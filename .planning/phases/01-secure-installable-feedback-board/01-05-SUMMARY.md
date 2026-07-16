---
phase: 01-secure-installable-feedback-board
plan: "05"
subsystem: auth-and-packaging
tags: [convex-auth, clerk, better-auth, conformance, npm-pack, publint, attw]
dependency_graph:
  requires: [01-04]
  provides:
    - provider-neutral trusted-host auth adapters
    - shared authority and forgery conformance matrix
    - tarball-only release acceptance gate
  affects: [phase-02-headless-contract, phase-04-demo-sandbox]
tech_stack:
  added: []
  patterns:
    - fixture-only provider integrations with pure package normalizers
    - one shared conformance harness for auth, admin, scope, and forgery behavior
    - clean detached-worktree package and release verification
key_files:
  created:
    - src/client/adapters/convex-auth.ts
    - src/client/adapters/clerk.ts
    - src/client/adapters/better-auth.ts
    - tests/conformance/harness.ts
    - tests/integration/packed-artifact.test.mjs
  modified:
    - package.json
    - package-lock.json
    - tests/integration/scope-matrix.test.ts
    - tests/static/contracts.test.ts
    - scripts/test-packed-consumer.mjs
key_decisions:
  - "Provider packages remain fixture-only dev dependencies; exported adapter subpaths are pure provider-neutral normalizers."
  - "The types-only generated ComponentApi export is verified by manifest, file, consumer codegen, and ATTW rather than an impossible runtime import."
  - "Nested release tests remove NODE_TEST_CONTEXT so a child Node test cannot silently report a false-fast pass."
requirements_completed:
  - ACCS-02
  - ACCS-03
  - ACCS-04
  - ACCS-05
  - COMP-02
  - COMP-03
  - COMP-04
  - COMP-05
  - COMP-06
  - COMP-07
  - QUAL-02
  - QUAL-03
  - QUAL-10
duration: 13m
completed: 2026-07-16
status: complete
---

# Phase 1 Plan 05: Provider Conformance and Packed Release Summary

**Convex Auth, Clerk, and Better Auth now share one fail-closed authority contract, and the exact packed Afferent artifact passes clean-consumer codegen, declarations, builds, linting, and export acceptance.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-16T16:13:00Z
- **Completed:** 2026-07-16T16:25:56Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Added pure exported normalizers for Convex Auth stable user IDs, Clerk verified issuer/subject identities, and session-validated Better Auth users while retaining only provider-namespaced identity plus optional display snapshots.
- Added host-owned fixtures that call `getAuthUserId(ctx)`, `ctx.auth.getUserIdentity()`, or `authComponent.getAuthUser(ctx)` on every relevant operation and keep admin authorization independent.
- Added one 25-case conformance matrix proving anonymous/public/authenticated behavior, independent admin denial, null/throwing scope failure, forged browser-authority resistance, issuer separation, stale identity rejection, display refresh, and cross-provider non-linking.
- Extended the two-scope matrix across fixed and server-scoped host factories for list/get/create/edit/withdraw/vote/comment/count/anonymization behavior with provider-shaped actors.
- Strengthened the release gate to run every Phase 1 suite, component codegen, package typecheck/build, `npm pack --json`, tarball manifest inspection, fresh external installation, export smoke tests, component-aware consumer codegen, strict consumer typecheck/build, strict publint, ATTW, license checks, and source-root rejection.

## Task Commits

1. **Task 1 RED: Convex Auth authority contract** - `01c6f47`
2. **Task 1 GREEN: trusted Convex Auth adapter** - `bbc79a0`
3. **Task 2 RED: Clerk and Better Auth authority contract** - `fee56a9`
4. **Task 2 GREEN: Clerk and Better Auth normalizers and fixtures** - `f74d890`
5. **Task 3 RED: final packed artifact contract** - `f638a86`
6. **Task 3 GREEN: packed release acceptance** - `6b693cd`
7. **Task 3 formatting** - `2e6ebb2`
8. **Release-gate correctness fix** - `6affa84`
9. **Release lint fixes** - `91b11c9`, `8f38a25`

## Files Created/Modified

- `src/client/adapters/*.ts` - Immutable pure normalizers with provider namespaces and safe display-only snapshots.
- `fixtures/auth-*/convex/afferent.ts` - Current trusted server helper wiring with independent host admin callbacks.
- `tests/conformance/` - Shared observable component-spy matrix and identical provider scenarios.
- `tests/integration/scope-matrix.test.ts` - Fixed/scoped client coverage with provider-shaped actors and no cross-provider linking.
- `tests/static/contracts.test.ts` - Component/provider leakage and runtime dependency audits.
- `scripts/test-packed-consumer.mjs` - Full release order and external tarball-only acceptance.
- `tests/integration/packed-artifact.test.mjs` - Final gate coverage and authoritative nested walking-skeleton execution.
- `package.json` and `package-lock.json` - Supported adapter exports, complete test aliases, TS 6.0.3 lock consistency, and runtime `convex-helpers` classification.

## Decisions Made

- Pure adapters accept only facts already verified by the host helper; they never import provider runtimes, inspect tokens, or authorize administrators.
- Clerk keys encode verified issuer and subject separately so issuer boundaries cannot collide; all provider domains remain distinct and no linking is attempted.
- Better Auth integration uses session-validating `getAuthUser(ctx)` for participation and `safeGetAuthUser(ctx)` for read authentication rather than a subject-only shortcut.
- The packed package's types-only `./_generated/component.js` export is proven through its declaration file, export map, component codegen/typechecking, and ATTW instead of runtime import.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prevented nested Node release tests from false-fast success**
- **Found during:** Task 3 clean-worktree verification
- **Issue:** A nested `node --test` inherited `NODE_TEST_CONTEXT` and returned success without running the 19-second packed consumer gate.
- **Fix:** Removed that internal test-runner variable from the child environment and directly verified the walking skeleton before accepting the result.
- **Files modified:** `tests/integration/packed-artifact.test.mjs`
- **Verification:** The final nested packed gate ran for 18.6 seconds and passed both release tests.
- **Committed in:** `6affa84`

**2. [Rule 1 - Bug] Treated ComponentApi as its declared types-only export**
- **Found during:** Task 3 clean packed import smoke test
- **Issue:** Node correctly refused to runtime-resolve `./_generated/component.js`, whose export map intentionally supplies only a `types` condition.
- **Fix:** Kept runtime smoke coverage for executable exports and verified ComponentApi via the installed manifest, declaration path, consumer component codegen/typechecking, and ATTW.
- **Files modified:** `scripts/test-packed-consumer.mjs`
- **Verification:** Tarball import, codegen, typecheck, Vite build, strict publint, and ATTW all pass.
- **Committed in:** `6affa84`

**3. [Rule 3 - Blocking] Closed release lint failures in new proof code**
- **Found during:** Final explicit command matrix
- **Issue:** New helper/test expressions violated the repository's oxlint policy.
- **Fix:** Simplified optional normalization, removed nested ternaries and await-member access, and used direct string coverage assertions.
- **Files modified:** adapter and conformance/integration/static test files
- **Verification:** `npm run lint` passes in a fresh clean TS6 worktree.
- **Committed in:** `91b11c9`, `8f38a25`

---

**Total deviations:** 3 auto-fixed (2 Rule 1, 1 Rule 3). **Impact on plan:** All fixes strengthened the specified release proof without changing product scope, dependency versions, or public behavior.

## Issues Encountered

- The main checkout still contains the user's unstaged TypeScript `6.0.3` to `7.0.2` experiment and npm-generated TS7 closure. It was excluded from every commit and final release gate. TS7 remains outside the approved matrix and does not satisfy `convex-helpers`'s `^5.5 || ^6.0.0` TypeScript peer range; adoption requires a separate explicit user decision and compatibility review.
- The clean install reports the existing transitive `lucia@3.2.2` deprecation warning from the reviewed auth fixture dependency tree; no package name or approved version was substituted.

## User Setup Required

None - all provider packages are fixture-only and no external credentials are needed for the conformance or packed release gates.

## Verification

- Fresh detached TS6 worktree: lockfile regeneration produced no package diff; exact provider/test versions matched the approved matrix; `convex-helpers` remained a regular runtime dependency without `dev: true`.
- Static: 6 tests passed.
- Model: 3 tests passed.
- Component: 9 tests passed.
- Auth conformance: 25 tests passed.
- Scope matrix: 3 tests passed.
- Backend pagination: 1 test passed.
- Typecheck, build, and oxlint passed.
- Packed release: 2 Node tests passed; the complete external consumer gate ran in 18.6 seconds and included strict publint and ATTW.

## Next Phase Readiness

- Phase 1's provider-neutral security boundary and exact packed artifact are release-shaped and executable.
- Phase 2 can build the remaining domain/headless contract on stable host factories and versioned DTOs.
- Phase 4 can reuse the verified server-scoped client and Convex Auth fixture for private demo sandboxes.
- TypeScript 7 remains a separate unapproved experiment and is not part of phase readiness.

## Self-Check: PASSED

- All 16 Plan 01-05 artifacts exist and all 10 task/fix commits are present.
- Every provider helper appears only in its host fixture; provider dependencies and types do not enter component source or runtime package dependencies.
- The committed package and lockfile retain TypeScript 6.0.3 and runtime `convex-helpers`; the main checkout's TS7-only diff remains unstaged.
- Final release verification ran from a fresh detached worktree at committed HEAD, not from the dirty main checkout.
- Stub scan found no TODO, FIXME, placeholder, coming-soon, or unavailable implementation in Plan 01-05 files.
- No new threat surface exists beyond the plan's auth-provider, browser-wrapper, and package-consumer boundaries.

---
*Phase: 01-secure-installable-feedback-board*
*Completed: 2026-07-16*
