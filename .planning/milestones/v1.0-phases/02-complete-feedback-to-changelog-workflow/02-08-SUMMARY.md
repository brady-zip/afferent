---
phase: 02-complete-feedback-to-changelog-workflow
plan: "08"
subsystem: notifications
tags: [convex, subscriptions, notifications, scheduler, pagination, react-hooks]

requires:
  - phase: 02-03
    provides: Shared visibility, moderation, rate limits, activity, and safe Markdown
  - phase: 02-07
    provides: Changelog publication guards and linked-feedback editorial lifecycle
provides:
  - Durable per-post subscription membership with explicit opt-out
  - Fixed five-event notification taxonomy with initiator exclusion and recipient dedupe
  - Transactional event capture plus inline or 50-row resumable fan-out
  - Bounded 500-row inbox with exact unread projection and idempotent mark-read
  - Provider-neutral notification host capabilities and headless React hooks
affects: [02-05-merge, 02-09-delivery-outbox, 02-10-unified-headless, phase-3-copied-ui]

tech-stack:
  added: []
  patterns:
    - Immutable logical event and recipient snapshot as fan-out truth
    - One scheduled continuation chain with idempotent recipient materialization
    - Convex-native reversible optimism limited to subscription and mark-read operations

key-files:
  created:
    - src/component/model/mentions.ts
    - src/component/model/notifications.ts
    - src/component/participation/subscriptions.ts
    - src/component/notifications/events.ts
    - src/component/notifications/fanout.ts
    - src/component/notifications/inbox.ts
    - src/component/jobs/fanout.ts
    - src/react/hooks/notifications.ts
    - tests/model/notifications.test.ts
    - tests/component/notifications.test.ts
    - tests/integration/fanout-backend.test.ts
    - tests/react/notifications.test.tsx
  modified:
    - src/component/schema.ts
    - src/component/participation/posts.ts
    - src/component/participation/comments.ts
    - src/component/admin/posts.ts
    - src/component/admin/changelog.ts
    - src/client/contracts.ts
    - src/client/internal.ts
    - src/react/bindings.ts
    - src/react/index.ts

key-decisions:
  - "Snapshot eligible recipients into scope-owned event-recipient rows before inbox materialization so retries and later subscription changes cannot alter an accepted event."
  - "Materialize ten or fewer recipients inline and route larger sets through one 50-row scheduled continuation chain."
  - "Enforce a 500-row per-actor inbox while retaining immutable logical events and an exact transactionally reconciled unread projection."
  - "Use the optional opaque sessionGeneration only as browser query identity so actor switches reset helper pages and optimism without conferring authority."

patterns-established:
  - "Notification truth: immutable event plus unique event-recipient membership; inbox rows are bounded derived signals."
  - "Subscription truth: desired-state membership preserves explicit opt-out against later author/commenter auto-subscribe."
  - "Actor-sensitive hooks: authenticated query arguments include session generation and clear pending/error overlays when it changes."

requirements-completed:
  [NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-07, UI-01, UI-02, UI-03, QUAL-01]

coverage:
  - id: D1
    description: Authors and commenters auto-subscribe, explicit opt-out remains durable, voting does not subscribe, and desired-state subscription writes are idempotent.
    requirement: NOTF-01
    verification:
      - kind: integration
        ref: tests/component/notifications.test.ts#preserves durable opt-out and does not subscribe voters
        status: pass
    human_judgment: false
  - id: D2
    description: Status, admin-reply, reply-or-mention, and linked-changelog events use the fixed taxonomy, exclude initiators, suppress invalid or anonymized targets, and dedupe recipients.
    requirement: NOTF-02
    verification:
      - kind: unit
        ref: tests/model/notifications.test.ts#notification model
        status: pass
      - kind: integration
        ref: tests/component/notifications.test.ts#captures only the fixed event taxonomy with recipient dedupe
        status: pass
      - kind: integration
        ref: tests/component/changelog.test.ts#manual changelog lifecycle
        status: pass
    human_judgment: false
  - id: D3
    description: Large recipient sets are transactionally captured and materialized by one idempotent 50-row real-Convex scheduler chain.
    requirement: QUAL-01
    verification:
      - kind: integration
        ref: tests/integration/fanout-backend.test.ts#resumes one 50-row chain without duplicate recipient rows
        status: pass
      - kind: integration
        ref: node scripts/test-fanout-backend.mjs
        status: pass
    human_judgment: false
  - id: D4
    description: Inbox pages are newest-first, deduplicated, capped at 500 rows, and maintain exact unread counts under trim and repeated mark-read.
    requirement: NOTF-07
    verification:
      - kind: integration
        ref: tests/component/notifications.test.ts#keeps exact unread counts idempotent and trims the oldest row at 501
        status: pass
    human_judgment: false
  - id: D5
    description: Framework-light hooks expose unsupported, unauthenticated, loading, empty, ready, pagination, pending, error, reset, and allowed optimistic states over injected host references.
    requirement: UI-01
    verification:
      - kind: integration
        ref: tests/react/notifications.test.tsx#headless notification hooks
        status: pass
      - kind: other
        ref: npm run typecheck and npm run lint and npm run build
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-07-16
status: complete
---

