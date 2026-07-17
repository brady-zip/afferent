# Requirements: Afferent

**Defined:** 2026-07-15
**Core Value:** SaaS teams can add deeply integrated product feedback to an existing Convex application while retaining native ownership of their data, identity, permissions, and user experience.

## v1 Requirements

Requirements for the first production-ready public release. Roadmap creation will map each requirement to exactly one phase.

### Access and Identity

- [x] **ACCS-01**: An installer can configure one installation-wide read policy that makes Afferent content either public or restricted to authenticated users.
- [x] **ACCS-02**: Only users authenticated by the host application can create posts, vote, or comment.
- [x] **ACCS-03**: The host application can map a verified auth-provider identity to a stable provider-neutral Afferent actor.
- [x] **ACCS-04**: The host application decides whether an authenticated actor can perform Afferent admin operations.
- [x] **ACCS-05**: Afferent rejects participation and admin operations when the host wrapper does not supply the required verified actor or permission.
- [x] **ACCS-06**: A normal Afferent installation represents exactly one product while supporting multiple feedback boards.

### Feedback Participation

- [x] **FDBK-01**: A visitor can browse posts on every board permitted by the installation-wide read policy.
- [x] **FDBK-02**: An authenticated user can create a feedback post on a board.
- [x] **FDBK-03**: An authenticated author can edit their own feedback post.
- [x] **FDBK-04**: An authenticated author can withdraw their own feedback post without destroying its history.
- [x] **FDBK-05**: An authenticated user can add or remove their one vote on a feedback post without creating duplicate vote memberships.
- [x] **FDBK-06**: An authenticated user can add a flat comment to a feedback post.
- [x] **FDBK-07**: An authenticated user can reply to a specific comment through a lightweight reply reference without creating unbounded comment nesting.
- [x] **FDBK-08**: A visitor can see stable author attribution, vote totals, comment totals, status, board, and tags wherever a visible post is presented.

### Discovery and Duplicates

- [x] **DISC-01**: A visitor can browse visible feedback ordered by newest activity.
- [x] **DISC-02**: A visitor can browse visible feedback ordered by vote total.
- [x] **DISC-03**: A visitor can browse visible feedback using a documented trending order.
- [x] **DISC-04**: A visitor can search visible feedback by text relevance.
- [x] **DISC-05**: A visitor can filter visible feedback by board, status, and admin-assigned tag.
- [x] **DISC-06**: A user composing a new post can see deterministic similar-post suggestions before submission.
- [ ] **DISC-07**: An authorized admin can merge a duplicate post into a canonical post while preserving actors, votes, comments, and activity history.
- [ ] **DISC-08**: A request for a merged post resolves to a durable tombstone or redirect that identifies the canonical post.

### Administration and Moderation

- [x] **ADMN-01**: An authorized admin can edit a feedback post.
- [x] **ADMN-02**: An authorized admin can move a feedback post between boards.
- [x] **ADMN-03**: An authorized admin can create and manage internal tags.
- [x] **ADMN-04**: An authorized admin can assign and remove internal tags on feedback posts.
- [x] **ADMN-05**: An authorized admin can move a feedback post among the built-in Open, Under Review, Planned, In Progress, Complete, and Closed statuses.
- [x] **ADMN-06**: An authorized admin can lock or unlock discussion on a feedback post.
- [x] **ADMN-07**: An authorized admin can archive and restore a feedback post.
- [x] **ADMN-08**: Participation mutations enforce documented rate limits and return actionable errors when a limit is reached.
- [x] **ADMN-09**: Afferent accepts and returns user-authored content through a documented safe-content contract that prevents stored script execution in conforming consumers.
- [x] **ADMN-10**: A post exposes append-only activity entries for creation, edits, status changes, board moves, tag changes, locks, archive or restore, merges, and linked changelog publication.

### Roadmap

- [x] **RMAP-01**: A visitor can view a public roadmap derived from posts in the Planned, In Progress, and Complete statuses.
- [x] **RMAP-02**: A visitor can filter the public roadmap by feedback board.
- [x] **RMAP-03**: The roadmap applies the same visibility and moderation rules as direct post browsing and search.

### Changelog

