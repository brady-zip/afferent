# Phase 03 — UI Review

**Re-audited:** 2026-07-22

**Baseline:** `03-UI-SPEC.md`

**Gap work reviewed:** `03-09-PLAN.md` / `03-09-SUMMARY.md` and `03-10-PLAN.md` / `03-10-SUMMARY.md`

**Screenshots:** All 19 current installed-source captures were inspected, including the new `public-recovery-1280.png`. No new capture was needed because the gap summaries, versioned browser assertions, and current PNG set agree.

**Scope note:** The evidence-fixture banner, surface navigation, and evidence controls are test chrome and were excluded from product scoring. Their intentionally hostile `12px/1 serif` body and unstyled-button reset were used as integration evidence for portaled UI.

---

## Pillar Scores

| Pillar | Score | Key Finding |
| --- | ---: | --- |
| 1. Copywriting | 3/4 | Public activity now uses the human formatter and every audited public query failure has a domain-specific recovery action, but search, similar-feedback, detail, discussion, and changelog errors still omit the baseline's general recovery-guidance sentence. |
| 2. Visuals | 4/4 | Dialog hierarchy, detail-card composition, selection/error/destructive treatments, and administrative section chunking are visibly coherent across the complete light/dark and responsive evidence set. |
| 3. Color | 4/4 | Accent, destructive, selected, error, unread, and focus treatments follow the semantic allocation; all 12 measured light/dark contrast checks pass. |
| 4. Typography | 4/4 | Canonical screens and portaled dialogs own the four-size/two-weight system; hostile host inheritance no longer changes dialog or action typography. |
| 5. Spacing | 4/4 | Dialog controls own 44px sizing and 8px/16px padding, action separation is measured, the stray 6px value is removed, and responsive/reflow evidence retains all actions without overflow. |
| 6. Experience Design | 4/4 | Public activity exposes its complete typed state machine, every audited public failure has query-owned retry, and the admin, mobile, keyboard, focus, and recovery paths remain complete. |

**Overall: 23/24**

**Release classification:** WARNING — no blocker remains. The implementation closes every prior visual, typography, spacing, and experience defect. One minor copy-contract mismatch remains: several public query errors provide a working, outcome-specific retry but not the baseline's prescribed general recovery-guidance sentence.

---

## Top 3 Follow-ups

1. **Close the remaining copy warning.** Reuse `Try loading it again. If the problem continues, contact the application owner.` (or formally amend the approved baseline) across public search, similar-feedback, detail, discussion, and changelog error regions while retaining their clearer domain-specific retry labels.
2. **Run the final human product-design pass.** Judge aesthetic polish, rhythm, and administrative density across the 19-image matrix; current evidence proves the contract and shows no concrete defect, but desirability remains subjective.
3. **Exercise adopter-specific host content and themes.** Stress unusually long product/board/status/count values and real host tokens beyond the deterministic fixture. The current seeded long-content, hostile-reset, reflow, and zoom cases pass; this is integration hardening, not a known contract failure.

---

## Prior Finding Closure Ledger

### Copywriting

- **CLOSED — Public activity was machine-shaped.** `ui/afferent/board/activity.tsx` now renders ready events through `formatActivityDescription`, producing domain prose such as “Alex changed … from Open to Planned” instead of formatting raw event discriminants. The browser recovery path asserts the semantic sentence after retry.
- **PARTIALLY CLOSED — Public query errors omitted recovery copy/action.** Search, similar-feedback, feedback detail, discussion, activity, and changelog now receive the matching query-owned `retry` and render descriptive controls such as `Retry activity`, `Retry feedback search`, and `Reload changelog`. The remaining mismatch is copy-only: most of those regions still omit the UI-SPEC line 166 guidance, `Try loading it again. If the problem continues, contact the application owner.`
- **CLOSED — Required tag labels.** `ui/afferent/core/copy.ts` defines `Create feedback tag` and `Delete feedback tag`; mounted and browser assertions cover the rendered labels.
- **CLOSED — Merge consequence copy.** The confirmation identifies both records, moved votes/comments/history, irreversibility, and the typed confirmation requirement.
- **CLOSED — Raw administrative state discriminants.** Loading, denied, empty, query-error, loading-more, activity, and editorial states use domain copy.
- **CLOSED — Activity and timestamps in the original administrative/notification scope.** The shared formatter supplies fixed-English activity and UTC date-time prose.

