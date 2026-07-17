---
phase: 02-complete-feedback-to-changelog-workflow
plan: "12"
subsystem: headless-react-isolation
tags: [react, convex, watch-query, pagination, identity, packed-consumer]

requires:
  - phase: 02-10
    provides: Complete headless React hook and packed-consumer surface
  - phase: 02-11
    provides: Corrected atomic merge boundary and complete Phase 2 backend truth
provides:
  - Non-throwing direct and ordered paginated watch stores for every published read hook
  - Reactive later-page retention, recovery, growth, shrink, and atomic split replacement
  - Required opaque identity tokens with synchronous monotonic browser-local generations
  - Generation-fenced mutation, retry, pending, error, query, page, and optimistic state
  - Mounted every-hook and disposable real Convex failure/recovery acceptance matrices
  - Clean packed host wrapper contract that validates and strips cache generations
affects: [phase-3-copied-ui, phase-4-demo, headless-consumers]

tech-stack:
  added:
    - jsdom 29.1.1 (dev-only mounted React environment)
    - "@types/jsdom 28.0.3 (dev-only declarations)"
  patterns:
    - Provider-injected watchQuery stores consumed through useSyncExternalStore
    - Ordered cursor descriptors with retained snapshots and atomic split substitution
    - Synchronous identity generation plus completion-side generation fences

key-files:
  created:
    - src/react/query.ts
    - tests/react/live-headless.test.tsx
    - scripts/test-headless-backend.mjs
    - vitest.react.config.ts
  modified:
    - src/react/provider.tsx
    - src/react/bindings.ts
    - src/react/hooks/mutations.ts
    - src/react/hooks/feedback.ts
    - src/react/hooks/roadmap.ts
    - src/react/hooks/changelog.ts
    - src/react/hooks/notifications.ts
    - src/react/hooks/admin.ts
    - fixtures/packed-vite-convex/convex/afferent.ts
    - fixtures/packed-vite-convex/src/App.tsx

key-decisions:
  - "Use exact dev-only jsdom 29.1.1 and @types/jsdom 28.0.3 only for mounted Vitest files."
  - "Subscribe before the first localQueryResult read and convert every watch throw into the closed Afferent error vocabulary."
  - "Use a required host-supplied opaque identity token only to advance a local numeric generation; never serialize the token or treat it as authority."
  - "Validate numeric cache generations in host wrappers and strip them before every component client operation."

patterns-established:
  - "Non-throwing live reads: stable external-store snapshots own loading, ready, error, recovery, and disposal."
  - "Actor isolation: generation is part of every cache identity and every async completion checks the generation that started it."

requirements-completed: [UI-03, QUAL-01]

coverage:
  - id: D1
    description: Every published direct and paginated hook renders typed initial and reactive query errors and recovers without remounting or an error boundary.
    requirement: UI-03
    verification:
      - kind: integration
        ref: tests/react/live-headless.test.tsx#mounted-non-throwing-headless-reads
        status: pass
      - kind: e2e
        ref: node scripts/test-headless-backend.mjs
        status: pass
    human_judgment: false
  - id: D2
    description: Ordered pagination retains successful pages through later failures and atomically replaces recommended or required splits.
    requirement: UI-03
    verification:
      - kind: integration
        ref: tests/react/live-headless.test.tsx#mounted-ordered-pagination
        status: pass
      - kind: e2e
        ref: node scripts/test-headless-backend.mjs
        status: pass
    human_judgment: false
  - id: D3
    description: Account switches and logout synchronously clear actor-owned query, page, mutation, retry, and capability state while stale completions remain inert.
    requirement: UI-03
    verification:
      - kind: integration
        ref: tests/react/live-headless.test.tsx#mounted-identity-generation-isolation
        status: pass
      - kind: unit
        ref: tests/react/provider.test.tsx
        status: pass
    human_judgment: false
  - id: D4
    description: The packed public declarations, runtime provider, Convex host wrappers, and complete external consumer enforce the client/token/generation contract.
    requirement: QUAL-01
    verification:
      - kind: e2e
        ref: npm run test:package
        status: pass
      - kind: other
        ref: npm run test:phase2
        status: pass
    human_judgment: false

duration: 34min
completed: 2026-07-17
status: complete
---

# Phase 02 Plan 12: Headless Failure and Identity Isolation Summary

**Every published headless read now returns live typed failures instead of throwing, while synchronous identity generations prevent old actor pages, mutations, retries, and optimistic state from crossing an account transition.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-07-17T18:09:49Z
- **Completed:** 2026-07-17T18:43:50Z
- **Tasks:** 3
- **Files modified:** 28

