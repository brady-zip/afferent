---
phase: 02-complete-feedback-to-changelog-workflow
verified: 2026-07-17T17:49:16Z
status: gaps_found
score: 35/39 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "React consumers can exercise every workflow through explicit query error states without requiring an error boundary."
    status: failed
    reason: "The live hooks use query primitives that throw during render. Their declared Error branches are synthetic and unreachable from the imported paginated helper, while direct useQuery calls also propagate failures."
    artifacts:
      - path: src/react/hooks/feedback.ts
        issue: "Imports throwing usePaginatedQuery/useQuery primitives; the mapper's invented Error status is not produced by the live dependency."
      - path: src/react/hooks/roadmap.ts
        issue: "The apparent error state cannot be reached from convex-helpers/react usePaginatedQuery."
      - path: src/react/hooks/changelog.ts
        issue: "Both paginated and direct query failures propagate before the mapper can return an error state."
      - path: src/react/hooks/notifications.ts
        issue: "Inbox query failures propagate before the hook can return its declared error state."
      - path: tests/react/feedback.test.tsx
        issue: "The test fabricates { status: Error } and tests the mapper in isolation; the real helper has no such public status and throws non-cursor errors."
    missing:
      - "Wire direct query hooks through a status-returning query adapter that captures backend errors."
      - "Provide an actual non-throwing paginated-query error path, rather than declaring an Error member the dependency never returns."
      - "Mount the public hooks against failing query primitives and prove they return error states without an error boundary."
  - truth: "Logout or account switch clears every actor-scoped overlay, page, inbox, mutation, and admin state before another actor can observe it (D-52)."
    status: failed
    reason: "Authenticated sessionGeneration is optional and defaults every unidentified actor to authenticated:default, so an authenticated-to-authenticated account switch need not change the reset key. Cleanup is post-render useEffect work, and old in-flight promises are not generation-fenced, so they can repopulate state after a switch."
    artifacts:
      - path: src/react/provider.tsx
        issue: "sessionGeneration is optional; getAfferentSessionKey collapses omitted generations to one constant."
      - path: src/react/hooks/mutations.ts
        issue: "Reset occurs in useEffect and asynchronous completions mutate state without checking the generation that started the request."
      - path: tests/react/provider.test.tsx
        issue: "Tests only compare the pure key when callers voluntarily provide actor-a/actor-b; no account-switch or in-flight completion transition is exercised."
    missing:
      - "Make account/session generation an enforceable part of the authenticated adapter or provide an equally strong automatic reset identity."
      - "Fence async mutation completions and retries by the generation that initiated them."
      - "Behaviorally test authenticated account switch, logout, accumulated pages, optimistic overlays, admin capability, and an old in-flight rejection resolving after the switch."
---

# Phase 2: Complete Feedback-to-Changelog Workflow Verification Report

**Phase Goal:** As a developer integrating Afferent into my existing Convex + React application, I want to run the complete provider-neutral feedback-to-roadmap-to-changelog workflow -- ranked, searchable, and filterable discovery with admin duplicate merges; authenticated participation; admin moderation with a status-driven roadmap; manually published changelog entries linked to feedback; and in-app notifications backed by a host-consumable delivery outbox -- through tested component APIs and framework-light headless React hooks with explicit async, auth, and error states, so that my users and admins can complete the entire feedback lifecycle while I retain ownership of identity, authorization, and my own presentation.

**Verified:** 2026-07-17T17:49:16Z  
**Status:** gaps_found  
**Re-verification:** No -- initial verification after Plan 02-11 corrective execution

## User Flow Coverage

| Step | Expected | Evidence | Status |
|---|---|---|---|
| Install and bind | A developer supplies host-generated function references and host-owned actor/admin resolvers without provider records entering the component | `src/client/internal.ts`, `src/react/bindings.ts`, three auth-conformance suites, and the packed consumer gate | VERIFIED |
| Discover and merge | Users page Newest/Top/Trending, search/filter/suggest, and resolve an atomic duplicate merge | Component suites plus the real pagination/search/merge backend matrices; the merge oracle restarted the backend across job states and exited 0 | VERIFIED |
| Participate and administer | Authenticated users participate while trusted admins moderate, tag, manage statuses, and inspect activity | Component/model suites and the real rate-limit/tag-cleanup matrices | VERIFIED |
| Browse roadmap and changelog | Users browse status-derived roadmap groups and explicitly published changelog entries | `tests/component/roadmap.test.ts`, `tests/component/changelog.test.ts`, React suites | VERIFIED |
| Receive and deliver notifications | Users receive the fixed in-app event set and hosts claim typed fenced delivery leases | Notification/outbox component suites and real fanout/outbox matrices | VERIFIED |
| Exercise explicit headless states | Every query failure becomes a returned headless error state; account changes clear actor-sensitive state | Live imports throw query failures; the reset token is optional and asynchronous state updates are not generation-fenced | FAILED |
| Outcome | Users/admins complete the lifecycle while the developer owns identity, authorization, and presentation | Backend lifecycle and ownership hold, but the promised headless error/account-switch contract does not | FAILED |

