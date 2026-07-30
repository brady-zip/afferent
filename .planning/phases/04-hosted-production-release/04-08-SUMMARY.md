---
phase: 04-hosted-production-release
plan: "08"
subsystem: release-automation
tags:
  - changesets
  - github-actions
  - npm-oidc
  - provenance
  - github-pages
  - release-candidate
requires:
  - phase: 04-07
    provides: Executable adopter documentation and the full local Phase 4 release gate
  - phase: 04-06
    provides: Credential-free real-Convex browser acceptance and immutable demo provenance
provides:
  - One synchronized 0.1.0 release identity across package, changelog, docs, registry, generated UI, tag intent, and evidence
  - An immutable checksummed candidate containing the tested tarball, registry, docs, local demo, and Phase 4 evidence
  - Least-privilege CI that builds once and finalizes the same candidate only after the complete local acceptance gate
  - Protected npm OIDC and GitHub Pages workflows that remain inert until Plan 04-09 supplies human-owned configuration
affects:
  - 04-09-production-release
  - future-release-maintenance
tech-stack:
  added:
    - "@changesets/cli@2.31.1"
    - "yaml@2.9.0"
    - "npm@11.15.0 package-manager contract"
  patterns:
    - One canonical release manifest drives every version and artifact-digest surface
    - CI builds one candidate and passes it unchanged through acceptance, publication, and public-byte verification
    - GitHub Actions run metadata is verified before any cross-run artifact can enter the release workflow
    - npm and Pages OIDC permissions are isolated to separate protected publication jobs
key-files:
  created:
    - .changeset/config.json
    - .github/workflows/ci.yml
    - .github/workflows/release.yml
    - .node-version
    - CHANGELOG.md
    - docs/operations/releases.md
    - scripts/generate-release-manifest.mjs
    - scripts/verify-release-candidate.mjs
    - scripts/verify-version-sync.mjs
    - tests/integration/release-workflows.test.mjs
    - tests/integration/version-sync.test.mjs
  modified:
    - docs/.vitepress/config.ts
    - package.json
    - package-lock.json
    - scripts/generate-ui-artifacts.mjs
    - registry/registry.json
    - registry/r/registry.json
    - registry/r/afferent-admin.json
    - registry/r/afferent-board.json
    - registry/r/afferent-changelog.json
    - registry/r/afferent-notifications.json
    - registry/r/afferent-roadmap.json
    - registry/r/afferent-ui-core.json
    - vitest.config.ts
key-decisions:
  - Package version 0.1.0 is the canonical release identity; generated manifests stamp repository, tag, tarball digest, registry digest, docs, and UI metadata from that source.
  - Changesets may create and update only the version pull request; the protected npm-production OIDC job is the sole npm writer.
  - CI uploads one immutable candidate after build and adds final Phase 4 evidence only after the credential-free local real-Convex gate succeeds.
  - A manually selected CI run must be the successful ci.yml push on main for the exact candidate commit before its artifact can be preserved by a release run.
  - Static registry and documentation publication uses a separate github-pages environment and cannot begin until public npm bytes and provenance have been verified.
  - COMP-01 and QUAL-11 remain pending until Plan 04-09 performs and verifies the public npm and static publication.
patterns-established:
  - Release candidate continuity: every job downloads the exact source-commit-named artifact and revalidates its complete checksum inventory.
  - Fail-closed external release configuration: repository, workflow, owner, trusted publisher, protected environment, tag, and static target must match exact expected values.
  - Token-free trusted publishing: no NODE_AUTH_TOKEN, NPM_TOKEN, or setup-node registry-url is permitted in publication paths.
requirements-completed: []
requirements-progressed:
  - COMP-01
  - QUAL-11
coverage:
  - id: D1
    description: Synchronized 0.1.0 version, changelog, registry, docs, generated UI, tag, and release-manifest surfaces
    requirement: QUAL-11
    verification:
      - kind: integration
        ref: tests/integration/version-sync.test.mjs
        status: pass
      - kind: other
        ref: npm run verify:version-sync
        status: pass
    human_judgment: false
  - id: D2
    description: Immutable checksummed release candidate produced and finalized by the complete credential-free local Phase 4 gate
    requirement: COMP-01
    verification:
      - kind: integration
        ref: tests/integration/release-workflows.test.mjs
        status: pass
      - kind: e2e
        ref: npm run verify:release-candidate -- --local
        status: pass
    human_judgment: false
  - id: D3
    description: Fail-closed Changesets, npm OIDC, provenance verification, and dependency-ordered static publication workflow
    requirement: QUAL-11
    verification:
      - kind: integration
        ref: tests/integration/release-workflows.test.mjs
        status: pass
      - kind: other
        ref: npm run verify:release-candidate -- --workflow
        status: pass
    human_judgment: false
duration: 53 min
completed: 2026-07-30
status: complete
---

# Phase 4 Plan 08: Hosted Production Release Automation Summary

One synchronized Afferent 0.1.0 candidate now moves from deterministic generation through full local acceptance to protected token-free npm OIDC and dependency-ordered static publication without rebuilding or deploying the demo.

## Performance

