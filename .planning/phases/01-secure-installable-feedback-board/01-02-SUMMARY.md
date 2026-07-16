---
phase: 01-secure-installable-feedback-board
plan: "02"
subsystem: component-package
tags: [convex, vite, npm-pack, react, authority-boundary, integration-test]

requires:
  - phase: 01-secure-installable-feedback-board
    plan: "01"
    provides: Approved dependency matrix and red packed-consumer contract
provides:
  - Installable strict-ESM Convex component with a fixed-scope board/post slice
  - Trusted host client split into read, participation, and admin capabilities
  - Tarball-only Vite/Convex fixture proving codegen, typecheck, build, and interaction
affects: [01-03, 01-04, 01-05, package-gate, auth-fixtures]

tech-stack:
  added: [convex, react, vite, vitest, convex-test, publint, attw]
  patterns:
    - Every component table and index is scope-complete while scope remains private to the host client
    - Browser functions accept intent only and derive actor/admin authority on the server
    - Published artifacts are verified from an absolute tarball inside a fresh external consumer

key-files:
  created:
    - src/component/convex.config.ts
    - src/component/schema.ts
    - src/component/feedback.ts
    - src/client/index.ts
    - scripts/test-packed-consumer.mjs
    - fixtures/packed-vite-convex/src/App.tsx
    - tests/component/walking-skeleton.test.ts
  modified:
    - package.json
    - package-lock.json
    - tests/integration/walking-skeleton.test.mjs

key-decisions:
  - "Generate the committed ComponentApi through an anonymous OS-temporary Convex deployment because the current CLI cannot codegen an unconfigured component directory directly."
  - "Ship a declaration-only component tsconfig beside the built component so consumer --typecheck-components checks the published declarations."
  - "Add exact @types/react 19.2.17 and @types/react-dom 19.2.3 pins only to the fixture after live peer review; they are never package runtime dependencies."
  - "Canonicalize OS temporary roots before enforcing external-consumer containment because macOS aliases /var to /private/var."

patterns-established:
  - "Fixed-scope host boundary: createAfferentClient injects scope, resolves actors only for participation, and independently authorizes every admin call."
  - "Versioned DTO boundary: component documents are mapped to validated contractVersion 1 DTOs with opaque string IDs."
  - "Artifact gate: codegen, component typecheck, fixture tests, strict typecheck, Vite build, publint, and ATTW all run from the packed artifact."

requirements-completed:
  - ACCS-01
  - ACCS-02
  - ACCS-03
  - ACCS-06
  - FDBK-01
  - FDBK-02
  - FDBK-08
  - COMP-02
  - COMP-03
  - COMP-07
  - QUAL-03
  - QUAL-10

coverage:
  - id: D1
    description: "The component package installs from a tarball and its registered component completes codegen, component typechecking, strict typecheck, and Vite build in an external consumer."
    requirement: COMP-02
    verification:
      - kind: integration
        ref: "node --test tests/integration/walking-skeleton.test.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "A trusted host wrapper configures a board, derives an actor server-side, creates a post, and reads a validated contractVersion 1 DTO."
    requirement: FDBK-01
    verification:
      - kind: unit
        ref: "npm run test:component"
        status: pass
    human_judgment: false
  - id: D3
    description: "The exported React form submit handler invokes browser-safe generated references and renders the persisted post returned by the public query."
    requirement: FDBK-02
    verification:
      - kind: integration
        ref: "node --test tests/integration/walking-skeleton.test.mjs"
        status: pass
    human_judgment: false
  - id: D4
    description: "Browser validators reject authority-shaped input while fixed scope, verified actors, and admin authorization remain server-owned."
    requirement: ACCS-03
    verification:
      - kind: unit
        ref: "npm run test:component"
        status: pass
      - kind: other
        ref: "fixture authority-input acceptance check"
        status: pass
    human_judgment: false
  - id: D5
    description: "The packed package exposes Apache-2.0 licensing, declarations, component config, generated ComponentApi, root client, and test registration without repository-relative resolution."
    requirement: QUAL-03
    verification:
      - kind: integration
        ref: "node --test tests/integration/walking-skeleton.test.mjs"
        status: pass
    human_judgment: false

duration: 148 min
completed: 2026-07-16
status: complete
---

# Phase 1 Plan 02: Packed Walking Skeleton Summary

**A packed Afferent component now carries one secure board/post flow from a Vite form through server-owned authority into the isolated component and back as a versioned DTO.**

## Performance

- **Duration:** 148 min
- **Started:** 2026-07-16T00:56:34Z
- **Completed:** 2026-07-16T03:24:41Z
- **Tasks:** 2
- **Files modified:** 30

## Accomplishments

- Built the strict-ESM Convex component package with scope-complete installation, board, actor, and post storage; bounded scope-first reads; narrow intents; explicit validators; and Apache-2.0 packaging.
- Added a fixed-scope host factory whose read, participation, and admin capabilities keep identity, scope, and authorization out of browser inputs and component DTOs.
- Turned the deliberate red contract into a green external-consumer gate that performs real component registration, codegen, typechecking, mutation/query interaction, React rendering, production build, package linting, and export-resolution checks from the tarball alone.

## Task Commits

Each task followed a red/green sequence and was committed atomically:

