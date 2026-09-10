---
phase: 01-secure-installable-feedback-board
plan: "03"
subsystem: secure-feedback-domain
tags: [convex, scope-isolation, dto, pagination, ownership, npm-package]

requires:
  - phase: 01-secure-installable-feedback-board
    plan: "02"
    provides: Packed component skeleton, fixed-scope host client, and external consumer gate
provides:
  - Server-derived opaque scopes with fixed and scoped clients over one capability surface
  - Scope-complete multi-board browse and author-owned create/edit/withdraw lifecycle
  - Versioned private DTO mapping with structural contract audits
  - Reactive component pagination proven on convex-test and a real local Convex backend
affects: [01-04, 01-05, phase-4-sandbox, headless-react, package-gate]

tech-stack:
  added: [convex-helpers-runtime]
  patterns:
    - Resolve scope before actor/admin authority and before every component call
    - Normalize opaque string IDs inside scope guards to preserve not-found equivalence
    - Map only paginator pages while preserving cursor and split metadata

key-files:
  created:
    - src/client/server.ts
    - src/client/scope.ts
    - src/component/model/scope.ts
    - src/component/public/posts.ts
    - src/component/participation/posts.ts
    - tests/integration/pagination-backend.test.ts
    - scripts/test-pagination-backend.mjs
  modified:
    - src/component/schema.ts
    - src/component/validators.ts
    - src/client/contracts.ts
    - src/client/index.ts
    - package.json

key-decisions:
  - "Derive sandbox scopes with full base64url SHA-256 over the domain-separated verified external key."
  - "Accept opaque IDs as strings at the component boundary and normalize them inside shared scope guards so malformed and cross-scope IDs return the same public error."
  - "Ship convex-helpers as a regular runtime dependency because the component paginator is an internal implementation detail required by packed consumers."

patterns-established:
  - "Scope-first guard sequence: resolve scope, derive actor/admin authority, call component, re-check record scope, map DTO."
  - "Transactional ownership: actor refresh and author-scoped post mutation share one Convex transaction."
  - "Reactive pagination: security predicates stay in the index range and all helper metadata survives DTO mapping."

requirements-completed:
  - ACCS-01
  - ACCS-02
  - ACCS-03
  - ACCS-04
  - ACCS-05
  - ACCS-06
  - FDBK-01
  - FDBK-02
  - FDBK-03
  - FDBK-04
  - FDBK-08
  - COMP-02
  - COMP-03
  - COMP-07
  - QUAL-03

coverage:
  - id: D1
    description: "Fixed and server-resolver clients isolate identical multi-board installations across list, get, create, count, and reactive reads."
    requirement: ACCS-06
    verification:
      - kind: integration
        ref: "npm exec -- vitest run --config vitest.scope.config.ts"
        status: pass
      - kind: unit
        ref: "tests/static/schema-scope.test.ts#scope-complete schema"
        status: pass
    human_judgment: false
  - id: D2
    description: "Authenticated authors create, edit, and withdraw retained posts while other actors and scopes are rejected."
    requirement: FDBK-04
    verification:
      - kind: unit
        ref: "tests/component/posts.test.ts#author-owned post lifecycle"
        status: pass
    human_judgment: false
  - id: D3
    description: "Versioned post DTOs expose only opaque IDs, board, safe author snapshot, open status, totals, and tags."
    requirement: COMP-03
    verification:
      - kind: unit
        ref: "tests/static/contracts.test.ts#public contract privacy"
        status: pass
    human_judgment: false
  - id: D4
    description: "Ten-item component pages preserve cursor and split metadata and remain scope-correct across reactive insert, edit, and withdrawal."
    requirement: FDBK-01
    verification:
      - kind: integration
        ref: "tests/integration/pagination-backend.test.ts#component-compatible post pagination"
        status: pass
      - kind: integration
        ref: "node scripts/test-pagination-backend.mjs"
        status: pass
    human_judgment: false
  - id: D5
    description: "The packed artifact installs its pagination runtime dependency and passes component codegen, typecheck, interaction, and build in an external consumer."
    requirement: QUAL-03
    verification:
      - kind: integration
        ref: "npm run test:package"
        status: pass
    human_judgment: false

duration: 21 min
completed: 2026-07-16
status: complete
---

# Phase 1 Plan 03: Secure Multi-Board Feedback Lifecycle Summary

**Afferent now provides server-derived scope isolation, author-owned retained posts, private versioned DTOs, and reactive component pagination proven on both mock and real Convex runtimes.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-07-16T05:01:34Z
- **Completed:** 2026-07-16T05:22:59Z
- **Tasks:** 3
- **Files modified:** 27

## Accomplishments

- Added the explicit scoped server client and domain-separated SHA-256 scope derivation while preserving the hidden fixed scope for normal single-product installations.
- Split the walking skeleton into scope guards, board/post reads, installation configuration, actor refresh, and separate create/edit/withdraw intents with stable DTO mapping.
- Replaced bounded post collection with the component-compatible paginator, preserved full metadata, and proved reactive isolation with two identical scopes and 50 posts per scope.
- Kept the package artifact installable by declaring the approved paginator helper as a runtime dependency and rerunning the external packed-consumer gate.

## Task Commits

Each TDD task was committed with a failing contract before its implementation:

