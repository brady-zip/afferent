# Architecture Research

**Domain:** Embedded product-feedback system as a Convex component and source-owned React UI toolkit
**Researched:** 2026-07-14
**Confidence:** MEDIUM-HIGH

> **Scope supersession (2026-07-30):** The two-instance demo architecture remains
> authoritative, but its runtime is now a clone-and-run anonymous local Convex
> development backend. Public demo hosting, Vercel/Convex Cloud deployment, preview,
> and remote-smoke architecture is retired. See
> `.planning/phases/04-hosted-production-release/04-SCOPE-PIVOT.md`.

## Standard Architecture

### System Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Browser (untrusted)                                                          │
│  Public UI   Admin UI   Headless hooks/providers   Copied shadcn source      │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │ host app's generated query/mutation refs
┌────────────────────────────────▼─────────────────────────────────────────────┐
│ Host Convex app (security boundary)                                          │
│  public wrappers   interaction wrappers   admin wrappers   demo wrappers      │
│         │                 │                    │                │              │
│  access policy     identity adapter      admin resolver   scope + quotas      │
│  ctx.auth / Convex Auth / Clerk / Better Auth / host tables / rate limiting  │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │ ctx.runQuery / ctx.runMutation
                                 │ validated DTOs, actor facts, opaque cursors
┌────────────────────────────────▼─────────────────────────────────────────────┐
│ Afferent Convex component (provider-neutral domain boundary)                 │
│  public reads  participation  moderation  roadmap  changelog  configuration  │
│         │              domain invariants + runtime validators                │
│  boards ─ posts ─ votes/comments ─ statuses ─ changelog links ─ actors       │
│         │        indexes/search indexes/counters/scheduler/storage           │
└──────────────────────────────────────────────────────────────────────────────┘

       Build/distribution: component source → npm package → host app
       UI distribution: canonical registry source → built JSON → consumer copy
       Showcase: Vite + Convex Auth → immutable public instance + scoped sandbox
```

Convex components are service-like boundaries inside one deployment: they own an
isolated schema, storage, scheduler, functions, and environment. Their public
functions are callable by the parent app through `components.afferent`, but become
internal references from a browser's perspective. This is a good fit for Afferent
only if the parent app remains the explicit ingress layer.

### Component Responsibilities

| Component | Responsibility | Typical implementation |
|-----------|----------------|------------------------|
| Afferent component | Own feedback-domain data and enforce domain invariants | `src/component/` schema plus narrow public query/mutation modules |
| Host client/wrapper | Convert component API into the host's public Convex API | `Afferent` client or `createAfferentApi` factory using `ctx.runQuery`/`ctx.runMutation` |
| Identity adapter | Resolve a verified host identity to provider-neutral actor facts | Adapter called only inside host functions; Convex Auth, Clerk, and Better Auth subpaths |
| Admin authorization resolver | Decide whether the current host user may invoke admin operations | Required host-supplied callback; never a component-owned role table |
| Access-policy guard | Apply installation policy consistently and defensively | Policy stored in component; wrapper authenticates, component checks required actor presence |
| Headless React package | Bind host-generated function references to reusable stateful hooks | Provider plus hooks accepting an `AfferentApiBindings` object |
| Copied shadcn UI | Deliver user/admin presentation without owning consumer styling | Canonical registry source compiled to static registry JSON and mirrored in examples |
| Hosted example | Prove installation, auth, UI, and complete workflow | Vite app, Convex Auth host wrappers, seeded showcase, private demo sandbox |
| Test/publish tooling | Verify the artifact consumers actually install | `convex-test`, real-backend smoke tests, registry fixture installs, `npm pack` smoke test |

### Data Ownership and Relationships

The component should own every record needed to reconstruct the feedback workflow.
The host should own users, sessions, organization membership, admin roles, and
provider-specific claims. Do not mirror full auth-provider user records into the
component.

```text
settings (one per internal scope)
  ├── access policy: public read / auth required per action
  └── product display defaults

actors (externalKey = provider namespace + stable subject)
  ├── posts.authorId
  ├── votes.actorId       UNIQUE(scopeId, postId, actorId)
  ├── comments.authorId
  └── changelogEntries.authorId

boards
  └── posts
       ├── statusId ── statuses (ordered; roadmapVisible flag)
       ├── votes
       ├── comments (flat or one-level replies in v1)
       └── changelogPostLinks ── changelogEntries
