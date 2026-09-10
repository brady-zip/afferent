# Phase 2: Complete Feedback-to-Changelog Workflow - Research

**Researched:** 2026-07-16
**Domain:** Convex component search, bounded transactions, scheduled continuations, delivery outbox, rate limiting, and reactive headless React pagination
**Confidence:** HIGH for real-backend feasibility boundaries; MEDIUM-HIGH overall

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Discovery, Ranking, and Filtering

- **D-01:** Public feedback exposes three distinct indexed feed orders. Newest is creation time descending. Top is transactional `voteCount` descending. Trending uses a stored, transactionally recomputed additive-time hot score driven only by authenticated votes and comments; it is not a read-time decay, vote-velocity window, or Wilson score.
- **D-02:** Every feed order is a total order suitable for cursor pagination. Newest ties by opaque ID; Top and Trending tie by creation time and then opaque ID. Withdrawn, archived/hidden, and merged-source posts never appear.
- **D-03:** Search is an installation-wide relevance-only mode, separate from Newest, Top, and Trending. It accepts optional board, status, and single-tag filters. A supported filter combination must be index-served or use a bounded intersection; filtering after a scan is forbidden.
- **D-04:** Public feeds support both installation-wide and per-board views. Status-filtered feed indexes are added only for real screen/query shapes. Tags use a scoped many-to-many join and support one tag at a time in v1; multi-tag Boolean filtering is deferred.
- **D-05:** Compose-time similar-post suggestions search across every visible active board so duplicates placed on the wrong board are still found. The query is deterministic, relevance-ranked, bounded, and non-blocking. Its stable DTO includes opaque post ID, title, board, and status, but never a raw engine relevance score.
- **D-06:** The similar-post contract fixes a hard server-side maximum and visibility guarantees while leaving scoring thresholds, weights, and the smaller default count tunable. Submission is always allowed even when suggestions exist.

#### Duplicate Merge and Direct Resolution

- **D-07:** Merging a source post into a live canonical post physically reparents comments, activity, subscription memberships, and changelog links. Vote and subscription memberships are unioned by actor, duplicate memberships are removed, and stored counters are reconciled from membership truth rather than added.
- **D-08:** Source title, body, board, author, and status are retained in one bounded admin-only merge-history record. Moved comments keep their original author. Anonymized authors continue to resolve to the generic anonymized identity.
- **D-09:** Source posts become durable redirect tombstones. Redirects are flattened to the final canonical post, cycles are forbidden, and a tombstone cannot be selected as a canonical target. Merge is irreversible in v1; no unmerge operation is exposed.
- **D-10:** Direct post lookup returns a discriminated `post | merged | notFound` result. A merged result contains only the requested tombstone ID and final canonical ID; callers fetch the canonical post separately. Tombstones never appear in feeds, search, roadmap, or changelog listings.
- **D-11:** Redirect visibility follows the canonical post's current visibility, not the source's former state. If the canonical post is hidden or inaccessible, both source and canonical identifiers return the same not-found-equivalent result and disclose no redirect.
- **D-12:** Merge semantics are atomic to readers. Small merges may finish in one transaction; large merges may use an immediate tombstone/guard plus bounded resumable continuations, but no public half-merged state is allowed.

#### Content Safety, Status, Moderation, and Tags

- **D-13:** Post bodies, comments, and changelog bodies use one documented safe-Markdown subset. Store bounded normalized Markdown source; reject raw HTML and unsafe URL schemes at write time; require conforming renderers to build a sanitized element tree and never inject raw HTML.
- **D-14:** The subset permits headings, emphasis, lists, blockquotes, code, and hardened `http`, `https`, and `mailto` links. Inline images, media embeds, iframes, scripts, styles, and HTML passthrough are excluded. Post, board, tag, and changelog titles/names remain bounded normalized plain text.
- **D-15:** Visibility/lifecycle is orthogonal to the six built-in statuses. Active Open, Under Review, Planned, In Progress, Complete, and Closed posts remain public; Closed is visible but not on the roadmap. Admins may transition freely from any status to any other status, and every transition records activity and emits the same status-change notification behavior.
- **D-16:** Author withdrawal and admin archive hide a post uniformly from every public projection, direct lookup, count, and notification fan-out. Archived posts remain admin-inspectable and restorable. Archive does not change status or delete subscriptions; restore clears the flag, records activity, and emits no catch-up or restore notification.
- **D-17:** Discussion lock is an explicit admin action unrelated to status. It blocks new non-admin root comments and replies while preserving existing discussion; admins may still post an official reply. Voting and subscription changes remain permitted. Closed status never auto-locks or auto-disables votes.
- **D-18:** Tags are scope-owned records with opaque stable IDs and mutable public display names. Only admins create, rename, delete, assign, or remove tags; assigned tags and tag filters are public. Rename propagates through ID references. Delete removes join rows in bounded batches and records activity.
- **D-19:** Participation uses documented library-owned per-intent limits keyed by server-derived scope and actor for post creation, comments/replies/edits, votes, and subscribe/unsubscribe, plus sharded per-scope ceilings for expensive creation/comment paths. Limits are not installation-configurable in v1.
- **D-20:** Rate-limit failures use a stable `RATE_LIMITED` error with operation and `retryAfterMs`. Invalid and failed attempts consume once per logical request, while a rate-limited rejection is not double-charged and Convex retries do not multiply charge. Admin-only intents are outside participation buckets.

#### Append-Only Activity

- **D-21:** Activity history is admin-only, versioned, cursor-paginated, append-only, and bounded per row. Public callers see current state rather than a redacted audit timeline.
- **D-22:** The closed additive taxonomy includes create, edit, status change, board move, tag add/remove, lock/unlock, archive/restore, merge, and changelog publish/unpublish. Entries carry occurrence time, an opaque initiating actor ID when applicable, and small typed event metadata.
- **D-23:** Edit events retain changed-field names, not old/new content snapshots. Merge is the bounded exception described in D-08. Activity never denormalizes actor display data; it resolves opaque actor IDs at read time so anonymization takes effect without rewriting history.

#### Roadmap Projection

- **D-24:** The roadmap is a grouped projection of exactly Planned, In Progress, and Complete posts, with optional single-board filtering. Each status group paginates independently so a large Complete history cannot starve another column.
- **D-25:** Within a status, order by a stored `currentStatusSince` descending, then creation time and opaque ID. Update `currentStatusSince` transactionally on every status transition. There is no manual roadmap ordering or independent roadmap entity.
- **D-26:** Complete uses a documented fixed recency window so the roadmap remains current; the exact duration is planner discretion. Older completed posts remain available through browse/search and published changelog history. Every roadmap row applies the same visibility predicate as direct feedback reads.

#### Changelog Editorial Lifecycle

- **D-27:** Every changelog entry has an opaque immutable ID plus a scope-unique human-readable slug. The slug is provisional and admin-editable while draft, then immutable at first publish. Auto-derived collisions get deterministic suffixes; explicit admin-chosen collisions return an actionable error.
- **D-28:** Published entries are public and cursor-paginated by immutable `firstPublishedAt` descending. Draft and unpublished entries are admin-only and not-found-equivalent publicly. Published content may be edited in place, updating `updatedAt` without changing slug, first-publication time, or list position.
- **D-29:** Publish and unpublish are explicit idempotent admin intents. Unpublish hides the entry but retains its slug and `firstPublishedAt`; republish restores the same URL and position. Preview/confirmation is a UI concern, not a browser-supplied backend flag.
- **D-30:** Changelog links are optional editorial references and are always orthogonal to post status. A draft may link any live canonical post; a published entry may link any visible canonical post. Publishing never changes a post status, and status changes never publish, hide, or remove a changelog link.
- **D-31:** Merge repoints and deduplicates links. Withdrawal/archive hides a linked post from public entry DTOs but preserves the admin relationship; restore makes it visible again. A published entry remains public even when it has zero currently visible links.
- **D-32:** Subscriber notification is deduplicated once per linked-post/entry pair: first publish covers links present then, and adding a link to an already published entry covers only the newly linked post. Edits, unpublish, republish, removal, and idempotent publish calls do not notify again.

