---
phase: 01-secure-installable-feedback-board
plan: "08"
subsystem: installation-counts-release-gates
tags: [convex, bounded-queries, package-verification, typescript, tdd]
requires:
  - phase: 01-07
    provides: real provider factory conformance and independently compiled auth fixtures
provides:
  - additive idempotent installation configuration with a cumulative board bound
  - honest bounded post count DTO with an explicit truncation signal
  - clean TypeScript 6.0.3 Phase 1 release gate covering fixtures, real backend, and packed consumers
affects:
  [phase-01-verification, phase-02-domain-contract, phase-04-demo-integration]
tech-stack:
  added: []
  patterns:
    - installation configuration updates matching slugs and appends new slugs without reconciling omitted boards
    - bounded counts read one sentinel row beyond the public cap and expose hasMore
    - release verification starts from a clean build before compiling self-referencing fixture projects
key-files:
  created:
    - tests/component/installation.test.ts
  modified:
    - src/component/admin/installation.ts
    - src/component/public/posts.ts
    - src/component/validators.ts
    - src/component/_generated/component.ts
    - src/client/contracts.ts
    - src/client/internal.ts
    - src/client/index.ts
    - tests/component/posts.test.ts
    - tests/integration/scope-matrix.test.ts
    - tests/integration/packed-artifact.test.mjs
    - tests/static/contracts.test.ts
    - package.json
key-decisions:
  - "Preserve existing board sort orders and append genuinely new slugs after the current maximum; configuration never deletes, hides, or reorders omitted boards."
  - "Return post counts as contractVersion, count, and hasMore after reading at most the 50-row cap plus one sentinel."
  - "Run the Phase 1 release gate from a clean build on the committed TypeScript 6.0.3 package and lock baseline."
  - "Use full Convex host contexts parameterized by any data model so generated schema and schema-less contexts are both assignable without casts."
patterns-established:
  - "Additive configuration: validate cumulative state before any installation or board write."
  - "Honest bounds: a capped count is never represented as an exact unbounded total."
requirements-completed:
  - ACCS-01
  - ACCS-06
  - FDBK-01
  - FDBK-08
  - COMP-02
  - COMP-03
  - QUAL-02
  - QUAL-03
coverage:
  - id: D1
    description: "Repeated installation configuration updates matching names, preserves omitted boards and posts, appends new slugs once, and rejects cumulative overflow before writes."
    requirement: ACCS-01
    verification:
      - kind: integration
        ref: "npm run test:component -- tests/component/installation.test.ts"
        status: pass
      - kind: integration
        ref: "npm run test:scope -- tests/integration/scope-matrix.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Board post counts distinguish exact zero-through-cap results from capped lower bounds while visible post vote and comment totals remain exact."
    requirement: FDBK-08
    verification:
      - kind: integration
        ref: "npm run test:component -- tests/component/posts.test.ts"
        status: pass
      - kind: unit
        ref: "npm run test:static -- tests/static/contracts.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "The named Phase 1 command requires clean declarations, independent fixture typechecks, real factory conformance, scope and component suites, real-backend pagination, and packed-artifact verification."
    requirement: QUAL-03
    verification:
      - kind: integration
        ref: "npm run test:phase1 from clean committed HEAD with TypeScript 6.0.3"
        status: pass
    human_judgment: false
duration: 10 min
completed: 2026-07-16
status: complete
---

# Phase 1 Plan 08: Additive Installation, Honest Counts, and Release Gates Summary

**Installation retries are now non-destructive, bounded post counts expose truncation explicitly, and one clean TypeScript 6.0.3 command proves the complete Phase 1 package and backend closure.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-16T18:51:33Z
- **Completed:** 2026-07-16T19:01:14Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Locked D-14 with repeated overlapping and disjoint installation calls that preserve board IDs, omitted boards, post ownership, and stable ordering while rejecting cumulative overflow before writes.
- Locked D-15 with a versioned `{ count, hasMore }` DTO that reads at most 51 active scoped rows, reports exact results through 50, and preserves exact per-post vote and comment totals.
- Added `test:fixtures`, `test:backend:real`, and `test:phase1`, with packed-artifact assertions that require the real backend runner and prevent substitution by the convex-test pagination suite.
- Proved the entire named gate from a clean temporary checkout of committed HEAD using the reviewed `typescript@6.0.3` package and lockfile baseline.

## Task Commits

Each task was committed atomically through its TDD and verification gates:

1. **Task 1 RED: require additive installation configuration** - `5c3a4ec` (test)
2. **Task 1 GREEN: make installation configuration additive** - `e424bdd` (feat)
3. **Task 2 RED: require honest bounded post counts** - `a4bb4cf` (test)
4. **Task 2 GREEN: expose honest bounded post counts** - `bb0cb7c` (feat)
5. **Task 3: promote Phase 1 release gates** - `78bf67f` (chore)
6. **Task 3 verification fix: build before fixture checks** - `4eaeba7` (fix)
7. **Task 3 verification fix: accept generated Convex host contexts** - `7b997d3` (fix)

**Plan metadata:** committed with this summary and the final Phase 1 state update.

## Files Created/Modified

