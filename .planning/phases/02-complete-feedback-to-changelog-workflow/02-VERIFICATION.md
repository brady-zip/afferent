---
phase: 02-complete-feedback-to-changelog-workflow
verified: 2026-07-21T05:02:25Z
status: gaps_found
score: 61/64 must-haves verified
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 58/59
  gaps_closed:
    - "Both real readers now delegate every one- and two-stream page to one scope/post-indexed mergedStream helper with complete native tie keys and symmetric start/end envelopes."
    - "Installed component point-query evidence now proves exact three-plus-page merged comment and activity traversal, pinned comment windows, source redirects, cleanup repoints, merged-to-single reset, and bounded cursor continuation."
  gaps_remaining:
    - "A correctly namespaced cursor envelope can still carry an invalid inner position that reaches convex-helpers JSON.parse and throws instead of clean-resetting."
    - "The declared real-product every-publication watch oracle is absent: test-headless-backend remains a synthetic comment-only query and never watches installed merged comments or activity."
  regressions: []
gaps:
  - truth: "Both length-1 and length-2 reader sets honor paginationOpts.cursor and paginationOpts.endCursor through one opaque versioned envelope carrying order kind and stream-set signature; malformed or stale envelopes cleanly reset to a fresh maximal coherent prefix."
    status: partial
    reason: "Outer prefix/base64/JSON and reader/order/stream mismatches reset, but decodeCursor accepts any string position. A valid outer envelope whose position is not a serialized convex-helpers IndexKey is passed into mergedStream.paginate, whose deserializeCursor performs JSON.parse outside decodeCursor's catch. That input throws instead of returning a fresh prefix."
    artifacts:
      - path: src/component/model/mergedPagination.ts
        issue: "decodeCursor validates typeof parsed.position only and returns it at lines 82-103; paginate receives it at lines 141-183 without validating the inner cursor grammar."
      - path: scripts/test-merge-backend.mjs
        issue: "Cursor fuzz at lines 433-457 changes outer metadata only and never corrupts the inner position for either cursor or endCursor."
    missing:
      - "Validate/catch the helper position before pagination, or catch helper cursor deserialization and execute the same symmetric fresh-prefix reset."
      - "Add real component tests for malformed inner positions in cursor and endCursor, for comments and activity, covering both one- and two-stream reader sets."
  - truth: "Mounted and disposable-real-Convex recorders accept every publication only when it is the exact prior/current canonical window or the exact maximal prefix paired with a typed fault, including load-more, insertion, deletion, recovery, and identity replacement."
    status: failed
    reason: "Plan 02-16 declared a real installed-component watch seam, but scripts/test-headless-backend.mjs was not changed and still creates its own comments table plus harness:listComments native paginator. It contains no installed Afferent component, real merge, listPostActivity query, or merged reader watch. The new merge harness uses ConvexHttpClient point queries, so it cannot prove publication coherence, faults, or generation disposal for the real product paths."
    artifacts:
      - path: scripts/test-headless-backend.mjs
        issue: "Lines 27-45 define a synthetic schema; lines 286-305 paginate the synthetic comments table. The required components.afferent.public.comments.listComments key link is absent."
      - path: scripts/test-merge-backend.mjs
        issue: "Lines 350-473 exercise exact installed point-query pages but never createPaginatedWatchStore or ConvexReactClient watches for comments/activity."
      - path: tests/integration/headless-backend.test.mjs
        issue: "Lines 99-109 only grep merge-harness source tokens and do not execute or inspect every-publication behavior."
    missing:
      - "Wire the disposable watch harness to the installed component's real listComments and listPostActivity wrappers after an actual merge."
      - "Exercise real merged comments and activity through rapid loadMore, pinned insert/delete and cleanup repoint, first/middle/tail faults and recovery, and A-to-B-to-A generation replacement with exact prior/current/prefix publication and exact-once disposal assertions."
      - "Cover activity endCursor/reset/fault paths and both reader cardinalities instead of relying on the shared-helper inference."
