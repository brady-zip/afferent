---
phase: 01-secure-installable-feedback-board
plan: "04"
subsystem: feedback-participation
tags: [convex, votes, comments, anonymization, scope-isolation, privacy]

requires:
  - phase: 01-secure-installable-feedback-board
    plan: "03"
    provides: Scope guards, provider-neutral host clients, actor upsert, post DTOs, and transactional post lifecycle
provides:
  - Idempotent desired-state vote membership with exact transactional count projection
  - Flat bounded comments with one same-post root-parent reply edge
  - Explicit host-authorized actor anonymization that retains content and participation history
affects: [01-05, phase-2-discovery, phase-2-moderation, headless-react]

tech-stack:
  added: []
  patterns:
    - Membership rows are canonical while counters are transactionally maintained projections
    - Validate scoped target and parent relationships before actor upsert or any mutation
    - Anonymized actors retain stable IDs while public DTOs emit one generic attribution

key-files:
  created:
    - src/component/model/votes.ts
    - src/component/participation/votes.ts
    - src/component/model/comments.ts
    - src/component/public/comments.ts
    - src/component/participation/comments.ts
    - src/component/admin/actors.ts
    - tests/model/votes.test.ts
    - tests/model/comments.test.ts
    - tests/component/participation.test.ts
    - tests/component/anonymization.test.ts
  modified:
    - src/component/schema.ts
    - src/component/model/actors.ts
    - src/component/model/views.ts
    - src/component/validators.ts
    - src/client/contracts.ts
    - src/client/internal.ts
    - tests/integration/scope-matrix.test.ts

key-decisions:
  - "Use one scope/post/actor vote membership as canonical state and maintain voteCount only when desired membership changes."
  - "Represent replies as independent comment rows with one optional same-scope, same-post root parent ID."
  - "Use Convex mutation-scoped strong pseudo-randomness for 128-bit domain-tagged anonymization tombstones and retain stable actor relationships."

patterns-established:
  - "Preflight before identity mutation: scope-check active targets and parent relationships before actor upsert."
  - "Flat discussion DTO: comment pages expose independent rows and optional opaque parent IDs, never recursive reply trees."
  - "Privacy-preserving erasure: replace the provider key, remove display PII, preserve the actor ID, and map it to Anonymous."

requirements-completed:
  - ACCS-02
  - ACCS-03
  - ACCS-05
  - FDBK-05
  - FDBK-06
  - FDBK-07
  - FDBK-08
  - COMP-02
  - COMP-03
  - COMP-07

coverage:
  - id: D1
    description: "Authenticated actors set or clear exactly one vote membership with retry-safe exact totals under concurrent and mixed calls."
    requirement: FDBK-05
    verification:
      - kind: unit
        ref: "tests/model/votes.test.ts#vote membership projection"
        status: pass
      - kind: integration
        ref: "tests/component/participation.test.ts#sets one retry-safe vote membership and reconciles its projection"
        status: pass
      - kind: integration
        ref: "tests/integration/scope-matrix.test.ts#server-derived scope isolation"
        status: pass
    human_judgment: false
  - id: D2
    description: "Authenticated actors add bounded flat comments and one-level same-post replies without partial writes or count drift."
    requirement: FDBK-07
    verification:
      - kind: unit
        ref: "tests/model/comments.test.ts#comment model"
        status: pass
      - kind: integration
        ref: "tests/component/participation.test.ts#adds flat root comments and one-level replies with exact totals"
        status: pass
      - kind: integration
        ref: "tests/integration/scope-matrix.test.ts#server-derived scope isolation"
        status: pass
    human_judgment: false
  - id: D3
    description: "Independently authorized hosts anonymize actors irreversibly while content, votes, comments, attribution links, and totals remain intact."
    requirement: ACCS-05
    verification:
      - kind: integration
        ref: "tests/component/anonymization.test.ts#actor anonymization"
        status: pass
      - kind: integration
        ref: "tests/integration/scope-matrix.test.ts#server-derived scope isolation"
        status: pass
    human_judgment: false
  - id: D4
    description: "Vote, comment, and anonymization browser contracts omit authority, provider records, and internal scope while DTOs remain flat and provider-neutral."
    requirement: COMP-03
    verification:
      - kind: unit
        ref: "tests/static/contracts.test.ts#public contract privacy"
        status: pass
    human_judgment: false

duration: 1h 30m
completed: 2026-07-16
status: complete
---

# Phase 1 Plan 04: Participation and Actor Privacy Summary

**Afferent now has transactional one-membership voting, bounded flat discussions, and irreversible actor anonymization that preserves historical content and exact totals.**

## Performance

- **Duration:** 1h 30m
- **Started:** 2026-07-16T13:09:31Z
- **Completed:** 2026-07-16T14:39:19Z
- **Tasks:** 3
- **Files modified:** 23

## Accomplishments