#### Subscriptions and In-App Notifications

- **D-33:** The v1 notification event set is exactly: status change to current subscribers; admin reply to current subscribers; comment reply to the parent-comment author; structured mention to mentioned actors; and linked-changelog publication to linked-post subscribers. Ordinary non-admin comments do not broadcast.
- **D-34:** Never notify the initiating actor. Deduplicate by recipient plus logical event and collapse a reply plus mention of the same actor into one notification. Merge moves subscriptions to the canonical post but a merge-notification event is deferred.
- **D-35:** Mentions are validated safe-Markdown nodes carrying a scoped opaque actor ID. Display is resolved when rendering; renamed or anonymized actors render current safe attribution, and invalid/anonymized targets receive no notification.
- **D-36:** A post author auto-subscribes on creation and a commenter auto-subscribes when commenting; voting does not subscribe. An explicit unsubscribe is a durable opt-out that later comments cannot override until the actor explicitly subscribes again.
- **D-37:** The inbox stores one deduplicated row per recipient and logical event, lists newest first with cursor pagination, exposes an exact transactionally maintained unread count, and supports idempotent mark-one-read. Mark-all-read is deferred.
- **D-38:** Inbox retention is a documented fixed rolling per-actor cap enforced on insert by trimming oldest rows. Source activity remains durable; inbox rows are a bounded derived signal. The exact cap is planner discretion.

#### Vendor-Neutral Host Delivery

- **D-39:** Every logical notification event is captured transactionally with its triggering domain mutation. Small recipient sets may materialize inbox/outbox rows inline; large fan-out uses bounded resumable continuations over the captured event so no event is lost and transaction limits are respected.
- **D-40:** The component owns recipient eligibility and creates one host-delivery row per eligible actor. Trusted host-only APIs claim bounded leased batches, then ack or release events. Leases expire for redelivery. Delivery is at-least-once with an opaque stable event ID/idempotency key, bounded retry, acked-row pruning, and poison-event parking/dead-letter behavior.
- **D-41:** Delivery payloads are versioned typed facts containing opaque entity IDs, event metadata, sequence, and occurrence time—never email, provider records, display data, or rendered messages. Ordering is best-effort; sequence/time help hosts deduplicate, order, or coalesce without a strict global/per-key guarantee.
- **D-42:** At claim time, the trusted server-only DTO resolves recipient actor ID to the stored provider-neutral non-PII `externalKey` and exposes it as `recipientKey`. The host resolves current contact data and channel preferences. Anonymized actors are discarded before delivery. Event IDs/metadata are snapshotted; deliverability and recipientKey are resolved fresh.

#### Headless React Contract

- **D-43:** Ship one framework-light `AfferentProvider` that accepts a typed grouped object of host-generated function references plus a minimal `loading | authenticated | unauthenticated` auth-state adapter. It never imports a specific auth provider, router, toast library, or design system.
- **D-44:** Public bindings and the auth-state adapter are the baseline. Participation, notifications, roadmap, changelog, and admin groups may be omitted; their hooks return an explicit not-configured/unsupported state rather than failing provider initialization. Runtime not-authorized remains distinct from not-configured.
- **D-45:** Admin affordance gating comes from a trusted host query with explicit loading state, never a client `isAdmin` prop. It is UX gating only; every admin operation still authorizes server-side on every call.
- **D-46:** Expose stable domain hooks rather than a generic query wrapper or a one-to-one mirror of server functions. Hooks share a discriminated state vocabulary: loading, ready, empty, error, unsupported/not-configured, unauthenticated/not-authorized as applicable; direct post lookup additionally exposes merged and notFound.
- **D-47:** Feed hooks accumulate pages over Convex reactive pagination and expose `loadMore`, `isLoadingMore`, and `canLoadMore`. Search/similar hooks provide a sensible overridable debounce so the safe path does not query every keystroke.
- **D-48:** Mutation hooks expose stable actions plus pending/error/reset state. Per-row operations key state by entity/action; singleton forms may use one state. Duplicate submits are guarded. Hooks never navigate or toast.
- **D-49:** Only vote, subscribe/unsubscribe, and mark-read use Convex-native optimistic updates, because they are idempotent, predictable, and reversible. They roll back automatically on failure. Create/edit/comment/admin/status/archive/merge/publish wait for server truth and never use a parallel client cache.
- **D-50:** Actions resolve typed `{ ok: true, data } | { ok: false, error }` results and do not reject for expected failures. Errors also appear in hook state. The closed versioned error union distinguishes authentication, authorization, validation, not-found, rate limit, conflict, transient/network, and unknown outcomes.
- **D-51:** Headless hooks do not require Suspense or error boundaries. Under public read policy, public reads may run during auth loading; authenticated-only reads and protected hooks wait. Retry is exposed only for transient failures, with delayed retry for `RATE_LIMITED` using `retryAfterMs`.
- **D-52:** Logout or account switch clears every actor-scoped optimistic overlay, accumulated actor-sensitive page, inbox state, and admin capability so one actor's state is never shown to another.

#### Cross-Cutting Invariants

- **D-53:** One visibility predicate governs feeds, search, suggestions, roadmap, changelog links, counts, direct lookup, subscriptions, and notification fan-out. No secondary projection may reveal data hidden by the primary post read.
- **D-54:** Merge, hide/restore, and anonymize semantics apply consistently across votes, comments, tags, activity, changelog links, subscriptions, notifications, and delivery. A related row never becomes an existence or identity oracle.
- **D-55:** Status is workflow state, not an automation trigger. It never auto-publishes changelog, auto-locks discussion, blocks voting, gates changelog linking, or hides links.
- **D-56:** Potentially unbounded writes use atomic logical capture/guard plus bounded resumable continuations. This pattern governs large merges, notification fan-out, widely used tag deletion, and future bulk operations.
- **D-57:** Activity actors, mention targets, and delivery recipients store stable opaque identity references and resolve current safe display/deliverability later. Never denormalize display names or contact PII into append-only/event records.
- **D-58:** Public contracts retain Phase 1's stable versioned DTOs, opaque branded IDs, validators, and additive evolution. Adding a value to a closed TypeScript union must follow an explicit compatible versioning strategy rather than silently widening the v1 contract.

### the agent's Discretion

- Choose exact score constants for Trending, safe-Markdown field length limits, fixed rate-limit values/windows, Complete roadmap recency duration, inbox cap, lease duration, retry/dead-letter thresholds, and default debounce/suggestion counts while preserving the stable ceilings and semantics above.
- Choose the exact additive schema migration and DTO version-bump strategy needed to expand Phase 1's literal `open` status, empty tag projection, and v1 post/read contracts. Do not break packed consumers or weaken validators.
- Choose transaction-versus-continuation thresholds and internal job structure. The observable semantics, scope isolation, idempotency, and boundedness above are locked.
- Choose final hook/function/type names and module organization. The grouped capability boundaries, state vocabulary, security boundary, and framework independence are locked.

### Deferred Ideas (OUT OF SCOPE)

