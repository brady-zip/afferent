---
phase: 01-secure-installable-feedback-board
verified: 2026-07-16T17:17:34Z
status: gaps_found
score: 13/14 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Convex Auth, Clerk, and Better Auth fixtures derive actor identity and admin permission inside trusted host functions, behave equivalently, and reject missing or forged authority."
    status: failed
    reason: "The conformance suites exercise pure normalizers through a generic mock client, not the three provider fixture factories. The Better Auth fixture is not included in any project typecheck and fails an independent TS 6 compile: its generated API is absent, getAuthUser returns a component user document incompatible with the adapter's required id field, and the narrowed Afferent resolver context is incompatible with the helper call."
    artifacts:
      - path: "fixtures/auth-better-auth/convex/afferent.ts"
        issue: "Not buildable as committed; the trusted getAuthUser/safeGetAuthUser wiring cannot satisfy the exported client resolver types."
      - path: "tests/conformance/better-auth.test.ts"
        issue: "Imports only normalizeBetterAuthUser; it never imports or invokes createBetterAuthAfferentFixture."
      - path: "tests/conformance/harness.ts"
        issue: "Uses a synthetic actor callback and mocked ComponentApi, so it cannot prove provider helper or fixture wiring."
      - path: "tsconfig.json"
        issue: "Includes only src/**/*.ts; none of fixtures/auth-* is compiled by typecheck/build."
    missing:
      - "Create runnable, generated auth fixture projects (or fixture-specific typecheck configs) and include all three in the automated gate."
      - "Normalize the actual session-validated Better Auth user document using its stable supported identifier."
      - "Expose the host context capabilities required by Better Auth's session-validating helper without weakening browser argument boundaries."
      - "Run the shared missing-auth, admin-denial, forged-authority, and equivalence matrix through the actual three fixture factories."
---

# Phase 1: Secure Installable Feedback Board Verification Report

**Phase Goal:** As a Convex developer, I want to install Afferent with my auth provider, so that users can safely run multi-board feedback.
**Verified:** 2026-07-16T17:17:34Z
**Status:** gaps_found
**Re-verification:** No - initial verification
**Dispatch:** Generic-agent workaround; typed `gsd-verifier` dispatch was unavailable. The repo-local verifier instructions and required verification references were applied directly.

## User Flow Coverage

