# Phase 2: Complete Feedback-to-Changelog Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 2-Complete Feedback-to-Changelog Workflow
**Areas discussed:** Discovery/ranking/merge, moderation/content safety/activity, roadmap/changelog, notifications/host delivery, headless React contract
**Question routing:** At the user's direction, every discussion question was sent to the live interactive Claude peer through h5i radio. Codex evaluated the replies, enforced the roadmap scope guard, and recorded the accepted decisions.

---

## Discovery, Ranking, and Duplicate Merge

| Decision                 | Alternatives considered                                                         | Selected                        |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------- |
| Feed ordering            | Stored indexable Newest/Top/Trending; recent vote velocity; Wilson score        | Stored indexable orders ✓       |
| Newest meaning           | Creation time; latest meaningful activity                                       | Creation time ✓                 |
| Search/suggestions scope | Installation-wide; board-only suggestions; board required                       | Installation-wide ✓             |
| Merge storage            | Physical reparent/deduplicate; aggregate at read time; strand source discussion | Physical reparent/deduplicate ✓ |
| Merged direct get        | Typed post/merged/notFound; silent follow; thrown merged error                  | Typed result ✓                  |
| Merge reversal           | Irreversible v1; implement unmerge                                              | Irreversible v1 ✓               |
| Tag filtering            | Single indexed tag; multi-tag Boolean combinations                              | Single indexed tag ✓            |

**User's choice:** Discuss all subareas. The live peer selected the indexable stored-order, installation-wide discovery, physical merge, typed redirect, and bounded single-tag contract.

**Notes:** Trending is a stored additive-time hot score, not a score that changes merely as time passes. Merge unions vote/subscription memberships by actor, preserves source history, flattens tombstones, and never exposes a hidden canonical through its source ID. The real-backend search/pagination composition remains a planning/execution spike, not a product-decision gap.

---

## Moderation, Content Safety, and Activity History

| Decision              | Alternatives considered                                           | Selected                   |
| --------------------- | ----------------------------------------------------------------- | -------------------------- |
| Content format        | One safe-Markdown subset; plain text; split plain/Markdown model  | One safe-Markdown subset ✓ |
| Archived direct links | Uniform public hiding; stable-URL public read                     | Uniform hiding ✓           |
| Closed behavior       | Status only; automatically lock/vote-block                        | Status only ✓              |
| Rate limits           | Fixed per-intent; installation-configurable; one global bucket    | Fixed per-intent ✓         |
| Activity visibility   | Admin-only; redacted public plus admin; same public/admin history | Admin-only ✓               |
| Edit history          | Changed-field names; old/new content snapshots                    | Changed-field names ✓      |
| Status transitions    | Free any-to-any; enforced state machine                           | Free any-to-any ✓          |

**User's choice:** The live peer selected one safe content pipeline, uniform lifecycle visibility, fixed abuse limits, and an admin-only bounded activity contract.

**Notes:** Raw HTML and unsafe schemes are rejected, sanitized element-tree rendering is mandatory, and inline media is deferred. Archive/withdraw are visibility flags orthogonal to status. Codex rejected the peer's suggestion to add author re-publish because FDBK-04 does not require it; storage may remain future-compatible, but no Phase 2 API is added.

---

## Roadmap and Changelog Lifecycle

| Decision             | Alternatives considered                                                             | Selected                 |
| -------------------- | ----------------------------------------------------------------------------------- | ------------------------ |
| Roadmap shape        | Independently paginated status groups; vote-ranked groups; flat feed                | Status groups ✓          |
| Roadmap order        | Entry into current status; vote count                                               | Current-status time ✓    |
| Changelog URL        | Immutable first-publish slug plus opaque ID; opaque ID only; mutable slug redirects | Immutable slug plus ID ✓ |
| Link/status coupling | Editorial links independent of status; require Complete; publish marks Complete     | Independent links ✓      |
| Published revisions  | Edit in place; reset/re-notify on republish; immutable published entries            | Edit in place ✓          |
| Notification repeat  | Once per post/entry pair; every republish                                           | Once per pair ✓          |

**User's choice:** The live peer selected a current-status roadmap projection and a stable, explicit editorial changelog lifecycle.

**Notes:** Complete is recency-bounded on roadmap while full history remains discoverable. Entries may publish without links. Unpublish retains slug and first-publication ordering; republish restores without re-notifying. Post status never drives publication, discussion locks, link visibility, or post-link eligibility.

---

## Notifications and Host Delivery

| Decision             | Alternatives considered                                              | Selected                      |
| -------------------- | -------------------------------------------------------------------- | ----------------------------- |
| Event set            | Required NOTF events; add merge notification                         | Required set only ✓           |
| Mentions             | Structured safe-Markdown actor tokens; separate ID argument          | Structured tokens ✓           |
| Auto-subscribe       | Author/commenter; vote too; manual only                              | Author/commenter ✓            |
| Retention            | Rolling per-actor cap; indefinite; age-only                          | Rolling cap ✓                 |
| Host seam            | Transactional leased outbox; scheduled callback; cursor only         | Transactional leased outbox ✓ |
| Recipient resolution | Host-only claim-time recipientKey; lookup API; host reverse map      | Claim-time recipientKey ✓     |
| Fan-out              | Logical event plus bounded continuation; write all recipients inline | Bounded continuation ✓        |

