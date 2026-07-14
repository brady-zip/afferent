# Feature Research

**Domain:** Convex-native product feedback, public roadmap, and changelog component
**Researched:** 2026-07-14
**Confidence:** MEDIUM

## Executive Recommendation

A credible Afferent v1 should be a complete feedback loop, not a miniature product-management suite. It must let a user discover existing feedback, submit or vote without creating fragmentation, discuss it, see a trustworthy status, and later discover the shipped result. It must let an administrator search, organize, merge, moderate, and change status without losing attribution or history.

The ruthless boundary is: ship deterministic feedback operations and an integration-friendly event surface; defer intelligence, reporting, and named third-party workflows. Canny and Quackback prove the value of AI and integration breadth, but Fider proves that a deliberately small feedback portal remains credible when its core is reliable. Afferent's differentiator is not feature count. It is native Convex ownership, host-controlled identity and authorization, and source-owned React UI.

Evidence labels used below:

- **Verified:** documented by an official product source and, where available, cross-checked in the official repository.
- **Inference:** a recommendation derived from the product goal or recurring competitor patterns, not a claim that every competitor implements it.
- Online-source confidence is **MEDIUM** under the project's research confidence classifier, even when the source is official; fast-moving products and sparsely documented UI behavior limit stronger claims.

## Feature Landscape

### Table Stakes (Users Expect These)

Missing these makes the core workflow incomplete or unsafe for production.