## Accomplishments

- Replaced all throwing `useQuery` and helper pagination reads under `src/react/hooks` with provider-injected `watchQuery` stores and stable `useSyncExternalStore` snapshots.
- Implemented exact ordered-page retention and recovery, duplicate load guards, fresh invalid-cursor sessions, reactive growth/shrink, and atomic two-child replacement for both split statuses.
- Made authenticated `identityToken` required and non-empty, advancing a browser-local generation synchronously for loading, logout, login, A-to-B, and A-to-B-to-A transitions without serializing the token.
- Consolidated participation, moderation, tag, merge, changelog, subscription, and notification mutations onto one generation-fenced controller, including delayed retries and finally-path writes.
- Added mounted every-hook coverage, a disposable real Convex WebSocket watch matrix, and a clean packed-consumer contract that validates then strips cache generations before trusted component calls.

## Task Commits

1. **Task 1: Turn both verifier gaps into mounted and real-backend acceptance oracles** - `511d1ce` (test)
2. **Task 2: Replace throwing Convex read hooks with direct and ordered page watch stores** - `55f6b75` (fix)
3. **Task 3: Make identity generations synchronous and fence every actor-scoped completion** - `0d74565` (fix)

## Files Created/Modified

- `src/react/query.ts` - Internal direct and ordered paginated watch stores with typed errors, retries, page retention, and atomic split replacement.
- `src/react/provider.tsx` and `src/react/bindings.ts` - Injected watch client, required opaque identity token, synchronous generation, and numeric cache-key contract.
- `src/react/hooks/*.ts` - Non-throwing read mappings and shared generation-fenced mutation, retry, and optimism behavior.
- `tests/react/live-headless.test.tsx` - Mounted every-hook error/recovery, pagination, split, account-switch, stale-callback, and retry matrix.
- `scripts/test-headless-backend.mjs` - Disposable real Convex watch failure, recovery, page retention, growth, shrink, and split oracle.
- `fixtures/packed-vite-convex` and `scripts/test-packed-consumer.mjs` - Real client injection, identity token, host cache-discriminator stripping, and packed declaration/runtime assertions.

## Decisions Made

- The identity token is opaque browser-local cache identity only. Trusted wrappers still derive actor, scope, and admin authority server-side on every operation.
- Page state is exact backend order rather than ID-deduplicated accumulation; a split keeps its complete original page visible until both replacement ranges succeed.
- Query errors remain live subscriptions so a later successful update recovers without remounting; invalid cursors and explicit retries start a new pagination session while retaining the last complete snapshot.
- Mapper-only fabricated `Error` inputs were removed from legacy tests; mounted watches and the real Convex harness are the behavioral proof.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed the obsolete optional string generation from component-client intents**
- **Found during:** Task 3 packed host privacy verification
- **Issue:** Several root client intent validators still accepted the prior optional string `sessionGeneration`, even though the new cache discriminator must be host-only and stripped before component calls.
- **Fix:** Removed it from validators and capability types, added required numeric generation only to host-generated function references, and explicitly stripped it in the packed wrappers.
- **Files modified:** `src/client/contracts.ts`, `fixtures/packed-vite-convex/convex/afferent.ts`, `tests/static/contracts.test.ts`
- **Verification:** Static privacy tests, root typecheck, clean Convex consumer codegen/typecheck, and the complete packed gate pass.
- **Committed in:** `0d74565`

---

**Total deviations:** 1 auto-fixed (1 Rule 2). **Impact on plan:** The fix closes the authority/privacy seam required by the plan without changing component operations or product scope.

## Issues Encountered

- The legacy React suites mocked helper states that the production dependencies could never return. Their pure domain mapping coverage was retained, while actual failure behavior moved to the mounted controlled-watch matrix.
- The full Phase 2 gate includes several disposable real Convex deployments and completed successfully in approximately five minutes.

## User Setup Required

None - jsdom is dev-only and every real backend proof uses a disposable anonymous Convex deployment.

## Next Phase Readiness

- Both actionable blockers in `02-VERIFICATION.md` now have mounted, live-backend, and packed-consumer evidence.
- Phase 3 can consume stable explicit headless states without owning an error boundary or account-switch cleanup workaround.

## Known Stubs

None.

## Self-Check: PASSED

- Commits `511d1ce`, `55f6b75`, and `0d74565` exist and all declared key files exist.
- `npm run test:react`, the real headless backend matrix, static tests, typecheck, lint, build, `npm run test:package`, and the complete `npm run test:phase2` gate pass.
- The existing `02-VERIFICATION.md` report was preserved for the final re-verification workflow.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-17_
