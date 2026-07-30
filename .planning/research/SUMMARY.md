# Project Research Summary

**Project:** Afferent
**Domain:** Convex-native embedded product feedback, public roadmap, and changelog component with source-owned React UI
**Researched:** 2026-07-14
**Confidence:** MEDIUM

> **Scope supersession (2026-07-30):** Hosting recommendations in this research are
> historical. The v1 demo is now a clone-and-run local Vite application on a real
> anonymous Convex development backend, with no public demo URL, Convex Cloud demo
> deployment, Vercel project, preview, or remote smoke. Package, registry, docs,
> security, lifecycle, real-Convex, two-user, and accessibility findings remain
> applicable. See
> `.planning/phases/04-hosted-production-release/04-SCOPE-PIVOT.md`.

## Executive Summary

Afferent should be built as a provider-neutral feedback domain behind a strict Convex component boundary, not as a small hosted Canny clone. The reusable package should own boards, posts, votes, comments, configurable statuses, moderation state, roadmap projections, changelog entries, and their invariants. The consuming Convex app remains the security boundary: it resolves identity and admin authorization from Convex Auth, Clerk, or Better Auth in host-owned wrappers, then passes only verified, minimal actor facts into narrow component operations. A single root package with explicit subpath exports, a framework-light headless React layer, and canonical shadcn registry source best preserves native ownership and consumer customization.

The production v1 should close the complete loop: discover feedback, submit and vote without fragmentation, discuss, triage and moderate, move requests through visible statuses, publish linked changelog entries, and notify interested users through a minimal domain-event/in-app notification surface. Deterministic search and submit-time suggestions plus human-controlled duplicate merging are necessary; AI matching, sentiment, deep analytics, named integrations, and universal importers are not. Production quality also requires bounded indexed queries, idempotent voting, stable versioned DTOs, data export, accessible responsive UI, auth conformance tests, install-from-artifact tests, and a deployed example.

The highest-risk design issue is the private per-user demo sandbox. Do not turn the consumer-facing API into multi-product tenancy and do not isolate data in React. Use two statically installed demo component instances: an immutable showcase bound to one fixed scope and a sandbox instance whose trusted host wrapper derives an internal scope from the authenticated visitor. The scope is an explicit server-only parameter at the host/client boundary, is never accepted from browser arguments, and is fixed to one constant in normal installations. Every sandbox table, index, search filter, seed, reset, quota, and cleanup operation must be scope-complete. This preserves the public one-product contract while letting the hosted demo exercise the real component safely.

## Key Findings

### Recommended Stack

Follow the official Convex component template closely: one root npm package and lockfile, ESM TypeScript output, generated component exports, a built-package example, and clean consumer fixtures. Keep Convex, React, and provider dependencies at deliberate peer/optional boundaries. The exact versions below are a 2026-07-14 compatibility snapshot and must be rechecked before implementation or publishing rather than treated as timeless constraints.

**Core technologies:**

- **Node.js 24 LTS + npm 11:** repository runtime and release tooling — satisfy the selected Vite, React Router, shadcn, and npm trusted-publishing requirements without adding workspace complexity.
- **Convex 1.42.1:** component runtime, storage, reactive APIs, codegen, and client — make it a peer plus pinned development dependency and keep auth in host wrappers.
- **TypeScript 6.0.3:** strict ESM source and declaration contracts — matches the current component template; defer the preview TypeScript 7/native-compiler path.
- **React 18/19 peer support, React 19.2.7 in the demo:** headless hooks and hosted UI — avoid React 19-only assumptions in the published headless contract.
- **Vite 8 + React Router 8:** hosted example — routing stays demo-only and never becomes a headless dependency.
- **Tailwind CSS 4 + shadcn CLI 4:** source-owned user/admin UI and static registry — styling libraries belong to copied source, not `afferent/react`.
- **Vitest, `convex-test`, Playwright, and axe:** layered component, browser, accessibility, and E2E verification — `convex-test` is useful but cannot replace real Convex search/pagination/deployment smoke tests.
- **VitePress, Changesets, publint, ATTW, and npm trusted publishing:** documentation, semver discipline, package validation, and provenance-backed release.