| Step | Expected | Evidence | Status |
|---|---|---|---|
| Install | A clean consumer installs only an `npm pack` tarball with Apache-2.0 metadata | `scripts/test-packed-consumer.mjs`; clean detached-worktree `npm test` completed the tarball install, manifest checks, publint, and ATTW | VERIFIED |
| Generate and build | Installed component codegen with component typechecking, strict fixture typecheck, and Vite build succeed outside the repository | `tests/integration/walking-skeleton.test.mjs`; packed release subtest passed in 19.4 s | VERIFIED |
| Connect auth | Convex Auth, Clerk, and Better Auth host fixtures use their trusted server helpers through one equivalent contract | Convex Auth and Clerk fixture files compile independently; Better Auth fixture fails compilation and none of the fixture factories is executed by conformance tests | FAILED |
| Run feedback | Multiple boards support browse, create, edit, withdraw, vote, root comment, and one-level reply with stable DTO attribution/totals | component, scope, and pagination suites passed from clean committed TS 6 state | VERIFIED |
| Outcome | Users can safely run multi-board feedback without client-supplied identity, admin, or scope authority | fixed/scoped client, static contract, scope matrix, participation, and packed browser-argument checks pass; provider-fixture blocker remains | FAILED |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | A clean consumer installs the packed Apache-2.0 artifact, runs Convex codegen, typechecks, and builds without repository-relative imports. | VERIFIED | Clean detached `HEAD` worktree: `npm test` passed; packed release ran its external consumer in 19.4 s. |
| 2 | A host mounts typed read, participation, and admin capabilities using stable DTOs and opaque IDs without provider records or component documents. | VERIFIED | `src/client/contracts.ts`, `src/client/internal.ts`, `tests/static/contracts.test.ts`; 6 static tests passed. |
| 3 | All three provider fixtures derive trusted identity/admin authority, behave equivalently, and reject missing or forged authority. | FAILED | Conformance imports normalizers, not fixture factories. Independent Better Auth fixture compile exits 2 with TS2307 and TS2345 errors. |
| 4 | Visitors browse permitted multi-board feedback and authenticated authors create, edit, withdraw, vote, and discuss with stable attribution and totals. | VERIFIED | 9 component tests and 3 scope tests passed; real-Convex pagination script also passed. |
| 5 | Repeated votes maintain one membership and replies identify one root parent without nesting. | VERIFIED | `tests/component/participation.test.ts`; model/component suites passed concurrency, retry, invalid-parent, and exact-total cases. |
| 6 | The Vite interaction submits through generated host references and renders the returned post. | VERIFIED | Packed fixture `App.test.tsx` runs through `afferent/test`; walking-skeleton transcript assertions passed. |
| 7 | Browser-callable arguments contain no actor, admin, provider, or scope authority. | VERIFIED | Exact validators plus forged-extra conformance and packed transcript assertions passed. |
| 8 | Normal clients keep one private fixed scope while the opt-in server client resolves a nonempty scope before every operation. | VERIFIED | `src/client/index.ts`, `src/client/internal.ts`, and scope-order test passed. |
| 9 | Cross-scope and nonexistent identifiers share public errors and scoped reads/pages do not cross scope. | VERIFIED | Scope matrix passed; separate real-Convex script compared cross-scope and malformed error data. |
| 10 | Actor anonymization removes linkable identity/display data while retaining content, memberships, attribution links, and totals. | VERIFIED | `tests/component/anonymization.test.ts` passed retained-history and re-registration behavior. |
| 11 | Vote, comment, and actor paths remain bounded, scope-first, provider-neutral, and DTO-only. | VERIFIED | Schema/static tests, bounded paginator code, participation tests, and anti-pattern scan passed. |
| 12 | The component has no provider runtime dependency or provider-shaped storage/public DTO. | VERIFIED | Manifest/runtime dependency audit and component import scan passed. |
| 13 | The reviewed dependency set retains fixture-only providers, TS 6.0.3, and no SLOP substitution. | VERIFIED | Committed `HEAD` package/lock use the approved matrix; clean `npm ci` installed TS 6 state with zero audit vulnerabilities. |
| 14 | The original executable packed-consumer specification was genuinely red before implementation. | VERIFIED | Git history retains the red specification in `8659ed8`; current test is the same end-to-end gate made green by later implementation. |

**Score:** 13/14 truths verified (0 present-but-behavior-unverified)

## Required Artifacts

All 20 plan-declared artifacts exist and passed `verify.artifacts`. Manual substance/wiring inspection found one blocking consumer connection: the Better Auth fixture cannot compile against the shipped adapter/client contract.

| Plan | Artifacts | Existence/Substance | Wiring |
|---|---:|---|---|
| 01-01 | 1 | VERIFIED | VERIFIED |
| 01-02 | 5 | VERIFIED | VERIFIED manually; the generated `ComponentApi` is injected by the host fixture rather than matched by the plan's obsolete `components.*afferent` grep pattern |
| 01-03 | 5 | VERIFIED | VERIFIED |
| 01-04 | 4 | VERIFIED | VERIFIED |
| 01-05 | 5 | VERIFIED | FAILED for the Better Auth fixture-to-adapter/client connection |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `tests/integration/walking-skeleton.test.mjs` | `fixtures/packed-vite-convex` | external temporary materialization | WIRED | Test copies fixture outside source root and invokes tarball gate. |
| packed fixture host | fixed client/component API | `createAfferentClient(components.afferent, ...)` | WIRED | Generated host reference supplies the component; private fixed scope is injected internally. |
| Vite `App.tsx` | host `convex/afferent.ts` | generated `api.afferent` references | WIRED | Form submit/query interaction passed from the packed consumer. |
| scoped client | component intents | `resolveScope` before actor/admin/component | WIRED | Order test passed for read, participation, and admin calls. |
| post pagination | schema | `by_scope_board_state` + `paginator` | WIRED | convex-test and separate real-Convex pagination checks passed. |
| post mutations | actor model | `upsertActor` and ownership checks | WIRED | Lifecycle test passed with transaction rollback on rejection. |
| votes | schema | `by_scope_post_actor` membership | WIRED | Retry/concurrency/reconciliation behavior passed. |
| comments | scope/comment model | same-scope, same-post root parent | WIRED | Root/reply and rejection matrix passed. |
| anonymization | actor model | tombstone plus retained actor ID | WIRED | Retained-history test passed. |
| Convex Auth fixture | Convex Auth adapter | `getAuthUserId` normalization | PARTIAL | Source compiles, but conformance never invokes the fixture factory. |
| Clerk fixture | Clerk adapter | `ctx.auth.getUserIdentity` normalization | PARTIAL | Source compiles, but conformance never invokes the fixture factory. |
| Better Auth fixture | Better Auth adapter | `getAuthUser`/`safeGetAuthUser` normalization | NOT_WIRED | Independent fixture compilation fails; adapter expects an incompatible `id` shape and resolver context is insufficient. |
| package gate | package exports | tarball manifest/import/codegen/publint/ATTW | WIRED | External packed gate passed. |

