---
phase: 02-complete-feedback-to-changelog-workflow
verified: 2026-07-21T15:23:56Z
status: gaps_found
score: 62/64 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 62/64
  gaps_closed:
    - "The pure oracle now rejects truncated non-error publications, separately mismatched fault prefixes/codes, overlapping/gapped modeled chains, zero publications, and accepted stale-delivery evidence."
    - "Installed comment and activity scenarios now require exact ordered publication count, status, IDs, error code, and modeled boundaries for initial load, mutations, load-more, first/middle/tail faults, recovery, cleanup, completion, and explicit retry."
    - "The descriptorless restart publication was fixed in the private paginated watch store, the prior incomplete-comment scheduler race was removed, three direct harness runs pass consecutively, and the complete Phase 2 gate passes once without retry."
  gaps_remaining:
    - "Merge cutover, cleanup, and completion still run with one unbounded descriptor, so no pinned multi-page window or actual 1-to-2-to-1 descriptor restart is exercised; the boundary extractor can also ignore additional active records by selecting one snapshot-matching chain."
    - "The real installed A-to-B-to-A path proves final snapshot/boundary/error stability after releasing old callbacks, but does not record the B/current-A publication sequences or include current publication count in its before/after evidence."
  regressions: []
gaps:
  - truth: "Pinned windows survive source-row repoint during cleaning because cursor positions contain only repoint-invariant order keys, while single-to-merged cutover and merged-to-single completion reset rather than overlap."
    status: failed
    reason: "The installed lifecycle seeds only eight comments and eight activity rows but creates each transition store with initialNumItems=50. Its modeled chain is therefore always [{cursor:null,numItems:50}] through cutover, cleanup, and completion: no endCursor is pinned and no reader-set transition restart occurs. In addition, activeProductBoundaries explicitly falls back to one chain whose rows match the snapshot while leaving other active records unaccounted for, so extra/overlapping active descriptors can pass the supposed one-chain oracle."
    artifacts:
      - path: scripts/test-headless-backend.mjs
        issue: "The seed limits comments/activity to index < 8 at lines 116-143, makeStore defaults to 50 at lines 1203-1219, and the lifecycle hard-codes one unbounded boundary at lines 1235-1251 through the 1-to-2 and cleanup assertions."
      - path: scripts/test-headless-backend.mjs
        issue: "activeProductBoundaries at lines 1035-1072 selects one snapshot-matching candidate when all active records do not form one chain, rather than rejecting the extra active records. The pure overlap/gap fixtures never exercise this extractor fallback."
    missing:
      - "Load at least two real comment and activity descriptors before cutover, retain exact pinned boundaries through every cleanup repoint, and require explicit descriptor-backed restart sequences at both 1-to-2 and 2-to-1 transitions."
      - "Make reader/store/generation-scoped extraction fail when any active record is outside the one expected contiguous chain, and add a negative extractor fixture with an additional active tail/overlapping chain."
  - truth: "Mounted and disposable-real-Convex recorders accept every publication only when it is the exact prior/current canonical window or the exact maximal prefix paired with a typed fault, including load-more, insertion, deletion, recovery, and identity replacement."
    status: failed
    reason: "Exact rejection now covers ordinary installed publications and coupled first/middle/tail faults. Identity replacement remains final-state-only on the installed path: B and current A use empty subscriptions plus waitFor, not recordExactProductPublications, and the release observer omits publication count. The generic mounted test checks count, but no real installed comment/activity recorder proves every replacement publication or that releasing the old result/error added zero current publications."
    artifacts:
      - path: scripts/test-headless-backend.mjs
        issue: "The installed identity loop at lines 1553-1631 subscribes with no recorder, waits only for Exhausted, and observes IDs/status/error/boundaries without a publication counter before releasing the deferred result and error."
      - path: tests/react/live-headless.test.tsx
        issue: "The controlled common-store test proves publication count is unchanged, but it is not wired to the installed listComments/listPostActivity lifecycle required by this truth."
    missing:
      - "Attach the exact installed recorder to B and current A, model every replacement publication, and include current publication count in the before/after stale-result and stale-error release evidence for both readers."
      - "Require zero extra current publications after each old callback release, while retaining the exact snapshot, boundary, status, and error assertions."
---

# Phase 2: Complete Feedback-to-Changelog Workflow Verification Report

**Phase Goal:** As a developer integrating Afferent into my existing Convex + React application, I want to run the complete provider-neutral feedback-to-roadmap-to-changelog workflow -- ranked, searchable, and filterable discovery with admin duplicate merges; authenticated participation; admin moderation with a status-driven roadmap; manually published changelog entries linked to feedback; and in-app notifications backed by a host-consumable delivery outbox -- through tested component APIs and framework-light headless React hooks with explicit async, auth, and error states, so that my users and admins can complete the entire feedback lifecycle while I retain ownership of identity, authorization, and my own presentation.