Publish explicit entry points for the host client/contracts, component configuration and generated API, headless React, optional provider adapters, and test registration. Generate registry JSON and repository examples from one canonical UI source. The example must consume packed/built exports in CI so workspace resolution cannot hide missing files or broken export maps.

### Expected Features

A credible v1 is a complete feedback lifecycle with production hygiene, not a feature-count contest. Notifications are reconciled as a narrow domain-event and in-app capability tied to concrete feedback events; do not build a generic callback bus, delivery vendor, or named connector framework.

**Must have (table stakes):**

- Multiple boards, public browsing, and an installation-wide access policy with authenticated writes by default.
- Posts with author-safe edit/withdraw behavior, idempotent one-vote-per-actor semantics, flat comments with optional reply references, and stable actor attribution.
- Indexed browse modes, relevance-ordered text search, board/status/tag filters, explicit sort modes, and deterministic similar-post suggestions before submission.
- Human-controlled duplicate merging that preserves attribution, votes, comments, activity history, and a redirect/tombstone.
- Admin-managed tags, editing, board moves, configurable statuses, discussion locking, archive/restore, minimum moderation, rate limits, and projection-wide visibility rules.
- A status-derived public roadmap; no independent project/roadmap entity in v1.
- Manual changelog drafts and publication with explicit links to feedback; publication is never inferred from a status change.
- Append-only meaningful activity history plus narrowly typed notification events/in-app records for status changes, admin replies, mentions, and linked changelog publication. External delivery remains host-owned.
- Stable typed component APIs, headless React bindings, copy-owned shadcn user/admin blocks, machine-readable export, and provider integration fixtures.
- WCAG 2.2 AA-oriented keyboard, focus, status-announcement, contrast, zoom/reflow, and responsive behavior as release criteria.
- A deployed Vite/Convex Auth example with an immutable showcase and a private, resettable per-user admin sandbox.

**Should have (competitive):**

- Provider-neutral host-owned identity and authorization across Convex Auth, Clerk, and Better Auth.
- Native Convex transactions and reactive updates without a parallel client server-state cache.
- A minimal delivery-agnostic outbox or event contract that supports host email/push adapters without coupling core to a vendor.
- Stable external IDs, export, and documented event/API seams for future integrations.
- A source registry and repository examples that remain compatibility-tested against the package version range.

**Defer (v1.x or v2+):**

- AI duplicate suggestions, summaries, themes, and sentiment — add only after deterministic baselines and a representative evaluation corpus exist.
- Named Slack, Linear, Jira, GitHub, support-tool, or email-vendor integrations — ship primitives first and prioritize from adoption evidence.
- Segment/revenue analytics and a general reporting warehouse — v1 counts, filters, history, and export are sufficient.
- Universal competitor importers — stabilize schema and identity semantics first; one documented CSV/JSON format can follow in v1.x.
- Public category hierarchies, per-board ACLs, multi-product organizations, deep comment threading, and independent roadmap records.
- Autonomous duplicate merges, automatic changelog publishing, anonymous writes by default, and component-owned auth/admin membership.

### Architecture Approach

Treat the browser as untrusted, the host Convex app as the authentication/authorization ingress, and Afferent as a provider-neutral domain service. Host wrappers are grouped into safe reads, authenticated participation, and server-authorized admin operations; they derive actor, admin permission, and any demo scope server-side. Component functions expose narrow intent operations with validators and stable DTOs, never generic CRUD, raw documents, provider records, or client-provided `userId`, `isAdmin`, or `scopeId`. Headless React accepts consumer-provided generated function references, while copied UI depends only on public headless APIs and injectable navigation/notification behavior.

**Major components:**