## Data-Flow Trace (Level 4)

| Artifact | Data | Source | Produces Real Data | Status |
|---|---|---|---|---|
| packed `App.tsx` | rendered posts | `useQuery(api.afferent.listPosts)` after `submitFeedback` mutation | Yes; component row is persisted and returned through DTO mapping in the packed fixture test | FLOWING |
| public post DTO | board/author/totals | scope-checked post plus linked board/actor documents | Yes; `toPostDto` validates same-scope relations and maps explicit fields | FLOWING |
| comment page DTO | flat comment/parent/author | scope/post index paginator plus actor lookup | Yes; page mapping preserves paginator metadata | FLOWING |
| provider actor | verified helper result | actual provider fixture factory | No common executable path; Better Auth fixture is not buildable | DISCONNECTED |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full committed workspace and packed artifact | `npm test` in detached clean `9095546` worktree after `npm ci --ignore-scripts` | Static 6, model 3, component 9, conformance 25, scope 3, pagination 1, packed 2 all passed | PASS |
| Lint | `npm run lint` in clean worktree | oxlint exited 0 | PASS |
| Real Convex pagination | `node scripts/test-pagination-backend.mjs` in clean worktree | Local anonymous deployment started; `Real Convex pagination matrix passed` | PASS |
| Convex Auth + Clerk fixture compile | `tsc --ignoreConfig --noEmit ... fixtures/auth-convex-auth/... fixtures/auth-clerk/...` | exited 0 | PASS |
| Better Auth fixture compile | `tsc --ignoreConfig --noEmit ... fixtures/auth-better-auth/convex/afferent.ts` | exited 2: missing generated API plus incompatible user/context types | FAIL |

The full workspace command was run exactly once. Package/lock/release checks ran only in the clean detached worktree, preserving the main checkout's unrelated TS 7 experiment and other dirty files.

## Probe Execution

No phase plan declared a `probe-*.sh` artifact. Probe execution was not applicable; the named release and backend scripts above were executed directly.

## Requirements Coverage