# Phase 02 Plan 08: Subscriptions and In-App Notifications Summary

**Afferent now captures a fixed provider-neutral notification taxonomy transactionally, fans it out through a bounded resumable scheduler chain, and exposes an exact capped inbox through safe headless React hooks.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-16T23:30:28Z
- **Completed:** 2026-07-16T23:43:30Z
- **Tasks:** 3
- **Files modified:** 29

## Accomplishments

- Added durable subscription/opt-out membership, author/commenter auto-subscription, structured actor-ID mentions, and transactional capture for the five locked notification event types.
- Added immutable recipient snapshots, idempotent inbox materialization, a single 50-row continuation chain, a 500-row retention cap, and exact unread counters proven against real Convex scheduling.
- Added provider-neutral host clients plus subscription, inbox, unread-count, and mark-read hooks with helper-owned pagination, account-generation resets, duplicate guards, and reversible native optimism.

## Task Commits

Each task was committed atomically:

1. **Task 1: Specify recipient eligibility, dedupe, retention, and fan-out recovery** - `bf4c8f0` (test)
2. **Task 2: Implement transactional logical events and bounded inbox fan-out** - `c4a0cac` (feat)
3. **Task 3: Expose subscriptions and inbox through safe optimistic hooks** - `6ea49c7` (feat)
4. **Real-backend gate: Verify scheduled fan-out and repeated capture** - `3d0ac20` (test)

## Files Created/Modified

- `src/component/model/notifications.ts` and `src/component/model/mentions.ts` - Fixed taxonomy, bounds, recipient union, opt-out policy, and structured mention resolution.
- `src/component/participation/subscriptions.ts` - Desired-state subscribe/unsubscribe plus non-overriding implicit subscription.
- `src/component/notifications/events.ts` and `fanout.ts` - Immutable event/recipient capture and idempotent inbox materialization.
- `src/component/jobs/fanout.ts` - One resumable 50-row internal scheduled-mutation chain.
- `src/component/notifications/inbox.ts` - Actor-owned cursor pages, unread projection, idempotent read, and bounded retention repair.
- `src/component/schema.ts` - Scope-leading subscription, event, recipient, job, inbox, and unread tables/indexes.
- `src/client/contracts.ts`, `internal.ts`, and `src/react/hooks/notifications.ts` - Stable DTOs, trusted per-call actor/scope derivation, and framework-light notification behavior.
- `scripts/test-fanout-backend.mjs` - Disposable anonymous Convex scheduler and scope-isolation proof.

## Decisions Made

- Event-recipient rows snapshot accepted eligibility before derived materialization; retries and later opt-outs cannot rewrite history.
- The inline threshold is 10 recipients, continuation batches are 50, event capture is bounded at 1000 recipients, and inbox retention is 500 rows per actor.
- Reply plus mention of the same actor collapses into the reply event; ordinary non-admin root comments emit no subscriber broadcast.
- Structured mentions use the safe plain-text node `@[{opaqueActorId}]`; targets are normalized, scope-checked, and rejected from delivery when invalid or anonymized.
- Only subscription and mark-read mutations install Convex-native reversible optimistic updates; server truth remains authoritative.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Registered the new scheduler test in the integration Vitest config**
- **Found during:** Task 2 fan-out verification
- **Issue:** The repository integration config enumerated prior backend tests explicitly, so the new fan-out test was not discoverable.
- **Fix:** Added `tests/integration/fanout-backend.test.ts` to `vitest.scope.config.ts` and retained the dedicated real-backend script.
- **Files modified:** `vitest.scope.config.ts`, `scripts/test-fanout-backend.mjs`
- **Verification:** The in-memory crash/repeat test and disposable real Convex scheduler harness both pass.
- **Committed in:** `c4a0cac`, `3d0ac20`

---

**Total deviations:** 1 auto-fixed (1 Rule 3). **Impact on plan:** The fix only connected the planned integration proof to the repository test runner; no product scope changed.

## Issues Encountered

- The first scheduler harness revision used the in-memory Convex test backend. Before close-out it was upgraded to a disposable anonymous real backend, while the in-memory suite remains the deterministic crash/resume and repeated-batch proof.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-05 can union and reparent `postSubscriptions` while preserving durable opt-outs and immutable notification history.
- Plan 02-09 can materialize host-delivery rows from the completed logical event and recipient substrate without changing inbox semantics.
- Plan 02-10 and Phase 3 can consume stable notification bindings and hooks without reimplementing actor authority, pagination, or optimism.

## Known Stubs

None.

## Self-Check: PASSED

- All declared created files exist and commits `bf4c8f0`, `c4a0cac`, `6ea49c7`, and `3d0ac20` exist.
- Notification model/component/React/static suites pass, including 501-row retention and two-scope isolation.
- Disposable real Convex scheduling materializes 51 recipients exactly once through the bounded chain.
- Full `npm test`, typecheck, lint, build, and packed-consumer gates pass.
- Stub and threat-surface scans found no untracked implementation placeholder or unmodeled boundary beyond the plan register.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-16_
