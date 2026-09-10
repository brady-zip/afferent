---
phase: 03-source-owned-product-interface
plan: "08"
subsystem: installed-ui-evidence
tags: [playwright, accessibility, responsive, shadcn, registry, visual-evidence]
requires:
  - phase: 03-07
    provides: Repaired consequential interactions, closed states, hierarchy, tokens, copy, and controlled phone navigation
provides:
  - Installed packed-package browser proof for every repaired public and administrative interaction
  - Versioned light, dark, state, consequence, phone, tablet, desktop, reflow, and zoom visual evidence
  - Deterministic evidence bytes and anti-skip coverage retaining the complete Phase 3 plus Phase 2 release gate
  - Formatted default changelog publication time with valid ISO-8601 machine metadata
affects: [phase-03-verification, 04-hosted-example, release-audit]
tech-stack:
  added: []
  patterns:
    - Drive stable evidence states through host-owned fixture controls over the packed provider and installed generated source
    - Settle fonts, focus paint, animation, transition, and caret state before versioned browser capture
    - Pair broad named visual captures with rejection-capable semantic, overflow, focus, target-size, and anti-skip assertions
key-files:
  created:
    - docs/accessibility/phase-3/board-1280.png
    - docs/accessibility/phase-3/admin-confirmations-1280.png
    - docs/accessibility/phase-3/dark-admin-1280.png
  modified:
    - tests/accessibility/phase3.spec.ts
    - fixtures/registry-vite/src/App.tsx
    - docs/accessibility/phase-3/README.md
    - tests/integration/phase3-gate.test.mjs
key-decisions:
  - "Evidence fixtures use fixed Date.UTC values, while copied default changelog presentation reuses the existing deterministic UTC formatter and emits ISO-8601 machine time."
  - "The visual matrix is accepted only with executable no-overflow, focus, state, and target assertions plus byte-identical cross-process evidence output."
  - "Automated behavior and rendering proof remains distinct from final human judgment of aesthetic polish, density, rhythm, and desirability."
requirements-completed: [UI-05, QUAL-07, QUAL-08]
coverage:
  - id: D1
    description: The packed package and generated local shadcn items prove all consequential dialogs, complete admin states, persistent selection, and host-controlled phone queue/detail navigation.
    requirement: UI-05, QUAL-07, QUAL-08
    verification:
      - kind: automated_ui
        ref: tests/accessibility/phase3.spec.ts#KF-04-ST-03-ST-04-ST-05-RZ-02
        status: pass
    human_judgment: false
  - id: D2
    description: Versioned captures cover the complete public and administrative surface across light, dark, phone, tablet, desktop, reflow, zoom, confirmation, empty, and error compositions.
    requirement: QUAL-07, QUAL-08
    verification:
      - kind: automated_ui
        ref: tests/accessibility/phase3.spec.ts#VIS-01-VIS-02-RZ-01
        status: pass
      - kind: other
        ref: docs/accessibility/phase-3/README.md#captures
        status: pass
    human_judgment: true
    rationale: Automation proves rendering, semantics, focus, contrast, dimensions, overflow, and stable bytes, but final aesthetic polish and product desirability remain judgment-dependent.
  - id: D3
    description: The self-auditing Phase 3 release command retains deterministic generation, clean packed install, mounted UI, hydration, static authority, exact contrast, browser and axe, build, lint, typecheck, package, and full Phase 2 regression coverage.
    requirement: UI-05, QUAL-07, QUAL-08
    verification:
      - kind: integration
        ref: npm run ui:check && npm run test:phase3 && node --test tests/integration/phase3-gate.test.mjs
        status: pass
    human_judgment: false
  - id: D4
    description: Default public changelog time is human-readable deterministic UTC and carries valid ISO-8601 machine metadata from the same absolute timestamp.
    requirement: UI-05, QUAL-07
    verification:
      - kind: automated_ui
        ref: tests/accessibility/phase3.spec.ts#VIS-02-published-time
        status: pass
    human_judgment: false
duration: 20h 38m
completed: 2026-07-22
status: complete
---

# Phase 03 Plan 08: Installed UI Evidence Closure Summary

**The packed and locally generated source-owned UI now has deterministic whole-product browser evidence for repaired interactions, complete state hierarchy, responsive workflows, and default light/dark presentation.**

## Performance

- **Duration:** 20h 38m elapsed
- **Started:** 2026-07-21T23:02:08Z
- **Completed:** 2026-07-22T19:39:43Z
- **Tasks:** 3
- **Files modified:** 35

## Accomplishments

