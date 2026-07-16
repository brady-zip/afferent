---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 01
current_phase_name: Secure Installable Feedback Board
status: executing
stopped_at: Completed 01-07-PLAN.md
last_updated: "2026-07-16T18:48:32.315Z"
last_activity: 2026-07-16
last_activity_desc: Completed Plan 01-07 real provider factory conformance
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 8
  completed_plans: 7
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-14)

**Core value:** SaaS teams can add deeply integrated product feedback to an existing Convex application while retaining native ownership of their data, identity, permissions, and user experience.
**Current focus:** Phase 01 — Secure Installable Feedback Board

## Current Position

Phase: 01 (Secure Installable Feedback Board) — EXECUTING
Plan: 8 of 8
Status: Ready to execute Plan 01-08
Last activity: 2026-07-16 — Completed Plan 01-07 real provider factory conformance

Progress: [█████████░] 88%

## Performance Metrics

**Velocity:**

- Total plans completed: 5
- Average duration: 56 min
- Total execution time: 280 min

**By Phase:**

| Phase    | Plans | Total   | Avg/Plan |
| -------- | ----- | ------- | -------- |
| Phase 01 | 5     | 280 min | 56 min   |

**Recent Trend:**

- Last 5 plans: 8 min, 148 min, 21 min, 90 min, 13 min
- Trend: Secure installable feedback board completed and release-shaped

_Updated after each plan completion_

**Plan History:**

| Plan         | Duration | Tasks   | Files    |
| ------------ | -------- | ------- | -------- |
| Phase 01 P02 | 148 min  | 2 tasks | 30 files |
| Phase 01 P03 | 21 min   | 3 tasks | 27 files |
| Phase 01 P04 | 90 min   | 3 tasks | 23 files |
| Phase 01 P05 | 13m      | 3 tasks | 16 files |
| Phase 01 P06 | 4 min    | 2 tasks | 8 files  |
| Phase 01 P07 | 5 min | 2 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Use four coarse, sequential vertical MVP slices.
- [Phase 1]: Prove the packed component, provider-neutral security boundary, all three auth paths, and a usable feedback board together.
- [Phase 2]: Complete the domain and headless React contract before freezing copied UI source.
- [Phase 4]: Keep normal installs single-product while the public demo uses separate showcase and server-scoped sandbox component instances.
- [Phase 01]: Approved the exact 17-entry npm matrix before installation; provider packages remain fixture-only. — The 2026-07-15 registry and official-source audit found no SLOP or install lifecycle scripts.
- [Phase 01]: Use @auth/core 0.41.2 with @convex-dev/auth 0.0.94 despite the stale latest dist-tag. — The selected version is legitimate and satisfies the auth package peer range.
- [Phase 01]: Generate committed ComponentApi bindings through a disposable anonymous Convex deployment. — The current CLI requires deployment configuration before component codegen.
- [Phase 01]: Publish a declaration-only component tsconfig beside built component output. — Consumer component typechecking should validate package declarations instead of emitted JavaScript.
- [Phase 01]: Keep exact React type pins fixture-only. — Strict TSX needs declaration packages, but the package runtime peer surface remains Convex and React only.
- [Phase 01]: Use full domain-separated SHA-256 base64url scope derivation from verified external identity. — This keeps demo scopes deterministic, opaque, fixed length, and based only on server-verified identity.
- [Phase 01]: Normalize branded string IDs inside shared scope guards to preserve not-found equivalence. — Component-boundary ID validation must not distinguish malformed IDs from valid identifiers belonging to another scope.
- [Phase 01]: Ship convex-helpers as a regular runtime dependency for packed component consumers. — The paginator is an internal shipped runtime implementation detail and packed consumers must install it automatically.
- [Phase 01]: Treat scope/post/actor vote memberships as canonical state and maintain counters only in the same transaction. — Retries and concurrency cannot drift the projection from membership truth.
- [Phase 01]: Keep discussions flat with one optional same-scope, same-post root-parent reference. — This preserves reply context without unbounded nesting or recursive DTOs.
- [Phase 01]: Use domain-tagged 128-bit random tombstones for idempotent anonymization while retaining stable actor relationships. — Identity becomes unlinkable while authored content and participation totals remain coherent.
- [Phase 01]: Provider packages remain fixture-only dev dependencies; exported adapters are pure normalizers. — Consumers pay no provider runtime dependency unless they select that fixture.
- [Phase 01]: Verify the types-only ComponentApi export through declarations, consumer codegen, and ATTW rather than runtime import. — The export intentionally has no JavaScript runtime condition.
- [Phase 01]: Normalize Better Auth users from the session-validated component document _id, never private provider or session fields. — The component user document ID is stable and already session-validated by the trusted host helper.
- [Phase 01]: Expose full Convex query and mutation contexts only to trusted host resolvers. — Current provider helpers require real server capabilities while browser intent validators remain authority-free.
- [Phase 01]: Commit generated-style Better Auth component references for offline fixture compilation. — Provider fixture typechecks must not require live credentials or deployment codegen.
- [Phase 01]: Expose a narrow injectable Convex Auth helper seam while retaining the official helper as the production default. — Tests can drive the provider-shaped trusted helper without accepting actor facts or browser authority.
- [Phase 01]: Give each provider scenario responsibility for registering and seeding its trusted backend prerequisites. — The observable authority matrix stays shared while provider internals remain isolated to setup.

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Revalidate fast-moving Convex component, auth, packaging, and upgrade APIs during planning.
- [Phase 2]: Prove search pagination and vote-counter behavior against real Convex before freezing the domain contract.
- [Phase 4]: Prove every sandbox query, search, count, seed, reset, quota, and cleanup path is scope-complete.

## Deferred Items

Items acknowledged and carried forward from initial requirements:

| Category | Item                                                                                                                                          | Status                     | Deferred At    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------- |
| Product  | Custom statuses, moderation queue, exports/imports, delivery adapters, named integrations, AI analysis, analytics, taxonomy, and localization | Tracked in v2 requirements | Initialization |

## Session Continuity

Last session: 2026-07-16T18:48:32.310Z
Stopped at: Completed 01-07-PLAN.md
Resume file: None
