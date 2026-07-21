---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 02.2
current_phase_name: Notification Navigation Target Contract
status: ready_to_execute
stopped_at: Phase 02.2 Plan 02.2-01 ready; Phase 02.3 Plan 02.3-01 planned and blocked on 02.2
last_updated: "2026-07-21T19:09:25.000Z"
last_activity: 2026-07-21
last_activity_desc: Planned both urgent Phase 3 contract prerequisites; Phase 02.2 remains next
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 34
  completed_plans: 28
  percent: 82
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-17)

**Core value:** SaaS teams can add deeply integrated product feedback to an existing Convex application while retaining native ownership of their data, identity, permissions, and user experience.
**Current focus:** Phase 02.2 — Notification Navigation Target Contract

## Current Position

Phase: 02.2 — Notification Navigation Target Contract
Plan: 02.2-01 of 1
Status: Ready to execute
Last activity: 2026-07-21 — Planned both urgent Phase 3 contract prerequisites; Phase 02.2 remains next

Progress: [████████░░] 82%

## Performance Metrics

**Velocity:**

- Total plans completed: 28
- Average duration: 44 min
- Total execution time: 1220 min

**By Phase:**

| Phase    | Plans | Total   | Avg/Plan |
| -------- | ----- | ------- | -------- |
| Phase 01 | 8     | 299 min | 37 min   |
| Phase 02 | 17    | 854 min | 50 min   |
| Phase 02.1 | 1   | 68 min  | 68 min   |
| Phase 03 | 2     | 29 min  | 15 min   |

**Recent Trend:**

