# Afferent

## What This Is

Afferent is an open-source Convex component that gives SaaS teams the core product-feedback workflow of Canny without moving feedback data, identity, or permissions into a separate SaaS. It ships a reusable Convex backend, headless React integration, copyable user-facing and admin interfaces, and a clone-and-run local working example.

The first release covers public feedback boards, authenticated participation, administrative feedback management, a status-driven public roadmap, and manually published changelog entries linked to feedback. One Afferent installation represents one product and can contain multiple feedback boards managed by one host application.

## Core Value

SaaS teams can add deeply integrated product feedback to an existing Convex application while retaining native ownership of their data, identity, permissions, and user experience.

## Business Context

- **Customer**: SaaS product teams already building with Convex and React
- **Revenue model**: Open-source Apache-2.0 source release; no separate Afferent SaaS subscription is required for v1
- **Success metric**: A team can install Afferent into an existing Convex app, connect its existing auth provider, restyle the supplied UI, and run the complete feedback-to-roadmap-to-changelog workflow
- **Strategy notes**: Native Convex ownership is the primary promise; complete restylability and avoiding another feedback SaaS subscription are supporting benefits

## Current State

Phases 1 through 4 are complete and verified. The packed Convex component supports provider-neutral trusted-host integration for Convex Auth, Clerk, and Better Auth; secure multi-board feedback; ranked and searchable discovery; participation and moderation; a status-driven roadmap; manually published linked changelog entries; in-app notifications and a host delivery outbox; and the complete framework-light headless React contract. The accessible, responsive public and admin interfaces now ship from one canonical source through mirrored examples and a deterministic shadcn registry. Afferent v0.1.0 is publicly released at https://github.com/brady-zip/afferent/tree/v0.1.0 with matching registry and documentation at https://brady-zip.github.io/afferent/. The exact tag passes clean packed-consumer checks and the complete real Convex local gate; its feature-full demo starts an anonymous development backend without account credentials. See docs/releases/0.1.0.md for immutable identities and evidence.

## Requirements

### Validated

- [x] Developers can build and install Afferent as a reusable packed Convex component from repository source. — Validated in Phase 1: Secure Installable Feedback Board.
- [x] A host application can connect Afferent to Convex Auth, Clerk, or the Convex Better Auth component without coupling Afferent's internal data model to a specific provider. — Validated in Phase 1.
- [x] The host application owns authentication and admin authorization, then passes stable identity and authorization context into Afferent through typed app-level APIs. — Validated in Phase 1.
- [x] One Afferent installation supports one product with multiple public feedback boards. — Validated in Phase 1.
- [x] Visitors can browse feedback publicly while authenticated users can submit posts, vote, and comment under a configurable installation-wide access policy. — Validated in Phase 1.
- [x] Administrators can moderate and organize feedback, manage workflow statuses, and move posts through the product lifecycle. — Validated in Phase 2: Complete Feedback-to-Changelog Workflow.
- [x] Selected workflow statuses form a public, status-driven roadmap. — Validated in Phase 2.
- [x] Administrators can manually create and publish changelog entries and optionally link them to completed feedback posts. — Validated in Phase 2.
- [x] Developers can build custom interfaces using headless React hooks and providers. — Validated in Phase 2.
- [x] Developers can adopt complete user-facing and admin interfaces as source-owned shadcn components from both a shadcn registry and repository examples. — Validated in Phase 3: Source-Owned Product Interface.

- [x] A developer can clone the repository and start the complete Vite and Convex Auth example with one documented command and no Convex account, deploy key, or committed auth material. — Validated in Phase 4 against public v0.1.0.
- [x] Each locally signed-in demo user receives a private, seeded admin sandbox that they can modify and reset without affecting other local users. — Validated in Phase 4 against public v0.1.0.
- [x] The first public release includes typed APIs, automated tests, integration documentation, source-build installation documentation, a tagged Apache-2.0 source release, shadcn registry distribution, and the feature-full local working example. — Validated in Phase 4 against public v0.1.0.

### Active

No remaining v1 requirements. Milestone archival and future scope selection are separate next actions.

### Out of Scope

- Multi-product and organization hierarchies — v1 deliberately models one installed component as one product.
- Component-owned authentication or admin membership — identity and authorization remain responsibilities of the host application.
- A packaged, opaque design system — consumers should own copied UI source or build on the headless React layer.
- Independent roadmap records — the v1 roadmap is derived from feedback posts and their workflow statuses.
- Automatically generated changelog entries — v1 entries are written and published intentionally by administrators.
- A shared or unauthenticated admin sandbox — mutable demo data remains isolated per locally signed-in user. The anonymous Convex development backend is credential-free infrastructure, not anonymous application authority.
- npm-registry distribution — v1 is distributed as tagged source plus static registry/documentation; the installable tarball is built and verified locally from that source.

AI duplicate detection, sentiment analysis, named third-party integrations, imports, and analytics remain later capabilities rather than v1 requirements.

## Context

Afferent is inspired by Canny's core product-feedback workflow and by open-source alternatives including Quackback, ClearFlask, and Fider. These projects are design and implementation references, not compatibility targets.

Convex components package schemas, functions, and persistent state behind an isolated component boundary. The component cannot access the host application's `ctx.auth`; authentication must happen in app-level wrapper functions, which pass stable external identifiers and relevant authorization information into the component. That boundary is central to supporting Convex Auth, Clerk, and Better Auth consistently.

