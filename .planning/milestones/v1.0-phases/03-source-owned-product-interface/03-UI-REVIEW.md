# Phase 03 — UI Review

**Re-audited:** 2026-07-22

**Baseline:** `03-UI-SPEC.md`

**Gap work reviewed:** `03-09` through `03-12` plans and summaries

**Screenshots:** All 19 current installed-source captures were inspected across the preceding full and delta audits. The 03-12 replacement `public-recovery-1280.png` was inspected at original resolution and now shows a non-Activity Notifications error with the approved guidance, sanitized detail, and working `Try loading again` action.

**Scope note:** Evidence-fixture navigation and scenario controls are test chrome and are excluded from product scoring. Their hostile host reset remains valid portal-integration evidence.

---

## Pillar Scores

| Pillar | Score | Key Finding |
| --- | ---: | --- |
| 1. Copywriting | 4/4 | One typed common entry supplies the exact approved recovery sentence to every public query-error branch under default copy, and host sentinel override propagation is proven without changing domain headings or actions. |
| 2. Visuals | 4/4 | Error, dialog, detail-card, selection, destructive, and administrative-section hierarchies remain coherent across the complete capture matrix. |
| 3. Color | 4/4 | Semantic accent, destructive, selected, error, unread, and focus treatments remain intact; all 12 light/dark contrast checks pass. |
| 4. Typography | 4/4 | Canonical screens and portals own the approved four-size/two-weight system, including under the hostile host reset. |
| 5. Spacing | 4/4 | Portal controls, declared spacing tokens, detail composition, section chunking, responsive reflow, target sizing, and 200% zoom all retain their verified geometry. |
| 6. Experience Design | 4/4 | Every public query error has a real query-owned retry, exhaustive state coverage remains intact, and the installed matrix proves recovery across all twelve public families. |

**Overall UI score: 24/24**

**Release classification: PASS — clean.** No objective UI, interaction, distribution, or evidence blocker remains. The full Phase 3 aggregate is reproducibly green from current HEAD.

---

## Objective Priority Fixes

**None.** The previously required product and evidence repairs are closed. Remaining work is limited to subjective product-design review and adopter-specific integration hardening.

---

## 03-12 Evidence and Retry Closure Ledger

- **CLOSED — Anti-skip 3/3.** The oracle now reads `queryErrorGuidance` and the exact default sentence from canonical, mirrored, and registry copy artifacts, while separately requiring executable mounted and installed scenario anchors. A fresh `node --test tests/integration/phase3-gate.test.mjs` run passes all three tests.
- **CLOSED — Exhaustive default guidance behavior.** Mounted matrices exercise board feed/search/similar/detail/discussion/Activity, Planned/In Progress/Complete roadmap groups, changelog feed/detail, and notifications. Each case asserts the approved sentence, its distinct domain label, sanitized detail or retained rows where applicable, and the exact originating query arguments.
- **CLOSED — Custom sentinel propagation.** Both mounted matrices repeat every surface with `common.queryErrorGuidance` set to `SENTINEL: use the host recovery channel.`, assert the default is absent, and preserve the original headings, labels, and callback arguments.
- **CLOSED — Installed recovery beyond Activity.** ST-06 drives twelve packed-consumer scenarios under both default and sentinel guidance. Each action causes the observable matching attempt count to advance to two and removes the error heading. VIS-02 separately captures and retries a Notifications failure to its ready retained notification target.
- **CLOSED — Roadmap and Notifications recovery no-op defect.** Their error-state headless unions now expose `pagination.retry`, and the UI buttons call `group.retry` / `notifications.retry` rather than ready-state-only `loadMore`. Mounted and installed matrices prove real second attempts for all three roadmap groups and notifications.
- **CLOSED — Distribution and determinism.** `npm run ui:check` passes with no canonical/example/registry drift. A fresh 13/13 installed Playwright run regenerated reports and all captures without a tracked diff.

---

## Prior Finding Regression Ledger

### Copywriting

