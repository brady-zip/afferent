---
phase: 03-source-owned-product-interface
plan: "03"
subsystem: public-product-ui
tags: [react, radix, accessibility, responsive, registry, notifications]

requires:
  - phase: 03-02
    provides: Complete public feedback UI and canonical copied-source patterns
  - phase: 02.2-02
    provides: Presentation-ready discriminated notification navigation targets
provides:
  - Exact server-grouped public roadmap and chronological public changelog screens
  - Independent notification list plus optional Radix popover over headless-owned state
  - Stable comment notification fragments paired with matching discussion-row anchors
  - Deterministic roadmap, changelog, notification, core, and board registry artifacts and mirrors
affects: [03-04-admin-ui, 03-05-registry-completion, 03-06-release-evidence]

tech-stack:
  added: []
  patterns:
    - Public surfaces preserve server grouping and chronology without browser regrouping or sorting
    - Notification navigation switches only on the closed target discriminator
    - Comment fragments and discussion row IDs share one anchor encoder
    - Radix popover supplies dismissal and focus behavior while the list remains independently usable

key-files:
  created:
    - ui/afferent/roadmap/roadmap-screen.tsx
    - ui/afferent/changelog/changelog-screen.tsx
    - ui/afferent/notifications/notifications-list.tsx
    - ui/afferent/notifications/notifications-popover.tsx
    - tests/ui/public-surfaces.test.tsx
  modified:
    - ui/afferent/core/navigation.tsx
    - ui/afferent/board/discussion.tsx
    - ui/afferent/registry.ts
    - ui/afferent/afferent.css

key-decisions:
  - "Use the roadmap hook's planned, inProgress, and complete groups verbatim, each with independent pagination."
  - "Build notification hrefs only from the server-projected post-or-changelog target union."
  - "Use one afferent-comment anchor encoder for both notification fragments and discussion-row IDs, appending a fragment only when commentId exists."
  - "Keep notification paging, unread state, pending actions, errors, reset, and optimism in the headless hooks."

requirements-completed: [UI-04, UI-06, UI-07]
requirements-progressed: [QUAL-07, QUAL-08]

coverage:
  - id: D1
    description: Visitors can browse the exact three server-provided roadmap groups and chronological changelog entries through injected links.
    requirement: UI-04
    verification:
      - kind: integration
        ref: tests/ui/public-surfaces.test.tsx#public-roadmap-and-changelog
        status: pass
    human_judgment: false
  - id: D2
    description: Authenticated users can use the notification list or popover, page results, inspect unread state, mark rows read, and follow exact post, comment, or changelog targets.
    requirement: UI-04
    verification:
      - kind: automated_ui
        ref: tests/ui/public-surfaces.test.tsx#notifications
        status: pass
    human_judgment: false
  - id: D3
    description: Roadmap, changelog, and notification items are generated from canonical source into byte-equal repository examples and deterministic registry artifacts.
    requirement: UI-07
    verification:
      - kind: e2e
        ref: npm run test:phase3
        status: pass
    human_judgment: false
  - id: D4
    description: Public surfaces expose closed states, semantic regions, keyboard dismissal and focus restoration, live announcements, responsive columns, and coarse-pointer sizing.
    requirement: QUAL-07, QUAL-08
    verification:
      - kind: automated_ui
        ref: tests/ui/public-surfaces.test.tsx#closed-public-surface-states
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-21
status: complete
---

# Phase 03 Plan 03: Public Product Surfaces Summary

**Installable roadmap, changelog, and notification surfaces now preserve server truth, deep-link comments accurately, and ship from one deterministic copied-source catalog.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-07-21T21:17:00Z
- **Completed:** 2026-07-21T21:37:00Z
- **Tasks:** 3
- **Files modified:** 33

## Accomplishments

- Added the exact Planned, In Progress, and Complete roadmap composition with board filtering and independent group pagination, plus a chronological changelog feed/detail with stable linked-feedback routes.
- Added an independently usable notification list and optional Radix popover with unread counts, target labels, paging, mark-read pending/error/reset behavior, Escape dismissal, and focus restoration.
- Connected validated comment notification targets to matching `afferent-comment-*` discussion anchors without exposing internal IDs or inventing browser-side navigation truth.
- Registered and deterministically generated roadmap, changelog, and notification items together with the changed core/board artifacts and byte-identical repository mirrors.

