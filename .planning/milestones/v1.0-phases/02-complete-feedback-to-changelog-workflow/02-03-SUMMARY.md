---
phase: 02-complete-feedback-to-changelog-workflow
plan: "03"
subsystem: moderation
tags: [convex-components, rate-limiter, activity-history, react-hooks, authorization]
requires:
  - phase: 02-02
    provides: Scope-complete discovery, safe content writes, and trusted host capability bindings
provides:
  - Server-authorized post editing, moves, status changes, discussion locks, archive, and restore intents
  - Append-only scoped activity history with bounded admin-only pagination
  - Fixed actor and sharded-scope participation limits with committed actionable failures
  - Trusted admin capability, moderation, and activity headless hooks
affects: [02-04, 02-05, 02-07, 02-08, 02-10, phase-03]
tech-stack:
  added: ["@convex-dev/rate-limiter@0.3.2"]
  patterns:
    - Expected participation failures return typed values so consumed rate charges commit
    - Every host admin wrapper independently resolves scope, actor, and authorization
    - Moderation hooks expose per-action pending/error state without optimistic authority
key-files:
  created:
    - src/component/admin/posts.ts
    - src/component/admin/activity.ts
    - src/component/model/activity.ts
    - src/component/model/rateLimits.ts
    - src/react/hooks/admin.ts
    - scripts/test-rate-limiter-backend.mjs
  modified:
    - src/component/schema.ts
    - src/component/participation/posts.ts
    - src/component/participation/comments.ts
    - src/component/feedback.ts
    - src/client/internal.ts
key-decisions:
  - "Consume actor and scope limits with reserve false before semantic validation, then return stable expected failures so the transaction commits exactly one charge."
  - "Keep status, lifecycle, and discussion lock orthogonal; Closed remains visible and votable while archive and withdrawal share one visibility predicate."
  - "Store immutable activity with opaque actor IDs and resolve current actor display only at authorized read time."
patterns-established:
  - "Admin intent boundary: host wrappers authorize every call and component mutations independently enforce scoped entity access."
  - "Moderation mutation state: key pending and errors by post plus action, reject duplicate in-flight submits, and never optimistically mutate server authority."
requirements-completed:
  [ADMN-01, ADMN-02, ADMN-05, ADMN-06, ADMN-07, ADMN-08, ADMN-10, UI-01, UI-02, UI-03, QUAL-01]
coverage:
  - id: D1
    description: Authorized admins can edit and move posts, freely set all built-in statuses, lock discussion, archive, and restore while preserving orthogonal state.
    requirement: ADMN-01
    verification:
      - kind: integration
        ref: tests/component/moderation.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Moderation changes append one typed scoped activity row and expose bounded admin-only history with opaque actor identity.
    requirement: ADMN-10
    verification:
      - kind: integration
        ref: tests/component/moderation.test.ts#activity history
        status: pass
    human_judgment: false
  - id: D3
    description: Participation uses fixed actor and sharded scope limits that commit once across validation failures and concurrent OCC retries.
    requirement: QUAL-01
    verification:
      - kind: integration
        ref: tests/component/rate-limits.test.ts
        status: pass
      - kind: e2e
        ref: node scripts/test-rate-limiter-backend.mjs
        status: pass
    human_judgment: false
  - id: D4
    description: Trusted host capabilities expose admin gating, per-action moderation state, duplicate guards, typed errors, and bounded activity through framework-light hooks.
    requirement: UI-01
    verification:
      - kind: unit
        ref: tests/react/admin.test.tsx
        status: pass
      - kind: other
        ref: npm run typecheck && npm run lint
        status: pass
    human_judgment: false
  - id: D5
    description: Moderation, visibility, authorization, generated bindings, and the audited child dependency work from the packed tarball in a clean consumer.
    requirement: QUAL-01
    verification:
      - kind: e2e
        ref: npm test
        status: pass
      - kind: e2e
        ref: npm run test:package
        status: pass
    human_judgment: false
duration: 26min
completed: 2026-07-16
status: complete
---

# Phase 2 Plan 3: Moderation, Activity, and Participation Limits Summary

**Server-authorized moderation with orthogonal lifecycle controls, append-only activity, transaction-correct limits, and trusted headless admin hooks**

## Performance

- **Duration:** 26 min
- **Started:** 2026-07-16T22:10:23Z
- **Completed:** 2026-07-16T22:36:23Z
- **Tasks:** 3
- **Files modified:** 45

## Accomplishments

- Added explicit admin intents for post edits, moves, unrestricted built-in status transitions, discussion locks, archive, restore, and bounded activity inspection, with fresh host authorization on every call.
- Installed and registered the exact audited rate-limiter child, then proved committed validation charges, fixed actor/scope caps, repeated denials, and concurrent OCC behavior on a disposable real Convex backend.
- Kept Closed visible and votable, hid archive and withdrawal consistently across direct/feed/count paths, and recorded moderation/activity changes transactionally without storing mutable actor display data.
- Exposed trusted admin gating plus per-post/per-action moderation and activity hook state, duplicate-submit guards, typed failures, reset controls, and no optimistic authority.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock moderation, activity, and rate-limit behavior** - `96245e7` (test)
2. **Task 2: Implement transactionally coherent moderation, activity, and limits** - `1906c49` (feat)
3. **Task 3: Expose trusted admin gating and moderation mutation state** - `1ef152d` (feat)
4. **Release-gate compatibility and regression closure** - `19c765f` (fix)

