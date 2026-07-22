# Phase 03 — UI Review

**Re-audited:** 2026-07-22

**Baseline:** `03-UI-SPEC.md`

**Gap work reviewed:** `03-07-PLAN.md` / `03-07-SUMMARY.md` and `03-08-PLAN.md` / `03-08-SUMMARY.md`

**Screenshots:** All 18 current installed-source captures inspected; no new capture because ports 3000, 4173, 5173, and 8080 were inactive
**Scope note:** The evidence-fixture banner, surface navigation, and evidence controls are test chrome and were excluded from product scoring.

---

## Pillar Scores

| Pillar | Score | Key Finding |
| --- | ---: | --- |
| 1. Copywriting | 3/4 | Administrative copy now matches the specified dictionary, but public activity still mechanically exposes event discriminants and public query failures omit the specified recovery guidance/action. |
| 2. Visuals | 2/4 | Selection, error, and destructive hierarchy are repaired, but the portaled confirmation actions render as raw, visually touching browser controls and the desktop detail list visibly collapses title/body/stat hierarchy. |
| 3. Color | 4/4 | Accent, destructive, selected, error, unread, and focus treatments now follow the semantic allocation and all 12 measured light/dark contrast checks pass. |
| 4. Typography | 3/4 | Canonical screens use the four-size/two-weight system, but the portaled dialog does not establish the Afferent font/control typography and therefore depends on host/reset inheritance. |
| 5. Spacing | 2/4 | Core gutters and responsive reflow pass, but dialog actions have no control padding and appear joined, while the notification count introduces an undeclared 6px inline spacing value. |
| 6. Experience Design | 2/4 | The prior safety blocker, mobile pane model, and admin state coverage are closed; public activity still hides error/empty/unsupported states and several public failures provide no retry path. |

**Overall: 16/24**

**Release classification:** WARNING — the previous release blocker is closed. No task-breaking or unsafe action remains in the audited administration flow, but the copied-source UI still has visible dialog quality defects and public recovery-state contract gaps.

---

## Top 3 Priority Fixes

1. **Finish the portaled dialog design contract** — `admin-confirmations-1280.png` shows `Merge duplicate` and `Keep feedback` as raw controls with no visible separation — give `.afferent-dialog` its own font contract and style every dialog button with the normal 44px control size, 8px/16px padding, border, radius, and visible 8px action gap independent of `.afferent-admin` or fixture resets.
2. **Close public state and recovery paths** — activity errors currently disappear, while search, similar-feedback, post-detail, discussion, and changelog failures stop at error text — render every exported state and provide the specified `Try loading again` or domain-specific recovery action without leaking raw discriminants.
3. **Refine responsive information density** — `detail-1280.png` compresses feedback-card title, body, and metrics into collisions, and the 1280px admin workspace extends beyond 2300px with weak section chunking — adjust the list/detail card composition, strengthen section containers, and replace the 6px count padding with a declared spacing token.

---

## Prior Finding Closure Ledger

### Copywriting

- **CLOSED — Required tag labels.** `ui/afferent/core/copy.ts:461,465` defines `Create feedback tag` and `Delete feedback tag`; mounted/browser assertions cover the rendered labels (`tests/ui/admin.test.tsx:280-283`, `tests/accessibility/phase3.spec.ts:379`).
- **CLOSED — Merge consequence copy.** `ui/afferent/core/copy.ts:473` names both records, moved votes/comments/history, irreversibility, and the typed confirmation; `tests/ui/admin.test.tsx:346` and `tests/accessibility/phase3.spec.ts:428` assert the consequence text.
- **CLOSED — Raw administrative state discriminants.** Loading, denied, empty, query-error, loading-more, activity, and editorial states use domain copy; `admin-empty-1280.png`, `admin-states-1280.png`, and ST-05 show the closed states.
- **CLOSED for the original admin/time scope — Activity and timestamps.** `ui/afferent/core/format.ts:16-65` supplies fixed English activity and UTC date-time formatting, consumed by admin and notifications (`admin/admin-screen.tsx:272-273`, `notifications/notifications-list.tsx:212-213`). A separate public-activity warning remains below.

