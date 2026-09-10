---
phase: 02-complete-feedback-to-changelog-workflow
plan: "10"
subsystem: headless-react
tags: [react, convex, headless, auth-reset, packed-artifact]

requires:
  - phase: 02-09
    provides: Complete feedback, roadmap, changelog, notification, and delivery contracts exposed through trusted host clients
provides:
  - One provider-neutral React provider over grouped host-generated Convex references
  - Stable query, mutation, authentication, authorization, unsupported, and versioned error states across every Phase 2 hook
  - Session-generation invalidation for all actor-sensitive headless state
  - A public afferent/react.js entrypoint proven from a clean packed Vite and Convex consumer
affects: [02-11-merge-correction, phase-3-copyable-ui, phase-4-hosted-demo, consumer-integrations]

tech-stack:
  added: []
  patterns:
    - Consumer-generated Convex references are grouped by domain under one provider
    - Actor-sensitive queries include a local-only session generation key that is never sent to the backend
    - Expected mutation failures resolve into one closed AfferentResult and AfferentError vocabulary
    - Only vote, subscription, and notification mark-read use native reversible optimism

key-files:
  created:
    - src/react/hooks/mutations.ts
    - tests/react/mutations.test.tsx
    - tests/static/exports.test.ts
  modified:
    - src/react/provider.tsx
    - src/react/bindings.ts
    - src/react/hooks/feedback.ts
    - src/react/hooks/admin.ts
    - src/react/hooks/notifications.ts
    - src/react/index.ts
    - fixtures/packed-vite-convex/src/App.tsx
    - scripts/test-packed-consumer.mjs

key-decisions:
  - "Keep sessionGeneration opaque and local to React query keys so an account switch invalidates protected state without becoming an authority fact sent to the component."
  - "Model generated host-reference argument IDs as strings at the binding boundary because Convex FunctionReference arguments are invariant; retain branded IDs in public DTO and hook-facing contracts."
  - "Require paginationOpts in paginated binding references because Convex usePaginatedQuery and generated paginated functions require that exact signature."
  - "Normalize expected failures into AfferentResult while retaining the existing backend AfferentActionResult compatibility contract."

patterns-established:
  - "Grouped optional capability bindings: omitted domains report unsupported while present admin capabilities still require a server-owned capability query."
  - "One mutation controller: pending keys prevent duplicates, errors are closed and versioned, and retry is limited to transient or rate-limited failures."
  - "Packed consumer proof: generated host wrappers and consumer-owned markup compile only against the installed tarball and afferent/react.js declarations."

requirements-completed: [UI-01, UI-02, UI-03, QUAL-01]

coverage:
  - id: D1
    description: One provider accepts grouped generated host references and a minimal provider-neutral auth adapter while omitted domains report unsupported.
    requirement: UI-01
    verification:
      - kind: unit
        ref: tests/react/provider.test.tsx#provider state and session generation contract
        status: pass
      - kind: unit
        ref: tests/static/exports.test.ts#stable React public entrypoint
        status: pass
    human_judgment: false
  - id: D2
    description: Every public and participation hook uses explicit async, error, duplicate, pagination, debounce, retry, and reversible optimism semantics.
    requirement: UI-02
    verification:
      - kind: unit
        ref: tests/react/mutations.test.tsx#shared mutation controller and error mapping
        status: pass
      - kind: unit
        ref: npm run test:react
        status: pass
    human_judgment: false
  - id: D3
    description: Admin, roadmap, changelog, and notification hooks clear actor-sensitive state on session change and preserve server-derived authorization.
    requirement: UI-03
    verification:
      - kind: unit
        ref: tests/react/provider.test.tsx#session generation invalidation
        status: pass
      - kind: integration
        ref: fixtures/packed-vite-convex/src/App.tsx#complete generated host binding inventory
        status: pass
    human_judgment: false
  - id: D4
    description: The complete React and host-wrapper contract installs, code-generates, typechecks, builds, audits, and runs from the packed artifact in an external consumer.
    requirement: QUAL-01
    verification:
      - kind: e2e
        ref: npm run test:package
        status: pass
      - kind: other
        ref: npm run build and npm run test:phase2
        status: pass
    human_judgment: false

duration: 7h26m
completed: 2026-07-17
status: complete
---

# Phase 02 Plan 10: Unified Headless React and Packed Consumer Summary

**Afferent now exposes the complete feedback-to-roadmap-to-changelog workflow through one provider-neutral React surface whose generated host bindings, actor resets, mutation semantics, and public package entrypoint are proven from a clean tarball consumer.**

## Performance

- **Duration:** 7h 26m
- **Started:** 2026-07-16T19:11:54-07:00
- **Completed:** 2026-07-17T02:37:15-07:00
- **Tasks:** 3
- **Files modified:** 21

## Accomplishments

- Added one grouped `AfferentProvider` contract and complete stable afferent/react.js exports for public discovery, participation, moderation, roadmap, changelog, notifications, and administrative editing.
- Added a shared versioned result/error vocabulary, mutation controller, duplicate guards, bounded retry metadata, native reversible optimism only for vote/subscription/mark-read, and session-generation invalidation across actor-sensitive hooks.
- Expanded the packed Vite/Convex fixture into a complete consumer-owned integration using generated host references and proved runtime exports, declarations, codegen, typecheck, Vite build, package audits, and the full Phase 2 invariant suite.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock the complete provider/state/error/reset contract** - `87a4b06` (test)
2. **Task 2: Normalize all hooks onto one stable state and error vocabulary** - `f169599` (feat)
3. **Task 3: Prove the complete Phase 2 contract from a clean packed consumer** - `5d9f577` (test)

