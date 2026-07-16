---
phase: 01-secure-installable-feedback-board
plan: "07"
subsystem: auth-conformance
tags: [convex-test, convex-auth, clerk, better-auth, security]
requires:
  - phase: 01-06
    provides: independently compiled auth fixtures and a session-validated Better Auth user contract
provides:
  - shared persisted convex-test authority matrix for all three real auth fixture factories
  - injectable Convex Auth helper seam with the official helper as its production default
  - component-backed Better Auth valid, absent, missing, and expired session coverage
affects: [phase-01-verification, phase-04-provider-integration]
tech-stack:
  added: []
  patterns:
    - provider conformance executes committed host factories against registered components
    - provider prerequisites are registered and seeded through scenario-owned backend setup
key-files:
  created: []
  modified:
    - fixtures/auth-convex-auth/convex/afferent.ts
    - tests/conformance/harness.ts
    - tests/conformance/convex-auth.test.ts
    - tests/conformance/clerk.test.ts
    - tests/conformance/better-auth.test.ts
    - tests/integration/scope-matrix.test.ts
key-decisions:
  - "Expose a narrow injectable Convex Auth getAuthUserId seam while retaining the official helper as the production default."
  - "Give each provider scenario responsibility for registering and seeding its trusted backend prerequisites before the shared matrix runs."
patterns-established:
  - "Factory conformance: direct fixture imports plus registered convex-test component references are required; normalizer-only tests cannot satisfy provider acceptance."
  - "Better Auth sessions: actor resolution is proven through stored component user/session rows and the sessionId identity claim."
requirements-completed:
  - ACCS-02
  - ACCS-03
  - ACCS-04
  - ACCS-05
  - COMP-04
  - COMP-05
  - COMP-06
  - COMP-07
  - QUAL-02
coverage:
  - id: D1
    description: "Convex Auth and Clerk execute their committed fixture factories through one persisted authority matrix with missing-auth, admin-denial, forged-authority, cross-scope, and success cases."
    requirement: COMP-04
    verification:
      - kind: integration
        ref: "npm run test:auth-conformance -- tests/conformance/convex-auth.test.ts tests/conformance/clerk.test.ts"
        status: pass
      - kind: integration
        ref: "npx tsc --project fixtures/auth-convex-auth/tsconfig.json --noEmit"
        status: pass
      - kind: integration
        ref: "npx tsc --project fixtures/auth-clerk/tsconfig.json --noEmit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Better Auth executes its real fixture factory through registered component storage, accepting a valid session and rejecting absent, nonexistent, and expired sessions before participation persists."
    requirement: COMP-06
    verification:
      - kind: integration
        ref: "npm run test:auth-conformance"
        status: pass
      - kind: integration
        ref: "npx tsc --project fixtures/auth-better-auth/tsconfig.json --noEmit"
        status: pass
    human_judgment: false
  - id: D3
    description: "Provider-shaped actors retain fixed and server-resolved scope isolation without cross-provider linking or browser-selected authority."
    requirement: COMP-07
    verification:
      - kind: integration
        ref: "npm run test:scope -- tests/integration/scope-matrix.test.ts"
        status: pass
      - kind: integration
        ref: "npm run test:auth-conformance"
        status: pass
    human_judgment: false
duration: 5 min
completed: 2026-07-16
status: complete
---

# Phase 1 Plan 07: Real Provider Factory Conformance Summary

**All three committed auth fixture factories now run the same adversarial authority contract against persisted Afferent state, including Better Auth's real component-backed session validation.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-16T18:43:29Z
- **Completed:** 2026-07-16T18:47:40Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced the generic `ComponentApi` spy and pure-normalizer scenarios with direct Convex Auth, Clerk, and Better Auth fixture factory execution against a registered Afferent component.
- Added a narrow injectable Convex Auth helper seam whose production default remains `getAuthUserId`, proving the trusted helper is evaluated by authenticated operations.
- Registered and seeded the real Better Auth test component so valid stored sessions resolve the component user while absent, nonexistent, and expired sessions cannot persist participation.
- Exercised the same public-read, authentication, admin, forgery, cross-scope, persistence, and stable-actor outcomes across all three provider paths.

## Task Commits

Each task was committed atomically through its TDD gates:

1. **Task 1 RED: require real Convex Auth and Clerk factories** - `66036c1` (test)
2. **Task 1 GREEN: execute the trusted Convex Auth helper seam** - `9652716` (feat)
3. **Task 2 RED: require component-backed Better Auth sessions** - `e38928b` (test)
4. **Task 2 GREEN: run the component-backed shared harness** - `0b165d3` (feat)
5. **Task 2 REFACTOR: align the Better Auth scenario contract** - `013f792` (refactor)

**Plan metadata:** committed with this summary and the Phase 1 state update.

## Files Created/Modified

- `fixtures/auth-convex-auth/convex/afferent.ts` - Accepts a narrow trusted helper seam with the official helper retained as the default.
- `tests/conformance/harness.ts` - Runs one persisted factory authority matrix with provider-owned registration and identity preparation.
- `tests/conformance/convex-auth.test.ts` - Imports and invokes the actual Convex Auth fixture factory and proves helper use.
- `tests/conformance/clerk.test.ts` - Imports and invokes the actual Clerk fixture factory through convex-test identity.
- `tests/conformance/better-auth.test.ts` - Registers Better Auth, seeds component users/sessions, invokes the actual factory, and covers invalid session states.
- `tests/integration/scope-matrix.test.ts` - Keeps the session-validated Better Auth document-ID contract in the fixed/scoped provider isolation proof.

## Decisions Made

- The Convex Auth fixture accepts only an injected server helper function, not actor facts or browser authority; omitting it always uses the package's official `getAuthUserId` helper.
- Provider-specific backend setup belongs to the conformance scenario, while all observable authority and persistence assertions remain shared and provider-neutral.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The Task 1 package script also discovered the intentionally stale Better Auth synthetic suite. Its expected failure remained until Task 2 replaced that suite with the real registered component path; the final exact command is green.
- The user's unrelated TypeScript 7 package and lockfile experiment, `.npmrc`, hook changes, and `.planning/debug/` files were preserved and excluded from every commit.

## User Setup Required

None - provider conformance uses committed fixture dependencies and local component test registrations without credentials or a live deployment.

## Verification

- Provider conformance: 25 tests passed across the three actual fixture factories.
- Scope matrix: 3 tests passed for resolver ordering, cross-scope isolation, and provider-shaped fixed/scoped actors.
- Convex Auth, Clerk, and Better Auth fixture projects each passed strict TypeScript compilation.
- `npm run lint` passed.
- Direct source audit confirms each conformance file imports and invokes its `create*AfferentFixture` export and Better Auth calls both `getAuthUser(ctx)` and `safeGetAuthUser(ctx)`.

## Known Stubs

None - no TODO, FIXME, placeholder, coming-soon, unavailable, or hardcoded empty UI/data-source stub exists in Plan 01-07 files.

## Next Phase Readiness

- The verification report's normalizer-only provider gap is closed with persisted real-factory evidence.
- Plan 01-08 can close the remaining additive installation, honest bounded-count, and release-gate warnings.

## Self-Check: PASSED

- All six modified plan files exist and are clean in the working tree.
- All five Plan 01-07 task/TDD commits are present in git history.
- Every task-level and plan-level verification command passes.
- No security-relevant surface was introduced beyond the plan's provider helper, Better Auth session, browser-to-host, and host-to-component threat boundaries.

---

_Phase: 01-secure-installable-feedback-board_
_Completed: 2026-07-16_
