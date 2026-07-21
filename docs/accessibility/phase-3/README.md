# Phase 3 accessibility and layout evidence

This directory records reproducible WCAG 2.2 AA-oriented evidence for the default Afferent copied-source UI. It is scoped evidence, not blanket WCAG certification.

The browser runner packs the repository package, installs that tarball into an OS-temporary Vite consumer, adds all five generated feature items plus core through the pinned local shadcn CLI, typechecks and builds the consumer, and serves its installed output. The evidence marker and anti-skip audit reject canonical-source substitutes.

## Toolchain

- Playwright 1.59.1
- Chromium 147.0.7727.15, Playwright revision 1217
- axe Playwright 4.11.0
- shadcn 4.11.0
- Viewports: 320 by 800, 768 by 1024, and 1280 by 800 CSS pixels
- Zoom: 200% Chromium CSS zoom at a 640 by 800 viewport, exercising the 320 CSS-pixel equivalent composition

Evidence excludes wall-clock time, temporary paths, ports, process identifiers, and random identifiers. Scenario IDs, exact dependency/browser versions, viewport/zoom inputs, expected outcomes, and observed results remain.

## Criteria and evidence

| WCAG 2.2 criterion                  | Evidence                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1.4.3 Contrast (Minimum)            | `contrast.json` computes default light/dark text ratios and compares the unrounded value to 4.5:1.                            |
| 1.4.4 Resize Text                   | `zoom-200.png` and RZ-01 preserve the complete admin workflow at 200% without action loss.                                    |
| 1.4.10 Reflow                       | `reflow-320.png` and RZ-01 assert document scroll width never exceeds client width.                                           |
| 1.4.11 Non-text Contrast            | `contrast.json` computes default border and focus-ring ratios against their surfaces and compares the unrounded value to 3:1. |
| 2.1.1 Keyboard                      | KF-01 through KF-03 complete representative public and administrative work using keyboard activation and native controls.     |
| 2.1.2 No Keyboard Trap              | KF-02 traverses modal focus, dismisses Dialog and Popover with Escape, and verifies logical restoration.                      |
| 2.4.3 Focus Order                   | `keyboard-focus.md` records DOM-order public and admin journeys.                                                              |
| 2.4.7 Focus Visible                 | KF-01 and KF-03 measure a visible two-pixel focus outline.                                                                    |
| 2.4.11 Focus Not Obscured (Minimum) | Focus rectangles are inside the viewport and hit-test to the active control rather than an overlay.                           |
| 2.5.7 Dragging Movements            | KF-03 uses labelled native status controls; no representative workflow requires dragging.                                     |
| 2.5.8 Target Size (Minimum)         | RZ-01 measures every visible interactive target at 24 by 24 CSS pixels minimum and at 44 by 44 for coarse pointers.           |
| 3.3.1 Error Identification          | Correction-required mutation errors use associated alert regions; passive read failures remain polite status regions.         |
| 3.3.2 Labels or Instructions        | Browser journeys resolve every tested input by its visible accessible label.                                                  |
| 4.1.3 Status Messages               | `status-messages.md` records result and successful-mutation announcements without focus theft.                                |

`axe.json` is a supplemental automated regression net for the stable public and admin states. Axe cannot certify keyboard completion, focus restoration, announcement quality, zoom, or reflow and is not presented as certification.

## Captures

- `phone-320.png` and `reflow-320.png`: labelled admin queue cards and the complete single-column workflow at 320 CSS pixels.
- `tablet-768.png`: the tablet queue/detail composition.
- `desktop-1280.png`: the desktop 35/65 queue/detail workspace.
- `zoom-200.png`: the complete admin workflow at 200% zoom.

The checkbox itself uses the WCAG AA 24-pixel minimum while its associated visible label supplies the larger coarse-pointer hit area. Text links use their rendered line box at fine-pointer sizes and become at least 44 pixels high under the coarse-pointer media query. No dragging exception is needed.

These reports cover Afferent's documented default light and dark tokens. Hosts that override theme variables or surrounding layout remain responsible for preserving contrast, visible focus, target spacing, reflow, and non-obscuration.

## Reproduce

Run `npm run test:phase3`. The named gate audits its own composition and includes double generation/drift, the clean packed registry consumer, mounted UI and hydration, static client boundaries, exact contrast, installed-consumer browser and axe scenarios, build/typecheck/lint, and the full Phase 2 regression.