| Feature | Why Expected | Complexity | v1 Recommendation | Evidence / Confidence |
|---------|--------------|------------|-------------------|-----------------------|
| Multiple feedback boards | Teams need at least coarse separation such as feature requests and bugs | MEDIUM | Launch | Recurs in Canny and Quackback; already agreed project scope. Verified, MEDIUM |
| Public browsing with host-controlled authenticated participation | Low-friction discovery plus trustworthy identity for writes is Afferent's agreed default | MEDIUM | Launch with installation-wide policy | Project decision; ClearFlask explicitly discusses the participation-friction tradeoff. Verified + inference, MEDIUM |
| Create, view, edit, and withdraw feedback | A feedback product without lifecycle-safe post operations feels broken | MEDIUM | Launch; restrict editing/withdrawal to author or host-authorized admin | Canny documents post creation and limited author deletion; Fider validates the narrow portal model. Verified, MEDIUM |
| One vote per stable identity, unvote, voter count | Voting is the basic demand signal and the central behavior in all compared products | MEDIUM | Launch; enforce idempotency server-side | Canny, Quackback, ClearFlask, and Fider all document voting. Verified, MEDIUM |
| Threaded or flat comments with author identity | Teams need context beyond a vote and admins need a public response channel | MEDIUM | Launch with flat chronological comments and optional reply reference; do not build deep nesting | All four products document discussion/comments. Verified, MEDIUM |
| Search, sort, and filters | Users must discover existing requests; admins must triage more than a few dozen posts | MEDIUM | Launch with text search plus board, status, tag, and sort filters | Canny documents search/sort/filter; ClearFlask tags are searchable; Fider describes organized, searchable feedback. Verified, MEDIUM |
| Create-time similar-post suggestions | Preventing fragmentation is cheaper and better UX than cleaning it up later | MEDIUM | Launch using deterministic lexical search; show suggestions before final submit | Manual search is recurring; AI is not required. Inference from verified duplicate workflows, MEDIUM |
| Manual duplicate merge and redirect | Duplicate votes and comments otherwise split demand and confuse users | HIGH | Launch; preserve votes, comments, authorship, and a merge tombstone/redirect; support safe unmerge only if provenance permits | Canny explicitly preserves votes/comments and supports unmerge; ClearFlask and Quackback support merge; Fider models duplicate state. Verified, MEDIUM |
| Configurable statuses and status history | Status is the bridge from feedback to roadmap and user trust | MEDIUM | Launch; define display order, roadmap visibility, terminal behavior, and status-change reason/comment | Canny, ClearFlask, Quackback, and Fider all expose workflow state. Verified, MEDIUM |
| Status-derived public roadmap | The agreed product slice includes a transparent planned/in-progress/complete view | MEDIUM | Launch; derive from post status rather than add a second roadmap entity | Canny, Quackback, and ClearFlask prominently provide public roadmaps. Verified, MEDIUM |
| Manual changelog entries linked to feedback | Completes the feedback-to-shipped loop without unsafe auto-publishing | MEDIUM | Launch with draft/published states, publish date, rich text/media, and links to posts | Canny and Quackback document linked changelog entries; ClearFlask provides announcements. Verified, MEDIUM |
| Admin post management | Admins need to edit, move board, set status, add/remove tags, lock discussion, and archive/restore | HIGH | Launch | Canny documents managing/bulk editing; Quackback documents an admin inbox; Fider current source contains admin routes. Verified, MEDIUM |
| Minimum moderation controls | Publicly readable community content needs a response to abuse even when writing requires host auth | HIGH | Launch with delete/restore, comment lock, author block signal, and admin-only visibility; reporting/approval queue may follow | Canny documents moderation; Quackback has a moderation queue; Fider current source has optional approve/decline/block routes. Verified, MEDIUM |
| Admin-only tags and filters | Multiple boards are too coarse for triage; lightweight tags avoid a full taxonomy system | MEDIUM | Launch with admin-managed multi-tags; keep public categories out of the critical path | Canny distinguishes internal tags from public categories; ClearFlask supports rule-based tags; Fider source implements tags. Verified, MEDIUM |
| Close-the-loop notification events | Voters need to learn about meaningful updates; otherwise feedback disappears into a black box | HIGH | Launch durable in-app notifications/subscriptions and typed delivery events for status changes, admin replies, mentions, and linked changelog publication; host owns email delivery | Canny, ClearFlask, and Fider document email/web notifications; Canny emails voters on status changes. Verified + inference, MEDIUM |
| Per-post activity/history | Merges, status changes, moderation, and changelog links must remain understandable and debuggable | MEDIUM | Launch an append-only domain-event timeline for meaningful post mutations | Quackback documents a full activity timeline; Canny merge/status activity is surfaced in post context. Verified + inference, MEDIUM |
| Data export | Native ownership is undermined if adopters cannot extract posts, votes, comments, statuses, tags, and changelog data | MEDIUM | Launch machine-readable export API; CSV UI can follow | Canny documents CSV/API export; Quackback advertises CSV/JSON export; Fider source exposes export routes. Verified, MEDIUM |
| Accessible keyboard and screen-reader behavior | A public React surface is not production-ready if core actions cannot be operated or understood accessibly | HIGH | Launch quality gate: semantic elements, names/labels, focus management, error association, contrast, reduced motion, and keyboard coverage; target WCAG 2.2 AA behavior without claiming certification | W3C says WCAG applies to dynamic web and mobile content. Verified standard + inference, MEDIUM |
| Responsive user and admin interfaces | Feedback is often submitted in-app or from support contexts on narrow screens | MEDIUM | Launch quality gate across small phone, tablet, and desktop layouts; tables must collapse or scroll safely | Quackback explicitly advertises desktop/mobile widget support; W3C mobile guidance covers small screens and touch input. Verified + inference, MEDIUM |
| Stable typed integration surface | A reusable component must support custom UIs and host-owned authorization without private-table coupling | HIGH | Launch typed component APIs plus headless React hooks/providers | Project core value and constraints. Verified project requirement, HIGH |

### Differentiators (Competitive Advantage)

These create adoption leverage but should not expand Afferent into a Canny clone.

