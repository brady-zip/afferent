---
phase: 02-complete-feedback-to-changelog-workflow
verified: 2026-07-17T18:54:32Z
status: gaps_found
score: 38/39 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 35/39
  gaps_closed:
    - "Every published direct and paginated read hook now captures initial and reactive Convex failures as typed state without throwing through render."
    - "Required opaque identity tokens and synchronous generations now isolate query, page, mutation, retry, optimistic, inbox, and admin state across auth transitions."
  gaps_remaining:
    - "Reactive multi-page pagination does not preserve the exact loaded ordered range during growth or split/replacement against real Convex."
  regressions: []
gaps:
  - truth: "Pagination keeps every previously successful ordered page through reactive growth, shrink, and split replacement without gaps, duplicates, or ID-based deduplication (D-47)."
    status: failed
    reason: "The custom watch store leaves later page descriptors anchored to their original cursor when an earlier page changes. In a disposable real Convex deployment, a loaded 2x2 range [a,b,c,d] converged to [zero,a,b] after front growth instead of [zero,a,b,c], and to [a,b,c] after replacement/split instead of [a,b,c,d]."
    artifacts:
      - path: src/react/query.ts
        issue: "requestMore records a later descriptor from the current continueCursor, but subsequent earlier-page changes neither re-pin nor rebuild downstream descriptors; visibleResults simply concatenates their current results."
      - path: scripts/test-headless-backend.mjs
        issue: "The committed growth/shrink/split checks assert only Set(id) uniqueness and non-empty output, so they accept a shortened logical range and contradict the no-ID-deduplication acceptance criterion."
      - path: tests/react/live-headless.test.tsx
        issue: "Controlled tests cover later-page retention/recovery and atomic split replacement, but not cursor rebasing when an earlier page grows or is replaced while later pages are loaded."
    missing:
      - "Preserve exact ordered loaded coverage when an earlier watched page changes, by maintaining bounded page ranges or deterministically rebuilding/rebasing affected downstream descriptors."
      - "Make the real Convex oracle assert exact logical labels and order for growth, shrink, and split/replacement, rather than only unique generated IDs."
---

# Phase 2: Complete Feedback-to-Changelog Workflow Verification Report

**Phase Goal:** As a developer integrating Afferent into my existing Convex + React application, I want to run the complete provider-neutral feedback-to-roadmap-to-changelog workflow -- ranked, searchable, and filterable discovery with admin duplicate merges; authenticated participation; admin moderation with a status-driven roadmap; manually published changelog entries linked to feedback; and in-app notifications backed by a host-consumable delivery outbox -- through tested component APIs and framework-light headless React hooks with explicit async, auth, and error states, so that my users and admins can complete the entire feedback lifecycle while I retain ownership of identity, authorization, and my own presentation.

**Verified:** 2026-07-17T18:54:32Z
**Status:** gaps_found
**Re-verification:** Yes -- after additive gap-closure Plan 02-12
**Score:** 38/39 (previously 35/39)

## Re-verification Verdict

Plan 02-12 closes both defects from the initial report:

1. Public React reads no longer import or call throwing `useQuery` or `usePaginatedQuery` primitives. Initial and reactive failures return typed Afferent error states and recover without an error boundary.
2. Authenticated input now requires a non-empty local identity token. The provider advances a numeric generation synchronously during render, and read stores, mutation state, retries, native optimism, inbox state, and admin capability state are generation-owned. First renders after logout/login, A-to-B, and rapid A-to-B-to-A are cold.

The phase still does not meet the full MVP contract. Plan 02-12 introduced an explicit D-47 acceptance criterion for exact reactive pagination, and the real implementation loses loaded logical coverage during growth and replacement/split. The committed real-backend harness passes only because its assertions are too weak to observe the loss.

## User Flow Coverage