- Expanded the installed-source Playwright oracle to 12 rejection-capable scenarios covering five consequential dialogs, correction and retry, pending submission, complete admin states, selected semantics, phone pane control, computed hierarchy, valid time metadata, axe, keyboard, focus, targets, reflow, zoom, and overflow.
- Added and visually inspected an 18-image public/admin capture matrix spanning every product surface, representative consequence/error/empty states, both phone panes, tablet/desktop, 320 CSS-pixel reflow, 200% zoom, and light/dark themes.
- Made the complete evidence tree byte-identical across fresh browser processes and strengthened the anti-skip gate to require every repaired scenario, deterministic input/capture control, named non-empty artifact, installed-source marker, and full Phase 3 plus Phase 2 composition.
- Reused the canonical UTC presentation helpers so the public changelog no longer exposes raw numeric publication time and its machine-readable time is valid ISO-8601.

## Task Commits

1. **Task 1: Expand installed fixture and repaired-state oracle** - `89ff320`, `c20d1ae`, `85c5b36`
2. **Task 2: Capture and stabilize the complete visual matrix** - `ff6b687`, `b420725`
3. **Task 3: Reindex evidence and enforce the complete release gate** - `5e95f6d`

## Decisions Made

- Treat a watcher-visible peer consultation as a fresh directed radio send gate; the canonical time scope correction was confirmed on a new live Claude thread before implementation.
- Keep every evidence control test-local and host-owned while all product data, authority, and async truth still flow through the packed provider, generated bindings, and installed hooks.
- Preserve human aesthetic review as an explicit remaining judgment rather than misrepresenting automated browser and axe evidence as blanket WCAG certification or visual approval.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Bounded clean-consumer preparation**

- **Found during:** Task 1
- **Issue:** Repeated per-item shadcn installs re-fetched official registry metadata and could exceed the Playwright web-server startup timeout.
- **Fix:** Kept the exact pinned local shadcn path but installed all five local feature items in one invocation, with bounded subprocess timeout and retry handling.
- **Files modified:** `scripts/test-registry-consumer.mjs`
- **Verification:** The prepared consumer installed 30 files, typechecked, built, and served the installed-source oracle.
- **Committed in:** `c20d1ae`

**2. [Rule 3 - Blocking] Closed raw public changelog time discovered by visual inspection**

- **Found during:** Task 2
- **Issue:** The installed default changelog rendered `Published 200` and fixture timestamps produced epoch-adjacent 1970 values, contradicting the formatted-time evidence contract.
- **Fix:** Reused the canonical UTC formatter, emitted ISO-8601 machine time, regenerated mirror/registry artifacts, and replaced fixture values with fixed `Date.UTC` inputs.
- **Files modified:** canonical/mirrored core copy and changelog entry, generated registry manifests/items, fixture, plan scope, and browser assertion.
- **Verification:** VIS-02 asserts exact `Published January 15, 2026 at 12:00 PM UTC` and `2026-01-15T12:00:00.000Z` against installed source.
- **Committed in:** `ff6b687`

**3. [Rule 1 - Bug] Stabilized cross-process popover evidence bytes**

- **Found during:** Task 3 aggregate rerun
- **Issue:** The notification popover PNG alternated between two hashes across fresh browser processes because focus-paint capture state was not fully normalized.
- **Fix:** Asserted the exact autofocus target, settled fonts and two frames, hid caret paint, and disabled animation/transition during screenshots; the anti-skip gate requires these controls.
- **Files modified:** `tests/accessibility/phase3.spec.ts` and three regenerated public evidence images.
- **Verification:** Two fresh full 12-test processes produced an identical SHA-256 manifest for the entire evidence directory.
- **Committed in:** `b420725`

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking scope corrections).
**Impact on plan:** All changes were required to make the declared installed-source and deterministic evidence contract truthful; no authority, backend, headless, host wrapper, dependency, or unrelated user file changed.

## Issues Encountered

- One final full-gate attempt timed out while starting the unchanged Convex outbox backend harness. No process or port remained stale; the exact unchanged command passed on the clean retry.
- The first Task 3 aggregate found one oxlint style issue in the new anti-skip test. Assigning the awaited stat result before reading its size resolved it; the complete command was rerun from the top.

## User Setup Required

None - no external service configuration required.

## Verification

- Installed-source Playwright: 12/12 pass across independent processes.
- Evidence determinism: complete directory SHA-256 manifest byte-identical across full reruns.
- Anti-skip release audit: 3/3 pass.
- Exact release command: `npm run ui:check && npm run test:phase3 && node --test tests/integration/phase3-gate.test.mjs && git diff --exit-code -- src/component src/react src/host` — pass.
- Full Phase 2 regression, including real Convex backends and packed package: pass within `test:phase3`.
- Protected unrelated fingerprint remains `a9d31b29d26eda53639af1a18df8fdbcc1b6151257326bf82f2a020021a0f304`.

## Next Phase Readiness

- Phase 03 implementation and installed evidence are complete; UI-05, QUAL-07, and QUAL-08 are satisfied by the aggregate gate.
- Independent phase/UI verification may still request human aesthetic review of the complete matrix before Phase 04 release work begins.
- Phase 04 can consume the packed package, deterministic registry, copy-owned examples, and documented evidence contract without reopening component, headless, or authority boundaries.

## Self-Check: PASSED
