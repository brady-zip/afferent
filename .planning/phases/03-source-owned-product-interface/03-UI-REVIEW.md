# Phase 03 — UI Review

**Audited:** 2026-07-21
**Baseline:** `03-UI-SPEC.md`
**Screenshots:** Existing versioned installed-source captures inspected (`phone-320.png`, `tablet-768.png`, `desktop-1280.png`, `reflow-320.png`, `zoom-200.png`); no new capture because no dev server was running
**Scope note:** The evidence-fixture banner and surface navigation are test chrome, not canonical Afferent UI, and were excluded from product scoring.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Most public copy matches the dictionary, but admin tag, merge, loading, activity, and timestamp text diverge from the explicit copy contract. |
| 2. Visuals | 2/4 | The UI is legible and structurally clear, but selection, error, and destructive hierarchy are missing or too weak in the administrative focal workflow. |
| 3. Color | 3/4 | Default tokens have excellent measured contrast, but accent is used on a non-primary popover trigger while selected/error/destructive states lack their required semantic treatment. |
| 4. Typography | 3/4 | The four-size/two-weight system is otherwise consistent, but the unread count introduces a prohibited 12px fifth size. |
| 5. Spacing | 3/4 | The layouts largely follow the declared scale and reflow without page overflow, but 12px notification gaps and admin input padding violate the exact scale. |
| 6. Experience Design | 1/4 | Tag deletion, archive, publish, and unpublish bypass required confirmations; mobile renders queue and detail together instead of the specified one-at-a-time workflow. |

**Overall: 14/24**

**Release classification:** BLOCKER — do not ship the Phase 03 UI contract until consequential-action confirmations are implemented.

---

## Top 3 Priority Fixes

1. **Restore the consequential-action confirmation contract** — Accidental tag deletion, archive, publish, or unpublish occurs immediately and can surprise administrators — add the specified Radix dialogs, exact outcome-specific copy, destructive treatment, pending/error state, and focus restoration for each action.
2. **Make administrative state and hierarchy persistent** — Once focus leaves the queue, the selected record is visually indistinguishable; destructive and query-error states also look neutral — style the selected row with the reserved primary indicator plus text/shape, style `data-tone="error"`, and separate/destructively style irreversible controls.
3. **Implement the phone navigation contract and close token drift** — The 320px/200% captures show the queue, full detail editor, and changelog as one very long page — render queue and detail one at a time under 768px through host-controlled navigation, then replace the 12px spacing/type values with declared tokens.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

- **WARNING — Required tag labels are shortened.** `ui/afferent/admin/tag-manager.tsx:30` renders `Create tag` and lines 53-57 render `Delete tag`; the specification requires `Create feedback tag` and `Delete feedback tag`. These strings also bypass the typed copy dictionary.
- **WARNING — Merge confirmation omits the required consequence model.** `ui/afferent/admin/merge-dialog.tsx:40-43` only asks the administrator to type the duplicate title. It does not identify the canonical destination or explain that votes, comments, and history move and the operation cannot be undone, as required by the destructive-copy contract.
- **WARNING — Internal states leak into product copy.** `ui/afferent/admin/admin-screen.tsx:119`, `admin/tag-manager.tsx:64`, and `admin/changelog-editor.tsx:47,62` expose raw discriminants such as `loading`, `error`, or `draft` rather than domain-specific, sentence-cased copy.
- **WARNING — Activity and time are machine-shaped.** `ui/afferent/admin/admin-screen.tsx:127-129` prints underscored event types after a mechanical replacement, and `ui/afferent/notifications/notifications-list.tsx:201-210` displays the raw numeric `occurredAt` value. These are understandable to developers, not polished user-facing language.
- **Positive evidence.** Public empty, authentication, unsupported, not-found, merged, loading, pagination, vote, comment, notification, and changelog labels substantially match the central typed dictionary in `ui/afferent/core/copy.ts`.