1. **Afferent Convex component** — owns provider-neutral actors, settings, boards, statuses, posts, votes, comments, activity/notification records, changelog entries/links, indexes, search, and domain invariants.
2. **Host client and wrapper factory** — mounts public, participation, and admin functions; resolves policy, verified identity, admin authorization, and a fixed or demo-derived server-only scope.
3. **Auth adapters and conformance fixtures** — normalize Convex Auth, Clerk, and Better Auth identities without importing provider schemas into the component or implying admin rights.
4. **Headless React bindings** — expose provider/router/style-neutral hooks over host-generated function references with explicit auth-loading, pagination, mutation, and error states.
5. **Canonical shadcn registry source** — supplies accessible public/admin blocks, generates static registry artifacts, and mechanically feeds the repository example/fixtures.
6. **Hosted showcase and sandbox** — installs separate static showcase and sandbox component instances; the sandbox wrapper derives and enforces the visitor scope, quotas, idempotent seed/reset, and cleanup.
7. **Consumer and release test harness** — validates real Convex behavior, packed npm exports, shadcn installation, auth adapters, browser workflows, accessibility, upgrades, and cross-user isolation.

The internal schema should use explicit relations rather than unbounded arrays: provider-neutral actors, boards, configurable statuses, posts, unique vote memberships, comments, changelog entries, and a changelog-post join table. Keep membership as vote truth and update displayed counters transactionally with reconciliation support. Put the trusted internal scope first in all relevant sandbox indexes and search filters, use bounded cursor pagination, treat full-text search as a relevance-only mode, and keep roadmap/changelog projections subject to the same moderation and visibility predicates as direct reads.

### Critical Pitfalls

1. **Trusting client identity, roles, or scope** — derive actor identity, admin permission, and demo scope inside host functions on every call; run forged-call tests against all three auth fixtures.
2. **Letting demo tenancy leak into the reusable contract** — expose one fixed scope through normal host clients and a separately constructed, server-derived scope resolver only for the sandbox instance; require two-user isolation tests over every operation and projection.
3. **Designing scans, pagination, search, or counters after the schema** — define query shapes and compound indexes with the domain model, preserve supported pagination metadata, separate search relevance from feed sorting, and verify idempotent voting plus reconciliation under concurrency.
4. **Shipping artifacts that only work in the repository** — install the packed tarball and generated registry into clean Vite/Convex fixtures, run codegen/typecheck/build/E2E, and keep the example off source-relative imports.
5. **Coupling public contracts to provider, UI, or storage shapes** — return versioned DTOs with opaque branded strings, document deletion/merge/anonymization semantics, prefer additive migrations, and test upgrades from prior data and copied UI.
6. **Treating moderation and accessible primitives as finished workflows** — apply visibility rules across direct reads, search, roadmap, changelog, counts, and subscriptions; test XSS, rate limits, keyboard interaction, focus restoration, status announcements, and real installed UI.

## Implications for Roadmap

Based on research, use four coarse phases. Each phase must leave an executable vertical proof rather than only documents or scaffolding.

### Phase 1: Secure Component Contract and Installable Skeleton

**Rationale:** Identity, scope, DTO, index, migration, and package-export choices constrain every later feature and are the costliest to retrofit.

**Delivers:** A single-root Convex component package that builds and installs from a tarball; provider-neutral actor and access-policy contracts; grouped host wrapper APIs; stable DTO/ID conventions; core schema and query/index design; a fixed production scope plus an explicit server-only demo scope resolver; auth adapter conformance fixtures; versioning/migration policy; initial real-Convex smoke fixture.

**Addresses:** Native Convex ownership, host-owned auth/admin authorization, one-product installation semantics, installation-wide policy, typed APIs, and the foundation for all three auth providers.

**Avoids:** Forged identity/admin/scope, provider-shaped persistence, raw component IDs, demo multi-tenancy leaking into browser or product APIs, irreversible schema decisions, and repository-only package success.

### Phase 2: Complete Feedback-to-Changelog Domain

**Rationale:** Build the complete server workflow and prove its invariants before freezing headless/UI behavior around it.

**Delivers:** Boards, posts, author edits/withdrawal, idempotent votes, comments, tags, moderation and rate limits, bounded indexed browse modes, search and lexical duplicate suggestions, manual merge/redirect, configurable statuses and history, status-derived roadmap, linked draft/published changelog, narrow activity/notification records, export, and component/real-backend security and concurrency tests.

