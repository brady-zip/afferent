# Pitfalls Research

**Domain:** Reusable Convex component and source-owned React UI for embedded product feedback
**Researched:** 2026-07-14
**Confidence:** MEDIUM — findings are grounded in current official Convex, Convex Auth, Clerk, Better Auth, shadcn, and W3C documentation; the research seam classifies verified web-search retrieval as MEDIUM

> **Scope supersession (2026-07-30):** Public-service hosting risks are retired,
> but every scope, auth, seed/reset, quota, cleanup, artifact, and accessibility
> pitfall still applies to the feature-full local demo and acceptance gate. See
> `.planning/phases/04-hosted-production-release/04-SCOPE-PIVOT.md`.

## Critical Pitfalls

### Pitfall 1: Treating identity or authorization as client-supplied component data

**What goes wrong:**
An Afferent mutation accepts `userId`, `isAdmin`, or `role` from a public function's arguments and forwards it into the component. A caller can invoke that public function directly, impersonate another actor, or grant itself administrative access. A less obvious variant trusts email as the durable identity, causing account merges or ownership loss when email changes.

**Why it happens:**
Convex components cannot access the host application's `ctx.auth`, so it is tempting to make identity another ordinary API argument. Convex Auth, Clerk, and Better Auth expose different helpers and user records, encouraging provider-specific shortcuts.

**How to avoid:**
Authenticate only in host-app query and mutation wrappers. Derive a provider-neutral, opaque actor key server-side from a stable host mapping (or an issuer/subject pair); derive admin permission server-side for every privileged call. Never include an admin flag in client-controlled validators. Make the wrapper factory require explicit callbacks such as `getActor(ctx)` and `requireAdmin(ctx)`, keep component operations unreachable directly from clients, and test the same conformance suite against all three adapters. Use runtime argument and return validators at every boundary.

**Warning signs:**
- Public validators contain `userId`, `isAdmin`, `role`, `providerUser`, or raw Clerk/Better Auth record shapes.
- Internal tables use email as an ownership key.
- An auth adapter imports component schema code, or component code imports an auth provider.
- Admin checks exist only in React routes or hidden buttons.
- Tests call component mutations with invented admin identities and consider that authorization coverage.

**Verification:**
Call every public write function from an unauthenticated Convex client and with forged identity/role fields; all must fail before component execution. Run one provider-neutral contract suite against Convex Auth, Clerk, and Better Auth fixtures. Search public validators for actor/role arguments that originate from the client.

**Confidence:** HIGH in the failure mode; MEDIUM source-retrieval confidence.

**Phase to address:**
Phase 1 — Component contract, identity boundary, and security model. This must precede feature mutations.

---

### Pitfall 2: The public demo's sandbox requirement silently turns a one-product component into a multi-tenant system

**What goes wrong:**
The production contract says one component installation represents one product, but the hosted demo promises every signed-in visitor a private, fully mutable admin sandbox. Convex component instances are configured statically, not created per visitor at runtime. Adding `sandboxOwnerId` to only some demo records leaks statuses, comments, changelog entries, counts, search results, or reset operations across visitors; adding it everywhere late forces a schema and index rewrite.

**Why it happens:**
The demo is treated as presentation work instead of a distinct tenancy problem. A client-side filter appears to isolate records during happy-path testing, while server queries, search indexes, aggregates, scheduled cleanup, and admin mutations remain shared.

**How to avoid:**
Resolve the contradiction before freezing the schema. Choose and document one of these explicit designs: (a) a demo-only sandbox backend whose every root aggregate is keyed by an authenticated sandbox ID, while the published one-product component remains unchanged; or (b) a deliberately supported internal namespace dimension whose production API exposes exactly one fixed namespace but the demo wrapper safely selects a per-user namespace. Do not pretend boards alone provide isolation because statuses, policy, roadmap, and changelog are installation-level. Include the sandbox key as the leading field of every relevant index and search filter, seed idempotently, reset only within that key, and re-check ownership server-side.

