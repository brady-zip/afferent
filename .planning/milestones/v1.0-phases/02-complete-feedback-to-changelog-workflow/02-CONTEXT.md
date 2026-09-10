# Phase 2: Complete Feedback-to-Changelog Workflow - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 completes Afferent's provider-neutral feedback lifecycle on top of the verified Phase 1 component: indexed discovery and deterministic duplicate handling; authorized administration, moderation, tags, fixed statuses, rate limits, and activity history; a status-derived public roadmap; explicitly authored and published changelog entries; subscriptions, in-app notifications, and a vendor-neutral host delivery outbox; and a framework-light headless React contract over host-generated function references.

This phase owns component, trusted host-client, and headless behavior contracts plus their invariant and security tests. Phase 3 still owns copied shadcn interfaces and visual/accessibility implementation. Phase 4 still owns the hosted showcase/sandbox, deployment, and public release. The Phase 1 rules remain non-negotiable: one product per normal installation, server-derived scope/actor/admin authority on every call, stable versioned DTOs with opaque identifiers, scope-complete indexed reads, bounded work, and packed-consumer compatibility.

</domain>

<decisions>
## Implementation Decisions

### Discovery, Ranking, and Filtering

- **D-01:** Public feedback exposes three distinct indexed feed orders. Newest is creation time descending. Top is transactional `voteCount` descending. Trending uses a stored, transactionally recomputed additive-time hot score driven only by authenticated votes and comments; it is not a read-time decay, vote-velocity window, or Wilson score.
- **D-02:** Every feed order is a total order suitable for cursor pagination. Newest ties by opaque ID; Top and Trending tie by creation time and then opaque ID. Withdrawn, archived/hidden, and merged-source posts never appear.
- **D-03:** Search is an installation-wide relevance-only mode, separate from Newest, Top, and Trending. It accepts optional board, status, and single-tag filters. A supported filter combination must be index-served or use a bounded intersection; filtering after a scan is forbidden.
- **D-04:** Public feeds support both installation-wide and per-board views. Status-filtered feed indexes are added only for real screen/query shapes. Tags use a scoped many-to-many join and support one tag at a time in v1; multi-tag Boolean filtering is deferred.
- **D-05:** Compose-time similar-post suggestions search across every visible active board so duplicates placed on the wrong board are still found. The query is deterministic, relevance-ranked, bounded, and non-blocking. Its stable DTO includes opaque post ID, title, board, and status, but never a raw engine relevance score.
- **D-06:** The similar-post contract fixes a hard server-side maximum and visibility guarantees while leaving scoring thresholds, weights, and the smaller default count tunable. Submission is always allowed even when suggestions exist.

### Duplicate Merge and Direct Resolution

- **D-07:** Merging a source post into a live canonical post physically reparents comments, activity, subscription memberships, and changelog links. Vote and subscription memberships are unioned by actor, duplicate memberships are removed, and stored counters are reconciled from membership truth rather than added.
- **D-08:** Source title, body, board, author, and status are retained in one bounded admin-only merge-history record. Moved comments keep their original author. Anonymized authors continue to resolve to the generic anonymized identity.
- **D-09:** Source posts become durable redirect tombstones. Redirects are flattened to the final canonical post, cycles are forbidden, and a tombstone cannot be selected as a canonical target. Merge is irreversible in v1; no unmerge operation is exposed.
- **D-10:** Direct post lookup returns a discriminated `post | merged | notFound` result. A merged result contains only the requested tombstone ID and final canonical ID; callers fetch the canonical post separately. Tombstones never appear in feeds, search, roadmap, or changelog listings.
- **D-11:** Redirect visibility follows the canonical post's current visibility, not the source's former state. If the canonical post is hidden or inaccessible, both source and canonical identifiers return the same not-found-equivalent result and disclose no redirect.
- **D-12:** Merge semantics are atomic to readers. Small merges may finish in one transaction; large merges may use an immediate tombstone/guard plus bounded resumable continuations, but no public half-merged state is allowed.

### Content Safety, Status, Moderation, and Tags