| Step | Expected | Evidence | Status |
|---|---|---|---|
| Install and bind | Host-generated references and trusted host actor/admin resolvers; no provider records in the component | Client/binding contracts, auth-conformance suites, packed consumer | VERIFIED |
| Discover and merge | Ranked/filterable/searchable discovery plus atomic duplicate merge | Component suites and real pagination/search/merge matrices | VERIFIED for backend; reactive loaded-window exactness fails in React |
| Participate and administer | Authenticated participation and authorized moderation/status/tag/activity workflows | Component/model suites and real rate-limit/tag-cleanup matrices | VERIFIED |
| Browse roadmap and changelog | Status-derived roadmap and manually published changelog | Component and React suites | VERIFIED |
| Receive and deliver notifications | Fixed inbox event set plus typed fenced host delivery leases | Notification/outbox suites and real fanout/outbox matrices | VERIFIED |
| Exercise explicit headless states | Query errors are returned; actor changes immediately isolate state | Mounted all-hook matrix, source trace, real direct/later-page failure recovery | VERIFIED |
| Keep ordered loaded pages coherent | Growth, shrink, recovery, and split/replacement preserve exact logical coverage | Strengthened verifier-only real Convex assertions | FAILED |
| Outcome | Complete lifecycle through the supported React path | One observable pagination correctness gap remains | FAILED |

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Visitors can page/search/filter, get deterministic suggestions, and follow lossless merged redirects | PARTIAL | Backend feeds/search/merge pass, but a loaded React window loses one logical item during reactive growth/replacement until further pagination. |
| 2 | Authorized admins can moderate/status/tag/lock/archive with activity, safe content, and actionable rate limits | VERIFIED | Named component/model suites and real rate-limit/tag-cleanup matrices pass. |
| 3 | Visitors can browse status-derived roadmap and stable manually published changelog | VERIFIED | Roadmap/changelog component and React suites pass. |
| 4 | Users manage the fixed notification set and hosts consume typed vendor-neutral delivery events | VERIFIED | Notification/fanout/outbox suites and real backends pass. |
| 5 | Every workflow is available through injected refs with explicit async/auth/error states and tests | PARTIAL | The explicit error and identity contract now works, but the real pagination test masks D-47 data loss. |

### Plan-Level Truths

All three plan truths that failed the initial verification now pass:

- Plan 02-01 truth 3: live feedback hooks expose executable non-throwing error state.
- Plan 02-10 truth 2: all domain reads use the same closed non-throwing error vocabulary.
- Plan 02-10 truth 3: packed installation and auth-transition isolation are enforceable and behaviorally covered.

For Plan 02-12, truths 1, 3, and 4 pass. Truth 2 fails because exact page coverage is lost under real reactive growth/replacement. Truth 5 fails because the committed real oracle does not assert that exact behavior. The re-verification score retains the phase's established 39-item denominator for direct comparison with the prior 35/39 report.

## Three-Level Artifact Verification

| Artifact | L1 Exists | L2 Substantive | L3 Wired / behavioral | Status |
|---|---:|---:|---|---|
| `src/react/query.ts` | Yes | Yes; direct and paginated `watchQuery` stores, typed snapshots, retry/split logic | Every public domain read uses it; mounted and real failure/recovery pass. Multi-page reactive rebasing fails. | PARTIAL |
| `src/react/provider.tsx` | Yes | Yes; required token validation and render-time monotonic generation | Fixture and domain hooks consume generation; identity token is never serialized into query args | VERIFIED |
| `src/react/hooks/mutations.ts` | Yes | Yes; generation-owned pending/errors/in-flight/retry writes | Admin/changelog/notification/feedback controllers use the shared fence; stale completion/timer tests pass | VERIFIED |
| `tests/react/live-headless.test.tsx` | Yes | Yes; mounted jsdom hooks and sentinel boundary | Initial/reactive errors, recovery, retained earlier page, split replacement, identity switch, stale mutation/retry pass | VERIFIED, with missing earlier-page growth case |
| `scripts/test-headless-backend.mjs` | Yes | Yes; disposable real Convex direct and pagination watches | Direct failure/recovery and later-page retention/recovery pass; committed growth/split assertions are insufficient | PARTIAL |
| `fixtures/packed-vite-convex` | Yes | Yes; host validators strip numeric cache discriminator and provider supplies client/token | Clean tarball install, codegen, typecheck, tests, and build pass | VERIFIED |

## Key Link Verification

| From | To | Via | Status | Evidence |
|---|---|---|---|---|
| Domain read hooks | `src/react/query.ts` | `useDirectWatchQuery` / `usePaginatedWatchQuery` | WIRED | No `useQuery`, `usePaginatedQuery`, or `convex-helpers/react` remains on public Afferent read paths. |
| Watch stores | React consumers | `useSyncExternalStore` typed snapshots | WIRED | Mounted sentinel boundary sees returned errors, not thrown render failures. |
| Provider identity | Query/page stores | Required local token -> synchronous numeric generation | WIRED | First post-transition render selects a fresh store and serialized args contain no token. |
| Provider identity | Mutation/retry state | Captured-generation writes and generation-owned keys | WIRED | Old rejection and delayed rate-limit retry cannot repopulate current state. |
| Provider identity | Optimistic/cache state | Updaters match only current `sessionGeneration` args | WIRED | Vote/subscription/mark-read projections cannot select another generation's query entry. |
| Host wrappers | Component operations | Validate then strip `sessionGeneration` | WIRED | Cache discriminator conveys no actor, scope, or admin authority. |
| Earlier watched page | Loaded downstream pages | Cursor descriptors in `createPaginatedWatchStore` | NOT WIRED | Earlier `continueCursor` changes do not rebuild/rebase later descriptors. |

## Behavioral Evidence

