---
phase: 02-complete-feedback-to-changelog-workflow
verified: 2026-07-21T05:33:31Z
status: gaps_found
score: 62/64 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 61/64
  gaps_closed:
    - "Cursor decoding now treats the embedded convex-helpers position as untrusted JSON/Convex data and clean-resets non-IndexKey values for cursor and endCursor across both reader cardinalities."
    - "The disposable headless harness now installs Afferent, calls the real comment and activity component queries through host wrappers, drives an actual merge, and records both domains across load-more, mutations, faults, cleanup, transitions, and disposal."
  gaps_remaining:
    - "The installed-product publication recorder accepts every prefix of the prior/current full truth, so an undersized non-error window, a torn reset, or a non-maximal fault prefix can pass; it also omits the required active-boundary assertion."
    - "The same permissive oracle means cleanup pinning and 1-to-2-to-1 transitions settle correctly but are not proved exact at every publication; the disposable headless gate also failed once and passed once on the unchanged tree."
  regressions:
    - "node scripts/test-headless-backend.mjs timed out once in the pending-comment load mutation case, then passed on immediate rerun."
gaps:
  - truth: "Pinned windows survive source-row repoint during cleaning because cursor positions contain only repoint-invariant order keys, while single-to-merged cutover and merged-to-single completion reset rather than overlap."
    status: failed
    reason: "The real product path and all three lifecycle stages are now exercised, but assertPrefixesSince permits every shorter prefix of either endpoint and the product path never invokes an active-boundary inspector. A transient gap, truncated pinned window, or incomplete reset therefore passes as long as it later converges."
    artifacts:
      - path: scripts/test-headless-backend.mjs
        issue: "exactPrefixes at lines 1004-1019 admits lengths 0..N; transition and cleanup assertions at lines 1201-1210 and 1477-1492 use that permissive set, with cleanup publications optional."
      - path: src/react/query.ts
        issue: "The end-boundary mismatch restart at lines 312-327 and 401-407 is substantive, but its real installed transition behavior is not checked against exact active descriptor boundaries."
    missing:
      - "Record the expected loaded cursor window at each notification and require exact prior/current coherent-window equality, not arbitrary prefix membership."
      - "Run the existing active-boundary inspector on the installed comment and activity stores through cutover, cleanup repoints, and completion, proving exactly one contiguous chain and one unbounded tail."
  - truth: "Mounted and disposable-real-Convex recorders accept every publication only when it is the exact prior/current canonical window or the exact maximal prefix paired with a typed fault, including load-more, insertion, deletion, recovery, and identity replacement."
    status: failed
    reason: "The installed wiring and scenario breadth are present, but the oracle is weaker than the truth. Normal and Error publications may be any prefix, the typed fault is checked independently of prefix maximality, and A-to-B-to-A is implemented as sequential dispose/create without an in-flight stale-result stimulus. The harness can therefore pass publication loss that the plan explicitly requires it to reject."
    artifacts:
      - path: scripts/test-headless-backend.mjs
        issue: "assertPrefixesSince at lines 1034-1058 accepts arbitrary prefixes for every status and merely requires that some Error publication carry the code. Fault checks at lines 1212-1250 never compute the exact maximal contiguous prefix for the failed descriptor."
      - path: scripts/test-headless-backend.mjs
        issue: "Identity coverage at lines 1496-1551 proves exact-once disposal after explicit teardown, but does not inject or reject a late old-identity result/error/pending operation under the replacement."
    missing:
      - "Restore the exact temporal oracle: non-error publications must equal the precise prior/current loaded window; Error publications must equal the exact maximal contiguous prefix for the failing first/middle/tail descriptor and carry the typed error."
      - "Add a negative assertion proving an arbitrary shorter prefix fails, inspect active boundaries, and exercise a stale in-flight A result during A-to-B-to-A replacement."
---

# Phase 2: Complete Feedback-to-Changelog Workflow Verification Report

**Phase Goal:** As a developer integrating Afferent into my existing Convex + React application, I want to run the complete provider-neutral feedback-to-roadmap-to-changelog workflow -- ranked, searchable, and filterable discovery with admin duplicate merges; authenticated participation; admin moderation with a status-driven public roadmap; manually published changelog entries linked to feedback; and in-app notifications backed by a host-consumable delivery outbox -- through tested component APIs and framework-light headless React hooks with explicit async, auth, and error states, so that my users and admins can complete the entire feedback lifecycle while I retain ownership of identity, authorization, and my own presentation.

