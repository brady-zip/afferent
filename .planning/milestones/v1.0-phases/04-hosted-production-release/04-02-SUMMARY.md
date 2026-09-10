---
phase: 04-hosted-production-release
plan: "02"
subsystem: hosted-auth-boundary
tags: [convex-auth, component-instances, authorization, demo]
requires:
  - phase: 04-01
    provides: compiled package candidate and exact exports
provides:
  - two statically named showcase and sandbox component installations
  - canonical Convex Auth Password and HTTP ingress
  - immutable showcase read surface and server-derived sandbox authority resolvers
affects: [04-03-sandbox-lifecycle, 04-05-hosted-ui, 04-06-browser-evidence]
tech-stack:
  added: []
  patterns:
    - re-resolve current Convex Auth identity independently for actor, scope, and admin authority
    - expose showcase immutability by absence of browser-callable writes
key-files:
  created:
    - example/convex/convex.config.ts
    - example/convex/sandboxAuthority.ts
    - example/convex/showcase.ts
    - tests/demo/host-boundary.test.ts
  modified:
    - package.json
key-decisions:
  - "Install the same component exactly twice under explicit showcase and sandbox names."
  - "Treat every authenticated demo visitor as admin only inside the physical scope derived from that same freshly verified session."
requirements-completed: [DEMO-01, DEMO-03, DEMO-04, DEMO-05]
coverage:
  - id: D1
    description: "The hosted backend installs exactly two named Afferent instances behind canonical Convex Auth ingress."
    requirement: DEMO-04
    verification:
      - kind: integration
        ref: "npm run test:demo:boundary"
        status: pass
    human_judgment: false
  - id: D2
    description: "Showcase exports reads only and sandbox actor, admin, and scope derive from current server-verified identity."
    requirement: DEMO-05
    verification:
      - kind: integration
        ref: "tests/demo/host-boundary.test.ts"
        status: pass
    human_judgment: false
duration: 3 min
completed: 2026-07-24
status: complete
---

# Phase 4 Plan 02: Hosted Authentication Boundary Summary

**Two static Afferent instances now sit behind one Convex Auth ingress with immutable showcase reads and freshly derived sandbox authority.**

## Performance

- **Duration:** 3 min
- **Completed:** 2026-07-24
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Added official Convex Auth Password configuration and HTTP routes without moving provider code into the component.
- Installed `showcase` and `sandbox` as two distinct static component instances while preserving the normal fixed single-product client.
- Added executable anonymous/authenticated authority tests and a named build/typecheck boundary gate.

## Task Commits

1. Task 1 RED - `cc6af40`
2. Task 1 GREEN - `e2c313a`
3. Task 2 RED - `4541976`
4. Task 2 GREEN - `a27177e`
5. Task 3 gate - `b0244b4`
6. Remediation RED - `dbe7096`
7. Remediation GREEN - `75c5cf6`

## Decisions Made

- Scope resolution calls the injected server-only physical-scope resolver only after `getAuthUserId` succeeds.
- Admin authorization independently re-resolves the current user on every call and accepts no cached or browser flag.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a dedicated hosted TypeScript project**

- **Found during:** Task 3
- **Issue:** TypeScript 7 rejects command-line files when a root config exists, while the clean committed baseline must also remain compatible.
- **Fix:** Added `example/tsconfig.json` and made the named gate use its project configuration.
- **Committed in:** `b0244b4`

## Verification

- `npm run build` passed.
- `npm run test:demo:boundary` passed anonymous real Convex codegen/deployment compilation, hosted typecheck, and 6 authority/static tests.
- No identity, admin, scope, or generation browser validator exists.

## Remediation

The first implementation was type-only: generated host references were absent and
`showcase.ts` returned a plain method object rather than browser-callable Convex queries.
The reopened plan added the Convex Auth host schema, disposable anonymous codegen,
committed bindings for both named instances, and actual read-only query wrappers. The
RED gate now rejects missing generated references and non-callable wrappers.

## Known Stubs

None after remediation. Physical sandbox lifecycle resolution is the intentional Plan
04-03 dependency.

## Self-Check: PASSED

- All declared artifacts and seven task/remediation commits exist.
- The unrelated TypeScript 7 manifest/lock experiment remains unstaged.

---

_Phase: 04-hosted-production-release_
_Completed: 2026-07-24_