- True elapsed-time Trending decay with scheduled recomputation.
- Multi-tag Boolean AND/OR filtering.
- Unmerge support.
- Author re-publish after withdrawal.
- Inline images, uploads, remote media embeds, and a proxy/storage policy.
- Installation-configurable participation limits.
- Public activity timeline and full edit-version history.
- Merge notification event; event taxonomy remains additive-ready.
- Mark-all-notifications-read; a future implementation should use a watermark or bounded batches.
- Age-based inbox expiry in addition to the rolling per-actor cap.
- Reverse “announced in” lookup from a post to published changelog entries unless planning proves it necessary for a scoped Phase 2 screen.
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID                    | Description                                                  | Research Support                                                                                                              |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| DISC-01               | Browse visible feedback by newest activity.                  | Scope-leading indexed total order plus component-compatible cursor pagination.                                                |
| DISC-02               | Browse visible feedback by vote total.                       | Transactional `voteCount` projection and bounded indexed total order.                                                         |
| DISC-03               | Browse feedback by documented Trending order.                | Stored additive-time score updated with vote/comment mutations and indexed pagination.                                        |
| DISC-04               | Search visible feedback by text relevance.                   | Native component full-text search with bounded `.take()`, equality filter fields, and an explicit non-cursor result contract. |
| DISC-05               | Filter by board, status, and one admin tag.                  | Equality fields in search/index ranges; materialized per-tag search projection avoids scan filtering.                         |
| DISC-06               | Show deterministic similar-post suggestions.                 | Bounded search candidates followed by library-owned deterministic lexical reranking.                                          |
| DISC-07               | Merge into a canonical post while preserving relations.      | Transaction-limit headroom, resumable job records, and membership-truth reconciliation.                                       |
| DISC-08               | Resolve merged post to durable canonical redirect.           | Scope-checked flattened tombstone state and guarded final cutover.                                                            |
| ADMN-01               | Admin edits feedback.                                        | Narrow validated mutation plus append-only activity and search-projection update.                                             |
| ADMN-02               | Admin moves feedback between boards.                         | Transactional board/index/search projection update with scope checks.                                                         |
| ADMN-03               | Admin manages tags.                                          | Scoped tag table, bounded deletion continuation, immutable IDs.                                                               |
| ADMN-04               | Admin assigns/removes tags.                                  | Scoped join table and bounded materialized tag-search rows.                                                                   |
| ADMN-05               | Admin applies six built-in statuses.                         | Additive status schema/version migration and transactional `currentStatusSince`.                                              |
| ADMN-06               | Admin locks/unlocks discussion.                              | Orthogonal indexed lifecycle field enforced in participation mutations.                                                       |
| ADMN-07               | Admin archives/restores posts.                               | One visibility predicate and projection updates; no catch-up fan-out.                                                         |
| ADMN-08               | Participation rate limits return actionable errors.          | `@convex-dev/rate-limiter` consume/check/reserve semantics and real-backend retry proof.                                      |
| ADMN-09               | Safe-content contract prevents stored script execution.      | Strict bounded Markdown source contract; rendering remains element-tree only.                                                 |
| ADMN-10               | Append-only post activity.                                   | Small typed event rows, opaque actor IDs, scoped cursor pagination.                                                           |
| RMAP-01               | Public status-derived roadmap.                               | Three independent scope/status indexes, each paginated separately.                                                            |
| RMAP-02               | Board-filtered roadmap.                                      | Board included in real roadmap index shapes.                                                                                  |
| RMAP-03               | Roadmap shares visibility rules.                             | Centralized component visibility predicate and projection-level tests.                                                        |
| CHLG-01               | Admin creates/edits draft.                                   | Scoped changelog rows, stable IDs, draft slug policy.                                                                         |
| CHLG-02               | Admin publishes/unpublishes explicitly.                      | Idempotent state transitions with immutable first publication fields.                                                         |
| CHLG-03               | Admin links feedback posts.                                  | Scoped changelog-post join and merge-aware repointing.                                                                        |
| CHLG-04               | Visitor browses published entries.                           | Scope/publication/firstPublishedAt index with helper pagination.                                                              |
| CHLG-05               | Stable published URL.                                        | Scope-unique slug index and not-found-equivalent visibility.                                                                  |
| CHLG-06               | No automatic publication.                                    | Status mutation and changelog publication remain separate intents.                                                            |
| NOTF-01               | Subscribe/unsubscribe.                                       | Idempotent scoped membership plus durable explicit opt-out.                                                                   |
| NOTF-02               | Notify subscribers of status changes.                        | Transactional logical event capture and deduplicated fan-out.                                                                 |
| NOTF-03               | Notify subscribers of admin replies.                         | Same event/fan-out pipeline with fixed taxonomy.                                                                              |
| NOTF-04               | Notify on reply or structured mention.                       | Recipient-set union and recipient/logical-event dedupe.                                                                       |
| NOTF-05               | Notify on linked changelog publication.                      | Persistent link/entry notification guard per pair.                                                                            |
| NOTF-06               | Host consumes typed delivery events.                         | Scoped leased outbox claim/ack/release contract with fresh recipient resolution.                                              |
| NOTF-07               | Mark individual notification read.                           | Idempotent mutation plus exact per-actor unread projection.                                                                   |
| UI-01                 | Headless hooks cover all capability groups.                  | Grouped injected function references and domain hooks.                                                                        |
| UI-02                 | No provider/router/toast/design-system dependency.           | Framework-light provider boundary over consumer-generated refs.                                                               |
| UI-03                 | Explicit auth, pagination, pending, empty, and error states. | Direct mapping from helper pagination states and typed mutation results.                                                      |
| QUAL-01               | Automated invariant/security tests.                          | Existing Vitest, convex-test, real-backend, static, and packed-fixture layers extended per risk.                              |
| </phase_requirements> |

## Summary