**Verified:** 2026-07-21T05:33:31Z

**Status:** gaps_found

**Re-verification:** Yes -- after the bounded Plan 02-16 retry

**Score:** 62/64 must-haves verified

## Final Verdict

The bounded retry fixes the malformed-inner-position defect and supplies the previously missing installed-component watch composition. Both real readers now run through `createPaginatedWatchStore` against an installed Afferent component after an actual merge, and the harness exercises comments and activity through cutover, faults, mutations, cleanup, completion, and disposal.

Phase 2 still cannot pass. The test named as the every-publication oracle accepts every prefix of the prior/current backend truth. That is strictly weaker than Plan 02-16's exact prior/current loaded-window or exact maximal fault-prefix contract: an empty or truncated non-error publication passes, and any Error prefix passes if some publication has the expected code. Because the transition/repoint assertions reuse the same predicate and omit active-boundary inspection, both the transition truth and the general publication truth remain unsupported. The first independent headless run also failed before an immediate rerun passed, so the required regression command is not reproducibly green.

## Must-Have Accounting

The 58 non-overlapping Phase 2 baseline truths remain supported. Of Plan 02-16's six detailed truths, exact merged comment order, exact merged activity order, total cursor decoding, and bounded/trust-boundary preservation are verified. The pinning/reader-transition truth and exact every-publication truth fail their written acceptance standard.

| Scope | Verified | Total | Result |
| --- | ---: | ---: | --- |
| Previous non-overlapping baseline | 58 | 58 | No regression found |
| Plan 02-16 detailed closure truths | 4 | 6 | Two failed |
| **Total** | **62** | **64** | **GAPS_FOUND** |

### Plan 02-16 Observable Truths

| # | Truth | Status | Independent evidence |
| --- | --- | --- | --- |
| 1 | Real duplicate merges page every canonical/source comment once in ascending `(_creationTime,_id)` order | VERIFIED | Focused component tests and `scripts/test-merge-backend.mjs` traverse exact multi-page installed results with ties. |
| 2 | Real duplicate merges page every activity row once in descending `(occurredAt,_creationTime,_id)` order | VERIFIED | The same focused and installed gates compare exact ordered activity arrays. |
| 3 | One/two streams honor cursor/endCursor envelopes and malformed/stale envelopes clean-reset | VERIFIED | `decodeCursor` now parses the inner position under `JSON.parse` + `jsonToConvex`, requires the helper's array-shaped `IndexKey`, and resets both bounds on failure; focused corrupt-position tests pass for comments/activity and one/two streams. |
| 4 | Cleanup repoints preserve pins and 1-to-2-to-1 transitions reset without overlap | FAILED | Real transitions execute and converge, but the arbitrary-prefix oracle and absent boundary inspector can accept transient loss or an incomplete reset. |
| 5 | Deep pages are index-bounded and DTO/scope/auth/visibility/headless boundaries remain unchanged | VERIFIED | Both readers retain scope/post-leading indexed streams, native full keys, read budgets, and unchanged schema/DTO/authority/package surfaces. |
| 6 | Real installed watches accept every publication across load-more, mutation, fault/recovery, and identity replacement | FAILED | Installed wiring exists, but the assertion admits any prefix and does not pair faults with the exact maximal failed-page prefix or stimulate a late old-identity completion. |

## User Flow and Requirement Coverage

| Surface | Status | Evidence |
| --- | --- | --- |
| Follow a merged discussion | PARTIAL | Exact point-query order and final watch convergence pass; exact temporal publication/pinning does not. |
| Inspect merged activity | PARTIAL | Exact point-query order and final watch convergence pass; the same temporal oracle gap applies. |
| Complete lifecycle through headless refs | BLOCKED | A consumer can reach the real component paths, but the required proof against transient gaps/torn publications is incomplete. |
| DISC-07 | BLOCKED | Relation preservation and final exact order pass; reactive no-gap/no-overlap publication is not proved. |
| ADMN-10 | BLOCKED | Activity traversal passes; reactive fault and transition prefix exactness is not proved. |
| UI-03 | BLOCKED | The real store is wired, but its every-publication acceptance oracle is unsound for this contract. |
| QUAL-01 | BLOCKED | One required command was flaky and two detailed Plan 02-16 truths lack rejection-capable oracles. |
| Other Phase 2 requirements | SATISFIED BASELINE | Retry commits do not touch their product surfaces and targeted regression gates pass. |