- **D-13:** Post bodies, comments, and changelog bodies use one documented safe-Markdown subset. Store bounded normalized Markdown source; reject raw HTML and unsafe URL schemes at write time; require conforming renderers to build a sanitized element tree and never inject raw HTML.
- **D-14:** The subset permits headings, emphasis, lists, blockquotes, code, and hardened `http`, `https`, and `mailto` links. Inline images, media embeds, iframes, scripts, styles, and HTML passthrough are excluded. Post, board, tag, and changelog titles/names remain bounded normalized plain text.
- **D-15:** Visibility/lifecycle is orthogonal to the six built-in statuses. Active Open, Under Review, Planned, In Progress, Complete, and Closed posts remain public; Closed is visible but not on the roadmap. Admins may transition freely from any status to any other status, and every transition records activity and emits the same status-change notification behavior.
- **D-16:** Author withdrawal and admin archive hide a post uniformly from every public projection, direct lookup, count, and notification fan-out. Archived posts remain admin-inspectable and restorable. Archive does not change status or delete subscriptions; restore clears the flag, records activity, and emits no catch-up or restore notification.
- **D-17:** Discussion lock is an explicit admin action unrelated to status. It blocks new non-admin root comments and replies while preserving existing discussion; admins may still post an official reply. Voting and subscription changes remain permitted. Closed status never auto-locks or auto-disables votes.
- **D-18:** Tags are scope-owned records with opaque stable IDs and mutable public display names. Only admins create, rename, delete, assign, or remove tags; assigned tags and tag filters are public. Rename propagates through ID references. Delete removes join rows in bounded batches and records activity.
- **D-19:** Participation uses documented library-owned per-intent limits keyed by server-derived scope and actor for post creation, comments/replies/edits, votes, and subscribe/unsubscribe, plus sharded per-scope ceilings for expensive creation/comment paths. Limits are not installation-configurable in v1.
- **D-20:** Rate-limit failures use a stable `RATE_LIMITED` error with operation and `retryAfterMs`. Invalid and failed attempts consume once per logical request, while a rate-limited rejection is not double-charged and Convex retries do not multiply charge. Admin-only intents are outside participation buckets.

### Append-Only Activity

- **D-21:** Activity history is admin-only, versioned, cursor-paginated, append-only, and bounded per row. Public callers see current state rather than a redacted audit timeline.
- **D-22:** The closed additive taxonomy includes create, edit, status change, board move, tag add/remove, lock/unlock, archive/restore, merge, and changelog publish/unpublish. Entries carry occurrence time, an opaque initiating actor ID when applicable, and small typed event metadata.
- **D-23:** Edit events retain changed-field names, not old/new content snapshots. Merge is the bounded exception described in D-08. Activity never denormalizes actor display data; it resolves opaque actor IDs at read time so anonymization takes effect without rewriting history.

### Roadmap Projection

- **D-24:** The roadmap is a grouped projection of exactly Planned, In Progress, and Complete posts, with optional single-board filtering. Each status group paginates independently so a large Complete history cannot starve another column.
- **D-25:** Within a status, order by a stored `currentStatusSince` descending, then creation time and opaque ID. Update `currentStatusSince` transactionally on every status transition. There is no manual roadmap ordering or independent roadmap entity.
- **D-26:** Complete uses a documented fixed recency window so the roadmap remains current; the exact duration is planner discretion. Older completed posts remain available through browse/search and published changelog history. Every roadmap row applies the same visibility predicate as direct feedback reads.

### Changelog Editorial Lifecycle

- **D-27:** Every changelog entry has an opaque immutable ID plus a scope-unique human-readable slug. The slug is provisional and admin-editable while draft, then immutable at first publish. Auto-derived collisions get deterministic suffixes; explicit admin-chosen collisions return an actionable error.
- **D-28:** Published entries are public and cursor-paginated by immutable `firstPublishedAt` descending. Draft and unpublished entries are admin-only and not-found-equivalent publicly. Published content may be edited in place, updating `updatedAt` without changing slug, first-publication time, or list position.
- **D-29:** Publish and unpublish are explicit idempotent admin intents. Unpublish hides the entry but retains its slug and `firstPublishedAt`; republish restores the same URL and position. Preview/confirmation is a UI concern, not a browser-supplied backend flag.
- **D-30:** Changelog links are optional editorial references and are always orthogonal to post status. A draft may link any live canonical post; a published entry may link any visible canonical post. Publishing never changes a post status, and status changes never publish, hide, or remove a changelog link.
- **D-31:** Merge repoints and deduplicates links. Withdrawal/archive hides a linked post from public entry DTOs but preserves the admin relationship; restore makes it visible again. A published entry remains public even when it has zero currently visible links.
- **D-32:** Subscriber notification is deduplicated once per linked-post/entry pair: first publish covers links present then, and adding a link to an already published entry covers only the newly linked post. Edits, unpublish, republish, removal, and idempotent publish calls do not notify again.

### Subscriptions and In-App Notifications