1. **Task 1 RED: Add the component skeleton contract** - `02715cb`
2. **Task 1 GREEN: Implement the fixed-scope component skeleton** - `977b34a`
3. **Task 2 RED: Add the packed fixture interaction** - `c5dfef1`
4. **Task 2 GREEN: Prove the packed consumer interaction** - `237ca6f`

## Files Created/Modified

- `src/component/` - Installable definition, scope-complete schema, validators, narrow feedback intents, generated component API, and published component typecheck config.
- `src/client/` - Versioned contracts and fixed-scope host client with separate read, participation, and admin capabilities.
- `src/test.ts` and `tests/component/walking-skeleton.test.ts` - Component registration plus authority, DTO, and board/post contract tests.
- `fixtures/packed-vite-convex/` - Complete external Vite/Convex consumer with trusted host wrappers and an accessible feedback form.
- `scripts/codegen-component.mjs` - Reproducible component binding generation through a disposable anonymous local deployment.
- `scripts/test-packed-consumer.mjs` - Fresh tarball install and artifact/codegen/test/typecheck/build/package-quality gate.
- `tests/integration/walking-skeleton.test.mjs` - Green packed-consumer acceptance contract with canonical temporary-root containment.
- `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`, and `LICENSE` - Exact dependencies, exports, scripts, declaration build, ignored generated state, and Apache-2.0 metadata.

## Decisions Made

- Used the current Convex CLI's anonymous local deployment mode to generate component bindings reproducibly from an OS temporary host, then copied only generated API sources into the package.
- Kept the package's runtime peer surface limited to Convex and React. After consulting the live Claude peer through radio, added exact React declaration packages only to the fixture because strict TSX compilation needs them and the approved runtime matrix did not include them.
- Published a component-local declaration-only `tsconfig.json` so `convex codegen --typecheck-components` validates installed declarations without typechecking emitted JavaScript.
- Selected ATTW's ESM-only profile to match the package's declared strict-ESM contract.

## Deviations from Plan

### Auto-fixed Issues

**1. Current Convex codegen requires deployment configuration**
- **Found during:** Task 1
- **Issue:** The planned component-directory codegen path fails before generation when no deployment is configured.
- **Fix:** Generate through a disposable anonymous local Convex host and copy the resulting bindings into source.
- **Files:** `scripts/codegen-component.mjs`, `package.json`
- **Verification:** `npm run codegen:component && npm run typecheck`

**2. Incremental TypeScript state could leave `dist` absent**
- **Found during:** Task 2
- **Issue:** A stale composite build-info file allowed TypeScript to report success after `dist` had been removed.
- **Fix:** Use `src` as the declaration root and clean both `dist` and build-info before every package build.
- **Files:** `package.json`, `tsconfig.json`
- **Verification:** `npm run build` followed by tarball content inspection

**3. Installed component typechecking needs package-local compiler configuration**
- **Found during:** Task 2
- **Issue:** The current CLI attempted to typecheck built component JavaScript when the installed artifact lacked a component tsconfig.
- **Fix:** Publish a declaration-only component tsconfig beside the generated output.
- **Files:** `src/component/tsconfig.json`, `package.json`
- **Verification:** External `convex codegen --typecheck-components`

**4. Strict fixture TSX required declaration-only dependencies**
- **Found during:** Task 2
- **Issue:** The approved matrix omitted React declaration packages required by strict fixture compilation.
- **Fix:** After a radio review, pinned `@types/react@19.2.17` and `@types/react-dom@19.2.3` as fixture-only dev dependencies.
- **Files:** `fixtures/packed-vite-convex/package.json`, `package-lock.json`
- **Verification:** Fixture strict typecheck and Vite build

**5. macOS temporary roots have two equivalent spellings**
- **Found during:** Task 2
- **Issue:** Node created `/var/...` paths whose filesystem realpath is `/private/var/...`, producing a false containment failure.
- **Fix:** Canonicalize both roots with `realpath` before asserting artifact containment.
- **Files:** `scripts/test-packed-consumer.mjs`, `tests/integration/walking-skeleton.test.mjs`
- **Verification:** `node --test tests/integration/walking-skeleton.test.mjs`

## Issues Encountered

The first artifact runs exposed host ID typing, declaration build, installed-component typechecking, fixture ambient types, and macOS path-canonicalization issues. Each was fixed at the smallest owning boundary and the complete artifact gate was rerun after the final change.

## User Setup Required

None - the package and fixture use a disposable anonymous local Convex deployment and require no external account or credentials.

## Next Phase Readiness

Plan 01-03 can split the temporary colocated feedback intents into the full domain without changing the established authority, fixed-scope, DTO, or packaging contracts. The packed-artifact gate is now available as the regression boundary for every later slice.

## Self-Check: PASSED

- All 30 planned and supporting artifacts exist; no repository temp consumer, generated deployment state, or source-relative alias remains.
- Commits `02715cb`, `977b34a`, `c5dfef1`, and `237ca6f` exist.
- `npm run codegen:component`, `npm run test:component`, `npm run typecheck`, and `npm run build` pass.
- `node --test tests/integration/walking-skeleton.test.mjs` passes the packed install, component codegen/typecheck, fixture interaction, strict typecheck, Vite build, publint, ATTW, export, license, declaration, and external-resolution checks.
- Stub scan found only intentional empty process buffers/arrays and form initialization; no blocking placeholder remains.

---
*Phase: 01-secure-installable-feedback-board*
*Completed: 2026-07-16*