**Verified:** 2026-07-21T15:23:56Z

**Status:** gaps_found

**Re-verification:** Yes -- after committed Plan 02-17

**Score:** 62/64 must-haves verified

## User Flow Coverage

| Step | Expected | Evidence | Status |
| --- | --- | --- | --- |
| Integrate | The packed provider/headless API accepts host-owned generated references and keeps identity/authority in trusted wrappers | Packed, auth, scope, type, and lint gates pass in the fresh aggregate run | VERIFIED BASELINE |
| Follow a merged discussion | Installed comment watches expose exact ordered, reactive canonical/source history through merge lifecycle | Exact ordinary/fault schedules pass, but pinned multi-page cutover/cleanup/completion and installed identity replacement are not fully recorded | FAILED |
| Inspect merged activity | Installed admin activity watches retain full-key descending history with the same temporal guarantees | Exact ordinary/fault schedules pass; the same boundary and identity proof omissions apply | FAILED |
| Complete the lifecycle | Public, participation, roadmap, changelog, notification, delivery, and admin flows remain available through explicit headless states | The 58 non-overlapping baseline truths regress cleanly; two merged-reader headless truths remain unsupported | BLOCKED |
| Outcome | Users/admins complete the lifecycle without truncated, overlapping, torn, or prior-identity history while the host owns presentation and authority | Aggregate behavior is green, but the two required falsifiable proofs above are incomplete | BLOCKED |

The MVP user-story format guard returns `valid: true`.

## Final Verdict

Plan 02-17 materially improves the evidence. `tests/helpers/headless-publication-oracle.mjs` deep-compares exact sequence slots, couples fault code and prefix on one publication, rejects vacuous/truncated/mismatched fixtures, and validates modeled chains. The installed harness uses the real copied component, comments and activity wrappers, a staged merge, mandatory cleanup publications, exact load-more/fault/recovery schedules, deferred old callbacks, and event-driven deadlines. A strict restart scenario also found and fixed a real descriptorless `LoadingFirstPage` publication.

Phase 2 still cannot pass. The installed merge lifecycle deliberately avoids pagination by loading fifty items against eight-row feeds, so the prior pinned-window and 1-to-2-to-1 restart truth is not behaviorally exercised. Worse, the installed boundary extractor can ignore active records outside the selected snapshot-matching chain; its negative overlap/gap fixtures test only already-selected arrays, not this extraction seam. The installed identity path similarly checks only settled B/A state and before/after snapshot data, not every replacement publication or current publication count. These omissions are observable in source and are not repaired by the green aggregate gate.

## Must-Have Accounting

The 58 non-overlapping Phase 2 baseline truths remain supported. Plan 02-16 contributes six deduplicated detailed truths. Exact comment order, exact activity order, total cursor reset, and bounded/trust-boundary preservation remain verified; the pinned transition truth and installed every-publication/identity truth remain failed after Plan 02-17.

| Scope | Verified | Total | Result |
| --- | ---: | ---: | --- |
| Previous non-overlapping baseline | 58 | 58 | No regression found |
| Plan 02-16 detailed closure truths after Plan 02-17 | 4 | 6 | Two failed |
| **Total** | **62** | **64** | **GAPS_FOUND** |

### Plan 02-17 Closure Truths

| # | Truth | Status | Independent evidence |
| --- | --- | --- | --- |
| 1 | Every non-error installed publication equals its precise expected full loaded window | VERIFIED | Exact per-slot deep equality and shorter-prefix negative fixture pass; installed mutation/load/retry schedules pass. |
| 2 | First/middle/tail faults couple typed error and exact maximal prefix | VERIFIED | Correct-code/wrong-prefix and wrong-code/correct-prefix fixtures reject; real three-page comment/activity fault schedules pass. |
| 3 | Installed readers expose exactly one contiguous active chain through cutover, cleanup, completion, append, and restart | FAILED | Merge stages have one unbounded page, and extractor fallback can discard additional active records before validation. |
| 4 | Scenarios require exact count/order/status/content/boundaries and non-vacuous cleanup | VERIFIED FOR THE EXECUTED SINGLE-PAGE LIFECYCLE | Exact final sequence counts and mandatory comment/activity cleanup publications pass, but this does not substitute for the missing pinned transition scenario. |
| 5 | Deferred old result/error after A-to-B-to-A changes neither state, boundaries, count, nor error | FAILED ON INSTALLED PATH | Real callbacks leave installed final snapshot/boundaries/error unchanged and the generic React test checks count, but installed current publication count and full replacement sequences are not recorded. |
| 6 | Three direct runs and the complete gate pass without retry | VERIFIED | One fail-fast command passed runs 1/2/3; one subsequent `npm run test:phase2` passed. |

