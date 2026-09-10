---
phase: 01-secure-installable-feedback-board
plan: "01"
subsystem: testing
tags: [npm, supply-chain, packed-artifact, node-test, convex]

requires: []
provides:
  - Deliberately red external-consumer specification for the packed Afferent walking skeleton
  - Human-approved exact dependency matrix before the first package installation
affects: [01-02, 01-05, package-gate, auth-fixtures]

tech-stack:
  added: []
  patterns:
    - Packed artifacts must be exercised from an OS temporary consumer outside the repository
    - Browser inputs carry intent only while authority remains server-derived

key-files:
  created:
    - tests/integration/walking-skeleton.test.mjs
  modified: []

key-decisions:
  - "Approved the exact 17-entry npm dependency matrix audited on 2026-07-15; provider packages remain fixture-only development dependencies."
  - "Accepted @auth/core 0.41.2 above its stale latest dist-tag because @convex-dev/auth 0.0.94 requires the compatible ^0.41.1 peer range."

patterns-established:
  - "External consumer gate: copy only the committed fixture template to a fresh OS temporary directory and reject repository-root resolution."
  - "Supply-chain gate: verify exact versions, official ownership, repositories, lifecycle scripts, and peer compatibility before installation."

requirements-completed:
  - QUAL-03
  - QUAL-10

coverage:
  - id: D1
    description: "A runnable red acceptance test defines the clean packed-consumer board/post and Vite interaction contract."
    requirement: QUAL-03
    verification:
      - kind: integration
        ref: "! node --test tests/integration/walking-skeleton.test.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "The exact dependency matrix was reviewed and approved before any installation."
    requirement: QUAL-10
    verification:
      - kind: manual_procedural
        ref: "Live peer registry and repository audit approved 2026-07-15"
        status: pass
    human_judgment: true
    rationale: "Package legitimacy and official-source review require human judgment; the blocking checkpoint received explicit approval."

duration: 8 min
completed: 2026-07-15
status: complete
---

# Phase 1 Plan 01: Packed-Consumer Contract and Dependency Gate Summary

**A deliberately red tarball-only consumer test now fixes the full-stack acceptance contract, and the exact 17-entry package matrix is approved before installation.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-15T23:11:49Z
- **Completed:** 2026-07-15T23:20:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Defined a Node built-in acceptance test that materializes a clean Vite/Convex consumer outside the repository and requires tarball-only resolution, an Apache-2.0 `LICENSE`, a real board/post write-read, and one rendered fixture interaction.
- Locked browser-callable input to intent fields and explicitly rejects actor, identity, admin, provider, and scope authority transport.
- Cleared the blocking package-legitimacy checkpoint for all 17 pinned entries after verifying versions, official sources, lifecycle scripts, and compatible peers without installing anything.

## Task Commits

Each file-changing task was committed atomically:

1. **Task 1: Write the failing packed-consumer walking-skeleton test** - `8659ed8` (test)
2. **Task 2: Approve the exact package matrix before installation** - checkpoint approval; no file change or task commit by design

## Files Created/Modified

- `tests/integration/walking-skeleton.test.mjs` - Executable red specification for the future packed-artifact consumer gate and trusted board/post interaction.

## Decisions Made

- Approved all 17 pinned package entries reviewed against npm and official repositories on 2026-07-15. None was classified as SLOP, none exposes a dependency-install lifecycle script, and provider integrations remain fixture-only development dependencies.
- Retained `@auth/core@0.41.2` despite the older npm `latest` dist-tag because it is the legitimate compatible peer for `@convex-dev/auth@0.0.94`.
- Kept the Clerk fixture on the current `@clerk/react` package and preserved exact pins plus a committed lockfile as requirements for Plan 01-02.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The walking-skeleton test fails at the intended missing-implementation assertion for `fixtures/packed-vite-convex` and `scripts/test-packed-consumer.mjs`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 01-02 may install the approved exact matrix and implement the packed walking skeleton. The deliberate red test is ready to become the artifact-level green gate; no package was installed during this plan.

## Self-Check: PASSED

- `tests/integration/walking-skeleton.test.mjs` exists.
- Commit `8659ed8` exists and contains only the walking-skeleton test.
- `! node --test tests/integration/walking-skeleton.test.mjs` passes because the test reaches the intended missing packed-artifact path.
- The package checkpoint has explicit approval covering all 17 pinned entries, official ownership, lifecycle scripts, and peer compatibility.

---
*Phase: 01-secure-installable-feedback-board*
*Completed: 2026-07-15*