behavior_unverified_items:
  - truth: "Pinned windows survive source-row repoint during cleaning because cursor positions contain only repoint-invariant order keys, while single-to-merged cutover and merged-to-single completion reset rather than overlap."
    test: "Reuse real comment and activity cursors across a one-to-two cutover, cleanup repoints, and a two-to-one completion, recording every installed query publication."
    expected: "Cleanup preserves the exact pinned window; each reader-set transition publishes one fresh maximal prefix with no overlap or mixed generation."
    why_human: "The code is present and the two-to-one comment case passes, but no behavioral test exercises one-to-two reuse, activity transitions, or every-publication overlap."
---

# Phase 2: Complete Feedback-to-Changelog Workflow Verification Report

**Phase Goal:** As a developer integrating Afferent into my existing Convex + React application, I want to run the complete provider-neutral feedback-to-roadmap-to-changelog workflow -- ranked, searchable, and filterable discovery with admin duplicate merges; authenticated participation; admin moderation with a status-driven public roadmap; manually published changelog entries linked to feedback; and in-app notifications backed by a host-consumable delivery outbox -- through tested component APIs and framework-light headless React hooks with explicit async, auth, and error states, so that my users and admins can complete the entire feedback lifecycle while I retain ownership of identity, authorization, and my own presentation.

**Verified:** 2026-07-21T05:02:25Z
**Status:** gaps_found
**Re-verification:** Yes -- after Plan 02-16
**Score:** 61/64 must-haves verified (1 additional truth is present but behavior-unverified)

## User Flow Coverage

| Step | Expected | Evidence | Status |
| --- | --- | --- | --- |
| Integrate | The host injects stable function references and headless consumers receive versioned flat DTOs without browser authority | Prior Phase 2 host, DTO, React, and packed boundaries remain present; `npm run test:package`, typecheck, and lint pass | VERIFIED BASELINE |
| Follow a merged discussion | Visitors traverse every canonical/source comment in exact full-key order through real component pages and reactive headless windows | Installed point-query traversal passes, but malformed inner positions can throw and the real merged watch oracle is absent | FAILED |
| Inspect merged activity | Admins traverse append-only canonical/source activity in exact native descending order with stable page windows | Installed point-query traversal passes; activity end-window/reset/fault and reactive publication cases are not exercised | PARTIAL |
| Complete the lifecycle | Users/admins complete the lifecycle while the host owns identity, authorization, and presentation | Trust and ownership remain intact, but the merged reactive read contract is not closed | BLOCKED |

## Final Verdict

Plan 02-16 closes the original hand-rolled pagination algorithm defect: comments and activity now share one index-bounded `mergedStream` implementation using the complete native order keys and a reader/order/stream envelope. Exact installed point-query traversal passes for both domains.

Phase 2 still cannot pass. The malformed-input contract is incomplete at the inner helper-position boundary, and the plan's mandatory real-product reactive oracle was not implemented. The existing synthetic watch harness proves the shared React store in isolation, while the merge harness proves installed component point queries; neither proves their required composition. These are Phase 2 gaps and are not deferred to Phase 3.

## Goal Achievement

### Roadmap Success Criteria

| Roadmap success criterion | Status | Evidence |
| --- | --- | --- |
| Ranked/filterable/searchable discovery and lossless duplicate merge | PARTIAL | Stored relations and exact merged point-query traversal pass, but one malformed cursor path throws and real reactive traversal is not proved. |
| Authorized moderation, status, tags, activity, safe content, and rate limits | PARTIAL | Baseline moderation remains intact and activity order passes point-query traversal; its complete cursor-window/watch lifecycle is unproved. |
| Status-derived roadmap and manually published changelog | VERIFIED BASELINE | Plan 02-16 does not alter these surfaces; prior artifacts remain present. |
| Fixed in-app notifications and typed host delivery outbox | VERIFIED BASELINE | Plan 02-16 does not alter notification/outbox surfaces; prior artifacts remain present. |
| Complete workflow through injected headless refs with explicit async/auth/error/pagination states and tests | FAILED | The real merged component readers are not connected to the every-publication headless acceptance recorder. |

### Must-Have Accounting

The previous report contained 55 roadmap/Plan 02-01 through 02-14 truths plus four Plan 02-15 truths. Plan 02-16's six detailed truths replace the one overlapping failed Plan 02-15 merged-publication truth, producing 64 deduplicated truths. The 58 previously passing truths received quick regression checks; current product changes are limited to the two reader call sites, their shared helper, generated inventory, and tests, and no regression was found.

