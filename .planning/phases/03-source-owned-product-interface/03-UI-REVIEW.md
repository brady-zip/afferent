# Phase 03 — UI Review

**Re-audited:** 2026-07-22

**Baseline:** `03-UI-SPEC.md`

**Gap work reviewed:** `03-09-PLAN.md` / `03-09-SUMMARY.md`, `03-10-PLAN.md` / `03-10-SUMMARY.md`, and `03-11-PLAN.md` / `03-11-SUMMARY.md`

**Screenshots:** All 19 current installed-source captures were previously inspected in the immediately preceding full audit; the 03-11 replacement `public-recovery-1280.png` was inspected again at original resolution. It visibly contains the exact approved guidance, typed detail, and `Retry activity` action.

**Scope note:** The evidence-fixture banner, surface navigation, and evidence controls are test chrome and are excluded from product scoring. Their intentionally hostile body/button reset remains valid portal-integration evidence.

---

## Pillar Scores

| Pillar | Score | Key Finding |
| --- | ---: | --- |
| 1. Copywriting | 4/4 | One typed common entry now supplies the exact approved recovery sentence to every canonical public query-error branch while retaining specific headings, details, and action labels. |
| 2. Visuals | 4/4 | The added guidance fits the existing error hierarchy in `public-recovery-1280.png`; no CSS or structural visual repair from 03-10 regressed. |
| 3. Color | 4/4 | Error, destructive, selected, unread, focus, light, and dark treatments are unchanged; the current 12/12 contrast suite passes. |
| 4. Typography | 4/4 | Screen and portal typography remain owned by Afferent and the added paragraph uses the established body hierarchy. |
| 5. Spacing | 4/4 | Dialog geometry, declared tokens, detail-card separation, section spacing, target sizing, reflow, and zoom evidence are unchanged. |
| 6. Experience Design | 4/4 | Source inspection confirms every affected error retains its originating query-owned recovery callback and all previously closed public/admin states remain intact. |

**Overall UI score: 24/24**

**Release classification: BLOCKER — verification integrity, not a product-UI defect.** The sole UI copy warning is closed in canonical, mirrored, registry, and captured installed source. However, the required anti-skip test currently fails deterministically, and the claimed every-surface mounted/installed proof is not present. Phase 03 cannot use the current evidence set as a green release gate until those objective verification defects are fixed.

---

## Top 3 Priority Fixes

1. **Repair the red anti-skip oracle.** `tests/integration/phase3-gate.test.mjs:77-86` requires `queryErrorGuidance` in the concatenated browser-spec and fixture source, but neither file contains that identifier. Make the oracle inspect installed/generated product source or add a meaningful installed custom-copy scenario; do not satisfy it with a dead fixture string.
2. **Add the promised every-surface behavioral matrix.** Mount and exercise board feed/search, similar feedback, detail, discussion, Activity, each roadmap group, changelog feed/detail, and notifications in error state; assert the exact guidance, existing specific label, retained rows where applicable, and the exact callback/watch re-execution.
3. **Prove the shared override contract from installed source.** Add a `DeepPartial<AfferentUiCopy>` override with a sentinel `common.queryErrorGuidance`, verify it reaches every public query-error branch, and extend the packed-consumer browser fixture beyond its current Activity-only public failure scenario.

---

## 03-11 Copy Warning Closure

- **CLOSED in implementation — Exact sentence.** `ui/afferent/core/copy.ts` defines typed `common.queryErrorGuidance` with exactly `Try loading it again. If the problem continues, contact the application owner.` The former board-local duplicate is gone.
- **CLOSED in implementation — Complete canonical wiring.** Board feed and search, similar feedback, feedback detail, discussion, Activity, each roadmap group, changelog feed and detail, and notifications each render `copy.common.queryErrorGuidance` in their query-error branch.
- **CLOSED in implementation — Action specificity and callback ownership.** Existing labels remain outcome-specific. Source inspection confirms `feed.retry`, discovery `state.retry`, `lookup.retry`, `comments.retry`, Activity `state.retry`, roadmap `group.loadMore`, changelog `feed.retry` / `detail.retry`, and notification `notifications.loadMore` are still attached directly to the corresponding controls.
- **CLOSED in distribution.** `npm run ui:check` passed after deterministic regeneration, and `git diff --exit-code -- registry examples/ui/afferent` remained clean. Canonical, example, and registry content agree.
- **CLOSED in the named visual scenario.** `public-recovery-1280.png` shows the exact guidance between the Activity heading and sanitized error detail beside `Retry activity`. The browser source clicks that action and expects the formatted ready event.

---

## Prior Finding Regression Ledger

### Copywriting