## Artifacts, Wiring, and Data Flow

| Artifact / link | Status | Details |
| --- | --- | --- |
| `tests/helpers/headless-publication-oracle.mjs` | SUBSTANTIVE / PARTIAL FOR ACTIVE EXTRACTION | Exact sequence, chain, deferred evidence, recorder, and deadline exports exist; pure assertions are sound for the arrays they receive. |
| `tests/integration/headless-backend.test.mjs` | VERIFIED / LIMITED META-SEAM | Seven tests pass and reject eight declared fixture classes, but no fixture passes extra active records through `activeProductBoundaries`. |
| `scripts/test-headless-backend.mjs` -> exact helper | WIRED | Uses exact model, exact sequence, event deadline, descriptor extraction, and deferred transport. |
| `scripts/test-headless-backend.mjs` -> installed comments/activity | WIRED / REAL DATA | Host wrappers call `components.afferent.public.comments.listComments` and `components.afferent.admin.activity.listPostActivity` after an actual merge. |
| `tests/react/live-headless.test.tsx` -> `src/react/query.ts` | WIRED | Controlled late result/error test and restart regression exercise the private paginated store. |
| `src/react/query.ts` restart | VERIFIED | Restart now stops old descriptors and lets `start()` attach the replacement before the next publication. |

Automated Plan 02-17 artifact query: **4/4 present/substantive**.

Automated Plan 02-17 key-link query: **5/5 wired**.

All seven declared Plan 02-17 implementation/test commits exist.

## Fresh Behavioral Evidence

| Command | Result | Status |
| --- | --- | --- |
| `node --test tests/integration/headless-backend.test.mjs` | 7/7 passed | PASS |
| `npm exec -- vitest run --config vitest.react.config.ts tests/react/live-headless.test.tsx -t "rejects captured late result and error callbacks after A to B to A replacement"` | 1 passed, 20 skipped | PASS |
| `for run in 1 2 3; do node scripts/test-headless-backend.mjs || exit 1; done` | Three consecutive `Real Convex headless watch matrix passed` results | PASS, NO RETRY |
| `npm run test:phase2` | Build; model 32/32; component 38/38; real backend matrix; static 24/24; React 52/52; conformance 25/25; scope 3/3; typecheck; lint; packed artifact all passed | PASS, RUN ONCE |
| Dirty fingerprint | `09b5f7179dc749a197ec6a59c5ba188313b8c84536e0c35b6487ae7fcb058381` | PRESERVED |

The complete aggregate output is captured by h5i object `fa8ede68b90af534`.

## Requirements Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| DISC-07 | BLOCKED | Exact merged order and ordinary publication schedules pass; pinned reactive cutover/cleanup/completion proof is absent. |
| ADMN-10 | BLOCKED | Activity order/fault schedules pass; the same pinned transition and exact identity recorder omissions apply. |
| UI-03 | BLOCKED | The real store is wired and exact for modeled schedules, but active-chain extraction and installed replacement publication evidence are incomplete. |
| QUAL-01 | BLOCKED | All commands pass, but two explicit acceptance truths remain non-falsifiable on the required installed paths. |
| Other Phase 2 requirements | SATISFIED BASELINE | Plan 02-17 changes only the private restart path and test infrastructure; full aggregate regression passes. |

No Phase 2 requirement is orphaned from its plans. Phase 3's copied UI does not explicitly defer either remaining headless correctness gap.

## Disconfirmation Pass

| Required check | Finding | Severity |
| --- | --- | --- |
| Partially met requirement | Merge lifecycle records exact rows but never creates a pinned page or transition restart | BLOCKER |
| Misleading passing test | Pure overlap/gap fixtures validate supplied boundary arrays, while product extraction may discard other active arrays first | BLOCKER |
| Uncovered error path | Installed stale error release does not measure current publication count or exact B/A replacement publications | BLOCKER |

No unreferenced `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, or placeholder marker appears in Plan 02-17-owned source/test paths. `git diff --check` passes. No schema, validator, public DTO, authority input, component reader/writer, package export, or package dependency changed in Plan 02-17. The unrelated tracked dirty files remain outside this report.

## Required Closure

1. Run the real comment and activity stores with at least two loaded descriptors before cutover; assert exact pinned boundaries and descriptor-backed restart publication sequences through 1-to-2, every cleanup repoint, and 2-to-1.
2. Reject any active record outside the single reader/store/generation chain at every notification, with a negative fixture proving an additional active tail or overlap fails through the actual extractor.
3. Attach exact recorders to installed B and current A, model every replacement publication, and assert publication count remains unchanged after releasing each old result/error callback.

---

_Verified: 2026-07-21T15:23:56Z_

_Verifier: independent generic-agent fallback using the installed gsd-verifier role_