| Scope | Verified | Total | Result |
| --- | ---: | ---: | --- |
| Previous non-overlapping baseline | 58 | 58 | No regression found |
| Plan 02-16 detailed closure truths | 3 | 6 | Two failed; one behavior-unverified |
| **Total** | **61** | **64** | **GAPS_FOUND** |

### Plan 02-16 Observable Truths

| # | Truth | Status | Independent evidence |
| --- | --- | --- | --- |
| 1 | Real duplicate merges page every canonical/source comment once in ascending `(_creationTime,_id)` order | VERIFIED | `tests/component/merge.test.ts` and the installed `scripts/test-merge-backend.mjs` walk 3+ exact pages with equal-time ties; verifier reruns passed. |
| 2 | Real duplicate merges page every activity row once in descending `(occurredAt,_creationTime,_id)` order | VERIFIED | The same component and installed harness compare full ordered activity ID arrays across 3+ pages; verifier reruns passed. |
| 3 | One/two streams honor cursor/endCursor envelopes and malformed/stale envelopes clean-reset | FAILED | Metadata mismatches reset, but a valid envelope with an invalid string `position` escapes decoding and can throw in helper `JSON.parse`. |
| 4 | Cleanup repoints preserve pins and 1-to-2-to-1 transitions reset without overlap | PRESENT_BEHAVIOR_UNVERIFIED | Repoint-invariant order and stream-set reset wiring exist; only the two-to-one comment case and one pinned comment repoint are behaviorally exercised. |
| 5 | Deep pages are index-bounded and DTO/scope/auth/visibility/headless boundaries remain unchanged | VERIFIED | Both streams use scope/post equality indexes, full-key `mergedStream.paginate`, and propagate row/byte budgets; no schema, writer, DTO, React, or package surface changed. |
| 6 | Real installed watches accept every publication across load-more, mutation, fault/recovery, and identity replacement | FAILED | The declared product key link is absent; the reactive harness uses a synthetic local comments query and has no activity reader. |

## Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/component/model/mergedPagination.ts` | Shared namespaced one/two-stream paginator | PARTIAL | Substantive and wired; full keys, budgets, and envelope metadata exist, but inner position grammar is not guarded. |
| `src/component/public/comments.ts` | Real merged comment reader | VERIFIED | Uses `mergeReadPostIds` and delegates all cardinalities to the shared ascending helper while preserving auth/scope/DTO mapping. |
| `src/component/admin/activity.ts` | Real merged activity reader | VERIFIED | Delegates all cardinalities to the shared descending helper while preserving scope/DTO mapping. |
| `scripts/test-merge-backend.mjs` | Installed merge-state, cursor, cleanup, and boundedness oracle | PARTIAL | Runs real component point queries and exact arrays, but does not watch publications or cover the full transition/fault matrix. |
| `scripts/test-headless-backend.mjs` | Installed real-product comment/activity watch oracle | FAILED / HOLLOW FOR THIS TRUTH | Substantive for the generic React store, but its schema and listComments query are synthetic and it has no activity or merge path. |

Artifact query: **5/5 present/substantive**. Presence does not rescue the hollow product-watch data source.

## Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/component/public/comments.ts` | `src/component/model/mergedPagination.ts` | `paginateMergedPostStream` | WIRED | Verified by query and source trace. |
| `src/component/admin/activity.ts` | `src/component/model/mergedPagination.ts` | `paginateMergedPostStream` | WIRED | Verified by query and source trace. |
| `src/component/admin/activity.ts` | `src/component/schema.ts` | `by_scope_post_occurred` native order | WIRED | Helper uses the existing scope/post/occurred index. |
| `scripts/test-headless-backend.mjs` | installed `public.comments.listComments` | post-merge watch wrapper | NOT WIRED | Required pattern absent; the script defines `harness:listComments` over its own table. |
| `scripts/test-merge-backend.mjs` | installed `admin.activity.listPostActivity` | real component wrapper | WIRED | Exact point-query pages run through the installed component. |

Automated key-link query: **4/5 verified**.

## Data-Flow Trace

