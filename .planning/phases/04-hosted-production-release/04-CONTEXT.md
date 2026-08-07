# Phase 4: Local Production Release - Context

**Gathered:** 2026-07-23
**Scope updated:** 2026-07-30
**Status:** Replanned for local-demo execution

> The user-approved scope pivot is authoritative over the original hosted-release
> research. See `04-SCOPE-PIVOT.md`. The historical directory slug remains unchanged so
> completed plan, summary, and commit references stay stable.

<domain>
## Phase Boundary

Ship the first public Afferent source release as one coherent, installable proof: a
clone-and-run Vite + Convex Auth application on an anonymous local Convex
development backend, an immutable signed-out showcase, authenticated private
admin sandboxes, complete installation and operations documentation, local
real-Convex browser verification, a locally packed component, and synchronized
source tag, shadcn registry, and documentation artifacts.

This phase hardens and publishes the component, headless bindings, and canonical
source-owned UI completed in Phases 1–3. It does not add a second product model,
general multi-tenancy, new feedback-domain features, a hosted demo, or an
Afferent SaaS.

</domain>

<decisions>
## Implementation Decisions

### Local evaluation experience

- **D-01 (superseded 2026-07-30):** The example is a Vite React SPA launched by
  one repository development command against a real anonymous local Convex
  backend. It requires no Convex login, project, deploy key, Vercel project, or
  hosted URL. Dependency installation may require network access; fully offline
  operation is not promised.
- **D-02:** The default, signed-out route is the immutable public showcase.
  Visitors can browse representative boards, post detail and discussion,
  roadmap statuses, and published changelog entries without authenticating.
  Showcase write and admin functions are not mounted for browser callers; this
  is server-enforced immutability, not disabled controls.
- **D-03:** A clearly labeled “My sandbox” path prompts for Convex Auth, then
  gives any authenticated visitor admin authority only inside that visitor's
  private sandbox. The sandbox exposes both public participation and admin
  screens so one visitor can exercise the complete feedback-to-changelog loop.
  Signing out removes all sandbox access.
- **D-04:** The host application may have Afferent-specific shell branding,
  navigation, sign-in state, and explanatory copy. The product screens
  themselves must use the canonical Phase 3 UI through public
  `afferent/react.js` bindings and the registry-generated/copied source; the
  local example must not become a third hand-maintained UI implementation.
- **D-05:** Showcase and sandbox seeds are deterministic and representative,
  including multiple boards, configurable statuses, posts with votes and
  comments, roadmap-visible work, notifications/activity, and published
  changelog entries linked to feedback. Seed content should explain the product
  through realistic examples rather than placeholder lorem ipsum.

### Sandbox authority, isolation, and lifecycle

- **D-06:** The demo installs two statically declared component instances:
  `showcase` uses the normal fixed one-product scope, while `sandbox` alone uses
  the server-only scoped client. The public package continues to present one
  installation as one product; dynamic sandbox scope is an explicit demo-only
  escape hatch and is not marketed as multi-product tenancy.
- **D-07:** Sandbox ownership starts from the stable verified Convex Auth user
  identity, normalized through the existing adapter and domain-separated with
  the existing SHA-256 scope derivation. The browser never supplies or receives
  `scopeId`, `userId`, `isAdmin`, generation, or cleanup authority. Every read,
  write, seed, reset, quota check, and cleanup request resolves authority again
  in a host-owned function.
- **D-08:** Use generation-fenced physical scopes. A host-owned lifecycle record
  maps the authenticated visitor's logical sandbox identity to an active
  generation-specific physical scope. Seed a pending generation completely,
  atomically switch the active pointer, then clean the retired physical scope
  asynchronously. Old scheduled continuations remain confined to the retired
  scope and cannot mutate a newly reset sandbox.
- **D-09:** First access performs an idempotent server-owned seed. Reset requires
  an explicit destructive confirmation, creates the same deterministic baseline
  in a new generation, reports progress/failure accessibly, and never exposes a
  partially deleted or partially seeded active sandbox. Concurrent reset/seed
  requests coalesce behind the lifecycle state rather than creating duplicate
  data.
