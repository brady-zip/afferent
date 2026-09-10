# Phase 1 Source Coverage Audit

Every in-scope item from the roadmap goal, Phase 1 requirement list, current research, and locked context has an executable plan. Deferred items remain excluded.

## Goal and Requirements

| Source | ID | Feature / requirement | Plan | Status |
|---|---|---|---|---|
| GOAL | — | Packed Afferent integration plus secure multi-board feedback through Convex Auth, Clerk, or Better Auth | 01-02 through 01-05 | COVERED |
| REQ | ACCS-01 | Installation-wide public/authenticated read policy | 01-02, 01-03 | COVERED |
| REQ | ACCS-02 | Host-authenticated participation only | 01-02 through 01-05 | COVERED |
| REQ | ACCS-03 | Verified provider identity maps to provider-neutral actor | 01-02 through 01-05 | COVERED |
| REQ | ACCS-04 | Host-owned admin permission | 01-03, 01-05 | COVERED |
| REQ | ACCS-05 | Missing actor/permission rejection | 01-03 through 01-05 | COVERED |
| REQ | ACCS-06 | One-product normal installation with multiple boards | 01-02, 01-03 | COVERED |
| REQ | FDBK-01 | Browse permitted posts on every board | 01-02, 01-03 | COVERED |
| REQ | FDBK-02 | Authenticated post creation | 01-02, 01-03 | COVERED |
| REQ | FDBK-03 | Author edit | 01-03 | COVERED |
| REQ | FDBK-04 | History-preserving author withdrawal | 01-03 | COVERED |
| REQ | FDBK-05 | One idempotent vote membership | 01-04 | COVERED |
| REQ | FDBK-06 | Flat comment | 01-04 | COVERED |
| REQ | FDBK-07 | One-parent reply without nesting | 01-04 | COVERED |
| REQ | FDBK-08 | Stable attribution, totals, status, board, and tags | 01-02 through 01-04 | COVERED |
| REQ | COMP-02 | Typed read/participation/admin wrapper groups | 01-02 through 01-05 | COVERED |
| REQ | COMP-03 | Provider-neutral DTOs and opaque IDs | 01-02 through 01-05 | COVERED |
| REQ | COMP-04 | Convex Auth fixture | 01-05 | COVERED |
| REQ | COMP-05 | Clerk fixture | 01-05 | COVERED |
| REQ | COMP-06 | Better Auth fixture | 01-05 | COVERED |
| REQ | COMP-07 | Server-derived identity/admin/scope | 01-02 through 01-05 | COVERED |
| REQ | QUAL-02 | Three-provider auth conformance | 01-05 | COVERED |
| REQ | QUAL-03 | Packed clean-consumer codegen/typecheck/build | 01-01, 01-02, 01-05 | COVERED |
| REQ | QUAL-10 | Apache-2.0 repository and package license | 01-01, 01-02, 01-05 | COVERED |

## Research Constraints and Recommendations

| Source | Feature / constraint | Plan | Status | Notes |
|---|---|---|---|---|
| RESEARCH | Official component definition, component-local codegen, generated `ComponentApi`, and build ordering | 01-02, 01-05 | COVERED | Final artifact gate repeats the complete order. |
| RESEARCH | Parent-app auth boundary; component never accesses host `ctx.auth` | 01-02, 01-05 | COVERED | Shared conformance spies verify component is not called on failure. |
| RESEARCH | Component-compatible paginator and full cursor metadata | 01-03 | COVERED | Includes current real-backend spike. |
| RESEARCH | Scope-first bounded queries and direct-ID not-found equivalence | 01-03, 01-04 | COVERED | Static plus runtime two-user matrix. |
| RESEARCH | Fixed normal client plus opt-in server-only resolver client | 01-02, 01-03 | COVERED | Same capability surface and component intents. |
| RESEARCH | Provider-specific verified extraction with provider-neutral actor facts | 01-05 | COVERED | Exact current helpers for all three fixtures. |
| RESEARCH | Membership-as-truth desired-state voting | 01-04 | COVERED | Retry, concurrency, rollback, and reconciliation cases. |
| RESEARCH | Flat comments with one root-parent edge | 01-04 | COVERED | Cross-post, cross-scope, and reply-to-reply rejection. |
| RESEARCH | Explicit versioned DTO mapping with opaque branded strings | 01-02, 01-03 | COVERED | Structural privacy/export tests. |
| RESEARCH | Clean packed-artifact external consumer gate | 01-01, 01-02, 01-05 | COVERED | Includes `publint`, ATTW, license, declarations, codegen, typecheck, and build. |
| RESEARCH | Package legitimacy gate for all SUS dependencies | 01-01 | COVERED | Blocking-human pre-install checkpoint. |
| RESEARCH | Static schema/API audit and auth forgery matrix | 01-03, 01-05 | COVERED | Covers new schema definitions and every provider. |
| RESEARCH | Actor refresh, explicit anonymization, retained history, and new actor on re-registration | 01-03, 01-04 | COVERED | No automatic linking/merge. |
| RESEARCH | Real Convex proof in addition to `convex-test` | 01-03, 01-05 | COVERED | Backend pagination gate is mandatory. |
| RESEARCH | Search remains outside Phase 1 while future definitions must be scope-filtered | 01-03 | COVERED | Static audit freezes the rule; no search API is added. |

## Locked Context Decisions

| Source | ID | Decision | Plan | Status |
|---|---|---|---|---|
| CONTEXT | D-01 | Mandatory scope on every row and leading/filter field on indexes/search | 01-02, 01-03 | COVERED |
| CONTEXT | D-02 | Private fixed scope for normal clients | 01-02, 01-03 | COVERED |
| CONTEXT | D-03 | Server-only per-operation `resolveScope(ctx)` escape hatch | 01-03 | COVERED |
| CONTEXT | D-04 | Separate showcase/sandbox instances and one-way identity-derived sandbox scope | 01-03 | COVERED | Phase 1 freezes resolver/derivation; Phase 4 assembles instances. |
| CONTEXT | D-05 | Fail closed and normalize cross-scope to not-found | 01-02 through 01-04 | COVERED |
| CONTEXT | D-06 | Static scope audit plus runtime adversarial coverage | 01-03 through 01-05 | COVERED | Runtime covers every operation implemented in Phase 1. |
| CONTEXT | D-07 | Immutable provider-namespaced non-email external key | 01-02, 01-03, 01-05 | COVERED |
| CONTEXT | D-08 | Current trusted helper semantics for all providers | 01-05 | COVERED |
| CONTEXT | D-09 | Minimal actor storage and public snapshot | 01-02 through 01-05 | COVERED |
| CONTEXT | D-10 | Participation-only actor refresh; reads never mutate | 01-03 through 01-05 | COVERED |
| CONTEXT | D-11 | Explicit host anonymization with tombstone and retained history | 01-04 | COVERED |
| CONTEXT | D-12 | Re-registration creates a new actor; no linking/merge | 01-04, 01-05 | COVERED |

## Confirmed Exclusions

These are not gaps: cross-provider linking/actor merge, component email/contact storage, relevance search, moderation/rate limiting/safe-content workflows, sandbox seed/reset/quota/expiry/cleanup implementation, roadmap, changelog, notifications, headless React, copied shadcn UI, and hosted deployment. Their assigned later phases remain unchanged.

**Audit result:** all Phase 1 source items are covered; no unplanned item requires a phase split or deferral decision.
