---
phase: 03-source-owned-product-interface
plan: "11"
subsystem: public-recovery-copy
tags: [react, copy, accessibility, registry, playwright]
requires: [{phase: 03-10, provides: Installed public recovery evidence}]
provides: [One typed public query guidance sentence, Complete installed error-surface coverage]
affects: [phase-03-verification, phase-04-hosted-example]
tech-stack: {added: [], patterns: [Shared typed guidance with domain-specific query-owned actions]}
key-files: {created: [], modified: [ui/afferent/core/copy.ts, tests/accessibility/phase3.spec.ts]}
key-decisions: [General guidance has one common copy key while action labels stay outcome-specific]
requirements-completed: [UI-04, QUAL-07]
coverage:
  - id: D1
    description: Every public query error renders exact typed guidance while retaining its specific action.
    requirement: UI-04, QUAL-07
    verification: [{kind: integration, ref: "npm run test:phase3", status: pass}]
    human_judgment: false
duration: 8min
completed: 2026-07-22
status: complete
---

# Phase 03 Plan 11: Public Recovery Guidance Summary

**Every public query error renders the exact approved guidance from one typed customizable source while retaining its domain-specific query-owned retry.**

## Accomplishments

- Added `common.queryErrorGuidance` and removed the board-local duplicate.
- Wired board feed/search, similar, detail, discussion, Activity, roadmap, changelog feed/detail, and notifications without changing actions or callbacks.
- Regenerated mirrors/registry and updated deterministic installed evidence.

## Task Commits

1. Contract: `5c144ea` (RED), `854a787` (GREEN)
2. Distribution: `b0b5f77`
3. Evidence: `d00e4ef`

## Deviations

- Migrated two admin consumers of the removed duplicate to the common key.
- Two confirming browser runs matched after one known alternate admin-queue focus-paint capture.

## Verification

- Mounted 13/13; static 5/5; packed consumer 2/2; browser 12/12; full `test:phase3` passed.
- Authority diff clean; unrelated fingerprint remains `a9d31b29d26eda53639af1a18df8fdbcc1b6151257326bf82f2a020021a0f304`.

## Self-Check: PASSED