- **D-10:** Sandboxes expire after seven days without authenticated activity.
  The UI explains that the environment is private, resettable, quota-limited,
  and ephemeral. Expiry and manual reset use the same generation-retirement
  machinery; a returning visitor receives a fresh deterministic sandbox.
- **D-11:** Enforce centralized per-sandbox quotas for total stored footprint
  and for user-controlled root resources, including boards, statuses, tags,
  posts, comments, votes/subscriptions, notification activity, merge work,
  and changelog content. Keep the Phase 2 per-actor/per-scope participation rate
  limits. Quota failures are structured, recoverable UI states that direct the
  visitor to delete content or reset; reset must not be an immediate bypass for
  abuse throttles.
- **D-12:** Cleanup is an internal, leased, resumable, bounded operation. It must
  account for all 26 currently scoped component tables, including work/job and
  projection tables, and it must tolerate already-deleted records and retries.
  A schema/table coverage assertion fails when a new scoped table has no cleanup
  disposition.
- **D-13:** Rate-limiter child-component state is part of sandbox lifecycle
  accounting. Retiring/expiring a physical scope clears the scope-keyed limiter
  shards and all actor-keyed shards for that retired scope after preserving the
  keys needed for cleanup. Manual reset does not clear the visitor's live abuse
  budget. Stale merge, fanout, and tag-cleanup continuations must either observe
  their retired generation/job state and stop or remain harmlessly isolated in
  the retired physical scope.
- **D-14:** Exact numeric storage caps, cleanup batch sizes, lease duration, and
  coarse activity-touch interval may be calibrated from the deterministic seed
  footprint and real Convex limit tests. They must be centralized, documented,
  low enough to bound worst-case storage, high enough to complete every demo
  workflow, and covered by boundary tests; they are not scattered magic
  numbers.

### Artifact and browser proof

- **D-15 (updated 2026-07-30):** Release proof runs against the exact consumer
  artifacts, not repository source aliases: build and pack `afferent`, install
  the tarball into a clean Vite/Convex consumer, install the generated UI from
  the public registry shape, run Convex codegen/typecheck/build, and launch that
  consumer candidate locally. The user-facing demo command and acceptance gate
  must resolve the same public exports and registry files as the release
  candidate.
- **D-16 (updated 2026-07-30):** A real anonymous local Convex backend is a
  release gate for component search and pagination, scheduled cleanup,
  seed/reset, authenticated wrappers, and browser workflows. `convex-test`
  remains a fast lower layer but cannot satisfy the local-demo acceptance
  requirement. Remote preview/production mode is removed.
- **D-17:** Playwright drives one complete private-sandbox journey:
  sign in, browse seeded feedback, submit, vote/comment, perform admin triage and
  moderation, update roadmap status, publish a linked changelog entry, observe
  notifications, reset, and verify the baseline is restored. Public tests also
  prove anonymous showcase browsing and rejection of every showcase write.
- **D-18:** The adversarial suite uses two simultaneously authenticated users
  with deliberately colliding slugs/titles and forged cross-scope IDs. It covers
  direct reads, lists, search, counts, subscriptions/reactive updates, every
  participation/admin mutation, seed, reset, quota state, expiry, and cleanup.
  No record, ID, count, search hit, notification, scheduled continuation, or
  reset effect may cross users.
- **D-19:** Installed-artifact accessibility remains a release gate: keyboard
  completion of showcase and admin journeys, focus restoration, status
  announcements, 200% zoom/reflow, contrast/forced-color checks, and automated
  axe checks run against the actual local registry-installed UI. Phase 3's
  explicit human aesthetic review remains human judgment rather than being
  falsely automated.

### Documentation and supported integrations

- **D-20:** Build Markdown-first VitePress documentation under `docs/`, with the
  root README serving as a concise installation and project entry point. The
  published docs cover installation, component mounting, access policy,
  generated host wrappers, headless React, shadcn registry installation,
  customization, testing, host-application deployment, troubleshooting, and
  upgrades. A separate local-demo guide owns anonymous backend bootstrap.