### Pillar 2: Visuals (2/4)

- **WARNING — Current queue selection has no persistent visual treatment.** `ui/afferent/admin/feedback-queue.tsx:46-50` emits `data-selected`, but `ui/afferent/afferent.css` has no matching selected-state rule. The blue outline in the captures is keyboard focus only; after focus moves into the detail form, both queue cards look identical even though one owns the detail workspace.
- **WARNING — Destructive actions look ordinary.** Tag deletion (`admin/tag-manager.tsx:53-58`) and merge confirmation (`admin/merge-dialog.tsx:68-81`) use the same neutral button styling as ordinary controls (`afferent.css:752-760`). Archive is placed directly beside `Lock discussion` (`admin/moderation-form.tsx:102-123`). This contradicts the specified hierarchy in which dangerous actions are visually separated and destructive confirmations use the destructive treatment.
- **WARNING — Error tone is structurally declared but visually inert.** `ui/afferent/core/state-region.tsx:19-27` emits `data-tone="error"`, yet no CSS selector consumes it. Query errors therefore render as the same muted card as loading and empty states.
- **WARNING — The installed-source captures show weak administrative grouping.** At 320, 768, and 1280px, moderation, tags, activity, and publishing are separated mostly by headings and whitespace. The hierarchy is readable, but the selected record and its destructive boundary are not visually anchored. `needs_human_review: true` for final aesthetic quality.
- **Evidence limitation.** The committed responsive screenshots show only the administration surface. Public board, detail, roadmap, changelog, notifications, popover, dialogs, dark theme, and empty/error states have code and automated interaction evidence but no versioned visual capture. `needs_human_review: true` before claiming whole-product visual polish.

### Pillar 3: Color (3/4)

- **Positive evidence.** All product colors are centralized in semantic CSS variables. `docs/accessibility/phase-3/contrast.json` records 12/12 passing exact, unrounded light/dark checks: text exceeds 4.5:1 and border/focus treatments exceed 3:1. Links remain underlined and unread notifications combine text with a primary border.
- **WARNING — Accent is used outside the reserved set.** `ui/afferent/notifications/notifications-popover.tsx:21-33` applies the primary `.afferent-button` treatment to an ordinary popover trigger. The UI specification reserves primary for the screen-primary CTA, current selection, unread marker, and focus ring.
- **WARNING — Reserved semantic color is absent where required.** The current admin selection has no primary treatment, and merge/delete/archive controls have no destructive treatment. Error regions provide `data-tone="error"` but receive no destructive outline/title/icon styling.
- **Distribution assessment.** The captures remain predominantly white with neutral borders, so accent is not overused globally; the issue is semantic allocation rather than excessive volume.

### Pillar 4: Typography (3/4)

- **Positive evidence.** Copied source consistently uses the declared 14px metadata/label, 16px body/control, 20px section-heading, and 28px screen-title sizes with only weights 400 and 600. Headings remain visibly distinct and user-authored bodies are constrained to 72ch where composition permits.
- **WARNING — A fifth, prohibited font size is present.** `ui/afferent/afferent.css:617-627` sets the notification count to `font-size: 12px`, while the typography contract allows exactly 14, 16, 20, and 28px and prohibits body/metadata below 14px.
- **WARNING — Some hierarchy is conveyed by semibold alone.** Unread text and selected queue content do not gain an accompanying badge shape/selection styling once focus leaves, weakening the specification's rule that urgency and selection are not communicated by weight alone.

### Pillar 5: Spacing (3/4)

- **Positive evidence.** Most gaps, gutters, padding, section rhythms, and breakpoints use the declared 4/8/16/24/32/48/64 scale. Installed-source browser evidence confirms no page-level horizontal overflow at 320px or 200% zoom, with all measured interactive targets at least 24px and coarse-pointer targets at least 44px.
- **WARNING — Notification card rhythm uses a forbidden token.** `ui/afferent/afferent.css:563-570` sets `gap: 12px` despite the explicit prohibition on 12px spacing.
- **WARNING — Admin fields introduce the same forbidden token.** `ui/afferent/afferent.css:802-813` uses `padding: 8px 12px`; this should use the declared compact 8px or default 16px inline token.
- **Informational.** The popover shadow's 12px Y offset (`afferent.css:603`) is elevation geometry rather than layout spacing and was not deducted separately.