**Warning signs:**
- The first schema draft has no written answer for where per-user statuses and access policy live.
- Queries fetch shared records and filter by visitor in TypeScript or React.
- Reset uses `collect()` then deletes without a sandbox-bounded index.
- Canonical showcase data and mutable sandbox data share tables without an immutable scope discriminator.
- A test with one user passes, but no simultaneous two-user isolation test exists.

**Verification:**
Run a two-user adversarial matrix over every list/get/create/update/delete/reset/search operation. Seed identical slugs and titles for both users, mutate policy/statuses/changelog concurrently, and assert no IDs, counts, search hits, or reactive updates cross boundaries. Audit every table and index for an isolation decision.

**Confidence:** HIGH in the architectural conflict; MEDIUM source-retrieval confidence.

**Phase to address:**
Phase 1 — Data model and demo-isolation architecture. Deferring this to deployment will cause the largest likely rewrite.

---

### Pitfall 3: Freezing a provider-shaped or UI-shaped data model

**What goes wrong:**
Posts, votes, comments, statuses, roadmap, and changelog are modeled around one screen or one auth provider. Later requirements—moderation history, merged duplicates, deleted users, configurable statuses, linked changelog entries, stable sorting, or demo reset—require destructive rewrites. Component IDs are leaked as host-app `Id<...>` values even though IDs cross component boundaries as strings.

**Why it happens:**
A greenfield demo rewards the shortest document shape. The component boundary hides tables, so consumers cannot repair data themselves. The initial UI encourages denormalized arrays such as voter IDs or comments embedded in a post.

**How to avoid:**
Design explicit aggregates and relations: actors (provider-neutral snapshot plus stable external key), boards, posts, votes, comments, statuses, changelog entries, and join records for changelog links. Represent moderation/lifecycle state explicitly; preserve immutable creation/author references and decide anonymization behavior. Keep unbounded collections out of parent documents. Define stable public DTOs that use opaque branded strings rather than component table IDs. Plan additive schema evolution: optional fields/backfills first, staged indexes where relevant, then enforcement. Document deletion semantics before shipping.

**Warning signs:**
- Arrays of voter IDs, comments, roadmap history, or linked post IDs grow inside one document.
- Status is a TypeScript enum hard-coded in both package and copied UI.
- Public return values spread raw database documents.
- API types expose `Id<"posts">` outside the component.
- Hard delete behavior for a post linked from changelog is unspecified.

**Verification:**
Exercise model scenarios before implementation: user deletion, post merge, post moderation, status rename/reorder, linked-post deletion, board archival, and package upgrade with existing data. Validate no public DTO depends on private table layout.

**Confidence:** MEDIUM.

**Phase to address:**
Phase 1 — Domain model and versioned public contract.

---

### Pitfall 4: Non-idempotent voting and a hot counter document

**What goes wrong:**
Double clicks, retries, multiple tabs, or concurrent requests create duplicate votes or count drift. A single `voteCount` field on a popular post becomes a contended read-modify-write target; Convex retries conflicts, but sustained contention can still surface write-conflict failures. Rebuilding counts by collecting all votes eventually exceeds transaction limits.

**Why it happens:**
Optimistic UI makes duplicate calls easy. Developers assume automatic OCC retries replace an application-level uniqueness invariant, or they split membership and count updates across separate component mutation calls.

**How to avoid:**
Make vote state a record keyed by `(postId, actorId)` through a selective compound index. Implement set-vote/toggle semantics in one deterministic mutation that reads the exact membership record and atomically updates membership plus any maintained aggregate. Define idempotency precisely: repeated `setVote(true)` must not increment twice. Prefer a scalable aggregate strategy or a derived count appropriate to expected traffic; do not make unrelated writes read an entire votes range. Treat the membership record as source of truth and expose reconciliation tooling/tests for any denormalized count.

**Warning signs:**
- `addVote` always inserts and increments without first checking actor membership.
- Vote and count updates occur in two client calls or an action.
- A uniqueness assumption exists only in TypeScript.
- High-contention tests log Convex write conflicts.
- Count repair calls `.collect()` over every vote.