- **D-21:** Convex Auth is the runnable local reference. Convex Auth, Clerk, and
  Convex Better Auth each receive a provider-specific guide and an executable
  fixture/conformance path that derives a provider-neutral actor in host code
  and authorizes admin separately. No guide may imply that a browser flag,
  provider record, or component-local auth check grants authority.
- **D-22:** Documentation examples are tested as code. Package imports compile
  from the tarball, registry commands install in a clean Vite consumer, all
  auth-wrapper examples typecheck, and copied UI compatibility is stated as an
  explicit Afferent package range.
- **D-23:** Upgrade documentation defines semantic-versioning behavior,
  versioned DTO/API compatibility, additive migration expectations, copied UI
  diff/migration guidance, and rollback/recovery steps. The first release
  freezes a persisted-data and public-API baseline fixture so subsequent
  releases can prove upgrades even though no prior public Afferent version
  exists yet.

### Release and version synchronization

- **D-24 (updated 2026-08-07):** npm-registry publication is removed from v1.
  Do not claim the unscoped `afferent` name, bootstrap a placeholder, register a
  trusted publisher, or publish a package. Future npm distribution requires a
  new milestone decision.
- **D-25 (updated 2026-08-07):** Use Changesets only to version the private
  source package and changelog. The root manifest is `private: true`, has no
  `publishConfig`, and remains locally packable for exact clean-consumer proof.
- **D-26 (updated 2026-08-07):** Publication is tag/commit coherent. The local
  tarball evidence, generated registry catalog/items, docs, source examples,
  release notes, and compatibility metadata all identify the same version and
  source commit. The local demo is compatibility-tested from that source but is
  not a separately deployed or badged version surface.
- **D-27 (updated 2026-08-07):** Release order is verify candidate → verify exact
  source tag and GitHub configuration → publish the static registry/docs →
  verify the public tag, registry, docs, manifest, and tagged local acceptance.
  No npm or demo deployment step exists. A failed downstream step leaves an
  explicit failed release state and supports idempotent rerun.
- **D-28 (updated 2026-08-07):** Before publication, validate the canonical
  public repository, homepage, issue tracker, license, source identity, Pages
  environment, and exact static registry/docs settings. Account ownership and
  employer/IP authorization remain operator configuration, not repository
  defaults.
- **D-29 (updated 2026-08-07):** Fast-moving versions and platform APIs from the July 2026 research
  are compatibility snapshots. Planning/release work must revalidate Convex,
  Convex Auth, Clerk, Better Auth, shadcn, local anonymous Convex development,
  adopter Convex deployment, Node/npm source-build tooling, and GitHub Pages,
  then pin one tested matrix rather than upgrading opportunistically.
- **D-30 (updated 2026-08-07):** Treat `afferent/test` as an intentional testing-only packed export,
  not an accidental raw-source escape hatch. Phase 4 must choose and document a
  Convex-compatible packaged form, supply usable declarations, and prove the
  export from the packed artifact; if the Convex test registration mechanism
  requires source modules, that exception must be explicit and validated rather
  than leaving `"./test": "./src/test.ts"` as an unexamined release gap.
- **D-31 (updated 2026-08-07):** GitHub repository and static-site permissions
  are operator-provisioned external prerequisites. Repository work must provide
  deterministic local gates, exact setup documentation, and fail-closed
  human-present release checkpoints. The demo has no live Convex/Vercel
  prerequisite. Agents must not fabricate authorization or mark source/Pages
  publication complete from an offline simulation.

### the agent's Discretion

- Exact route names, host-shell visual treatment, explanatory copy, and
  responsive navigation, provided the showcase/sandbox boundary remains obvious.
- Exact representative seed prose and counts, within the deterministic,
  realistic, bounded content contract above.
