---
phase: 02-complete-feedback-to-changelog-workflow
verified: 2026-07-21T01:34:15Z
status: gaps_found
score: 58/59 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 39/39
  gaps_closed:
    - "Plan 02-15 adds the optional injected public.listComments binding and closed useComments state over the shared paginated watch store."
    - "Flat versioned CommentDto rows, unsupported behavior, typed error recovery, generation fencing, and packed-consumer wiring are verified."
  gaps_remaining:
    - "The real two-post merged comment reader does not implement the cursor-window and endCursor contract exercised by useComments."
  regressions: []
gaps:
  - truth: "Every comment-feed notification is one exact coherent ordered cursor-window prefix from the existing generation-fenced, endCursor-pinned, all-descriptor atomic pagination substrate."
    status: failed
    reason: "The shipped readPostIds.length === 2 product branch hand-rolls two-stream pagination, ignores paginationOpts.endCursor, serializes only _creationTime although its total order also uses _id, and applies deep-page cursor bounds with a post-index filter. Plan 02-15's mounted and disposable-real oracle exercises a separate single-post native paginator query, so passing tests do not cover this path. The same defect pattern exists in merged post activity."
    artifacts:
      - path: src/component/public/comments.ts
        issue: "Merged comment pagination at lines 41-75 ignores endCursor, loses the _id tie-break in its cursor, and uses .filter after the post index instead of a cursor-bounded merged indexed stream."
      - path: src/component/admin/activity.ts
        issue: "Merged activity pagination at lines 27-59 repeats the endCursor omission, partial sort-key cursor, and filter-based deep-page scan pattern."
      - path: scripts/test-headless-backend.mjs
        issue: "The comment oracle at lines 286-305 uses one synthetic postId and native .paginate(args.paginationOpts); it never invokes the component merged-post branch."
    missing:
      - "Create dedicated additive Plan 02-16 for merged-reader cursor correctness and boundedness; do not fold this into Phase 3 UI work."
      - "Implement one stable total-order cursor/session contract for the two indexed comment streams that honors both paginationOpts.cursor and paginationOpts.endCursor, including split/pinned page windows."
      - "Apply the same contract to merged post activity or extract a shared merged-pagination primitive so the hand-rolled pattern cannot drift."
      - "Add real product-path tests that merge posts, read multiple pages, exercise equal primary sort keys, pin endCursor windows through reactive insert/delete, and assert bounded indexed deep-page work for comments and activity."
---

# Phase 2: Complete Feedback-to-Changelog Workflow Verification Report

**Phase Goal:** As a developer integrating Afferent into my existing Convex + React application, I want to run the complete provider-neutral feedback-to-roadmap-to-changelog workflow -- ranked, searchable, and filterable discovery with admin duplicate merges; authenticated participation; admin moderation with a status-driven public roadmap; manually published changelog entries linked to feedback; and in-app notifications backed by a host-consumable delivery outbox -- through tested component APIs and framework-light headless React hooks with explicit async, auth, and error states, so that my users and admins can complete the entire feedback lifecycle while I retain ownership of identity, authorization, and my own presentation.

**Verified:** 2026-07-21T01:34:15Z
**Status:** gaps_found
**Re-verification:** Yes -- after additive Plan 02-15
**Score:** 58/59 must-haves verified

## User Flow Coverage

| Step                     | Expected                                                                                                                                         | Evidence                                                                                                                                | Status                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Integrate                | The host injects generated function references and the React consumer reads comments through `useComments`                                       | `src/react/bindings.ts`, `src/react/hooks/feedback.ts`, and the packed fixture are wired; artifact and key-link queries pass 4/4        | VERIFIED                  |
| Browse and participate   | Public, participation, roadmap, changelog, notification, and admin workflows retain their previously verified closed states and trust boundaries | Prior Phase 2 component, React, static, backend, auth, scope, and package evidence remains present; targeted current comment tests pass | VERIFIED                  |
| Follow a merged post     | A visitor can page the complete canonical-plus-source comment history through stable reactive cursor windows                                     | `src/component/public/comments.ts:41-75` bypasses the required `endCursor` contract on the two-post branch                              | FAILED                    |
| Administer a merged post | An admin can page the complete append-only activity history without offset-scaling scans or page drift                                           | `src/component/admin/activity.ts:27-59` repeats the same hand-rolled pagination pattern                                                 | FAILED (same grouped gap) |
| Outcome                  | Users and admins can complete the full lifecycle while the host retains identity, authorization, and presentation ownership                      | Ownership boundaries pass, but the merged multi-page read path prevents complete lifecycle coverage                                     | BLOCKED                   |

## Final Verdict

Phase 2 is not yet complete. Plan 02-15 successfully adds the missing headless comment-read seam, but its acceptance oracle proves the shared React pagination store against a synthetic single-stream query rather than the real merged-post component query. The shipped two-stream branch violates the exact cursor-window contract that `useComments` relies on.

