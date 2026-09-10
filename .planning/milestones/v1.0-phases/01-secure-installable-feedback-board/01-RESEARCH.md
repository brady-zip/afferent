# Phase 1: Secure Installable Feedback Board - Research

**Researched:** 2026-07-15
**Domain:** Convex component packaging, host-owned auth integration, scope-complete feedback storage, and artifact-level verification
**Confidence:** MEDIUM-HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### the agent's Discretion
- Choose the exact names and types for the host-client factories, branded IDs, fixed default scope, one-way sandbox scope derivation, anonymization tombstones, generic anonymized-author label, and structured errors while preserving the invariants above.
- Choose how to organize provider adapter subpaths and conformance fixtures. Provider-specific records and helper types must remain outside component storage and public DTOs.
- The no-email actor snapshot and retention of anonymized votes/comments were delegated to the live Claude peer by the user. They are privacy- and history-preserving defaults; future additions must be explicit and additive.

### Deferred Ideas (OUT OF SCOPE)
- Cross-provider account linking and actor merge — future identity-lifecycle work; v1 treats a new provider subject as a new actor.
- Email or other contact PII in component actor records — excluded from v1; notification delivery remains host-owned.
- Sandbox seed, reset, quota, expiry, and cleanup implementation — Phase 4; Phase 1 freezes only the scope-complete schema and resolver capability.
- Rate limiting, moderation state, and the safe-content contract — Phase 2 according to the roadmap.
</user_constraints>

<phase_requirements>
## Phase Requirements

The requirement text below is copied from `.planning/REQUIREMENTS.md`; the final column states the planning consequence. [VERIFIED: project source]

| ID | Description | Research Support |
|----|-------------|------------------|
| ACCS-01 | One installation-wide read policy can make content public or authenticated-only. | Store policy per mandatory scope; public wrappers resolve scope before the component evaluates policy. |
| ACCS-02 | Only host-authenticated users can create posts, vote, or comment. | Participation wrappers require a provider adapter result; component mutations require trusted actor facts. |
| ACCS-03 | A verified provider identity maps to a provider-neutral actor. | Use provider-namespaced `externalKey` and `(scopeId, externalKey)` lookup. |
| ACCS-04 | The host decides admin permission. | Require an independent server-side `authorizeAdmin(ctx)` callback on every admin wrapper. |
| ACCS-05 | Missing verified actor or permission is rejected. | Negative conformance tests cover null auth, omitted callbacks, forged args, and denied admin. |
| ACCS-06 | One normal installation represents one product with multiple boards. | Hide the fixed default scope; expose dynamic resolution only through a non-default server-only factory. |
| FDBK-01 | Visitors can browse posts on every permitted board. | Use bounded scope-first board and post indexes with component-compatible cursor pagination. |
| FDBK-02 | An authenticated user can create a feedback post. | Narrow `createPost` intent mutation upserts the verified actor snapshot and writes in one scope. |
| FDBK-03 | An authenticated author can edit their own post. | Load by ID, re-check scope, compare actor ID, then apply a validated field-specific edit. |
| FDBK-04 | An authenticated author can withdraw without destroying history. | Model withdrawal as state, not deletion; preserve row, author, votes, comments, and totals. |
| FDBK-05 | One idempotent vote membership per actor/post. | Prefer `setVote(desired: boolean)`; exact membership lookup and counter update share one mutation. |
| FDBK-06 | Authenticated users can add flat comments. | Comments are separate rows with bounded post index pagination. |
| FDBK-07 | A reply references one comment without unbounded nesting. | Store optional `parentCommentId`; validate same scope/post and reject a parent that itself has a parent. |
| FDBK-08 | Visible posts expose stable attribution, totals, status, board, and tags. | Map private documents to versioned DTOs with opaque branded strings and public actor snapshots only. |
| COMP-02 | Developers can mount typed read, participation, and admin wrappers. | Publish a host-client factory that emits three explicit wrapper groups over a supplied `ComponentApi`. |
| COMP-03 | Contracts use provider-neutral DTOs and opaque strings. | Export validators/types; never export `Doc`, provider types, raw `Id`, scope, or component records. |
| COMP-04 | Convex Auth path is documented and fixture-verified. | Current server helper is `getAuthUserId(ctx)` from `@convex-dev/auth/server`. |
| COMP-05 | Clerk path is documented and fixture-verified. | Current host path is `ctx.auth.getUserIdentity()`; key from guaranteed `issuer` + `subject`. |
| COMP-06 | Better Auth component path is documented and fixture-verified. | Current session-validating path is `authComponent.getAuthUser(ctx)` in host code. |
| COMP-07 | Identity, admin permission, and demo scope are derived in trusted host functions. | Browser-facing validators intentionally omit `userId`, `isAdmin`, `scopeId`, actor, and provider records. |
| QUAL-02 | All three auth fixtures behave equivalently. | Run one adapter conformance suite against provider-specific harnesses and the same forgery matrix. |
| QUAL-03 | A clean consumer installs the packed artifact, runs codegen, typechecks, and builds. | Make `npm pack` output the sole package input to a generated-outside-repo Vite/Convex fixture. |
| QUAL-10 | Repository and package include Apache-2.0. | Include root `LICENSE`; assert tarball metadata and contents contain it. |
</phase_requirements>

## Summary