- `tests/component/installation.test.ts` - Proves additive retries, omitted-board persistence, stable appends, and fail-closed cumulative bounds.
- `src/component/admin/installation.ts` - Loads existing boards through the scope-leading order index, validates cumulative capacity, preserves ordering, and appends new slugs.
- `src/component/public/posts.ts` - Caps count results at 50 and derives `hasMore` from one sentinel row.
- `src/component/validators.ts` - Validates the bounded count truncation signal.
- `src/component/_generated/component.ts` - Publishes the updated component count return contract.
- `src/client/contracts.ts` - Exports `PostCountDto` and aligns public validators and read capabilities.
- `src/client/internal.ts` - Propagates the count DTO and accepts generated Convex host contexts across data models.
- `src/client/index.ts` - Exports the bounded count DTO from the public package surface.
- `tests/component/posts.test.ts` - Covers zero, cap, cap-plus-one, lifecycle/scope exclusion, and exact participation totals.
- `tests/integration/scope-matrix.test.ts` - Locks the truncation signal across fixed and server-scoped clients.
- `tests/static/contracts.test.ts` - Freezes the validator shape and full generated-context compatibility contract.
- `tests/integration/packed-artifact.test.mjs` - Audits fixture, real-backend, clean-build, and Phase 1 script wiring.
- `package.json` - Adds the named fixture, real-backend, and Phase 1 release scripts without changing dependencies.

## Decisions Made

- Existing board ordering is durable installation state. Matching slugs update only mutable names, and new slugs append after the current maximum order.
- The public board count is a bounded projection, so `hasMore` is mandatory even when false; callers never infer exactness from a capped number.
- The package release command builds first because independent fixtures resolve Afferent through its emitted self-reference declarations.
- Trusted host resolvers still receive complete Convex contexts, but the context aliases use an unconstrained data-model parameter so normal generated function contexts remain assignable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Built package declarations before fixture compilation**

- **Found during:** Task 3 clean release verification
- **Issue:** A clean checkout had no `dist` declarations, so fixture self-imports of `afferent` could not resolve before the named gate reached any provider checks.
- **Fix:** Added `npm run build` as the first `test:phase1` step and required it in the packed-artifact script audit.
- **Files modified:** `package.json`, `tests/integration/packed-artifact.test.mjs`
- **Verification:** The clean TypeScript 6.0.3 gate compiled all three fixtures after building declarations.
- **Committed in:** `4eaeba7`

**2. [Rule 3 - Blocking] Made full host contexts assignable from generated Convex functions**

- **Found during:** Task 3 clean packed-consumer verification
- **Issue:** `GenericQueryCtx<GenericDataModel>` and `GenericMutationCtx<GenericDataModel>` were invariant with generated schema-less host contexts, so the freshly rebuilt package declarations rejected valid Convex handlers.
- **Fix:** Retained full trusted Convex contexts while parameterizing their data model with `any`, matching Convex's generic handler compatibility pattern without adding casts to consumers.
- **Files modified:** `src/client/internal.ts`, `tests/static/contracts.test.ts`
- **Verification:** Root typecheck, lint, static contracts, and the clean packed Vite/Convex consumer all passed.
- **Committed in:** `7b997d3`

---

**Total deviations:** 2 auto-fixed (2 Rule 3 blocking issues). **Impact on plan:** Both fixes were required to make the named release gate reproducible from a clean checkout; neither widened runtime authority or product scope.

## Issues Encountered

- The main working tree retains the user's unrelated TypeScript 7.0.2 package and lockfile experiment, `.npmrc`, Codex hook work, and planning debug files. The Task 3 partial-index commits contain only script changes: committed `package.json` and `package-lock.json` remain on TypeScript 6.0.3, while the user's working files remain on 7.0.2.
- Running the packed consumer directly in the dirty main checkout reproduced the known TypeScript 7 declaration incompatibility. Final acceptance therefore ran from a clean temporary worktree of committed HEAD and passed on TypeScript 6.0.3; the temporary verification worktree was removed afterward.

## User Setup Required

None - all fixture, provider, real-backend, and packed-consumer checks run locally without provider credentials or a hosted deployment.

## Verification

- Clean `npm run test:phase1` passed on committed TypeScript 6.0.3: package build; three fixture typechecks; 25 real-factory conformance tests; 3 scope tests; 12 component tests; 13 static tests; real Convex pagination; and both packed-artifact tests.
- D-14 component and scope tests passed, including cumulative overflow with no partial policy or board writes.
- D-15 boundary tests passed at zero, 50, and 51 active posts, with withdrawn and cross-scope rows excluded and exact `voteCount`, `commentCount`, and `totals` retained.
- The committed `package.json` contains TypeScript 6.0.3 plus the new scripts; the working `package.json` and lockfile still contain the user's TypeScript 7.0.2 experiment.

## Known Stubs

None - no TODO, FIXME, placeholder, coming-soon, unavailable, or hardcoded empty UI/data-source stub exists in Plan 01-08 files.

## Next Phase Readiness

- All eight Phase 1 plans now have implementation summaries and the additive verifier warnings are closed by executable tests.
- Phase 1 is ready for independent verification against the named clean release gate.

## Self-Check: PASSED

- All thirteen created or modified Plan 01-08 files exist, and all seven task/fix commits are present in git history.
- The full named Phase 1 command passed from a clean committed checkout on the reviewed TypeScript 6.0.3 baseline.
- The committed package manifest retains TypeScript 6.0.3 while the user's unrelated working-tree experiment remains TypeScript 7.0.2 and uncommitted.
- No new network, authentication, schema, or file-access trust boundary was introduced beyond the plan's installation, scoped-count, and release-evidence threat model.

---

_Phase: 01-secure-installable-feedback-board_
_Completed: 2026-07-16_