- **Duration:** 53 min
- **Started:** 2026-07-30T21:14:30Z
- **Completed:** 2026-07-30T22:07:06Z
- **Tasks:** 3
- **Task commits:** 12
- **Implementation files changed:** 24

## Accomplishments

- Established Afferent 0.1.0 through Changesets and generated one canonical release identity across package metadata, changelog, documentation, registry indexes and items, copied UI metadata, expected tag, and digest evidence.
- Added least-privilege CI that installs the exact lockfile toolchain, rejects generated drift and forbidden hosted-demo paths, builds one immutable candidate, runs the full credential-free local real-Convex/accessibility gate, and finalizes that same candidate with checksummed evidence.
- Added a protected manual release workflow in which Changesets cannot publish, npm consumes only the already-tested tarball through trusted OIDC with provenance, public bytes and signatures are verified, and GitHub Pages receives only the matching registry and docs.
- Bound cross-run artifact selection to the exact successful `ci.yml` push on `main`, including run ID, source commit, workflow path, conclusion, branch, repository, and head repository.
- Documented the human-owned first-package bootstrap, trusted-publisher registration, protected environments, recovery steps, and the rule that the bootstrap placeholder can never count as the successful v1 release.

## Task Commits

Each task followed a RED/GREEN TDD cycle, with focused correctness and documentation commits where required:

1. **Task 1: Synchronize version, generated UI, registry, docs, and changelog**
   - `59e90197` — `test(04-08): add failing release version contract`
   - `2bd1a2b5` — `chore(04-08): establish initial release changeset`
   - `e7a2e302` — `feat(04-08): synchronize release version surfaces`
2. **Task 2: Build full CI and local release-candidate verification**
   - `2b4dd4ce` — `test(04-08): add failing release candidate workflow contract`
   - `59a8e51c` — `feat(04-08): build immutable release candidates in CI`
   - `0b4d7150` — `fix(04-08): collect built documentation in release candidate`
3. **Task 3: Prepare fail-closed npm OIDC trusted publishing with provenance**
   - `8cb05f48` — `test(04-08): add failing trusted release workflow contract`
   - `3794e07b` — `feat(04-08): prepare protected OIDC release workflow`
   - `c6b6c82e` — `style(04-08): format release workflow assertions`
   - `86077df2` — `docs(04-08): document protected release procedure`
   - `44f8eb39` — `test(04-08): expose CI run provenance gap`
   - `3000863a` — `fix(04-08): bind release candidate to CI run`

## Files Created/Modified

- `.node-version`, `package.json`, and `package-lock.json` — pin Node 22.22.2, npm 11.15.0, Changesets, YAML parsing, and the exact committed TypeScript 6 release graph.
- `.changeset/config.json` and `CHANGELOG.md` — configure one public package and record the complete 0.1.0 release.
- `scripts/generate-release-manifest.mjs` — generates deterministic version, repository, tag, tarball, registry, docs, and source evidence.
- `scripts/verify-version-sync.mjs` — rejects release-surface drift, invalid package exports, unpacked consumers, or repository-relative package assumptions.
- `scripts/generate-ui-artifacts.mjs`, `registry/registry.json`, and `registry/r/*.json` — stamp generated registry and copy-owned UI artifacts with the canonical release metadata.
- `docs/.vitepress/config.ts` and `docs/operations/releases.md` — display the canonical version and document protected release operations.
- `.github/workflows/ci.yml` — builds and accepts one immutable candidate with bounded, least-privilege jobs and pinned actions.
- `.github/workflows/release.yml` — creates version PRs and performs separately protected npm and Pages publication only after explicit approval and verification.
- `scripts/verify-release-candidate.mjs` — parses workflow semantics, builds/finalizes/checks candidates, validates CI run provenance and external configuration, verifies public npm bytes, and assembles the Pages payload.
- `tests/integration/version-sync.test.mjs` and `tests/integration/release-workflows.test.mjs` — exercise deterministic versioning, candidate integrity, workflow ordering, OIDC/token boundaries, action compatibility, and spoofing rejection.
- `vitest.config.ts` — includes the two exact release integration suites without widening unrelated integration-test discovery.

## Decisions Made

- Adopted the revalidated current `@changesets/cli` 2.31.1 patch release rather than the research snapshot's 2.31.0, while retaining an exact dependency and lockfile.
- Kept Changesets strictly version-PR-only. It receives no `publish` input and no OIDC permission; publication occurs only in the manually approved `npm-production` job.
- Used `actions/upload-artifact` v7 and `actions/download-artifact` v8 at immutable pins. The v8 contract explicitly supports artifacts produced by v7, and the repo validator enforces matching names, paths, source commit, and run identity.
- Removed `registry-url` from npm setup because it creates token-oriented npm configuration. Trusted publishing relies only on the job-scoped OIDC exchange and the exact tested tarball.
- Isolated npm and Pages credentials by job and protected environment. Readiness and public verification receive no ID token, `publish-npm` receives only npm's OIDC scope, and `publish-static` receives Pages plus its separate OIDC scope.
- Left public release facts and both plan requirements open. The repository is prepared and fail-closed; only the human-present Plan 04-09 may register external identities, publish, verify public provenance, and mark COMP-01 and QUAL-11 complete.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added exact Vitest discovery entries for release contract suites**