**User's choice:** The live peer selected the bounded in-app inbox, transactional at-least-once outbox, and trusted claim-time identity resolution.

**Notes:** Codex enforced the literal Phase 2 event boundary and deferred merge notifications despite the peer's product argument for them. The component owns eligibility; the host owns contact lookup, channel preferences, message rendering, and vendor integration. Large fan-outs capture one event atomically and materialize recipients resumably.

---

## Headless React Contract

| Decision             | Alternatives considered                                       | Selected                  |
| -------------------- | ------------------------------------------------------------- | ------------------------- |
| Injection            | One grouped provider; provider per domain; refs per hook      | One grouped provider ✓    |
| Hook surface         | Domain hooks; generic query hook; server-function mirrors     | Domain hooks ✓            |
| Pagination           | Accumulate reactive pages in hook; caller cursor management   | Hook-managed ✓            |
| Optimism             | Reversible actions only; every mutation; none                 | Reversible actions only ✓ |
| Mutation results     | Typed resolved results; rejected promises for expected errors | Typed results ✓           |
| Auth/error rendering | Explicit inline states; generic errors; Suspense/throws       | Explicit inline states ✓  |

**User's choice:** The live peer selected one framework-light provider and a domain-shaped hook contract with explicit async/auth/error states.

**Notes:** Optional capability groups return unsupported/not-configured rather than breaking provider initialization. Client admin state is never trusted. Only vote, subscribe, and mark-read use Convex-native optimistic updates. Account changes clear actor-scoped state. Hooks do not navigate, toast, require Suspense, or maintain a parallel cache.

---

## D-12 Atomicity Correction

**Date:** 2026-07-16

During Plan 02-05 execution review, the live peer and Codex identified that the implemented large-merge continuation physically reparents or deletes source relations before the final tombstone. A combined canonical-plus-source reader can therefore observe a partial transfer even though direct post lookup does not redirect until finalization.

The accepted additive correction is Plan 02-11: retain the one-transaction path for at most 50 total affected rows; prepare larger unions in invisible `mergeJobId`-tagged stage rows without altering source originals; use `preparing -> ready -> cutover_done -> cleaning -> done` plus pre-cutover `aborted`; publish the tombstone, redirect, precomputed counters, and reader-truth switch in exactly one transaction; and make cleanup observationally inert. Real Convex tests must continuously observe canonical plus source state, kill/resume every phase, cover abort and concurrent vote/comment writes, and prove exact convergence.

---

## Headless Query and Identity Correction

**Date:** 2026-07-17

Phase verification found that the public hook error branches were synthetic: Convex `useQuery` and the selected pagination helper throw query failures during render before Afferent can map them. It also found that optional `sessionGeneration` collapses authenticated users into `authenticated:default`, while effect-only clearing and unfenced promises can expose one actor's state after an account switch.

The live peer rejected a library-owned React error boundary. The accepted additive correction is Plan 02-12: inject the host's Convex watch client into `AfferentProvider`; implement direct and per-page `watchQuery` stores consumed through `useSyncExternalStore`; catch `localQueryResult` failures into the closed typed state; retain successful pages across later-page errors; and atomically replace split pages only after both replacements load. Mounted tests and a disposable real Convex backend must prove initial/refetch failure, recovery, later-page retention, growth, shrink, and split behavior for the published domain hooks.

D-43 is amended so authenticated adapter state requires a non-empty opaque `identityToken` that is stable within one identity and distinct across identities. The provider synchronously derives and advances a browser-local generation whenever auth status or token changes, including logout/login and A-to-B-to-A; there is no default authenticated identity. The token itself is never serialized. Where a distinct Convex query key is required for page or optimistic isolation, the derived generation is a validated cache discriminator that host wrappers explicitly strip or ignore; it never supplies actor, scope, or admin authority. Query/page state, pending/error/retry state, and native optimistic projections are generation-owned; every async operation captures its start generation and drops stale completion-side work. This amendment makes D-51 and D-52 enforceable without changing their explicit-state and account-clearing outcomes.

---

## the agent's Discretion

- Exact Trending constants, field sizes, rate-limit values/windows, Complete recency window, inbox cap, lease/retry thresholds, and debounce defaults.
- Exact additive schema/DTO versioning plan, provided the literal Phase 1 `open` contract is not silently broken.
- Exact continuation thresholds, internal job decomposition, function/type names, and file layout.
- Exact safe-Markdown parser/renderer libraries, subject to the locked allowlist and stored-XSS tests.

## Deferred Ideas

- True elapsed-time Trending decay.
- Multi-tag Boolean filters.
- Unmerge and author re-publish.
- Inline images/media/upload handling.
- Configurable participation limits.
- Public activity timeline and content-version history.
- Merge notification event.
- Mark-all-read and age-based notification expiry.
- Optional reverse post-to-changelog lookup unless a scoped screen proves it necessary.