- Exact internal filenames, CI job decomposition/caching, and docs navigation.
- Exact centralized quota thresholds and cleanup operational tuning under D-14.
- Exact static registry/docs publication mechanism, provided version coherence
  and public links are automatic and it does not deploy the demo.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and release requirements

- `.planning/PROJECT.md` — Product boundary, current Phase 1–3 completion state,
  local-example direction, and non-negotiable security/distribution decisions.
- `.planning/REQUIREMENTS.md` — Retired COMP-01 plus locked DEMO-02 through
  DEMO-08, QUAL-05, QUAL-06, QUAL-09, and revised QUAL-11 acceptance
  requirements; DEMO-01 is historical and superseded.
- `.planning/phases/04-hosted-production-release/04-SCOPE-PIVOT.md` — The
  authoritative hosted-to-local change, terminology, preserved gates, and
  remaining-plan impact.
- `.planning/phases/04-hosted-production-release/04-DISTRIBUTION-PIVOT.md` — The
  authoritative removal of npm publication from v1 and preserved local package
  proof.
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, dependency order, and
  requirement traceability.
- `.planning/research/SUMMARY.md` — Phase 4 release synthesis and the
  two-static-instance sandbox architecture.
- `.planning/research/STACK.md` — Historical hosting research plus still-current
  Vite/Convex, VitePress, browser-test, package-validation, Changesets, and
  trusted-publishing inputs; `04-SCOPE-PIVOT.md` supersedes Vercel/demo hosting.
- `.planning/research/ARCHITECTURE.md` — Demo scope flow, test layers, publishing
  graph, and package/registry ordering, subject to the local-demo pivot.
- `.planning/research/PITFALLS.md` — Cross-scope, cleanup, artifact-install,
  upgrade, accessibility, and release failure modes.

### Prior UI and behavior contracts

- `.planning/phases/03-source-owned-product-interface/03-CONTEXT.md` — Canonical
  source-owned UI, route-agnostic behavior, host-injected navigation, and
  installed-consumer constraints.
- `.planning/phases/03-source-owned-product-interface/03-UI-SPEC.md` — Public and
  admin workflow, responsive, visual, interaction, and accessibility contract.
- `.planning/phases/03-source-owned-product-interface/03-VERIFICATION.md` —
  Phase 3 automated evidence and the boundary around human aesthetic judgment.
- `.planning/phases/02.3-admin-read-and-projection-completion/02.3-CONTEXT.md` —
  Complete admin read/projection contract exercised by the sandbox.
- `.planning/phases/02.2-notification-navigation-target-contract/02.2-CONTEXT.md`
  — Closed notification target and injected navigation contract.

### Existing package and security implementation

- `package.json` — Current `afferent@0.1.0` exports, scripts, dependency matrix,
  package files, and Phase 1–3 release gates.
- `src/client/index.ts` — Normal one-product fixed-scope client.
- `src/client/server.ts` — Explicit server-only scoped client and scope helper
  export used only by the local demo sandbox.
- `src/client/scope.ts` — Domain-separated SHA-256 scope derivation.
- `src/client/internal.ts` — Scope-first host resolution and narrow read,
  participation, admin, and delivery calls.
- `src/component/schema.ts` — The 26 scope-bearing tables that reset/expiry
  coverage must account for.
- `src/component/model/rateLimits.ts` — Existing actor/scope participation limits
  and limiter-key construction.
- `tests/integration/scope-matrix.test.ts` — Current fixed/scoped isolation
  baseline to extend into the full local real-Convex two-user matrix.
- `fixtures/auth-convex-auth/convex/afferent.ts` — Existing Convex Auth identity
  and independent admin-authority wrapper pattern.

### Artifact and UI consumers

- `scripts/test-packed-consumer.mjs` — Clean tarball install, export inspection,
  codegen, typecheck, build, publint, and ATTW proof to extend for release.
- `scripts/test-registry-consumer.mjs` — Clean registry install and dependency
  resolution proof.
