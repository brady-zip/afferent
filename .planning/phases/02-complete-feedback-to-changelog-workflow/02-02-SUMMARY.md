---
phase: 02-complete-feedback-to-changelog-workflow
plan: "02"
subsystem: discovery
tags: [convex-search, safe-markdown, mdast, react-hooks, security]
requires:
  - phase: 02-01
    provides: Ranked scope-complete feedback feeds and the headless provider/feed seam
provides:
  - Bounded relevance-only component search with board, status, and single-tag filters
  - Deterministic cross-board similar-post suggestions without engine scores
  - Parser-backed safe Markdown and normalized plain-text write validation
  - Debounced headless search and similar-post hooks with explicit bounded states
affects: [02-03, 02-04, 02-05, 02-07, 02-10, phase-03]
tech-stack:
  added: [mdast-util-from-markdown@2.0.3]
  patterns:
    - Search uses native bounded take with an honest hasMore sentinel, never cursors
    - Single-tag search uses a scope-complete materialized search projection
    - Stored Markdown is accepted only through a closed AST and URL-scheme allowlist
key-files:
  created:
    - src/component/model/content.ts
    - src/component/model/similarity.ts
    - src/component/public/search.ts
    - scripts/test-search-backend.mjs
  modified:
    - src/component/schema.ts
    - src/client/contracts.ts
    - src/client/internal.ts
    - src/react/hooks/feedback.ts
key-decisions:
  - "Use mdast-util-from-markdown 2.0.3 with a closed node allowlist; no raw HTML, images, reference nodes, or unsafe/relative links enter storage."
  - "Keep search and similar suggestions as versioned bounded result contracts with hasMore; ordinary indexed feeds alone expose cursor pagination."
  - "Rerank at most 30 search candidates with a library-owned lexical score and stable createdAt/opaque-ID tie breaks."
patterns-established:
  - "Bounded search: take the server cap plus one, return only the cap, and report truncation honestly."
  - "Headless bounded reads: debounce injected host refs and expose loading, ready, empty, error, or unsupported without fabricating loadMore."
requirements-completed:
  [DISC-04, DISC-06, ADMN-09, UI-01, UI-02, UI-03, QUAL-01]
coverage:
  - id: D1
    description: Visible feedback search is relevance-only, bounded, scope-complete, and filterable by board, status, or one tag.
    requirement: DISC-04
    verification:
      - kind: integration
        ref: tests/component/search.test.ts#searches only visible rows in the derived scope with honest truncation
        status: pass
      - kind: e2e
        ref: node scripts/test-search-backend.mjs
        status: pass
    human_judgment: false
  - id: D2
    description: Compose-time similar-post suggestions rerank a bounded cross-board pool deterministically and omit raw relevance scores.
    requirement: DISC-06
    verification:
      - kind: unit
        ref: tests/model/similarity.test.ts#reranks deterministically and never returns an engine score
        status: pass
      - kind: integration
        ref: tests/component/search.test.ts#returns deterministic cross-board suggestions without raw scores
        status: pass
    human_judgment: false
  - id: D3
    description: Post and comment Markdown is normalized, bounded, and rejected unless every parsed node and link scheme is safe.
    requirement: ADMN-09
    verification:
      - kind: unit
        ref: tests/model/content.test.ts
        status: pass
    human_judgment: false
  - id: D4
    description: Search and similar-post host capabilities are exposed through debounced framework-light hooks with explicit bounded states.
    requirement: UI-01
    verification:
      - kind: unit
        ref: tests/react/feedback-search.test.tsx
        status: pass
      - kind: other
        ref: npm run typecheck && npm run lint
        status: pass
    human_judgment: false
  - id: D5
    description: Search pagination boundaries, privacy invariants, generated bindings, and packed-consumer resolution are regression-tested.
    requirement: QUAL-01
    verification:
      - kind: e2e
        ref: npm test
        status: pass
      - kind: e2e
        ref: npm run test:package
        status: pass
    human_judgment: false
duration: 14min
completed: 2026-07-16
status: complete
---

# Phase 2 Plan 2: Bounded Search and Safe Content Summary

**Scope-complete bounded Convex search, deterministic duplicate suggestions, parser-enforced safe Markdown, and debounced headless discovery hooks**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-16T21:53:19Z
- **Completed:** 2026-07-16T22:07:28Z
- **Tasks:** 3
- **Files modified:** 26