**Addresses:** All feedback lifecycle table stakes, deterministic duplicate handling, minimum moderation, public roadmap, manual changelog, close-the-loop events, and data portability.

**Avoids:** Duplicate votes and count drift, hot or scan-heavy read paths, pagination gaps, relevance/sort confusion, hidden content leaking through secondary projections, stored XSS, unsafe hard deletes, and premature generic integration infrastructure.

### Phase 3: Headless React and Source-Owned Product UI

**Rationale:** The server contract is now stable enough to support two consumers—the custom headless path and the copy-owned polished path—without letting the demo define the API.

**Delivers:** Typed binding injection, public/admin hooks and providers, explicit auth-loading and mutation states, canonical responsive shadcn public/admin blocks, generated static registry JSON, mirrored source examples, clean registry install fixtures, and WCAG 2.2 AA-oriented automated/manual workflow checks.

**Addresses:** Custom interfaces, restylable user/admin UI, shadcn registry plus repository examples, reactive feedback flows, and accessible responsive release quality.

**Avoids:** Router/auth/toast coupling in headless code, raw generated API use in copied UI, duplicate UI trees, package/registry incompatibility, inaccessible optimistic updates, color-only status, and pointer-only admin workflows.

### Phase 4: Hosted Proof, Integration Matrix, and Public Release

**Rationale:** Deployment and publication must verify the exact artifacts consumers install and the exact isolation model visitors exercise.

**Delivers:** Vite + Convex Auth public showcase; separate fixed-scope showcase and identity-scoped sandbox instances; deterministic seed/reset, quotas, rate limits, cleanup, and two-user adversarial E2E; Clerk and Better Auth integration documentation/fixtures; complete docs; real Convex and browser release gates; prior-version upgrade fixtures; npm trusted publishing, static registry hosting, demo deployment, and synchronized version metadata.

**Addresses:** Publicly hosted working example, safe hands-on admin evaluation, all supported auth paths, npm and registry distribution, production documentation, provenance, and the production-ready release bar.

**Avoids:** Shared-demo vandalism, client-side isolation, cross-scope search/count/reset leaks, stale auth guidance, missing tarball exports, registry dependency omissions, mock-only confidence, and package/data/UI upgrade breakage.

### Phase Ordering Rationale

- The security and storage contract comes first because host auth, internal scope, DTOs, indexes, and migrations are structural dependencies for every mutation and projection.
- The full backend lifecycle precedes UI so headless contracts describe proven operations rather than abstractions reverse-engineered from one demo.
- Headless and copied UI ship together from one behavior contract and canonical source, preventing two incompatible products.
- The hosted sandbox and public release are last, but their scope and artifact-test requirements are designed in Phase 1 and exercised continuously; Phase 4 hardens rather than invents them.
- AI, analytics, vendor integrations, and broad import work do not enter the critical path; the v1 event/export seams are sufficient extension points until demand is measured.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1:** Confirm the current component authoring/export conventions, exact server-only scope-resolver API, provider identity lifecycle/anonymization rules, package name availability, and real upgrade mechanics before schema/API freeze.
- **Phase 2:** Spike component-compatible full-text search plus cursor pagination on a real Convex backend, and measure vote-counter contention before selecting anything beyond transactional counters.
- **Phase 4:** Recheck fast-moving Convex Auth, Clerk, Better Auth, shadcn registry, npm trusted-publishing, and deployment APIs; validate cleanup limits and operational behavior on the deployed backend.

Phases with standard patterns (skip research-phase unless implementation evidence contradicts assumptions):

