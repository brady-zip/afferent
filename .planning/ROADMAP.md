# Roadmap: Afferent

## Overview

Afferent reaches its first public release through four coarse vertical slices. The first proves that a real Convex consumer can install a packed artifact and run a secure multi-board feedback loop through any supported auth provider. The second closes the full feedback-to-roadmap-to-changelog workflow through tested component APIs and headless React. The third turns that behavior into accessible, responsive, source-owned shadcn interfaces. The fourth publishes the exact artifacts and hosted showcase/sandbox that adopters and evaluators will use.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2, 2.3): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Secure Installable Feedback Board** - A clean consumer can install the packed artifact, connect any supported auth provider, and run the core multi-board feedback loop safely. (completed 2026-07-16)
- [x] **Phase 2: Complete Feedback-to-Changelog Workflow** - All 17 plans are implemented and independently verified at 64/64 must-haves. (completed 2026-07-21)
- [x] **Phase 2.1: Server-Derived Viewer Capability Contract** - Add server-derived vote membership and edit/withdraw capabilities required by the copied UI without accepting client authority facts. (INSERTED) (completed 2026-07-21)
- [x] **Phase 2.2: Notification Navigation Target Contract** - Project versioned, public, accessible notification destinations without exposing polymorphic internal identifiers. (INSERTED) (completed 2026-07-21)
- [x] **Phase 2.3: Admin Read and Projection Completion** - Complete server-authorized admin reads and presentation-ready moderation, changelog, and activity projections. (INSERTED) (completed 2026-07-21)
- [ ] **Phase 3: Source-Owned Product Interface** - Consumers can install accessible, responsive public and admin shadcn interfaces from one canonical source.
- [ ] **Phase 4: Hosted Production Release** - The published package, registry, documentation, and isolated public demo work together against real Convex.

## Phase Details

### Phase 1: Secure Installable Feedback Board

**Goal:** Developers can integrate a packed Afferent artifact and run a secure multi-board feedback loop through Convex Auth, Clerk, or Better Auth.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** ACCS-01, ACCS-02, ACCS-03, ACCS-04, ACCS-05, ACCS-06, FDBK-01, FDBK-02, FDBK-03, FDBK-04, FDBK-05, FDBK-06, FDBK-07, FDBK-08, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, QUAL-02, QUAL-03, QUAL-10
**Success Criteria** (what must be TRUE):

1. A developer can install the packed Apache-2.0 npm artifact into a clean Vite/Convex fixture, run Convex code generation, typecheck, and build without repository-relative imports.
2. A host application can mount typed public-read, authenticated-participation, and authorized-admin functions whose stable DTOs and opaque identifiers do not expose provider records or component documents.
3. Convex Auth, Clerk, and Better Auth fixtures derive actor identity and admin permission inside trusted host functions, behave equivalently, and reject missing or forged identity, permission, and scope arguments.
4. A visitor can browse every permitted board under the installation-wide policy while an authenticated user can create, edit, withdraw, vote on, and discuss feedback with stable attribution and totals.
5. Repeated vote operations remain one membership per actor, and comment replies identify one parent without creating nested discussion trees.

**Plans:** 8/8 plans complete

- [x] 01-01-PLAN.md
- [x] 01-02-PLAN.md
- [x] 01-03-PLAN.md
- [x] 01-04-PLAN.md
- [x] 01-05-PLAN.md
- [x] 01-06-PLAN.md
- [x] 01-07-PLAN.md
- [x] 01-08-PLAN.md

**Wave 1**

- [x] `01-01-PLAN.md` — Define the failing packed-consumer acceptance test and approve the dependency matrix.

**Wave 2** _(blocked on Wave 1 completion)_

- [x] `01-02-PLAN.md` — Ship the packed Walking Skeleton with a real scoped component write/read and fixture interaction.

**Wave 3** _(blocked on Wave 2 completion)_

- [x] `01-03-PLAN.md` — Add secure multi-board lifecycle, scope isolation, DTO privacy, and real-backend pagination.

**Wave 4** _(blocked on Wave 3 completion)_

- [x] `01-04-PLAN.md` — Add idempotent voting, flat replies, and privacy-preserving actor anonymization.

**Wave 5** _(blocked on Wave 4 completion)_

- [x] `01-05-PLAN.md` — Prove three-provider conformance, reject forged authority, and close packed-artifact quality gates.

**Wave 6** _(blocked on Wave 5 completion)_