| Behavior | Command / probe | Result |
|---|---|---|
| Mounted live hook matrix | `npm run test:react` | PASS: 11 files, 34 tests |
| Direct initial/reactive query failure and recovery against real Convex | `node scripts/test-headless-backend.mjs` | PASS |
| Later-page error retains prior page and recovers against real Convex | Same real harness | PASS: `[a,b]` retained, then `[a,b,c,d]` recovered |
| Exact reactive growth | Temporary verifier-only strengthening of the real harness; restored afterward | FAIL: timed out at `[zero,a,b]`, `CanLoadMore`; expected `[zero,a,b,c]` |
| Exact replacement/split | Second temporary verifier-only exact assertion; restored afterward | FAIL: timed out at `[a,b,c]`, `CanLoadMore`; expected `[a,b,c,d]` |
| Clean packed consumer | `npm run test:package` | PASS: 3/3, including external tarball consumer |
| Focused backend/static regression | Six static/component files | PASS: 30/30 |
| Build/type/lint | `npm run build`; `npm run typecheck`; `npm run lint` | PASS |

The disposable verifier probes changed only assertions, not product behavior, and were removed after execution. The stock harness still passes. No second full-workspace run was performed; untouched backend invariants retain the prior verification evidence and received focused regression coverage.

## Why the Stock Real Harness Misses the Gap

After two pages of two items are loaded, `createPaginatedWatchStore` holds two independent descriptors. The second is created from the first page's then-current `continueCursor`. When the first page later changes, the store updates its results but keeps the second descriptor on the old cursor and concatenates both result arrays. This can shorten or overlap the logical loaded range.

The committed harness then checks `new Set(results.map(item => item.id)).size === results.length`. `replaceItems` deletes and reinserts rows, so all IDs are fresh; uniqueness says nothing about whether the expected logical labels are complete or ordered. The split probe similarly accepts any non-empty result. Exact label assertions expose the missing item deterministically.

## Requirements Coverage

| Requirement(s) | Status | Re-verification note |
|---|---|---|
| DISC-01..08 | SATISFIED with D-47 caveat | Backend discovery/search/merge remains verified; public reactive loaded-window exactness is the remaining gap. |
| ADMN-01..10 | SATISFIED | No regression in focused suites or source wiring. |
| RMAP-01..03 | SATISFIED | Query errors and generation transitions now use the common store correctly. |
| CHLG-01..06 | SATISFIED | Direct/paginated/error/admin controller paths pass. |
| NOTF-01..07 | SATISFIED | Inbox/unread/subscription generation isolation and backend delivery remain verified. |
| UI-01, UI-02 | SATISFIED | Domain hooks and injected host references remain packaged. |
| UI-03 | BLOCKED | Error/auth states are fixed, but the published pagination path does not preserve exact loaded content during reactive changes. |
| QUAL-01 | BLOCKED | The required real growth/split oracle is present but does not assert the invariant and passes a demonstrably incomplete result. |

All 38 Phase 2 requirement IDs remain mapped. Checked boxes in `REQUIREMENTS.md` and `ROADMAP.md` do not override this behavioral re-verification result.

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|---|---|---|---|
| `src/react/query.ts` | Independent downstream cursor descriptor remains live after an earlier range changes | BLOCKER | Loaded logical coverage can shrink or gap during reactive growth/replacement. |
| `scripts/test-headless-backend.mjs` | Uses generated-ID uniqueness as a proxy for exact logical pagination | BLOCKER | Green real-backend gate masks the D-47 failure. |
| Phase 02 plan 04 | Declared `tag-cleanup.ts` differs from implemented `tag_cleanup.ts` | INFO | Documentation typo only; implementation remains verified. |

No new placeholder, TODO, FIXME, XXX, HACK, empty-handler, provider-record leakage, or security-boundary regression was found in the Plan 02-12 surface.

## Human Verification Required

None. Both closed gaps and the remaining pagination defect are deterministically programmatic.

## Deferred-Item Check

The remaining D-47 issue is not deferred. Phase 3 consumes the Phase 2 headless pagination contract and cannot repair this framework-light store from copied UI. Phase 4 is release/demo work.

## Gaps Summary

The high-risk initial gaps are closed: live query failures are typed and recoverable, and actor state is synchronously isolated by an enforceable identity-generation contract across reads, writes, retries, optimism, inbox, and admin paths. The packed external consumer, focused component/static regression, build, typecheck, and lint all pass.

One release-blocking headless correctness gap remains. Real reactive growth and replacement/split can shorten a previously loaded ordered range because downstream cursors are not rebased, and the committed backend oracle checks IDs rather than exact logical output. Phase 2 remains `gaps_found` until the store and oracle preserve and assert exact ordered coverage.

---

_Re-verified: 2026-07-17T18:54:32Z_
_Verifier: generic-agent workaround for gsd-verifier_