### Pillar 6: Experience Design (1/4)

- **BLOCKER — Consequential operations execute without confirmation.** `ui/afferent/admin/tag-manager.tsx:53-58` immediately calls `deleteTag`; `admin/moderation-form.tsx:113-122` immediately archives; `admin/changelog-editor.tsx:83-94` immediately publishes or unpublishes. The UI-SPEC explicitly requires confirmation dialogs and outcome-specific escape actions for all four workflows. The merge dialog exists, but its action is not visually destructive and it omits the specified consequences.
- **WARNING — Mobile admin violates the interaction model.** `ui/afferent/admin/admin-screen.tsx:63-79` always renders queue, detail, and changelog together. CSS only changes to a 35/65 split at 768px (`afferent.css:838-845`), so the 320px and 200% captures become a very long, simultaneous workflow instead of queue/detail rendering one at a time through host-controlled navigation.
- **WARNING — Closed admin states are incomplete.** `admin/admin-screen.tsx:119`, `admin/tag-manager.tsx:32-65`, and `admin/changelog-editor.tsx:40-48` collapse exported loading/error/empty variants into raw status text and do not expose the typed retry/correction paths promised by the experience contract.
- **WARNING — Selection semantics are incomplete.** Queue rows use a local selected ID but provide neither `aria-current`/`aria-selected` nor a persistent visual marker, so assistive technology and sighted users must infer which record controls the detail panel.
- **Positive evidence.** Focused verification passed 17/17 mounted UI/hydration tests and 12/12 exact contrast tests during this review. Existing installed-source Playwright evidence also records keyboard completion, dialog/popover Escape behavior and focus restoration, visible focus, no traps, target sizes, announcements, reflow, zoom, and zero axe violations. Those gates are valuable, but they do not exercise the missing destructive confirmations or enforce the one-at-a-time phone workflow.

---

## Registry Audit

The repository intentionally has no root `components.json`, and the UI-SPEC permits only shadcn official primitives plus the project-owned generated Afferent registry. The clean fixture's `components.json` points to no third-party registry. All six generated items declare only the exact five approved pinned runtime packages and local `./afferent-ui-core.json` sibling dependencies. **Registry audit: 0 third-party blocks required checking; no flags.**

---

## Files Audited

- `.codex/agents/gsd-ui-auditor.md`
- `.codex/skills/gsd-ui-review/SKILL.md` and its UI-review/brand references
- `AGENTS.md`
- `.planning/phases/03-source-owned-product-interface/03-CONTEXT.md`
- `.planning/phases/03-source-owned-product-interface/03-UI-SPEC.md`
- `.planning/phases/03-source-owned-product-interface/03-01-PLAN.md` through `03-06-PLAN.md`
- `.planning/phases/03-source-owned-product-interface/03-01-SUMMARY.md` through `03-06-SUMMARY.md`
- All canonical source under `ui/afferent/**`
- `fixtures/registry-vite/components.json`, `package.json`, and `src/**`
- `registry/registry.json` dependency and registry-dependency metadata
- `tests/accessibility/phase3.spec.ts`, `tests/accessibility/contrast.test.ts`
- `tests/integration/registry-ui.test.mjs`, `tests/static/ui-contracts.test.ts`
- `tests/ui/admin.test.tsx`, `tests/ui/board.test.tsx`, `tests/ui/public-surfaces.test.tsx`, `tests/ui/hydration.test.tsx`
- All committed evidence under `docs/accessibility/phase-3/**`, including the five installed-source screenshots