**Verification:**
Fire concurrent `setVote(true)` and mixed vote/unvote calls for the same actor/post and for thousands of actors on one post. Assert at most one membership, nonnegative exact counts, atomic rollback on failure, and acceptable conflict rates. Run a count reconciliation invariant in tests.

**Confidence:** HIGH for atomicity/idempotency requirements; MEDIUM for the eventual traffic threshold because it depends on deployment class and workload.

**Phase to address:**
Phase 2 — Feedback core mutations and scale tests.

---

### Pitfall 5: Building list/search APIs that fight Convex reactivity and indexes

**What goes wrong:**
Board feeds become slow or incomplete, pagination duplicates or skips items as live data changes, and filters produce sparse/empty pages. Search cannot offer the promised sort options because Convex full-text results are relevance-ordered. Broad `.collect()` calls or post-query filters scan too much data and hit current document/read limits.

**Why it happens:**
Small seeded datasets hide scans. Conventional offset-pagination assumptions are applied to Convex cursor pagination. Developers map/filter pages after pagination, discard split metadata, or expect one search index to support every board/status/sort combination.

**How to avoid:**
Design query shapes and indexes with the schema. Put equality scope fields (including any demo scope, board, publication/moderation state, and status where needed) first, followed by explicit stable sort keys. Use `paginationOptsValidator`, return Convex pagination metadata intact, and consume it through supported reactive pagination hooks. Use index ranges rather than `.filter()` for security and common selectivity. Treat full-text search as a separate relevance-ordered mode; define which filters are search-index filter fields and what happens for non-Latin content or results beyond the current scan limit. Bound reads with pagination/read limits.

**Warning signs:**
- Feed queries use `.collect()` or `.filter()` on a growing posts/comments table.
- UI asks for “top voted” while backend search only returns relevance order.
- A wrapper returns `{items, cursor}` but drops split/page status.
- Page items are removed after pagination to enforce visibility.
- Seed tests use fewer than a few dozen records and never mutate while paginating.

**Verification:**
Use large fixtures with mixed boards/statuses/moderation states. Insert, remove, and reorder records while a client has multiple pages loaded; assert no unauthorized rows, no permanent gaps/duplicates, and correct page splitting. Inspect Convex query performance for scanned documents and test search limits and ordering as explicit contract behavior.

**Confidence:** HIGH for documented Convex behavior; MEDIUM source-retrieval confidence.

**Phase to address:**
Phase 1 for index/query contract; Phase 2 for load and reactivity verification.

---

### Pitfall 6: Public participation ships without server-side abuse and moderation controls

**What goes wrong:**
Authenticated accounts can spam posts/comments/votes, flood a public board, enumerate private or moderated records, or persist harmful markup. “Delete” removes evidence needed to moderate repeat abuse. Admin actions have no audit trail, and blocked content remains visible through search, roadmap, counts, or direct-ID getters.

**Why it happens:**
Authentication is mistaken for abuse prevention, and moderation is scoped as an admin screen rather than a cross-cutting state machine. Client-side disabled buttons and hidden routes are treated as controls.

**How to avoid:**
Enforce installation policy and authorization in every host wrapper, then enforce record visibility consistently in component queries. Add per-actor and global transactional rate limits for expensive public writes, bounded text lengths, normalized content rules, and safe plain-text/strict-markdown rendering. Model moderation state and audit events; decide soft-delete/redaction/author-anonymization behavior. Ensure search indexes, counters, roadmap, changelog links, direct getters, and subscriptions all apply publication/moderation rules. Make scheduled/internal maintenance functions non-public and remember scheduled auth is not propagated.

**Warning signs:**
- No rate-limit requirement because “users must log in.”
- Moderation is a boolean checked only in the main feed query.
- Direct-ID queries return records without board/publication checks.
- Raw user HTML reaches `dangerouslySetInnerHTML`.
- Destructive moderation has neither reason nor actor/time record.