| Artifact | Source | Produces real product data | Status |
| --- | --- | --- | --- |
| `public/comments.ts` | `mergeReadPostIds` -> scoped `comments.by_scope_post` streams -> `toCommentDto` | Yes | FLOWING |
| `admin/activity.ts` | `mergeReadPostIds` -> scoped `postActivity.by_scope_post_occurred` streams -> `toPostActivityDto` | Yes | FLOWING |
| `scripts/test-merge-backend.mjs` | installed component wrappers after real staged merge | Yes, point queries | FLOWING / NON-REACTIVE |
| `scripts/test-headless-backend.mjs` | disposable harness-owned `comments.by_post_position` query | No merged product data | HOLLOW FOR PLAN 02-16 |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Focused model/component/moderation/static matrix | `npm exec -- vitest run tests/model/merged-pagination.test.ts tests/component/merge.test.ts tests/component/moderation.test.ts tests/static/schema-scope.test.ts` | 4 files, 10 tests passed | PASS |
| Integration source/wiring checks | `node --test tests/integration/headless-backend.test.mjs` | 4/4 passed | PASS, source-level only |
| Installed real merge/component pages | `node scripts/test-merge-backend.mjs` | Exit 0; installed component ready across restarts | PASS |
| Disposable every-publication synthetic harness | `node scripts/test-headless-backend.mjs` | First verifier run timed out on pending comment load at a two-row prefix; immediate rerun passed | FLAKY; not product-path evidence |
| Type boundary | `npm run typecheck` | Exit 0 | PASS |
| Lint | `npm run lint` | Exit 0 | PASS |
| Packed consumer | `npm run test:package` | 3/3 passed | PASS |

No separate phase probes are declared. The two documented disposable backend scripts were run directly.

## Requirements Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| DISC-07 | BLOCKED | Relation preservation and exact merged point pages pass; malformed inner cursor handling and merged reactive traversal remain incomplete. |
| ADMN-10 | BLOCKED | Exact ordered activity pages pass, but end-window/reset/fault/reactive transition coverage is absent and the shared malformed-position defect applies. |
| UI-03 | BLOCKED | Closed headless pagination states are proven only against the synthetic query, not the real installed merged readers. |
| QUAL-01 | BLOCKED | The declared acceptance key link and behavior matrix were not implemented; a source-token test cannot substitute for it. |
| All other Phase 2 requirements | SATISFIED BASELINE | No Plan 02-16 or working-tree change touches their product surfaces; targeted regression gates pass. |

No Phase 2 requirement is orphaned from its plans. No identified gap is explicitly deferred by a later roadmap phase.

## Anti-Patterns and Disconfirmation Pass

| Concern | Evidence | Severity | Impact |
| --- | --- | --- | --- |
| Missing wiring | Plan key-link query reports 4/5; installed comments watch pattern is absent from `test-headless-backend` | BLOCKER | The highest-risk component-to-headless composition remains untested. |
| Valid outer envelope, invalid inner cursor | `decodeCursor` returns any string position; convex-helpers deserializes with `JSON.parse` | BLOCKER | Untrusted pagination input can throw instead of clean reset. |
| Misleading passing test | `tests/integration/headless-backend.test.mjs` checks only that merge-script source contains broad tokens | WARNING | It can pass while the required every-publication watch path is absent. |
| Uncovered error path | No cursor test rewrites `position`; no activity error/fault watch exists | WARNING | The failing malformed-position path escaped the red/green matrix. |
| Nondeterministic existing oracle | `test-headless-backend` failed once and passed once on the same tree | WARNING | Acceptance is not consistently reproducible, though this script was not changed by Plan 02-16. |

No unreferenced `TBD`, `FIXME`, or `XXX` blocker markers were found in Plan 02-16 source/test files. Test-only `return null` handlers are substantive mutations, not stubs.

## Gaps Summary

Two deterministic gaps block Phase 2:

1. Guard the inner convex-helpers cursor position so every malformed cursor/endCursor envelope resets symmetrically instead of throwing, with real one/two-stream comments/activity tests.
2. Implement the missing installed-product reactive watch oracle for merged comments and activity, including the full publication, transition, mutation, fault/recovery, and identity-disposal matrix required by Plan 02-16.

One additional transition/pinning truth remains present but behavior-unverified until the real product watch matrix exercises both domains across one-to-two-to-one reader-set changes.

---

_Verified: 2026-07-21T05:02:25Z_
_Verifier: generic-agent workaround using the installed gsd-verifier role_