### Visuals

- **CLOSED — Portaled confirmation actions were raw and visually touching.** `.afferent-dialog` now owns its surface, border, radius, typography, focus treatment, and 16px composition gap; its buttons own border, radius, state colors, and control geometry, while `.afferent-dialog__actions` owns the 8px separation. `admin-confirmations-1280.png` shows two distinct, deliberate actions.
- **CLOSED — Desktop detail cards collapsed title/body/stat hierarchy.** The detail workspace now stacks feedback-card metrics below the content. `detail-1280.png` shows readable title/body flow with a separated vote/comment row, and the browser geometry assertion proves content bottom does not cross the totals top.
- **CLOSED — Administrative grouping was weak.** Moderation, tags, activity, merge, and changelog are now distinct bordered `.afferent-admin-section` regions with measured 16px gaps/padding. This chunking is visible at 320px, 768px, 1280px, dark theme, and 200% zoom.
- **CLOSED — Persistent queue selection.** Selected rows retain a primary border, `Selected feedback` pill, `data-selected`, and `aria-current` after focus moves.
- **CLOSED — Destructive actions looked ordinary.** Archive, delete-tag, merge, and unpublish use destructive styling and separated destructive regions.
- **CLOSED — Error tone was visually inert.** Error regions carry a destructive border/tone, heading, body, and recovery control.
- **CLOSED — Incomplete visual evidence matrix.** VIS-02 now versions 19 captures spanning public/admin, light/dark, confirmation/error/empty/recovery, popover, phone/tablet/desktop, reflow, and 200% zoom.

### Color

- **CLOSED — Popover trigger used primary accent.** The trigger uses the secondary treatment while unread count retains the allowed primary marker.
- **CLOSED — Missing semantic selected/error/destructive color.** Selection uses primary; read errors and destructive boundaries use destructive; every color cue is accompanied by text or shape. `contrast.json` records 12/12 exact unrounded passes.

### Typography

- **CLOSED — Portaled dialogs depended on host typography.** `.afferent-dialog` explicitly establishes `400 16px/1.5` Afferent sans typography, and dialog buttons establish `600 16px/1.5`. VIS-01 verifies those computed values under the fixture's hostile serif reset.
- **CLOSED — Prohibited 12px unread count.** The count uses the allowed 14px metadata size.
- **CLOSED — Weight-only selection/unread hierarchy.** Selection and unread states also use border, pill/count shape, and explicit text.

### Spacing

- **CLOSED — Dialog actions lacked control spacing.** Portal buttons now have a 44px minimum height, 8px/16px padding, and an 8px action gap. VIS-01 checks the computed geometry rather than relying on source inspection alone.
- **CLOSED — Undeclared 6px spacing remained.** Notification-count inline padding is now 8px. The static contract scan covers directional margin/padding, row/column gaps, and forbidden 6/12/20/40px values.
- **CLOSED — 12px notification gap.** Notification stacks use 16px.
- **CLOSED — 8px/12px admin input padding.** Admin and dialog inputs use 8px/16px.
- **CLOSED — Responsive spacing/reflow risk.** Phone, tablet, desktop, 320px reflow, and 200% zoom captures retain every admin action without page-level horizontal overflow; coarse-pointer targets meet 44px.

### Experience Design

- **CLOSED — Public activity hid typed states.** `activity.tsx` now renders explicit unsupported, loading, empty, error, and ready branches, with an exhaustive guard rather than returning `null` for non-ready states.
- **CLOSED — Public failures had no actionable retry.** The headless projections retain their originating watch's retry, and search, similar-feedback, feedback detail, discussion, activity, changelog feed, and changelog detail render the matching recovery action. `public-recovery-1280.png` shows the Activity error and `Retry activity`; the browser test clicks it and observes the ready semantic event.
- **CLOSED — Consequential actions lacked confirmation.** Archive, tag delete, publish, unpublish, and merge retain exact consequence/escape copy, pending lockout, typed error/reset/retry, and focus restoration.
- **CLOSED — Mobile rendered queue and detail together.** Host-owned `mobileView` presents one pane below 768px and both panes above it; both phone panes are versioned.
- **CLOSED — Administrative states were incomplete.** Empty, query-error/retry, loading-more, activity, editorial, and formatted-time states have direct screenshot/test evidence.
- **CLOSED — Selection semantics were incomplete.** `data-selected` and `aria-current` persist through phone navigation and the wide-layout transition.

