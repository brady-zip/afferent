# Phase 1: Secure Installable Feedback Board - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers a packed, Apache-2.0 Afferent Convex component that a clean Vite/Convex consumer can install, generate, typecheck, and build. The vertical slice includes provider-neutral host wrappers for Convex Auth, Clerk, and Better Auth; one installation-wide access policy; multiple boards; and secure public browse plus authenticated create, edit, withdraw, vote, comment, and one-level reply behavior. Public contracts use validated DTOs and opaque identifiers, and conformance fixtures prove that identity, admin permission, and internal scope are always derived by trusted host code.

This phase establishes the scope-complete schema and host-client capability needed by the later demo, but it does not implement the public sandbox's seed, reset, quota, expiry, or cleanup workflows.

</domain>

<decisions>
## Implementation Decisions

### Internal Scope Primitive
- **D-01:** Every persisted component row carries a non-optional, server-assigned `scopeId`. It is the leading equality field of every relevant database index and an equality filter field on every relevant search index. There is no null, global, wildcard, or cross-scope query mode.
- **D-02:** Normal one-product installations use a library-owned fixed scope injected automatically by the normal host client. Consumers never read, configure, or pass this value, and scope is not part of the normal public product API.
- **D-03:** A non-default host client may opt into a server-only `resolveScope(ctx)` callback. It runs on every operation and may derive scope only from verified server-side identity. This is a constrained sandbox escape hatch, not a supported multi-product tenancy model.
- **D-04:** The immutable showcase and mutable sandbox use separate statically installed component instances. The sandbox derives a fixed-length opaque scope from a one-way transformation of the verified external identity key rather than storing raw identity in `scopeId`.
- **D-05:** Failure is closed: an absent or unresolvable scope throws before data access. A cross-scope identifier is indistinguishable from a nonexistent identifier; direct-ID access must re-check scope after loading so it cannot become an existence oracle.
- **D-06:** Scope isolation is verified across every list, get, create, update, delete, vote, comment, search, count, seed, reset, scheduled cleanup, and reactive-read path. Acceptance includes a two-user adversarial matrix and a static audit that every table, index, and search definition is scope-complete.

### Actor Identity and Privacy
- **D-07:** Trusted host adapters compose an immutable, provider-namespaced, non-email, non-session `externalKey`. The component treats it as opaque, never parses it, and enforces uniqueness by `(scopeId, externalKey)`.
- **D-08:** Convex Auth adapters use its stable server-resolved user identifier; Clerk adapters use verified issuer plus subject; Better Auth adapters use the stable user identifier returned by a session-validating host lookup. Research and planning must confirm the current provider helper APIs before implementation.
- **D-09:** Actor storage is limited to internal `externalKey` plus optional `displayName` and `avatarUrl`. No email, provider token, raw provider record, or extra claims are stored in v1. Public actor DTOs expose only an opaque branded actor ID and the optional display fields.
- **D-10:** Actor rows are inserted or their display snapshot refreshed only during authenticated participation mutations using current host-verified facts. Display updates are last-write-wins; `externalKey` is immutable; reads never mutate actor state.
- **D-11:** Host-user erasure is an explicit host-invoked `anonymizeActor` intent operation because the isolated component cannot observe host deletions. It clears display PII, replaces `externalKey` with an irreversible tombstone, and retains the actor row, authored content, comments, and vote memberships so attribution history and totals remain coherent. Anonymized authors render with a generic non-identifying label; erasure never hard-deletes content.
- **D-12:** Re-registration after anonymization creates a new actor. Cross-provider account linking, actor merging, and automatic relinking after a provider or subject change are not v1 capabilities.

