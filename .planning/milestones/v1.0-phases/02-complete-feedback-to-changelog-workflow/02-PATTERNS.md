# Phase 2: Complete Feedback-to-Changelog Workflow - Pattern Map

**Mapped:** 2026-07-16
**Files classified:** 38 concrete path/family assignments across 18 rows
**Rows with local analogs:** 17 / 18 (13 strong, 4 partial)

## Mapping Boundary

Phase 2 extends a verified Phase 1 implementation rather than starting a second architecture.
The strongest local patterns are concentrated in five seams:

1. `src/component/schema.ts` for mandatory scope ownership and scope-leading indexes;
2. `src/component/public/posts.ts` for bounded, validator-complete component reads;
3. `src/component/participation/*.ts` and `src/component/admin/*.ts` for narrow transactional
   intents;
4. `src/client/{contracts,internal,index,server}.ts` for provider-neutral DTOs and per-call
   trusted authority derivation; and
5. the existing model/component/integration/static/packed test layers for proof structure.

Research introduces three genuinely new mechanics with no exact Phase 1 implementation to copy:
bounded component search, durable scheduled continuation jobs, and headless React hooks. For those,
the planner must use `02-RESEARCH.md` as the primary implementation authority while preserving the
local boundaries mapped below.

The file split below is the canonical planning split inferred from `02-CONTEXT.md:142-162` and
`02-RESEARCH.md:278-298`. Final hook and helper names remain planner discretion, but collapsing
these responsibilities into generic CRUD/query/job wrappers would violate the locked contract.

## File Classification

| New/Modified File                                                                                 | Role                                     | Data Flow                               | Closest Existing Analog                                          | Match Quality                                                   |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| `package.json`                                                                                    | config                                   | file-I/O / build                        | current `package.json`                                           | same-file baseline; preserve user-owned dirty experiment        |
| `src/component/schema.ts`                                                                         | model / store                            | CRUD / pub-sub / batch                  | current `src/component/schema.ts`                                | exact role and storage boundary                                 |
| `src/component/validators.ts`                                                                     | utility / contract                       | transform                               | current `src/component/validators.ts`                            | exact                                                           |
| `src/component/model/{visibility,content,scoring,errors,scope,views}.ts`                          | model / middleware / utility             | transform / request-response            | `model/{scope,views,errors}.ts`                                  | strong for guards/views/errors; no exact content/scoring analog |
| `src/component/public/{feeds,search,roadmap,changelog}.ts`                                        | controller / query                       | cursor request-response / bounded batch | `public/posts.ts`                                                | exact for indexed feeds; partial for bounded search             |
| `src/component/participation/{posts,comments,votes,subscriptions}.ts`                             | controller / mutation                    | request-response / CRUD / event capture | current `participation/{posts,comments,votes}.ts`                | exact role; subscriptions are additive                          |
| `src/component/admin/{posts,tags,merge,changelog,activity}.ts`                                    | controller / mutation/query              | CRUD / request-response / batch         | `admin/installation.ts`, `admin/actors.ts`                       | role match; merge/activity are additive                         |
| `src/component/notifications/{events,fanout,inbox,outbox}.ts`                                     | service / store                          | event-driven / pub-sub / batch          | `model/votes.ts`, `participation/votes.ts`                       | partial; membership/projection truth only                       |
| `src/component/jobs/{fanout,merge,tag-cleanup}.ts`                                                | service / internal mutation              | event-driven / batch                    | none                                                             | no local scheduled-continuation analog                          |
| `src/component/feedback.ts`                                                                       | route / export surface                   | transform                               | current `src/component/feedback.ts`                              | exact                                                           |
| `src/client/{contracts,internal,index,server}.ts`                                                 | contract / provider / controller factory | transform / request-response            | current files                                                    | exact                                                           |
| `src/react/{provider,bindings,hooks,index}.ts(x)`                                                 | provider / hook                          | streaming / request-response / pub-sub  | `fixtures/packed-vite-convex/src/App.tsx`                        | partial boundary only; no reusable hook layer exists            |
| `tests/model/{content,scoring,merge,notifications}.test.ts`                                       | test                                     | batch / transform                       | `tests/model/{comments,votes}.test.ts`                           | exact test role                                                 |
| `tests/component/{discovery,moderation,roadmap,changelog,notifications,outbox}.test.ts`           | test                                     | request-response / event-driven / batch | `tests/component/{posts,participation,anonymization}.test.ts`    | exact test harness                                              |
| `tests/integration/{search,scheduler,rate-limiter,outbox,pagination-backend,scope-matrix}.test.*` | test                                     | request-response / batch / concurrency  | `tests/integration/{pagination-backend,scope-matrix}.test.ts`    | exact integration layer; new platform seams                     |
| `tests/react/**/*.test.ts(x)`                                                                     | test                                     | streaming / request-response            | `fixtures/packed-vite-convex/src/App.test.tsx`                   | partial; no headless hook harness exists                        |
| `tests/static/{schema-scope,contracts,exports}.test.ts`                                           | test                                     | batch / static analysis                 | current `tests/static/{schema-scope,contracts}.test.ts`          | exact                                                           |
| `fixtures/packed-vite-convex/**` and packed gate                                                  | consumer fixture / test                  | file-I/O / build / request-response     | current fixture and `tests/integration/packed-artifact.test.mjs` | exact                                                           |