- `fixtures/packed-vite-convex/` — Current package-consumer fixture.
- `fixtures/registry-vite/` — Current generated-source Vite consumer fixture.
- `ui/afferent/` — Canonical copy-owned interface source.
- `registry/` — Generated static shadcn catalog and item artifacts.
- `examples/ui/afferent/` — Generated repository mirror that must remain in sync.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `createAfferentClient` already fixes normal installations to
  `afferent:single-product:v1`; do not weaken this path for the demo.
- `createScopedAfferentClient` already resolves scope before actor/admin
  authority and before every component call, giving the sandbox a narrow,
  server-only integration point.
- `deriveScopeId` already produces a fixed-length domain-separated SHA-256
  base64url value from a verified external key. Use a distinct domain/input for
  generation-specific physical scopes rather than inventing client-visible IDs.
- The schema, indexes, search filters, direct-ID guards, and existing scope
  matrix are already scope-aware. Phase 4 extends coverage to lifecycle
  operations and real authenticated browser use rather than retrofitting scope.
- The Convex Auth, Clerk, and Better Auth fixtures already normalize identity
  and keep admin authorization separate; they should become executable docs and
  release conformance evidence.
- The packed-consumer and registry-consumer scripts already reject
  repository-relative imports and prove installation/type/build behavior. They
  are the base for the tagged artifact pipeline.
- The canonical Phase 3 screens already cover public boards, roadmap, changelog,
  notifications, and admin workflows. The local app supplies real bindings,
  routes, auth, and shell rather than rewriting them.

### Established Patterns

- Host wrappers are the only security boundary: component code cannot read
  `ctx.auth`, and React never authorizes an operation.
- Every component document belongs to a scope, all common indexes lead with
  scope, and DTOs—not raw documents—cross the component boundary.
- Public, participation, admin, and delivery capabilities remain narrow and
  separately authorized.
- Registry JSON and repository examples are generated from `ui/afferent`; drift
  is a failing check.
- Package verification installs a packed tarball outside the source repository
  before codegen/typecheck/build.
- Background merge, notification-fanout, and tag-cleanup jobs already schedule
  continuations by job ID. Sandbox retirement must account for both job records
  and delayed invocations.

### Integration Points

- Add the local Vite/Convex Auth application beside the existing clean fixtures
  while keeping one root package/lockfile and public package exports.
- Install both showcase and sandbox component instances in the local app's
  `convex.config.ts`, then mount separate host wrapper modules with different
  authority policies.
- Keep host-owned sandbox lifecycle metadata and generation selection outside
  the reusable component contract; pass only the selected physical scope through
  the existing server-only scoped client.
- Add component-internal/demo maintenance operations only where atomic scoped
  usage accounting, exhaustive cleanup, or rate-limiter shard cleanup cannot be
  safely performed by host orchestration. Do not mount those operations in
  normal consumer browser APIs.
- Extend the root scripts with one-command local demo, local real-Convex E2E,
  docs, package, registry, version-sync, and release gates; CI/release workflows
  should call those scripts rather than duplicate logic in YAML.

</code_context>

<specifics>
## Specific Ideas

- The evaluator journey should be understandable without documentation:
  “Browse the immutable showcase” first, then “Sign in to try your own private
  admin sandbox.”
- Reset copy should name what is lost, state that only the current visitor's
  sandbox is affected, explain the deterministic restore, and show a durable
  in-progress/result state. It must not display the internal scope identifier.
- Package, registry, docs, and source-tag version coherence remains explicit in
  release metadata. The local demo does not carry a separately deployed release
  badge.

</specifics>

<deferred>
## Deferred Ideas

- General multi-product tenancy, per-board access policies, and dynamic
  component instances remain outside Afferent v1.
- A managed hosted Afferent service, shared team sandboxes, persistent demo
  organizations, and production customer data hosting are not part of this
  public example.
- AI assistance, deep analytics, named vendor integrations, broad imports,
  localization, and new feedback-domain workflows remain later-version work.

</deferred>

---

_Phase: 04-hosted-production-release_
_Context gathered: 2026-07-23; local-demo scope superseded hosting decisions on 2026-07-30_