- [x] **CHLG-01**: An authorized admin can create and edit a changelog draft.
- [x] **CHLG-02**: An authorized admin can publish and unpublish a changelog entry explicitly.
- [x] **CHLG-03**: An authorized admin can link a changelog entry to one or more feedback posts.
- [x] **CHLG-04**: A visitor can browse published changelog entries.
- [x] **CHLG-05**: A visitor can open a published changelog entry at a stable URL.
- [x] **CHLG-06**: Changelog publication never occurs automatically from a feedback status change.

### Notifications

- [x] **NOTF-01**: An authenticated user can subscribe or unsubscribe from updates to a feedback post.
- [x] **NOTF-02**: A subscribed user receives an in-app notification when a feedback post changes status.
- [x] **NOTF-03**: A subscribed user receives an in-app notification when an admin replies to the feedback post.
- [x] **NOTF-04**: An authenticated user receives an in-app notification when another comment replies to or mentions them.
- [x] **NOTF-05**: A subscribed user receives an in-app notification when a linked changelog entry is published.
- [x] **NOTF-06**: A host application can consume typed delivery events for supported notification events without adopting a built-in email or push vendor.
- [x] **NOTF-07**: A user can mark individual in-app notifications as read.

### Component and Auth Integration

- [ ] **COMP-01**: A developer can install Afferent from a published npm package as a reusable Convex component.
- [x] **COMP-02**: A developer can mount typed public-read, authenticated-participation, and authorized-admin wrapper APIs in the host Convex application.
- [x] **COMP-03**: Public component contracts use stable provider-neutral DTOs and opaque string identifiers rather than exposing component-internal documents or provider records.
- [x] **COMP-04**: A developer can integrate Afferent with Convex Auth using a documented adapter or recipe verified by an integration fixture.
- [x] **COMP-05**: A developer can integrate Afferent with Clerk using a documented adapter or recipe verified by an integration fixture.
- [x] **COMP-06**: A developer can integrate Afferent with the Convex Better Auth component using a documented adapter or recipe verified by an integration fixture.
- [x] **COMP-07**: Auth integration code derives actor identity and admin permission inside trusted host functions rather than accepting `userId`, `isAdmin`, or demo scope from browser arguments.

### React and Source-Owned UI

- [x] **UI-01**: A React developer can use headless hooks and providers for public browsing, participation, roadmap, changelog, notifications, and admin operations.
- [x] **UI-02**: The headless React layer accepts host-generated function references and does not require a specific auth provider, router, toast library, or packaged design system.
- [x] **UI-03**: Headless APIs expose explicit authentication-loading, pagination, mutation-pending, empty, and error states.
- [ ] **UI-04**: A developer can install source-owned shadcn components for the public feedback, roadmap, changelog, and notification experiences.
- [ ] **UI-05**: A developer can install source-owned shadcn components for feedback administration, moderation, roadmap status management, and changelog publishing.
- [ ] **UI-06**: A developer can obtain the canonical UI source from both a shadcn registry and mirrored repository examples.
- [ ] **UI-07**: Registry artifacts and repository examples are generated or checked against one canonical UI source to prevent incompatible copies.

### Hosted Example

- [ ] **DEMO-01**: A visitor can open a publicly deployed Vite example that uses Convex Auth and the published Afferent integration path.
- [ ] **DEMO-02**: A visitor can explore an immutable showcase populated with representative boards, feedback, roadmap items, and changelog entries.
- [ ] **DEMO-03**: Each authenticated demo visitor receives a private admin sandbox isolated from every other visitor.
- [ ] **DEMO-04**: The demo uses separate statically installed showcase and sandbox component instances so sandbox scoping does not change the normal one-product installation contract.
- [ ] **DEMO-05**: The trusted demo host derives sandbox scope from the authenticated visitor and never accepts sandbox scope from browser arguments.
- [ ] **DEMO-06**: An authenticated demo visitor can seed or reset their sandbox to a deterministic starting state.
- [ ] **DEMO-07**: Sandbox quotas, rate limits, expiration, and cleanup prevent unbounded public-demo storage growth.

### Release Quality