1. **Task 1 RED: scope isolation contract** - `c39734b`
2. **Task 1 GREEN: server-derived scope isolation** - `a050ef6`
3. **Task 2 RED: post lifecycle contract** - `a141a3a`
4. **Task 2 GREEN: author-owned post lifecycle** - `911cffb`
5. **Task 3 RED: pagination isolation matrix** - `e5ae354`
6. **Task 3 GREEN: reactive scope-safe pagination** - `bb3e8fb`
7. **Artifact fix: pagination runtime dependency** - `b5616bd`
8. **Artifact fix: packed fixture metadata** - `ea37ec9`
9. **Quality fix: final lint and verification findings** - `13b4dce`

## Files Created/Modified

- `src/client/` - Fixed/scoped factories, server-only scope derivation, provider-neutral capabilities, branded DTO types, and paginator contracts.
- `src/component/model/` - Structured errors, fail-closed scope guards, actor upsert, and explicit DTO mapping.
- `src/component/public/` - Policy-aware bounded board reads and scope-first component pagination for posts.
- `src/component/participation/posts.ts` - Separate create, author edit, and history-preserving withdrawal mutations.
- `src/component/admin/installation.ts` - Idempotent installation policy and bounded ordered board configuration.
- `tests/static/`, `tests/component/`, and `tests/integration/` - Schema, privacy, ownership, two-scope, reactive, and real-backend proofs.
- `scripts/test-pagination-backend.mjs` - Disposable real Convex deployment harness for the pagination matrix.
- `package.json` and the packed fixture wrapper - Runtime helper declaration and full page-result validation.

## Decisions Made

- Used the full 32-byte SHA-256 digest encoded as 43-character base64url, with `afferent:scope:v1\0` domain separation and a frozen vector.
- Kept IDs as branded strings in public types and `v.string()` at component boundaries, then used `normalizeId` inside shared table guards to prevent validator errors from becoming an existence oracle.
- Preserved the existing `posts` array as a compatibility alias while adding canonical `page`, cursor, completion, and split metadata to the versioned page result.
- After live Claude radio review, classified `convex-helpers` as a regular dependency rather than a peer because it is a shipped internal runtime implementation detail.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Security] Normalized malformed opaque IDs before direct access**
- **Found during:** Task 2 scope regression
- **Issue:** `v.id()` rejected malformed IDs before the shared scope guard, making random IDs distinguishable from valid cross-scope IDs.
- **Fix:** Accept string IDs at the component boundary, normalize by table inside the guard, and emit the same structured not-found error for normalization failure and scope mismatch.
- **Files modified:** `src/component/model/scope.ts`, public and participation post functions
- **Verification:** Two-scope matrix compares cross-scope and malformed post IDs.
- **Committed in:** `911cffb`

**2. [Rule 3 - Blocking] Declared the paginator helper as a packed runtime dependency**
- **Found during:** Final packed-consumer regression
- **Issue:** The component imported `convex-helpers/server/pagination`, but packed consumers could not resolve a dev-only dependency.
- **Fix:** After live peer review and orchestrator approval, moved `convex-helpers` to regular dependencies while preserving the user's uncommitted TypeScript 7 and lockfile work.
- **Files modified:** `package.json`
- **Verification:** Packed external consumer and tarball manifest inspection pass.
- **Committed in:** `b5616bd`

**3. [Rule 1 - Regression] Updated the packed host return validator for page metadata**
- **Found during:** Final packed-consumer regression
- **Issue:** The fixture wrapper still validated the legacy list-only shape and rejected new paginator metadata.
- **Fix:** Switched the fixture to the versioned page-result validator and forwarded optional paginator input.
- **Files modified:** `fixtures/packed-vite-convex/convex/afferent.ts`
- **Verification:** `npm run test:package` passes end to end.
- **Committed in:** `ea37ec9`

---

**Total deviations:** 3 auto-fixed (2 Rule 1, 1 Rule 3). **Impact:** All fixes were required for not-found privacy, packed runtime correctness, or regression compatibility; no feature scope was added.

## Issues Encountered

The plan named `test:static`, `test:scope`, and `test:backend` aliases that are not present in the existing dirty package manifest. To preserve unrelated manifest work, the same gates were executed directly with Vitest and the real-backend Node harness. All logical verification gates passed.

## User Setup Required

None - both codegen and the real-backend matrix use disposable anonymous local Convex deployments.

## Next Phase Readiness

Plan 01-04 can build idempotent vote membership, flat comments, and anonymization on the shared scope guards, transactional actor lookup, stable DTO mappers, and real-backend isolation harness. No Plan 01-03 blocker remains.

## Self-Check: PASSED

- All 27 created or modified plan artifacts exist.
- Commits `c39734b`, `a050ef6`, `a141a3a`, `911cffb`, `e5ae354`, `bb3e8fb`, `b5616bd`, `ea37ec9`, and `13b4dce` exist.
- Static/component suites pass 9 tests; scope/pagination suites pass 3 tests.
- Real Convex pagination matrix, packed external consumer, typecheck, build, lint, and tarball dependency inspection pass.
- Stub scan found no TODO, FIXME, placeholder, coming-soon, or unavailable implementation in Plan 01-03 files.

---
*Phase: 01-secure-installable-feedback-board*
*Completed: 2026-07-16*
