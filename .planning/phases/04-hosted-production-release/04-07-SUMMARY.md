---
phase: 04-hosted-production-release
plan: "07"
subsystem: adopter-documentation
tags:
  - vitepress
  - convex
  - authentication
  - shadcn
  - release-gate
requires:
  - phase: 04-06
    provides: Credential-free local demo and full real-Convex browser evidence
  - phase: 03-copy-owned-ui
    provides: Headless React bindings and source-owned registry UI
provides:
  - Versioned local-first adopter documentation with a VitePress navigation spine
  - Provider-specific secure host-wrapper guides for Convex Auth, Clerk, and Better Auth
  - Executable documentation validation against the exact packed npm artifact
  - A documentation gate integrated into the aggregate Phase 4 release verifier
affects:
  - 04-08-release-candidate
  - 04-09-production-release
tech-stack:
  added:
    - vitepress@1.6.4
  patterns:
    - Every documentation code fence declares an executable or intentionally non-executable validation mode
    - Provider snippets compile in clean fixtures installed from one exact packed tarball
    - Release-dependent values remain limited to four explicit machine-verifiable tokens
key-files:
  created:
    - README.md
    - docs/.vitepress/config.ts
    - docs/index.md
    - docs/guide/local-demo.md
    - docs/guide/install.md
    - docs/guide/mount.md
    - docs/auth/convex-auth.md
    - docs/auth/clerk.md
    - docs/auth/better-auth.md
    - docs/ui/headless.md
    - docs/ui/registry.md
    - docs/ui/customization.md
    - docs/operations/testing.md
    - docs/operations/deployment.md
    - docs/operations/upgrades.md
    - scripts/test-docs.mjs
    - tests/integration/docs.test.mjs
  modified:
    - package.json
    - package-lock.json
key-decisions:
  - Pin the official stable VitePress 1.6.4 release and keep the documentation theme-neutral.
  - Require explicit validation metadata on every code fence and compile provider examples from the exact packed artifact.
  - Permit only the four named AFFERENT_RELEASE tokens until Plans 04-08 and 04-09 resolve publication facts.
requirements-completed:
  - COMP-01
  - QUAL-09
coverage:
  dimensions:
    - name: Local-first adopter entry path
      requirement: QUAL-09
      evidence: README, VitePress guide, integration contract tests, and successful docs build
      status: complete
      human_verification: false
    - name: Secure provider and UI integration guidance
      requirement: QUAL-09
      evidence: Three provider guides, headless and registry guides, operations guides, and compiling provider fixtures
      status: complete
      human_verification: false
    - name: Packed-artifact documentation release gate
      requirement: COMP-01
      evidence: npm run verify:docs and the full clean npm run verify:phase4 pipeline
      status: complete
      human_verification: false
duration: 53 min
completed: 2026-07-30
status: complete
---

# Phase 4 Plan 07: Executable Adopter Documentation Summary

Local-first VitePress adopter documentation now compiles its security-sensitive provider examples against the exact packed Afferent tarball and participates in the full Phase 4 release gate.

## Performance

- **Duration:** 53 min
- **Started:** 2026-07-30T20:03:56Z
- **Completed:** 2026-07-30T20:56:26Z
- **Tasks:** 3
- **Task commits:** 6
- **Files changed:** 19

## Accomplishments

- Added a root README and navigable VitePress site that lead adopters through the credential-free local demo, packed-tarball installation, component mounting, and first feedback workflow.
- Documented secure host-owned identity normalization for Convex Auth, Clerk, and Better Auth without allowing provider records or browser-supplied authority facts into the component boundary.
- Added headless, registry, customization, testing, deployment, and upgrade guidance tied to the shipped package and copy-owned UI model.
- Added a deterministic documentation verifier that builds the site, packs once, compiles extracted provider snippets in clean fixtures, checks registry drift and links, and rejects undocumented release or remote-hosting claims.
- Prefixed the aggregate Phase 4 verifier with the new documentation gate and re-ran the entire release pipeline from a clean checkout at the final task commit.

## Task Commits

Each task followed a RED/GREEN TDD cycle:

1. **Task 1: Establish the README and local-first VitePress entry path**
   - `4ffdd240` — `test(04-07): add failing adopter documentation contract`
   - `209e0f0e` — `feat(04-07): publish local-first documentation entry path`