- Last 5 plans: 15 min, 68 min, 30 min, 17 min, 100 min
- Trend: The public feedback lifecycle closed in 15 minutes over the proven headless and registry contracts

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
| Phase 02 P08 | 13min    | 3 tasks | 29 files |
| Phase 02 P09 | 31min    | 3 tasks | 16 files |
| Phase 02 P10 | 446min   | 3 tasks | 21 files |
| Phase 02 P05 | 55min    | 3 tasks | 23 files |
| Phase 02 P11 | 27min    | 3 tasks | 20 files |
| Phase 02 P12 | 34min    | 3 tasks | 28 files |
| Phase 02 P13 | 47min    | 3 tasks | 4 files  |
| Phase 02 P14 | 14min    | 3 tasks | 4 files  |
| Phase 03 P01 | 14min    | 3 tasks | 35 files |
| Phase 02 P15 | 100min   | 3 tasks | 11 files |
| Phase 02 P16 | 17min    | 3 tasks | 9 files  |
| Phase 02 P17 | 30min    | 3 tasks | 5 files  |
| Phase 02.1 P01 | 68min  | 3 tasks | 31 files |
| Phase 03 P02 | 15 min | 3 tasks | 32 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Use four coarse, sequential vertical MVP slices.
- [Phase 1]: Prove the packed component, provider-neutral security boundary, all three auth paths, and a usable feedback board together.
- [Phase 2]: Complete the domain and headless React contract before freezing copied UI source.
- [Phase 3]: Author one neutral shadcn-compatible UI source and deterministically emit both registry artifacts and byte-equivalent repository examples.
- [Phase 3]: Keep copied hook consumers as route-agnostic client components; no SSR initial-data contract in v1.
- [Phase 3]: Treat explicit keyboard, focus, announcement, contrast, zoom, and reflow evidence as a release artifact.
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
- [Phase 02]: Snapshot eligible recipients before inbox materialization — Retries and later subscription changes cannot alter an accepted event.
- [Phase 02]: Fan out ten or fewer recipients inline and use one 50-row continuation chain for larger events — This keeps scheduler work bounded and retry-safe.
- [Phase 02]: Cap each actor inbox at 500 rows with an exact unread projection — Inbox signals stay bounded without discarding immutable event truth.
- [Phase 02]: Use sessionGeneration only as browser query identity — Account switches reset helper pages and optimism without conferring authority.
- [Phase 02]: Use the logical notification event ID as the stable host idempotency key while keeping delivery ordering explicitly best effort. — Hosts dedupe retries without relying on a strict delivery order.
- [Phase 02]: Fence outbox ack and release by scope, row, owner, and incrementing lease version; release attempt eight parks the row. — Expired workers cannot mutate reclaimed work and poison rows remain bounded.
- [Phase 02]: Expose delivery only through afferent/server.js with per-call scope resolution and host-owned authorizeDelivery. — External side effects remain inside the consuming application's trusted server boundary.
- [Phase 02]: Keep sessionGeneration opaque and local to React query keys. — Account switches invalidate actor-sensitive state without sending a client authority fact to the backend.
- [Phase 02]: Use string IDs and required pagination arguments at generated FunctionReference boundaries. — Convex function arguments are invariant and native paginated references require paginationOpts; brands remain on DTO and hook-facing types.
- [Phase 02]: Normalize expected headless failures into AfferentResult while retaining backend AfferentActionResult compatibility. — Consumers get one stable error vocabulary without widening or breaking the shipped server contract.
- [Phase 02]: Large duplicate merges stage invisible relation truth and publish exactly one OCC-fenced ready-to-cutover_done reader switch.
- [Phase 02]: Every preparing or ready merge-aware writer touches the job row and forces a bounded staged rebuild before cutover.
- [Phase 02]: Use provider-injected watchQuery stores to return typed live errors without a library error boundary.
- [Phase 02]: Require opaque identity tokens only to advance a synchronous local generation; never serialize them or treat them as authority.
- [Phase 02]: Validate numeric cache generations in host wrappers and strip them before component operations.
- [Phase 02]: Use real backend splitCursor signals for cursor-window restructuring — Convex 1.42.2 emits null-status splitCursor as its opportunistic signal; Required without a cursor remains a typed invariant error, and no status or cursor is fabricated.
- [Phase 02]: Use Convex's atomically installed local query-result map as the coherence source; add no schema field, DTO member, public token, revision, or watermark.
- [Phase 02]: Treat every page callback as a dirty signal and synchronously stage the complete committed or candidate descriptor chain before one atomic cache/publication decision.
- [Phase 02]: Retain the last coherent result array while any descriptor is unavailable, and publish errors only with the maximal same-reread boundary-contiguous prefix.
- [Phase 03]: Canonical copied UI is authored once under ui/afferent and generated byte-for-byte into repository examples and deterministic registry items. — One source of truth prevents registry/example drift while preserving copy-owned installation.
- [Phase 03]: Copied public UI consumes host-generated function references through AfferentProvider and the real headless hooks. — The install proof must exercise the supported provider/hook boundary rather than a parallel presentational shortcut.
- [Phase 03]: Registry integration tests stage sibling registry dependency JSON beside the selected item before invoking pinned shadcn add. — shadcn 4.11.0 resolves explicit relative registryDependencies from the consumer working directory.
- [Phase 03]: Copied public UI keeps only browser intent in local state; data, pending state, errors, capabilities, generation fencing, and optimism remain hook-owned. — The headless layer stays the single behavior source.
- [Phase 03]: Flat comment DTO order remains authoritative and parentCommentId adds presentation context only. — Discussion rendering introduces no parallel cache or recursive tree.
- [Phase 03]: Server viewer capability fields control action presentation while trusted host wrappers authorize every mutation. — Copied UI never fabricates browser authority.
- [Phase 03]: Public feedback keeps one result-before-detail DOM order and adds wider composition through CSS-only breakpoints. — Phone, keyboard, and assistive-technology order remain stable.
- [Phase 02]: Expose comment reads as one optional public binding and map omission to an inert unsupported hook state. — Existing consumers remain compatible and React never falls through to direct backend access.
- [Phase 02]: Reuse the closed flat CommentDto and shared atomic paginated watch store unchanged for useComments. — Replies preserve parentCommentId without a recursive tree, second cache, schema change, or generic CRUD surface.
- [Phase 02]: Use one versioned composite-cursor stream for canonical-plus-source comments and activity, honoring both cursor boundaries and full stable tie keys. — The installed convex-helpers merged stream supplies index-bounded page pinning; public DTO and authority boundaries remain unchanged.
- [Phase 02]: Use the same mergedStream helper for one and two post IDs so cursor shape and reactive window semantics cannot diverge by reader cardinality.
- [Phase 02]: Bind opaque cursor positions to reader, order, and hashed stream-set identity; any mismatch resets cursor and endCursor together instead of attempting partial reuse.
- [Phase 02]: Keep comments ordered by _creationTime,_id and activity ordered by occurredAt,_creationTime,_id so cleanup repoints never change cursor position.
- [Phase 02]: Attach the replacement pagination descriptor before publishing restart loading state. — Every headless notification must expose one exact active descriptor chain; descriptorless transient states are invalid.
- [Phase 02.1]: Resolve optional viewer identity only in trusted host reads and look up existing component actors by scope and external key without writes or scans. — Browser state never becomes authority and authenticated viewers without actor rows remain anonymous-safe.
- [Phase 02.1]: Project vote membership through the exact scope/post/actor index and share edit/withdraw predicates with mutation enforcement. — UI action availability cannot drift from backend policy.
- [Phase 02.1]: Apply desired-state vote optimism to both feed and detail caches from server viewerHasVoted truth. — Repeated Vote or Remove vote requests stay idempotent across current-generation caches.

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4]: Prove every sandbox query, search, count, seed, reset, quota, and cleanup path is scope-complete.

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Server-Derived Viewer Capability Contract (URGENT)
- Phase 02.2 inserted after Phase 2: Notification Navigation Target Contract (URGENT)
- Phase 02.3 inserted after Phase 2: Admin Read and Projection Completion (URGENT)

## Deferred Items

Items acknowledged and carried forward from initial requirements:

| Category | Item                                                                                                                                          | Status                     | Deferred At    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------- |
| Product  | Custom statuses, moderation queue, exports/imports, delivery adapters, named integrations, AI analysis, analytics, taxonomy, and localization | Tracked in v2 requirements | Initialization |

## Session Continuity

Last session: 2026-07-21T18:55:42.616Z
Stopped at: Phase 03 Plan 03-03 blocked on notification navigation target; planning urgent prerequisite 02.2
Resume file: None