- **Phase 3:** React binding injection, shadcn source distribution, Vite consumer fixtures, and established accessibility patterns are well documented. Use a UI design contract and direct verification rather than broad domain research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Primarily official docs, repositories, and registry metadata, but exact versions and engines are fast-moving and Convex Auth remains beta. |
| Features | MEDIUM | Strong recurring competitor patterns and clear project choices; prioritization of notifications, merge semantics, and moderation remains an opinionated v1 boundary. |
| Architecture | MEDIUM-HIGH | Component isolation, host-wrapper auth, package structure, indexes, and registry patterns are documented; sandbox scoping and search-pagination composition require implementation proof. |
| Pitfalls | MEDIUM | Failure modes are well supported by official platform constraints and standards, while traffic thresholds and recovery costs depend on Afferent's actual workload. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Sandbox scope contract:** Specify the exact trusted host/client factory API and prove that normal consumers receive a fixed one-product binding while the demo alone receives an identity-derived resolver.
- **Component search pagination:** Verify `convex-helpers` pagination and full-text search composition on the current real backend; fall back to bounded typeahead/search continuation if they do not compose safely.
- **Identity lifecycle and privacy:** Decide stable external-key construction, actor snapshot fields, host-user deletion/anonymization, merged identities, and whether email is stored at all.
- **Content format:** Choose plain text or a strict sanitized Markdown subset for posts/comments/changelog; define media handling without allowing raw user HTML or unsafe URLs.
- **Notification semantics:** Fix the small set of v1 event types, recipient rules, idempotency, retention, and host delivery interface without creating a general plugin bus.
- **Moderation and deletion semantics:** Define author withdrawal, admin removal, comment locks, post merge/unmerge limits, linked-post deletion, and activity-history retention before public API freeze.
- **Counter and ranking strategy:** Start with vote membership as source of truth plus transactional counts and reconciliation; change only after measured contention on real Convex.
- **Package identity and compatibility:** Reserve the npm name or choose a scope, then publish supported Convex/React/provider/package-registry ranges and an upgrade policy.
- **Version drift:** Revalidate every pinned tool/provider version at phase planning and release time; research versions are snapshots, not durable requirements.

## Sources

### Primary (HIGH confidence)

- [Convex component authoring](https://docs.convex.dev/components/authoring) and [component understanding](https://docs.convex.dev/components/understanding) — isolation, auth boundary, validation, IDs, packaging, transactions, and build conventions.
- [Official Convex component template](https://github.com/get-convex/templates/tree/main/template-component) — current package, export, codegen, example, and test structure.
- [Convex authentication](https://docs.convex.dev/auth/functions-auth), [Clerk integration](https://docs.convex.dev/auth/clerk), [Convex Auth](https://labs.convex.dev/auth), and [Better Auth authorization](https://labs.convex.dev/better-auth/basic-usage/authorization) — host-side identity resolution and provider-specific integration seams.
- [Convex indexes](https://docs.convex.dev/database/reading-data/indexes/), [pagination](https://docs.convex.dev/database/pagination), [full-text search](https://docs.convex.dev/search/text-search), [limits](https://docs.convex.dev/production/state/limits), and [OCC](https://docs.convex.dev/database/advanced/occ) — bounded query, search, pagination, concurrency, and scale behavior.
- [shadcn registry documentation](https://ui.shadcn.com/docs/registry) — copy-owned registry structure, dependencies, static output, and installation.
- [W3C WCAG 2.2](https://www.w3.org/WAI/WCAG22/understanding/) and [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) — accessibility workflow requirements.

### Secondary (MEDIUM confidence)

- [Canny features and help center](https://canny.io/features) — mature feedback, duplicate, roadmap, changelog, notification, taxonomy, reporting, and portability expectations.
- [Quackback repository](https://github.com/QuackbackIO/quackback) and [documentation](https://quackback.io/docs/getting-started/introduction) — open-source feature breadth, activity history, AI, roadmap, and changelog patterns.
- [ClearFlask documentation](https://clearflask.com/docs) and [repository](https://github.com/clearflask/clearflask) — configurable workflow, tags, notifications, and participation trade-offs.
- [Fider site](https://www.fider.io/) and [repository](https://github.com/getfider/fider) — evidence that a focused feedback portal remains credible with a reliable core.
- [Convex rate limiting guidance](https://docs.convex.dev/agents/rate-limiting), [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), and official Node/Vite/React release documentation — operational and version-specific recommendations.

### Tertiary (LOW confidence)

- None used as a roadmap dependency. Product prioritization and the demo scope resolution are explicit synthesis decisions derived from the primary and secondary evidence above.

---
*Research completed: 2026-07-14*
*Ready for roadmap: yes*
