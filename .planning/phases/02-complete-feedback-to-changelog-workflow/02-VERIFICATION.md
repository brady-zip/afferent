---
phase: 02-complete-feedback-to-changelog-workflow
verified: 2026-07-17T20:00:08Z
status: gaps_found
score: 38/39 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 38/39
  gaps_closed:
    - "Loaded page descriptors are now end-cursor-pinned, adjacent, structurally replaced atomically, generation-fenced, and exact at settled insertion/deletion/reorder/split/collapse checkpoints."
    - "The committed real oracle now uses exact ordered logical labels and rejects Set, nonempty, and ID-deduplication proxies."
  gaps_remaining:
    - "A cross-window reactive reorder still publishes an intermediate mixed-revision coherent-status snapshot before the exact current window."
  regressions: []
gaps:
  - truth: "Mounted and real Convex tests compare every observed coherent tick by exact ordered equality with canonical cursor-window truth; no gap, shortening, or mixed revision is published (D-47, QUAL-01)."
    status: failed
    reason: "A verifier-only listener on the real Convex store observed [a,b,back,f] with status CanLoadMore while moving e from the middle window to the front. The only canonical windows were the previous [a,b,e,back,f] and current [e,a,b,back,f]. The next tick was correct, but the intermediate deletion-only composition is neither revision and violates the every-tick contract."
    artifacts:
      - path: src/react/query.ts
        issue: "read updates and publishes one PageDescriptor.result at a time. coherentPrefix validates descriptor boundaries but has no revision-coherence check and does not refresh all affected watches before publication, so callbacks from one Convex revision can compose new and stale page results."
      - path: scripts/test-headless-backend.mjs
        issue: "assertCanonicalWindow validates selected settled snapshots only. The harness does not record and validate every store notification, despite Plan 02-13 requiring that oracle."
      - path: tests/integration/headless-backend.test.mjs
        issue: "The audit checks for helper names and forbidden weak source patterns, but does not require per-notification capture or execute a deliberately mixed-tick rejection case."
    missing:
      - "Publish a reactive page chain only when its constituent page results represent one coherent server revision, or synchronously refresh all affected local watch results before composing the snapshot."
      - "Record every real store notification and reject any result array that is not exactly the prior or current canonical cursor-bounded window for the observed revision."
---

# Phase 2: Complete Feedback-to-Changelog Workflow Verification Report

**Phase Goal:** As a developer integrating Afferent into my existing Convex + React application, I want to run the complete provider-neutral feedback-to-roadmap-to-changelog workflow -- ranked, searchable, and filterable discovery with admin duplicate merges; authenticated participation; admin moderation with a status-driven public roadmap; manually published changelog entries linked to feedback; and in-app notifications backed by a host-consumable delivery outbox -- through tested component APIs and framework-light headless React hooks with explicit async, auth, and error states, so that my users and admins can complete the entire feedback lifecycle while I retain ownership of identity, authorization, and my own presentation.

**Verified:** 2026-07-17T20:00:08Z
**Status:** gaps_found
**Re-verification:** Yes -- after additive gap-closure Plan 02-13
**Score:** 38/39 (unchanged)

## Final Verdict

Plan 02-13 fixes the previously reported settled-window failures. The implementation now pins every committed non-tail page with an `endCursor`, maintains identical adjacent boundaries, uses one unbounded tail, and atomically replaces the old chain for append, split, and collapse. The stock real Convex oracle proves exact settled arrays across front/middle/back insertion, deletion, empty-window collapse, reorder, real split thresholds, and required-split recovery. It no longer contains `new Set(` or `results.length > 0` proxy assertions.

The stronger stated acceptance criterion is still false. During a real sort-key movement across window boundaries, the store emits an intermediate `CanLoadMore` snapshot that mixes page results from two revisions. The committed harness waits through that tick and validates only the eventual correct snapshot. Phase 2 therefore remains `gaps_found` at 38/39.

## Three-Level Verification

| Artifact | Exists | Substantive | Wired / behavior | Status |
|---|---:|---:|---|---|
| `src/react/query.ts` | Yes | End-cursor page chain, structural operation queue, coherent prefix, typed errors, generation epoch | Settled windows and structure pass; per-callback results can mix revisions | PARTIAL |
| `tests/react/live-headless.test.tsx` | Yes | 15 mounted tests for pinning, rapid load, split, missing cursor, coherent-prefix error, collapse, generation disposal | Controlled transitions pass, but no multi-watch same-revision callback interleaving rejects a mixed tick | PARTIAL |
| `scripts/test-headless-backend.mjs` | Yes | Stable logical mutations, canonical query, watch tracking, exact labels/boundaries/disposal, native thresholds | Selected settled checkpoints pass; every notification is not recorded or checked | PARTIAL |
| `tests/integration/headless-backend.test.mjs` | Yes | Release wiring and weak-proxy source audit | Rejects `new Set(` and `results.length > 0`; does not enforce per-notification oracle behavior | PARTIAL |
| Packed React artifact | Yes | Existing provider/bindings/domain hooks and clean fixture | Clean tarball consumer passes | VERIFIED |

