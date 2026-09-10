---
phase: 03-source-owned-product-interface
plan: "06"
subsystem: ui-accessibility-evidence
tags: [playwright, axe, wcag, contrast, reflow, shadcn]
requires:
  - phase: 03-05
    provides: Deterministic six-item packed clean-consumer distribution
provides:
  - Criterion-named browser keyboard, focus, announcement, target-size, reflow, and zoom evidence
  - Exact unrounded light and dark token contrast evidence
  - Stable phone, tablet, desktop, 320 CSS-pixel reflow, and 200 percent zoom captures
  - Complete self-auditing Phase 3 aggregate gate with Phase 2 regression
affects: [04-hosted-example, release-quality]
tech-stack:
  added: []
  patterns:
    - Serve browser evidence from the packed package plus generated shadcn items in a temporary clean consumer
    - Treat axe as a supplemental regression net beside explicit interaction and geometry assertions
    - Normalize committed evidence while retaining scenario, viewport, dependency, browser, expected, and actual details
    - Audit the aggregate test script recursively so required gates cannot be silently omitted
key-files:
  created:
    - tests/accessibility/phase3.spec.ts
    - tests/accessibility/contrast.test.ts
    - tests/integration/phase3-gate.test.mjs
    - docs/accessibility/phase-3/README.md
    - docs/accessibility/phase-3/keyboard-focus.md
  modified:
    - ui/afferent/afferent.css
    - ui/afferent/board/post-detail.tsx
    - ui/afferent/core/state-region.tsx
    - scripts/test-registry-consumer.mjs
    - package.json
key-decisions:
  - "Accept accessibility behavior through installed-source keyboard, focus, live-region, target geometry, reflow, and zoom evidence; axe remains supplemental."
  - "Compare exact token contrast ratios before any display rounding."
  - "Make the Phase 3 aggregate gate self-audit its installed distribution, browser, UI, hydration, contrast, artifact, and Phase 2 regression coverage."
requirements-completed: [UI-04, UI-05, UI-07, QUAL-04, QUAL-07, QUAL-08]
requirements-progressed: []
coverage:
  - id: D1
    description: Public and admin keyboard journeys prove focus order, visible focus, overlay containment, Escape dismissal, and logical restoration.
    requirement: QUAL-07
    verification:
      - kind: e2e
        ref: tests/accessibility/phase3.spec.ts#keyboard-focus-and-dialog-behavior
        status: pass
    human_judgment: false
  - id: D2
    description: Exact light and dark contrast plus installed-source status, alert, label, error, and supplemental axe evidence covers the named perception and announcement criteria.
    requirement: QUAL-07
    verification:
      - kind: integration
        ref: tests/accessibility/contrast.test.ts#exact-unrounded-token-ratios
        status: pass
      - kind: e2e
        ref: tests/accessibility/phase3.spec.ts#announcements-and-axe
        status: pass
    human_judgment: false
  - id: D3
    description: Installed public and admin workflows remain present without page overflow at phone, tablet, desktop, 320 CSS-pixel reflow, and 200 percent zoom compositions, with measured target sizes.
    requirement: QUAL-07, QUAL-08
    verification:
      - kind: e2e
        ref: tests/accessibility/phase3.spec.ts#responsive-reflow-zoom-and-targets
        status: pass
    human_judgment: false
  - id: D4
    description: The aggregate gate proves deterministic artifacts, packed all-item installation, UI and hydration behavior, browser and contrast evidence, and the full Phase 2 regression suite.
    requirement: UI-04, UI-05, UI-07, QUAL-04
    verification:
      - kind: integration
        ref: tests/integration/phase3-gate.test.mjs#aggregate-gate-and-anti-skip-audit
        status: pass
    human_judgment: false
duration: 32min
completed: 2026-07-21
status: complete
---

# Phase 03 Plan 06: Accessibility and Layout Evidence Summary

**Afferent now closes Phase 3 with reproducible installed-source evidence for accessible keyboard interaction, announcements, contrast, target geometry, reflow, zoom, responsive layouts, and the complete distribution regression gate.**

## Performance

- **Duration:** 32 min
- **Tasks:** 3
- **Files modified:** 42

## Accomplishments

- Added pinned Chromium journeys over the exact packed package plus generated shadcn consumer, covering representative public and administrative keyboard, focus, dialog, announcement, target-size, reflow, zoom, and responsive behaviors.
- Corrected canonical withdraw-dialog focus behavior, status and alert semantics, stable success announcements, keyboard-submit focus restoration, merge copy, coarse-pointer targets, and narrow admin tag controls.
- Committed normalized axe, exact contrast, keyboard/focus, status-message, and fixed viewport evidence without machine-local paths, ports, process IDs, timestamps, or random identifiers.
- Expanded `test:phase3` into a complete self-auditing gate over generation and drift, packed registry installation, mounted UI and hydration, static contracts, contrast, browser and axe evidence, Phase 2 regression, and the anti-skip audit itself.

## Task Commits

1. **Task 1 RED: Establish browser accessibility evidence** - `be2f3ab`
2. **Task 2 GREEN: Close accessible interaction behavior** - `551d3e0`
3. **Task 3 GREEN: Capture installed UI accessibility evidence** - `8669dfa`

**Scope amendments:** `67c322f`, `abc7860`

## Deviations from Plan

- The existing registry fixture had no supported administrative state. The clean-consumer runner now exposes a prepared-consumer lifecycle, and the fixture supplies deterministic public and admin states so browser evidence still exercises installed artifacts rather than canonical repository imports.
- The exact pinned Playwright Chromium revision was not installed locally. Revision 1217 was installed with Playwright's standard browser command without changing package manifests or the lockfile.
- Visual inspection of the first 320px and zoom captures exposed cramped tag actions and detached checkbox labels. Canonical tag-manager classes and CSS now preserve labelled grouping and coarse-pointer hit areas.
- The aggregate gate required a committed `test:phase3` script expansion in `package.json`. Only that hunk was committed; the user's pre-existing TypeScript 7 manifest and lockfile experiment remains unstaged.

All corrections stayed inside the Plan 03-06 accessibility, layout, installed-fixture, and release-gate boundary. The evidence is WCAG 2.2 AA-oriented verification, not a blanket certification, and adopters remain responsible for overridden host themes and composition.

## Verification

- Full Phase 3 aggregate gate: pass via `npm run test:phase3` (capture object `a9de9316769c2189`).
- Installed-consumer Playwright evidence: 5/5 pass on two consecutive runs, including supplemental axe scans.
- Exact contrast evidence: 12/12 pass with unrounded comparisons.
- Mounted UI: 17/17 pass.
- Evidence determinism: two consecutive complete evidence-tree SHA-256 manifests are byte-identical.
- Anti-skip audit: 2/2 pass.
- Typecheck, lint, packed all-item consumer, deterministic generation and drift, hydration, static contracts, and full Phase 2 regression: pass through the aggregate gate.
- The remaining unstaged package diff is only the user's TypeScript `6.0.3` to `7.0.2` experiment; the lockfile and unrelated Codex configuration work remain untouched.

## Next Phase Readiness

- Phase 3 implementation is complete and ready for independent phase verification.
- Phase 4 can consume the same packed and generated artifacts for the hosted showcase, sandbox, real-Convex browser matrix, documentation, and release proof after verification passes.

## Self-Check: PASSED