| Feature | Value Proposition | Complexity | Timing | Evidence / Confidence |
|---------|-------------------|------------|--------|-----------------------|
| Convex-native data, transactions, and reactive updates | Feedback lives beside the product and reacts in real time without a separate SaaS data silo | HIGH | v1 | Core value; competitors emphasize ownership, but Afferent's component-native integration is distinct. Project evidence, HIGH |
| Provider-neutral host-owned identity and admin authorization | Convex Auth, Clerk, and Better Auth users participate without a second account or admin source of truth | HIGH | v1 | Core project decision. Project evidence, HIGH |
| Headless React plus source-owned shadcn UI | Teams get a polished start while retaining complete behavior and styling ownership | HIGH | v1 | Core project decision; Quackback also uses shadcn internally, but Afferent distributes source as the customization model. Project evidence + verified repo, MEDIUM |
| Installation-wide policy contract | Secure defaults remain configurable without per-board ACL complexity | MEDIUM | v1 | Agreed product boundary. Project evidence, HIGH |
| Delivery-agnostic notification outbox | Host apps can map feedback events to their existing email, push, or internal notification system | HIGH | v1 | Native-integration differentiator inferred from recurring competitor notification needs. Inference, MEDIUM |
| First-class integration primitives | Typed APIs, durable events/webhooks, stable external IDs, and export allow integrations without shipping every vendor connector | HIGH | v1 foundation; richer primitives v1.x | Canny and Quackback demonstrate integration demand. Verified + inference, MEDIUM |
| Public resettable per-user admin sandbox | Developers can evaluate the complete admin flow without shared-demo vandalism | MEDIUM | v1 example | Agreed repository showcase. Project evidence, HIGH |
| AI-assisted duplicate suggestions | Reduces triage load after corpus size makes lexical matching insufficient | HIGH | v1.x/v2, only after evaluation data exists | Quackback documents embeddings + full-text + LLM verification; Canny markets AI deduplication. Verified, MEDIUM |
| Feedback summaries and sentiment signals | Helps teams review long threads and high-volume qualitative feedback | HIGH | v2 | Canny documents comment summaries; Quackback markets summaries and sentiment. Verified, MEDIUM |
| Analytics and segment-aware prioritization | Helps mature teams compare demand across valuable cohorts rather than raw vote totals | HIGH | v2 | Canny has activity, customer-request, theme, and roadmap reporting. Verified, MEDIUM |
| Migration/import toolkit | Reduces switching cost for teams leaving spreadsheets or Canny-like tools | HIGH | v1.x after schema stabilizes | Canny supports CSV/API import; Quackback and Fider expose import/export capabilities. Verified, MEDIUM |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Component-owned auth or admin membership | Appears to make setup self-contained | Creates a second identity/authorization source and conflicts with the Convex component boundary | Require host wrapper authorization and stable external identity IDs |
| Anonymous writes by default | Maximizes submission conversion | Raises spam, abuse, deduplication, and attribution costs; conflicts with agreed default | Public read with authenticated writes; leave policy extension explicit and later |
| Per-board ACLs in v1 | Looks flexible for complex organizations | Multiplies authorization states and test cases before one-product use is validated | One installation-wide access policy |
| Multi-product organizations | Mirrors mature SaaS tools | Introduces tenancy, cross-product roles, billing-like limits, and data-leak risk | One component installation per product |
| Independent roadmap project objects | Allows portfolio planning | Duplicates state and creates synchronization questions with feedback status | Derive v1 roadmap directly from post statuses |
| Automatic changelog generation or publishing | Promises a fully automated loop | Can announce incomplete or sensitive work and weakens editorial control | Manual changelog entries linked to feedback; optional draft assistance later |
| AI-gated posting or autonomous merges | Reduces apparent moderation work | False positives can hide distinct needs, combine votes incorrectly, or reject legitimate users | Always allow deterministic search and human-confirmed merge; AI may suggest only |
| Built-in email vendor as a core dependency | Makes one demo path easy | Forces deliverability, secrets, templates, unsubscribe policy, and vendor choice into every install | Durable notification records/events with optional reference adapters |
| Named Slack/Linear/Jira/GitHub connectors in v1 | Creates an impressive comparison table | Each adds auth, sync semantics, conflict handling, maintenance, and support burden | Stable APIs/events/webhooks first; add connectors based on observed demand |
| Full analytics warehouse | Product teams like dashboards | Metrics definitions, segments, retention, and aggregation can consume the milestone while core counts already answer basic questions | Expose raw data/export and operational counts; add focused reports later |
| Universal importer for every competitor | Lowers switching friction in theory | External schemas drift, mappings are lossy, and historical identities are hard to reconcile | Stable import API plus one documented CSV format after Afferent's schema settles |
| Public category hierarchy plus internal tags at launch | Seems like harmless organization | Overlaps boards/statuses and creates confusing taxonomy governance | Ship simple admin-only tags; validate need for one public category field in v1.x |
| Deep comment threading, reactions, and forum mechanics | Makes discussion feel social | Increases moderation and notification complexity without improving the core signal | Flat comments with reply reference and mentions |
| Comprehensive workspace-wide audit/compliance console | Enterprise buyers may ask for it | Requires retention policy, actor impersonation semantics, querying, export, and tamper guarantees | Launch per-entity immutable activity history; add workspace audit export when demanded |
| Opaque packaged design system | Faster for the library author | Undermines source ownership and makes host styling brittle | Headless APIs plus shadcn registry and mirrored source examples |