### Gap-Closure Verification Boundaries
- **D-13:** Phase 1 auth acceptance runs the actual Convex Auth, Clerk, and Better Auth fixture factories under `convex-test`, with provider-shaped verified-identity seams and independent fixture typechecks. Better Auth must install and execute its component-backed session-validating lookup. Live provider credentials and a live Convex deployment belong to Phase 4 and are not required for this closure.
- **D-14:** `configureInstallation` is additive and idempotent in Phase 1. Repeated slugs identify the same board and may update mutable display fields; omitted boards are preserved without deletion, archival, hiding, detachment, or data loss; a changed slug creates a new board. Board reconciliation, archival, and post moves remain Phase 2 administration work.
- **D-15:** Per-post vote and comment totals remain exact. Board/list-level post counting uses a stable bounded DTO `{ count, hasMore }`: read at most `cap + 1`, return `{ count: cap, hasMore: true }` above the cap, and never present a capped value as exact. Exact unbounded aggregate counting is deferred unless a later measured need justifies it.

### Planner Discretion
- Choose the exact names and types for the host-client factories, branded IDs, fixed default scope, one-way sandbox scope derivation, anonymization tombstones, generic anonymized-author label, and structured errors while preserving the invariants above.
- Choose how to organize provider adapter subpaths and conformance fixtures. Provider-specific records and helper types must remain outside component storage and public DTOs.
- The no-email actor snapshot and retention of anonymized votes/comments were delegated to the live Claude peer by the user. They are privacy- and history-preserving defaults; future additions must be explicit and additive.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and Phase Contract
- `.planning/PROJECT.md` — Product boundary, core value, host-owned authorization, one-product installation model, and public-release constraints.
- `.planning/REQUIREMENTS.md` — Phase 1 access, feedback participation, component/auth integration, packaging, testing, and license requirements.
- `.planning/ROADMAP.md` — Phase 1 goal, fixed boundary, dependency order, and success criteria.
- `AGENTS.md` — Repository-wide security non-negotiables, package-fixture gate, query bounds, and h5i workflow requirements.

### Architecture and Risk
- `.planning/research/SUMMARY.md` — Four-phase architecture synthesis and research gaps that Phase 1 must resolve.
- `.planning/research/ARCHITECTURE.md` — Host/component boundary, scope-first data model, provider-neutral actor flow, package surface, testing layers, and build order.
- `.planning/research/PITFALLS.md` — Forged identity/scope threats, provider-coupling traps, privacy/deletion concerns, scope-complete query requirements, and clean-consumer verification.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No product implementation exists yet. There are no component schemas, host wrappers, provider adapters, React bindings, or consumer fixtures to reuse.
- `package.json` supplies only the private repository package shell, Husky preparation, and inline commitlint configuration; it is not the future published component package contract.

### Established Patterns
- Conventional Commits are enforced by `.husky/commit-msg` and the inline commitlint configuration.
- Planning documents are currently the source of truth, so implementation must create the product structure from these locked boundaries rather than infer contracts from prototype code.

### Integration Points
- Planning must establish the component package, host-client/wrapper layer, three provider adapter fixtures, core schema/functions, and clean packed-consumer fixture from scratch.
- The fixed-scope normal client and opt-in server-only resolver must converge on the same narrow component operations so the demo cannot become a divergent implementation.

</code_context>

<specifics>
## Specific Ideas

- Keep `scopeId` distinct from `boardId`; installation-level policy, statuses, roadmap, changelog, actors, and maintenance all sit above boards.
- Use not-found-equivalent behavior for cross-scope identifiers to avoid revealing record existence.
- Preserve historical participation through anonymization while removing the linkable identity and display snapshot.

</specifics>

<deferred>
## Deferred Ideas

- Cross-provider account linking and actor merge — future identity-lifecycle work; v1 treats a new provider subject as a new actor.
- Email or other contact PII in component actor records — excluded from v1; notification delivery remains host-owned.
- Sandbox seed, reset, quota, expiry, and cleanup implementation — Phase 4; Phase 1 freezes only the scope-complete schema and resolver capability.
- Rate limiting, moderation state, and the safe-content contract — Phase 2 according to the roadmap.
- Board reconciliation, archival, and moving posts between boards — Phase 2 administration; Phase 1 configuration is additive and non-destructive per D-14.
- Exact unbounded board/list aggregate counts — defer until measured scale requires an aggregate-counter design; Phase 1 exposes the honest bounded shape in D-15.

</deferred>

---

*Phase: 1-Secure Installable Feedback Board*
*Context gathered: 2026-07-15*