- **D-33:** The v1 notification event set is exactly: status change to current subscribers; admin reply to current subscribers; comment reply to the parent-comment author; structured mention to mentioned actors; and linked-changelog publication to linked-post subscribers. Ordinary non-admin comments do not broadcast.
- **D-34:** Never notify the initiating actor. Deduplicate by recipient plus logical event and collapse a reply plus mention of the same actor into one notification. Merge moves subscriptions to the canonical post but a merge-notification event is deferred.
- **D-35:** Mentions are validated safe-Markdown nodes carrying a scoped opaque actor ID. Display is resolved when rendering; renamed or anonymized actors render current safe attribution, and invalid/anonymized targets receive no notification.
- **D-36:** A post author auto-subscribes on creation and a commenter auto-subscribes when commenting; voting does not subscribe. An explicit unsubscribe is a durable opt-out that later comments cannot override until the actor explicitly subscribes again.
- **D-37:** The inbox stores one deduplicated row per recipient and logical event, lists newest first with cursor pagination, exposes an exact transactionally maintained unread count, and supports idempotent mark-one-read. Mark-all-read is deferred.
- **D-38:** Inbox retention is a documented fixed rolling per-actor cap enforced on insert by trimming oldest rows. Source activity remains durable; inbox rows are a bounded derived signal. The exact cap is planner discretion.

### Vendor-Neutral Host Delivery

- **D-39:** Every logical notification event is captured transactionally with its triggering domain mutation. Small recipient sets may materialize inbox/outbox rows inline; large fan-out uses bounded resumable continuations over the captured event so no event is lost and transaction limits are respected.
- **D-40:** The component owns recipient eligibility and creates one host-delivery row per eligible actor. Trusted host-only APIs claim bounded leased batches, then ack or release events. Leases expire for redelivery. Delivery is at-least-once with an opaque stable event ID/idempotency key, bounded retry, acked-row pruning, and poison-event parking/dead-letter behavior.
- **D-41:** Delivery payloads are versioned typed facts containing opaque entity IDs, event metadata, sequence, and occurrence time—never email, provider records, display data, or rendered messages. Ordering is best-effort; sequence/time help hosts deduplicate, order, or coalesce without a strict global/per-key guarantee.
- **D-42:** At claim time, the trusted server-only DTO resolves recipient actor ID to the stored provider-neutral non-PII `externalKey` and exposes it as `recipientKey`. The host resolves current contact data and channel preferences. Anonymized actors are discarded before delivery. Event IDs/metadata are snapshotted; deliverability and recipientKey are resolved fresh.

### Headless React Contract

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

### Cross-Cutting Invariants

- **D-53:** One visibility predicate governs feeds, search, suggestions, roadmap, changelog links, counts, direct lookup, subscriptions, and notification fan-out. No secondary projection may reveal data hidden by the primary post read.
- **D-54:** Merge, hide/restore, and anonymize semantics apply consistently across votes, comments, tags, activity, changelog links, subscriptions, notifications, and delivery. A related row never becomes an existence or identity oracle.
- **D-55:** Status is workflow state, not an automation trigger. It never auto-publishes changelog, auto-locks discussion, blocks voting, gates changelog linking, or hides links.
- **D-56:** Potentially unbounded writes use atomic logical capture/guard plus bounded resumable continuations. This pattern governs large merges, notification fan-out, widely used tag deletion, and future bulk operations.
- **D-57:** Activity actors, mention targets, and delivery recipients store stable opaque identity references and resolve current safe display/deliverability later. Never denormalize display names or contact PII into append-only/event records.
- **D-58:** Public contracts retain Phase 1's stable versioned DTOs, opaque branded IDs, validators, and additive evolution. Adding a value to a closed TypeScript union must follow an explicit compatible versioning strategy rather than silently widening the v1 contract.

### Planner Discretion

- Choose exact score constants for Trending, safe-Markdown field length limits, fixed rate-limit values/windows, Complete roadmap recency duration, inbox cap, lease duration, retry/dead-letter thresholds, and default debounce/suggestion counts while preserving the stable ceilings and semantics above.
- Choose the exact additive schema migration and DTO version-bump strategy needed to expand Phase 1's literal `open` status, empty tag projection, and v1 post/read contracts. Do not break packed consumers or weaken validators.
- Choose transaction-versus-continuation thresholds and internal job structure. The observable semantics, scope isolation, idempotency, and boundedness above are locked.
- Choose final hook/function/type names and module organization. The grouped capability boundaries, state vocabulary, security boundary, and framework independence are locked.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and Phase Contract