Grouped rows name capability families, not permission to create barrel-style generic APIs. Each
public operation remains a narrow intent with explicit validators. Generated files under
`src/component/_generated/` change through Convex code generation and should not be hand-edited or
treated as pattern sources.

## Pattern Assignments

### `src/component/schema.ts` (model / store, CRUD / pub-sub / batch)

**Analog:** `src/component/schema.ts:4-45`.

Copy the existing mandatory-scope and scope-leading-index shape:

```typescript
export default defineSchema({
  boards: defineTable({
    scopeId: v.string(),
    slug: v.string(),
    name: v.string(),
    sortOrder: v.number(),
  })
    .index("by_scope_order", ["scopeId", "sortOrder"])
    .index("by_scope_slug", ["scopeId", "slug"]),
  votes: defineTable({
    scopeId: v.string(),
    postId: v.id("posts"),
    actorId: v.id("actors"),
  }).index("by_scope_post_actor", ["scopeId", "postId", "actorId"]),
});
```

Every Phase 2 row—tags and joins, activity, merge/job state, changelog links, subscriptions,
logical events, inbox rows, delivery rows, and search projections—must have required `scopeId`.
Every database index begins with it; every search index includes it as an equality filter. Extend
the `posts` record additively with the six-status representation, lifecycle/moderation fields,
`currentStatusSince`, stored Trending score, and explicit visibility/search keys.

Preserve canonical-membership-plus-projection semantics from votes. Do not represent tags,
subscriptions, changelog links, or notification recipients as unbounded arrays on parent rows.
Use scoped join rows with bounded cardinality and exact indexes. The per-tag search table is a
materialized projection, not the source of tag membership truth.

### `src/component/validators.ts` and `src/client/contracts.ts` (contract, transform)

**Analogs:** `src/component/validators.ts:37-60,62-108` and
`src/client/contracts.ts:4-16,43-85,227-280`.

Retain explicit validators, version discriminants, branded opaque IDs, and grouped capability
interfaces:

```typescript
declare const idBrand: unique symbol;
type BrandedId<Name extends string> = string & { readonly [idBrand]: Name };

export type PostPageDto = Readonly<{
  contractVersion: 1;
  page: PostDto[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
}>;

export interface ParticipationCapabilities<Context> {
  setVote(
    ctx: Context,
    args: { postId: PostId; desired: boolean },
  ): Promise<PostDto>;
}
```

Phase 2 should add branded IDs and versioned DTOs for tags, activity, changelog, notifications,
logical delivery events, and leases. Preserve the distinction between cursor page DTOs and the
bounded `{ items, hasMore }` search/similar DTO; search must not inherit pagination fields merely
because feeds have them. Direct lookup becomes an explicit `post | merged | notFound`
discriminated result.

Browser intent validators contain only entity IDs, content, filters, and desired actions. They
must never contain `scopeId`, verified actor facts, `isAdmin`, provider records, recipient contact
data, or a preview/confirmation authority flag. Extend the closed public error union explicitly
for authentication, authorization, validation, not-found, rate-limit, conflict, transient/network,
and unknown cases; `RATE_LIMITED` carries operation and `retryAfterMs`.

### `src/component/model/{visibility,scope,views,errors}.ts`

**Analogs:** `src/component/model/scope.ts:25-48`, `views.ts:27-56`, and `errors.ts:3-30`.

Direct IDs are normalized, loaded, scope-rechecked, and mapped to the same not-found result as an
invalid ID:

