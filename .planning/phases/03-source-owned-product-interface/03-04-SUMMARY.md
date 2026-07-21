---
phase: 03-source-owned-product-interface
plan: "04"
subsystem: admin-ui
tags: [react, radix, accessibility, moderation, changelog, registry]
requires:
  - phase: 02.3-02
    provides: Verified admin queue, changelog, moderation-state, and activity projections
  - phase: 03-03
    provides: Canonical generated copied-source pipeline and public product surfaces
provides:
  - Capability-gated feedback administration queue and detail workspace
  - Moderation, board/status, lock/archive, tag, activity, merge, and changelog editorial controls
  - Deterministic afferent-admin registry item and byte-equal examples
  - Clean-consumer install, typecheck, and build proof for public and admin items
affects: [03-05-registry-completion, 03-06-release-evidence]
tech-stack:
  added: []
  patterns:
    - Admin capability gates presentation but trusted host mutations remain authoritative
    - Local state is limited to queue selection and form intent
    - Typed duplicate-title confirmation gates irreversible merge
    - Phone cards and tablet 35/65 workspace share one semantic DOM order
key-files:
  created:
    - ui/afferent/admin/admin-screen.tsx
    - ui/afferent/admin/feedback-queue.tsx
    - ui/afferent/admin/moderation-form.tsx
    - ui/afferent/admin/tag-manager.tsx
    - ui/afferent/admin/merge-dialog.tsx
    - ui/afferent/admin/changelog-editor.tsx
    - tests/ui/admin.test.tsx
  modified:
    - ui/afferent/registry.ts
    - tests/integration/registry-ui.test.mjs
key-decisions:
  - "Render every admin capability state explicitly and accept no browser authority props."
  - "Use labelled native selects for board and roadmap status changes; no drag interaction."
  - "Install the generated admin item in the clean packed-package consumer before accepting distribution."
requirements-completed: [UI-05, UI-06, UI-07]
requirements-progressed: [QUAL-07, QUAL-08]
coverage:
  - id: D1
    description: Authorized administrators can select feedback and use moderation, status, board, lock/archive, tags, activity, and merge controls.
    requirement: UI-05
    verification:
      - kind: automated_ui
        ref: tests/ui/admin.test.tsx#admin-product-interface
        status: pass
    human_judgment: false
  - id: D2
    description: Administrators can create and publish changelog drafts through the headless editorial contract.
    requirement: UI-05
    verification:
      - kind: integration
        ref: tests/ui/admin.test.tsx#capability-gates-complete-workspace
        status: pass
    human_judgment: false
  - id: D3
    description: The generated admin item installs with the packed package and typechecks and builds in a clean consumer.
    requirement: UI-07
    verification:
      - kind: e2e
        ref: tests/integration/registry-ui.test.mjs#packed-local-public-and-admin-items
        status: pass
    human_judgment: false
duration: 8min
completed: 2026-07-21
status: complete
---

# Phase 03 Plan 04: Administrative Product Interface Summary

**The canonical copied-source admin item now covers feedback triage, moderation, tags, merge, activity, and changelog publishing over server-owned headless truth.**

## Performance

- **Duration:** 8 min
- **Tasks:** 3
- **Files modified:** 25

## Accomplishments

- Added exhaustive admin capability gating and a responsive queue/detail workspace with labelled phone cards and a tablet/desktop 35/65 composition.
- Added edit, move, status, discussion lock, archive/restore, tag assignment/deletion, activity, exact-title merge, and manual changelog controls over existing headless hooks.
- Generated the admin registry item and examples, then extended the clean consumer to install both public and admin items before typecheck/build.

## Task Commits

1. **Task 1 RED: Specify the admin product journey** - `88e4144`
2. **Task 2 GREEN: Add the moderation workspace** - `efb5e74`
3. **Task 3 GREEN: Add merge, changelog, and distribution** - `75f2d86`

**Plan scope corrections:** `2b02e41`, `3e63c5a`

## Deviations from Plan

- Added the canonical registry catalog and generated catalog/manifest outputs omitted from the plan's original file list.
- Extended the existing clean-consumer registry test because schema generation alone did not prove the required installed admin build.
- The installed-consumer gate exposed and corrected a branded `PostId` selection type in the merge dialog.

All deviations were narrow Rule 3 execution-proof corrections; no backend contract, package dependency, or browser authority surface changed.

## Verification

- Mounted admin suite: 3/3 pass.
- Phase 3 aggregate gate: pass, including deterministic regeneration and 6/6 registry tests.
- Clean consumer: packed package plus public/admin registry items typecheck and build.
- Typecheck and lint: pass.
- Protected unrelated fingerprint remains `09b5f7179dc749a197ec6a59c5ba188313b8c84536e0c35b6487ae7fcb058381`.

## Next Phase Readiness

- Plan 03-05 can close the all-item distribution contract with the admin item now present and install-proven.
- Final browser accessibility, zoom, and reflow evidence remains assigned to Plan 03-06.

## Self-Check: PASSED