---

## Remaining Finding

### Pillar 1: Copywriting (3/4)

- **WARNING — General public-query recovery guidance is not consistently rendered.** The board-feed error includes the UI-SPEC sentence `Try loading it again. If the problem continues, contact the application owner.`, but search, similar-feedback, feedback detail, discussion, and changelog errors render a typed error plus a working domain-specific retry without that guidance. This is not a recovery or task-completion failure: each control retries the correct originating watch, and the more specific labels are clearer than a bare `Retry`. It is a minor approved-baseline copy mismatch.
- **Positive evidence.** Activity descriptions are human-readable; administrative and notification timestamps are formatted; query controls describe the affected outcome; no raw event discriminants appear in current product captures.

### Pillars 2–6

- **No remaining contract finding.** Current code, computed-style assertions, accessibility reports, mounted/static tests, and all 19 screenshots agree that the prior visual, color, typography, spacing, and experience warnings are closed.

---

## Human Review Still Required

- **Overall aesthetic polish and desirability.** The neutral source-owned UI is coherent and satisfies its explicit visual contract across light/dark and responsive states. Whether its restrained styling feels sufficiently distinctive for a given adopter is subjective. `needs_human_review: true`; not a contract failure.
- **Administrative density and rhythm.** The new section cards make moderation, tags, activity, merge, and changelog scannable at all captured sizes. A product designer should still judge the preferred amount of whitespace and progressive disclosure for real workflows. `needs_human_review: true`; no observed collision or hidden action remains.
- **Adopter content/theme variability.** The deterministic fixture covers long content, hostile inherited typography/button resets, dark mode, reflow, coarse pointer, and 200% zoom. Real host token sets and more extreme localized content need adopter-level review. `needs_human_review: true`; the tested host-reset contract passes.

---

## Registry Audit

The repository intentionally has no root `components.json`, and the UI-SPEC permits only official shadcn primitives plus the project-owned generated Afferent registry. The clean fixture uses no third-party registry. All generated items declare only approved pinned runtime packages and local sibling dependencies. **Registry audit: 0 third-party blocks required checking; no flags.**

---

## Evidence Inspected

- Full role/workflow: `.codex/agents/gsd-ui-auditor.md`, `.codex/skills/gsd-ui-review/SKILL.md`, `.codex/gsd-core/workflows/ui-review.md`, `.codex/gsd-core/references/ui-brand.md`, and `AGENTS.md`.
- Contracts/plans: `03-UI-SPEC.md`, the prior `03-UI-REVIEW.md`, and `03-09` / `03-10` plans and summaries.
- Canonical source: repaired public activity/error surfaces, headless retry projections, admin dialogs/sections, shared copy/formatters, and `ui/afferent/afferent.css`.
- Installed fixture: `fixtures/registry-vite/src/App.tsx`, its hostile-reset `src/index.css`, and the installed/generated source used by the browser gate.
- Mounted/static/browser evidence: public/admin UI suites, headless retry suites, `tests/static/ui-contracts.test.ts`, and `tests/accessibility/phase3.spec.ts` including VIS-01, VIS-02, and RZ-01.
- Reports: `docs/accessibility/phase-3/README.md`, `axe.json`, `contrast.json`, `keyboard-focus.md`, and `status-messages.md`.
- All 19 PNGs: `admin-confirmations-1280.png`, `admin-detail-320.png`, `admin-empty-1280.png`, `admin-queue-320.png`, `admin-states-1280.png`, `board-1280.png`, `changelog-1280.png`, `dark-admin-1280.png`, `dark-public-1280.png`, `desktop-1280.png`, `detail-1280.png`, `notifications-1280.png`, `notifications-popover-1280.png`, `phone-320.png`, `public-recovery-1280.png`, `reflow-320.png`, `roadmap-1280.png`, `tablet-768.png`, and `zoom-200.png`.
- Fresh focused verification: mounted UI/hydration 4 files / 22 tests passed; static UI contracts 1 file / 4 tests passed; headless retry projection 4 files / 25 tests passed. Current versioned reports record 12/12 contrast checks and zero axe violations.