- [x] `01-06-PLAN.md` — Make all auth fixtures independently compilable and repair the Better Auth helper boundary. (completed 2026-07-16)

**Wave 7** _(blocked on Wave 6 completion)_

- [x] `01-07-PLAN.md` — Execute the three real provider factories through one convex-test authority-conformance matrix.

**Wave 8** _(blocked on Wave 7 completion)_

- [x] `01-08-PLAN.md` — Lock additive board configuration, honest bounded counts, and required Phase 1 release gates. (completed 2026-07-16)

**UI hint**: yes

### Phase 2: Complete Feedback-to-Changelog Workflow

**Goal:** As a developer integrating Afferent into my existing Convex + React application, I want to run the complete provider-neutral feedback-to-roadmap-to-changelog workflow -- ranked, searchable, and filterable discovery with admin duplicate merges; authenticated participation; admin moderation with a status-driven roadmap; manually published changelog entries linked to feedback; and in-app notifications backed by a host-consumable delivery outbox -- through tested component APIs and framework-light headless React hooks with explicit async, auth, and error states, so that my users and admins can complete the entire feedback lifecycle while I retain ownership of identity, authorization, and my own presentation.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07, ADMN-08, ADMN-09, ADMN-10, RMAP-01, RMAP-02, RMAP-03, CHLG-01, CHLG-02, CHLG-03, CHLG-04, CHLG-05, CHLG-06, NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, NOTF-07, UI-01, UI-02, UI-03, QUAL-01
**Success Criteria** (what must be TRUE):

1. Visitors can page through visible feedback by newest, top, or documented trending order; search and filter it; see deterministic similar-post suggestions; and follow merged-post links to a canonical post without losing votes, comments, actors, or history.
2. An authorized admin can edit and move posts, manage tags, apply the six built-in statuses, lock discussion, archive or restore posts, and inspect append-only activity, while unsafe content and rate-limited participation fail with actionable errors.
3. Visitors can browse a board-filtered roadmap derived from Planned, In Progress, and Complete posts and browse stable linked changelog entries that admins explicitly draft, publish, or unpublish without status-driven automation.
4. Users can manage subscriptions, receive and read the defined in-app status, admin-reply, comment-reply, mention, and changelog notifications, while hosts can consume the same events through a typed vendor-neutral delivery contract.
5. A React developer can exercise every public, participation, roadmap, changelog, notification, and admin workflow through injected host function references with explicit loading, pagination, pending, empty, and error states, backed by automated invariant and security tests.

**Plans:** 17/17 plans complete

**Wave 17** _(additive exact-oracle closure; required before Phase 3 Plan 03-02)_

- [x] 02-17-PLAN.md — Replace permissive installed-reader prefix checks with exact temporal, pinned-boundary, stale-generation, and no-flake proof. (final bounded closure completed 2026-07-21)

**Wave 16** _(additive merged-reader correction; required before Phase 3 Plan 03-02)_

- [x] 02-16-PLAN.md — Unify merged comments and activity on one bounded composite-cursor pagination contract with real product-path proof.

**Wave 15** _(additive headless correction; required before Phase 3 Plan 03-02)_

- [x] 02-15-PLAN.md — Complete bounded flat comment reads through the atomic headless React pagination contract.

- [x] 02-14-PLAN.md

- [x] 02-13-PLAN.md

- [x] 02-12-PLAN.md

- [x] 02-11-PLAN.md

**Wave 1**

- [x] 02-01-PLAN.md

**Wave 2** _(blocked on Wave 1 completion)_

- [x] 02-02-PLAN.md

**Wave 3** _(blocked on Wave 2 completion)_

- [x] 02-03-PLAN.md

**Wave 4** _(blocked on Wave 3 completion)_

- [x] 02-04-PLAN.md

**Wave 5** _(blocked on Wave 4 completion)_

- [x] 02-06-PLAN.md

**Wave 6** _(blocked on Wave 5 completion)_

- [x] 02-07-PLAN.md

**Wave 7** _(blocked on Wave 6 completion)_

- [x] 02-08-PLAN.md

**Wave 8** _(blocked on Wave 7 completion)_

- [x] 02-05-PLAN.md

**Wave 9** _(blocked on Wave 8 completion)_

- [x] 02-09-PLAN.md

**Wave 10** _(blocked on Wave 9 completion)_

- [x] 02-10-PLAN.md

**UI hint**: yes

### Phase 02.1: Server-Derived Viewer Capability Contract (INSERTED)