- Added retry-safe `setVote` desired-state semantics with a scope-first unique membership lookup, atomic counter projection, mixed-concurrency coverage, and a bounded reconciliation helper used only by tests.
- Added scope-indexed cursor pagination for independent comment rows plus one optional root-parent edge, rejecting missing, nested, cross-post, cross-scope, and withdrawn relationships before writes.
- Added an independently host-authorized `anonymizeActor` intent that replaces linkable identity with a random tombstone, removes display PII, preserves all stable relationships, and renders one generic public author label.
- Extended fixed and server-scoped clients, generated component bindings, DTO validators, privacy audits, and the two-scope adversarial matrix without introducing a dependency or touching package metadata.

## Task Commits

Each TDD task was committed with a failing contract before its implementation:

1. **Task 1 RED: vote participation contracts** - `c01ddc6`
2. **Task 1 GREEN: idempotent vote membership** - `6ff19b7`
3. **Task 2 RED: flat comment contracts** - `b54bfab`
4. **Task 2 GREEN: bounded flat comments** - `918c84a`
5. **Task 3 RED: anonymization contracts** - `e55b26d`
6. **Task 3 GREEN: retained-history anonymization** - `878328c`
7. **Quality fix: bounded reconciliation and mixed concurrency** - `1376ba3`

## Files Created/Modified

- `src/component/model/votes.ts` and `participation/votes.ts` - Canonical membership lookup, desired-state projection, reconciliation, and transactional mutation.
- `src/component/model/comments.ts`, `public/comments.ts`, and `participation/comments.ts` - Body validation, root-parent guards, flat DTO mapping, bounded pages, and transactional creation.
- `src/component/admin/actors.ts` and `model/actors.ts` - Scope-safe explicit anonymization with a domain-tagged 128-bit random tombstone.
- `src/component/schema.ts` and `validators.ts` - Mandatory-scope vote/comment tables, scope-leading indexes, and versioned DTO validators.
- `src/client/` - Branded vote/comment/admin intents and fixed/scoped host capability implementations.
- `tests/model/`, `tests/component/`, `tests/static/contracts.test.ts`, and `tests/integration/scope-matrix.test.ts` - Projection, privacy, authority, concurrency, relationship, and two-scope proofs.

## Decisions Made

- Membership rows, not counters, are canonical vote state; `voteCount` changes only in the same transaction as membership insertion or deletion.
- Comment reply context stays flat: the optional parent must be a root comment from the same scope and post.
- Anonymization uses Convex's mutation-scoped strong pseudo-random generator to create a non-derived 128-bit tombstone under the reserved `afferent:anonymous:v1:` domain.
- Repeated anonymization is idempotent; registration with the old verified external key creates a distinct actor and never relinks retained history.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Bounded the test-only vote reconciliation query**
- **Found during:** Final plan-level query-bound audit
- **Issue:** Exact reconciliation initially collected every membership for a post, violating the repository requirement that every query path be explicitly bounded.
- **Fix:** Replaced collection with an indexed 10,001-row take, fail-closed above the 10,000-row reconciliation ceiling, and added mixed concurrent desired-state coverage.
- **Files modified:** `src/component/model/votes.ts`, `tests/component/participation.test.ts`
- **Verification:** Model/component tests, typecheck, lint, build, scope matrix, and packed-consumer gate all pass.
- **Committed in:** `1376ba3`

---

**Total deviations:** 1 auto-fixed (1 Rule 2). **Impact on plan:** The fix enforces the existing bounded-query release criterion without expanding the public API or product scope.

## Issues Encountered

- The plan's `test:model` and `test:scope` script aliases are not present in the existing dirty package manifest. As in Plan 01-03, equivalent Vitest paths were executed directly to preserve the user's unrelated TypeScript 7 package and lockfile work.
- Context7 was unavailable for the Convex randomness lookup, so the official Convex runtime documentation was consulted; it documents mutation-scoped seeded strong pseudo-randomness compatible with deterministic retries.

## User Setup Required

None - no external service configuration or new dependency is required.

## Next Phase Readiness

- Plan 01-05 can exercise the completed vote, comment, anonymization, authority, DTO, and scope capabilities through all provider fixtures and the packed consumer.
- No Plan 01-04 blocker remains.

## Self-Check: PASSED

- All 23 created or modified Plan 01-04 artifacts exist.
- Commits `c01ddc6`, `6ff19b7`, `b54bfab`, `918c84a`, `e55b26d`, `878328c`, and `1376ba3` exist in history.
- Model/component/static suites pass 18 tests; the scope/pagination configuration passes 3 tests.
- Typecheck, build, lint, and the external packed-consumer walking skeleton pass.
- Stub scan found no TODO, FIXME, placeholder, coming-soon, or unavailable implementation in Plan 01-04 files.
- No unmodeled threat surface was introduced beyond the plan's vote, comment, and actor-erasure trust boundaries.

---
*Phase: 01-secure-installable-feedback-board*
*Completed: 2026-07-16*