This is one grouped deterministic blocker, not a human-verification item. It requires a dedicated additive **Plan 02-16** in Phase 2. Phase 3 UI work must not compensate with a client-side cache, tree, raw Convex read, or other boundary shortcut.

## Goal Achievement

### Roadmap Success Criteria

| Roadmap success criterion                                                                                   | Status                             | Evidence                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ranked/filterable/searchable discovery and lossless duplicate merge                                         | VERIFIED BASELINE                  | Prior relation-preservation, redirect, cutover, discovery, and merge matrices remain intact; the new blocker is the paginated presentation of merged comments, not stored relation loss. |
| Authorized moderation, status, tags, activity, safe content, and rate limits                                | VERIFIED BASELINE WITH GROUPED GAP | All prior mutations and safety behavior remain verified; merged activity pagination shares the one grouped reader defect.                                                                |
| Status-derived roadmap and manually published changelog                                                     | VERIFIED                           | Prior domain, component, and React evidence remains present and untouched.                                                                                                               |
| Fixed in-app notifications and typed host delivery outbox                                                   | VERIFIED                           | Prior notification, outbox, fan-out, lease, and generation-isolation evidence remains present and untouched.                                                                             |
| Complete workflow through injected headless refs with explicit async/auth/error/pagination states and tests | FAILED                             | The injected comment seam exists, but real merged multi-page cursor-window behavior is neither implemented nor exercised.                                                                |

### Must-Have Accounting

The previous 55 roadmap and Plan 02-01 through 02-14 truths received quick regression checks: their artifacts remain present, the current diff does not touch their product surfaces, and no new regression was found. Plan 02-15 contributes four detailed truths: three verify and one fails. The broad roadmap/headless impact above is the same failed concern and is scored once after deduplication.

| Scope                                  | Verified |  Total | Result                                   |
| -------------------------------------- | -------: | -----: | ---------------------------------------- |
| Roadmap plus Plans 02-01 through 02-14 |       55 |     55 | No regression found                      |
| Plan 02-15                             |        3 |      4 | One grouped merged-reader pagination gap |
| **Total**                              |   **58** | **59** | **GAPS_FOUND**                           |

### Plan 02-15 Truths

| #   | Truth                                                                                                                                                        | Status   | Independent evidence                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A React consumer can read a post's comments through one optional public binding and a closed `useComments` state without direct Convex/server-client access  | VERIFIED | `CommentFeedQueryReference`, optional `public.listComments`, and `useComments -> usePaginatedWatchQuery` wiring pass artifact/key-link checks.                  |
| 2   | Comment reads expose bounded creation-ordered flat `CommentDto` rows with `parentCommentId`, without raw documents, recursive trees, or N+1 UI queries       | VERIFIED | DTO validators/mappers and hook boundary are flat and closed; the component enforces `numItems` 1..50. This does not certify the failed multi-page cursor seam. |
| 3   | Every comment-feed notification is an exact coherent ordered cursor-window prefix from the generation-fenced, `endCursor`-pinned atomic pagination substrate | FAILED   | The real merged branch ignores `endCursor`; see Product-Path Trace and Gap below.                                                                               |
| 4   | Missing binding is explicitly unsupported; configured failures retain a coherent prefix and recover without render throws                                    | VERIFIED | Hook state mapping and the shared store's failure/recovery path remain wired and tested.                                                                        |

## Product-Path Trace

| Layer                    | Product path                                                                                      | Status   | Evidence                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| React hook               | `useComments` delegates to `usePaginatedWatchQuery`                                               | WIRED    | `src/react/hooks/feedback.ts:277-287`; key-link query passes                      |
| Trusted host             | Packed wrapper validates/strips `sessionGeneration` and calls `client.read.listComments`          | WIRED    | Packed fixture/source audit and key-link query pass                               |
| Client                   | `client.read.listComments` invokes `component.public.comments.listComments` with `paginationOpts` | WIRED    | `src/client/internal.ts:248-257`                                                  |
| Component, ordinary post | Native paginator consumes complete `paginationOpts`                                               | VERIFIED | `src/component/public/comments.ts:77-83`                                          |
| Component, merged post   | Two post-index streams are manually filtered, merged, and cursor-serialized                       | FAILED   | `src/component/public/comments.ts:41-75` does not read `paginationOpts.endCursor` |

### Why the Merged Branch Fails

1. **Pinned/split page windows are ignored.** Convex defines `endCursor` as the explicit page end used by reactive clients to prevent gaps between pages and to split pages. The branch reads only `cursor`; a rerun can grow past the pinned boundary, so the shared store cannot enforce its descriptor contract.
2. **The cursor is not the total order.** Rows sort by `(_creationTime, _id)`, but `continueCursor` stores only `_creationTime`. A page ending within equal-time rows resumes with `_creationTime > cursor`, which can skip the remaining tied rows. `postActivity` similarly sorts by `(occurredAt, _id)` but serializes only `occurredAt`.
3. **Deep pages are not cursor-bounded at the index.** Each branch selects the post index prefix and then applies `.filter(...)`. Advancing the cursor therefore scans prior matching rows before filtering, making work scale with offset rather than page size.