### Visuals

- **CLOSED — Persistent queue selection.** `feedback-queue.tsx:73-77` emits selected state and `aria-current`; `afferent.css:769-782` adds primary border plus a `Selected feedback` pill. This remains visible in `desktop-1280.png`, `tablet-768.png`, `dark-admin-1280.png`, and `admin-states-1280.png` after focus leaves the row.
- **CLOSED — Destructive actions looked ordinary.** Archive, delete-tag, merge, and unpublish controls now use destructive styling and separated destructive sections (`afferent.css:902-929`), visible in all admin captures.
- **CLOSED — Error tone was visually inert.** `afferent.css:156-164` consumes `data-tone="error"`; `admin-states-1280.png` shows a red border, heading, and retry action.
- **PARTIALLY CLOSED — Weak administrative grouping.** Destructive boundaries, selected state, cards, and error regions now create meaningful anchors. The complete 1280px workspace is still a 2317px vertical form with moderation, tags, activity, merge, and changelog stacked in one detail pane; final density/chunking remains `needs_human_review: true`.
- **CLOSED — Incomplete visual evidence matrix.** VIS-02 now versions 18 captures spanning public/admin, light/dark, confirmation/error/empty, popover, phone/tablet/desktop, reflow, and 200% zoom.

### Color

- **CLOSED — Popover trigger used primary accent.** `notifications-popover.tsx:24` now includes the secondary treatment; the unread count retains the allowed primary marker.
- **CLOSED — Missing semantic selected/error/destructive color.** Current selection uses primary, read errors and destructive boundaries use destructive, and state is also conveyed by text/shape. VIS-01 checks the computed styles; `contrast.json` records 12/12 passing ratios.

### Typography

- **CLOSED — Prohibited 12px unread count.** `afferent.css:627-638` now uses 14px.
- **CLOSED — Weight-only selection/unread hierarchy.** Selection now has a pill and primary border; unread state has text and a primary border/count shape.

### Spacing

- **CLOSED — 12px notification gap.** Notification stacks use 16px (`afferent.css:567-580`).
- **CLOSED — 8px/12px admin input padding.** Admin and dialog inputs use 8px/16px (`afferent.css:868-875`).

### Experience Design

- **CLOSED — Consequential actions lacked confirmation.** Archive, tag delete, publish, unpublish, and merge all use dialogs with exact consequence/escape copy, pending lockout, typed error/reset/retry, and focus restoration. `tests/ui/admin.test.tsx:275-423`, KF-04, ST-03, ST-04, and `admin-confirmations-1280.png` provide direct evidence.
- **CLOSED — Mobile rendered queue and detail together.** `admin-screen.tsx:35-87` accepts host-owned `mobileView`; `afferent.css:731-735,937-942` shows one pane below 768px and both panes above it. `admin-queue-320.png` and `admin-detail-320.png` cover both phone panes.
- **CLOSED — Administrative states were incomplete.** `admin-empty-1280.png` and `admin-states-1280.png`, plus ST-05, cover empty, query-error/retry, loading-more, activity, editorial, and formatted-time states.
- **CLOSED — Selection semantics were incomplete.** `feedback-queue.tsx:73-77` exposes `data-selected` and `aria-current`; KF-05 verifies selection survives phone navigation and the wide-layout transition.

---

## Remaining Findings

### Pillar 1: Copywriting (3/4)