No Phase 2 requirement is orphaned from its plans, and no remaining gap is explicitly deferred to Phase 3.

## Artifact and Key-Link Verification

| Artifact / link | Status | Details |
| --- | --- | --- |
| `src/component/model/mergedPagination.ts` | VERIFIED | Shared one/two-stream helper, total non-throwing inner decode, native full keys, and symmetric reset are present. |
| `src/component/public/comments.ts` -> shared helper | VERIFIED | Real comment reader delegates to `paginateMergedPostStream`. |
| `src/component/admin/activity.ts` -> shared helper/index | VERIFIED | Real activity reader delegates through `by_scope_post_occurred`. |
| `scripts/test-merge-backend.mjs` -> installed activity query | VERIFIED | Exact installed point-query pages run after a real staged merge. |
| `scripts/test-headless-backend.mjs` -> installed comments/activity queries | WIRED, ORACLE INSUFFICIENT | Copied component, host wrappers, real watches, merge lifecycle, mutations, faults, cleanup, and disposal are present; acceptance predicate is too permissive. |

Automated artifact query: **5/5 present/substantive**.

Automated key-link query: **5/5 wired**.

## Behavioral Evidence

| Command | Fresh verifier result | Assessment |
| --- | --- | --- |
| `npm exec -- vitest run tests/model/merged-pagination.test.ts tests/component/merge.test.ts tests/component/moderation.test.ts tests/static/schema-scope.test.ts` | 4 files, 10 tests passed | PASS |
| `node --test tests/integration/headless-backend.test.mjs` | 5/5 passed | PASS; source/wiring assertions only |
| `npm run test:react` | 11 files, 51 tests passed | PASS |
| `node scripts/test-merge-backend.mjs` | Exit 0 | PASS |
| `node scripts/test-headless-backend.mjs` | First run timed out waiting for pending comment-load mutation with `[pending-a,pending-new]`; immediate rerun passed | FLAKY / NOT A RELIABLE GATE |
| `npm run typecheck` | Exit 0 | PASS |
| `npm run lint` | Exit 0 | PASS |
| `npm run test:package` | 3/3 passed | PASS |

The headless failure was captured by h5i as object `47672702ab29ed0c`. The passing installed merge run was captured as `3770f5d0e82f7566`.

## Disconfirmation Findings

| Finding | Severity | Why it matters |
| --- | --- | --- |
| `exactPrefixes` generates lengths `0..N` for every allowed truth sequence | BLOCKER | Arbitrary data loss can satisfy the supposed every-publication oracle. |
| Fault code assertion is independent of prefix maximality | BLOCKER | A typed Error with the wrong retained page prefix passes. |
| Product transition path never calls the available active-boundary inspector | BLOCKER | Duplicate tails, non-contiguous descriptors, or incomplete reset chains can escape detection. |
| Product A-to-B-to-A coverage disposes before constructing the next store | WARNING | Exact-once teardown is shown, but a late old-identity callback/result is not challenged on the installed path. |
| Same headless command failed then passed | WARNING | The mandatory acceptance gate is nondeterministic on the independently verified tree. |

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, placeholder, or empty-test stub was found in the retry-owned source/test paths. `git diff --check` passes. No schema, validator, public DTO, authority input, binding, package export, or package dependency was changed by the bounded retry.

## Required Closure

1. Replace arbitrary full-truth prefix membership with descriptor-aware exact temporal assertions. For every non-error notification, require the precise prior or current loaded coherent window. For first/middle/tail Error notifications, require the exact maximal contiguous prefix ending immediately before the failed descriptor and the typed error on that same publication.
2. Apply the active-boundary inspector to real installed comment and activity stores through 1-to-2 cutover, cleanup repoints, 2-to-1 completion, and append/restart operations; add a negative oracle test proving a shorter prefix is rejected.
3. Exercise a late old-generation callback/result/error during installed A-to-B-to-A replacement, then make `node scripts/test-headless-backend.mjs` reproducibly pass before rerunning the complete Plan 02-16 gate.

---

_Verified: 2026-07-21T05:33:31Z_

_Verifier: independent generic-agent fallback using the installed gsd-verifier role_