**Verification:**
Fuzz all public validators and direct-ID lookups, test burst traffic across accounts, and verify hidden/removed content disappears from every projection and subscription. Run stored-XSS tests in every renderer. Assert audit events and rate-limit consumption are transactional with the moderated/write operation.

**Confidence:** MEDIUM.

**Phase to address:**
Phase 2 — Feedback, moderation, and policy enforcement; security tests are a release blocker.

---

### Pitfall 7: Publishing source and package artifacts that were never tested as consumers install them

**What goes wrong:**
The repository example works through workspace/source imports, while the npm tarball lacks generated component code or an export path. Consumers get multiple Convex versions, ESM extension failures, missing type declarations, or a component that codegen cannot find. The shadcn registry installs files but omits dependencies, CSS variables, aliases, or framework-neutral targets.

**Why it happens:**
Monorepo resolution masks package defects. Convex component build ordering matters: component codegen must precede package build, which must precede example-app codegen. Registry source and example source drift when maintained separately.

**How to avoid:**
Start from the official component template conventions. Export the root client, `convex.config.js`, `_generated/component.js`, and test helpers explicitly. Keep one compatible Convex dependency graph and define peer/dependency policy. Test the packed tarball in clean fixture apps, not just the workspace. Generate registry items and mirrored examples from one canonical source; validate registry JSON, declared npm/registry dependencies, CSS variables, and paths. Run Vite consumer, typecheck, component codegen, production build, and runtime smoke tests in CI.

**Warning signs:**
- Example imports `../../src` or relies on tsconfig paths unavailable to consumers.
- `npm pack --dry-run` is absent from release checks.
- Generated `_generated/component` is gitignored or missing from tarball exports.
- Registry and example contain hand-copied variants.
- Package tests never install into a fresh directory.

**Verification:**
Install the exact packed tarball and registry URL into matrix fixtures with npm/pnpm and a clean Vite Convex app; run codegen, typecheck, build, tests, and one end-to-end feedback flow. Inspect tarball contents and package exports programmatically.

**Confidence:** HIGH for Convex packaging requirements; MEDIUM source-retrieval confidence.

**Phase to address:**
Phase 1 — Packaging skeleton and consumer fixture; Phase 4 — publication and release matrix.

---

### Pitfall 8: “Headless” APIs and copied UI become two incompatible products

**What goes wrong:**
Headless hooks encode auth, routing, toast, and visual assumptions; copied shadcn components bypass hooks or require unpublished internals. Consumers can restyle colors but cannot replace layout/interaction. Registry updates overwrite owned source or example code drifts from package contracts. API changes break already-copied UI with no detectable compatibility signal.

**Why it happens:**
The polished demo is implemented first, then abstracted after behavior has hardened. “Copyable” is mistaken for “versionless.” Package and registry are released on independent schedules.

**How to avoid:**
Define a framework-light behavior contract first: typed operation/query references or adapters, explicit auth-loading and error states, pagination state, stable DTOs, and no router/toast singleton. Build canonical source-owned blocks only on public headless APIs. Stamp registry items with the compatible Afferent package range and changelog; pin reproducible registry dependencies. Provide codemods or migration notes for breaking copied-source changes and contract tests that compile registry output against the package.

**Warning signs:**
- Hooks import demo routes, provider-specific auth hooks, or a toast library.
- Registry components import files not present in their declared item graph.
- UI reaches raw generated Convex APIs instead of the public headless adapter.
- No compatibility matrix ties registry item versions to package versions.

**Verification:**
Build a minimal custom UI from hooks only, and separately install the full registry into a clean fixture. Compile both against the oldest and newest supported package versions. Confirm all UI imports are public exports or declared copied files.

**Confidence:** MEDIUM.

**Phase to address:**
Phase 3 — Headless React contract and UI distribution, with the public contract established in Phase 1.

---

### Pitfall 9: Accessible primitives mask inaccessible application workflows

**What goes wrong:**
Voting, moderation dialogs, status changes, live counts, infinite lists, and drag-style roadmap interactions are unusable or silent for keyboard and screen-reader users. Optimistic updates move focus, announce nothing, or announce twice. Color alone communicates status. Copied source loses accessibility attributes during consumer customization.