## Files Created/Modified

- `src/component/admin/posts.ts` - Narrow, scope-checked moderation and lifecycle mutations.
- `src/component/admin/activity.ts` - Bounded admin-only post activity query.
- `src/component/model/activity.ts` - Typed immutable activity taxonomy and mapping helpers.
- `src/component/model/rateLimits.ts` - Fixed actor and sharded-scope participation policies.
- `src/component/schema.ts` - Discussion lock, lifecycle/activity, and scope-complete index fields.
- `src/component/participation/posts.ts`, `comments.ts`, and `votes.ts` - Committed limit consumption and typed expected failures.
- `src/component/feedback.ts` and `src/client/internal.ts` - Independently authorized host moderation/activity capabilities.
- `src/react/hooks/admin.ts` - Trusted admin gating, keyed moderation mutation state, and activity reads.
- `tests/component/moderation.test.ts` and `tests/component/rate-limits.test.ts` - Two-scope moderation, visibility, activity, and fixed-limit coverage.
- `scripts/test-rate-limiter-backend.mjs` - Real Convex commit/OCC accounting matrix.

## Decisions Made

- Approved and pinned `@convex-dev/rate-limiter@0.3.2` after checking registry identity, repository provenance, integrity metadata, peer compatibility, and absence of install lifecycle scripts.
- Returned expected participation failures as versioned values after consuming limits. Throwing would roll back both the business write and rate charge in the same Convex transaction.
- Used one append-only activity table and typed metadata rather than generic diffs; edit events store only changed field names and reads resolve current actor display from opaque actor identity.
- Required trusted host-generated function references for admin capability and moderation hooks; UI state can hide controls but never confers authority.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing tests to the committed expected-failure and visibility contracts**

- **Found during:** Task 2 full-suite verification
- **Issue:** Phase 1 conformance/scope tests still expected thrown validation failures, and pagination setup attempted 50 public creates despite the new fixed creation cap.
- **Fix:** Asserted typed failures and directly seeded pagination-only fixtures with complete visible ranking fields.
- **Files modified:** `tests/conformance/harness.ts`, `tests/integration/scope-matrix.test.ts`, `tests/integration/pagination-backend.test.ts`
- **Verification:** `npm test`
- **Committed in:** `19c765f`

**2. [Rule 2 - Missing Critical] Published validators for typed participation result unions**

- **Found during:** Packed-consumer verification
- **Issue:** The fixture host function could not declare a Convex return validator for the new successful-or-expected-failure result.
- **Fix:** Exported public error, failure, post-action, and comment-action validators and adopted the post-action validator in the fixture.
- **Files modified:** `src/client/contracts.ts`, `src/client/index.ts`, packed consumer fixture
- **Verification:** `npm run test:package`
- **Committed in:** `19c765f`

**3. [Rule 3 - Blocking] Adapted packed verification to a compiled child component**

- **Found during:** Packed-consumer verification
- **Issue:** The rate-limiter package ships compiled component output without a packaged tsconfig, and component definitions require Convex bundler path injection rather than direct Node execution.
- **Fix:** Kept consumer typechecking enabled during `convex dev`, validated component installation there, and changed the raw Node smoke probe for component config to export resolution only.
- **Files modified:** `scripts/test-packed-consumer.mjs`, `tests/integration/packed-artifact.test.mjs`
- **Verification:** Clean tarball install, Convex upload/codegen, fixture tests, typecheck, build, and publint pass.
- **Committed in:** `19c765f`

**4. [Rule 1 - Bug] Applied the scope bucket to post edits**

- **Found during:** Final invariant review
- **Issue:** Post edits consumed the 30-per-10-minute actor bucket but initially omitted the matching sharded scope bucket required by D-19.
- **Fix:** Routed `edit_post` through the shared comment/edit scope policy.
- **Files modified:** `src/component/model/rateLimits.ts`
- **Verification:** Component rate tests and the real-backend matrix pass.
- **Committed in:** `19c765f`

---

**Total deviations:** 4 auto-fixed (2 correctness bugs, 1 missing public contract, 1 blocking packed-component seam)
**Impact on plan:** Every adjustment was required to preserve the planned security, release-gate, or fixed-limit contract; no product scope was added.

## Issues Encountered

- Convex's `--typecheck-components` mode cannot re-typecheck the audited child package because its compiled distribution omits a component tsconfig. The clean consumer still typechecks its host functions, installs both `afferent` and `afferent/rateLimiter`, runs codegen, and exercises the packed tarball end to end.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - T-02-08 through T-02-11 and T-02-SC are mitigated by per-call host authorization, shared visibility, fixed transactional limits, immutable typed activity, exact dependency pinning, and the real-backend/packed-consumer gates.

## Next Phase Readiness

- Plan 02-04 can build tag administration on the new independently authorized admin capability pattern and transactional projection updates.
- Plans 02-05, 02-07, and 02-08 can consume status/activity transitions to drive roadmap, changelog, and notification behavior without coupling lifecycle or lock state.
- Plan 02-10 can consolidate the established typed action results and keyed mutation state into the final unified headless vocabulary.

## Self-Check: PASSED

- All created files and generated child-component bindings exist.
- Commits `96245e7`, `1906c49`, `1ef152d`, and `19c765f` exist.
- Focused suites, real-backend commit/OCC probes, lint, typecheck, complete `npm test`, and packed-consumer verification pass.
- No task-owned TODO, placeholder, empty implementation, or known stub remains.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-16_
