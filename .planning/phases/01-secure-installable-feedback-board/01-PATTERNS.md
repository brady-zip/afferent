# Phase 1: Secure Installable Feedback Board - Pattern Map

**Mapped:** 2026-07-15
**Files classified:** 33 concrete path assignments across 24 rows
**Product-code analogs found:** 0 / 33
**Tooling baselines found:** 1 (`package.json`, partial baseline only)

## Greenfield Finding

The repository contains no product implementation: no TypeScript source, Convex component,
host wrapper, provider adapter, test fixture, or published package surface exists to copy.
The only runtime-adjacent repository file is the private tooling shell in `package.json`; the
phase context explicitly says it is not the future published component contract. Accordingly,
all product rows below are marked **greenfield** and are assigned to the concrete official
examples and locked boundary rules in `01-RESEARCH.md` and `01-CONTEXT.md`, rather than to an
invented local analog.

## File Classification

| New/Modified File | Role | Data Flow | Closest Existing Analog | Match Quality |
|---|---|---|---|---|
| `package.json` | config | file-I/O / build | current `package.json` | partial baseline; same file, tooling-only |
| `tsconfig.json` | config | transform / build | none | greenfield |
| `LICENSE` | config / legal artifact | file-I/O | none | greenfield |
| `src/component/convex.config.ts` | config | codegen | none | greenfield; official Convex example |
| `src/component/schema.ts` | model / store | CRUD | none | greenfield; research index contract |
| `src/component/validators.ts` | utility / contract | transform | none | greenfield; research DTO contract |
| `src/component/model/errors.ts` | utility | transform | none | greenfield; locked error equivalence |
| `src/component/model/scope.ts` | middleware / model | request-response | none | greenfield; research direct-ID guard |
| `src/component/model/actors.ts` | model / service | CRUD | none | greenfield; locked actor lifecycle |
| `src/component/model/votes.ts` | model / service | CRUD | none | greenfield; desired-state membership pattern |
| `src/component/model/comments.ts` | model / service | CRUD | none | greenfield; flat-reply pattern |
| `src/component/public/{boards,posts,comments}.ts` | controller / query | request-response / streaming | none | greenfield; paginator pattern |
| `src/component/participation/{posts,votes,comments}.ts` | controller / mutation | request-response / CRUD | none | greenfield; narrow-intent pattern |
| `src/component/admin/{installation,actors}.ts` | controller / mutation | request-response / CRUD | none | greenfield; host-admin-gated intents |
| `src/client/contracts.ts` | contract / utility | transform | none | greenfield; provider-neutral boundary |
| `src/client/index.ts` | provider / controller factory | request-response | none | greenfield; fixed-scope factory |
| `src/client/server.ts` | provider / controller factory | request-response | none | greenfield; resolver factory |
| `src/test.ts` | test adapter | request-response | none | greenfield; official component template shape |
| `fixtures/auth-convex-auth/**` | provider fixture | request-response | none | greenfield; official provider helper pattern |
| `fixtures/auth-clerk/**` | provider fixture | request-response | none | greenfield; official provider identity pattern |
| `fixtures/auth-better-auth/**` | provider fixture | request-response | none | greenfield; official session-validating pattern |
| `fixtures/packed-vite-convex/**` | consumer fixture | file-I/O / build | none | greenfield; packed-artifact gate |
| `tests/static/{schema,contracts}.test.ts` | test | batch / static analysis | none | greenfield; research static audit |
| `tests/{model,component,conformance,integration}/**` | test | batch / request-response | none | greenfield; research verification matrix |

The grouped rows expand to the named files shown in braces plus the fixture/test files needed
inside each research-defined directory. Exact fixture-internal wrapper filenames remain planner
discretion; provider-specific source must stay in the corresponding fixture and outside
`src/component` and public DTO exports.

## Pattern Assignments

### `package.json` (config, file-I/O / build)

**Local baseline:** `package.json:1-18`.