**Why it happens:**
Using shadcn/Radix primitives is treated as end-to-end accessibility. Composite workflows, asynchronous Convex updates, focus restoration, and consumer-modifiable source still require application-level design and tests.

**How to avoid:**
Set WCAG 2.2 AA as the UI contract. Use semantic buttons/forms/headings/lists; provide visible focus, text labels, non-color status cues, keyboard alternatives to dragging, and programmatic status messages for vote/save/search outcomes. For dialogs, contain focus, label the dialog, support Escape, and restore focus deliberately. Keep optimistic and server-confirmed announcements coherent. Document accessibility invariants adjacent to copied code and automate axe plus keyboard tests, followed by manual screen-reader checks.

**Warning signs:**
- Clickable cards or icons are `<div>`/SVG without accessible names.
- Status columns differ only by color.
- A toast is the only feedback for save/vote/moderation.
- Modal close leaves focus at the document root.
- Reordering statuses requires pointer drag.

**Verification:**
Complete public and admin journeys using keyboard only; test dialog focus loop/restoration, 200% zoom/reflow, forced colors, and screen-reader announcements for reactive/optimistic states. Run automated checks against the actual registry-installed fixture, not only the demo.

**Confidence:** HIGH for W3C requirements; MEDIUM source-retrieval confidence.

**Phase to address:**
Phase 3 — UI design contract and implementation; Phase 4 repeats checks on installed artifacts.

---

### Pitfall 10: Shipping an unversioned component API and irreversible schema changes

**What goes wrong:**
Renamed functions, narrowed validators, changed DTO fields, status semantics, or rewritten tables break host wrappers and copied UI. Existing installations cannot upgrade atomically, and because component state is encapsulated, consumers cannot patch tables directly. A package patch release accidentally requires a data migration.

**Why it happens:**
End-to-end TypeScript makes changes feel safely refactorable inside the monorepo. Greenfield testing has no old data or old consumers. Generated APIs are mistaken for a stable product contract without an explicit compatibility policy.

**How to avoid:**
Declare versioned public DTOs and behaviors, semantic-versioning rules, deprecation windows, and supported package/registry/Convex ranges before v1. Keep internal document shapes private. Prefer additive fields/functions, tolerant readers, backfill-capable migrations, and staged indexes; separate deploy steps when old and new code must coexist. Maintain upgrade fixtures containing prior-version data and compile fixtures for prior public APIs. Never repurpose an opaque ID or enum literal.

**Warning signs:**
- Public return validators spread internal documents.
- Tests cover only fresh installs.
- A schema change and removal of the old reader occur in one release.
- Release notes omit data migration and registry compatibility.
- “Internal” component functions are used by the demo through generated paths.

**Verification:**
For every release candidate, upgrade a fixture from each supported prior version, run migrations twice for idempotency, exercise old and new readers during transition, and compile canonical copied UI versions against the declared compatible package range.

**Confidence:** MEDIUM.