**Goal:** Copied UI can render exact vote and author-action state from server-derived, provider-neutral viewer truth without accepting browser identity or authority facts.
**Requirements**: UI-08
**Depends on:** Phase 2
**Success Criteria** (what must be TRUE):

1. Trusted host query wrappers derive an optional provider-neutral viewer actor on every post-bearing read, while browser arguments expose no actor or capability input.
2. Versioned post DTOs expose indexed vote membership and server-computed author edit/withdraw capabilities with anonymous-safe false values and exact mutation-policy parity.
3. Headless feed/detail hooks surface and optimistically maintain the fields without UI-local authority state, and packed/static/adversarial tests reject spoofing, scans, drift, and stale capability behavior.

**Plans:** 1/1 plans complete

Plans:

- [x] `02.1-01-PLAN.md` — Add the trusted viewer resolver, indexed vote/action projection, explicit DTO versioning, exact headless optimism, and adversarial packed/full-regression proof.

### Phase 02.2: Notification Navigation Target Contract (INSERTED)

**Goal:** In-app notification consumers receive a versioned, accessible, public navigation destination resolved from trusted source records without polymorphic internal IDs or client-side joins.
**Requirements**: NOTF-08
**Depends on:** Phase 02.1
**Success Criteria** (what must be TRUE):

1. Notification DTOs expose a required closed post/comment-anchor or public-changelog-slug target with a server-authored human-readable accessible label and no public polymorphic `entityId`.
2. Target resolution is scope- and relationship-complete inside the component, so host wrappers, hooks, packed consumers, and copied UI need no direct or N+1 referent reads.
3. Small and resumable merges canonicalize post destinations while preserving comment and changelog source identity, with safe post-only degradation for legacy-invalid optional comment anchors.
4. Exact DTO/page version bumps, validators/generated references, headless and packed consumption, adversarial scope/ID/scan guards, and the complete Phase 2 regression prove the contract.

**Plans:** 2/2 plans complete

Plans:

- [x] `02.2-01-PLAN.md` — Replace public polymorphic notification IDs with server-resolved accessible targets and type-aware merge normalization.

**Wave 2** _(verification gap closure; blocked on Plan 02.2-01)_

- [x] `02.2-02-PLAN.md` — Correct post-only fallback labels and execute required cross-scope/mismatched notification relation proofs.

### Phase 02.3: Admin Read and Projection Completion (INSERTED)

**Goal:** Source-owned administration receives complete server-authorized moderation, changelog, and readable activity state through bounded presentation-ready contracts.
**Requirements**: ADMN-11
**Depends on:** Phase 02.2
**Success Criteria** (what must be TRUE):

1. Authorized admins can page visible or hidden feedback and directly retrieve archived records with exact discussion-lock, archive, lifecycle, and merge disposition; non-admin denial occurs before component invocation.
2. Authorized admins can page draft, published, and unpublished changelog entries through a scope-leading index, binding, and complete headless state contract.
3. Admin changelog entries expose ordered canonical linked feedback id/title/status summaries, with no bare-ID or browser N+1 resolution path.
4. Activity DTOs expose readable board names/slugs, tag names, and changelog titles/slugs that survive deletion or unlisting, without leaking relation IDs.
5. Exact DTO/page versions, trusted authority matrices, index/no-scan guards, packed/headless consumption, and the complete Phase 2 regression prove all five locked gaps.

**Plans:** 1/1 plans complete

Plans:

- [x] `02.3-01-PLAN.md` — Add indexed authorized admin reads, complete moderation/changelog projections, and snapshot-backed readable activity.

### Phase 3: Source-Owned Product Interface

**Goal:** As a developer adopting Afferent, I want to install and restyle source-owned public and admin shadcn interfaces from one canonical registry-backed source, so that my users and administrators can complete the feedback lifecycle through accessible, responsive screens without replacing the headless behavior layer.
**Mode:** mvp
**Depends on:** Phase 02.3
**Requirements:** UI-04, UI-05, UI-06, UI-07, QUAL-04, QUAL-07, QUAL-08
**Success Criteria** (what must be TRUE):

1. A developer can install source-owned shadcn components for public feedback, roadmap, changelog, and notification workflows and restyle them without replacing the headless behavior layer.
2. A developer can install source-owned admin components for triage, moderation, roadmap status management, and changelog publishing and use the complete workflows with keyboard-only interaction.
3. The shadcn registry and byte-equivalent mirrored repository examples come from one canonical source with a deterministic drift gate, and a clean consumer fixture installs the packed Afferent tarball plus generated registry items through the real shadcn path before typechecking and building against the supported package range.
4. Supplied public and admin interfaces pass documented WCAG 2.2 AA-oriented keyboard, focus, announcement, contrast, 320 CSS-pixel reflow, 200% zoom, and phone/tablet/desktop layout checks with versioned evidence.

