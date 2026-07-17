---
phase: 02-complete-feedback-to-changelog-workflow
plan: "09"
subsystem: delivery-outbox
tags: [convex, notifications, outbox, leases, fencing, server-client]

requires:
  - phase: 02-08
    provides: Immutable logical notification events, eligible recipient snapshots, and bounded inbox fan-out
provides:
  - One provider-neutral delivery row for every materialized eligible notification recipient
  - Max-50 five-minute leased claims with owner and monotonic-version fencing
  - At-least-once ack/release, expiry reclaim, bounded backoff, attempt-eight dead letters, and ack pruning
  - Fresh non-PII recipient-key resolution and anonymized-recipient discard at claim time
  - Explicit trusted-server delivery client absent from root and React browser surfaces
affects: [02-10-unified-headless, phase-4-hosted-demo, host-delivery-workers]

tech-stack:
  added: []
  patterns:
    - Inbox and host delivery are two idempotent materializations of one immutable event-recipient row
    - External side effects use at-least-once leases fenced by owner and incrementing version
    - Contact and channel resolution remain host-owned while the component returns only a current provider-neutral recipient key

key-files:
  created:
    - src/component/notifications/outbox.ts
    - src/component/jobs/outbox.ts
    - tests/component/outbox.test.ts
    - tests/integration/outbox-backend.test.ts
    - scripts/test-outbox-backend.mjs
  modified:
    - src/component/schema.ts
    - src/component/validators.ts
    - src/component/notifications/fanout.ts
    - src/component/feedback.ts
    - src/client/contracts.ts
    - src/client/internal.ts
    - src/client/server.ts
    - tests/static/contracts.test.ts

key-decisions:
  - "Use the logical notification event ID as the stable host idempotency key while keeping delivery ordering explicitly best effort through snapshotted sequence and occurrence time."
  - "Fence every ack and release by scope, delivery row, owner, and incrementing lease version so expired workers cannot mutate reclaimed work."
  - "Resolve the actor externalKey only when claiming and delete undeliverable rows for missing or anonymized actors before returning any lease."
  - "Require a host-owned authorizeDelivery callback on every createDeliveryClient operation and export that factory only from afferent/server.js."

patterns-established:
  - "Derived delivery truth: event-recipient membership creates at most one inbox row and one delivery row through scope-leading uniqueness indexes."
  - "Fenced host work: claim changes pending or expired work to one active five-minute lease; only its exact owner/version may ack or release."
  - "Bounded poison handling: release increments attempts, applies capped exponential backoff, and parks the eighth failure."

requirements-completed: [NOTF-06, QUAL-01]

coverage:
  - id: D1
    description: Every eligible logical notification recipient materializes exactly one typed delivery row without contact, display, provider, rendered-message, or other PII fields.
    requirement: NOTF-06
    verification:
      - kind: integration
        ref: tests/component/outbox.test.ts#materializes one PII-free delivery row with the inbox recipient
        status: pass
      - kind: unit
        ref: tests/static/contracts.test.ts#keeps delivery payloads versioned, typed, and free of PII fields
        status: pass
    human_judgment: false
  - id: D2
    description: At most 50 rows are claimed under five-minute owner/version-fenced leases; expiry reclaims at least once while stale ack and release are rejected.
    requirement: NOTF-06
    verification:
      - kind: integration
        ref: tests/component/outbox.test.ts#claims at most 50 rows, fences stale workers, and reclaims expiry
        status: pass
      - kind: integration
        ref: tests/integration/outbox-backend.test.ts#serializes two workers and rejects a stale ack after expiry
        status: pass
      - kind: integration
        ref: node scripts/test-outbox-backend.mjs
        status: pass
    human_judgment: false
  - id: D3
    description: Releases back off from 30 seconds to a one-hour cap, the eighth failed attempt parks, acked rows prune in batches of 50, and anonymized actors are discarded before delivery.
    requirement: NOTF-06
    verification:
      - kind: integration
        ref: tests/component/outbox.test.ts#releases with bounded backoff and parks attempt eight
        status: pass
      - kind: integration
        ref: tests/component/outbox.test.ts#discards anonymized recipients, isolates scopes, and prunes acked rows
        status: pass
    human_judgment: false
  - id: D4
    description: Host workers use an explicitly authorized per-call scope-resolving delivery client exported only from afferent/server.js, with no root or React delivery capability.
    requirement: NOTF-06
    verification:
      - kind: unit
        ref: tests/static/contracts.test.ts#keeps delivery leases on the explicit server-only surface
        status: pass
      - kind: other
        ref: npm run typecheck and npm run lint and npm run build
        status: pass
    human_judgment: false

duration: 31min
completed: 2026-07-16
status: complete
---