```typescript
export async function requirePostInScope(ctx, scopeId, postId) {
  requireScope(scopeId);
  const normalized = ctx.db.normalizeId("posts", String(postId));
  if (!normalized) notFound("post");
  const post = await ctx.db.get(normalized);
  if (!post || post.scopeId !== scopeId) notFound("post");
  return post;
}
```

DTO projection must continue joining scoped relations and explicitly selecting safe fields rather
than spreading documents:

```typescript
if (
  !board ||
  board.scopeId !== post.scopeId ||
  !actor ||
  actor.scopeId !== post.scopeId
) {
  throw new ConvexError({ code: "INVARIANT_VIOLATION" });
}
return {
  contractVersion: 1 as const,
  id: String(post._id),
  title: post.title,
  author: toActorDto(actor),
  totals: { votes: post.voteCount, comments: post.commentCount },
};
```

Phase 2 must extract one shared visibility predicate used before DTO projection in feeds, search,
similar suggestions, direct lookup/redirect resolution, roadmap, public changelog links, counts,
subscriptions, notification eligibility, and delivery. The predicate includes active lifecycle,
not archived/hidden, not a merge source, installation read policy, and current canonical target
visibility. Never implement slightly different visibility checks in each projection.

Activity, mention, and delivery DTOs resolve current safe actor state through `toActorDto`-style
helpers; append-only rows store opaque actor IDs, not display snapshots or contact PII.

### `src/component/model/{content,scoring}.ts` (utility, transform)

**Local analogs:** title/body normalization in `src/component/participation/posts.ts:14-31` and
comment normalization boundary in `src/component/participation/comments.ts:23-37`.

Keep normalization and validation in model helpers called before writes. Unlike Phase 1's simple
trim/length checks, Phase 2 content uses the parser-backed allowlist from
`02-RESEARCH.md:546-562`: bounded normalized Markdown, closed AST node types, no HTML/image/media
nodes, and only hardened `http`, `https`, and `mailto` links. Plain-text titles/names retain the
same trim/nonempty/bounded pattern.

Trending and similar-post scoring also belong in pure model helpers so model tests can freeze
constants, normalization, score ordering, and stable tie breaks. Do not compute elapsed-time decay
at read time; mutations transactionally update the stored additive-time Trending score. Convex
search selects a bounded candidate set, while the library-owned scorer deterministically reranks
similar suggestions.

### `src/component/public/{feeds,search,roadmap,changelog}.ts`

**Analog:** `src/component/public/posts.ts:34-70,74-86,89-113`.

For Newest, Top, Trending, roadmap columns, activity, published changelog, and inbox feeds, copy
the component-compatible paginator pattern:

```typescript
export const listPosts = query({
  args: { scopeId: v.string(), paginationOpts: paginationOptsValidator },
  returns: postPageDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    const result = await paginator(ctx.db, schema)
      .query("posts")
      .withIndex("by_scope_board_state", (q) =>
        q
          .eq("scopeId", args.scopeId)
          .eq("boardId", board._id)
          .eq("lifecycleState", "active"),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map((post) => toPostDto(ctx, post)),
    );
    return { contractVersion: 1 as const, ...result, page };
  },
});
```

Validate `numItems` against a server maximum before querying. Put scope, visibility, board,
status, and total-order keys in the index range; never filter a page after pagination. Roadmap
uses three independently paginated status queries, not one combined list or a roadmap table.

Search and similar suggestions deliberately do **not** copy the paginator call. Their closest
local analog is the bounded count pattern at `public/posts.ts:89-113`: query a selective index,
take `HARD_LIMIT + 1`, return only the hard limit, and report truncation honestly. Use native
`withSearchIndex(...).take(...)` exactly as assigned by `02-RESEARCH.md:300-339`; helper and native
cursor pagination are both unsupported for component search on the pinned platform.

### `src/component/participation/{posts,comments,votes,subscriptions}.ts`

**Analogs:** `participation/posts.ts:33-62`, `comments.ts:14-50`, and `votes.ts:11-52`.

Copy the narrow-intent sequence: validate trusted scope, scope-check the target, normalize domain
input, resolve/upsert the verified actor, write all invariant-related rows and projections in one
transaction, and return an explicit DTO:

```typescript
const post = await requirePostInScope(ctx, args.scopeId, args.postId);
const actorId = await upsertActor(ctx, args.scopeId, args.actor);
const membership = await findVoteMembership(ctx, {
  scopeId: args.scopeId,
  postId: post._id,
  actorId,
});
const projection = projectVoteState(
  membership !== null,
  args.desired,
  post.voteCount,
);
if (!projection.membershipChanged) return await toPostDto(ctx, post);
```