Build Phase 1 around two proofs rather than around folder scaffolding: a secure end-to-end feedback slice and a consumer-artifact gate. The official Convex component contract still requires a `defineComponent` definition, component-local codegen, an exported `convex.config.js` and `_generated/component.js`, parent-app wrappers, and build ordering of component codegen → package build → consumer codegen. Component functions still cannot access host `ctx.auth`, IDs still become strings at the boundary, and args/returns still receive runtime validation. [CITED: https://docs.convex.dev/components/authoring]

The three provider paths can converge without a universal provider model. Convex Auth currently provides `getAuthUserId(ctx)`; Clerk identity is available in the host through `ctx.auth.getUserIdentity()` with guaranteed `issuer` and `subject`; Convex Better Auth currently provides the session-validating `authComponent.getAuthUser(ctx)`. Each adapter should emit only `{ externalKey, displayName?, avatarUrl? }`; a separate host callback decides admin permission. [CITED: https://labs.convex.dev/auth/authz] [CITED: https://docs.convex.dev/auth/functions-auth] [CITED: https://labs.convex.dev/better-auth/basic-usage/authorization]

For Phase 1 browsing, define a scope-first cursor contract over ordinary database indexes and prove it on a real backend. Component pagination is a special case: official Convex guidance says built-in component `.paginate()` is not supported and recommends `paginator` plus `usePaginatedQuery` from `convex-helpers`. Full-text relevance search is a different query mode and remains Phase 2; Phase 1 should only freeze the rule that every future search index includes `scopeId` as an equality filter field. [CITED: https://docs.convex.dev/components/authoring] [CITED: https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/README.md] [CITED: https://docs.convex.dev/search/text-search]

**Primary recommendation:** plan four executable waves: package/component skeleton and clean tarball gate; scope/DTO/index contract plus pagination spike; provider-neutral wrappers and three conformance fixtures; feedback mutations with invariant, forgery, two-scope, and artifact verification. [VERIFIED: synthesis of cited official sources and locked project decisions]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Browser-visible function args | Browser / Client | API / Backend | Client supplies only intent data, IDs, filters, and cursors; authority fields are absent. [VERIFIED: project constraint] |
| Identity and session verification | Host Convex app / API | Auth provider | The host has `ctx.auth` or provider helpers; the isolated component does not. [CITED: https://docs.convex.dev/components/authoring] |
| Admin authorization | Host Convex app / API | Host-owned tables | Permission remains a host decision evaluated on every admin call. [VERIFIED: CONTEXT D-08 and ACCS-04] |
| Scope resolution | Host Convex app / API | Component guard | The host selects fixed/default or identity-derived scope; the component rejects missing or mismatched scope before access. [VERIFIED: CONTEXT D-01–D-06] |
| Feedback invariants | Afferent component / API | Component database | Ownership, withdrawal, voting, reply shape, counts, and access policy are component-owned. [VERIFIED: PROJECT.md and REQUIREMENTS.md] |
| Persistence and indexes | Component database | Afferent component / API | Every row and query path is scope-complete and bounded. [VERIFIED: CONTEXT D-01 and D-06] |
| Public DTO mapping | Afferent component / API | Host wrapper | Private documents are converted to validated versioned DTOs before browser exposure. [CITED: https://docs.convex.dev/components/authoring] |
| Package install verification | Build / CI | Clean consumer fixture | The test must resolve only files present in the packed tarball. [VERIFIED: AGENTS.md release criterion] |

## Project Constraints (from AGENTS.md)

- The component cannot access host `ctx.auth`; host wrappers derive verified identity, admin permission, and any demo scope on every call. [VERIFIED: AGENTS.md]
- Browser arguments must never contain trusted `userId`, `isAdmin`, or `scopeId`. [VERIFIED: AGENTS.md]
- Component APIs are narrow intent operations with validators and stable versioned DTOs, never generic CRUD, raw documents, or provider records. [VERIFIED: AGENTS.md]
- One normal installation models one product; the demo-only scope path remains server-only and every table/index/search/seed/reset path is scope-complete. [VERIFIED: AGENTS.md]
- Installation must be proven from a packed tarball in a clean Vite/Convex fixture without repository-relative imports. [VERIFIED: AGENTS.md]
- Bounded indexed queries, idempotent votes, and accessible UI are release criteria. Phase 1 implements the backend/query criteria; copied UI accessibility remains later work. [VERIFIED: AGENTS.md and ROADMAP.md]
- Commits use Conventional Commits and, when made, `h5i capture commit --agent codex`; work sessions use `h5i recall context`, `h5i hook codex sync`, and `h5i hook codex finish`. [VERIFIED: AGENTS.md]

## Standard Stack

Use the official component-template shape with current compatible package versions, but pin the implementation matrix rather than blindly following every registry `latest` tag. The registry was checked on 2026-07-15. [CITED: https://github.com/get-convex/templates/blob/main/template-component/package.json] [CITED: npm registry metadata]

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `convex` | `1.42.2` | Component runtime, schema, codegen, generated APIs | Current registry release; official component authoring and template define the project shape. **WARNING:** legitimacy seam returned SUS only because the release is recent; planner must recheck before install. [CITED: https://docs.convex.dev/components/authoring] |
| `convex-helpers` | `0.1.120` | Component-compatible `paginator` and matching React pagination hook | Explicitly recommended by official component docs. **WARNING:** legitimacy seam returned SUS because the release is recent. [CITED: https://docs.convex.dev/components/authoring] |
| TypeScript | `6.0.3` | Strict ESM source and declaration emission | Current official component template pins TS 6; `convex-helpers@0.1.120` peers TS 5.5 or 6, while registry `latest` is TS 7.0.2. Do not select TS 7 for this phase. **WARNING:** legitimacy seam returned SUS because the package was recently modified. [CITED: https://github.com/get-convex/templates/blob/main/template-component/package.json] |
| React / React DOM | `19.2.7` fixture; peer `^18.3.1 || ^19.0.0` | Clean Vite consumer and future headless compatibility | The official template uses broad React peers and a React 19 example. [CITED: https://github.com/get-convex/templates/blob/main/template-component/package.json] |
| Vite / React plugin | `8.1.4` / `6.0.3` | Clean consumer production build | Current registry versions compatible with the existing Node 22.22 runtime; both were checked in npm. **WARNING:** legitimacy seam returned SUS because the releases are recent. [CITED: npm registry metadata] |

### Testing and Artifact Validation

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `4.1.10` | Model, component, adapter, static-audit tests | Fast per-task suite. **WARNING:** legitimacy seam returned SUS because the release is recent. [CITED: https://github.com/get-convex/templates/blob/main/template-component/package.json] |
| `convex-test` | `0.0.54` | Mock-backed component invariant tests | Most domain and wrapper tests; never the only gate. **WARNING:** legitimacy seam returned SUS because the release is recent. [CITED: https://docs.convex.dev/testing/convex-test] |
| `@edge-runtime/vm` | `5.0.0` | `convex-test` runtime | Test-only dependency used by the official template. [VERIFIED: npm registry] |
| `publint` | `0.3.21` | Export-map and package-shape lint | Run against the packed artifact before fixture installation. [VERIFIED: npm registry] |
| `@arethetypeswrong/cli` | `0.18.5` | Declaration/export resolution checks | Run on the tarball. **WARNING:** legitimacy seam returned SUS because the release is recent. [CITED: npm registry metadata] |

### Provider Fixture Dependencies

| Provider fixture | Versions | Trusted server extraction |
|------------------|----------|---------------------------|
| Convex Auth | `@convex-dev/auth@0.0.94`, `@auth/core@0.41.2` | `getAuthUserId(ctx)`; use the compatible `0.41.2` even though npm's `latest` dist-tag for `@auth/core` is `0.34.3`. [CITED: https://labs.convex.dev/auth/authz] |
| Clerk | `@clerk/react@6.12.4` | `ctx.auth.getUserIdentity()`, key from guaranteed `issuer` + `subject`. **WARNING:** legitimacy seam returned SUS because the release was published on the research date. [CITED: https://docs.convex.dev/auth/clerk] |
| Convex Better Auth | `@convex-dev/better-auth@0.12.5`, `better-auth@1.6.23` | `authComponent.getAuthUser(ctx)` for session-validating lookup. **WARNING:** legitimacy seam returned SUS because both releases are recent. [CITED: https://labs.convex.dev/better-auth/basic-usage/authorization] |

**Installation shape:** [CITED: official docs and npm registry metadata]

```bash
npm install convex@1.42.2 convex-helpers@0.1.120 react@19.2.7 react-dom@19.2.7
npm install -D typescript@6.0.3 vite@8.1.4 @vitejs/plugin-react@6.0.3 \
  vitest@4.1.10 convex-test@0.0.54 @edge-runtime/vm@5.0.0 \
  publint@0.3.21 @arethetypeswrong/cli@0.18.5
```

Provider packages belong in isolated fixtures/dev dependencies, not Afferent's component runtime or mandatory peers. [VERIFIED: locked provider-neutral boundary]

## Package Legitimacy Audit

The package names below were confirmed from official documentation or official repositories and checked with the installed package-legitimacy seam plus `npm view`. The seam marks a package SUS when its latest release is very recent even when provenance and download volume are strong; the protocol still requires a planning checkpoint before installing every SUS package. [CITED: npm registry metadata]

| Package | Registry snapshot | Weekly downloads | Source repo | Verdict | Disposition |
|---------|-------------------|------------------|-------------|---------|-------------|
| `convex` | latest `1.42.2`, modified 2026-07-14 | 1,284,230 | `get-convex/convex-backend` | SUS: too-new | Keep; consolidated version checkpoint |
| `convex-helpers` | `0.1.120`, modified 2026-06-23 | 478,754 | `get-convex/convex-helpers` | SUS: too-new | Keep; checkpoint |
| `convex-test` | `0.0.54`, modified 2026-06-27 | 438,166 | `get-convex/convex-test` | SUS: too-new | Keep; checkpoint |
| `@edge-runtime/vm` | `5.0.0`, modified 2024-12-02 | 3,946,116 | `vercel/edge-runtime` | OK | Approved |
| `typescript` | latest `7.0.2`; use template-pinned `6.0.3` | 214,401,040 | `microsoft/TypeScript` | SUS: too-new | Keep TS 6; checkpoint |
| `vite` | `8.1.4`, modified 2026-07-09 | 117,240,518 | `vitejs/vite` | SUS: too-new | Keep; checkpoint |
| `@vitejs/plugin-react` | `6.0.3`, modified 2026-06-23 | 55,251,023 | `vitejs/vite-plugin-react` | SUS: too-new | Keep; checkpoint |
| `react` / `react-dom` | `19.2.7`, modified 2026-07-15 | 144,886,784 / 112,894,778 | `facebook/react` | OK / OK | Approved |
| `vitest` | `4.1.10`, modified 2026-07-06 | 72,684,625 | `vitest-dev/vitest` | SUS: too-new | Keep; checkpoint |
| `@convex-dev/auth` | `0.0.94`, modified 2026-06-09 | 175,924 | `get-convex/convex-auth` | OK | Approved fixture-only |
| `@auth/core` | compatible `0.41.2`, published 2026-04-14 | 3,444,732 | `nextauthjs/next-auth` | OK | Approved fixture-only |
| `@clerk/react` | `6.12.4`, modified 2026-07-15 | 1,254,015 | `clerk/javascript` | SUS: too-new | Keep fixture-only; checkpoint |
| `@convex-dev/better-auth` | `0.12.5`, modified 2026-06-27 | 125,251 | `get-convex/better-auth` | SUS: too-new | Keep fixture-only; checkpoint |
| `better-auth` | `1.6.23`, modified 2026-07-02 | 4,302,247 | `better-auth/better-auth` | SUS: too-new | Keep fixture-only; checkpoint |
| `publint` | `0.3.21`, modified 2026-05-13 | 652,015 | `publint/publint` | OK | Approved |
| `@arethetypeswrong/cli` | `0.18.5`, modified 2026-07-09 | 419,555 | `arethetypeswrong/arethetypeswrong.github.io` | SUS: too-new | Keep; checkpoint |

No inspected package exposes an npm `postinstall` script. [CITED: npm registry metadata]

**Packages removed due to SLOP verdict:** none. [VERIFIED: package-legitimacy seam]

**Packages flagged SUS:** `convex`, `convex-helpers`, `convex-test`, `typescript`, `vite`, `@vitejs/plugin-react`, `vitest`, `@clerk/react`, `@convex-dev/better-auth`, `better-auth`, and `@arethetypeswrong/cli`. The planner should create one explicit pre-install checkpoint that reruns the legitimacy command, checks official repositories, locks the reviewed versions, and records that every warning is only `too-new`; if any reason changes, stop before install. [VERIFIED: package-legitimacy seam]

## Architecture Patterns

### System Architecture Diagram

```text
Browser (untrusted)
  ├─ public args: board/post/comment IDs, text, desired vote state, cursor
  └─ NEVER: externalKey, userId, isAdmin, scopeId, provider record
          │
          ▼
Host Convex wrappers (security boundary)
  ├─ resolveScope(ctx) ── failure => throw before component call
  ├─ resolveActor(ctx) ── provider-specific, server-only
  ├─ authorizeAdmin(ctx) ── independent host-owned decision
  └─ select narrow component intent
          │ trusted minimal facts + validated intent
          ▼
Afferent component (isolated domain boundary)
  ├─ re-check scope and access policy
  ├─ map external actor to (scopeId, externalKey)
  ├─ enforce ownership/vote/reply invariants transactionally
  ├─ query scope-first indexes with bounded cursors
  └─ return versioned DTOs with opaque branded string IDs
          │
          ▼
Component tables (every row has non-optional scopeId)
```

This flow follows the official parent-wrapper model and the locked defense-in-depth decisions. [CITED: https://docs.convex.dev/components/authoring] [VERIFIED: CONTEXT D-01–D-12]

### Recommended Project Structure

```text
src/
├── component/
│   ├── _generated/              # generated component API/data model
│   ├── convex.config.ts         # defineComponent("afferent")
│   ├── schema.ts                # scope-complete tables/indexes
│   ├── validators.ts            # versioned DTO and input validators
│   ├── model/                   # ownership, scope, vote, comment invariants
│   ├── public/                  # bounded board/post/comment reads
│   ├── participation/           # create/edit/withdraw/vote/comment intents
│   └── admin/                   # anonymize intent; later admin surface grows
├── client/
│   ├── index.ts                 # normal fixed-scope host factory
│   ├── server.ts                # non-default resolveScope factory
│   ├── contracts.ts             # provider-neutral actor/admin contracts
│   └── adapters/                # optional adapter recipes or subpaths
└── test.ts                      # convex-test component registration
fixtures/
├── packed-vite-convex/          # materialized outside repo during tests
├── auth-convex-auth/
├── auth-clerk/
└── auth-better-auth/
tests/
├── model/
├── component/
├── conformance/
├── integration/
└── static/
```

The single-root package and explicit exports mirror the official template while keeping provider packages outside component source. [CITED: https://github.com/get-convex/templates/blob/main/template-component/package.json]

### Minimal Phase 1 Installation Configuration

The vertical slice needs a narrow authorized configuration path even though broad administration is Phase 2. Provide an idempotent `configureInstallation`-style intent that writes the installation-wide read policy and a bounded set of boards inside the resolved scope; it must run behind the host admin resolver and must not accept or return `scopeId`. This is configuration needed to exercise multiple boards, not generic board/settings CRUD. [VERIFIED: ACCS-01, ACCS-04, ACCS-06, and COMP-02]

New posts should receive the built-in `open` status server-side and public `PostSummaryV1` should already expose a stable status summary plus `tags: []`. Phase 2 can add the remaining built-in status transitions and tag persistence behind the same DTO fields without changing the Phase 1 response shape. [VERIFIED: FDBK-08 and Phase 2 ADMN-03–05]

### Pattern 1: Two Host Factories, One Intent Surface

**What:** export a normal factory whose scope is a private library constant and a clearly named server-only factory that requires `resolveScope(ctx)`. Both call exactly the same component operations. [VERIFIED: CONTEXT D-02 and D-03]

**When to use:** the normal factory for every consumer; the server-only factory only for the later sandbox fixture and adversarial tests. [VERIFIED: CONTEXT D-03 and D-04]

**Required guard sequence:** resolve scope → resolve actor/admin as required → call intent → component re-checks record scope/policy → return DTO. If scope cannot resolve, no database method may execute. [VERIFIED: CONTEXT D-05]

D-06 names future search, seed, reset, cleanup, and maintenance paths, but the phase boundary defers implementing those operations. Phase 1 should freeze reusable scope guards and a static audit that automatically covers every newly added table/index/search definition; Phase 4 must add the runtime matrix for seed/reset/quota/expiry/cleanup when those operations exist. Do not pull those workflows into Phase 1 merely to test them early. [VERIFIED: CONTEXT phase boundary, D-06, and deferred ideas]

### Pattern 2: Provider-Specific Extraction, Provider-Neutral Actor Input

**What:** each fixture implements the same adapter interface but uses its provider's current trusted helper. [CITED: official provider docs]

```typescript
type VerifiedActor = Readonly<{
  externalKey: string;
  displayName?: string;
  avatarUrl?: string;
}>;

// Convex Auth host fixture
const userId = await getAuthUserId(ctx);
if (!userId) throw unauthenticated();
return { externalKey: `convex-auth:${userId}` };

// Clerk host fixture
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw unauthenticated();
return {
  externalKey: `clerk:${identity.issuer}:${identity.subject}`,
  displayName: identity.name,
  avatarUrl: identity.pictureUrl,
};

// Better Auth host fixture
const user = await authComponent.getAuthUser(ctx);
if (!user) throw unauthenticated();
return {
  externalKey: `better-auth:${user.id}`,
  displayName: user.name,
  avatarUrl: user.image ?? undefined,
};
```

The component never parses these strings or imports these helper types. Admin authorization is a separate callback even if provider claims contain role-like data. [VERIFIED: CONTEXT D-07–D-10]

### Pattern 3: Scope-First Cursor Contract

**What:** paginate boards and posts through indexes whose first field is `scopeId`, then narrow by board and visible lifecycle state before ordering. Convex automatically uses `_creationTime` as the final index tie-breaker. [CITED: https://docs.convex.dev/database/reading-data/indexes/]

Recommended Phase 1 indexes: [VERIFIED: synthesis of locked scope rules and official index semantics]

| Table | Index | Fields | Retrieval |
|-------|-------|--------|-----------|
| `boards` | `by_scope_order` | `scopeId, sortOrder` | bounded `take` or paginator; archived state must be in the range or centralized visibility predicate |
| `posts` | `by_scope_board_state` | `scopeId, boardId, lifecycleState` | descending cursor pagination; no post-page filtering for security |
| `comments` | `by_scope_post` | `scopeId, postId` | ascending cursor pagination |
| `actors` | `by_scope_external_key` | `scopeId, externalKey` | `.unique()` lookup |
| `votes` | `by_scope_post_actor` | `scopeId, postId, actorId` | `.unique()` membership lookup |

Use the component-compatible paginator syntax, then map only `result.page` to DTOs while preserving all cursor/split metadata. [CITED: https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/README.md]

```typescript
import { paginationOptsValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import schema from "../schema.js";

const result = await paginator(ctx.db, schema)
  .query("posts")
  .withIndex("by_scope_board_state", (q) =>
    q.eq("scopeId", scopeId).eq("boardId", boardId).eq("lifecycleState", "active"),
  )
  .order("desc")
  .paginate(paginationOpts);

return { ...result, page: result.page.map(toPostSummaryV1) };
```

### Executable Pagination Spike

The plan should make this a blocking spike before freezing DTOs or host bindings: [VERIFIED: research recommendation]

1. Create two server-derived scopes with identical board slugs and 50 posts each, split across at least two boards; no browser-callable function accepts either scope. [VERIFIED: CONTEXT D-01–D-06]
2. Page active posts in batches of 10 using `paginator`; assert every page contains only the derived scope and requested board, and return metadata is passed through unchanged. [CITED: convex-helpers paginator docs]
3. Between page reads, insert a newer post, withdraw one loaded post, and edit another; assert the documented reactive behavior has no cross-scope rows or permanent holes/duplicates when using the matching `convex-helpers/react` hook. [CITED: https://docs.convex.dev/components/authoring]
4. Attempt a board ID and post ID from the other scope; both must return the same not-found-shaped error as a random nonexistent opaque ID. [VERIFIED: CONTEXT D-05]
5. Run the same suite against the fixed normal client and the server-only resolver client. [VERIFIED: CONTEXT D-02 and D-03]
6. Run once under `convex-test` for speed and once against a current local/preview Convex backend because the mock does not enforce production limits or all runtime behavior. [CITED: https://docs.convex.dev/testing/convex-test] [CITED: https://docs.convex.dev/testing/convex-backend]

**Search boundary:** do not create a relevance-search API in Phase 1. Phase 2 will define a search index with one search field, `scopeId` plus visibility dimensions as equality filter fields, relevance-only ordering, and its own pagination proof. Phase 1's static schema audit must fail any future search index that omits `scopeId`. [CITED: https://docs.convex.dev/search/text-search] [VERIFIED: CONTEXT D-01]

### Pattern 4: Membership-as-Truth Idempotent Voting

Prefer `setVote({ postId, desired: boolean })` over an ambiguous toggle. Within one component mutation: resolve actor, load post and re-check scope/visibility, query exact `(scopeId, postId, actorId)` membership, insert/delete only when state differs, and adjust `voteCount` only when membership changes. [VERIFIED: FDBK-05 and project invariant]

Required cases: repeated `true`, repeated `false`, concurrent `true`, mixed `true/false`, cross-scope post ID, withdrawn post, transaction failure rollback, and reconciliation of stored count against membership rows. [VERIFIED: derived test matrix]

### Pattern 5: Flat Comments with One Parent Reference

Store comments as rows, not nested arrays. A reply has optional `parentCommentId`; the mutation loads the parent, requires the same scope and post, and rejects a parent whose own `parentCommentId` is present. DTOs expose the parent as an opaque comment ID and never recursively embed child DTOs. [VERIFIED: FDBK-06, FDBK-07, and locked flat-discussion boundary]

### Pattern 6: Versioned Opaque DTOs

Every component function declares `args` and `returns`. Public types use branded strings at compile time and `v.string()` at the cross-component boundary, map private documents explicitly, and carry a stable contract discriminator such as `apiVersion: "v1"` at top-level responses. [CITED: https://docs.convex.dev/components/authoring]

Static tests should forbid exports/imports containing `Doc<`, `Id<`, provider package types, `_generated/dataModel`, `_generated/api`, `scopeId`, `externalKey`, email, token, or raw internal timestamps unless intentionally mapped. [VERIFIED: project contract]

### Pattern 7: Clean Packed-Artifact Consumer Gate

The official template self-resolves package exports from one root manifest; Afferent's release criterion is stricter and must install the produced tarball into a directory outside the repository. [CITED: https://docs.convex.dev/components/authoring] [VERIFIED: AGENTS.md]

Executable gate: [VERIFIED: research recommendation]

```text
npm run build:codegen
  → npm run build
  → npm pack --json --pack-destination <temp>
  → inspect tarball contains LICENSE, dist, component config, generated ComponentApi, declarations
  → create/copy clean Vite + Convex fixture outside repo
  → npm install <absolute-tarball-path>
  → import package root + convex.config.js + _generated/component.js + test
  → npx convex codegen (or local-backend equivalent) with --typecheck-components
  → npm run typecheck
  → npm run build
  → publint <tarball>
  → attw --pack <tarball>
  → reject any resolved path under the source repository
```

The fixture should unset workspace-oriented environment variables, use a fresh lockfile/node_modules, and scan source/config for `../..` imports or aliases into the repository. [VERIFIED: AGENTS.md artifact criterion]

### Anti-Patterns to Avoid

- **One generic wrapper with optional actor/admin/scope fields:** optional authority creates fail-open paths; use separate read, participation, and admin exports. [VERIFIED: ACCS-02–05]
- **Direct `ctx.db.get(id)` followed by DTO mapping:** re-check scope immediately and normalize cross-scope to not-found. [VERIFIED: CONTEXT D-05]
- **Filtering page results after pagination:** security predicates belong in the index range; page filtering creates sparse pages and can leak counts/metadata. [CITED: https://docs.convex.dev/database/reading-data/indexes/]
- **Full-text search as Phase 1 browse:** search is relevance-only and has different limits; keep it in Phase 2. [CITED: https://docs.convex.dev/search/text-search]
- **Provider fixture mocks that accept synthetic `userId`:** exercise the real helper-shaped server adapter boundary and separately test the normalized adapter contract. [VERIFIED: COMP-04–07]
- **Workspace example as packaging proof:** only the packed external fixture proves export completeness. [VERIFIED: QUAL-03]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Component definition/codegen | Custom component loader | `defineComponent`, `convex codegen --component-dir`, generated `ComponentApi` | Required platform contract. [CITED: https://docs.convex.dev/components/authoring] |
| Component pagination cursors | Offset pagination or homemade opaque cursor | `convex-helpers` `paginator` and matching hook | Official component-specific guidance and reactive cursor handling. [CITED: https://docs.convex.dev/components/authoring] |
| Auth/session verification | Token parsing inside Afferent | Provider's host-side helper / `ctx.auth` | Keeps verification and session lifecycle with the installed provider. [CITED: official provider docs] |
| Password/session/admin store | Component-owned auth or role tables | Host application's auth and authorization | Required security boundary. [VERIFIED: PROJECT.md] |
| ID/public document transport | Raw component `Doc` / cross-component `Id` | Explicit DTO validators plus branded strings | Component IDs become strings and document shapes are private. [CITED: https://docs.convex.dev/components/authoring] |
| Package export validation | Ad hoc import checks only | Node resolution in clean fixture + `publint` + ATTW | Catches missing conditions/declarations and repository masking. [VERIFIED: QUAL-03] |

**Key insight:** the hard work is not writing wrappers or cursors; it is ensuring every path shares one authority derivation, one scope guard, one DTO boundary, and one artifact-resolution proof. [VERIFIED: synthesis]

## Common Pitfalls

### Pitfall 1: Component docs show passing a `userId`, so the browser is allowed to pass one

**What goes wrong:** an example of host-to-component data flow is mistaken for a browser API contract. [CITED: https://docs.convex.dev/components/authoring]

**How to avoid:** browser-facing wrapper args omit authority fields; only host code adds the verified scalar to a component call. Add static validator tests plus forged extra-field runtime tests. [VERIFIED: COMP-07]

### Pitfall 2: Better Auth uses JWT identity without session validation

**What goes wrong:** `ctx.auth.getUserIdentity()` can identify a token subject, but current Better Auth guidance distinguishes it from `authComponent.getAuthUser(ctx)`, which validates the session. [CITED: https://labs.convex.dev/better-auth/basic-usage/authorization]

**How to avoid:** use `getAuthUser(ctx)` for Afferent's Better Auth adapter, then derive only the stable user ID and optional display snapshot. [CITED: same source]

### Pitfall 3: Package build passes but tarball lacks generated declarations/config

**What goes wrong:** source resolution hides missing `dist` files or exports. [CITED: https://docs.convex.dev/components/authoring]

**How to avoid:** inspect `npm pack --json`, install that path in a temp fixture, and import every supported subpath before codegen/typecheck/build. [VERIFIED: QUAL-03]

### Pitfall 4: Pagination metadata is simplified to `{items, cursor}`

**What goes wrong:** component/react helper metadata needed to avoid holes or overlaps is dropped. [CITED: convex-helpers paginator docs]

**How to avoid:** preserve the full helper result and transform only `page`. Test reactive insert/delete between pages. [CITED: https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/README.md]

### Pitfall 5: Vote idempotency is tested sequentially only

**What goes wrong:** retry/multi-tab races expose duplicate membership or count drift. [VERIFIED: FDBK-05 risk]

**How to avoid:** use desired-state semantics, exact membership index, one transaction, concurrent tests, and reconciliation. [VERIFIED: test design]

### Pitfall 6: Comment reply points across a post or to a reply

**What goes wrong:** arbitrary IDs form a hidden tree or cross-post relationship. [VERIFIED: FDBK-07 risk]

**How to avoid:** same scope, same post, parent exists, parent has no parent. Return not-found-equivalent for cross-scope. [VERIFIED: D-05 and FDBK-07]

### Pitfall 7: Scope is absent from installation-level rows

**What goes wrong:** settings, actors, boards, or future statuses become shared even if posts are scoped. [VERIFIED: CONTEXT D-01 and D-06]

**How to avoid:** schema static audit enumerates every table and index; allow no exception or optional `scopeId`. [VERIFIED: D-01]

## Code Examples

### Component Definition and Export Surface

```typescript
// src/component/convex.config.ts
// Source: https://docs.convex.dev/components/authoring
import { defineComponent } from "convex/server";

export default defineComponent("afferent");
```

Required package exports are root client, `./convex.config.js`, `./_generated/component.js`, and `./test`; Phase 1 may add explicit server/provider adapter subpaths but must not expose private component data-model modules. [CITED: https://docs.convex.dev/components/authoring]

### Direct-ID Scope Guard

```typescript
async function requirePostInScope(ctx: QueryCtx, scopeId: ScopeId, postId: Id<"posts">) {
  const post = await ctx.db.get(postId);
  if (!post || post.scopeId !== scopeId) throw notFound("post");
  return post;
}
```

The same structured error is used for nonexistent and cross-scope IDs; logs may retain internal diagnostics but public data must not distinguish them. [VERIFIED: CONTEXT D-05]

### Flat Reply Validation

```typescript
const parent = parentCommentId
  ? await requireCommentInScope(ctx, scopeId, parentCommentId)
  : null;
if (parent && (parent.postId !== postId || parent.parentCommentId !== undefined)) {
  throw invalidReplyTarget();
}
```

This enforces one parent edge without recursive thread shape. [VERIFIED: FDBK-07]

## Verification Strategy (Nyquist Validation Disabled)

`.planning/config.json` explicitly sets `workflow.nyquist_validation` to `false`, so this research does not emit the formal GSD `Validation Architecture` section. The phase still has mandatory quality requirements and should plan the following executable test layers. [VERIFIED: .planning/config.json and QUAL-02/03]

### Required Test Layers

| Layer | Exact proof | Suggested command contract |
|-------|-------------|----------------------------|
| Static schema/API audit | every table has required `scopeId`; every index begins with it; every search index declares it; browser args/DTO exports omit authority/provider/private shapes | `npm run test:static` |
| Pure model tests | structured errors, branded DTO mapping, external key/tombstone format, reply validation, vote state transitions | `npm run test:model` |
| `convex-test` component tests | access policy, ownership, withdraw, actor refresh/anonymize, idempotent votes, counts, flat comments, scope not-found equivalence | `npm run test:component` |
| Auth conformance fixtures | identical anonymous/authenticated/admin outcomes for Convex Auth, Clerk, Better Auth adapters | `npm run test:auth-conformance` |
| Two-scope adversarial matrix | every Phase 1 list/get/create/edit/withdraw/vote/comment/count/reactive path; same slugs and IDs attempted across users | `npm run test:scope` |
| Real Convex pagination spike | helper cursor behavior, reactive inserts/removes, runtime limits, fixed and resolver clients | `npm run test:backend` |
| Packed consumer gate | tarball contents, exports, install, component registration, codegen, typecheck, Vite build, no repo-relative resolution | `npm run test:package` |
| License gate | root/package license metadata and tarball `LICENSE` | included in `test:package` |

### Auth Forgery Matrix

For every provider fixture, run at least these cases: [VERIFIED: COMP-07 and QUAL-02]

| Case | Expected result |
|------|-----------------|
| Anonymous public read under public policy | succeeds, no actor row created |
| Anonymous public read under authenticated-read policy | structured unauthenticated error |
| Anonymous participation | rejected before component write |
| Authenticated participation | adapter creates namespaced key; only safe snapshot reaches component |
| Client adds `userId`, `externalKey`, `isAdmin`, `scopeId`, provider record | validator rejects or wrapper ignores because fields do not exist in args; no authority change |
| Authenticated non-admin calls admin read/mutation | host callback denies; component not called |
| Admin claim in browser payload | no effect; host callback remains decisive |
| Scope resolver returns null/throws | fail before any data access |
| Other-scope opaque ID | same public error code/data as random nonexistent ID |

### Invariant Test Details

- **Votes:** membership uniqueness, repeated desired state, concurrent calls, counter exactness/nonnegative, rollback, reconciliation, cross-scope/withdrawn target rejection. [VERIFIED: FDBK-05]
- **Comments:** flat root, one valid root-parent reply, reply-to-reply rejected, cross-post/cross-scope parent rejected, stable comment count, author snapshot DTO. [VERIFIED: FDBK-06/07]
- **DTOs:** runtime return validators for every function, snapshot tests for `v1` keys, no private fields, IDs are opaque strings, old fields remain additive. [VERIFIED: COMP-03]
- **Scope:** static schema enumeration plus runtime matrix; reads must not create/refresh actors. [VERIFIED: D-01, D-06, D-10]
- **Anonymization:** clears display fields, tombstones key irreversibly, preserves authored rows/votes/comments/counts, re-registration creates a new actor. [VERIFIED: D-11 and D-12]

### Gate Frequency

- Per task: relevant model/static/component tests. [VERIFIED: recommended workflow]
- Per wave: full Vitest suite plus auth/scope matrix. [VERIFIED: recommended workflow]
- Before Phase 1 completion: current local/preview backend pagination spike and clean packed-tarball fixture from a fresh temp directory. [VERIFIED: QUAL-02/03]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Host provider verifies identity; adapter derives immutable namespaced key. [CITED: official provider docs] |
| V3 Session Management | yes | Provider owns sessions; Better Auth uses session-validating `getAuthUser`; component stores no session/token. [CITED: Better Auth authorization docs] |
| V4 Access Control | yes | Host authorizes every admin call; component enforces scope, policy, and ownership. [VERIFIED: project decisions] |
| V5 Validation | yes | Convex `args` and `returns` validators at host and component boundaries; narrow DTOs. [CITED: https://docs.convex.dev/components/authoring] |
| V6 Cryptography | yes, narrow | Use a standard runtime-supported one-way primitive for sandbox scope and irreversible tombstones; never invent crypto. Validate the chosen primitive in the Convex host runtime before locking it. [VERIFIED: D-04/D-11 recommendation] |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged actor/admin/scope args | Spoofing / Elevation | fields absent from browser API; server-derived callbacks on every call; negative tests. [VERIFIED: COMP-07] |
| Cross-scope ID oracle | Information disclosure | scope re-check after ID load; identical not-found public error. [VERIFIED: D-05] |
| Cross-scope lists/counts/reactive updates | Information disclosure | scope-first indexes and two-user matrix. [VERIFIED: D-01/D-06] |
| Duplicate vote/count drift | Tampering | canonical membership, exact index, atomic desired-state mutation, reconciliation. [VERIFIED: FDBK-05] |
| Provider record/PII leakage | Information disclosure | minimal actor snapshot and explicit DTO mapper; no email/token/claims. [VERIFIED: D-09] |
| Session-derived actor instability | Spoofing / Integrity | non-session stable provider identifier; Better Auth session validation. [VERIFIED: D-07/D-08] |
| Package resolution substitution | Tampering / Supply chain | legitimacy gate, lockfile, tarball inspection, clean external fixture, no postinstall scripts. [VERIFIED: package audit and QUAL-03] |

## State of the Art

| Old / generic approach | Current Phase 1 approach | Impact |
|------------------------|--------------------------|--------|
| Built-in component `.paginate()` | `convex-helpers` paginator plus matching hook | Required because official docs say built-in pagination does not work in components. [CITED: https://docs.convex.dev/components/authoring] |
| Clerk package `@clerk/clerk-react` in new React examples | `@clerk/react` | Current official Convex Clerk guide uses `@clerk/react`. [CITED: https://docs.convex.dev/auth/clerk] |
| Better Auth subject-only shortcut | `authComponent.getAuthUser(ctx)` | Current migration/authorization docs prefer session-validating user lookup. [CITED: https://labs.convex.dev/better-auth/basic-usage/authorization] |
| TypeScript registry `latest` | official-template-compatible TS `6.0.3` | Avoids adopting TS 7 outside the current Convex/template/helper matrix. [CITED: official template and npm peers] |
| Workspace/source build proof | packed tarball in external clean consumer | Proves the artifact rather than repository resolution. [VERIFIED: QUAL-03] |

## Assumptions Log

No implementation claim in this research is based only on training knowledge. Exact names for factories, error codes, branded ID syntax, default-scope literal, sandbox one-way primitive, tombstone format, and anonymized label remain planner discretion rather than hidden assumptions. [VERIFIED: review of provenance tags]

## Open Questions

1. **Which one-way primitive and encoded length should the sandbox scope/tombstone helper use?**
   - What is fixed: deterministic, fixed length, opaque, one-way, derived only from verified server identity; no raw identity in `scopeId`. [VERIFIED: D-04/D-11]
   - What remains: exact Web Crypto primitive, domain separation, output length, and rotation policy. [VERIFIED: planner discretion]
   - Recommendation: schedule a small host-runtime spike, prefer a standard domain-separated digest or keyed construction available in the Convex runtime, and freeze test vectors before schema use. [VERIFIED: security recommendation]

No product or architecture question blocks planning. [VERIFIED: research synthesis]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | build/test/fixture | yes | `22.22.2` | Pin CI and optionally local toolchain to Node 24 from existing stack research before implementation. [VERIFIED: local command] |
| npm | install/pack | yes | `10.9.7` | Upgrade with chosen Node toolchain if project pins npm 11; Phase 1 local pack works with current npm. [VERIFIED: local command] |
| Git | source and h5i | yes | `2.50.1` | none. [VERIFIED: local command] |
| Convex CLI | codegen/backend spike | not globally installed | — | Install project-local `convex` and invoke through `npx` after legitimacy checkpoint. [VERIFIED: local command] |
| Docker/local Convex backend | real-backend test option | not found | — | Use a Convex dev/preview deployment if local-backend setup is unavailable. [CITED: https://docs.convex.dev/testing/convex-backend] |

**Missing dependencies with no fallback:** none at planning time. [VERIFIED: environment audit]

**Missing dependencies with fallback:** global Convex CLI and Docker; project-local CLI plus a dev/preview deployment are sufficient. [VERIFIED: environment audit]

## Sources

### Primary Official Sources (MEDIUM confidence under installed websearch classifier)

- [Convex Authoring Components](https://docs.convex.dev/components/authoring) — definition, generated API, isolation, IDs, auth boundary, pagination, build order, and export surface.
- [Official Convex component template package](https://github.com/get-convex/templates/blob/main/template-component/package.json) — scripts, exports, peer dependencies, TypeScript and fixture layout.
- [Convex Auth Authorization](https://labs.convex.dev/auth/authz) — `getAuthUserId(ctx)` and current host-side auth helper.
- [Convex Auth in Functions](https://docs.convex.dev/auth/functions-auth) — guaranteed issuer/subject/token identifier fields.
- [Convex Clerk Integration](https://docs.convex.dev/auth/clerk) — current React package/provider and host `ctx.auth` flow.
- [Convex Better Auth Authorization](https://labs.convex.dev/better-auth/basic-usage/authorization) — session-validating `getAuthUser(ctx)`.
- [Convex Better Auth Component Client](https://labs.convex.dev/better-auth/api/component-client) — current `createClient` integration surface.
- [Convex Indexes](https://docs.convex.dev/database/reading-data/indexes/) — compound index order, equality ranges, implicit creation-time tie-breaker, and bounded retrieval.
- [Convex Paginated Queries](https://docs.convex.dev/database/pagination) — cursor metadata and reactive page behavior for ordinary app queries.
- [Convex Helpers Pagination](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/README.md) — component-compatible `paginator` syntax and matching hook.
- [Convex Full Text Search](https://docs.convex.dev/search/text-search) — one search field, equality filters, relevance ordering, pagination, and limits.
- [Convex `convex-test`](https://docs.convex.dev/testing/convex-test) — mock limitations.
- [Testing Local Backend](https://docs.convex.dev/testing/convex-backend) — real-backend benefits and constraints.
- npm registry metadata and installed package-legitimacy seam — versions, repos, downloads, postinstall inspection, and verdicts checked 2026-07-15.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — current registry and official template/docs agree, but the legitimacy heuristic flags several recent releases and exact versions should be rechecked at install time.
- Architecture: HIGH — component isolation, wrapper responsibility, generated API behavior, and locked scope/identity decisions are explicit.
- Pagination: MEDIUM-HIGH — official guidance and helper syntax are clear; reactive behavior still needs the planned real-backend spike.
- Auth integrations: MEDIUM-HIGH — all three current server helper surfaces were revalidated; provider packages remain fast-moving.
- Verification strategy: HIGH — directly traces Phase 1 requirements and known mock/artifact limitations.

**Research date:** 2026-07-15
**Valid until:** 2026-07-22 for provider/package versions; architecture and locked project decisions remain valid until CONTEXT.md changes.