- **CLOSED — Machine-shaped public activity.** Ready events still use `formatActivityDescription`; the Activity browser recovery expects the human sentence after retry.
- **CLOSED — Inconsistent public recovery guidance.** All canonical public query errors now use the common exact sentence. No component-local copy duplicate remains.
- **CLOSED — Administrative labels, consequence copy, discriminants, and timestamps.** The 03-11 delta only migrated two removed-key consumers to the common entry; focused admin tests pass.

### Visuals

- **CLOSED — Raw/touching portal actions, detail-card collisions, weak admin grouping, selection, destructive hierarchy, and inert error tone.** The 03-11 product delta contains no stylesheet, dialog, feedback-card, or admin-section structural change. The current recovery image retains the repaired error hierarchy.

### Color

- **CLOSED — Semantic selection/error/destructive/focus allocation.** No color source changed; fresh contrast verification passes 12/12.

### Typography

- **CLOSED — Portal ownership, 12px count, and weight-only state hierarchy.** No typography source changed in 03-11.

### Spacing

- **CLOSED — Portal control geometry, 6px token, notification gap, input padding, reflow, and zoom.** No CSS changed in 03-11; the static token/portal contract suite passes 5/5.

### Experience Design

- **CLOSED in product — Typed Activity states and public recovery callbacks.** All prior state branches and direct query-owned actions remain in source.
- **CLOSED — Consequential confirmations, phone pane model, admin states, and selection semantics.** Focused admin/hydration tests pass 9/9; headless retry projection tests pass 25/25.
- **BLOCKER in evidence — Required anti-skip gate is red.** A fresh `node --test tests/integration/phase3-gate.test.mjs` run passes tests 1–2 and fails test 3 because `/queryErrorGuidance/` does not match the browser-spec/fixture concatenation. The 03-11 summary's full-green claim is therefore not reproducible from current HEAD.

---

## Remaining Objective Findings

### BLOCKER — The required Phase 3 anti-skip test fails

`tests/integration/phase3-gate.test.mjs` searches only `tests/accessibility/phase3.spec.ts` plus `fixtures/registry-vite/src/App.tsx` for `queryErrorGuidance`. The identifier exists in canonical/generated UI, not either oracle file, so the assertion always fails at current HEAD. Because `test:phase3` composes this test, the release gate is not green.

### WARNING — Evidence does not cover every promised public error path

- Mounted tests assert the exact default sentence for board feed and changelog feed only.
- The static test confirms each listed canonical file contains `copy.common.queryErrorGuidance`, but it does not prove the occurrence is in every error branch or that each action invokes its originating callback.
- Installed-browser evidence exercises only Activity error → `Retry activity` → ready. The fixture exposes no public-error selector for board search, similar feedback, detail, discussion, roadmap, changelog, or notifications.
- No test supplies a custom `common.queryErrorGuidance` override and proves propagation, despite the 03-11 plan and summary claiming customizable every-surface coverage.

These are verification defects, not observed UI failures. Direct source inspection found the implementation correct on every named surface.

---

## Human Review Still Required

- **Overall aesthetic polish and desirability.** The neutral source-owned UI is coherent and satisfies its explicit visual contract; whether it feels distinctive enough for an adopter remains subjective. `needs_human_review: true`; not a contract failure.
- **Administrative density and rhythm.** Current section chunking is measurable and collision-free, but preferred whitespace and progressive disclosure remain product-design judgments. `needs_human_review: true`; not a contract failure.
- **Adopter content/theme variability.** The deterministic fixture covers long content, hostile inherited resets, dark mode, reflow, coarse pointer, and 200% zoom. More extreme localization and host token sets remain adopter-level review. `needs_human_review: true`; not a known defect.

---

## Registry Audit

The repository intentionally has no root `components.json`, and the UI-SPEC permits only official shadcn primitives plus the project-owned generated Afferent registry. The clean fixture uses no third-party registry. **Registry audit: 0 third-party blocks required checking; no flags.**

---

## Evidence Inspected

- Full auditor role and approved `03-UI-SPEC.md`, including the exact query-error sentence and closed-state/verification contracts.
- Current `03-UI-REVIEW.md`, `03-11-PLAN.md`, and `03-11-SUMMARY.md`.
- Central typed copy plus every canonical public error surface: board feed/search, similar feedback, detail, discussion, Activity, roadmap groups, changelog feed/detail, and notifications.
- Generated examples and registry drift via `npm run ui:check`.
- Mounted/static evidence: board/public-surface tests 13/13 passed; static UI contracts 5/5 passed.
- Regression evidence: admin/hydration 9/9 passed; headless retry projection 25/25 passed; contrast 12/12 passed.
- Installed evidence source, fixture controls, `public-recovery-1280.png`, evidence index, and anti-skip composition.
- **Fresh failing evidence:** Phase 3 anti-skip 2/3 passed; test 3 failed on the unsatisfied `queryErrorGuidance` source assertion.