Subscriptions should copy desired-state vote semantics: one scoped membership per post/actor,
idempotent subscribe/unsubscribe, and a durable explicit opt-out that auto-subscribe-on-comment
cannot overwrite. Comment and status/changelog mutations atomically capture activity and logical
notification events. Rate-limit consumption occurs in the committing participation mutation;
expected chargeable domain failures return a typed failure rather than throwing and rolling back
the charge.

Discussion lock, archive state, and fixed status are independent fields. Reuse scope/visibility
guards, but do not copy Phase 1's rule that every inactive post rejects every participation action:
locked discussion blocks non-admin comments while votes/subscription remain valid, and Closed
status triggers no implicit lock, hide, or publication.

### `src/component/admin/{posts,tags,merge,changelog,activity}.ts`

**Analogs:** `src/component/admin/installation.ts:16-55,57-101` and
`src/component/admin/actors.ts:9-19`.

Admin component functions remain narrow, validator-complete operations. Authorization is still
performed by the trusted host wrapper on every call; the component operation receives only
server-derived scope plus intent data, then rechecks scope and invariants. Copy the existing
bounded-set validation style:

```typescript
requireScope(args.scopeId);
if (args.boards.length < 1 || args.boards.length > MAX_BOARDS) {
  invalidInput(`boards must contain between 1 and ${MAX_BOARDS} entries`);
}
const existingBoards = await ctx.db
  .query("boards")
  .withIndex("by_scope_order", (q) => q.eq("scopeId", args.scopeId))
  .take(MAX_BOARDS + 1);
```

Apply this to tag assignment ceilings, changelog link ceilings, merge-history snapshot size, and
all inline relation work. Status change, board move, lock/unlock, archive/restore, tag assignment,
merge, and changelog publish/unpublish each have explicit intent functions and append one typed
activity record. Status writes transactionally update `currentStatusSince`; they never publish a
changelog entry, lock discussion, block votes, or remove links.

Merge needs a purpose-built state machine rather than a large transaction disguised as CRUD. It
unions vote/subscription memberships by actor, reparents bounded relation batches, reconciles
counters from membership truth, flattens redirects, and exposes the tombstone only at the final
atomic cutover. Public readers must never observe prepared canonical relations or a half-merged
source.

### `src/component/notifications/**` and `src/component/jobs/**`

**Partial local analog:** vote membership and projection consistency in
`src/component/participation/votes.ts:26-51`; **exact scheduled-job analog:** none.

Reuse the membership-as-truth principle: one immutable logical event is canonical, while inbox
and delivery rows are bounded derived materializations. Recipient/event uniqueness must be
represented by scope-leading indexes and idempotent guards, just as vote membership prevents
duplicate projection increments.

The actual job structure comes from `02-RESEARCH.md:341-379`: capture domain mutation, activity,
logical event, and a durable job/guard atomically; schedule one internal continuation only after
the guard exists; process conservative indexed batches; update cursor/state and schedule the next
batch in the same transaction. Never schedule one function per recipient or put recipient arrays
in scheduler arguments.

Delivery claim/ack/release are trusted server-only intents. Claims lease bounded rows and resolve
current non-PII `recipientKey`; ack/release require exact row ID plus lease owner/version token.
Lease expiry permits at-least-once redelivery, so the stable logical event ID is the host
idempotency key. Anonymized recipients are discarded at claim time.

### `src/component/feedback.ts` (route / export surface, transform)

**Analog:** `src/component/feedback.ts:1-12`.

Continue exporting named narrow operations from capability modules:

```typescript
export { setVote } from "./participation/votes.js";
export { addComment } from "./participation/comments.js";
export { countPosts, getPost, listPosts } from "./public/posts.js";
```

Do not replace the explicit export surface with a generic dispatcher. Public, participation,
admin, internal-job, notification, and trusted delivery functions remain visibly separated so
generated component bindings and host clients cannot accidentally expose internal operations.

### `src/client/{internal,index,server}.ts` (trusted host controller factories)

**Analogs:** `src/client/internal.ts:21-45,47-70,101-194`, `src/client/index.ts:44-60`, and
`src/client/server.ts:11-23`.

Preserve the order of trust derivation on every operation:

```typescript
const scopeId = await resolveRequiredScope(options.resolveScope, ctx);
const actor = await options.resolveActor(ctx);
if (!actor) throw new Error("AUTHENTICATION_REQUIRED");
return await ctx.runMutation(component.participation.posts.createPost, {
  scopeId,
  actor,
  boardId: args.boardId,
  title: args.title,
  body: args.body,
});
```