**Phase to address:**
Phase 1 — API/evolution policy; Phase 4 — upgrade and release gates.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Raw provider user IDs or email stored everywhere | Fast first auth integration | Provider coupling, collisions, impossible account evolution | Never; normalize at the host boundary |
| Client-provided `isAdmin`/actor identity | Simple component call signature | Direct privilege escalation | Never |
| Embedded vote/comment arrays | Fewer tables | Document growth limits, contention, rewrite | Never for production |
| `collect()` plus in-memory filtering | Easy query code | Scans, transaction-limit failures, visibility mistakes | Only bounded test/admin datasets with an enforced cap |
| Hand-maintained vote count without reconciliation | Fast sorting | Silent drift and hot writes | Only with atomic update plus invariant/rebuild tooling |
| Demo-only client filtering | Quick visual isolation | Cross-user data leak | Never |
| Workspace source imports in the example | Fast local iteration | Published package can be broken unnoticed | Only alongside a clean packed-artifact fixture from day one |
| Duplicate registry/example component trees | Easy initial publishing | Drift and incompatible fixes | Never; generate both from canonical source |
| Returning raw component documents | Minimal mapping | Public API locked to schema | Never for stable v1 |
| Hard-coded statuses in UI | Simple roadmap | Configurable-status requirement becomes rewrite | Only in throwaway sketches |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Convex component boundary | Calling `ctx.auth` inside component code or expecting host table IDs to validate there | Authenticate in host wrappers; pass normalized scalar identity; use opaque strings across the boundary |
| Convex Auth | Coupling to its user table/helper shape despite its documented beta status | Isolate extraction in an adapter and test the provider-neutral contract |
| Clerk | Using email as identity or forgetting auth-loading and deployed issuer configuration | Derive stable issuer/subject mapping server-side; gate queries until Convex auth is ready; test dev/prod config |
| Better Auth component | Importing Better Auth component internals into Afferent or relying on its component IDs | Resolve the current user in host app code and pass only Afferent's normalized identity contract |
| Scheduled cleanup | Assuming caller auth reaches scheduled functions | Schedule internal functions with minimal scope IDs and revalidate sandbox/record state |
| shadcn registry | Missing dependencies/CSS/targets or relying on deprecated Tailwind registry fields | Validate registry schema and install into a clean non-Next Vite fixture |
| React/Convex | Calling authenticated queries during auth initialization and showing errors/flicker | Make auth-loading an explicit headless state and skip/gate protected queries |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Filtering after broad index scan | Growing reads, latency, Convex limit errors | Compound indexes with scope/equality fields first | Dataset-dependent; definitely bounded by current 32k scanned docs/16 MiB per transaction |
| `.collect()` on posts/comments/votes | Slow queries and hard limit errors | Cursor pagination and bounded aggregation | Current full-text collect also errors beyond 1024 results; ordinary transaction scan limits apply |
| One counter document per popular post | Write conflicts under vote bursts | Membership source of truth plus tested scalable aggregation | Workload/deployment dependent; warning is repeated OCC failures |
| Client/hand-rolled cursor pagination | Duplicate/gapped live pages | Preserve Convex pagination options/results and split handling | As soon as records change while multiple pages are subscribed |
| Search used as arbitrary sort/filter engine | Missing “top/new” behavior, inconsistent ordering | Separate indexed feed modes from relevance search | Immediately; full-text results are relevance-ordered |
| Reset/cleanup in one mutation | Timeouts/read-write limits, partial operational recovery | Indexed batched deletion with resumable cursor/state | Larger seeded sandboxes; bounded by transaction limits |
| Global rate-limit key | Contentious throttle blocks legitimate users | Per-actor keys plus carefully sharded global protection | Burst-dependent |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting identity/role arguments | Critical privilege escalation | Server-derived actor/admin context in every wrapper |
| Inconsistent visibility predicates | High leak of moderated/private/sandbox data | Central policy functions and projection-wide tests |
| Direct-ID getters without scope checks | High enumeration and tenant crossover | Load by scoped compound index or verify ownership/visibility after get |
| Client-side sandbox isolation/reset | Critical cross-user mutation/deletion | Server-bounded namespace on every operation |
| No rate limits on authenticated writes | High spam and resource exhaustion | Transactional per-actor and global rate limits |
| Rendering user HTML/unsafe markdown | High stored XSS in public and admin UI | Plain text or strict allowlist sanitizer; adversarial renderer tests |
| Public maintenance/scheduled functions | High bypass of normal policy | Internal functions with explicit scoped arguments |
| Missing runtime validators | Medium malformed inputs and excess data exposure | `args` and `returns` validators for every public/component boundary |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Duplicate submit/vote under optimistic UI | Confusing counts and duplicate content | Idempotent mutation, pending state, reconcile on server result |
| Auth-loading shown as signed-out | Flicker, failed writes, lost drafts | Explicit loading state and preserved draft |
| Infinite scroll with no reachable fallback | Keyboard/screen-reader navigation failure | Semantic “Load more”, stable focus, result count/status |
| Moderation hidden behind icon-only menus | Poor discoverability/accessibility | Labeled controls, confirmation, focus restoration, undo where safe |
| Status communicated by color | Inaccessible roadmap | Text labels and semantic grouping |
| Copied UI requires demo router/toasts | Integration friction | Injectable navigation/notifications and framework-light hooks |
| Reset is destructive without scope preview | Accidental loss of visitor work | Show sandbox identity/scope, confirmation, and deterministic reseed status |