- [x] **QUAL-01**: Automated component tests verify domain invariants, authorization boundaries, visibility rules, voting idempotency, merges, status projections, changelog publication, and notifications.
- [x] **QUAL-02**: Auth-conformance tests verify equivalent identity and authorization behavior for Convex Auth, Clerk, and Better Auth fixtures.
- [x] **QUAL-03**: A clean consumer fixture can install the packed npm artifact, run Convex code generation, typecheck, and build without source-relative workspace imports.
- [ ] **QUAL-04**: A clean consumer fixture can install registry components and build them against the supported package version range.
- [ ] **QUAL-05**: Browser tests verify the public feedback, roadmap, changelog, notification, and admin workflows against a real Convex deployment.
- [ ] **QUAL-06**: Adversarial two-user tests verify that sandbox reads, writes, search, counts, seeds, resets, and cleanup never cross visitor scopes.
- [ ] **QUAL-07**: Supplied public and admin interfaces meet documented WCAG 2.2 AA-oriented keyboard, focus, announcement, contrast, zoom, and reflow checks.
- [ ] **QUAL-08**: Supplied public and admin interfaces support phone, tablet, and desktop layouts.
- [ ] **QUAL-09**: Documentation covers installation, component mounting, all three auth integrations, access policy, headless React usage, shadcn installation, customization, testing, deployment, and upgrades.
- [x] **QUAL-10**: The repository and published package include the Apache-2.0 license.
- [ ] **QUAL-11**: A validated npm release publishes explicit package exports, declarations, provenance, and synchronized package, registry, documentation, and demo versions.

## v2 Requirements

Deferred capabilities tracked for follow-up releases and excluded from the initial roadmap.

Custom status configuration and machine-readable export are deliberate post-research deferrals: the user selected fixed v1 statuses and developer capabilities that excluded export from the first release.

### Workflow and Moderation

- **WFLO-01**: An authorized admin can create, reorder, rename, and configure custom workflow statuses.
- **MODQ-01**: An authorized admin can review reported or approval-pending content in a moderation queue.
- **MODQ-02**: A user can report a feedback post or comment for moderator review.
- **AUDT-01**: An authorized admin can query and export a workspace-wide audit history across entities.

### Data Portability

- **DATA-01**: An authorized host can export Afferent data through a documented machine-readable format.
- **DATA-02**: An authorized host can dry-run and import a documented CSV or JSON format after the core schema stabilizes.

### Delivery and Integrations

- **DLVR-01**: A developer can install a reference email-delivery adapter with unsubscribe and preference handling.
- **INTG-01**: A host can connect Afferent to prioritized third-party tools through maintained named integrations.

### Intelligence and Reporting

- **AIDP-01**: A user can receive evaluated semantic duplicate suggestions while retaining human confirmation.
- **AIAN-01**: An authorized admin can opt into AI-assisted summaries, theme extraction, or sentiment analysis.
- **ANLY-01**: An authorized admin can view focused feedback trends and operational reports validated by real usage needs.

### Extended Product Surface

- **TAXO-01**: An authorized admin can configure a public category taxonomy separate from internal tags.
- **I18N-01**: Supplied UI supports documented localization and right-to-left extension paths.

## Out of Scope

Explicit exclusions for the first product direction, documented to prevent scope creep.

| Feature                                                   | Reason                                                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Multi-product organizations in one component installation | v1 deliberately defines one installation as one product and avoids organization-level tenancy and roles.    |
| Component-owned authentication or admin membership        | The host application remains the identity and authorization source of truth across all supported providers. |
| Anonymous writes by default                               | Public browsing with authenticated participation provides safer attribution and abuse controls.             |
| Per-board access-control policies                         | Installation-wide policy provides the chosen configurability without multiplying authorization states.      |
| Independent roadmap records                               | The roadmap is intentionally a projection of feedback workflow status.                                      |
| Automatic duplicate merging                               | Human confirmation prevents distinct needs and votes from being combined incorrectly.                       |
| Automatic changelog publication                           | Administrators retain editorial control over public announcements.                                          |
| Deep comment threading and social reactions               | Flat comments with reply references keep discussion and moderation focused on feedback.                     |
| Opaque packaged design system                             | Headless APIs and copy-owned shadcn source preserve consumer styling and ownership.                         |
| Shared mutable public demo workspace                      | Private per-user sandboxes prevent vandalism and cross-visitor interference.                                |

## Traceability