The component should provide a provider-neutral identity contract rather than provider-specific internal tables. Integrations should make the secure host-controlled path straightforward while allowing installation-wide policy to configure public versus authenticated access.

The React deliverable has two layers: headless behavior for teams that want full control, and polished shadcn-based source that teams copy into their applications. The source-owned UI must cover both the customer-facing board/roadmap/changelog experience and administrative workflows.

The repository itself is also the product showcase. Its Vite example must start locally with one documented command against an anonymous Convex development backend, remain browsable while signed out, and support hands-on admin evaluation only after local Convex Auth sign-in through isolated per-user sandboxes. Requiring evaluators to clone the repository and install the toolchain is an accepted v1 tradeoff; there is no canonical hosted demo URL.

## Constraints

- **Platform**: The backend must be authored and distributed as a Convex component — native data ownership and integration are the core product promise.
- **Authentication**: Convex Auth, Clerk, and the Convex Better Auth component must all have supported integration paths — Afferent cannot assume one provider's user schema.
- **Authorization**: The host application decides who is an admin — component APIs must preserve this boundary and must not silently create a parallel source of truth.
- **Tenancy**: One installation represents one product — multi-product organizations are deferred.
- **Access policy**: Visibility and authentication requirements are configured installation-wide — per-board overrides are not required in v1.
- **Frontend**: Consumer-facing libraries target React, while the local example uses Vite — core UI behavior should remain framework-light.
- **Customization**: UI source must be consumer-owned and restylable — headless APIs, a shadcn registry, and mirrored repository examples are required.
- **Demo safety**: Local admin experimentation must be isolated per authenticated user and resettable — users cannot mutate shared canonical showcase data. Anonymous Convex mode removes account credentials, not application authentication or authorization.
- **Local bootstrap**: The demo generates JWT/JWKS material ephemerally, never commits credentials or generated `.env.local`, reports actionable prerequisite/bootstrap failures, and tears down only processes it owns.
- **Quality**: v1 is a production-ready public source release rather than a prototype — typed boundaries, tests, documentation, local packaging, local real-Convex verification, and adopter deployment guidance are release requirements.
- **License**: Repository code and locally packed artifacts use Apache-2.0.

## Key Decisions

| Decision                                                                | Rationale                                                                                                                                                                  | Outcome                |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Build a Convex component rather than a hosted feedback service          | Keeps data and workflows natively inside the adopting application's Convex deployment                                                                                      | — Pending              |
| Optimize for Convex SaaS teams                                          | These teams benefit most from native data, auth, and UI integration                                                                                                        | — Pending              |
| Scope v1 to feedback core plus a status-driven roadmap                  | Delivers the central feedback lifecycle without beginning as a full enterprise Canny clone                                                                                 | — Pending              |
| Represent one product per installation                                  | Keeps tenancy and authorization simple for the first production-ready release                                                                                              | — Pending              |
| Use installation-wide access policy                                     | Provides useful configurability without introducing per-board policy complexity                                                                                            | — Pending              |
| Keep identity and admin authorization in the host app                   | Convex component isolation prevents direct `ctx.auth` access and provider-neutral wrappers support all target auth systems                                                 | — Pending              |
| Ship headless React plus copyable shadcn source                         | Gives consumers a fast polished start while preserving full styling and ownership                                                                                          | ✓ Validated in Phase 3 |
| Publish UI through both a shadcn registry and repository examples       | Supports convenient installation and transparent reference implementations                                                                                                 | ✓ Validated in Phase 3 |
| Keep the Vite React example local rather than publicly hosted           | Delivers a credential-free clone-and-run evaluator path without operating a public demo service; the accepted tradeoff is that evaluators install the repository toolchain | Locked 2026-07-30      |
| Keep npm-registry publication out of v1                                 | Ships source, registry, and documentation without claiming or publishing an npm package; local tarball gates preserve installability                                       | Locked 2026-08-07      |
| Use a Vite React app for the local example                              | Demonstrates a simple client-side integration without tying the component to a full-stack React framework                                                                  | ✓ Validated in Phase 4 |
| Use Convex Auth in the local example                                    | Keeps the canonical demo within the Convex ecosystem while other auth providers remain documented and tested integrations                                                  | ✓ Validated in Phase 4 |
| Provide private per-user demo sandboxes                                 | Enables safe hands-on admin evaluation without shared-state vandalism or browser-session cleanup complexity                                                                | ✓ Validated in Phase 4 |
| Publish under Apache-2.0                                                | Permits broad commercial use while providing an explicit patent grant                                                                                                      | ✓ Validated in Phase 4 |
| Keep roadmap grouping server-derived                                    | The fixed Planned, In Progress, and Complete projection must stay consistent across consumers                                                                              | ✓ Validated in Phase 2 |
| Keep changelog publication manual and editorial                         | Status changes should not silently create public release notes                                                                                                             | ✓ Validated in Phase 2 |
| Expose domain hooks with a closed state and error vocabulary            | Copied or custom UI can render every workflow without duplicating Convex access, auth gating, optimism, or pagination                                                      | ✓ Validated in Phase 2 |
| Deliver notifications through an in-app inbox plus a leased host outbox | Hosts receive vendor-neutral events while external side effects remain in their trusted server boundary                                                                    | ✓ Validated in Phase 2 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-09-10 after verified v0.1.0 publication_