Preserve the repository's two-space JSON formatting, existing Husky preparation, and inline
Conventional Commit configuration:

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "commitlint": {
    "extends": ["@commitlint/config-conventional"]
  }
}
```

This is only a formatting/tooling baseline. Replace the private package metadata with the
published Apache-2.0 component contract and add explicit exports for the root client,
`./convex.config.js`, `./_generated/component.js`, and `./test`; optional server/provider
subpaths must not expose `_generated/dataModel`, raw documents, or provider packages. Follow
`01-RESEARCH.md:356-378` for the build/pack/export gate. Provider packages belong in isolated
fixture/dev dependencies, never required runtime peers.

### `tsconfig.json` and `LICENSE` (config, build / file-I/O)

**Analog:** none.

Use the official component-template TypeScript/ESM/declaration-emission shape described by the
research, pinned to the reviewed TypeScript 6 matrix. The license must be Apache-2.0, package
metadata must say `Apache-2.0`, and the packed artifact test must assert `LICENSE` is present.
Do not infer either file from the current private package shell.

### `src/component/convex.config.ts` (config, codegen)

**Assigned source:** official Convex example captured at `01-RESEARCH.md:448-458`.

```typescript
import { defineComponent } from "convex/server";

export default defineComponent("afferent");
```

Use Convex-generated component API/data model files; do not hand-roll a loader or component API.

### `src/component/schema.ts` (model / store, CRUD)

**Assigned source:** scope/index contract at `01-RESEARCH.md:295-307` plus locked decisions
`01-CONTEXT.md:18-24`.

Every table, including installation-level tables, has a non-optional server-assigned `scopeId`.
Every relevant index begins with `scopeId`; no optional/global/wildcard scope exists. Start with:

| Table | Required index | Ordered fields |
|---|---|---|
| `boards` | `by_scope_order` | `scopeId, sortOrder` |
| `posts` | `by_scope_board_state` | `scopeId, boardId, lifecycleState` |
| `comments` | `by_scope_post` | `scopeId, postId` |
| `actors` | `by_scope_external_key` | `scopeId, externalKey` |
| `votes` | `by_scope_post_actor` | `scopeId, postId, actorId` |

Add the installation policy/configuration row with the same scope rule. Keep `scopeId` distinct
from `boardId`. Do not add Phase 2 full-text search or Phase 4 seed/reset/quota/expiry/cleanup.
The static audit must nonetheless reject any future table/index/search definition missing the
scope requirement.

### `src/component/validators.ts` (utility / contract, transform)

**Assigned source:** DTO contract at `01-RESEARCH.md:350-354`.

Every exported component function declares both `args` and `returns`. Cross-component IDs use
`v.string()` and exported TypeScript types use opaque branded strings. Explicit DTO mappers—not
document spreading—produce versioned responses such as `apiVersion: "v1"`. Phase 1 post DTOs
must already include stable board, author, status, totals, and `tags: []` fields.

Never export `Doc<...>`, raw `Id<...>`, provider records/types, `scopeId`, `externalKey`, email,
tokens, raw internal timestamps, `_generated/dataModel`, or `_generated/api`.

### `src/component/model/errors.ts` and `src/component/model/scope.ts`

**Assigned source:** direct-ID guard at `01-RESEARCH.md:460-470` and D-05 at
`01-CONTEXT.md:23`.

```typescript
async function requirePostInScope(
  ctx: QueryCtx,
  scopeId: ScopeId,
  postId: Id<"posts">,
) {
  const post = await ctx.db.get(postId);
  if (!post || post.scopeId !== scopeId) throw notFound("post");
  return post;
}
```

Generalize this as table-specific/internal guards while preserving one public structured error
shape for nonexistent and cross-scope IDs. Scope resolution failure occurs before any database
operation. Internal diagnostics may differ, but public error code/data may not act as an
existence oracle.

### `src/component/model/actors.ts` (model / service, CRUD)

**Assigned source:** D-07 through D-12 at `01-CONTEXT.md:26-32`.

Lookup uniqueness is `(scopeId, externalKey)`. Authenticated participation mutations alone may
insert an actor or refresh `displayName`/`avatarUrl` last-write-wins; reads never mutate actor
state and `externalKey` is immutable. The component treats the namespaced key as opaque.

`anonymizeActor` clears display fields, replaces the key with an irreversible tombstone, and
retains authored posts, comments, vote memberships, and totals. Re-registration creates a new
actor. Do not add email, claims, provider records, tokens, linking, merging, or automatic
relinking.

### `src/component/model/votes.ts` and `src/component/participation/votes.ts`

**Assigned source:** membership-as-truth pattern at `01-RESEARCH.md:340-344`.

Expose `setVote({ postId, desired: boolean })`, not a toggle. In one mutation: resolve/upsert the
verified actor, scope-check the visible target post, query exact
`(scopeId, postId, actorId)` membership, insert/delete only when state differs, and adjust
`voteCount` only when membership changes. The membership row is canonical; the count is a
transactionally maintained projection.

### `src/component/model/comments.ts` and `src/component/participation/comments.ts`

**Assigned source:** flat-reply example at `01-RESEARCH.md:472-483`.

```typescript
const parent = parentCommentId
  ? await requireCommentInScope(ctx, scopeId, parentCommentId)
  : null;