## Explicit Assessment of Unresolved Capabilities

| Capability | Market Evidence | Recommendation | Rationale |
|------------|-----------------|----------------|-----------|
| Duplicate handling/search | Strong and recurring across all four products | **v1 table stake:** lexical search, submit-time suggestions, manual merge preserving votes/comments/history | Fragmented demand breaks the core signal; AI is not required to solve the first 80% |
| Moderation | Strong in Canny/Quackback; implemented optional routes in current Fider source | **v1 minimum controls; v1.x queue/reporting** | Authenticated writes reduce but do not eliminate abuse. Safe delete/restore/lock/block is production hygiene |
| Tags/categories | Tags recur broadly; Canny separates internal tags and public categories | **v1 internal tags; defer public categories** | Admin tags provide high triage value. Boards already provide public grouping, so another taxonomy is not yet justified |
| Notifications | Strong recurring evidence, especially status/comment updates | **v1 events + in-app; optional email adapter after core** | Closing the loop matters, but delivery vendor choice should stay with the host app |
| Analytics | Deep in Canny; not necessary to Fider's core proposition | **v1 counts/filtering/export; v2 reports** | Raw votes, comments, and statuses validate the workflow. Segmentation and trends require more data and product decisions |
| Imports | Supported by mature tools and useful for switching | **v1 export; v1.x one stable import format** | Data egress is part of ownership. Ingress should follow schema stabilization to avoid permanent compatibility debt |
| Integrations | Major breadth differentiator for Canny/Quackback | **v1 primitives only; named connectors later** | Native APIs/events preserve extensibility without committing to multi-system sync semantics |
| AI duplicate detection | Present in Canny and strongly documented by Quackback | **v1.x/v2 suggestion-only** | Needs a representative corpus, evaluation metrics, model configuration, cost controls, and human override |
| Sentiment analysis | Marketed by Quackback; less fundamental across the comparison set | **v2 or external analysis** | Sentiment is ambiguous for feature requests and does not improve the core workflow at low volume |
| Accessibility | Sparse competitor claims; strong external standard | **v1 release quality requirement** | Accessibility is not a premium feature. Copied UI should be safe by default and testable after customization |
| Responsive behavior | Explicitly claimed for Quackback widget; inherent to embedded/public usage | **v1 release quality requirement** | Narrow-screen submission and admin triage are normal contexts, not edge cases |
| Admin audit/history | Quackback documents per-post activity; broad Canny audit log appears as requested/in-progress rather than established public documentation | **v1 per-entity domain history; v1.x/v2 workspace audit log** | History is required for merges/status/moderation integrity; a compliance-grade global log is a separate product |

