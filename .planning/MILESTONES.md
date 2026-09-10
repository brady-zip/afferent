# Project Milestones: Afferent

## v1.0 — Initial product delivery (Shipped: 2026-09-10)

**Product release:** [v0.1.0](https://github.com/brady-zip/afferent/releases/tag/v0.1.0), immutable source commit `279d6e47558612476752d81a2a4a844230d7a306`.

**Identity mapping:** GSD milestone v1.0 is the planning label for product release v0.1.0. This closeout does not create a product v1.0 tag or change the existing release tag.

**Closeout:** verified_closeout; 82/82 active requirements, 7/7 phases, 51/51 plans. No verification overrides. COMP-01 was removed; DEMO-01 was superseded by completed DEMO-08.

**Delivered:** A reusable Convex feedback backend, headless React contracts, source-owned public/admin UI, and a credential-free local example, published as Apache-2.0 tagged source with matching public registry and documentation.

### Key Accomplishments

- Provider-neutral host authorization for Convex Auth, Clerk and Better Auth, with narrow component operations and clean packed installation.
- Complete feedback participation, indexed discovery, moderation and duplicate merging, status-derived roadmap, and manually published linked changelog.
- Typed headless React contracts with server-derived viewer capabilities, safe notification navigation, and complete admin projections.
- Copy-owned public/admin interfaces distributed through a deterministic shadcn registry and mirrored source, with documented accessibility and responsive verification.
- Separate immutable showcase and authenticated private sandboxes, bounded seed/reset/quota/expiry/cleanup, and real Convex isolation and lifecycle evidence.
- Protected immutable source/static publication, checksum-verified public assets, all-feature public registry installation, and exact-tag local package/demo acceptance.

### Evidence and Statistics

- Seven phases; 51 completion summaries; 149 task elements across executable plans. The generic archive tool's 136-task prose estimate omitted tasks and is superseded by this direct plan count.
- Product source baseline: first component commit `977b34a` (2026-07-15) through public release `279d6e47` (2026-09-10).
- 262 tracked JavaScript/TypeScript files and 61,333 physical lines in src, ui, example, scripts, tests and fixtures at the pre-archive audit snapshot. This excludes optional agent tooling and is not a production-only LOC metric.
- [Full roadmap](milestones/v1.0-ROADMAP.md), [requirements](milestones/v1.0-REQUIREMENTS.md), [milestone audit](milestones/v1.0-MILESTONE-AUDIT.md), [phase archive](milestones/v1.0-phases/), and [release evidence](../docs/releases/0.1.0.md).
- Release CI `34457806781`, protected Pages publication `34460472107`, and follow-up source CI `34489832736` passed. Public installs and exact-tag real Convex verification are documented in the release evidence.

### Nonblocking Maintenance Backlog

Preserve the original final release review severities: **one warning and five informational findings**, approved by the live Claude peer at 92/100. No item is an unmet current requirement.

| Priority | Follow-up                                                                    | Evidence      |
| -------- | ---------------------------------------------------------------------------- | ------------- |
| Warning  | Include canonical/mirrored UI README identities in the release URL validator | Phase 4 WR-01 |
| Info     | Reject prefixed unresolved release placeholders                              | Phase 4 IN-03 |
| Info     | Revalidate pinned shadcn overwrite-prompt semantics during upgrades          | Phase 4 IN-02 |
| Info     | Make optional GSD harness includes portable                                  | Phase 4 IN-01 |
| Info     | Keep registry mapping beside copied installation commands                    | Phase 4 IN-04 |
| Info     | Discover bootstrap validation coverage from npm-using jobs                   | Phase 4 IN-05 |

The phase review also retains historical validation limitations. Its preserved report is [04-REVIEW.md](milestones/v1.0-phases/04-hosted-production-release/04-REVIEW.md).

The closure review and clean archived-checkout validation are recorded in [v1.0-CLOSEOUT.md](milestones/v1.0-CLOSEOUT.md), including the optional future diagnostic for starting a new contract before fully archiving the prior plan.

**Next:** Choose the next milestone's goals. Existing v2 ideas remain in the archived requirements; none becomes active automatically.