## Plan 02-13 Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Every committed loaded descriptor is an ordered window; non-tail pages have explicit `endCursor`; adjacent windows are contiguous | VERIFIED | `chainError`, append pinning, split descriptors, collapse replacement, mounted boundary checks, real `assertActiveBoundaries`. |
| 2 | Insert/delete/reorder/split/collapse publish exact current ordered windows without gaps/overlaps/dedupe/caps | FAILED | Settled arrays are exact, but real reorder emits intermediate `[a,b,back,f]`, omitting moved `e`. |
| 3 | Recommended content remains visible; required content waits for split; missing required cursor is typed error | VERIFIED | Mounted recommended/required cases pass. Real 1.42.2 threshold mapping and missing-cursor recovery pass. |
| 4 | Mid-chain failure publishes maximal coherent prefix and recovers | VERIFIED | Mounted middle failure returns `[a]` then `[a,b,c]`; real later-page failure retains `[a,b]` and recovers `[a,b,c,d]`. Source walk stops at the first error/pending page. |
| 5 | Append/split/collapse/load/recovery transitions are serialized and generation-fenced | VERIFIED | One `operation`, epoch checks, rapid-load tests, three repeated pending-append identity-switch disposal runs. |
| 6 | Every observed coherent tick is checked against canonical server truth; weak proxies cannot pass | FAILED | Weak proxies are gone, but the oracle checks only snapshots returned by `waitFor` and misses the falsifying intermediate tick. |

## Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| Tail page | Pinned old tail + new tail | `requestMore` captures `continueCursor` and starts one append operation | WIRED |
| Adjacent windows | Cursor boundary invariant | `endCursor[i] === cursor[i+1]` in `chainError` and real tracker | WIRED |
| Split result | Two bounded child watches | `splitDescriptors` plus atomic `commitOperation` | WIRED |
| Empty window | Deterministic adjacent merge | Serialized collapse replacement | WIRED |
| Auth transition | Structural callbacks | Store disposal/epoch and hook generation create a cold replacement store | WIRED |
| Page callback | Published exact revision | Per-page `result` assignment followed by immediate `refreshSnapshot` | NOT WIRED; sibling descriptors can still hold the prior revision |
| Real notification | Canonical oracle | `waitFor` followed by `assertCanonicalWindow` | PARTIAL; settled notifications only |

## Behavioral Evidence

| Behavior | Result |
|---|---|
| Plan 02-13 mounted file | PASS: 15/15 |
| All React suites | PASS: 11 files, 41 tests |
| Headless integration audit | PASS: 2/2 |
| Stock disposable Convex oracle | PASS: `Real Convex headless watch matrix passed` |
| Verifier-only every-notification reorder assertion | FAIL: observed `[a,b,back,f]` / `CanLoadMore`, then `[e,a,b,back,f]` |
| Build | PASS |
| Typecheck | PASS |
| Lint | PASS |
| Clean packed consumer | PASS: 3/3 |

The verifier-only assertion subscribed to every store publication immediately before the real `moveItem(e, position: 5)` mutation. It allowed only the exact previous `[a,b,e,back,f]` or current `[e,a,b,back,f]` canonical window. The store published `[a,b,back,f]`, causing an assertion failure, then converged to the correct current window. The assertion-only patch was restored; `scripts/test-headless-backend.mjs` has no worktree diff.

## Convex 1.42.2 Split-Signal Mapping

The real threshold probe establishes the runtime behavior rather than assuming the type vocabulary:

| `maximumBytesRead` | `pageStatus` | `splitCursor` |
|---:|---|---|
| 1200 | `SplitRequired` | absent |
| 1800 | `SplitRequired` | absent |
| 2300 | `SplitRequired` | present |
| 2800 | `SplitRequired` | present |
| 4300 | `SplitRequired` | present |
| 8000 | `null` | present |

Convex 1.42.2 uses `null` plus a `splitCursor` for the observed opportunistic case, not the literal `SplitRecommended` value. The store recognizes it through its oversized-page split rule, preserves the published parent until exact children are ready, and passes the real split. Required-without-cursor fails closed with typed `UNKNOWN` state and later recovers without remounting.

## Prior Gap and Regression Check

- The Plan 02-12 non-throwing direct/paginated error contract remains intact.
- Required opaque identity tokens and synchronous query/page/mutation/retry/optimistic generation fencing remain intact.
- Coherent-prefix error state, recovery, rapid load rejection, split/collapse serialization, and stale generation disposal pass the mounted matrix.
- Packed declarations/runtime, build, typecheck, and lint pass.
- No `Set` uniqueness, nonempty output, or ID-deduplication proxy remains in the real harness. The remaining failure is temporal revision coherence, not settled ordering.

## Requirements Coverage

| Requirement(s) | Status | Note |
|---|---|---|
| DISC-01..08 | SATISFIED with D-47 caveat | Backend discovery/search/merge and settled headless windows pass; one mixed reactive tick remains. |
| ADMN-01..10, RMAP-01..03, CHLG-01..06, NOTF-01..07 | SATISFIED | No regression found. |
| UI-01, UI-02 | SATISFIED | Published domain hooks and injected bindings remain packaged. |
| UI-03 | BLOCKED | A published pagination state can briefly omit a moved item while reporting `CanLoadMore`. |
| QUAL-01 | BLOCKED | The required every-notification real oracle is absent and the settled-only oracle misses the defect. |

All 38 Phase 2 requirement IDs remain mapped. Checked roadmap/requirement boxes do not override behavioral verification.

## Human Verification Required

None. The remaining issue is deterministic and programmatically reproduced against disposable real Convex 1.42.2.

## Deferred-Item Check

The remaining D-47/QUAL-01 gap is not deferred. Phase 3 consumes the headless store and cannot make its emitted snapshots revision-coherent.

## Gaps Summary

Plan 02-13 successfully replaces the independent cursor model with contiguous end-cursor-pinned windows and closes all previously observed settled growth/split losses. Split, collapse, errors, recovery, rapid loads, disposal, and packed compatibility pass.

One blocker remains: exactness is not atomic across sibling watch callbacks. A real cross-window reorder emits a transient shortened array with a ready pagination status, and the committed oracle never inspects that notification. Phase 2 stays at `gaps_found` 38/39 until publication and the real oracle are revision-coherent at every observed tick.

---

_Re-verified: 2026-07-17T20:00:08Z_
_Verifier: generic-agent workaround for gsd-verifier_