Admin calls independently run `authorizeAdmin(ctx)` after scope resolution and before the
component call. Reads derive installation visibility/auth state without creating actors. The fixed
client continues to use the private normal-install scope; the scoped server client resolves scope
on every call. Add capability groups for roadmap, changelog, notifications, and trusted delivery
without widening browser intents or turning the product into a multi-product API.

Claim/ack/release delivery capabilities belong on an explicitly server-only surface. They must
not be reachable through the browser-oriented grouped bindings consumed by headless React.

### `src/react/{provider,bindings,hooks,index}.ts(x)`

**Closest local boundary:** `fixtures/packed-vite-convex/src/App.tsx:29-50`; no reusable React
provider/hook analog exists.

The fixture proves current consumer-generated function references and Convex `"skip"` gating,
but its component-local state is not a pattern to package:

```typescript
const createPost = useMutation(api.afferent.createPost);
const posts = useQuery(api.afferent.listPosts, boardId ? { boardId } : "skip");
```

Create one `AfferentProvider` over injected grouped host references and a provider-neutral
`loading | authenticated | unauthenticated` adapter. Public bindings are baseline; optional
capability groups yield a typed unsupported/not-configured state. Admin affordance gating comes
from an injected trusted query, never an `isAdmin` prop.

For cursor feeds, wrap `convex-helpers/react` `usePaginatedQuery` and expose its accumulated
`results`; do not maintain a second page array or dedupe by ID. For bounded search/similar, debounce
arguments and expose the server `hasMore` signal without inventing cursors. Mutation hooks own
pending/error/reset and duplicate-submit guards. Only vote, subscription, and mark-read use native
optimistic updates. Account/session generation changes clear every actor-sensitive query and
optimistic overlay.

The package should export domain hooks, not a generic `useAfferentQuery`/`useAfferentMutation`
escape hatch and not one hook per raw component function.

### Test suites and fixtures

**Analogs:**

- component harness: `tests/component/posts.test.ts:1-35`;
- concurrency/membership truth: `tests/component/participation.test.ts:25-71,90-138`;
- scope/authority order: `tests/integration/scope-matrix.test.ts:27-78,80-210`;
- reactive pagination: `tests/integration/pagination-backend.test.ts:69-145`;
- schema audit: `tests/static/schema-scope.test.ts:6-31`;
- privacy/contract audit: `tests/static/contracts.test.ts:73-117,142-202`; and
- packed gate: `tests/integration/packed-artifact.test.mjs:33-96`.

Continue registering all component modules with `import.meta.glob` and exercising the public host
client rather than calling implementation helpers as the main behavior proof:

```typescript
const modules = import.meta.glob("../../src/component/**/*.ts");
const backend = convexTest(schema, modules);
const client = createAfferentClient(api as unknown as ComponentApi, {
  resolveActor: async () => actor,
  authorizeAdmin: async () => true,
  isAuthenticated: async () => authenticated,
});
```

Extend every relevant proof across two identical scopes. Cross-scope and nonexistent IDs must
remain indistinguishable:

```typescript
await expect(
  beta.read.getPost(ctx as never, { postId: alphaPost.id }),
).rejects.toMatchObject({ data: { code: "NOT_FOUND", resource: "post" } });
```

Static schema tests already enumerate all tables, database indexes, and search indexes. Preserve
that structural audit so new Phase 2 definitions cannot omit scope:

```typescript
for (const [tableName, table] of Object.entries(schema.tables)) {
  expect(table.validator.fields.scopeId).toBeDefined();
  for (const index of [...table.indexes, ...table.stagedDbIndexes]) {
    expect(index.fields[0]).toBe("scopeId");
  }
  for (const search of [...table.searchIndexes, ...table.stagedSearchIndexes]) {
    expect(search.filterFields).toContain("scopeId");
  }
}
```

Add real-backend tests for the platform seams mocks simplify: bounded component search and its
pagination-negative contract, scheduled continuation crash/resume, rate-limit commit/rollback and
OCC retry accounting, and concurrent fenced outbox claims. Model tests freeze content/scoring/
dedupe helpers. React tests cover every discriminated state, helper pagination mapping, debounce,
allowed optimism rollback, duplicate-submit guards, and account-switch clearing.

Finally, extend the packed consumer and package export audit so the React entry point, declarations,
runtime dependencies, generated host references, and all documented Phase 2 exports resolve from
the tarball. Passing against workspace source is not evidence.