# Phase 02 Plan 09: Vendor-Neutral Delivery Outbox Summary

**Afferent now turns each eligible notification recipient into a privacy-safe host delivery event claimed through bounded, fenced, at-least-once leases on an explicitly authorized server-only client.**

## Performance

- **Duration:** 31 min
- **Started:** 2026-07-17T01:36:52Z
- **Completed:** 2026-07-17T02:07:56Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Added scope-owned delivery rows materialized idempotently beside inbox rows from the same immutable logical recipient event, with typed opaque facts and no stored contact, provider, display, or rendered content.
- Added max-50 atomic claims, five-minute lease expiry, owner/version fencing, ack, capped exponential release backoff, attempt-eight dead letters, anonymized-recipient discard, and 50-row ack pruning.
- Added a typed `createDeliveryClient` server entry point that resolves scope and authorizes delivery on every call while remaining absent from root and React browser bindings.
- Proved concurrent claims and ack behavior on both the deterministic component harness and a disposable anonymous Convex deployment.

## Task Commits

Each task was committed atomically:

1. **Task 1: Specify vendor-neutral delivery, fencing, and poison handling** - `caac9bf` (test)
2. **Task 2: Implement fenced leased delivery and bounded maintenance** - `a53945c` (feat)
3. **Task 3: Expose delivery only through the trusted server client** - `7bb58d3` (feat)

## Files Created/Modified

- `src/component/notifications/outbox.ts` - Idempotent delivery materialization plus bounded claim, ack, and release operations.
- `src/component/jobs/outbox.ts` - Scope-safe 50-row pruning for acknowledged deliveries.
- `src/component/schema.ts` and `validators.ts` - Scope-leading delivery indexes, closed state, and versioned DTO validators.
- `src/component/notifications/fanout.ts` - One inbox and one host-delivery materialization from each accepted event-recipient row.
- `src/client/contracts.ts`, `internal.ts`, and `server.ts` - Typed host delivery events/leases/results and the per-call authorized server-only capability.
- `tests/component/outbox.test.ts` and `tests/integration/outbox-backend.test.ts` - Deterministic privacy, fencing, expiry, retry, prune, anonymization, and concurrency proofs.
- `scripts/test-outbox-backend.mjs` - Disposable real Convex concurrent worker and stable-idempotency proof.

## Decisions Made

- Kept the logical event ID as the host's stable idempotency key; sequence and occurrence time are snapshotted hints rather than a strict delivery ordering guarantee.
- Used a five-minute lease, max-50 claims, a 30-second exponential base capped at one hour, and dead-letter parking on attempt eight.
- Deleted missing or anonymized recipient rows during claim rather than returning an undeliverable lease or retaining current identity data in the event.
- Kept delivery outside `AfferentClient`; consumers opt into `createDeliveryClient` from `afferent/server.js` and provide a host-owned authority check.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Registered the outbox concurrency test in the integration Vitest config**
- **Found during:** Task 1 red contract setup
- **Issue:** The repository integration config enumerates backend test files explicitly, so the planned outbox test would not run in the integration layer without registration.
- **Fix:** Added `tests/integration/outbox-backend.test.ts` to `vitest.scope.config.ts`.
- **Files modified:** `vitest.scope.config.ts`
- **Verification:** The dedicated integration invocation runs and passes the concurrent claim/stale-ack test.
- **Committed in:** `caac9bf`

---

**Total deviations:** 1 auto-fixed (1 Rule 3). **Impact on plan:** The change only made the planned integration proof discoverable; no product scope or package surface changed.

## Issues Encountered

- The full Task 2 verification includes the server-contract assertions that intentionally remained red until Task 3. Component/schema, real-backend, typecheck, and lint gates passed before Task 2 was committed; the complete combined gate passed after Task 3.

## User Setup Required

None - external channel/contact resolution remains host-owned, and the real-backend proof uses a disposable anonymous Convex deployment.

## Next Phase Readiness

- Plan 02-10 can include notifications in the unified headless contract while keeping delivery deliberately absent from browser bindings.
- Hosts can implement email, push, or other channel workers with their own contact lookup and idempotent sender keyed by the stable event ID.
- Plan 02-11 can correct the independent large-merge visibility gap without changing the completed outbox contract.

## Known Stubs

None.

## Self-Check: PASSED

- All five declared new paths exist and commits `caac9bf`, `a53945c`, and `7bb58d3` exist.
- Component/static suites pass 22 tests; outbox/fan-out integration suites pass 2 tests.
- Disposable real Convex outbox and fan-out harnesses pass.
- Typecheck, lint, and build pass.
- Stub and threat-surface scans found no implementation placeholder or unmodeled security boundary beyond the plan's host-worker and fenced-lease threat register.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-16_