## "Looks Done But Isn't" Checklist

- [ ] **Auth adapters:** All three render and sign in — verify forged client identity/admin arguments still fail server-side.
- [ ] **Public reads:** Board page is visible — verify installation policy, moderated records, direct-ID access, search, and subscriptions all agree.
- [ ] **Voting:** Count changes — verify concurrent idempotency, unvote, rollback, reconciliation, and hot-post behavior.
- [ ] **Pagination:** Load More works — mutate records across loaded pages and verify supported split/gapless behavior.
- [ ] **Search:** Titles are found — verify relevance-only ordering, filter-field scope, moderation, non-Latin limitations, and bounded results.
- [ ] **Moderation:** Admin can hide a post — verify comments, roadmap, changelog links, counts, search, and audit history.
- [ ] **Roadmap:** Status columns render — verify configurable rename/reorder/archive and keyboard-accessible interaction.
- [ ] **Changelog:** Entry links to posts — verify linked-post deletion/redaction and unpublished-entry visibility.
- [ ] **Demo sandbox:** One visitor can reset — run two simultaneous users and assert every record/projection is isolated.
- [ ] **Component package:** Workspace example builds — install the packed tarball in a clean app and run Convex codegen.
- [ ] **Registry:** CLI reports success — compile and run the installed files with only declared dependencies/CSS.
- [ ] **Accessibility:** Primitives are accessible — complete actual public/admin journeys by keyboard and screen reader.
- [ ] **Upgrade:** Fresh install passes — upgrade prior persisted data and prior copied UI too.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Provider-coupled identities | HIGH | Add normalized actor table, write adapter-specific backfill, dual-read, migrate ownership, then remove old keys |
| Partial demo isolation | HIGH | Freeze public demo writes, enumerate every table/projection, add/backfill namespace and compound indexes, run adversarial isolation audit |
| Vote count drift | MEDIUM | Stop trusting aggregate, deduplicate by actor/post, rebuild counts in indexed batches, add transactional invariant |
| Hot vote counters | MEDIUM | Make membership canonical, introduce sharded/aggregate strategy behind unchanged DTO, backfill and compare before cutover |
| Scan-heavy feeds | MEDIUM | Add staged compound indexes, backfill/enable, dual-query if needed, then remove broad scan |
| Broken npm artifact | MEDIUM | Yank/deprecate bad version, patch exports/generated files, verify packed fixture, publish semver patch |
| Registry/package incompatibility | MEDIUM | Pin known-compatible versions, publish corrected registry item and migration note, add compile matrix |
| Inaccessible copied workflows | MEDIUM | Fix canonical source, document invariant, publish registry revision, add automated plus manual regression suite |
| Breaking API/schema release | HIGH | Restore compatibility shim, add tolerant reader/backfill, publish corrective version, support staged migration |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Forged identity/admin context | Phase 1: Contract & security | Unauthenticated/forged-call matrix and three-provider adapter contract suite |
| Demo sandbox vs one-product contradiction | Phase 1: Architecture & schema | Two-user isolation model and full operation matrix before schema freeze |
| Provider/UI-shaped data model | Phase 1: Domain model | Lifecycle scenario review and opaque DTO contract tests |
| Query/search/pagination mismatch | Phase 1 design; Phase 2 implementation | Large reactive pagination/search fixtures and scanned-document inspection |
| Duplicate votes/hot counters | Phase 2: Feedback core | Concurrency, idempotency, reconciliation, and conflict load tests |
| Moderation/abuse gaps | Phase 2: Policy & moderation | Projection-wide visibility, XSS, rate-limit, and audit tests |
| Headless/copied UI divergence | Phase 3: React & registry | Hooks-only app plus clean registry-installed app |
| Accessibility gaps | Phase 3: UI | Keyboard, screen-reader, axe, zoom/reflow tests on installed source |
| Demo cleanup/reset hazards | Phase 4: Hosted demo | Two-user e2e, idempotent seed/reset, batched cleanup recovery test |
| Broken package/registry publication | Phase 4: Release | Packed-tarball and registry install matrix in clean Vite Convex fixtures |
| Painful API/schema evolution | Phase 1 policy; Phase 4 gate | Prior-version data upgrade and compatibility compile matrix |

