# Roadmap: Afferent

## Overview

Afferent reaches its first public release through four coarse vertical slices. The first proves that a real Convex consumer can install a packed artifact and run a secure multi-board feedback loop through any supported auth provider. The second closes the full feedback-to-roadmap-to-changelog workflow through tested component APIs and headless React. The third turns that behavior into accessible, responsive, source-owned shadcn interfaces. The fourth publishes the exact artifacts and hosted showcase/sandbox that adopters and evaluators will use.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Secure Installable Feedback Board** - A clean consumer can install the packed artifact, connect any supported auth provider, and run the core multi-board feedback loop safely.
- [ ] **Phase 2: Complete Feedback-to-Changelog Workflow** - Users and admins can complete discovery, moderation, roadmap, changelog, and notification workflows through tested headless React APIs.
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

**Plans:** 6/8 plans executed

- [x] 01-01-PLAN.md
- [x] 01-02-PLAN.md
- [x] 01-03-PLAN.md
- [x] 01-04-PLAN.md
- [x] 01-05-PLAN.md
- [x] 01-06-PLAN.md
- [ ] 01-07-PLAN.md
- [ ] 01-08-PLAN.md

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

- [ ] `01-06-PLAN.md` — Make all auth fixtures independently compilable and repair the Better Auth helper boundary.

**Wave 7** _(blocked on Wave 6 completion)_

- [ ] `01-07-PLAN.md` — Execute the three real provider factories through one convex-test authority-conformance matrix.

**Wave 8** _(blocked on Wave 7 completion)_

- [ ] `01-08-PLAN.md` — Lock additive board configuration, honest bounded counts, and required Phase 1 release gates.

**UI hint**: yes

### Phase 2: Complete Feedback-to-Changelog Workflow

**Goal:** Teams can run the complete feedback-to-roadmap-to-changelog loop through provider-neutral headless React APIs.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07, ADMN-08, ADMN-09, ADMN-10, RMAP-01, RMAP-02, RMAP-03, CHLG-01, CHLG-02, CHLG-03, CHLG-04, CHLG-05, CHLG-06, NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, NOTF-07, UI-01, UI-02, UI-03, QUAL-01
**Success Criteria** (what must be TRUE):

1. Visitors can page through visible feedback by newest, top, or documented trending order; search and filter it; see deterministic similar-post suggestions; and follow merged-post links to a canonical post without losing votes, comments, actors, or history.
2. An authorized admin can edit and move posts, manage tags, apply the six built-in statuses, lock discussion, archive or restore posts, and inspect append-only activity, while unsafe content and rate-limited participation fail with actionable errors.
3. Visitors can browse a board-filtered roadmap derived from Planned, In Progress, and Complete posts and browse stable linked changelog entries that admins explicitly draft, publish, or unpublish without status-driven automation.
4. Users can manage subscriptions, receive and read the defined in-app status, admin-reply, comment-reply, mention, and changelog notifications, while hosts can consume the same events through a typed vendor-neutral delivery contract.
5. A React developer can exercise every public, participation, roadmap, changelog, notification, and admin workflow through injected host function references with explicit loading, pagination, pending, empty, and error states, backed by automated invariant and security tests.

**Plans:** TBD
**UI hint**: yes

### Phase 3: Source-Owned Product Interface

**Goal:** Developers can adopt polished public and admin interfaces as accessible, responsive source they fully own and restyle.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** UI-04, UI-05, UI-06, UI-07, QUAL-04, QUAL-07, QUAL-08
**Success Criteria** (what must be TRUE):

1. A developer can install source-owned shadcn components for public feedback, roadmap, changelog, and notification workflows and restyle them without replacing the headless behavior layer.
2. A developer can install source-owned admin components for triage, moderation, roadmap status management, and changelog publishing and use the complete workflows with keyboard-only interaction.
3. The shadcn registry and mirrored repository examples come from one canonical source, and a clean consumer fixture installs and builds them against the supported package range.
4. Supplied public and admin interfaces pass the documented WCAG 2.2 AA-oriented keyboard, focus, announcement, contrast, zoom, and reflow checks on phone, tablet, and desktop layouts.

**Plans:** TBD
**UI hint**: yes

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
Phases execute sequentially: 1 -> 2 -> 3 -> 4

| Phase                                      | Plans Complete | Status      | Completed |
| ------------------------------------------ | -------------- | ----------- | --------- |
| 1. Secure Installable Feedback Board       | 6/8            | In Progress |           |
| 2. Complete Feedback-to-Changelog Workflow | 0/TBD          | Not started | -         |
| 3. Source-Owned Product Interface          | 0/TBD          | Not started | -         |
| 4. Hosted Production Release               | 0/TBD          | Not started | -         |

---

_Roadmap created: 2026-07-15_
