---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 2
current_phase_name: Complete Feedback-to-Changelog Workflow
status: executing
stopped_at: Completed 02-07-PLAN.md
last_updated: "2026-07-16T23:26:22.137Z"
last_activity: 2026-07-16
last_activity_desc: Completed stable manual changelog lifecycle and headless editorial hooks
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 18
  completed_plans: 14
  percent: 78
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-16)

**Core value:** SaaS teams can add deeply integrated product feedback to an existing Convex application while retaining native ownership of their data, identity, permissions, and user experience.
**Current focus:** Phase 2 — Complete Feedback-to-Changelog Workflow

## Current Position

Phase: 2 (Complete Feedback-to-Changelog Workflow) — EXECUTING
Plan: 7 of 10
Status: Ready to execute
Last activity: 2026-07-16 — Completed stable manual changelog lifecycle and headless editorial hooks

Progress: [████████░░] 78%

## Performance Metrics

**Velocity:**

- Total plans completed: 14
- Average duration: 28 min
- Total execution time: 387 min

**By Phase:**

| Phase    | Plans | Total   | Avg/Plan |
| -------- | ----- | ------- | -------- |
| Phase 01 | 8     | 299 min | 37 min   |
| Phase 02 | 6     | 88 min  | 15 min   |

**Recent Trend:**

- Last 5 plans: 14 min, 26 min, 15 min, 8 min, 13 min
- Trend: Phase 2 is building the complete feedback lifecycle in bounded vertical slices

_Updated after each plan completion_

**Plan History:**

| Plan         | Duration | Tasks   | Files    |
| ------------ | -------- | ------- | -------- |
| Phase 01 P01 | 8 min    | 2 tasks | 2 files  |
| Phase 01 P02 | 148 min  | 2 tasks | 30 files |
| Phase 01 P03 | 21 min   | 3 tasks | 27 files |
| Phase 01 P04 | 90 min   | 3 tasks | 23 files |
| Phase 01 P05 | 13m      | 3 tasks | 16 files |
| Phase 01 P06 | 4 min    | 2 tasks | 8 files  |
| Phase 01 P07 | 5 min    | 2 tasks | 6 files  |
| Phase 01 P08 | 10 min   | 3 tasks | 13 files |
| Phase 02 P01 | 12 min   | 3 tasks | 24 files |
| Phase 02 P02 | 14 min   | 3 tasks | 26 files |
| Phase 02 P03 | 26 min   | 3 tasks | 45 files |
| Phase 02 P04 | 15min    | 3 tasks | 26 files |
| Phase 02 P06 | 8min     | 3 tasks | 14 files |
| Phase 02 P07 | 13min    | 3 tasks | 20 files |

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
- [Phase 01]: Preserve existing board order and append only genuinely new slugs. — Repeated installation configuration is additive and never deletes, hides, or reorders omitted boards.
- [Phase 01]: Expose bounded post counts with an explicit hasMore signal. — A cap-plus-one sentinel distinguishes exact totals through 50 from capped lower bounds.
- [Phase 01]: Build declarations before Phase 1 fixture and package release checks. — Clean self-referencing fixture projects require emitted Afferent declarations before independent compilation.
- [Phase 01]: Parameterize full trusted Convex host contexts with any data model. — Generated schema and schema-less Convex handlers remain assignable without weakening runtime authority boundaries.
- [Phase 02]: Use a contractVersion 2 feedback-page DTO while preserving the closed contractVersion 1 direct post and board-page contracts. — Discovery needs six statuses and tag DTOs without silently widening the shipped v1 union.
- [Phase 02]: Materialize one bounded postTagFeeds row per tag membership. — Single-tag feeds stay scope-first and rank-indexed without scan or page filtering.
- [Phase 02]: Treat convex-helpers usePaginatedQuery results as the canonical accumulated feed. — A second page cache would retain stale hidden rows and mask pagination gaps.
- [Phase 02]: Search remains a bounded non-cursor contract with a cap-plus-one hasMore sentinel; cursor pagination is reserved for ordinary indexed feeds. — Native and helper cursor pagination both remain unsupported for component full-text search.
- [Phase 02]: Safe Markdown uses mdast-util-from-markdown 2.0.3 with a closed node and absolute HTTP(S)/mailto URL allowlist. — Parser-backed validation rejects executable and ambiguous constructs before storage.
- [Phase 02]: Similar-post suggestions rerank at most 30 search candidates with library-owned lexical scoring and stable tie breaks. — Convex does not expose a stable public relevance score contract.
- [Phase 02]: Expected participation failures return typed values after rate consumption so Convex commits exactly one charge.
- [Phase 02]: Status, lifecycle, and discussion lock remain orthogonal; archive and withdrawal share one public visibility predicate.
- [Phase 02]: Activity stores immutable typed metadata and opaque actor IDs, resolving current actor display only on authorized reads.
- [Phase 02]: Use an active/deleting/deleted tag lifecycle so public projections hide a tag atomically before bounded cleanup. — Prevents partial multi-transaction cleanup from leaking through public DTOs, feeds, or search.
- [Phase 02]: Drain tag memberships, feed rows, and search rows in separate 50-row scheduled continuation batches. — Keeps every transaction bounded with headroom and makes retries idempotent.
- [Phase 02]: Version TagDto at contractVersion 1 and key tag mutation state by entity and action. — Preserves additive public contracts and explicit headless async state.
- [Phase 02]: Use a fixed 90-day currentStatusSince range for Complete while Planned and In Progress remain independently paginated status projections. — The roadmap remains current without hiding older completed feedback from discovery or changelog history.
- [Phase 02]: Use optional non-authoritative sessionGeneration only to reset host and headless roadmap pagination across account changes. — It changes helper query identity but is discarded before the component call and never confers actor authority.
- [Phase 02]: Expose a dedicated minimal RoadmapItemDto and no independent roadmap entity. — Roadmap is a current-status projection with stable versioned fields and no separate writes or manual order.
- [Phase 02]: Separate immutable firstPublishedAt from current publishedAt so republish preserves the original changelog URL and order.
- [Phase 02]: Resolve ordered changelog links through current canonical visibility without deleting hidden editorial relationships.
- [Phase 02]: Keep linked-post DTOs compact enough for the documented 50-entry by 50-link bounded query ceiling.
- [Phase 02]: Persist once-per-entry/post changelog publication guards before notification fan-out is implemented.

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

Last session: 2026-07-16T23:26:09.913Z
Stopped at: Completed 02-07-PLAN.md
Resume file: None