## Feature Dependencies

```text
Host identity + authorization contract
    ├──requires──> authenticated posts, votes, comments
    ├──requires──> moderation actor attribution
    ├──requires──> notification recipients
    └──requires──> activity/audit attribution

Boards + posts + stable identities
    ├──requires──> voting and comments
    ├──requires──> search and filtering
    └──requires──> duplicate merge

Search index/query model
    ├──enables──> submit-time similar-post suggestions
    └──precedes──> AI/semantic duplicate suggestions

Statuses + transition history
    ├──requires──> status-derived roadmap
    ├──emits──> notifications
    └──links──> changelog entries

Durable domain events/outbox
    ├──enables──> in-app notifications
    ├──enables──> host email/push adapters
    ├──enables──> webhooks/integrations
    └──supports──> immutable activity history

Stable schema + external IDs
    ├──precedes──> import format
    ├──precedes──> vendor integrations
    └──precedes──> long-lived analytics definitions

Accessible headless behavior
    └──requires──> accessible copied shadcn UI and demo
```

### Dependency Notes

- **Duplicate merge requires provenance:** Preserve source-post ID, destination-post ID, actor, timestamp, transferred vote/comment references, and redirect behavior before allowing merge.
- **Notifications require event semantics before delivery adapters:** Define what happened and who should receive it independently from email or push infrastructure.
- **Roadmap requires status visibility rules:** A status needs an explicit public/roadmap placement contract; do not infer it from a label such as “Planned.”
- **Changelog links require stable post references:** Published entries must survive post edits, archival, and merges.
- **AI requires deterministic baselines:** Measure lexical search and manual merge outcomes first so semantic matching has a real quality benchmark.
- **Imports require stable external identity semantics:** Decide how imported authors, voters, and historical anonymous records map before promising migrations.
- **Accessibility must precede distribution:** Fixing semantics after consumers copy source creates fragmented downstream defects.

## MVP Definition

### Launch With (v1)

- [ ] Multiple boards; public browsing; installation-wide access policy; authenticated writes
- [ ] Posts, idempotent votes, comments, stable identity attribution, and author-safe editing/withdrawal
- [ ] Text search, board/status/tag filters, sorting, and create-time similar-post suggestions
- [ ] Manual duplicate merge that preserves votes/comments/history and redirects old references
- [ ] Admin editing, board movement, simple internal tags, status transitions, archive/restore, locking, and minimum abuse controls
- [ ] Configurable statuses and a status-derived public roadmap
- [ ] Draft/publish changelog entries linked to feedback posts
- [ ] Durable per-post activity history plus notification subscriptions, in-app records, and typed delivery events
- [ ] Typed component API, headless React layer, copyable shadcn user/admin UI, and stable export API
- [ ] WCAG 2.2 AA-oriented interaction quality and responsive phone/tablet/desktop behavior
- [ ] Provider integration docs/tests and the isolated resettable public demo

### Add After Validation (v1.x)

- [ ] Moderation approval/report queue and richer spam controls — add when real public usage creates queue-management needs
- [ ] Public categories or one additional public taxonomy field — add only if boards plus statuses prove insufficient
- [ ] Reference email delivery adapter and digest preferences — add after event semantics and unsubscribe ownership are validated
- [ ] Stable CSV/JSON import with dry-run validation — add after the schema and external identity contract settle
- [ ] Workspace-wide audit query/export — add when teams need cross-entity investigation rather than per-post history
- [ ] Semantic duplicate suggestions with human confirmation — add after a representative corpus and evaluation harness exist
- [ ] Focused operational dashboard — add only metrics tied to observed admin decisions

### Future Consideration (v2+)