## Shared Patterns

### Authority derivation

**Source:** `src/client/internal.ts:34-45,101-194` and
`tests/integration/scope-matrix.test.ts:27-78`.

Apply to every host wrapper. Resolve trusted scope first, then actor or admin permission as the
capability requires, then call the component. No browser argument supplies `scopeId`, identity,
admin permission, recipient contact, or provider state. The component never reads host `ctx.auth`.

### Scope, visibility, and not-found equivalence

**Source:** `src/component/model/scope.ts:25-48`, `public/posts.ts:43-61`, and
`tests/integration/scope-matrix.test.ts:140-186`.

Every row/index/search path is scope-complete. Every direct ID is rechecked. One centralized
visibility predicate applies to all primary and secondary projections. Hidden canonical targets
also hide redirects; public errors and empty projections never reveal whether a cross-scope,
archived, withdrawn, hidden, or nonexistent entity exists.

### Bounded reads and honest result metadata

**Source:** `src/component/public/posts.ts:21,47-70,89-113` and
`tests/integration/pagination-backend.test.ts:69-145`.

Cursor feeds use bounded helper pagination and preserve helper metadata. Non-cursor search and
bounded counts take one sentinel row beyond the documented cap and report `hasMore`; they never
label a capped value exhaustive. Filters live in indexes/search equality fields, never after a
scan or page.

### Canonical memberships and transactional projections

**Source:** `src/component/participation/votes.ts:26-51` and
`tests/component/participation.test.ts:45-71,90-138`.

Membership/join/event rows are truth; counters and materializations are projections updated only
when canonical state changes. Desired-state mutations are idempotent. Merge reconciles from
membership truth rather than adding counters. Domain write, activity, logical event, and initial
job guard are captured atomically.

### Versioned DTO privacy

**Source:** `src/client/contracts.ts:4-16,24-85`, `src/component/model/views.ts:10-56`, and
`tests/static/contracts.test.ts:99-117,142-202`.

All public contracts use opaque branded string IDs, explicit validators, version discriminants,
and DTO mappers. Never spread component documents. Never expose scope, external keys, provider
records, contact PII, raw relevance scores, internal job cursors, or unbounded history.

### Package resolution

**Source:** `package.json:17-47` and `tests/integration/packed-artifact.test.mjs:33-112`.

All new component/client/React exports and dependencies must work from a packed tarball in a clean
consumer. Keep provider packages out of runtime dependencies. Preserve current dirty package files
unless an implementation plan explicitly owns the reviewed Phase 2 dependency/export delta.

## No Exact Local Analog Found

| File family                                              | Missing local mechanism                                                 | Assigned authority                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| `src/component/public/search.ts` and similarity helper   | Component search exists nowhere in Phase 1                              | `02-RESEARCH.md:300-339,464-482,528-560` |
| `src/component/jobs/**`                                  | Phase 1 has no scheduler or durable continuation state                  | `02-RESEARCH.md:341-359,406-410`         |
| `src/component/notifications/**` outbox lease operations | Phase 1 has membership truth but no event/fan-out/lease pipeline        | `02-RESEARCH.md:361-379,494-508`         |
| `src/react/**`                                           | Only a consumer-local Vite component exists; no packaged headless layer | `02-RESEARCH.md:412-418,518-524,564-577` |
| parser-backed safe Markdown                              | Phase 1 only trims and bounds plain strings                             | `02-RESEARCH.md:449-455,546-562`         |

## Metadata

**Analog search scope:** all existing `src/`, `tests/`, and `fixtures/` TypeScript/TSX/MJS files,
plus Phase 1 `01-PATTERNS.md`, package metadata, Phase 2 context, research, roadmap, and requirements.

**Primary analog files fully read:** `src/component/schema.ts`, `public/posts.ts`,
`model/{scope,views,errors}.ts`, `participation/{posts,votes,comments}.ts`,
`admin/{installation,actors}.ts`, `src/component/validators.ts`, `src/component/feedback.ts`,
`src/client/{contracts,internal,index,server}.ts`, and the representative test/fixture files cited
above.

**Pattern extraction date:** 2026-07-16.

**Deferred by boundary:** copied shadcn UI and visual/accessibility implementation (Phase 3), hosted
showcase/sandbox/release/deployment work (Phase 4), multi-tag Boolean filtering, unmerge, mark-all
read, configurable limits, media/uploads, public activity, merge notification, and automatic
changelog publication.