Phase 2 is feasible on the current Convex component stack, with one critical contract distinction. Indexed Newest, Top, Trending, roadmap, activity, changelog, and inbox feeds can continue using `convex-helpers` component pagination and its matching React hook. Full-text search cannot be cursor-paginated inside a Convex component today: official component documentation says native `.paginate()` is unsupported, installed `convex-helpers@0.1.120` throws for `withSearchIndex`, and a disposable real backend reproduced both failures. Bounded relevance search with `.take()` and search-index equality filters works. [VERIFIED: disposable real Convex 1.42.2 backend] [CITED: https://docs.convex.dev/components/authoring#pagination]

Therefore, implement search and similar-post suggestions as bounded, non-cursor contracts with a hard server maximum and `hasMore`/truncation signal, while retaining cursor pagination only for ordinary indexed feeds. Use a materialized per-post/tag search table for the one-tag filter so the filter is index-served rather than applied after scanning. Similar suggestions should use Convex relevance only to obtain a bounded candidate set, then apply a documented deterministic lexical score and stable tie-break locally because Convex's relevance algorithm is not a stable public score contract. [CITED: https://docs.convex.dev/search/text-search]

Notification fan-out, large merges, and tag deletion must be designed as transactional logical capture plus bounded scheduled mutations. A real backend proved that an internal mutation scheduled from within a component runs successfully and that concurrent outbox claims serialize without duplicate leases. `@convex-dev/rate-limiter@0.3.2` also worked as a component child: committed expected-failure returns consumed once, thrown mutations rolled consumption back, 20 concurrent calls consumed exactly 20 units despite OCC retries, and `reserve: true` intentionally allowed debt. [VERIFIED: disposable real Convex 1.42.2 backend] [CITED: https://docs.convex.dev/scheduling/scheduled-functions] [CITED: https://www.npmjs.com/package/@convex-dev/rate-limiter]

**Primary recommendation:** Plan Phase 2 around two read contracts—gap-free helper-paginated indexed feeds and bounded relevance search—plus one reusable transactional event/continuation substrate for fan-out, merge, and bulk cleanup.

## Architectural Responsibility Map

| Capability                                 | Primary Tier              | Secondary Tier           | Rationale                                                                                                                                          |
| ------------------------------------------ | ------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feed/search indexes and visibility         | Database / Storage        | API / Backend            | Component tables and indexes enforce scope/selectivity; component functions project stable DTOs. [VERIFIED: repository schema and Phase 2 context] |
| Domain mutations, moderation, merge guards | API / Backend             | Database / Storage       | Narrow component mutations own invariants and atomic capture; storage owns durable job state. [VERIFIED: repository contracts]                     |
| Notification recipient selection/inbox     | API / Backend             | Database / Storage       | Component owns eligibility, dedupe, and bounded materialization. [VERIFIED: CONTEXT.md D-33..D-39]                                                 |
| Host delivery channel/contact lookup       | API / Backend (host)      | External delivery vendor | Host resolves contact preferences and performs side effects; component never stores PII or vendor data. [VERIFIED: CONTEXT.md D-40..D-42]          |
| Headless pagination/auth/mutation state    | Browser / Client          | API / Backend            | Hooks translate reactive Convex results and injected host refs; authority remains server-side. [VERIFIED: CONTEXT.md D-43..D-52]                   |
| Scheduled continuations                    | API / Backend (component) | Database / Storage       | Internal scheduled mutations consume durable job/event rows in bounded batches. [VERIFIED: disposable backend]                                     |

## Project Constraints (from AGENTS.md)

- Host wrappers derive identity, admin permission, and demo scope server-side on every call; client `userId`, `isAdmin`, and `scopeId` are never trusted. [VERIFIED: AGENTS.md]
- The isolated component never accesses host `ctx.auth`; provider records never cross into component storage or public DTOs. [VERIFIED: AGENTS.md]
- Expose narrow validated intent functions and stable versioned DTOs, never generic CRUD or raw documents. [VERIFIED: AGENTS.md]
- Preserve the one-product installation contract; every sandbox table, index, search, seed, reset, and cleanup path remains scope-complete. [VERIFIED: AGENTS.md]
- All packages and new exports must pass packed-tarball installation, component codegen, typecheck, and build in clean Vite/Convex fixtures. [VERIFIED: AGENTS.md]
- All reads and writes are bounded and index-served; idempotency and WCAG-oriented UI criteria are release gates. [VERIFIED: AGENTS.md]
- Preserve user-owned dirty files, use exact-path staging, Conventional Commits, `h5i capture commit`, and h5i sync/finish provenance. [VERIFIED: AGENTS.md]

## Standard Stack

### Core

| Library                    | Version                          | Purpose                                                                      | Why Standard                                                                                                                                                                                                                                     |
| -------------------------- | -------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `convex`                   | `1.42.2` (published 2026-07-14)  | Component runtime, database, search, scheduler, transactions, React bindings | Existing pinned peer/dev dependency and official component platform. [VERIFIED: npm registry] [CITED: https://docs.convex.dev/components/authoring]                                                                                              |
| `convex-helpers`           | `0.1.120` (published 2026-06-23) | Component-compatible paginator and matching reactive React hook              | Official Convex component docs recommend it because native pagination does not work in components; already a packed runtime dependency. [VERIFIED: repository package manifest] [CITED: https://docs.convex.dev/components/authoring#pagination] |
| `@convex-dev/rate-limiter` | `0.3.2` (published 2025-12-09)   | Per-intent actor limits and sharded scope ceilings                           | Official Convex package supports transactional fixed-window/token-bucket limits, keys, shards, checks, consumption, and reservation. [VERIFIED: npm registry] [CITED: https://docs.convex.dev/agents/rate-limiting]                              |
| `react`                    | peer `^18.3.1                    |                                                                              | ^19.0.0`; fixture `19.2.7`                                                                                                                                                                                                                       | Framework-light headless provider/hooks | Existing supported peer contract; no provider/router/toast dependency is added. [VERIFIED: repository package manifest] |
| `mdast-util-from-markdown` | `2.0.3` (published 2026-02-21)   | Parse stored Markdown to a syntax tree for allowlist validation              | Official syntax-tree utility avoids executing/rendering HTML and makes node/link validation explicit. [VERIFIED: npm registry] [CITED: https://github.com/syntax-tree/mdast-util-from-markdown]                                                  |

### Supporting

| Library                             | Version      | Purpose                                                       | When to Use                                                                                                                                                                      |
| ----------------------------------- | ------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest`                            | `4.1.10`     | Model, component, hook, and static contract tests             | Fast invariant and headless state tests. [VERIFIED: repository package manifest]                                                                                                 |
| `convex-test`                       | `0.0.54`     | In-memory component and scheduling tests                      | Broad domain matrices; not a substitute for real search/scheduler/package behavior. [VERIFIED: repository package manifest] [CITED: https://docs.convex.dev/testing/convex-test] |
| Disposable anonymous Convex backend | CLI `1.42.2` | Search, scheduler, pagination, OCC, and component-child proof | Required for the exact platform seams that mocks simplify or omit. [VERIFIED: executed in this research]                                                                         |

### Alternatives Considered

| Instead of                        | Could Use                           | Tradeoff                                                                                                                                                                                                   |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bounded component search          | Host-owned mirrored search table    | Would restore native cursor pagination but duplicates component data and creates a new synchronization contract; reject for v1. [VERIFIED: component isolation model]                                      |
| Built-in scheduled mutations      | Workflow/Workpool component         | Useful for higher-scale orchestration, but Phase 2 jobs are short deterministic resumable mutations and do not yet justify another queue abstraction. [CITED: https://docs.convex.dev/scheduling/overview] |
| Transactional maintained counters | Scan/collect or Aggregate component | Scans hit transaction limits; Aggregate adds another child component and is unnecessary for counters updated by every mutation. [CITED: https://docs.convex.dev/production/state/limits]                   |

**Installation:**

```bash
npm install @convex-dev/rate-limiter@0.3.2
npm install mdast-util-from-markdown@2.0.3
```

Keep the existing exact Convex/helper test pins during Phase 2; do not opportunistically update the user's dirty TypeScript/package experiment. [VERIFIED: git status and Phase 1 summaries]

## Package Legitimacy Audit

| Package                    | Registry | Age           | Downloads        | Source Repo                                       | Verdict                     | Disposition                                                                          |
| -------------------------- | -------- | ------------- | ---------------- | ------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| `@convex-dev/rate-limiter` | npm      | Since 2024-10 | 215,234/week     | `github.com/get-convex/rate-limiter`              | OK                          | Approved new runtime dependency; no postinstall. [VERIFIED: npm registry]            |
| `mdast-util-from-markdown` | npm      | Since 2020-08 | 42,487,856/week  | `github.com/syntax-tree/mdast-util-from-markdown` | OK                          | Approved parser dependency; no postinstall. [VERIFIED: npm registry]                 |
| `convex`                   | npm      | Since 2014    | 1,310,055/week   | `github.com/get-convex/convex-backend`            | SUS (`too-new` seam signal) | Already pinned/installed and official; no install task. [VERIFIED: npm registry]     |
| `convex-helpers`           | npm      | Since 2023    | 489,376/week     | `github.com/get-convex/convex-helpers`            | SUS (`too-new` seam signal) | Already installed and approved in Phase 1; no install task. [VERIFIED: npm registry] |
| `react`                    | npm      | Since 2011    | 144,545,184/week | `github.com/facebook/react`                       | OK                          | Existing peer/dev dependency; no install task. [VERIFIED: npm registry]              |

**Packages removed due to [SLOP] verdict:** none.

**Packages flagged as suspicious [SUS]:** `convex` and `convex-helpers` were flagged solely because their latest pinned publishes are recent. They are existing official dependencies, not proposed installs; the planner should retain the exact versions and rerun the existing packed and real-backend gates. [VERIFIED: package-legitimacy seam and repository history]

## Architecture Patterns

### System Architecture Diagram

```text
Browser intent
  -> injected host function reference
  -> trusted host wrapper derives auth / actor / admin / scope
  -> component narrow operation
       -> rate-limit consume (participation only)
       -> validate domain + enforce shared visibility
       -> transactional domain write + activity + logical event
       -> small recipient set: inbox/outbox rows inline
       -> large recipient set: durable fanout job + schedule internal mutation
  -> versioned result/error DTO
  -> headless domain hook
       -> indexed feed: convex-helpers reactive paginator results
       -> search/similar: debounced bounded result set

Host delivery worker (host-owned action/cron)
  -> trusted claim mutation
  -> component leases bounded outbox rows + resolves current recipientKey
  -> host resolves contact/channel and sends externally
       -> success: ack with lease token
       -> failure: release/backoff or dead-letter
```

### Recommended Project Structure

```text
src/
├── component/
│   ├── model/                 # visibility, errors, DTO views, content rules
│   ├── public/                # feeds, bounded search, roadmap, changelog
│   ├── participation/         # posts/comments/votes/subscriptions/read
│   ├── admin/                 # moderation, tags, merge, changelog, activity
│   ├── notifications/         # event capture, fanout jobs, inbox, outbox
│   ├── jobs/                  # bounded internal scheduled continuations
│   └── schema.ts              # scope-first indexes/search projections
├── client/                    # trusted fixed/scoped host clients and contracts
└── react/                     # provider, grouped bindings, domain hooks
tests/
├── model/                     # scoring, content, dedupe, merge helpers
├── component/                 # invariant and authorization matrices
├── integration/               # real search/scheduler/rate/outbox backend
├── react/                     # hook states, resets, optimism, pagination
└── static/                    # scope/index/DTO/export/privacy audits
```

### Pattern 1: Split Indexed Cursor Feeds from Bounded Search

**What:** All ordinary total-order feeds use `paginator(ctx.db, schema)` and `convex-helpers/react` `usePaginatedQuery`. Search uses native `withSearchIndex(...).take(HARD_LIMIT + 1)` and returns a bounded result DTO, not a cursor. [VERIFIED: installed source and disposable backend]

**Why:** Built-in pagination is unavailable inside components, and the component paginator cannot query search indexes. Attempting to make one endpoint serve both contracts will fail at runtime. [CITED: https://docs.convex.dev/components/authoring#pagination]

```typescript
// Sources: official Convex search/component docs; verified on a real backend.
const hits = await ctx.db
  .query("posts")
  .withSearchIndex("search_posts", (q) =>
    q
      .search("searchText", normalizedQuery)
      .eq("scopeId", scopeId)
      .eq("visibilityKey", "visible")
      .eq("boardKey", boardKey)
      .eq("statusKey", statusKey),
  )
  .take(SEARCH_HARD_LIMIT + 1);

return {
  contractVersion: 1,
  items: hits.slice(0, SEARCH_HARD_LIMIT).map(toSearchHitDto),
  hasMore: hits.length > SEARCH_HARD_LIMIT,
};
```

Optional board/status filters require either a small closed set of explicit search functions/builders or sentinel fields such as `boardFilterKey`/`statusFilterKey`; do not pass `undefined` as a wildcard because search equality means equality, not omission. [CITED: https://docs.convex.dev/search/text-search]

### Pattern 2: Materialized Per-Tag Search Projection

**What:** Keep canonical posts and tag joins, plus one bounded projection row per assigned tag containing `scopeId`, `postId`, `tagId`, current board/status/visibility keys, and normalized search text. A tag-filtered search queries this table's search index. [VERIFIED: disposable backend]

**When to use:** Only when a tag filter is present. Unfiltered/board/status search stays on the canonical posts search index so a multi-tag post appears once. The planner must set a hard per-post tag assignment ceiling so edit/move/archive mutations can update projection rows within known bounds. [VERIFIED: transaction-limit analysis]

### Pattern 3: Deterministic Similarity over Bounded Search Candidates

**What:** Use full-text relevance to produce a small candidate pool, then recompute a documented lexical score from normalized title/body tokens and sort by `(score desc, createdAt desc, opaqueId)` before truncating to the suggestion maximum. [CITED: https://docs.convex.dev/search/text-search]

**Why:** Convex does not expose a stable relevance score and explicitly reserves the right to change relevance behavior. Library-owned reranking provides the deterministic contract without scanning the posts table. [CITED: https://docs.convex.dev/search/text-search]

### Pattern 4: Atomic Event Capture plus Bounded Continuations

**What:** In the triggering mutation, write the domain change, one immutable logical event, its dedupe key, and either small inline recipient rows or a fan-out job. Schedule an internal mutation with `runAfter(0)` only after the durable guard exists. Each batch claims an indexed cursor/range, materializes a conservative number of recipients, records progress, and schedules the next batch in the same transaction. [CITED: https://docs.convex.dev/scheduling/scheduled-functions]

**When to use:** Notification fan-out, large tag deletion, and merge work that can exceed conservative application thresholds. Scheduling from mutations is atomic with the transaction; scheduled mutations are retried for internal errors and commit exactly once. Still make each step idempotent via a job ID, batch cursor, and unique logical guard so developer retries/manual repair cannot duplicate effects. [CITED: https://docs.convex.dev/scheduling/scheduled-functions]

```typescript
// Source: official Convex scheduler pattern, adapted to the locked event contract.
const eventId = await ctx.db.insert("notificationEvents", event);
const jobId = await ctx.db.insert("fanoutJobs", {
  scopeId,
  eventId,
  state: "pending",
  cursor: null,
});
await ctx.scheduler.runAfter(0, internal.jobs.continueFanout, { jobId });
```

Do not schedule one function per recipient. Although the platform permits up to 1,000 scheduled functions from one mutation, bounded continuation rows provide backpressure, resumability, poison handling, and predictable transaction usage. [CITED: https://docs.convex.dev/production/state/limits]

### Pattern 5: Lease-Based Host Delivery Outbox

**What:** The component exposes trusted server-only `claimDeliveryBatch`, `ackDelivery`, and `releaseDelivery` intents. Claim atomically selects pending/expired rows by `(scopeId, state, availableAt/leaseUntil)`, increments a lease version, records owner/expiry, resolves current non-PII `recipientKey`, and returns bounded typed facts. Ack/release require exact row ID plus lease version/token. [VERIFIED: disposable concurrent-claim backend]

**When to use:** The host owns the external action/cron and delivery vendor. The component scheduler owns only internal fan-out/materialization; it cannot assume host auth, PII, environment, or callback availability. [CITED: https://docs.convex.dev/components/authoring]

```typescript
// A stale worker cannot ack a row reclaimed under a newer leaseVersion.
if (
  row.state !== "leased" ||
  row.leaseOwner !== args.leaseOwner ||
  row.leaseVersion !== args.leaseVersion
) {
  return { ok: false, error: { code: "LEASE_LOST" } };
}
await ctx.db.patch(row._id, { state: "acked", ackedAt: Date.now() });
```

Use the stable logical event ID as the host idempotency key. Release increments attempts and sets a bounded backoff; after the configured threshold it parks the row in `deadLetter`. Lease expiry enables at-least-once redelivery, so host senders must be idempotent. [VERIFIED: CONTEXT.md D-40..D-42]

### Pattern 6: Consume Participation Limits in the Committing Mutation

**What:** Use `rateLimiter.limit`, not `check`, to consume an actor bucket and a sharded scope bucket. `check` is only a non-consuming preflight. Do not use `reserve: true` for interactive participation; reservation deliberately allows debt and is appropriate only for work that has already been accepted for later execution. [CITED: https://stack.convex.dev/rate-limiting]

**Failure semantics:** A mutation that returns an expected domain-error union after `limit()` commits the charge once. A mutation that throws rolls back the rate-limit write. Convex OCC retries rerun deterministically and only the committed attempt persists, which the 20-way real-backend spike confirmed. A denied `limit()` call returns retry timing without consuming another unit. [VERIFIED: disposable real backend] [CITED: https://docs.convex.dev/functions/mutation-functions]

```typescript
const limit = await rateLimiter.limit(ctx, "comment", {
  key: `${scopeId}:${actorId}`,
});
if (!limit.ok) {
  return failure("RATE_LIMITED", {
    operation: "comment",
    retryAfterMs: limit.retryAfter,
  });
}

// Semantic validation follows consumption and returns, rather than throws,
// when the failed logical attempt is intentionally chargeable.
const validation = validateComment(args.body);
if (!validation.ok) return failure("VALIDATION", validation.error);
```

Convex argument validators reject malformed wire values before handler code and therefore cannot consume a bucket. Interpret “invalid logical request” as a structurally valid intent that reaches semantic/domain validation; keep strict boundary validators and do not weaken them to charge malformed traffic. [VERIFIED: Convex function execution model]

### Pattern 7: Use Transaction Metrics and Explicit Headroom

**What:** Continuation mutations select conservative application batch sizes and, where useful, query `ctx.meta.getTransactionMetrics()` before nested work. Pass `transactionLimits` to bounded nested mutations so a batch fails and rolls back before consuming the parent's reserved finalization/scheduling headroom. [CITED: https://docs.convex.dev/database/writing-data]

**When to use:** Merge batches, tag cleanup, inbox trimming, and fan-out. Never set batch size equal to the platform maximum; document byte/document/index-range reserves and test worst-case row sizes. [CITED: https://docs.convex.dev/production/state/limits]

### Pattern 8: Wrap the Helper Hook; Do Not Build a Second Accumulator

**What:** For component-paginated feeds, import `usePaginatedQuery` from `convex-helpers/react`. It pins a prior page with `endCursor` when loading the next page, concatenates page results, splits growing pages, and resets after invalid cursors or serialized argument changes. [VERIFIED: installed `convex-helpers@0.1.120` source]

**Headless mapping:** Expose the helper's `results` directly as the accumulated DTO list and map `LoadingFirstPage`, `CanLoadMore`, `LoadingMore`, and `Exhausted` into Afferent's stable state vocabulary. Do not concatenate pages in another React state variable and do not deduplicate by post ID; both approaches can preserve stale rows or hide a legitimate page-boundary bug. [VERIFIED: installed helper source]

Actor-sensitive hooks must reset on logout and account switch. The three-state auth adapter needs a client-only opaque generation/session key that changes when the authenticated account changes, or the provider must remount its actor-sensitive subtree. This key is UX cache identity only and is never accepted as component authority. [VERIFIED: CONTEXT.md D-52 and helper reset behavior]

### Anti-Patterns to Avoid

- **Calling native `.paginate()` in a component:** real backend rejects it. Use helper pagination for ordinary indexes. [VERIFIED: disposable backend]
- **Calling `paginator(...).withSearchIndex(...)`:** installed helper throws `Cannot paginate withSearchIndex`. Use bounded search. [VERIFIED: installed source and disposable backend]
- **Post-filtering search/feed pages:** creates sparse pages and can leak hidden records through metadata/counts. Put visibility/filter keys in the index or use a bounded materialized projection. [CITED: https://docs.convex.dev/search/text-search]
- **One scheduled function per recipient:** spends scheduler/transaction budget and lacks coherent progress/retry state. Schedule one bounded continuation job. [CITED: https://docs.convex.dev/production/state/limits]
- **Throwing an expected chargeable failure after rate consumption:** the transaction rollback removes the charge. Return a typed failure result. [CITED: https://docs.convex.dev/functions/mutation-functions]
- **Using `reserve: true` as rejection:** reserve accepts debt; it does not implement an immediate hard denial. [CITED: https://stack.convex.dev/rate-limiting]
- **Reading all memberships to repair a counter:** platform scans/writes are finite; reconcile incrementally from canonical memberships during the bounded job. [CITED: https://docs.convex.dev/production/state/limits]
- **Finalizing a large merge before all projections are coherent:** readers may observe missing source relations or double counts. Keep an explicit pre-cutover job/guard and make the final public tombstone transition only after all batches are complete. [VERIFIED: transaction-limit analysis]

## Current Convex Limits and Planning Consequences

| Limit                                | Current Value  | Phase 2 Consequence                                                                                                                                    |
| ------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Query/mutation user-code time        | 1 second       | Batch loops conservatively; database time is excluded but JS projection/scoring still counts. [CITED: https://docs.convex.dev/production/state/limits] |
| Data read per transaction            | 16 MiB         | No unbounded merge/tag/fan-out scans; cap search candidates and DTO enrichment. [CITED: https://docs.convex.dev/production/state/limits]               |
| Data written per transaction         | 16 MiB         | Large relation moves and recipient materialization require continuations. [CITED: https://docs.convex.dev/production/state/limits]                     |
| Documents scanned                    | 32,000         | `.filter()` does not rescue a broad scan; every growing query needs an index/range. [CITED: https://docs.convex.dev/production/state/limits]           |
| Index ranges / DB queries            | 4,096          | Avoid N+1 recipient/actor enrichment; batch and cache bounded actor lookups where possible. [CITED: https://docs.convex.dev/production/state/limits]   |
| Documents written                    | 16,000         | Never select the platform maximum as an application batch size. [CITED: https://docs.convex.dev/production/state/limits]                               |
| Function return size                 | 16 MiB         | Stable DTO pages and delivery claims need hard row/byte ceilings. [CITED: https://docs.convex.dev/production/state/limits]                             |
| Scheduled functions per mutation     | 1,000          | Use one continuation per logical job, not per recipient. [CITED: https://docs.convex.dev/production/state/limits]                                      |
| Scheduled argument size / total      | 4 MiB / 16 MiB | Schedule IDs/cursors, never recipient lists or rendered payloads. [CITED: https://docs.convex.dev/production/state/limits]                             |
| Full-text search indexes per table   | 4              | One canonical and one tag-projection search index are comfortably within the cap. [CITED: https://docs.convex.dev/production/state/limits]             |
| Search filter fields / query filters | 16 / 8         | Scope, visibility, board, status, and tag fit; keep filter keys explicit. [CITED: https://docs.convex.dev/production/state/limits]                     |
| Search terms / term length           | 16 / 32 bytes  | Normalize, bound, and document query truncation/validation. [CITED: https://docs.convex.dev/production/state/limits]                                   |
| Search result set                    | 1,024          | Bounded search must stay well below this; never promise exhaustive global results. [CITED: https://docs.convex.dev/production/state/limits]            |

## Don't Hand-Roll

| Problem                     | Don't Build                                     | Use Instead                                                       | Why                                                                                                                                                                                                           |
| --------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component cursor pagination | Custom offset/cursor encoding                   | `convex-helpers/server/pagination` plus `convex-helpers/react`    | Handles component constraints, page pinning, splits, and reactive growth. [CITED: https://docs.convex.dev/components/authoring#pagination]                                                                    |
| Participation rate limiting | Homegrown bucket tables/math                    | `@convex-dev/rate-limiter`                                        | Transactional keys, windows, shards, retry timing, and reservation are already implemented. [CITED: https://stack.convex.dev/rate-limiting]                                                                   |
| Markdown parsing            | Regex Markdown validator                        | `mdast-util-from-markdown` plus a closed node/link allowlist      | Markdown nesting, escapes, HTML nodes, and links are parser concerns; reject disallowed AST nodes instead of interpreting markup with regex. [CITED: https://github.com/syntax-tree/mdast-util-from-markdown] |
| Durable background queue    | Generic job framework or per-recipient schedule | Convex scheduled internal mutations plus explicit domain job rows | Scheduling is durable and atomic from mutations; domain rows provide progress/idempotency. [CITED: https://docs.convex.dev/scheduling/scheduled-functions]                                                    |
| Exact growing counts        | `.collect().length`                             | Transactionally maintained counters with membership/event truth   | Scans have document/byte limits and become expensive. [CITED: https://docs.convex.dev/production/state/limits]                                                                                                |
| Search/tag intersection     | Filtering returned search pages in JS           | Materialized per-tag search projection                            | Keeps scope, visibility, board, status, and tag inside the search index. [VERIFIED: real-backend search spike]                                                                                                |

**Key insight:** Convex supplies the transaction, search, and scheduling primitives, but component isolation changes which combinations are legal. The implementation should compose the supported primitives explicitly rather than recreate their semantics behind a generic abstraction.

## Common Pitfalls

### Pitfall 1: Promising Cursor-Paginated Component Search

**What goes wrong:** The endpoint compiles but fails on a deployed backend, or the team invents offset pagination over relevance results. [VERIFIED: disposable backend]

**Why it happens:** General Convex search docs say search queries paginate, while component docs separately say native pagination is unavailable; helper docs do not support search indexes. [CITED: https://docs.convex.dev/search/text-search] [CITED: https://docs.convex.dev/components/authoring#pagination]

**How to avoid:** Freeze bounded search/similar DTOs and reserve cursors for indexed feeds. Add a real-backend negative test that native component search pagination and helper search composition remain unsupported, so a future Convex upgrade can deliberately revisit the contract. [VERIFIED: research spike]

**Warning signs:** Search DTO has `continueCursor`; component code calls native `.paginate()`; helper stream calls `withSearchIndex`.

### Pitfall 2: Optional Filters Become Post-Scan Filtering

**What goes wrong:** Search pages are sparse or leak hidden existence, and tag results silently miss relevant posts. [CITED: https://docs.convex.dev/search/text-search]

**Why it happens:** Search equality fields are scalar indexed fields; a many-to-many tag join cannot be queried as membership through the canonical post search index. [VERIFIED: schema/API analysis]

**How to avoid:** Put scope and visibility in every search filter expression, keep board/status optional branches explicit, and use the per-tag search projection. Bound tags per post and update projection rows transactionally with post/tag changes. [VERIFIED: real-backend projection spike]

**Warning signs:** `.filter()` after search; `items.filter(...)` after `.take()`; array-valued tag IDs treated as search-index membership.

### Pitfall 3: Large Merge Exposes a Half-Merged Public View

**What goes wrong:** Canonical counters change before comments/subscriptions move, or the source tombstone redirects while source relations are still absent from the canonical view. [VERIFIED: transaction-bound analysis]

**Why it happens:** Physical reparenting is potentially unbounded but public cutover is one logical transition. [VERIFIED: CONTEXT.md D-07..D-12]

**How to avoid:** Give merge its own job state machine. Keep source/canonical public projections on the pre-merge view while guarded batches prepare/reparent records with job markers, then perform one bounded final cutover that reconciles counters, flattens the redirect, activates canonical projection rows, and tombstones the source. If a chosen representation cannot make final cutover bounded, it is invalid and must be redesigned before implementation. [VERIFIED: first-principles transaction analysis]

**Warning signs:** First batch sets `mergedInto`; moved comments immediately appear/disappear; counters are added rather than reconciled; no crash-resume test exists at every batch boundary.

### Pitfall 4: Notification Fan-Out Multiplies Work or Drops Events

**What goes wrong:** A mutation schedules hundreds of recipient jobs, retries create duplicates, or a failure after the domain write loses the notification. [CITED: https://docs.convex.dev/scheduling/scheduled-functions]

**How to avoid:** Capture one logical event atomically, dedupe recipients by `(eventId, actorId)`, materialize bounded batches, and schedule only the next continuation. Test crash/retry at capture, mid-fanout, completion, inbox trim, and outbox claim. [VERIFIED: CONTEXT.md D-33..D-42]

**Warning signs:** Recipient arrays in scheduler args; no event guard; ordinary comments broadcast; initiator filtered only in the client.

### Pitfall 5: Lease Ack Is Not Fenced

**What goes wrong:** A slow worker acks a row after its lease expired and another worker redelivered it. [VERIFIED: lease analysis]

**How to avoid:** Increment a lease version/token on every claim and require the exact current token for ack/release. Resolve `recipientKey` at claim time and discard anonymized actors before delivery. [VERIFIED: disposable concurrent-claim spike]

**Warning signs:** Ack accepts only event ID; claim patches rows outside the selecting mutation; recipient contact is snapshotted in the component.

### Pitfall 6: Rate-Limit Charge Rolls Back on Expected Failure

**What goes wrong:** Invalid domain attempts are free because the mutation throws after consuming, or reserve mode admits requests that should be rejected. [VERIFIED: real-backend rate-limit spike]

**How to avoid:** Consume before semantic validation, return typed expected failures, and reserve throws for unexpected faults that should roll back all writes. Use `reserve: false` for interactive limits. Map `retryAfter` to the stable `retryAfterMs` error field. [CITED: https://docs.convex.dev/functions/mutation-functions]

**Warning signs:** `throws: true` followed by catch/rethrow; `check()` used as enforcement; `reserve: true` on post/comment/vote operations.

### Pitfall 7: Headless Hooks Maintain a Parallel Page Cache

**What goes wrong:** Removed/hidden rows remain visible, account switches show the prior actor's inbox, or dedupe masks gaps. [VERIFIED: helper source analysis]

**How to avoid:** Treat helper `results` as canonical, reset query args/provider generation on filters/auth actor change, and keep only allowed optimistic overlays for vote/subscription/read. [VERIFIED: CONTEXT.md D-47..D-52]

**Warning signs:** `setItems([...items, ...page])`; ID-based dedupe in hooks; auth adapter cannot signal account change; broad optimistic cache for admin mutations.

## Code Examples

### Component-Compatible Indexed Feed

```typescript
// Source: https://docs.convex.dev/components/authoring#pagination
const result = await paginator(ctx.db, schema)
  .query("posts")
  .withIndex("by_scope_status_score", (q) =>
    q
      .eq("scopeId", scopeId)
      .eq("visibilityKey", "visible")
      .eq("statusKey", statusKey),
  )
  .order("desc")
  .paginate(args.paginationOpts);

return { ...result, page: result.page.map(toPostDto) };
```

### Bounded Safe-Markdown Validation

```typescript
// Source: https://github.com/syntax-tree/mdast-util-from-markdown
import { fromMarkdown } from "mdast-util-from-markdown";

const tree = fromMarkdown(normalizeMarkdown(source));
visitEveryNode(tree, (node) => {
  if (!ALLOWED_NODE_TYPES.has(node.type)) invalidInput("unsupported markdown");
  if (node.type === "html" || node.type === "image")
    invalidInput("unsupported markdown");
  if (node.type === "link" && !isAllowedUrl(node.url))
    invalidInput("unsafe link");
});
```

Do not enable MDX, raw-HTML passthrough, GFM autolinks, images, or an HTML serializer in this validation path. Rendering code should map the validated AST to React elements without `dangerouslySetInnerHTML`. [VERIFIED: CONTEXT.md D-13..D-14]

### Helper Pagination Hook Mapping

```typescript
// Source: installed convex-helpers@0.1.120 react implementation.
const page = usePaginatedQuery(binding, argsOrSkip, { initialNumItems: 20 });

return {
  items: page.results,
  isLoading: page.status === "LoadingFirstPage",
  isLoadingMore: page.status === "LoadingMore",
  canLoadMore: page.status === "CanLoadMore",
  loadMore: () => page.loadMore(20),
};
```

## State of the Art

| Old/General Approach                | Current Phase 2 Approach                                     | Evidence                                                                                                              | Impact                                                |
| ----------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Native Convex pagination everywhere | Helper pagination inside components                          | Current official component docs and backend failure. [CITED: https://docs.convex.dev/components/authoring#pagination] | Requires matching helper React hook.                  |
| Cursor-paginate full-text search    | Bounded component relevance results                          | Both native and helper cursor paths fail in a component. [VERIFIED: disposable backend]                               | Search contract must not expose cursors.              |
| Fuzzy typo search                   | Prefix typeahead; fuzzy matching deprecated after 2025-01-15 | Current search docs. [CITED: https://docs.convex.dev/search/text-search]                                              | Similarity reranking must not assume typo correction. |
| Per-recipient scheduling            | Logical event plus resumable batch mutation                  | Current scheduler/transaction limits. [CITED: https://docs.convex.dev/scheduling/scheduled-functions]                 | Predictable retry and bounded work.                   |
| Client-maintained accumulated pages | Helper-managed reactive page stitching                       | Installed current helper source. [VERIFIED: local package source]                                                     | Prevents a second cache and stale actor data.         |

**Deprecated/outdated:** Treating Convex full-text relevance as fuzzy typo matching is outdated; current docs state fuzzy matching is deprecated. [CITED: https://docs.convex.dev/search/text-search]

## Assumptions Log

| #   | Claim | Section | Risk if Wrong |
| --- | ----- | ------- | ------------- |

All implementation claims in this research were verified against repository state, installed package source, official documentation, npm metadata, or a disposable real Convex backend. No `[ASSUMED]` claims require user confirmation.

## Open Questions

1. **What conservative application batch sizes should each continuation use?**
   - What we know: platform maxima are current and transaction metrics can reserve headroom. [CITED: https://docs.convex.dev/database/writing-data]
   - What's unclear: worst-case Phase 2 row sizes do not exist yet.
   - Recommendation: choose small initial document caps per job, add worst-case fixtures, and raise only from measured transaction metrics. This is planner discretion, not a user decision.

2. **How should account-switch resets be signaled to the headless provider?**
   - What we know: helper pagination resets on serialized argument changes, while the locked auth adapter has only three visible auth states. [VERIFIED: installed helper source and CONTEXT.md]
   - What's unclear: an authenticated-to-authenticated account switch needs a client cache generation change without exposing provider identity.
   - Recommendation: add an optional opaque `sessionGeneration` to the auth-state adapter or require a provider remount key; never send it as actor authority. This is module/API naming discretion.

3. **Should future Convex releases unlock paginated component search?**
   - What we know: it is unsupported on Convex 1.42.2 / convex-helpers 0.1.120. [VERIFIED: disposable backend]
   - What's unclear: the platform may add component search pagination later.
   - Recommendation: keep one real-backend negative/feature-detection test and revisit only in a versioned additive contract change; do not block Phase 2.

## Environment Availability

| Dependency                 | Required By                  | Available                       | Version              | Fallback                                                                                           |
| -------------------------- | ---------------------------- | ------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| Node.js                    | Build/tests/spikes           | ✓                               | `22.22.2`            | —                                                                                                  |
| npm                        | Package and clean fixture    | ✓                               | `10.9.7`             | —                                                                                                  |
| Convex CLI/local backend   | Real component tests         | ✓                               | `1.42.2`             | Anonymous disposable deployment used successfully.                                                 |
| TypeScript                 | Typecheck/build              | ✓                               | Working tree `7.0.2` | Preserve user-owned dirty experiment; clean committed baseline is documented in Phase 1 summaries. |
| Vitest                     | Model/component/hook tests   | ✓                               | `4.1.10`             | —                                                                                                  |
| `convex-helpers`           | Component feeds/hooks        | ✓                               | `0.1.120`            | —                                                                                                  |
| `@convex-dev/rate-limiter` | Participation limits         | Registry available; not in repo | `0.3.2`              | Install exact approved version in implementation plan.                                             |
| `mdast-util-from-markdown` | Safe Markdown AST validation | Registry available; not in repo | `2.0.3`              | Install exact approved version in implementation plan.                                             |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** none; the two approved new runtime dependencies require explicit package changes during implementation.

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies             | Standard Control                                                                                                                                            |
| --------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V2 Authentication     | yes                 | Host provider adapter resolves verified identity on every protected call; component never accesses `ctx.auth`. [VERIFIED: AGENTS.md]                        |
| V3 Session Management | yes                 | Actor-sensitive headless state resets on logout/account-generation change; browser session data is never component authority. [VERIFIED: CONTEXT.md D-52]   |
| V4 Access Control     | yes                 | Host authorizes admin every call; component rechecks scope/entity relations and uses not-found equivalence. [VERIFIED: AGENTS.md]                           |
| V5 Input Validation   | yes                 | Convex validators, bounded normalized plain text/Markdown AST allowlist, safe URL schemes, closed DTO/error unions. [VERIFIED: CONTEXT.md D-13..D-14, D-58] |
| V6 Cryptography       | no new cryptography | Reuse Phase 1 opaque IDs/scope derivation; do not invent cryptographic lease tokens or identity schemes. [VERIFIED: Phase 1 context]                        |

### Known Threat Patterns for Convex/React Stack

| Pattern                                    | STRIDE                  | Standard Mitigation                                                                                                                                         |
| ------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forged actor/admin/scope                   | Spoofing / Elevation    | Derive all authority in trusted host wrappers; pass only minimal verified facts. [VERIFIED: AGENTS.md]                                                      |
| Cross-scope ID/search/filter leak          | Information Disclosure  | Scope-leading indexes/search equality plus direct-ID scope recheck and not-found equivalence. [VERIFIED: Phase 1 patterns]                                  |
| Stored Markdown script/unsafe URL          | Tampering / Elevation   | Reject HTML/image/disallowed AST nodes and non-HTTP(S)/mailto links; render elements, never raw HTML. [VERIFIED: CONTEXT.md D-13..D-14]                     |
| Hidden post leaks via secondary projection | Information Disclosure  | One visibility predicate across search, roadmap, changelog links, counts, subscription/fan-out, and direct reads. [VERIFIED: CONTEXT.md D-53]               |
| Duplicate notification/outbox delivery     | Tampering / Repudiation | Logical event and recipient dedupe keys, stable event ID, fenced leases, idempotent host sender. [VERIFIED: CONTEXT.md D-34, D-40]                          |
| Stale lease ack                            | Tampering               | Lease owner/version fencing and expiry-based reclaim. [VERIFIED: lease spike]                                                                               |
| Rate-limit bypass or retry overcharge      | Denial of Service       | Transactional library limits keyed from server-derived scope/actor; expected failure returns; sharded scope bucket. [VERIFIED: rate-limit spike]            |
| Cross-account optimistic/page state        | Information Disclosure  | Clear actor-scoped hook state on logout/account switch; no parallel cache. [VERIFIED: CONTEXT.md D-52]                                                      |
| Unbounded merge/fan-out/tag cleanup        | Denial of Service       | Durable guards, conservative batches, transaction metrics/headroom, resumable scheduled mutations. [CITED: https://docs.convex.dev/production/state/limits] |

## Validation Note

`.planning/config.json` explicitly sets `workflow.nyquist_validation` to `false`, so the full `## Validation Architecture` section is intentionally omitted. QUAL-01 still requires implementation plans to extend the existing model, component, static, real-backend, React, and packed-consumer test layers. [VERIFIED: project config and requirements]

## Sources

### Primary (HIGH confidence)

- Disposable anonymous Convex `1.42.2` backend spike — proved bounded component search/filtering, both search-pagination failures, internal component scheduling, serialized concurrent leases, rate-limit commit/rollback, OCC retry accounting, and reservation debt.
- Installed `convex-helpers@0.1.120` source — paginator `withSearchIndex` rejection and React end-cursor/page-stitch/reset behavior.
- Repository `src/`, tests, package manifest, Phase 1 summaries, Phase 2 CONTEXT/requirements — current integration boundaries and reusable patterns.
- npm registry plus package-legitimacy seam — exact versions, publish dates, repositories, download signals, lifecycle scripts, and verdicts.

### Secondary (MEDIUM confidence)

- [Convex component authoring and pagination](https://docs.convex.dev/components/authoring#pagination) — native component pagination limitation and helper recommendation.
- [Convex full-text search](https://docs.convex.dev/search/text-search) — equality filters, relevance-only ordering, bounded retrieval, and search limits.
- [Convex production limits](https://docs.convex.dev/production/state/limits) — current transaction, scheduler, and search ceilings.
- [Convex scheduled functions](https://docs.convex.dev/scheduling/scheduled-functions) — atomic scheduling and mutation/action retry guarantees.
- [Convex mutation transactions](https://docs.convex.dev/functions/mutation-functions) and [writing data](https://docs.convex.dev/database/writing-data) — rollback, metrics, and nested transaction headroom.
- [Convex application-layer rate limiting](https://stack.convex.dev/rate-limiting) and [official rate-limiting guide](https://docs.convex.dev/agents/rate-limiting) — consume/check/reserve/shard semantics.
- [`mdast-util-from-markdown`](https://github.com/syntax-tree/mdast-util-from-markdown) — Markdown-to-AST parser contract.

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — existing pins plus official package source, registry checks, and real installation.
- Architecture: HIGH for search/pagination/rate/scheduler/outbox mechanics; MEDIUM-HIGH for large-merge staging because exact schema/row sizes are not implemented yet.
- Pitfalls: HIGH — primary failures and transactional behaviors were reproduced; future platform evolution remains possible.

**Research date:** 2026-07-16
**Valid until:** 2026-07-23 for Convex/helper/rate-limiter mechanics; revalidate exact versions and search-pagination support at execution.