```

Recommended tables and notable fields:

| Table | Key fields / indexes | Notes |
|-------|----------------------|-------|
| `settings` | `scopeId` unique | Singleton in normal installations; stores access policy rather than compile-time options |
| `actors` | `(scopeId, externalKey)` unique | Snapshot only: display name/avatar and optional email; `externalKey` should include issuer/provider namespace to prevent collisions |
| `boards` | `(scopeId, slug)` unique; `(scopeId, order)` | Archive rather than hard-delete once referenced |
| `statuses` | `(scopeId, key)` unique; `(scopeId, order)` | Include `roadmapVisible`, terminal semantics, and display metadata; posts reference IDs, not mutable names |
| `posts` | board/status/order indexes; search index over denormalized `searchText` | Store `voteCount` and `commentCount` transactionally; keep moderation/publication state explicit |
| `votes` | `(scopeId, postId, actorId)` unique | Toggle mutation owns both vote row and post count update in one transaction |
| `comments` | `(scopeId, postId, creationTime)` | Store moderation state; avoid unbounded nesting |
| `changelogEntries` | `(scopeId, publishedAt)` and `(scopeId, slug)` | Draft/published state; do not infer entries automatically from post status |
| `changelogPostLinks` | `(scopeId, entryId)` and `(scopeId, postId)` | Many-to-many link avoids arrays that grow without bound |

All component IDs become strings at the parent-app boundary. Public contracts
should therefore expose branded string DTO fields such as `PostId`, not import
component-internal `Id<"posts">` types or leak raw database documents. Every
component public function needs explicit argument and return validators.

### Trust Boundaries

| Boundary | Trust decision | Required control |
|----------|----------------|------------------|
| Browser → host function | Browser arguments and UI state are untrusted | Host Convex functions expose only intended operations; never accept actor, admin, or sandbox scope claims from the browser |
| Auth provider → `ctx.auth` | Convex validates configured JWTs; provider claims still vary | Adapter selects a stable identifier and safe display snapshot; do not authorize from optional display claims |
| Host wrapper → component | Component necessarily trusts the parent app's asserted actor/admin path | Authenticate and authorize on every wrapper invocation; use separate wrapper modules for public, interaction, and admin APIs |
| Component API → domain tables | Parent cannot directly read component tables | Component rechecks access policy and domain invariants; expose intent methods, not generic CRUD |
| Admin UI → admin API | Rendering an admin route is not authorization | The admin resolver runs server-side for every query and mutation, including reads |
| Demo visitor → sandbox | Authenticated visitors are still mutually untrusted | Derive scope from verified identity server-side, cap data, rate-limit writes, and test two-user isolation |
| Component → host callbacks | Function handles permit callbacks into the app | Add only for a concrete feature; validate payloads and document retry/idempotency behavior |

The component cannot independently prove that an `isAdmin` boolean is truthful.
Avoid such booleans in browser-facing args and avoid a generic component call that
takes arbitrary permissions. Instead, the host's admin wrapper authorizes first
and then calls a distinct component admin function. Deployment owners can still
invoke public component functions from trusted backend code or tooling; that is
part of the parent-component trust model, not an end-user escape hatch.

## Recommended Project Structure

```text
.
├── src/
│   ├── component/
│   │   ├── _generated/              # component codegen
│   │   ├── convex.config.ts
│   │   ├── schema.ts
│   │   ├── validators.ts            # boundary DTOs and reusable validators
│   │   ├── model/                    # internal domain helpers and invariants
│   │   ├── public/                   # boards, posts, roadmap, changelog reads
│   │   ├── participation/            # submit, vote, comment
│   │   ├── admin/                    # moderation, settings, statuses, changelog
│   │   └── internal/                 # seed/cleanup jobs and implementation helpers
│   ├── client/
│   │   ├── index.ts                  # Afferent client / wrapper factory
│   │   ├── contracts.ts              # ActorInput, AccessPolicy, API DTOs
│   │   └── auth/
│   │       ├── convex-auth.ts
│   │       ├── clerk.ts
│   │       └── better-auth.ts
│   ├── react/
│   │   ├── provider.tsx              # accepts host API bindings
│   │   ├── bindings.ts               # generic FunctionReference contract
│   │   ├── hooks/                    # public and admin hooks
│   │   └── index.ts
│   └── test.ts                       # component registration utilities
├── registry/
│   ├── registry.json
│   ├── default/
│   │   ├── afferent-user/            # copied user-facing block/source
│   │   └── afferent-admin/           # copied admin block/source
│   └── fixtures/                     # clean consumer projects for install tests
├── example/
│   ├── convex/
│   │   ├── convex.config.ts          # showcase + sandbox component instances
│   │   ├── afferentPublic.ts         # public/interaction wrappers
│   │   ├── afferentAdmin.ts          # server-authorized wrappers
│   │   ├── afferentSandbox.ts        # identity-derived scope/reset/quotas
│   │   └── auth.ts                   # Convex Auth integration
│   └── src/                          # Vite routes and example composition
├── tests/
│   ├── component/                    # domain behavior under convex-test
│   ├── adapters/                     # provider contract tests
│   ├── integration/                  # installed-package + real backend tests
│   ├── registry/                     # shadcn CLI install and typecheck
│   └── e2e/                          # public/admin and cross-user isolation
├── dist/                             # npm artifacts
└── package.json                      # exports for root/config/component/react/auth/test
```

### Structure Rationale

- **`src/component/` is provider-free:** it can be tested as a pure feedback
  domain and cannot accidentally depend on host auth tables or environment.
- **`src/client/` is the host bridge:** this is where `ctx.auth`, provider helpers,
  host authorization, and component handles meet. Provider modules remain optional
  subpath imports rather than dependencies of the component runtime.
- **`src/react/` depends on bindings, not generated app code:** a reusable package
  cannot import a consumer's `convex/_generated/api`; the host passes its function
  references into `AfferentProvider`.
- **`registry/` is canonical source:** repository examples should consume or
  mechanically mirror this source. Do not maintain a second hand-edited admin UI.
- **`example/` installs built package exports:** testing source-relative imports
  misses export-map, generated-code, and packaging failures.

## Architectural Patterns

### Pattern 1: Authenticated Host Wrapper / Provider-Neutral Actor

**What:** Resolve identity and admin permission in a host function, normalize it,
then call the component with only the minimum trusted facts it needs.

**When to use:** Every mutation and every non-public read. Public reads may have a
null actor, subject to installation policy.

**Trade-offs:** Adds one explicit wrapper layer, but it is required by component
isolation and makes authorization reviewable. It avoids coupling stored data to
Convex Auth, Clerk, or Better Auth.

```typescript
type ActorInput = {
  externalKey: string; // e.g. `${issuer}|${subject}`; chosen server-side
  displayName?: string;
  avatarUrl?: string;
};