- `.planning/PROJECT.md` — Current product boundary, core value, host/component security ownership, one-product model, and Phase 2 current state.
- `.planning/REQUIREMENTS.md` — Authoritative Phase 2 requirements: DISC-01..08, ADMN-01..10, RMAP-01..03, CHLG-01..06, NOTF-01..07, UI-01..03, and QUAL-01.
- `.planning/ROADMAP.md` — Fixed Phase 2 goal, dependency, success criteria, and separation from Phase 3 copied UI and Phase 4 release/demo work.
- `.planning/STATE.md` — Phase position, carried-forward decisions, and the real-backend search/pagination and vote-counter concern.
- `AGENTS.md` — Security non-negotiables, bounded-query/release gates, source ownership, and h5i workflow rules.

### Prior Contract and Research

- `.planning/phases/01-secure-installable-feedback-board/01-CONTEXT.md` — Locked scope, identity, anonymization, packed-contract, pagination, vote-membership, and host-authority decisions inherited by Phase 2.
- `.planning/research/SUMMARY.md` — Complete lifecycle synthesis, recommended architecture, Phase 2 research flags, content/notification gaps, and feature deferrals.
- `.planning/research/ARCHITECTURE.md` — Component/host/headless boundaries, query shapes, event/outbox direction, package layout, and build order.
- `.planning/research/PITFALLS.md` — Visibility leaks, stored XSS, scan/pagination hazards, counter contention, contract coupling, and headless/copied-UI drift risks.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `src/component/schema.ts` already establishes mandatory `scopeId` ownership, scope-leading indexes, transactional vote/comment counters, and the Phase 1 boards/actors/posts/votes/comments base. Phase 2 extends this additively with statuses, tags/joins, activity, merge tombstones, subscriptions, notifications/outbox, and changelog relations.
- `src/client/contracts.ts` supplies branded IDs, versioned DTO validators, pagination DTOs, grouped read/participation/admin capability interfaces, and intent validators. Phase 2 should extend this contract discipline rather than expose raw documents or generic CRUD.
- `src/client/internal.ts`, `src/client/index.ts`, and `src/client/server.ts` provide the trusted fixed-scope/scoped client factories and per-call scope, actor, and admin resolution. New server capabilities must continue deriving authority here and remain grouped by read, participation, and admin/server-only intent.
- `src/component/public/posts.ts` already uses bounded reactive pagination, installation read-policy checks, scope guards, and honest capped counts. New feeds, search, roadmap, changelog, activity, and inbox reads should preserve those patterns.
- `src/component/model/views.ts` centralizes safe DTO projection and anonymized actor rendering; `src/component/model/errors.ts` establishes structured public errors that Phase 2 can version and expand.

### Established Patterns

- Every component row and index/search path is scope-complete; direct identifiers are rechecked and cross-scope IDs are not-found-equivalent.
- Vote/comment membership is canonical and counters update transactionally; count DTOs never present capped values as exact.
- Browser intents contain identifiers and desired actions only. Verified actor facts and admin permission originate in trusted host resolvers on every call.
- Tests already separate component invariants, static schema/contract checks, auth conformance, real-backend pagination, scope matrices, and packed-artifact verification.

### Integration Points

- `src/component/feedback.ts` is the component export surface that will add narrow public, participation, admin, roadmap, changelog, notification, and server-delivery operations.
- The current `PostDto` hard-codes `status: open` and empty tags. Phase 2 must evolve declarations, validators, generated component bindings, host capability interfaces, fixtures, and tests together.
- No React entry point exists yet. Phase 2 creates the provider/hooks layer over consumer-supplied generated host refs; it must consume packed exports rather than repository-relative source.
- QUAL-01 should extend `tests/model`, `tests/component`, `tests/integration`, `tests/static`, and the packed fixture to cover merge union/reconciliation, uniform visibility, safe content, status/roadmap projection, changelog idempotency, notification dedupe, outbox retry/idempotency, and headless async states.

</code_context>

<specifics>
## Specific Ideas

- Keep search relevance separate from feed sorting; never claim that a relevance result is also Newest, Top, or Trending.
- Use a Reddit-style stored additive-time hot score rather than elapsed-time decay so Trending stays indexable without cron-driven rewrites.
- Treat a merged post as a normal typed redirect state, not a thrown error or silent identity swap.
- Keep roadmap as the current/recent status view and changelog as durable editorial history.
- Make the built-in inbox and host outbox two materializations of one logical notification event; the component chooses recipients and the host chooses contact channel/rendering.
- Phase 3's copied shadcn UI must consume the same headless behavior contract rather than recreate data fetching, optimism, auth gating, or error rules.

</specifics>

<deferred>
## Deferred Ideas

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

</deferred>

---

_Phase: 2-Complete Feedback-to-Changelog Workflow_
_Context gathered: 2026-07-16_