The MVP outcome is therefore not yet observably true through the complete supported React path.

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Visitors can page, search, filter, get deterministic suggestions, and follow lossless merged redirects | VERIFIED | Real pagination/search matrices pass; component merge suite and disposable merge oracle prove union preservation, flattened redirects, crash recovery, concurrent writes, and convergence. |
| 2 | Authorized admins can moderate/status/tag/lock/archive with append-only activity, safe content, and actionable rate limits | VERIFIED | Named model/component tests pass; real rate-limiter and tag-cleanup matrices pass. Host wrappers re-authorize every admin call. |
| 3 | Visitors can browse a board-filtered status roadmap and stable manually published changelog | VERIFIED | Roadmap/changelog model, component, and React suites pass; status and publication remain orthogonal. |
| 4 | Users receive/manage the fixed notification set and hosts consume typed vendor-neutral delivery events | VERIFIED | Notification/fanout/outbox tests and real backends pass; delivery is exposed only by the server subpath. |
| 5 | Every workflow is available through injected refs with explicit loading, pagination, pending, empty, and error states plus security tests | FAILED | The backend and packed bindings exist, but live query failures throw instead of returning the advertised error states, and D-52 account-switch isolation is not guaranteed. |

### Plan-Level Truths

The 34 plan truths were evaluated independently of SUMMARY claims. Thirty-one are verified. The failed truths are:

1. Plan 02-01 truth 3: feedback-feed hooks do not actually expose a live query error state.
2. Plan 02-10 truth 2: all domain hooks do not share an executable non-throwing query error vocabulary.
3. Plan 02-10 truth 3: the packed artifact passes, but logout/account-switch isolation is not guaranteed by the optional reset identity and unfenced completions.

Together with Roadmap Success Criterion 5, this yields **35/39 must-haves verified**. The failures share the unified headless-contract root, not the component backend.

## Required Artifacts

| Area | Representative artifacts | L1/L2 | Wiring / behavior | Status |
|---|---|---|---|---|
| Ranked feeds | `src/component/public/feeds.ts` (338 lines), `tests/component/discovery.test.ts` | Exists, substantive, indexed | Real pagination matrix and discovery tests pass | VERIFIED |
| Search/content/similarity | `src/component/public/search.ts` (266), `src/component/model/content.ts` (84) | Exists, parser-backed, bounded | Real search matrix passes; unsafe Markdown tests pass | VERIFIED |
| Moderation/rate limits | `src/component/admin/posts.ts` (230), `src/component/admin/activity.ts` (76) | Exists, narrow intents | Activity calls and real rate-limit commit/OCC matrix pass | VERIFIED |
| Tags/cleanup | `src/component/admin/tags.ts` (278), `src/component/jobs/tag_cleanup.ts` (90) | Exists, bounded continuation | Real crash/resume/scope matrix passes | VERIFIED, filename note |
| Roadmap | `src/component/public/roadmap.ts` (161) | Exists, status-derived | Component/React tests pass | VERIFIED |
| Changelog | `src/component/admin/changelog.ts` (441), `src/component/public/changelog.ts` (87) | Exists, explicit lifecycle | Component/model/React tests pass | VERIFIED |
| Notifications | `src/component/notifications/events.ts` (170), `src/component/jobs/fanout.ts` (53) | Exists, immutable event + bounded fanout | Real fanout backend passes | VERIFIED |
| Atomic merge | `src/component/model/merge.ts` (1129), `scripts/test-merge-backend.mjs` (429) | Exists, closed staged state machine | Disposable real Convex oracle passes independently | VERIFIED |
| Delivery outbox | `src/component/notifications/outbox.ts` (239), `src/client/server.ts` (48) | Exists, fenced leases, no rendered/PII payload | Real outbox matrix and component tests pass | VERIFIED |
| Headless React | `src/react/index.ts`, provider/bindings/domain hooks | Exists and packaged | Success/empty/loading/mutation paths wire; live query error and account switch paths fail | FAILED |
| Packed consumer | `fixtures/packed-vite-convex/src/App.tsx` (216), packed artifact test | Exists and uses package subpaths | Clean install/codegen/typecheck/build/export gate passes | VERIFIED |

Plan 02-04 declared `src/component/jobs/tag-cleanup.ts`; the implemented and generated module is `src/component/jobs/tag_cleanup.ts`. The latter is substantive, imported by the admin tag intent, installed in `feedback.ts`, and behaviorally verified. This is a plan filename typo, not a missing runtime artifact, but the plan should be corrected when the phase artifacts are next edited.