export const createPost = mutation({
  args: createPostArgs,
  returns: postDto,
  handler: async (ctx, args) => {
    const actor = await identityAdapter.requireActor(ctx);
    return await afferent.createPost(ctx, { actor, ...args });
  },
});

export const updateStatus = mutation({
  args: updateStatusArgs,
  returns: postDto,
  handler: async (ctx, args) => {
    await authorizeAdmin(ctx); // host-owned decision on every request
    return await afferent.admin.updateStatus(ctx, args);
  },
});
```

Adapters should share a small contract rather than a universal auth abstraction:

- Convex Auth adapter uses its server helper/user lookup to form a stable key.
- Clerk adapter uses verified `ctx.auth.getUserIdentity()` data; claim availability
  is host configuration, so authorization must not assume optional claims.
- Better Auth adapter uses the component client's session-validating user lookup
  when identity freshness matters, then normalizes its user ID.
- Admin authorization is always a separate required host callback. An identity
  adapter must never silently imply admin rights.

### Pattern 2: Narrow Intent APIs with Defense in Depth

**What:** Component functions represent domain actions (`toggleVote`,
`publishChangelogEntry`) rather than table operations. Participation functions
check installation access policy and actor presence even though the wrapper also
authenticates.

**When to use:** All component boundaries.

**Trade-offs:** More functions and validators, but invariants remain centralized
and host mistakes are less likely to expose data.

```typescript
// Component function: no `isAdmin` arg, no arbitrary patch object.
export const publish = mutation({
  args: { scopeId: v.string(), entryId: v.id("changelogEntries") },
  returns: changelogEntryDto,
  handler: async (ctx, { scopeId, entryId }) => {
    const entry = await requireEntryInScope(ctx, scopeId, entryId);
    return publishDraft(ctx, entry);
  },
});
```

Use separate component namespaces (`public`, `participation`, `admin`) to make
review and wrapper mounting straightforward. This naming is organizational, not
an independent authorization mechanism.

### Pattern 3: Transactional Denormalization for Read Models

**What:** Store vote/comment counts and searchable text on posts, updating them in
the same component mutation as source rows. Use ordered status and board indexes
to serve the UI without joins or full scans.

**When to use:** Counts and sort keys shown on every board card; roadmap grouping;
duplicate vote prevention.

**Trade-offs:** Mutations do more work and all write paths must preserve counters.
The benefit is bounded, reactive reads. A child Aggregate component is justified
only when rank/range aggregate queries exceed simple per-post counters.

```typescript
const existing = await voteByActor(ctx, scopeId, postId, actorId);
if (existing) {
  await ctx.db.delete(existing._id);
  await ctx.db.patch(postId, { voteCount: Math.max(0, post.voteCount - 1) });
} else {
  await ctx.db.insert("votes", { scopeId, postId, actorId });
  await ctx.db.patch(postId, { voteCount: post.voteCount + 1 });
}
```

All component writes must pass through domain mutations. Direct dashboard edits
can corrupt denormalized counters; document repair tooling and test invariants.

### Pattern 4: Binding Injection for Headless React

**What:** Consumers mount their own app-level query/mutation references and pass a
typed binding object to Afferent's React provider. Hooks never know which auth
provider is installed and never import the consumer's generated API.

**When to use:** Every reusable hook and all copied UI.

**Trade-offs:** Installation includes a small binding file, but this is stable
across package upgrades and permits consumers to rename or selectively expose host
functions.

```typescript
const bindings = createAfferentBindings({
  listPosts: api.afferentPublic.listPosts,
  createPost: api.afferentPublic.createPost,
  updateStatus: api.afferentAdmin.updateStatus,
});