if (parent && (parent.postId !== postId || parent.parentCommentId !== undefined)) {
  throw invalidReplyTarget();
}
```

Comments are rows, never nested arrays. A reply has one optional parent edge; require the parent
to be in the same scope and post and to be a root comment. DTOs expose only an opaque parent ID,
not recursively embedded replies.

### `src/component/model/actors.ts` and `src/component/participation/posts.ts`

**Assigned source:** actor refresh and ownership rules in `01-CONTEXT.md:27-32` and requirement
mapping in the research.

`createPost`, field-specific `editPost`, and `withdrawPost` are separate narrow intents.
Authenticated mutations refresh the verified actor snapshot in the same transaction. Edit
requires the scoped post's actor ID to match; withdraw changes lifecycle state and preserves the
post, author, votes, comments, and totals. New posts receive built-in `open` status server-side.
There is no generic CRUD or hard-delete intent.

### `src/component/public/{boards,posts,comments}.ts`

**Assigned source:** official helper pattern captured at `01-RESEARCH.md:309-325`.

```typescript
import { paginationOptsValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import schema from "../schema.js";

const result = await paginator(ctx.db, schema)
  .query("posts")
  .withIndex("by_scope_board_state", (q) =>
    q.eq("scopeId", scopeId)
      .eq("boardId", boardId)
      .eq("lifecycleState", "active"),
  )
  .order("desc")
  .paginate(paginationOpts);

return { ...result, page: result.page.map(toPostSummaryV1) };
```

Put all security/visibility predicates in the index range. Never filter a page after pagination.
Map only `result.page` and preserve all paginator metadata. Public reads resolve scope and apply
the installation read policy without creating/refreshing actor rows. All list/count/get paths are
bounded and direct IDs use the scope guard.

### `src/component/admin/installation.ts` and `src/component/admin/actors.ts`

**Assigned source:** `01-RESEARCH.md:242-246` and two-factory guard sequence at lines 248-256.

Provide an idempotent, narrow `configureInstallation`-style intent for installation-wide read
policy plus a bounded board set; it is not generic settings/board CRUD. Provide the explicit
host-invoked actor anonymization intent. Both are reachable only through an admin wrapper whose
host-owned callback independently authorizes every call. Neither accepts or returns `scopeId`.

### `src/client/contracts.ts` (contract / utility, transform)

**Assigned source:** provider-neutral actor example at `01-RESEARCH.md:258-293`.

```typescript
type VerifiedActor = Readonly<{
  externalKey: string;
  displayName?: string;
  avatarUrl?: string;
}>;
```

Define separate read, participation, and admin capability contracts. `resolveActor(ctx)` and
`authorizeAdmin(ctx)` are separate callbacks; role-like provider claims never automatically
grant Afferent administration. Browser-facing argument validators omit `externalKey`, `userId`,
`isAdmin`, `scopeId`, and provider records entirely.

### `src/client/index.ts` and `src/client/server.ts`

**Assigned source:** two-factory pattern at `01-RESEARCH.md:248-256`.

Both factories expose the exact same narrow intent surface and call the same component
operations:

1. derive the hidden fixed normal scope, or call server-only `resolveScope(ctx)`;
2. derive actor or independently authorize admin when that capability requires it;
3. call the narrow component intent with only trusted minimal facts;
4. let the component re-check scope, policy, ownership, and invariants;
5. return only a validated DTO.

The normal factory owns a private fixed scope constant; consumers never configure or pass it.
The non-default server-only factory requires `resolveScope(ctx)` on every operation and fails
before the component call when resolution fails. It is a constrained sandbox capability, not a
multi-product API.

### Provider fixtures

**Assigned source:** official provider-helper examples captured at
`01-RESEARCH.md:258-293`.

```typescript
// Convex Auth
const userId = await getAuthUserId(ctx);
if (!userId) throw unauthenticated();
return { externalKey: `convex-auth:${userId}` };

// Clerk
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw unauthenticated();
return {
  externalKey: `clerk:${identity.issuer}:${identity.subject}`,
  displayName: identity.name,
  avatarUrl: identity.pictureUrl,
};

// Better Auth
const user = await authComponent.getAuthUser(ctx);
if (!user) throw unauthenticated();
return {
  externalKey: `better-auth:${user.id}`,
  displayName: user.name,
  avatarUrl: user.image ?? undefined,
};
```

Keep these imports and provider types inside their fixtures or explicit adapter subpaths.
Especially for Better Auth, use the session-validating component lookup rather than a
subject-only JWT shortcut. Tests must exercise real helper-shaped boundaries, not browser args
that inject a synthetic user ID.

### `src/test.ts` and `tests/{model,component,conformance,integration,static}/**`

**Assigned source:** verification matrix at `01-RESEARCH.md:485-530`.

Use `src/test.ts` only to register the component for `convex-test`; it does not replace a real
backend gate. Organize tests by proof:

- static: enumerate every schema table/index/search definition and forbid authority/provider/
  private shapes in browser args and public exports;
- model: structured errors, DTO mapping, tombstone/scope helper vectors, reply and vote state;
- component: policy, ownership, withdrawal, actor refresh/anonymization, votes, comments, counts,
  and not-found equivalence;
- conformance: run one anonymous/authenticated/admin/forgery matrix against all three adapters;
- integration: run the two-scope pagination/reactivity spike against both client factories and a
  current local/preview Convex backend.

The two-scope fixture uses identical slugs and at least 50 posts per scope across multiple boards,
mutates rows between pages, and attempts other-scope IDs. Repeat `desired: true/false`, concurrent
vote calls, reply-to-reply, cross-post/cross-scope parent, and anonymization retention cases.

### `fixtures/packed-vite-convex/**` and package integration test

**Assigned source:** artifact gate at `01-RESEARCH.md:356-378`.

The executable flow is:

```text
component codegen -> package build -> npm pack to temp
-> inspect tarball contents/metadata
-> materialize a clean Vite + Convex consumer outside the repository
-> install the absolute tarball path with fresh lockfile/node_modules
-> import every supported export
-> consumer Convex codegen with component typechecking
-> consumer typecheck and Vite build
-> publint and ATTW against the tarball
-> reject any resolved path under the source repository
```

Unset workspace-oriented environment variables and scan fixture source/config for repository-
relative aliases/imports. The fixture must prove `LICENSE`, declarations, component config,
generated `ComponentApi`, and every documented export came from the tarball.

## Shared Patterns

### Authority derivation

Apply to every host wrapper: browser inputs contain intent only; trusted host code derives scope,
actor identity, and admin authorization on every call. The isolated component never accesses
host `ctx.auth`. Resolve scope first and fail before data access.

### Scope and not-found equivalence

Apply to every table, query, mutation, count, and reactive path: scope is mandatory and server-
assigned; indexes are scope-first; direct-ID loads re-check scope; cross-scope and nonexistent IDs
produce the same public error. Future search/seed/reset/cleanup inherit this rule but are not
implemented in Phase 1.

### Narrow validated contracts

Apply to every exported function: separate read/participation/admin capabilities, explicit args
and returns validators, no generic CRUD, no authority fields in browser args, explicit versioned
DTO mapping, and no raw documents or provider records.

### Transactional invariants

Apply to participation mutations: actor snapshot refresh and domain writes occur together;
ownership and scope are rechecked; votes use desired-state membership; comments enforce one root
parent; withdrawal and anonymization preserve historical rows and counts.

### Build and package resolution

Apply to all package work: ESM/declaration exports must resolve from the packed tarball in a clean
external consumer. Passing against workspace source is not evidence.

## No Local Analog Found

| File family | Why no analog exists | Assigned authority |
|---|---|---|
| Component config/schema/functions | No Convex product code exists | official Convex examples and research lines 208-238, 295-325, 446-483 |
| Host factories/contracts | No host wrapper layer exists | locked D-02/D-03/D-05 plus research two-factory pattern |
| Provider adapters | No auth integration exists | current official provider helper examples captured in research |
| Test suites/registration | No product tests exist | research verification and forgery matrices |
| Packed consumer fixture | No consumer fixture or build script exists | research clean-artifact gate |
| TypeScript/build config/license | Only private Node tooling exists | official component-template shape and Apache-2.0 requirements |

## Metadata

**Analog search scope:** all tracked non-`node_modules` files plus hidden repository tooling files
to depth 3.

**Product source files scanned:** 0 (none exist).

**Local convention files read:** `package.json`, `.husky/commit-msg`, `AGENTS.md`, Phase 1
`CONTEXT.md`, and Phase 1 `RESEARCH.md`.

**Pattern extraction date:** 2026-07-15.

**Deferred by boundary:** relevance search; moderation/rate limiting; cross-provider linking;
email/contact PII; sandbox seed/reset/quota/expiry/cleanup; public/admin UI.