Every v1 requirement maps to exactly one roadmap phase.

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| ACCS-01     | Phase 1 | Complete |
| ACCS-02     | Phase 1 | Complete |
| ACCS-03     | Phase 1 | Complete |
| ACCS-04     | Phase 1 | Complete |
| ACCS-05     | Phase 1 | Complete |
| ACCS-06     | Phase 1 | Complete |
| FDBK-01     | Phase 1 | Complete |
| FDBK-02     | Phase 1 | Complete |
| FDBK-03     | Phase 1 | Complete |
| FDBK-04     | Phase 1 | Complete |
| FDBK-05     | Phase 1 | Complete |
| FDBK-06     | Phase 1 | Complete |
| FDBK-07     | Phase 1 | Complete |
| FDBK-08     | Phase 1 | Complete |
| DISC-01     | Phase 2 | Complete |
| DISC-02     | Phase 2 | Complete |
| DISC-03     | Phase 2 | Complete |
| DISC-04     | Phase 2 | Complete |
| DISC-05     | Phase 2 | Complete |
| DISC-06     | Phase 2 | Complete |
| DISC-07     | Phase 2 | Pending  |
| DISC-08     | Phase 2 | Pending  |
| ADMN-01     | Phase 2 | Complete |
| ADMN-02     | Phase 2 | Complete |
| ADMN-03     | Phase 2 | Complete |
| ADMN-04     | Phase 2 | Complete |
| ADMN-05     | Phase 2 | Complete |
| ADMN-06     | Phase 2 | Complete |
| ADMN-07     | Phase 2 | Complete |
| ADMN-08     | Phase 2 | Complete |
| ADMN-09     | Phase 2 | Complete |
| ADMN-10     | Phase 2 | Complete |
| RMAP-01     | Phase 2 | Complete |
| RMAP-02     | Phase 2 | Complete |
| RMAP-03     | Phase 2 | Complete |
| CHLG-01     | Phase 2 | Complete |
| CHLG-02     | Phase 2 | Complete |
| CHLG-03     | Phase 2 | Complete |
| CHLG-04     | Phase 2 | Complete |
| CHLG-05     | Phase 2 | Complete |
| CHLG-06     | Phase 2 | Complete |
| NOTF-01     | Phase 2 | Complete |
| NOTF-02     | Phase 2 | Complete |
| NOTF-03     | Phase 2 | Complete |
| NOTF-04     | Phase 2 | Complete |
| NOTF-05     | Phase 2 | Complete |
| NOTF-06     | Phase 2 | Complete |
| NOTF-07     | Phase 2 | Complete |
| COMP-01     | Phase 4 | Pending  |
| COMP-02     | Phase 1 | Complete |
| COMP-03     | Phase 1 | Complete |
| COMP-04     | Phase 1 | Complete |
| COMP-05     | Phase 1 | Complete |
| COMP-06     | Phase 1 | Complete |
| COMP-07     | Phase 1 | Complete |
| UI-01       | Phase 2 | Complete |
| UI-02       | Phase 2 | Complete |
| UI-03       | Phase 2 | Complete |
| UI-04       | Phase 3 | Pending  |
| UI-05       | Phase 3 | Pending  |
| UI-06       | Phase 3 | Pending  |
| UI-07       | Phase 3 | Pending  |
| DEMO-01     | Phase 4 | Pending  |
| DEMO-02     | Phase 4 | Pending  |
| DEMO-03     | Phase 4 | Pending  |
| DEMO-04     | Phase 4 | Pending  |
| DEMO-05     | Phase 4 | Pending  |
| DEMO-06     | Phase 4 | Pending  |
| DEMO-07     | Phase 4 | Pending  |
| QUAL-01     | Phase 2 | Complete |
| QUAL-02     | Phase 1 | Complete |
| QUAL-03     | Phase 1 | Complete |
| QUAL-04     | Phase 3 | Pending  |
| QUAL-05     | Phase 4 | Pending  |
| QUAL-06     | Phase 4 | Pending  |
| QUAL-07     | Phase 3 | Pending  |
| QUAL-08     | Phase 3 | Pending  |
| QUAL-09     | Phase 4 | Pending  |
| QUAL-10     | Phase 1 | Complete |
| QUAL-11     | Phase 4 | Pending  |

**Coverage:**

- v1 requirements: 80 total
- Mapped to phases: 80
- Unmapped: 0 ✓

---

_Requirements defined: 2026-07-15_
_Last updated: 2026-07-15 after roadmap creation_