<AfferentProvider api={bindings}>{children}</AfferentProvider>;
```

Keep router, toast, and navigation concerns injectable. Copied blocks may offer
defaults, but headless hooks should not require React Router or Vite.

### Pattern 5: Explicit Demo Scope as a Constrained Escape Hatch

**What:** Normal installations bind all calls to one constant internal scope. The
demo installs a separate sandbox component instance and uses a server-derived
scope such as a hash of the verified user key. Every sandbox table/index includes
that scope.

**When to use:** Only the hosted per-user sandbox and test fixtures.

**Trade-offs:** Dynamic per-user component instances do not exist; without a
scope, a shared deployment cannot provide private sandboxes. Scoped mode slightly
weakens the conceptual "one product per installation" invariant, so it should be
an explicit, non-default client constructor and not marketed as multi-product
tenancy. The roadmap must acknowledge this requirement tension rather than hiding
it.

Use two installed component instances in the demo:

1. `afferentShowcase`: one default scope, seeded public read experience, mutation
   wrappers restricted to maintainers.
2. `afferentSandbox`: identity-derived scopes, bounded seeded data, visitor admin
   rights only within their own derived scope, reset support, quotas, and cleanup.

Never accept `scopeId` from a browser. A reset mutation must derive it again from
the current identity. For a small bounded seed, synchronous delete-and-reseed is
acceptable; if data grows, use generation switching plus scheduled batched cleanup.

## API Surface

### Component-Internal Public Surface (Callable Only by Parent Code)

| Namespace | Representative operations | Actor / authorization expectation |
|-----------|---------------------------|-----------------------------------|
| `public` | list/get boards and posts; search posts; roadmap; published changelog; comments | Nullable actor; component enforces read policy and publication/moderation filters |
| `participation` | create post; edit own post; toggle vote; add/edit own comment | Required normalized actor; component enforces action policy and ownership |
| `admin` | settings; board/status management; moderation; status transitions; changelog draft/publish/link | Called only after host authorization; component enforces invariants, not host roles |
| `sandbox` or internal tools | seed/reset/cleanup a derived scope | Do not mount in normal consumer API; demo host derives scope and applies quotas |

### Host-App Public Surface

Mount three obvious files or returned groups rather than one all-powerful endpoint:

- **Read API:** safe browser queries with only IDs, slugs, filters, and cursors.
- **Participation API:** authenticated mutations; wrapper constructs actor input.
- **Admin API:** every query and mutation invokes the host's admin resolver.

Return stable DTOs and opaque cursors. Avoid exposing a generic `call` function,
component `FunctionHandle`s, raw scope IDs, provider tokens, auth claims, full
actor emails, or internal moderation metadata in public responses.

## Data Flow

### Authenticated Participation Request

```text
click Vote
  → useToggleVote() calls host mutation reference
  → host wrapper obtains verified identity
  → adapter returns stable ActorInput
  → wrapper calls component participation.toggleVote
  → component checks access policy + post visibility
  → upsert actor snapshot + insert/delete unique vote + update count transactionally
  → Post DTO returns through host wrapper
  → reactive board query updates subscribed clients