- **WARNING — Public activity remains machine-shaped.** `ui/afferent/core/copy.ts:360` constructs a sentence with `type.replaceAll("_", " ")`; `ui/afferent/board/activity.tsx:49-60` delegates every event to it. `detail-1280.png` consequently reads `Alex recorded status change.` instead of the domain sentence already used by the admin formatter.
- **WARNING — Public query errors omit the specified recovery copy.** Board search (`board-screen.tsx:345-350`), similar feedback (`similar-feedback.tsx:43-51`), post detail (`post-detail.tsx:44-49`), and changelog detail (`changelog-screen.tsx:142-150`) render only a heading plus typed error. UI-SPEC line 166 also requires `Try loading it again. If the problem continues, contact the application owner.` and an outcome-specific `Try loading again` action.
- **Positive evidence.** The original admin copy warnings are closed, timestamps are human-readable UTC values, and no raw administrative union discriminants appear in the current captures.

### Pillar 2: Visuals (2/4)

- **WARNING — Confirmation actions are visibly unstyled.** `ui/afferent/admin/confirmation-dialog.tsx:105-122` places ordinary buttons in `.afferent-dialog__actions`, but the control rule is scoped to `.afferent-admin button` (`afferent.css:790-798`) while the Radix portal is outside that subtree. The dialog rule supplies layout (`afferent.css:883-917`) and the destructive button supplies only colors (`afferent.css:925-929`), not border/radius/font/padding. In `admin-confirmations-1280.png`, `Merge duplicate` and `Keep feedback` visually touch and read like inline text rather than two deliberate actions.
- **WARNING — Desktop detail cards collapse their internal hierarchy.** `detail-1280.png` shows multi-line titles/bodies pressed into vote/comment metrics in the list pane. The breakpoint combines a 2fr/3fr workspace (`afferent.css:679-684`) with cards that keep an auto-width metric column (`afferent.css:646-652`), leaving the content column too narrow for a clean 1280px detail composition.
- **WARNING — Administrative grouping still needs aesthetic review.** The repaired semantic boundaries are clear, but `desktop-1280.png` and `dark-admin-1280.png` remain long, visually uniform control stacks with limited chunking between moderation and publishing. `needs_human_review: true`.

### Pillar 3: Color (4/4)

- **No remaining color finding.** `docs/accessibility/phase-3/contrast.json` records 12/12 exact unrounded passes: default text/muted/primary/destructive text exceed 4.5:1 and border/focus treatments exceed 3:1 in light and dark themes.
- **Positive evidence.** `dark-public-1280.png`, `dark-admin-1280.png`, `notifications-1280.png`, `admin-states-1280.png`, and `admin-confirmations-1280.png` show that color is reserved for current selection, primary action, unread/focus, error, and destructive meaning, always accompanied by text or shape.

### Pillar 4: Typography (3/4)

- **WARNING — Portaled dialogs do not own their typography.** `[data-afferent-screen]` establishes the 16px/1.5 Afferent font contract (`afferent.css:31-36`), but Radix portals the dialog under `body`. `.afferent-dialog` and its buttons do not set `font-family`, `font-size`, `font-weight`, or `line-height`; the evidence fixture's reset masks host dependence. The copied component therefore cannot guarantee its specified 16px/600 action typography in an arbitrary consumer.
- **Positive evidence.** Outside that portal boundary, the stylesheet scan contains only 14px metadata, 16px body/control, 20px section, and 28px screen sizes with weights 400/600; the old 12px badge defect is closed.

### Pillar 5: Spacing (2/4)

- **WARNING — Dialog actions lack control spacing.** Although `.afferent-dialog__actions` declares an 8px flex gap (`afferent.css:912-917`), the unscoped portal buttons have no Afferent padding or minimum height. The resulting controls visibly run together in `admin-confirmations-1280.png`, so the rendered outcome does not satisfy the 8px/16px control spacing contract.
- **WARNING — An undeclared 6px token remains.** `.afferent-notifications-trigger__count` uses `padding-inline: 6px` (`afferent.css:627-638`), outside the specified 4/8/16/24/32/48/64 scale. The current static spacing test does not scan directional padding properties, so this passes automation despite violating the declared contract.
- **Positive evidence.** Phone, tablet, desktop, reflow, and 200% zoom captures retain content and actions without page-level horizontal overflow; the standard screen/card/input gutters otherwise follow the declared scale.