- [ ] Sentiment analysis, theme extraction, and thread summaries — high cost/quality surface, low value at small scale
- [ ] Named Slack, Linear, Jira, GitHub, Intercom, or Zendesk integrations — prioritize by adoption evidence
- [ ] Segment/revenue-aware analytics and scoring — requires host customer attributes and carefully defined privacy boundaries
- [ ] Bulk migration connectors for Canny, Fider, ClearFlask, or Quackback — maintain only after format demand is proven
- [ ] Internationalization/RTL packs — important expansion capability, but not needed to validate the first Convex-native release

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Core posts/votes/comments | HIGH | HIGH | P1 |
| Search/filter/sort | HIGH | MEDIUM | P1 |
| Manual duplicate merge | HIGH | HIGH | P1 |
| Admin management + minimum moderation | HIGH | HIGH | P1 |
| Internal tags | MEDIUM | MEDIUM | P1 |
| Configurable statuses + derived roadmap | HIGH | HIGH | P1 |
| Linked manual changelog | HIGH | MEDIUM | P1 |
| Notification events + in-app records | HIGH | HIGH | P1 |
| Per-post activity history | HIGH | MEDIUM | P1 |
| Export API | HIGH | MEDIUM | P1 |
| Accessibility and responsive quality | HIGH | HIGH | P1 |
| Public categories | MEDIUM | MEDIUM | P2 |
| Moderation queue/reporting | MEDIUM | HIGH | P2 |
| Email reference adapter | MEDIUM | HIGH | P2 |
| Import toolkit | MEDIUM | HIGH | P2 |
| Workspace audit console | MEDIUM | HIGH | P2 |
| AI duplicate suggestions | MEDIUM | HIGH | P2 |
| Analytics/reporting | MEDIUM | HIGH | P3 |
| Named third-party integrations | MEDIUM | HIGH | P3 |
| Sentiment analysis | LOW | HIGH | P3 |

**Priority key:**

- P1: Must have for production-ready v1
- P2: Add after core validation or when a documented trigger occurs
- P3: Future capability; do not let it shape the initial architecture beyond clean extension seams

## Competitor Feature Analysis

| Capability | Canny | Quackback | ClearFlask | Fider | Afferent Direction |
|------------|-------|-----------|------------|-------|--------------------|
| Feedback core | Boards, posts, votes, comments | Boards, votes, comments | Configurable feedback/content and discussion | Focused public suggestion portal and voting | Full production core in v1 |
| Duplicate handling | Merge/unmerge preserving votes/comments; AI discovery marketed | Manual merge plus optional semantic/full-text/LLM suggestions | Merge documented | Duplicate status/title checks in current source | Search + human merge v1; AI suggestions later |
| Roadmap | Public and internal roadmap features | Public roadmap | Public roadmap / workflow | Roadmap route/status model in current source | Status-derived public roadmap only |
| Changelog | Published updates linked to requests; notifications | Changelog, links, scheduling | Announcements/changelog | Not central to official product proposition | Manual linked changelog v1 |
| Moderation | Official moderation documentation and post controls | Moderation/admin inbox | Some operational enhancements remain on public roadmap | Optional approve/decline/block routes in current source | Minimum controls v1; queue later |
| Taxonomy | Admin tags + public categories | Custom tags/statuses | Flexible tag groups/rules | Tags in current source | Admin-only tags v1; public category later |
| Notifications | In-app/email for comments, status, mentions, changelog | Voter/user notifications advertised | Web push/email subscription model | Web/email notifications in source | In-app + delivery events v1; optional adapter later |
| Analytics | Multiple official reports and segmentation | Advanced filtering/AI analysis marketed | Analysis/prioritization focus | Core proposition avoids heavy reporting | Counts/export v1; focused reports later |
| Import/export | CSV/API import and CSV/API export | CSV/JSON export and import claims | API/open-source data ownership | Import/export routes in source | Export v1; one import format v1.x |
| Integrations | Broad catalog and API | Broad catalog, API, webhooks, MCP | API; several requested integrations visible on roadmap | Webhooks/API surface in source | Primitives v1; named connectors later |
| AI | Capture/dedupe, replies, comment summaries | Duplicate detection, summaries, suggestions; sentiment marketed | AI feedback analysis marketed | Not part of core proposition | Optional, evaluated assistance after v1 |
| Activity/audit | Post activity exists; broad audit log not established in reviewed official docs | Full activity timeline per post | Activity concepts in product | Status/notification records in source | Per-post immutable history v1; global audit later |