```

### Admin Request

```text
admin screen subscribes to host admin query
  → wrapper calls authorizeAdmin(ctx)
  → resolver checks host-owned membership/role data
  → wrapper calls component admin query
  → component returns admin DTO

status mutation follows the same authorization path
  → component validates post/status are in same scope
  → mutation changes status
  → public roadmap subscriptions update if roadmap visibility changed
```

### Provider-Specific Identity Flow

```text
Auth provider login → Convex client token → Convex validates token
     → host `ctx.auth` / provider server helper
     → Afferent identity adapter
     → { externalKey, safe display snapshot }
     → component-local actor row
```

The provider user ID is a foreign identity string, not a cross-component Convex
document ID. This matters because component IDs cannot validate IDs from host or
other component tables.

### Sandbox Flow

```text
signed-in demo visitor
  → host derives scopeKey from verified identity (never request args)
  → ensureSeeded(scopeKey) with idempotent marker
  → all sandbox component calls include derived scopeKey
  → reset(scopeKey) deletes/replaces only that scope's bounded dataset
  → scheduled cleanup removes stale scopes if retained long-term
```

### React State Management

Convex query subscriptions are the server-state store; do not add a parallel
client cache for posts, votes, or roadmap state. Local React state should be
limited to forms, filters, optimistic affordances, dialogs, and cursor state.
Mutations should rely on Convex's transactional updates/reactivity, with optimistic
updates only where the hook can roll back correctly.

## Pagination, Search, and Ordering

1. **Use index-first list queries.** Define indexes for actual screens, such as
   `(scopeId, boardId, statusId, creationTime)` and
   `(scopeId, boardId, voteCount)`. Do not use `.filter()` as a substitute for an
   index range; it still scans candidate documents.
2. **Never `.collect()` unbounded posts/comments/votes.** Use bounded `take` or
   cursor pagination and return compact DTOs.
3. **Use the component-compatible pagination path.** Current Convex authoring docs
   state built-in `.paginate()` does not work in components and recommend the
   `convex-helpers` paginator plus its React pagination hook. Keep cursors opaque
   and test insertions before the next page.
4. **Use one denormalized post search field.** Convex search indexes permit exactly
   one search field, so maintain `searchText = title + body` and add `scopeId`,
   board, and public/moderation state as equality filter fields where appropriate.
5. **Treat search order separately.** Full-text search returns relevance order;
   it cannot also sort by votes or creation time. The UI should label search
   results accordingly rather than pretending a sort control is honored.
6. **Spike search pagination on a real backend.** Official full-text docs describe
   pagination, while component docs warn about component pagination generally.
   Confirm the chosen helper/search combination before freezing the API. If they
   do not compose, ship bounded typeahead search first or implement a documented
   custom continuation strategy; do not improvise offset pagination.
7. **Counts are write-time data.** Board cards and posts should read denormalized
   counts. Do not query every vote/comment to compute totals.

## Scaling Considerations

| Scale | Architecture adjustments |
|-------|--------------------------|
| 0–1k active users | Single component, indexed lists, transactional counters, compact pages; no child aggregate needed |
| 1k–100k active users | Audit every query for bounded reads; add staged indexes, rate limits, batched moderation/cleanup, and real-backend load tests; consider Aggregate only for rankings/ranges that counters cannot answer |
| 100k+ active users | Partition hot list/read patterns carefully, cap highly contended writes, evaluate sharded counters or Aggregate, archive cold comments/events, and monitor Convex read/write limits before changing boundaries |

### Scaling Priorities

1. **First bottleneck: board and comment list scans.** Prevent with compound indexes,
   component-compatible cursors, bounded DTOs, and no per-row follow-up queries.
2. **Second bottleneck: hot post vote contention and derived counts.** Start with
   transactional counters because correctness is simple; move to a purpose-built
   aggregate/sharded design only when measurements require it.
3. **Third bottleneck: demo abuse and abandoned scopes.** Enforce per-user quotas,
   rate limits, a maximum seeded footprint, and cleanup independent of core
   production data.

## Anti-Patterns

### Auth Inside the Component

**What people do:** Import Convex Auth, Clerk, or Better Auth into component code
and attempt to call `ctx.auth` or provider tables.

**Why it is wrong:** Components do not have host `ctx.auth` and cannot validate IDs
from host/other component tables. It couples persisted feedback to one provider.

**Do this instead:** Authenticate in host wrappers and pass a provider-neutral,
server-derived actor key and display snapshot.

### Client-Supplied Identity, Admin, or Scope

**What people do:** Accept `userId`, `isAdmin`, or `scopeId` in browser mutation
arguments because the component API needs those values.

**Why it is wrong:** Any caller can impersonate another user, escalate privileges,
or access another demo sandbox.

**Do this instead:** Remove these fields from host function args and derive them
inside the function from verified auth and host-owned authorization data.

### Treating Component Function Names as Authorization

**What people do:** Assume putting functions under `admin/` makes them protected.

**Why it is wrong:** Namespace organization does not authenticate the parent app.

**Do this instead:** Authorize in every host admin wrapper; use namespaces to make
the audit surface obvious and component logic to enforce domain invariants.

### Leaking Internal Documents and IDs

**What people do:** Return schema documents or expose component-generated `Id`
types directly to React.

**Why it is wrong:** IDs become strings across component boundaries; schema fields
then become accidental public API and migrations become breaking changes.

**Do this instead:** Define versionable DTO validators and branded string IDs.

### Generic CRUD and Arbitrary Patch Objects

**What people do:** Expose `updatePost({ patch })` or direct table-style APIs.

**Why it is wrong:** It bypasses status, moderation, ownership, counter, and
publication invariants.

**Do this instead:** Expose intent-specific mutations with narrow validators.

### Maintaining Two UI Implementations

**What people do:** Hand-edit registry UI separately from the hosted example.

**Why it is wrong:** The showcase stops proving what consumers install.

**Do this instead:** Keep canonical registry source and generate/mirror outputs;
install it into a fixture and preferably the example in CI.

### Using a Shared Sandbox or Dynamic Component Per User

**What people do:** Share mutable demo data or assume component instances can be
created dynamically for each visitor.

**Why it is wrong:** A shared sandbox leaks/vandalizes data; component instances
are configured statically in the app component tree.

**Do this instead:** Use a separate statically installed sandbox component with a
server-derived internal scope and strict bounded-data controls.

### Premature Callback/Event Framework

**What people do:** Build a generic plugin bus for unresolved notifications,
integrations, analytics, and AI features.

**Why it is wrong:** Function-handle retries, idempotency, payload versioning, and
data disclosure become a major contract before a concrete consumer exists.

**Do this instead:** Keep stable read/action APIs and add typed callbacks or an
outbox only when a selected v1 feature requires one.

## Integration Points

### Auth and UI Integrations

| Integration | Pattern | Notes |
|-------------|---------|-------|
| Convex Auth | Host adapter using its server helper/user record | Canonical demo path; adapter returns stable key, not a component-crossing document ID |
| Clerk | Host adapter over verified Convex `UserIdentity` | Claims depend on Clerk configuration; use subject/issuer identity, not email as the primary key |
| Better Auth component | Host adapter using its component client/session-validating lookup | Keep dependency in optional adapter subpath; UI auth state should wait for Convex authentication |
| shadcn registry | Static catalog and item JSON generated from canonical source | Declare package and registry dependencies; use target placeholders; test CLI installation |
| React host app | `AfferentProvider` receives generated app API bindings | No router/auth-provider dependency in headless core |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| host wrappers ↔ component | `ctx.runQuery` / `ctx.runMutation` via component API | Functions are not directly browser-callable; all args/returns validated |
| auth adapters ↔ wrappers | Small async identity contract | Admin authorization remains separate and required |
| React hooks ↔ host API | Consumer-provided Convex function references | Supports renamed modules and selectively mounted APIs |
| copied UI ↔ hooks | Public hooks/context and local shadcn primitives | Source ownership and restyling remain with consumer |
| post lifecycle ↔ roadmap | Status reference plus `roadmapVisible` status metadata | No independent roadmap entity in v1 |
| changelog ↔ posts | Explicit link table | Publishing remains manual and intentional |
| demo public ↔ sandbox | Separate installed component instances | Prevents cleanup/reset logic from touching canonical showcase data |

## Testing Architecture

| Layer | What it proves | Important cases |
|-------|----------------|-----------------|
| Pure model tests | Validators and state-transition logic | access policy matrix, ownership, status transitions, slug/counter invariants |
| Component tests (`convex-test`) | Isolated schema and function behavior | unique votes, counters, moderation visibility, roadmap derivation, changelog linking |
| Host-wrapper contract tests | Security boundary and adapter normalization | anonymous/authenticated/admin paths for all three providers; no client identity/admin args |
| Real Convex integration tests | Backend semantics absent or simplified in the mock | component pagination, full-text relevance/cursors, scheduler/cleanup, function visibility |
| React tests | Binding/provider and hook behavior | loading/auth transitions, cursor state, error mapping, admin gating |
| Registry fixture tests | Copy-owned UI actually installs | build JSON, `shadcn add`, dependency resolution, typecheck/build in a clean fixture |
| Packaging smoke tests | Published exports are complete | `npm pack`, install tarball, import root/config/component/react/auth/test entrypoints |
| Demo E2E | Product workflow and isolation | public browse; submit→vote→moderate→roadmap→changelog; two users cannot read/reset each other's sandboxes |

`convex-test` is valuable but not a complete release gate: official docs note that
it does not enforce production limits, has simplified search semantics, and does
not run cron jobs. At least pagination/search, installed-package codegen, and demo
auth isolation need a real backend or deployed preview test.

## Publishing Architecture

Recommended npm export surface:

```text
@afferent/afferent                       host client and provider-neutral types
@afferent/afferent/convex.config.js      component definition
@afferent/afferent/_generated/component.js ComponentApi type
@afferent/afferent/react                 headless provider and hooks
@afferent/afferent/auth/convex-auth      optional adapter
@afferent/afferent/auth/clerk            optional adapter
@afferent/afferent/auth/better-auth      optional adapter
@afferent/afferent/test                  convex-test registration helpers
```

Keep React, Convex, and provider SDKs as compatible peer dependencies where
appropriate; mark provider-only peers optional so installing core does not force
all auth systems. The shadcn source is distributed through its registry, not as an
opaque runtime component package.

The build graph must be ordered:

```text
component schema/functions
  → component codegen
  → TypeScript/package build
  → example app imports built exports
  → example app codegen/typecheck
  → component + wrapper + React tests
  → shadcn registry build and clean-fixture install
  → npm pack clean-fixture install
  → deployed demo/E2E
  → npm publish + static registry publish + demo deploy