- **CLOSED — Machine-shaped public activity.** Ready events still use `formatActivityDescription` and installed Activity retry reaches the human domain sentence.
- **CLOSED — Inconsistent or incomplete public recovery copy.** Every canonical and installed public query error uses the exact common guidance by default; custom copy replaces it everywhere through one typed provider override.
- **CLOSED — Administrative labels, consequence copy, raw discriminants, and timestamps.** Current admin and browser regressions remain green.

### Visuals

- **CLOSED — Raw/touching portal actions.** Dialog typography, border, radius, 44px actions, padding, focus, and 8px action separation remain computed under the hostile reset.
- **CLOSED — Detail-card collisions.** The 1280 geometry assertion still proves content does not intersect metrics.
- **CLOSED — Weak administrative grouping.** Moderation, tags, activity, merge, and changelog retain bordered 16px section chunking across phone, tablet, desktop, dark, and zoom evidence.
- **CLOSED — Selection, destructive hierarchy, and inert error tone.** Current captures and VIS-01 preserve all semantic treatments.

### Color

- **CLOSED — Semantic selection/error/destructive/focus allocation.** Current contrast evidence remains 12/12 with text/shape accompanying color.

### Typography

- **CLOSED — Portal host dependence, prohibited 12px count, and weight-only hierarchy.** No typography regression appears in source, computed styles, or captures.

### Spacing

- **CLOSED — Portal geometry, undeclared 6px spacing, notification gap, input padding, reflow, and zoom.** Static token checks and installed responsive measurements remain green.

### Experience Design

- **CLOSED — Hidden Activity states and missing/no-op public recovery.** Typed branches remain exhaustive; all twelve installed recovery families visibly recover through their originating query.
- **CLOSED — Consequential confirmations, phone pane model, admin states, and selection semantics.** Keyboard, focus, pending, correction, responsive, and state evidence remains green.
- **CLOSED — Evidence-integrity blocker.** Exhaustive default/custom mounted behavior, installed attempt observability, non-Activity visual recovery, anti-skip coverage, and the full aggregate now agree.

---

## Remaining Objective Findings

**None.** Direct source review, mounted behavior, headless projections, clean-consumer installation, installed browser interaction, captures/reports, anti-skip checks, and the complete aggregate found no unresolved contract defect.

---

## Human Review Still Required

- **Overall aesthetic polish and desirability.** The neutral source-owned UI is coherent and meets its explicit visual contract; whether it feels distinctive enough for a specific adopter remains subjective. `needs_human_review: true`; not a contract failure.
- **Administrative density and rhythm.** Current section chunking is measurable and collision-free, but preferred whitespace and progressive disclosure remain product-design judgments. `needs_human_review: true`; not a contract failure.
- **Adopter content/theme variability.** The deterministic fixture covers long content, hostile inherited resets, dark mode, reflow, coarse pointer, and 200% zoom. More extreme localization and host token sets remain adopter-level review. `needs_human_review: true`; not a known defect.

---

## Registry Audit

The repository intentionally has no root `components.json`, and the UI-SPEC permits only official shadcn primitives plus the project-owned generated Afferent registry. The clean fixture uses no third-party registry. **Registry audit: 0 third-party blocks required checking; no flags.**

---

## Evidence Inspected and Reproduced

- Current `03-UI-REVIEW.md`, approved `03-UI-SPEC.md`, and `03-12-PLAN.md` / `03-12-SUMMARY.md`.
- Source-grounded anti-skip oracle, canonical/mirrored/registry copy, mounted recovery helpers/matrices, roadmap and notification headless mappings, and their canonical/generated UI buttons.
- Installed fixture `PublicRecoveryScenario` mapping, default/sentinel provider override, hidden attempt observability, ST-06, VIS-02, evidence index, normalized status/keyboard reports, and updated recovery capture.
- Fresh focused results: anti-skip 3/3; mounted recovery 15/15; focused headless/public retry projection 28/28; installed Playwright 13/13; `ui:check` clean.
- Fresh full result: `npm run test:phase3` passed, including deterministic generation, packed clean consumer, mounted/static/accessibility suites, all installed browser scenarios, the complete Phase 2 real-backend/headless/auth/scope/package regression, typecheck, lint, and final anti-skip 3/3.
