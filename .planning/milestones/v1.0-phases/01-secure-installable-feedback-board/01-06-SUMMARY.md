---
phase: 01-secure-installable-feedback-board
plan: "06"
subsystem: auth-fixtures
tags: [convex-auth, clerk, better-auth, typescript, component-codegen]
dependency_graph:
  requires: [01-05]
  provides:
    - independently compiled Convex Auth, Clerk, and Better Auth fixture projects
    - session-validated Better Auth component user normalization by stable document ID
    - committed Better Auth and Afferent component installation with typed references
  affects: [01-07-provider-conformance, phase-04-demo-auth]
tech_stack:
  added: []
  patterns:
    - provider fixtures compile as isolated strict no-emit TypeScript projects
    - committed generated-style component references support offline fixture typechecking
key_files:
  created:
    - fixtures/auth-convex-auth/tsconfig.json
    - fixtures/auth-clerk/tsconfig.json
    - fixtures/auth-better-auth/tsconfig.json
    - fixtures/auth-better-auth/convex/convex.config.ts
    - fixtures/auth-better-auth/convex/_generated/api.ts
  modified:
    - src/client/internal.ts
    - src/client/adapters/better-auth.ts
    - tests/static/contracts.test.ts
key_decisions:
  - "Normalize Better Auth users from the session-validated component document _id, never email, token, session, role, or provider records."
  - "Expose full Convex query and mutation contexts only to trusted host resolvers while keeping browser intent validators unchanged."
  - "Commit generated-style Better Auth component references so provider fixtures typecheck without live credentials or deployment codegen."
patterns_established:
  - "Fixture compilation: each provider owns a strict no-emit tsconfig with no source paths or repository-relative aliases."
  - "Provider helper boundary: trusted host contexts satisfy current helper capabilities and emit only VerifiedActor."
requirements_completed:
  - ACCS-03
  - COMP-02
  - COMP-06
  - QUAL-02
coverage:
  - id: D1
    description: "The Better Auth adapter consumes the session-validated component user document ID and emits only provider-neutral actor facts."
    requirement: ACCS-03
    verification:
      - kind: unit
        ref: "npm run test:static -- tests/static/contracts.test.ts"
        status: pass
      - kind: other
        ref: "TypeScript 6.0.3 tsc --project tsconfig.json"
        status: pass
    human_judgment: false
  - id: D2
    description: "Convex Auth, Clerk, and Better Auth each compile as independent strict fixture projects against shipped Afferent declarations."
    requirement: QUAL-02
    verification:
      - kind: integration
        ref: "TypeScript 6.0.3 tsc --project fixtures/auth-convex-auth/tsconfig.json"
        status: pass
      - kind: integration
        ref: "TypeScript 6.0.3 tsc --project fixtures/auth-clerk/tsconfig.json"
        status: pass
      - kind: integration
        ref: "TypeScript 6.0.3 tsc --project fixtures/auth-better-auth/tsconfig.json"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Better Auth fixture installs both components, uses typed generated references, and validates the session on every identity lookup."
    requirement: COMP-06
    verification:
      - kind: integration
        ref: "TypeScript 6.0.3 tsc --project fixtures/auth-better-auth/tsconfig.json"
        status: pass
      - kind: unit
        ref: "npm run test:static -- tests/static/contracts.test.ts"
        status: pass
    human_judgment: false
duration: 4 min
completed: 2026-07-16
status: complete
---

# Phase 1 Plan 06: Independently Compiled Auth Fixtures Summary

**Three strict provider fixture projects now compile against shipped declarations, with Better Auth installed as a typed component and normalized from its session-validated user document `_id`.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-16T18:32:39Z
- **Completed:** 2026-07-16T18:36:34Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Repaired the Better Auth boundary so its real component user document flows directly into the adapter without casts, while private email, role, token, session, and provider material remains absent from `VerifiedActor`.
- Widened only trusted host query and mutation contexts to their real Convex server capabilities; the exact authority-free browser intent validators remain unchanged and covered by static tests.
- Added three independent strict no-emit fixture projects and committed the Better Auth plus Afferent component configuration and generated-style typed component references required for offline compilation.

## Task Commits

Each task was committed atomically through its TDD and verification steps:

