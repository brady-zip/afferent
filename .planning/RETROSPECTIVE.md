# Afferent Retrospective

## Milestone v1.0 — Initial product delivery

**Shipped:** 2026-09-10 as product v0.1.0.

**Scope:** Seven phases, 51 plans, 149 planned task elements.

### What Was Built

A provider-neutral Convex feedback component, complete typed headless workflow,
copy-owned public/admin UI, and a credential-free real Convex local example.
Public distribution is an immutable Apache-2.0 source tag with synchronized
registry/docs and checksum-bound local package evidence.

### What Worked

- Narrow host-owned authority contracts kept provider identity and administration outside the component.
- Packed external consumers exposed declaration, export and generated-import failures that workspace compilation missed.
- Real Convex two-user/lifecycle and installed-browser tests tested actual integration boundaries.
- Live peer review and public HTTP shadcn installation exposed defects that generated JSON inspection could not establish.
- One immutable candidate and explicit source/run/digest checks made publication evidence reproducible.

### What Was Inefficient

- Repeated consumer/demo preparation and broad gate reruns made late release fixes expensive.
- Planning metadata drift obscured already-completed work: generic Phase 2 requirement rows, a passed UAT lifecycle label, and stale plan/task counters all required reconciliation.
- A documentation gate depended on active planning paths, requiring archive-aware resolution at milestone close.

### Patterns Established

- Preserve tagged product identity independently from internal planning milestone labels.
- Archive related validation inputs together, select by the moved plan, tolerate the normal requirements-copy intermediate state, and reject missing selected requirements or changed semantics, and validate the actual archived checkout before publication.
- Keep explicit requirement-to-evidence rows; a generic all-other-requirements row cannot support a reproducible audit.
- Preserve private workspace history separately from the public release checkout.

### Key Lessons

Test both local and actual HTTP consumer paths. Keep generated component imports portable.
Use an isolated pinned npm installation in CI. Distinguish historical verification,
fresh execution, and human approval when writing evidence. Commit archives before
removing active copies and retain immutable links for public release review records.

### Cost Observations

Execution spanned resumed sessions and a human publication checkpoint; complete
session/token accounting is unavailable. No model percentages or invented elapsed
time totals are reported. The phase summaries preserve the timings actually recorded.

## Cross-Milestone Trends

Only the initial milestone has shipped. The next milestone has not been selected.