## What Might Be Missing

- Competitor accessibility claims are sparse; absence of documentation is not evidence of non-compliance. The recommendation therefore relies on W3C standards and Afferent's production-quality goal, not a claim that competitors fail accessibility.
- ClearFlask's public roadmap mixes implemented behavior with requested work. Only official docs/current repository evidence was treated as implemented; roadmap items were used as demand signals.
- Fider's current repository contains substantial features not emphasized on its marketing site. Repository presence confirms implementation surface but not usage quality or plan availability.
- Canny evolves quickly and its own public feedback board lists some admin/audit requests as in progress. Afferent should avoid claiming parity with undocumented or beta behavior.
- Notification delivery ownership needs architecture validation against Convex component boundaries before requirements freeze; the feature recommendation intentionally specifies events and outcomes rather than a vendor.

## Sources

### Official product documentation and repositories

- [Canny feature overview](https://canny.io/features) — product capability map; MEDIUM confidence
- [Canny Help Center feature collection](https://help.canny.io/en/collections/325099-canny-features) — boards, posts, roadmap, reporting, taxonomy, notifications, API; MEDIUM confidence
- [Canny merging and unmerging posts](https://help.canny.io/en/articles/5776649-merging-and-unmerging-posts) — merge preservation and limits; MEDIUM confidence
- [Canny notifications](https://help.canny.io/en/articles/5380265-notifications) and [status change emails](https://help.canny.io/en/articles/1291127-status-change-emails/) — close-the-loop events; MEDIUM confidence
- [Canny reporting](https://help.canny.io/en/articles/8737133-canny-reporting) — analytics breadth; MEDIUM confidence
- [Canny tags versus categories](https://help.canny.io/en/articles/3827590-when-do-i-use-tags-vs-categories) — public/internal taxonomy distinction; MEDIUM confidence
- [Canny importing feedback](https://help.canny.io/en/articles/3635951-importing-feedback) and [exporting feedback](https://help.canny.io/en/articles/3889198-exporting-feedback) — migration/data portability; MEDIUM confidence
- [Quackback official repository](https://github.com/QuackbackIO/quackback) — implemented/advertised feature map and current source; MEDIUM confidence
- [Quackback introduction](https://quackback.io/docs/getting-started/introduction) — boards, voting, statuses, roadmap, changelog, API; MEDIUM confidence
- [Quackback AI features](https://quackback.io/docs/admin/ai-features) — optional AI pipeline and merge suggestions; MEDIUM confidence
- [ClearFlask official documentation](https://clearflask.com/docs) — content types, workflow, tags, notifications, SSO; MEDIUM confidence
- [ClearFlask official repository](https://github.com/clearflask/clearflask) — current source and deployment model; MEDIUM confidence
- [Fider official site](https://www.fider.io/) — intentionally focused product proposition; MEDIUM confidence
- [Fider official repository](https://github.com/getfider/fider) — current routes and implementation evidence for tags, statuses, notifications, moderation, import/export, webhooks; MEDIUM confidence

### Standards

- [W3C WCAG 2 overview](https://www.w3.org/WAI/standards-guidelines/wcag/) — current accessibility standard context; MEDIUM confidence under research classifier
- [W3C mobile accessibility guidance](https://www.w3.org/WAI/standards-guidelines/mobile/) — small-screen, touch, and mobile applicability; MEDIUM confidence under research classifier

---
*Feature research for: Afferent*
*Researched: 2026-07-14*