```

This order follows current Convex guidance and prevents the example app from
racing a stale component build. Release CI should compare or regenerate registry
artifacts, verify the package tarball contents/export map, and deploy the demo from
the same commit/tag as the npm and registry release.

## Dependency-Driven Build Order

1. **Contract and component skeleton:** establish package exports, codegen, DTO
   validators, scope semantics, and one product's core schema. Decide the explicit
   demo-scope exception now because retrofitting scope into every index is a
   rewrite.
2. **Secure host bridge:** implement provider-neutral actor contract, access-policy
   guards, wrapper groups, and admin resolver; add Convex Auth, Clerk, and Better
   Auth contract tests before building UI against unstable APIs.
3. **Feedback core/read models:** boards, statuses, posts, votes, comments,
   moderation, transactional counts, compound indexes, pagination, and search.
   Validate pagination/search against a real backend in this phase.
4. **Roadmap and changelog:** derive roadmap from status metadata; add manual
   changelog drafts/publishing and explicit post links on the stable post/status
   model.
5. **Headless React bindings:** build provider/hooks against mounted host API refs,
   with no provider or router coupling.
6. **Canonical copied UI and registry:** implement user/admin blocks on the
   headless layer, generate registry JSON, and install/typecheck it in fixtures.
7. **Hosted example and sandbox hardening:** wire Convex Auth, install separate
   showcase/sandbox instances, seed/reset derived scopes, add quotas/rate limits,
   deploy, and run cross-user E2E.
8. **Release hardening:** package tarball smoke tests, documentation for three auth
   paths, versioning/migration policy, release provenance, and synchronized npm,
   registry, and demo publication.

Do not postpone the host-wrapper security model, scope decision, index design, or
package export smoke test until the end; each shapes downstream UI and public API.

## Open Questions / Phase Research Flags

- **Demo isolation versus one-product invariant:** scoped sandbox mode is the most
  practical architecture, but it is a deliberate exception. Confirm whether the
  project accepts a hidden/test-only scope primitive or wants a separate demo
  backend strategy before schema finalization.
- **Component full-text pagination:** verify the exact `convex-helpers` and search
  composition on the current real backend. Confidence is MEDIUM because official
  pages describe each behavior separately but do not clearly document their
  combination.
- **Identity lifecycle/privacy:** decide whether actor snapshots retain email at
  all, and define anonymization behavior when host users are deleted. Stable keys
  must not be mutable email addresses.
- **Counter strategy:** transactional post counters are recommended for v1. Revisit
  Aggregate/ShardedCounter only with measured contention or ranking requirements.
- **Lifecycle extensions:** do not add callbacks until research selects a concrete
  notification/integration requirement; if selected, specify idempotency and
  disclosure rules first.

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Component isolation and wrapper boundary | HIGH | Explicit in current official Convex authoring and understanding docs |
| Package/test structure and build order | HIGH | Current official component template and authoring guide agree |
| Provider-neutral auth architecture | HIGH | Component auth limitation and all three host identity paths are documented; normalization design is a direct inference |
| Index/search recommendations | HIGH | Current official database index and full-text search docs |
| Component search pagination combination | MEDIUM | Component pagination warning and general search pagination docs require an implementation spike together |
| Per-user demo scope design | MEDIUM | It follows static component-instance constraints, but it intentionally bends the project's one-product model and needs a product decision |
| Scale thresholds | MEDIUM | Architectural guidance rather than measured Afferent workload data |

## Sources

- [Convex: Authoring Components](https://docs.convex.dev/components/authoring) — component API visibility, ID conversion, auth/environment isolation, wrappers, pagination, validation, build, exports, and testing. **HIGH confidence.**
- [Convex: Understanding Components](https://docs.convex.dev/components/understanding) — schema/storage/scheduler isolation, encapsulation, and transactional behavior. **HIGH confidence.**
- [Convex official component template](https://github.com/get-convex/templates/tree/main/template-component) — current source/client/react/example/test package structure and release scripts. **HIGH confidence.**
- [Convex: Auth in Functions](https://docs.convex.dev/auth/functions-auth) — verified identity access and provider-dependent claims in host functions. **HIGH confidence.**
- [Convex: Clerk integration](https://docs.convex.dev/auth/clerk) — Clerk token flow into Convex and server identity. **HIGH confidence.**
- [Convex Auth documentation](https://labs.convex.dev/auth) — Convex Auth server authorization path. **HIGH confidence.**
- [Convex + Better Auth: Authorization](https://labs.convex.dev/better-auth/basic-usage/authorization) and [Component Client](https://labs.convex.dev/better-auth/api/component-client) — session-validating user lookup and Convex-auth state timing. **HIGH confidence.**
- [Convex: Indexes](https://docs.convex.dev/database/reading-data/indexes/) — compound index ordering, bounded reads, and scan behavior. **HIGH confidence.**
- [Convex: Full Text Search](https://docs.convex.dev/search/text-search) — search/filter fields, relevance ordering, pagination, and limits. **HIGH confidence.**
- [Convex: Paginated Queries](https://docs.convex.dev/database/pagination) — cursor pagination and React query behavior; component-specific caveat comes from Authoring Components. **HIGH confidence.**
- [Convex: `convex-test`](https://docs.convex.dev/testing/convex-test) — test setup and mock limitations. **HIGH confidence.**
- [shadcn: Registry Getting Started](https://ui.shadcn.com/docs/registry/getting-started), [Registry Examples](https://ui.shadcn.com/docs/registry/examples), and [Registry API](https://ui.shadcn.com/docs/registry/api-reference) — source catalog, static JSON build, dependencies, placeholders, and validation. **HIGH confidence.**

---
*Architecture research for: Afferent*
*Researched: 2026-07-14*