## Sources

- [Convex: Authoring Components](https://docs.convex.dev/components/authoring) — component isolation, missing `ctx.auth`, IDs across boundaries, wrappers, generated code, build ordering, package entry points (MEDIUM retrieval confidence)
- [Convex: Understanding Components](https://docs.convex.dev/components/understanding) — encapsulation, component sub-transactions, runtime-validated boundaries (MEDIUM)
- [Convex: Authentication](https://docs.convex.dev/auth/overview) and [Auth in Functions](https://docs.convex.dev/auth/functions-auth) — public deployment/auth model, stable identity fields, Convex Auth beta status (MEDIUM)
- [Convex: Clerk Integration](https://docs.convex.dev/auth/clerk) and [Debugging Authentication](https://docs.convex.dev/auth/debug) — issuer configuration, auth loading, null identity behavior (MEDIUM)
- [Convex + Better Auth](https://labs.convex.dev/better-auth) and [Component Client](https://labs.convex.dev/better-auth/api/component-client) — app-level integration and component-client boundary (MEDIUM)
- [Convex: OCC and Atomicity](https://docs.convex.dev/database/advanced/occ) and [Write Conflict Errors](https://docs.convex.dev/error) — serializability, automatic retries, hot-document conflicts (MEDIUM)
- [Convex: Paginated Queries](https://docs.convex.dev/database/pagination) and [PaginationOptions](https://docs.convex.dev/api/interfaces/server.PaginationOptions) — reactive page growth/shrink and split metadata (MEDIUM)
- [Convex: Indexes and Query Performance](https://docs.convex.dev/database/reading-data/indexes/indexes-and-query-perf), [Indexes](https://docs.convex.dev/database/reading-data/indexes/), and [Full Text Search](https://docs.convex.dev/search/text-search) — index selectivity, staged indexes, search ordering/limits (MEDIUM)
- [Convex: Limits](https://docs.convex.dev/production/state/limits) — current document, transaction, index, and search limits (MEDIUM; limits are drift-prone and must be rechecked during implementation)
- [Convex: Scheduled Functions](https://docs.convex.dev/scheduling/scheduled-functions) and [Cron Jobs](https://docs.convex.dev/scheduling/cron-jobs) — atomic scheduling, missing propagated auth, cleanup execution caveats (MEDIUM)
- [Convex: Argument and Return Value Validation](https://docs.convex.dev/functions/validation) and [Internal Functions](https://docs.convex.dev/functions/internal-functions) — runtime validation and minimizing public attack surface (MEDIUM)
- [Convex: Rate Limiting](https://docs.convex.dev/agents/rate-limiting) and [Rate Limiting at the Application Layer](https://stack.convex.dev/rate-limiting) — transactional per-user/global abuse controls and contention considerations (MEDIUM)
- [shadcn: Registry](https://ui.shadcn.com/docs/registry), [registry.json](https://ui.shadcn.com/docs/registry/registry-json), and [registry-item.json](https://ui.shadcn.com/docs/registry/registry-item-json) — registry files, dependencies, CSS, targets, and reproducibility (MEDIUM)
- [W3C: WCAG 2.2 Understanding](https://www.w3.org/WAI/WCAG22/understanding/), [Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages), [Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html), and [ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — accessibility verification criteria (MEDIUM retrieval confidence; authoritative standards source)

---
*Pitfalls research for: Afferent*
*Researched: 2026-07-14*