## Task Commits

1. **Task 1 RED: Specify the public product surfaces** - `4f971eb` (test)
2. **Task 2 GREEN: Add roadmap and changelog surfaces** - `89a3508` (feat)
3. **Task 3 GREEN: Add notification surfaces and generated items** - `0000cf1` (feat)

**Plan scope corrections:** `4831e9f`, `5c234ca` (docs)

## Decisions Made

- Roadmap groups and changelog chronology are presentation-ready server truth; copied UI renders them in received order and keeps only the selected board as browser intent.
- Notification rows switch on `target.kind` and use only public post IDs, validated comment IDs, or changelog slugs projected by the trusted backend.
- `afferentCommentAnchorId` is the single producer/consumer convention for comment fragments and row IDs, preventing link and destination drift.
- The optional popover composes the same complete list instead of creating a second notification cache or mutation controller.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added the canonical registry catalog and generator-owned catalog outputs**

- **Found during:** Task 3 generation planning
- **Issue:** The plan listed feature outputs but omitted `ui/afferent/registry.ts`, the generator's only source catalog, plus catalog/manifest outputs that necessarily change.
- **Fix:** Confirmed the topology through live radio ASK `#72f378e96030d14e`, amended the plan, edited only canonical catalog source, and regenerated every output.
- **Verification:** `npm run ui:check` and `npm run test:registry` pass.
- **Committed in:** `4831e9f`, `0000cf1`

**2. [Rule 3 - Blocking] Added a real comment fragment destination**

- **Found during:** Task 3 notification target implementation
- **Issue:** A comment-specific accessible label and `commentId` would otherwise navigate only to the post because discussion rows had no matching HTML anchor.
- **Fix:** Confirmed the narrow correction through live radio ASK `#c90a7534e354c07c`, added one shared `afferent-comment-${commentId}` encoder, stamped discussion rows, and regenerated the affected core/board outputs.
- **Verification:** Mounted notification tests assert the exact fragment, source guards assert the matching row ID, and the complete Phase 3 gate passes.
- **Committed in:** `5c234ca`, `0000cf1`

**3. [Rule 1 - Bug] Kept deterministic metadata scanning focused on emitted metadata**

- **Found during:** Task 3 registry integration gate
- **Issue:** The existing no-timestamp invariant scanned full emitted source bytes and mistook a callback parameter named `timestamp` for generated metadata.
- **Fix:** Renamed the copied changelog callback parameter to the neutral `value` without changing behavior or the invariant.
- **Verification:** All 6 registry integration tests pass.
- **Committed in:** `0000cf1`

**Total deviations:** 3 auto-fixed (1 Rule 1, 2 Rule 3). **Impact:** All changes were required to make the planned source-generation and exact-navigation contracts true; no backend contract, package dependency, or authority surface widened.

## Threat Review

- Notification UI receives only the closed server-projected target union and never reads the former polymorphic `entityId` or performs direct lookups.
- Actor-sensitive unread, pending, mutation-error, and optimistic state remains generation-fenced in the headless hooks; the list creates no parallel React state.
- Comment labels and fragments are coupled to validated `commentId` presence, while missing anchors degrade to a normal post link.
- User-authored and server-projected labels render as React text; no raw HTML, router global, viewport read, or client authority field was introduced.

## Verification

- Focused mounted public-surface suite — 6/6 pass.
- Phase 3 aggregate gate — pass, including deterministic regeneration, drift check, packed install, clean-consumer typecheck/build, and 6/6 registry integration tests.
- Typecheck and lint — pass.
- Protected package/Codex experiment fingerprint — unchanged at `09b5f7179dc749a197ec6a59c5ba188313b8c84536e0c35b6487ae7fcb058381`.

## Issues Encountered

None remain.

## User Setup Required

None.

## Next Phase Readiness

- Plan 03-04 can build the admin interfaces over the verified Phase 02.3 read/projection contract and the same canonical copied-source patterns.
- Component-level public accessibility/responsive coverage is in place; aggregate real-browser contrast, zoom, and reflow evidence remains assigned to Plan 03-06.

## Self-Check: PASSED

- All declared canonical, generated, mirrored, and mounted-test artifacts exist.
- Commits `4f971eb`, `89a3508`, `0000cf1`, `4831e9f`, and `5c234ca` resolve.
- Structured coverage classifies all four deliverables with passing automated evidence.