## Accomplishments

- Added relevance-only feedback search with a hard 50-result cap, honest `hasMore`, explicit board/status/single-tag index shapes, and no cursor contract.
- Added deterministic cross-board similar-post suggestions over at most 30 candidates, capped at 10 results, with no engine relevance score in public DTOs.
- Enforced one safe Markdown contract at post/comment write boundaries and delivered 250 ms-default headless search/similar hooks over trusted host-generated refs.
- Proved bounded search and both unsupported component search-pagination paths on a disposable real Convex backend, then passed the complete packed-consumer release gate.

## Task Commits

Each task was committed atomically:

1. **Task 1: Specify bounded search, deterministic suggestions, and safe content** - `4d81f47` (test)
2. **Task 2: Implement safe content and scope-complete search projections** - `19ef4ce` (feat)
3. **Task 3: Carry bounded discovery through host capabilities and debounced hooks** - `5394088` (feat)

## Files Created/Modified

- `src/component/model/content.ts` - Normalized plain text plus closed parser-backed Markdown validation.
- `src/component/model/similarity.ts` - Frozen candidate/result bounds and deterministic lexical reranking.
- `src/component/public/search.ts` - Scope-complete canonical/tag search and similar-post component queries.
- `src/component/schema.ts` - Canonical and per-tag search indexes/projection table.
- `src/component/participation/posts.ts` - Safe write validation and transactional canonical/projection search text.
- `src/component/participation/comments.ts` - Shared safe Markdown enforcement for comments.
- `src/client/contracts.ts` and `src/client/internal.ts` - Versioned bounded DTOs and trusted host capabilities.
- `src/react/hooks/feedback.ts` - Debounced search/similar hooks and explicit bounded state mapping.
- `scripts/test-search-backend.mjs` - Real Convex positive bounded-search and negative pagination probes.

## Decisions Made

- Approved and pinned `mdast-util-from-markdown@2.0.3` after revalidating registry identity, repository ownership, integrity metadata, maintainers, and absence of install lifecycle scripts.
- Allowed only headings, paragraphs/text, emphasis/strong, lists, blockquotes, code, and absolute HTTP(S)/mailto links. Consumers must map the validated tree to elements; raw HTML serialization is outside the contract.
- Used a separate scoped `postTagSearches` projection because canonical full-text indexes cannot express many-to-many tag membership without post-filtering.
- Kept injected search bindings optional so an incomplete capability set yields `unsupported`; enabled hooks still call only trusted host-generated refs and never accept scope or viewer authority.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Unified the existing comment normalization helper with safe Markdown validation**

- **Found during:** Task 2
- **Issue:** The plan named the comment mutation but the existing reusable `normalizeCommentBody` helper would have remained a plain trim/length path, allowing another caller to bypass the new parser contract.
- **Fix:** Delegated the existing helper to `validateSafeMarkdown` while retaining its public function and 10,000-character bound.
- **Files modified:** `src/component/model/comments.ts`
- **Verification:** Existing comment model/component suites and the new content suite pass.
- **Committed in:** `19ef4ce`

---

**Total deviations:** 1 auto-fixed (1 missing critical security invariant)
**Impact on plan:** The adjustment closes a bypass in the exact safe-content boundary; it adds no product scope.

## Issues Encountered

- The first complete-suite run observed a transient packed-fixture self-resolution failure after all preceding suites passed. Direct package self-import and auth-conformance diagnostics passed, the isolated packed gate passed, and a subsequent complete `npm test` passed all suites and the external tarball consumer without code changes.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - the new Markdown and search trust surfaces are explicitly covered by T-02-05, T-02-06, T-02-07, and T-02-SC in the plan threat register.

## Next Phase Readiness

- Plan 02-03 can apply the shared safe-content model to administrative and moderation writes and build on the generated search-aware component bindings.
- Plan 02-04 can materialize and maintain `postTagSearches` alongside canonical tag membership and feed projections.
- Plan 02-10 can consolidate the new bounded states into the final unified headless vocabulary without changing the non-cursor discovery contract.

## Self-Check: PASSED

- All created files exist.
- Commits `4d81f47`, `19ef4ce`, and `5394088` exist.
- Focused suites, real-backend probes, build, typecheck, lint, complete `npm test`, and packed-consumer verification pass.

---

_Phase: 02-complete-feedback-to-changelog-workflow_
_Completed: 2026-07-16_