## Key Link Verification

| From | To | Via | Status | Evidence |
|---|---|---|---|---|
| Trusted host wrapper | Component operations | Per-call `resolveScope`, `resolveActor`, `authorizeAdmin` | WIRED | `src/client/internal.ts`; auth conformance and scope suites pass. |
| Feeds/search/roadmap | Visibility/schema | Scope-leading indexes plus shared visibility key | WIRED | Source trace and real backend matrices. |
| Admin moderation/tags/changelog | Activity/projections | Same-transaction activity and projection updates | WIRED | Component tests cover every operation; real tag matrix passes. |
| Comment/status/changelog mutations | Notification capture | Transactional logical events, then inline/bounded fanout | WIRED | Component notification suite and real fanout matrix. |
| Fanout | Inbox and delivery | One recipient materializes both bounded derived rows | WIRED | `notifications/fanout.ts` calls outbox materialization; outbox tests pass. |
| Server-only client | Delivery component operations | Separate `afferent/server.js` capability with authorization | WIRED | Static exports/contracts and packed gate pass; React/root paths do not export claims. |
| Merge relation writers/readers | Merge job selector | OCC fence, hidden stages/deltas, one cutover | WIRED | Corrective real backend matrix passes through restart/abort/concurrency boundaries. |
| Provider/domain hooks | Consumer refs | Typed `AfferentBindings` groups | PARTIAL | Normal results and optional capability states work; query failures escape before mapping. |
| Provider session identity | Actor-sensitive state | `sessionKey`/`sessionGeneration` | NOT_WIRED FOR ALL VALID INPUTS | Omitted generation collapses account switches; old async completion has no generation guard. |

## Data-Flow Trace (Level 4)

| Artifact | Data source | Flow | Status |
|---|---|---|---|
| Feedback feed/search | Scoped indexed Convex post/search rows | Component DTO -> trusted host query -> injected ref -> hook | FLOWING for successful queries; failure flow disconnects into render throw |
| Roadmap | `posts` indexed by scope/status/visibility/status time | DTO page -> grouped injected query -> per-column hook | FLOWING for successful queries |
| Changelog | Scoped entries plus canonical visible links | Public/admin DTOs -> host wrappers -> feed/entry/editor hooks | FLOWING for successful queries |
| Notifications | Domain mutation -> notification event -> recipient row -> inbox/outbox | Actor-scoped inbox and typed host delivery | FLOWING; real fanout/outbox matrices pass |
| Merge | Original rows -> hidden stage/delta -> one job-state cutover -> inert cleanup | Readers select complete pre/post truth | FLOWING; continuous real oracle sees only complete snapshots |
| Query errors | Convex query error -> imported React query primitive | Primitive throws before Afferent mapper | DISCONNECTED from declared error state |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Corrected D-12 merge cutover | `h5i capture run -- node scripts/test-merge-backend.mjs` | Exit 0; disposable local deployment restarted twice | PASS |
| All Phase 2 real backends | `h5i capture run -- npm run test:backend:phase2` | Pagination, bounded search, rate-limit OCC, tag cleanup, fanout, outbox, and merge all report pass | PASS |
| Model/component/React/static/auth contracts | Explicit Vitest paths for `tests/model tests/component tests/react tests/static tests/conformance` | 39 files, 146 tests passed | PASS |
| Scope and backend wrapper tests | Explicit five-file `vitest.scope.config.ts` run | 5 files, 7 tests passed | PASS |
| Build and type boundaries | `npm run build`, `npm run typecheck`, `npm run lint` | All exit 0 | PASS |
| Clean packed consumer | `npm run test:package` | 3/3 pass; external clean consumer test takes 24.6s | PASS |
| Live paginated error propagation | Temporary verifier-only mounted probe, removed after execution | A thrown helper query error propagates through `useFeedbackFeed`; the assertion expecting `toThrow` passes | FAILS PRODUCT TRUTH |
| Default account-switch discriminator | Built provider call for two authenticated states without a generation | Both produce `authenticated:default` | FAILS PRODUCT TRUTH |

No full workspace test command was repeated. Verification used named suites and the declared real-backend probes.

## Probe Execution

| Probe | Result | Status |
|---|---|---|
| `scripts/test-pagination-backend.mjs` | Real pagination matrix passed | PASS |
| `scripts/test-search-backend.mjs` | Bounded search/pagination boundary passed | PASS |
| `scripts/test-rate-limiter-backend.mjs` | Commit and OCC matrix passed | PASS |
| `scripts/test-tag-cleanup-backend.mjs` | Resume and scope matrix passed | PASS |
| `scripts/test-fanout-backend.mjs` | Completed inside Phase 2 backend command | PASS |
| `scripts/test-outbox-backend.mjs` | Completed inside Phase 2 backend command | PASS |
| `scripts/test-merge-backend.mjs` | Completed both independently and in the aggregate command | PASS |
| Packed-consumer driver | Invoked through its required `test:package` harness; clean tarball path passes | PASS |