**UI hint**: yes
**Plans:** 2/6 plans executed

- [x] 03-01-PLAN.md
- [x] 03-02-PLAN.md
- [ ] 03-03-PLAN.md
- [ ] 03-04-PLAN.md
- [ ] 03-05-PLAN.md
- [ ] 03-06-PLAN.md

**Wave 1**

- [x] `03-01-PLAN.md` — Prove one canonical board item through packed tarball, real local shadcn install, and isolated exact dependency closure.

**Wave 2** _(blocked on Wave 1 completion)_

- [x] `03-02-PLAN.md` — Complete the public feedback discovery, creation, deep-link, participation, and discussion interface.

**Wave 3** _(blocked on Wave 2 completion)_

- [ ] `03-03-PLAN.md` — Add exact roadmap, chronological changelog, and composable notification public surfaces.

**Wave 4** _(blocked on Wave 3 completion)_

- [ ] `03-04-PLAN.md` — Deliver keyboard-complete admin triage, moderation, merge, tag, status, and changelog publishing workflows.

**Wave 5** _(blocked on Wave 4 completion)_

- [ ] `03-05-PLAN.md` — Close the six-item deterministic registry/mirror and clean all-item consumer installation contract.

**Wave 6** _(blocked on Wave 5 completion)_

- [ ] `03-06-PLAN.md` — Produce browser accessibility/reflow/zoom evidence and the aggregate Phase 3 release gate.

**Cross-cutting constraints:**

- Every copied hook consumer imports only `afferent/react.js`, remains an explicit route-agnostic client component, and renders hook-owned closed state without recreating authority, queries, pagination, optimism, rollback, or toast behavior.
- Canonical `ui/afferent/**` source alone emits stable namespaced registry JSON and byte-equivalent `examples/ui/afferent/**`; generated paths are never hand-edited and every clean-consumer proof installs the packed tarball before local shadcn items.
- All Phase 3 package dependencies are committed once from the TypeScript 6 baseline; the user's TypeScript 7 manifest/lock experiment is restored unstaged and package files are untouched by later plans.

### Phase 4: Hosted Production Release

**Goal:** Adopters can evaluate and install the same production artifacts demonstrated by a safe, publicly hosted Afferent application.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** COMP-01, DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEMO-06, DEMO-07, QUAL-05, QUAL-06, QUAL-09, QUAL-11
**Success Criteria** (what must be TRUE):

1. A visitor can open a public Vite and Convex Auth application that consumes the published integration path and explore an immutable showcase with representative feedback, roadmap, and changelog data.
2. Each authenticated visitor can use and deterministically reset a private admin sandbox backed by a separate component instance whose trusted host derives scope without accepting it from browser arguments.
3. Sandbox quotas, rate limits, expiry, and cleanup bound public-demo growth, and adversarial two-user tests prove that reads, writes, search, counts, seeds, resets, and cleanup never cross visitor scopes.
4. Browser tests run the public feedback, roadmap, changelog, notification, and admin workflows against real Convex using the artifacts that consumers install.
5. Documentation covers installation through upgrades for all supported auth and UI paths, and a validated npm release publishes exports, declarations, provenance, and synchronized package, registry, documentation, and demo versions.

**Plans:** TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute sequentially: 1 -> 2 -> 2.1 -> 2.2 -> 2.3 -> 3 -> 4

| Phase                                      | Plans Complete | Status           | Completed  |
| ------------------------------------------ | -------------- | ---------------- | ---------- |
| 1. Secure Installable Feedback Board       | 8/8            | Complete         | 2026-07-16 |
| 2. Complete Feedback-to-Changelog Workflow | 17/17 | Complete    | 2026-07-21 |
| 2.1 Server-Derived Viewer Capability Contract | 1/1 | Complete   | 2026-07-21 |
| 2.2 Notification Navigation Target Contract | 2/2 | Complete   | 2026-07-21 |
| 2.3 Admin Read and Projection Completion   | 1/1 | Complete   | 2026-07-21 |
| 3. Source-Owned Product Interface          | 2/6            | In progress      | -          |
| 4. Hosted Production Release               | 0/TBD          | Not started      | -          |

---

_Roadmap created: 2026-07-15_