| Requirement | Source Plan(s) | Status | Evidence |
|---|---|---|---|
| ACCS-01 | 02, 03 | SATISFIED | Public/authenticated installation policy tests and bounded scope-first reads. |
| ACCS-02 | 02, 03, 04, 05 | SATISFIED | Participation resolves a verified actor before component invocation. |
| ACCS-03 | 02, 03, 04, 05 | SATISFIED | Provider-neutral actor contract and namespaced normalizers; Better Auth integration gap is tracked under COMP-06. |
| ACCS-04 | 03, 05 | SATISFIED | Independent host admin callback is evaluated on every admin call. |
| ACCS-05 | 03, 04, 05 | SATISFIED | Missing actor/admin/scope rejects before component calls in generic wrapper tests. |
| ACCS-06 | 02, 03 | SATISFIED | Hidden fixed scope plus multi-board configuration and explicit scoped server factory. |
| FDBK-01 | 02, 03 | SATISFIED | Policy-aware scope/board index pagination on mock and real Convex. |
| FDBK-02 | 02, 03 | SATISFIED | Authenticated create persists a post and maps a v1 DTO. |
| FDBK-03 | 03 | SATISFIED | Author-only edit test. |
| FDBK-04 | 03 | SATISFIED | Withdrawal retains history and leaves active browse. |
| FDBK-05 | 04 | SATISFIED | Desired-state membership concurrency/retry tests. |
| FDBK-06 | 04 | SATISFIED | Authenticated flat comment creation and bounded listing. |
| FDBK-07 | 04 | SATISFIED | Same-post root-parent validation; nested/cross-post/missing parents reject. |
| FDBK-08 | 02, 03, 04 | SATISFIED | Explicit v1 post DTO carries author, board, open status, tags, and exact vote/comment totals. |
| COMP-02 | 02, 03, 04, 05 | SATISFIED | Typed read/participation/admin client capabilities and packed host wrappers. |
| COMP-03 | 02, 03, 04, 05 | SATISFIED | Static DTO/privacy audit and explicit mappers. |
| COMP-04 | 05 | PARTIAL | Convex Auth fixture source compiles and uses `getAuthUserId`, but the conformance suite does not invoke the fixture. |
| COMP-05 | 05 | PARTIAL | Clerk fixture source compiles and uses verified identity, but the conformance suite does not invoke the fixture. |
| COMP-06 | 05 | BLOCKED | Better Auth fixture is not buildable against current helper/adapter/client types. |
| COMP-07 | 02, 03, 04, 05 | SATISFIED | Browser validators omit authority; forged extras cannot alter trusted wrapper facts. |
| QUAL-02 | 05 | BLOCKED | 25 generic conformance tests pass, but they do not execute actual fixture factories and Better Auth fixture compilation fails. |
| QUAL-03 | 01, 02, 03, 05 | SATISFIED | Clean tarball consumer codegen/typecheck/build and source-resolution checks passed. |
| QUAL-10 | 01, 02, 05 | SATISFIED | Root and packed package declare/include Apache-2.0 license. |

All 24 Phase 1 requirement IDs appear in plan frontmatter. No Phase 1 requirement is orphaned.

## Anti-Patterns and Disconfirmation Findings

| File | Pattern | Severity | Impact |
|---|---|---|---|
| `tests/conformance/*.test.ts` | Passing tests construct synthetic provider actors and never import `fixtures/auth-*` | BLOCKER | Green conformance output overstates real provider-fixture verification. |
| `tsconfig.json` | Only `src/**/*.ts` is compiled | BLOCKER | Broken fixture source is invisible to typecheck/build. |
| `package.json` / `scripts/test-packed-consumer.mjs` | `test:backend` runs the `convex-test` pagination file; the real-backend script is outside the release gate | WARNING | The manually run real-backend proof passes today but can regress without failing `npm test`. |
| `scripts/test-pagination-backend.mjs` | Test-only public harness accepts `scopeId` and actor directly | WARNING | The real-backend pagination proof bypasses the trusted host factories, so it does not prove the authority boundary on the real runtime. |
| `src/component/admin/installation.ts` | Reconfiguration updates/inserts requested boards but never reconciles omitted boards | WARNING | Repeated disjoint configurations can accumulate more than the 20-board browse cap and duplicate sort orders; no test covers this path. |
| `src/component/public/posts.ts` | `countPosts` returns `take(51).length` without a truncation signal | WARNING | Counts above 51 are silently inexact; existing tests cover only count 1. This does not affect per-post vote/comment totals required by FDBK-08. |

No unreferenced `TBD`, `FIXME`, or `XXX` markers, placeholder implementations, unbounded component `.collect()` paths, provider imports in component source, or repository-relative packed imports were found.

## Human Verification Required

None before gap closure: the provider integration failure is deterministic and must be fixed in code/tests, not accepted through manual UAT. After closure, the actual three provider fixtures should be exercised through their supported server helper environments as the final integration confirmation.

## Gaps Summary

The component domain, scope isolation, participation invariants, DTO privacy, packed artifact, Vite consumer, and real-Convex pagination behavior are implemented and green from the committed TS 6 baseline. Phase completion is blocked because the phase's defining three-provider claim is not executable: the test suite substitutes pure normalizers and a generic mock harness for the actual fixtures, and the Better Auth fixture fails compilation against the current package/helper types. This prevents COMP-06 and QUAL-02, and therefore the roadmap's third success criterion, from being verified.

The board-reconfiguration, exact-count, and real-backend-gate findings are warnings for the closure plan/review; they are not the root blocker reported in frontmatter.

---

_Verified: 2026-07-16T17:17:34Z_
_Verifier: repo-local gsd-verifier role via generic-agent workaround_