## Requirements Coverage

| Requirement(s) | Source plan(s) | Status | Evidence |
|---|---|---|---|
| DISC-01..03, DISC-05 | 02-01 | SATISFIED | Indexed stable feed orders, filters, discovery tests, real pagination. |
| DISC-04, DISC-06 | 02-02 | SATISFIED | Bounded search and deterministic suggestion model plus real backend. |
| DISC-07, DISC-08 | 02-05, 02-11 | SATISFIED | Atomic staged merge, durable flattened redirect, union preservation, real crash/concurrency oracle. |
| ADMN-01, ADMN-02, ADMN-05..08, ADMN-10 | 02-03 | SATISFIED | Narrow authorized intents, activity, lifecycle orthogonality, real rate limiter. |
| ADMN-03, ADMN-04 | 02-04 | SATISFIED | Stable tag IDs, rename, assignment, bounded resumable deletion. |
| ADMN-09 | 02-02 | SATISFIED | Parser-backed bounded safe Markdown; executable constructs rejected by model/component tests. |
| RMAP-01..03 | 02-06 | SATISFIED | Three independent scoped projections, board filter, shared visibility. |
| CHLG-01..06 | 02-07 | SATISFIED | Explicit idempotent editorial lifecycle, stable slug/time/link behavior, no status automation. |
| NOTF-01..05, NOTF-07 | 02-08 | SATISFIED | Durable opt-out, fixed event set, dedupe, capped inbox, exact unread, idempotent mark-read. |
| NOTF-06 | 02-09 | SATISFIED | Typed PII-free delivery facts, current recipient key, fenced lease/ack/release/dead-letter/prune. |
| UI-01 | 02-01..10 | SATISFIED | All domain hook groups and installed consumer entrypoints exist. |
| UI-02 | 02-01..10 | SATISFIED | Injected refs; no auth provider/router/toast/design-system dependency. |
| UI-03 | 02-01..10 | BLOCKED | Live query errors require an error boundary; account-switch reset is not guaranteed. |
| QUAL-01 | 02-01..11 | SATISFIED | Named invariant/security suites and all real backend matrices pass, including corrected D-12. |

All 38 Phase 2 IDs appear in plan frontmatter; there are no orphaned Phase 2 requirements. UI-03 is the only unsatisfied requirement.

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|---|---|---|---|
| `src/react/hooks/feedback.ts` and sibling query hooks | Declares an `Error` status that the imported helper never returns | BLOCKER | Creates a false explicit-error contract; backend errors still require a React error boundary. |
| `tests/react/feedback.test.tsx` and analogous mapper tests | Fabricates the impossible dependency result instead of mounting the live hook with a throwing query | BLOCKER | Green tests do not test the promised behavior. |
| `src/react/provider.tsx` | Optional account generation falls back to a shared constant | BLOCKER | Valid provider input cannot distinguish authenticated account switches. |
| `src/react/hooks/mutations.ts` and sibling controllers | Effect-only reset without generation-fenced async completion | BLOCKER | Old actor failures/retries can repopulate state after a switch. |
| Phase 02 plan 04 | Hyphenated declared cleanup path differs from underscore implementation | INFO | Documentation/gate typo only; the runtime module is substantive and verified. |

No `TBD`, `FIXME`, `XXX`, `HACK`, placeholder, or not-implemented debt markers were found in Phase 2 source, tests, fixtures, or scripts.

## Human Verification Required

None. The blocking behaviors are deterministic and programmatically falsified. Visual/source-owned UI belongs to Phase 3 and does not excuse the Phase 2 headless contract.

## Deferred-Item Check

Neither gap is deferred by the milestone roadmap. Phase 3 explicitly consumes the Phase 2 headless behavior contract to build copied source UI; it does not replace query error handling or actor-state isolation. Phase 4 is release/demo work.

## Gaps Summary

The reusable Convex backend is unusually well evidenced: scope isolation, bounded indexes, moderation, tag cleanup, roadmap, changelog, notification fanout, fenced outbox delivery, and the corrected atomic merge all pass named tests and real disposable-backend matrices. The packed clean-consumer boundary also passes.

Phase 2 still fails its MVP goal at the last integration layer. The public React API advertises explicit query error states that its live dependencies cannot produce, and its session reset contract permits indistinguishable account switches plus unfenced old completions. Those are release-blocking headless-contract gaps because Phase 3 builds on this layer.

---

_Verified: 2026-07-17T17:49:16Z_  
_Verifier: generic-agent workaround for gsd-verifier_