## Test Coverage Analysis

| Evidence                                                   | What it proves                                                                                             | What it does not prove                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `tests/component/participation.test.ts` named comment test | Flat root/reply DTOs and a single first-page read                                                          | Merge, second page, `endCursor`, ties, reactive changes, or bounded deep pages |
| `tests/component/anonymization.test.ts` named comment test | Anonymized author projection on one read                                                                   | Merged multi-page behavior                                                     |
| `tests/react/live-headless.test.tsx`                       | Mounted `useComments` state and shared-store publication behavior against a controlled query client        | Real component `readPostIds.length === 2` behavior                             |
| `scripts/test-headless-backend.mjs:286-305`                | Real Convex watch behavior for a synthetic single-post query using native `.paginate(args.paginationOpts)` | The product's manually merged two-post query                                   |
| `tests/integration/headless-backend.test.mjs`              | Source wiring and packed fixture use the injected comment binding                                          | Multi-page product output correctness                                          |

Targeted current spot-check:

| Command                                                                                                                                                                                                                                | Result                                    | Status                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------- |
| `npx vitest run tests/component/participation.test.ts tests/component/anonymization.test.ts -t "adds flat root comments and one-level replies with exact totals\|removes identity while retaining content, relationships, and totals"` | 2 files passed, 2 tests passed, 3 skipped | PASS, but no merged-path coverage |

## Artifact and Key-Link Verification

| Check                          | Result                                     |
| ------------------------------ | ------------------------------------------ |
| Plan 02-15 artifact query      | 4/4 artifacts present and substantive      |
| Plan 02-15 key-link query      | 4/4 links wired                            |
| Plan structure                 | Valid; 3 tasks, no errors or warnings      |
| Product merged-reader behavior | Failed despite artifact and wiring success |

This is the expected L4 failure mode: the hook and host wiring are real, but the upstream product data source does not satisfy the pagination contract.

## Requirements Coverage

| Requirement                    | Status             | Evidence                                                                                                         |
| ------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| DISC-07                        | BLOCKED            | Stored comments remain preserved across merge, but the public merged reader can omit or drift rows across pages. |
| ADMN-10                        | BLOCKED            | Activity entries exist, but the merged activity reader repeats the incomplete cursor/endCursor pattern.          |
| UI-03                          | BLOCKED            | The headless API exposes pagination state, but the underlying merged page contract is not correct.               |
| QUAL-01                        | BLOCKED            | No automated test invokes the real merged comment/activity multi-page product path.                              |
| All other Phase 2 requirements | SATISFIED BASELINE | No regression found in the previously verified implementation surfaces.                                          |

## Anti-Patterns Found

| File                                | Line(s) | Pattern                                                                                    | Severity               | Impact                                                                                |
| ----------------------------------- | ------: | ------------------------------------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------- |
| `src/component/public/comments.ts`  |   41-75 | Hand-rolled merged pagination ignores `endCursor` and serializes a partial total-order key | BLOCKER                | Reactive page holes/overlaps or tied-row loss; shared store guarantees do not compose |
| `src/component/public/comments.ts`  |   48-54 | Cursor applied with `.filter` after `by_scope_post` equality                               | BLOCKER                | Deep pages scan earlier post rows; bounded indexed query criterion is not met         |
| `src/component/admin/activity.ts`   |   27-59 | Same hand-rolled cursor/endCursor/filter pattern                                           | BLOCKER (same concern) | Merged activity can drift, skip ties, and scale with offset                           |
| `scripts/test-headless-backend.mjs` | 286-305 | Test oracle substitutes a synthetic native paginator query for the product branch          | BLOCKER COVERAGE GAP   | Green oracle cannot falsify the shipped merged reader                                 |

No debt-marker blocker, provider-record leak, browser authority input, raw-document exposure, or recursive comment tree was found in the Plan 02-15 surface.

## Human Verification

None. The failure is deterministic and should be closed with product-path automated tests.

## Deferred-Item Check

No later phase clearly owns this concern. Phase 3 consumes the headless contract and Phase 4 hosts production artifacts; neither may repair a Phase 2 backend pagination invariant. The gap remains in Phase 2.

## Gap Summary

Create additive **Plan 02-16** to replace or unify the two-stream merged comment and activity readers with cursor-complete, `endCursor`-aware, index-bounded pagination. Acceptance must execute the real component paths after a merge across multiple pages, including equal primary sort keys, pinned/split windows, reactive insertion/deletion, and a bounded deep-page read assertion. Existing completed plans remain preserved.

---

_Re-verified: 2026-07-21T01:34:15Z_
_Verifier: generic-agent workaround for gsd-verifier_
