# Phase 4 local-demo accessibility evidence

This directory indexes WCAG 2.2 AA-oriented regression evidence for the
registry-installed Afferent demo running against a real anonymous local Convex
backend. It is scoped engineering evidence, not a claim of WCAG certification.

## Gate

`npm run test:e2e:phase4` runs the required desktop, tablet, and mobile
projects. Each project writes normalized JSON evidence beside its browser
artifacts and may emit its completion marker only after every assertion passes.
The aggregate rejects missing projects, wrong artifact digests, wrong backend
targets, filtered suites, skips, and fixmes.

The normalized records retain the packed artifact digest, source commit,
backend kind, browser and tool versions, viewport, tested state identifiers,
and axe findings. They exclude timestamps, ports, local paths, process IDs,
account addresses, and generated backend identifiers.

## Scenarios

| ID | Executable proof |
| --- | --- |
| AX-01 | Signed-out showcase landmarks, environment text, title, reflow, and axe |
| AX-02 | Keyboard-routed Convex Auth gate, labelled credentials, title, reflow, and axe |
| AX-03 | Authenticated seeded sandbox, responsive shell, reduced motion, and axe |
| AX-04 | Keyboard feedback creation, voting, commenting, administration, status change, changelog publication, and axe |
| AX-05 | Reset dialog containment, Escape/confirmation, and trigger focus restoration |
| AX-06 | Server-enforced quota/rate failure remains labelled, actionable, and axe-clean |
| RZ-01 | 200% browser-zoom equivalent (640 physical pixels to 320 CSS pixels) has no page-level horizontal overflow |

Desktop executes the complete keyboard and lifecycle journey. Tablet and mobile
repeat the signed-out, authentication, ready, reset-dialog, responsive, and axe
contracts with their actual device viewports. Every axe finding is
release-blocking; there are no unreviewed lower-severity dispositions.

## Toolchain

- Playwright 1.59.1
- axe Playwright 4.11.0
- Chromium supplied by the pinned Playwright installation
- `prefers-reduced-motion: reduce` in every project

Raw traces and normalized per-run JSON remain ignored build artifacts because
they contain machine-local execution details. This checked-in index defines the
stable scenarios and disposition policy used to interpret those records.