Additional verification-gate correction:

- **Keep the real pagination fixture within actor rate limits** - `a24279f` (fix)

## Files Created/Modified

- `src/react/hooks/mutations.ts` - Shared error mapping, expected-result normalization, retry policy, duplicate protection, and mutation state controller.
- `src/react/provider.tsx` and `src/react/bindings.ts` - Grouped generated-reference bindings, optional capability groups, auth state, and opaque session generation.
- `src/react/hooks/feedback.ts` - Public discovery plus complete participation mutations with server truth and narrowly allowed native optimism.
- `src/react/hooks/admin.ts`, `roadmap.ts`, `changelog.ts`, and `notifications.ts` - Unified status vocabulary and actor-generation invalidation across protected domains.
- `src/client/contracts.ts` and `src/client/index.ts` - Versioned result/error aliases and exact public validators required by packed host wrappers.
- `src/react/index.ts` and `package.json` - Complete public React entrypoint, declarations, export map, and named Phase 2 gate.
- `fixtures/packed-vite-convex/convex/afferent.ts` and `src/App.tsx` - Trusted narrow host wrappers and consumer-owned presentation exercising every capability group.
- `scripts/test-packed-consumer.mjs` and `tests/integration/packed-artifact.test.mjs` - External tarball export/declaration/build/audit proof.
- `tests/react/provider.test.tsx`, `mutations.test.tsx`, and `tests/static/exports.test.ts` - Executable provider, mutation, reset, and public-export contracts.
- `scripts/test-pagination-backend.mjs` - Rate-limit-safe multi-actor pagination seed with ownership-preserving edit and withdraw checks.

## Decisions Made

- Kept provider authentication facts strictly UX-facing: the host still derives actor, admin, and scope on every server call, while session generation only invalidates client state.
- Used raw string IDs inside `FunctionReference` argument types so real Convex-generated references satisfy the public binding surface; hook and DTO APIs continue exposing nominal ID types.
- Required pagination arguments on paginated reference types and overrode optional intent validators in host wrappers so the generated signature satisfies Convex's native pagination hook.
- Preserved backend action-result compatibility while exposing a single `{ok,data}|{ok:false,error}` normalization layer to headless consumers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test Defect] Made the packed command assertion formatting-insensitive**
- **Found during:** Task 3 packed gate
- **Issue:** Prettier compacted the Convex `--typecheck enable` argument list, but the legacy assertion required a newline between tokens.
- **Fix:** Matched arbitrary whitespace between the exact adjacent arguments.
- **Files modified:** `tests/integration/packed-artifact.test.mjs`
- **Verification:** `npm run test:package` passes all three packed-artifact tests.
- **Committed in:** `5d9f577`

**2. [Rule 2 - Missing Critical] Added exact action and activity validators needed by trusted wrappers**
- **Found during:** Task 3 external consumer typecheck
- **Issue:** Subscription mutations could return a typed participation failure and the activity wrapper otherwise required a permissive return validator.
- **Fix:** Added exact subscription action, activity page, capability, lookup, and merge validators and exported them from the public client surface.
- **Files modified:** `src/client/contracts.ts`, `src/client/index.ts`, `fixtures/packed-vite-convex/convex/afferent.ts`
- **Verification:** Clean Convex codegen/typecheck and the complete packed gate pass.
- **Committed in:** `5d9f577`

**3. [Rule 3 - Blocking] Aligned headless bindings with generated Convex reference invariance**
- **Found during:** Task 3 external consumer typecheck
- **Issue:** Generated host references use validated strings and required pagination arguments, which could not satisfy invariant references parameterized by branded IDs or optional pagination.
- **Fix:** Kept brands at DTO/hook boundaries while typing generated reference arguments as strings and requiring `paginationOpts` on native paginated references.
- **Files modified:** `src/react/bindings.ts`, `fixtures/packed-vite-convex/convex/afferent.ts`
- **Verification:** Root typecheck and clean external consumer codegen/typecheck pass.
- **Committed in:** `5d9f577`

**4. [Rule 3 - Blocking] Updated the real pagination seed for Phase 2 actor rate limits**
- **Found during:** Final `npm run test:phase2` verification
- **Issue:** The older harness attempted 50 public creates as one actor; the intentional five-post actor limit left only three posts on the target board and invalidated the pagination assertion.
- **Fix:** Seeded each post with a distinct trusted fixture actor, retained the actor by post ID, and used the correct owner for later edit/withdraw checks.
- **Files modified:** `scripts/test-pagination-backend.mjs`
- **Verification:** The real Convex pagination matrix and the exact complete Phase 2 gate pass.
- **Committed in:** `a24279f`

---

**Total deviations:** 4 auto-fixed (1 Rule 1, 1 Rule 2, 2 Rule 3). **Impact on plan:** All changes were required to make the planned public contract exact and executable from generated consumer code; no new product capability or dependency was added.

## Issues Encountered

- The first complete composite run reached every green suite but the final packed parent test timed out while its child process remained alive. No backend processes remained afterward, the standalone packed gate passed immediately in 23.6 seconds, and a clean rerun of the exact composite command completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-11 can replace the provisional merge implementation while preserving the now-frozen headless/result/export contracts.
- Phase 3 can build copy-owned UI exclusively against afferent/react.js and consumer-generated host references.
- No blockers remain for the final Phase 2 merge correction and verification pass.

## Self-Check

PASSED: all listed artifacts exist, all four implementation commits resolve, and the exact build plus Phase 2 gate completed successfully.

---
*Phase: 02-complete-feedback-to-changelog-workflow*
*Completed: 2026-07-17*
