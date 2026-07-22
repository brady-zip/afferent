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

| WCAG 2.2 criterion                  | Evidence                                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1.4.3 Contrast (Minimum)            | `contrast.json` computes default light/dark text ratios and compares the unrounded value to 4.5:1.                               |
| 1.4.4 Resize Text                   | `zoom-200.png` and RZ-01 preserve the complete admin workflow at 200% without action loss.                                       |
| 1.4.10 Reflow                       | `reflow-320.png` and RZ-01 assert document scroll width never exceeds client width.                                              |
| 1.4.11 Non-text Contrast            | `contrast.json` computes default border and focus-ring ratios against their surfaces and compares the unrounded value to 3:1.    |
| 2.1.1 Keyboard                      | KF-01 through KF-05 complete public, administrative, confirmation, and phone-pane work using keyboard activation.                |
| 2.1.2 No Keyboard Trap              | KF-02 and KF-04 traverse modal focus, dismiss every Dialog and Popover with Escape, and verify logical restoration.              |
| 2.4.3 Focus Order                   | `keyboard-focus.md` records DOM-order public and admin journeys.                                                                 |
| 2.4.7 Focus Visible                 | KF-01 and KF-03 measure a visible two-pixel focus outline.                                                                       |
| 2.4.11 Focus Not Obscured (Minimum) | Focus rectangles are inside the viewport and hit-test to the active control rather than an overlay.                              |
| 2.5.7 Dragging Movements            | KF-03 uses labelled native status controls; no representative workflow requires dragging.                                        |
| 2.5.8 Target Size (Minimum)         | RZ-01 measures every visible interactive target at 24 by 24 CSS pixels minimum and at 44 by 44 for coarse pointers.              |
| 3.3.1 Error Identification          | ST-03 through ST-05 distinguish typed mutation alerts from passive read failures and prove correction, retry, and pending paths. |
| 3.3.2 Labels or Instructions        | Browser journeys resolve every tested input by its visible accessible label.                                                     |
| 4.1.3 Status Messages               | `status-messages.md` records result and successful-mutation announcements without focus theft.                                   |

`axe.json` is a supplemental automated regression net for the stable public and admin states. Axe cannot certify keyboard completion, focus restoration, announcement quality, zoom, or reflow and is not presented as certification. VIS-01 also verifies the portaled dialog's 16px typography, 44px controls, 8/16 padding, border, radius, focus, and action gap under a hostile host reset. VIS-02 adds programmatic 1280 non-overlap/overflow checks, measurable admin section borders and spacing, and a real installed activity error-to-retry-to-ready transition before producing the named whole-product capture matrix.

## Captures

Public light-theme surfaces:

- `board-1280.png`: browse, filter, search, create, and feedback result hierarchy.
- `detail-1280.png`: selected feedback, voting, subscription, editing, withdrawal, discussion, and activity.
- `public-recovery-1280.png`: installed public Activity query error with its outcome-specific recovery control; the browser then retries the same watch and asserts the ready domain sentence.
- `roadmap-1280.png`: planned, in-progress, and complete status groups.
- `changelog-1280.png`: published entry, valid machine time, and linked feedback.
- `notifications-1280.png`: read/unread list, real target links, formatted time, and mutation action.
- `notifications-popover-1280.png`: open popover with contained visible focus.

Administrative state and consequence surfaces:

- `admin-queue-320.png`: the phone queue pane before selection.
- `admin-detail-320.png`: the phone detail pane after host-controlled navigation.
- `admin-confirmations-1280.png`: destructive merge consequence, typed confirmation, escape action, and contained focus.
- `admin-states-1280.png`: persistent selected row plus typed activity-query error and recovery action.
- `admin-empty-1280.png`: empty queue, no stale selection, and independent changelog editor.

Theme and responsive surfaces:

- `dark-public-1280.png` and `dark-admin-1280.png`: representative public and administrative compositions using the default dark tokens.
- `phone-320.png` and `reflow-320.png`: the complete controlled detail pane at 320 CSS pixels with no queue duplication.
- `tablet-768.png`: the tablet queue/detail composition.
- `desktop-1280.png`: the desktop 35/65 queue/detail workspace.
- `zoom-200.png`: the complete admin workflow at 200% zoom.

The checkbox itself uses the WCAG AA 24-pixel minimum while its associated visible label supplies the larger coarse-pointer hit area. Text links use their rendered line box at fine-pointer sizes and become at least 44 pixels high under the coarse-pointer media query. No dragging exception is needed.

These reports cover Afferent's documented default light and dark tokens. Hosts that override theme variables or surrounding layout remain responsible for preserving contrast, visible focus, target spacing, reflow, and non-obscuration.

## Automated proof and human review

The automated oracle proves packed-package installation, generated local shadcn source, mounted hooks, all five consequential dialogs, portal ownership despite hostile host font/button resets, closed public/admin states, query-owned public retry, host-owned phone navigation, exact computed styles, 1280 content/metric non-intersection, measurable admin section hierarchy, keyboard/focus behavior, status and alert semantics, non-empty captures, no page-level horizontal overflow, minimum target size, exact contrast, zero supplemental axe violations, and deterministic evidence bytes. It does not replace human judgment of overall aesthetic polish, density, rhythm, or product desirability. The complete matrix is intentionally versioned so that final aesthetic review can inspect those qualities without weakening the executable release criteria.

Evidence determinism is measured by running the installed-source browser suite twice and comparing a sorted SHA-256 manifest of every file in this directory. Fixtures use fixed `Date.UTC` values, capture waits settle fonts and focus paint, and reports exclude machine-local paths, ports, process identifiers, wall-clock time, and random values.

## Reproduce

Run `npm run test:phase3`. The named gate audits its own composition and includes double generation/drift, the clean packed registry consumer, mounted UI and hydration, static client boundaries, exact contrast, installed-consumer browser and axe scenarios, build/typecheck/lint, non-empty evidence and scenario anti-skip checks, and the full Phase 2 regression.