2. **Task 2: Document provider wrappers, UI consumption, and operations**
   - `eb081d8c` — `test(04-07): add failing integration documentation contract`
   - `2ae18001` — `feat(04-07): document secure integration and operations paths`
3. **Task 3: Make documentation correctness part of the release gate**
   - `190573ce` — `test(04-07): add failing documentation drift gate`
   - `933a4d79` — `feat(04-07): enforce executable documentation release gate`

## Files Created/Modified

- `README.md` — concise public entry point and local-first quick start.
- `docs/.vitepress/config.ts` — versioned VitePress navigation for guides, auth, UI, and operations.
- `docs/guide/*.md` — local demo, installation, and component mounting workflows.
- `docs/auth/*.md` — secure provider-specific host-wrapper patterns.
- `docs/ui/*.md` — headless integration, registry installation, and copy-owned customization.
- `docs/operations/*.md` — testing, deployment, and upgrade expectations.
- `scripts/test-docs.mjs` — executable documentation and release-drift verifier.
- `tests/integration/docs.test.mjs` — TDD contract coverage for the documentation surface and gate.
- `package.json` — pinned docs dependency and documentation verification scripts.
- `package-lock.json` — reproducible dependency graph for the pinned docs toolchain.

## Decisions Made

- Pinned VitePress 1.6.4 rather than floating the documentation generator, preserving deterministic local and CI builds.
- Required every code fence to identify how it is validated; provider examples are extracted and typechecked rather than treated as prose.
- Kept adopter commands local-first. The verifier permits account-owned deployment syntax as documentation but rejects remote execution, hosted-demo claims, and cloud identifiers before their release plans supply evidence.
- Reserved exactly four `AFFERENT_RELEASE_*` tokens for publication facts that Plans 04-08 and 04-09 own.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Synchronized the lockfile for the pinned documentation toolchain**

- **Found during:** Task 1
- **Issue:** Adding an exact VitePress dependency without updating `package-lock.json` would make clean `npm ci` consumers non-reproducible and could install a dependency graph different from the verified one.
- **Fix:** Regenerated and selectively committed a clean npm 11.5.1 lockfile for the repository's committed TypeScript 6 baseline while leaving the user's unrelated TypeScript 7 experiment unstaged.
- **Files modified:** `package-lock.json`
- **Commit:** `209e0f0e`
- **Verification:** A fresh checkout completed `npm ci`, `npm run docs:build`, and the full `npm run verify:phase4` pipeline.

**Total deviations:** 1 auto-fixed (1 missing critical functionality)

## Issues Encountered

- Context7 documentation tools were unavailable, so the VitePress version and configuration were checked against the official VitePress documentation and npm registry before pinning.
- An initial archive-only aggregate verification lacked Git metadata required by the existing artifact-provenance check. Recreating the identical candidate tree as a temporary Git repository exercised the intended clean-checkout path and passed.
- The provenance scanner classified `RegExp.exec` calls in the verifier as dynamic code execution. Equivalent `String.match` parsing removed the false-positive surface without changing behavior; the exact committed HEAD then passed the full clean release pipeline.

## Known Stubs

- `README.md` intentionally exposes the four release tokens `AFFERENT_RELEASE_PACKAGE_VERSION`, `AFFERENT_RELEASE_PACKAGE_URL`, `AFFERENT_RELEASE_SOURCE_COMMIT`, and `AFFERENT_RELEASE_DEMO_URL`. The documentation gate rejects any other unresolved release value, and Plans 04-08 and 04-09 own their verified replacement before publication.

## User Setup Required

None for this plan. Package publication, hosted release facts, and the release-token replacement remain explicitly owned by the later human-present release plans.

## Next Phase Readiness

- Plan 04-08 can build release-candidate evidence on top of the deterministic packed-artifact documentation gate.
- Plan 04-09 can replace the four explicit release tokens only after package and hosted-demo facts exist.
- The user's unrelated TypeScript 7 working-tree experiment remains untouched and unstaged.

## Self-Check: PASSED

- Confirmed all 19 implementation files and this summary exist.
- Confirmed all six RED/GREEN task commits exist in repository history.