### Pillar 6: Experience Design (2/4)

- **WARNING — Public activity hides typed states.** `ui/afferent/board/activity.tsx:19-30` returns `null` for `unsupported`, `empty`, and `error`. This directly conflicts with UI-SPEC line 204, which requires exhaustive visible loading, empty, unsupported/not-configured, error, retry, and ready states and forbids collapsing typed failures.
- **WARNING — Public failure states have no actionable retry.** The search, similar-feedback, post-detail, discussion, and changelog error regions expose an error but no retry/reset/navigation action. A user encountering a transient read failure has no in-context recovery control even though the contract requires one.
- **Positive evidence.** The high-risk admin flow is now keyboard-complete and safe: all five confirmations retain context, block duplicate submission while pending, recover from typed failures, restore focus, and preserve queue/detail selection. The one-pane phone contract, 200% zoom, 320px reflow, target size, focus visibility, status messages, and zero-axe-violation checks all pass.

---

## Human Review Still Required

- **Overall aesthetic polish and desirability:** automation proves interaction and accessibility mechanics, not whether the source-owned UI feels product-ready. Review the long admin composition, public card density, and dialog presentation in both themes. `needs_human_review: true`.
- **Information density at realistic data lengths:** the fixed evidence content already causes collisions in `detail-1280.png`; longer product, board, status, and count values need a human stress pass. `needs_human_review: true`.
- **Host integration of portaled overlays:** confirm the dialog typography and button appearance without Tailwind/preflight or a global host font reset. `needs_human_review: true` until the dialog owns those styles.

---

## Registry Audit

The repository intentionally has no root `components.json`, and the UI-SPEC permits only official shadcn primitives plus the project-owned generated Afferent registry. The clean fixture uses no third-party registry. All six generated items declare only approved pinned runtime packages and local `./afferent-ui-core.json` sibling dependencies. **Registry audit: 0 third-party blocks required checking; no flags.**

---

## Evidence Inspected

- Full role/workflow: `.codex/agents/gsd-ui-auditor.md`, `.codex/skills/gsd-ui-review/SKILL.md`, `.codex/gsd-core/workflows/ui-review.md`, `.codex/gsd-core/references/ui-brand.md`, and `AGENTS.md`.
- Contracts/plans: `03-UI-SPEC.md`, the prior `03-UI-REVIEW.md`, and `03-07` / `03-08` plans and summaries.
- Canonical UI: all files under `ui/afferent/admin`, `board`, `changelog`, `core`, `notifications`, and `roadmap`, plus `ui/afferent/afferent.css`, `registry.ts`, and `README.md`.
- Installed fixture: complete `fixtures/registry-vite/src/App.tsx` and `src/index.css`.
- Mounted/static/browser evidence: `tests/ui/admin.test.tsx`, `board.test.tsx`, `public-surfaces.test.tsx`, `hydration.test.tsx`, `tests/static/ui-contracts.test.ts`, `tests/accessibility/contrast.test.ts`, `tests/accessibility/phase3.spec.ts`, and `tests/integration/phase3-gate.test.mjs`.
- Reports: `docs/accessibility/phase-3/README.md`, `axe.json`, `contrast.json`, `keyboard-focus.md`, and `status-messages.md`.
- All 18 PNGs: `admin-confirmations-1280.png`, `admin-detail-320.png`, `admin-empty-1280.png`, `admin-queue-320.png`, `admin-states-1280.png`, `board-1280.png`, `changelog-1280.png`, `dark-admin-1280.png`, `dark-public-1280.png`, `desktop-1280.png`, `detail-1280.png`, `notifications-1280.png`, `notifications-popover-1280.png`, `phone-320.png`, `reflow-320.png`, `roadmap-1280.png`, `tablet-768.png`, and `zoom-200.png`.
- Fresh focused verification: 4 Vitest files / 22 tests passed for mounted UI and hydration; 1 static file / 3 tests passed for UI contracts. Current versioned reports record 12/12 contrast checks and zero axe violations.