1. **Task 1 RED: expose Better Auth fixture contract gaps** - `a4cb325`
2. **Task 1 GREEN: align Better Auth session user contract** - `bc031f9`
3. **Task 2 RED: require independently compiled auth fixtures** - `3f2d44c`
4. **Task 2 GREEN: compile provider fixtures independently** - `79e865c`
5. **Task 2 verification fix: satisfy provider fixture lint policy** - `21cf9ce`

## Files Created/Modified

- `src/client/internal.ts` - Supplies complete trusted Convex query and mutation contexts to host-only provider helpers.
- `src/client/adapters/better-auth.ts` - Normalizes the stable `_id` of a session-validated Better Auth component user document.
- `fixtures/auth-convex-auth/tsconfig.json` - Strict independent Convex Auth fixture compilation gate.
- `fixtures/auth-clerk/tsconfig.json` - Strict independent Clerk fixture compilation gate.
- `fixtures/auth-better-auth/tsconfig.json` - Strict independent Better Auth fixture compilation gate.
- `fixtures/auth-better-auth/convex/convex.config.ts` - Installs the Afferent and Better Auth components together.
- `fixtures/auth-better-auth/convex/_generated/api.ts` - Provides committed typed component references for offline fixture compilation.
- `tests/static/contracts.test.ts` - Locks document-ID normalization, server-only context capability, isolated fixture configs, and component registration.

## Decisions Made

- The session-validated Better Auth component document `_id` is the stable provider identifier; the adapter ignores the document's private email and any extra provider/session fields.
- Provider helpers receive full trusted Convex server contexts because their session validation may need database, scheduler, storage, and cross-function capabilities; browser-callable argument shapes did not change.
- The Better Auth fixture keeps generated-style references committed because Phase 1 requires deterministic offline typechecking without live credentials or a deployment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced an unnamed regex capture in the fixture contract audit**

- **Found during:** Overall verification after Task 2
- **Issue:** Oxlint rejected an unnamed capture group in the new helper-call source assertion.
- **Fix:** Converted the alternation to a non-capturing group without changing the assertion.
- **Files modified:** `tests/static/contracts.test.ts`
- **Verification:** `npm run lint` and the 12-test static suite pass.
- **Committed in:** `21cf9ce`

---

**Total deviations:** 1 auto-fixed (1 Rule 3). **Impact on plan:** The fix was limited to lint-compliant test syntax and did not change product behavior or scope.

## Issues Encountered

- The main checkout retains the user's unrelated TypeScript 7 package and lockfile experiment. Final provider-fixture acceptance was therefore rerun with the exact reviewed `typescript@6.0.3` tarball in a temporary directory; the package build and all three independent fixture projects passed without modifying or committing the experiment.

## User Setup Required

None - fixture compilation uses committed component references and requires no provider credentials or live deployment.

## Verification

- Reviewed TypeScript 6.0.3: package declaration build passed, then Convex Auth, Clerk, and Better Auth fixture projects each passed strict independent compilation.
- Static contracts: 12 tests passed, including provider privacy, exact browser intent shapes, Better Auth `_id` normalization, full trusted server contexts, fixture tsconfigs, and component registration.
- Current-worktree build and all three fixture compilation commands also passed; `npm run lint` exited successfully.
- Source audit found no fixture paths into `src/`, no `compilerOptions.paths`, and Better Auth retained `createClient(components.betterAuth)`, `getAuthUser(ctx)`, and `safeGetAuthUser(ctx)`.

## Known Stubs

None - no TODO, FIXME, placeholder, coming-soon, unavailable, or hardcoded empty UI/data-source stub exists in Plan 01-06 files.

## Next Phase Readiness

- Plan 01-07 can import and execute the three real fixture factories through the shared authority-conformance matrix.
- No provider credential or deployment gate remains for Phase 1 fixture compilation.

## Self-Check: PASSED

- All five created fixture artifacts and all three modified contract files exist.
- All five Plan 01-06 task/fix commits are present in git history.
- The exact plan verification command matrix passes, including the reviewed TypeScript 6.0.3 compilation proof.
- No new threat surface exists beyond the plan's registered provider-session, trusted-host, and fixture-compilation boundaries.

---

_Phase: 01-secure-installable-feedback-board_
_Completed: 2026-07-16_