- **Found during:** Task 1 (release version RED gate)
- **Issue:** The intentionally narrow integration-test configuration did not discover the new `.mjs` release suites, so an exact test command could pass without running them.
- **Fix:** Added only `version-sync.test.mjs` and `release-workflows.test.mjs` to the explicit include and exclusion exception lists.
- **Files modified:** `vitest.config.ts`
- **Verification:** Both suites execute in isolation and together; the final clean clone ran all 16 release tests.
- **Committed in:** `2bd1a2b5`

**2. [Rule 1 - Bug] Collected documentation from the configured VitePress output directory**

- **Found during:** Task 2 (candidate build verification)
- **Issue:** The first candidate builder expected VitePress output under `docs/.vitepress/dist`, while this repository deliberately emits documentation to `dist/docs`.
- **Fix:** Copied the built documentation from `dist/docs` into the immutable candidate and re-ran candidate construction and the complete local Phase 4 acceptance gate.
- **Files modified:** `scripts/verify-release-candidate.mjs`
- **Verification:** Candidate build, finalization, checksum validation, packed consumer checks, docs, demo artifacts, and `local-real-convex` evidence all passed.
- **Committed in:** `0b4d7150`

**3. [Rule 2 - Missing Critical Security] Bound cross-run artifact selection to the exact successful CI run**

- **Found during:** Final Task 3 security audit (T-04-35 spoofing mitigation)
- **Issue:** Candidate contents were bound to commit and digest, but a manually supplied Actions run ID was not itself required to identify the successful `ci.yml` push on `main`. Another workflow run could otherwise be selected if it produced the expected artifact name.
- **Fix:** Query the selected Actions run before download and reject any mismatched run ID, workflow path, event, status, conclusion, branch, source commit, repository, or head repository. Added negative semantic tests and removed token-oriented `registry-url` setup from npm publication paths.
- **Files modified:** `.github/workflows/release.yml`, `scripts/verify-release-candidate.mjs`, `tests/integration/release-workflows.test.mjs`
- **Verification:** 11 focused workflow tests pass, the semantic workflow verifier passes, and the negative matrix rejects altered workflow, event, conclusion, branch, commit, run ID, and repository metadata.
- **Committed in:** `44f8eb39`, `3000863a`

**Total deviations:** 3 auto-fixed (1 bug, 1 missing critical security control, 1 blocking test-discovery issue)

**Impact on plan:** All changes tighten correctness or the stated release threat model. No demo deployment, cloud Convex provisioning, token credential, or unrelated product scope was added.

## Issues Encountered

- Context7 tools and the `ctx7` CLI were unavailable, so current action pins, Changesets behavior, npm trusted-publishing constraints, artifact-version interoperability, Pages actions, and provenance verification were checked against official upstream documentation.
- The global user ignore file excludes `docs/`; the exact new runbook was intentionally force-staged without changing the user's global configuration or staging any other ignored content.
- The system npm 10 client could not install the committed peer graph in one temporary verification environment. The repository's pinned Corepack npm 11.15.0 client installed the exact clean lockfile and is the same client asserted by CI and release jobs.
- Clean installs report 8 pre-existing dependency-audit findings (4 moderate, 3 high, 1 critical). They are recorded in `deferred-items.md` for a dedicated dependency-security update rather than widened into this release-automation plan.

## Known Stubs

- `docs/operations/releases.md:101` and `docs/operations/releases.md:103` intentionally call `0.0.0-bootstrap.0` a placeholder. This is a one-time, human-confirmed first-package bootstrap under the non-default `bootstrap` dist-tag so npm trusted publishing can be registered for a previously unpublished package. Plan 04-09 must deprecate it, and it can never count as the successful v1 package or provenance result.

## User Setup Required

No external mutation was performed by this autonomous plan. Plan 04-09 is the human-present checkpoint for confirming the canonical GitHub repository, npm package ownership or first-package bootstrap, exact trusted-publisher registration with the `npm-production` environment and `allow-publish` workflow file, protected environments, GitHub Pages, the `v0.1.0` tag, and public artifact provenance.

## Next Phase Readiness

- Plan 04-09 can use the exact successful CI run ID, source commit, protected tag, and immutable candidate artifact prepared here; the workflow refuses any mismatch.
- The next project position is Phase 4 Plan 9 of 9 with 50 of 51 plans complete (98%).
- COMP-01 and QUAL-11 remain pending until the public npm package, registry, documentation, tag, and provenance evidence are actually verified.
- The user's unrelated TypeScript 7 manifest/lock experiment and other dirty working-tree files remain untouched and unstaged.

## Self-Check: PASSED

- Confirmed all 24 implementation files, this summary, and the phase deferred-items record exist.
- Confirmed all 12 RED/GREEN, correctness, style, and documentation task commits exist in repository history.
- Confirmed the exact committed tree installs and passes 16 release integration tests, version synchronization, workflow semantics, and the documentation build in a clean clone.
