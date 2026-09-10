---
phase: 04-hosted-production-release
reviewed: 2026-09-10T07:34:47Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - .changeset/config.json
  - .github/workflows/release.yml
  - .planning/PROJECT.md
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/STATE.md
  - .planning/phases/04-hosted-production-release/04-09-PLAN.md
  - .planning/phases/04-hosted-production-release/04-CONTEXT.md
  - .planning/phases/04-hosted-production-release/04-DISTRIBUTION-PIVOT.md
  - .planning/phases/04-hosted-production-release/04-SCOPE-PIVOT.md
  - AGENTS.md
  - CLAUDE.md
  - README.md
  - docs/guide/install.md
  - docs/index.md
  - docs/operations/releases.md
  - docs/operations/upgrades.md
  - docs/ui/registry.md
  - example/src/components/host/AppShell.tsx
  - package-lock.json
  - package.json
  - registry/r/registry.json
  - registry/registry.json
  - scripts/generate-release-manifest.mjs
  - scripts/generate-ui-artifacts.mjs
  - scripts/release-policy.mjs
  - scripts/test-docs.mjs
  - scripts/verify-package-release.mjs
  - scripts/verify-release-candidate.mjs
  - scripts/verify-version-sync.mjs
  - tests/integration/docs.test.mjs
  - tests/integration/phase4-gate.test.mjs
  - tests/integration/release-package.test.mjs
  - tests/integration/release-workflows.test.mjs
  - tests/integration/version-sync.test.mjs
  - tests/ui/hosted-shell.test.tsx
  - ui/afferent/registry.ts
  - vitest.react.config.ts
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-09-10T07:34:47Z
**Depth:** standard (official Anthropic code-review skill, medium effort)
**Files Reviewed:** 38
**Status:** issues_found — APPROVED with four nonblocking findings

## Summary

The live Claude peer approved the Plan 04-09 source/static-release continuation
at `7df3be978da472998f5fa5b4faea6cc49f64f719`, confidence 88/100. The cumulative
review covers `3ae6e657..7df3be97`; this is not a fresh review of every earlier
Phase 4 implementation plan. No blocking findings remain. The required GSD
status is `issues_found` because the peer retained one Warning and three Info
findings, explicitly nonblocking and available for follow-up scheduling.

**Code verdict:** APPROVED.
**Publication authorization:** PENDING; the review grants no external-write authority.

The final reply is `894febcbd45daa2b`, whose inbox header carries
`re #28f274aeb4dd86ff`, the directed final review ASK. The peer's follow-up
`289bb01a42d0c18b` confirms that the final clean-checkout evidence strengthens
that disposition without changing it. Both were received through the dedicated
`gsd-review` identity; no headless reviewer was spawned.

All earlier blocking findings are closed: effective fetch/push destinations,
annotated tags and clean checkout identity, packaged source links, repository
casing, immutable artifact reuse, supported Git URL forms, real-Git test timing,
no-npm documentation, static command allowlists, installed metadata resolution,
retirement parsing, and CI regression-test routing.

## Warnings

### WR-01: Repeated demo preparation increases release-gate duration

**File:** `package.json:97`
**Issue:** Peer G1: `verify:phase4` prepares the demo consumer three times:
through the demo-artifact contract test, maintenance's `typecheck:demo`, and
`verify:demo:artifacts`. The last two invoke the same `--gate` command. This
adds cold-install work and reduces headroom under CI's 60-minute timeout.
The peer explicitly classified this as nonblocking: timeout failure is visible.
**Fix:** Reuse the candidate or remove redundant preparation. The peer also
suggested dropping `demo-artifacts.test.mjs` from the combined contract command
and consolidating the duplicate gate aliases. Preserve the artifact test's
negative assertions when choosing an implementation; a successful consumer
build alone does not establish every failure-path contract.

## Info

### IN-01: Integration-test routing is repeated in several places

**File:** `vitest.config.ts:5`
**Issue:** Peer G2: the selected integration files are repeated across Vitest
include/exclude configuration and npm commands, with an exact Phase 4 command
assertion elsewhere. A new test can be omitted from automated runs.
**Fix:** Add a routing audit that enumerates integration test files and fails
when one has no configured runner/command. Include the earlier-phase follow-up
inventory in `04-09-CHECKPOINT.md`; do not claim those tests ran in this release
verification.

### IN-02: Malformed retirement diagnostics lack a location

**File:** `scripts/test-docs.mjs:522`
**Issue:** Peer G3: the required marker error explains the format but does not
identify the offending marker in a document containing several markers.
**Fix:** Include the marker offset, line number, or a short surrounding snippet.

### IN-03: The contract command also rebuilds artifacts

**File:** `package.json:96`
**Issue:** Peer G4: `test:release:contracts` includes a mutating demo-artifact
suite that recreates build/candidate output and needs package installation;
its name does not make that cost apparent.
**Fix:** Split or rename the mutating suite while addressing WR-01 and retaining
its assertions in the release path.

## Verification and closure evidence

The authoritative runtime checks used a separate clean checkout of `7df3be97`
with the committed TypeScript 6.0.3 dependency graph, Node 22.22.2, and npm
11.15.0. The user's unstaged TypeScript 7 experiment was preserved.

- Clean `npm ci`, `verify:version-sync` (including package regression tests,
  clean tarball consumer, publint, and ATTW), `verify:docs`, and
  `verify:demo:artifacts` passed.
- `test:release:contracts` passed 36 tests across all four selected suites;
  the installed mounted-shell suite passed 15; the docs/package Node suites
  passed six: 57 tests total.
- Workflow validation, changed-file lint/formatting, and diff whitespace checks
  passed. The tested checkout had no tracked changes.
- The peer independently verified the pure-function and code contracts and six
  Node tests. Its full gate attempts in the shared working tree hit the local
  TypeScript 7 experiment and missing generated artifacts; those attempts are
  not recorded as passing runtime evidence.
- The complete real-Convex browser Phase 4 gate still must run against the
  actual released tag. No public source/static release exists yet.

### Reusable mutation procedures

To verify installed-package metadata resolution, first prepare the disposable
consumer. Save `node_modules/afferent/package.json` as bytes, then run the
focused `opens on an explicitly immutable` test using
`vitest.react.config.ts`, `AFFERENT_REQUIRE_DEMO_PROVENANCE=1`, and the prepared
candidate's package/UI/provenance paths. Change only its homepage to
`https://example.invalid/wrong-candidate#readme`: the test must fail with the
incorrect installed URL. Change it to
`https://github.com/Brady-Zip/Afferent#readme`: the test must pass. Restore the
original bytes in a `finally` block and verify byte equality. Both cases passed
at `7df3be97`. This checks alias resolution and the independent repository
expectation together.

To verify native gate routing, save each Node test file as bytes. Append a
`node:test` case calling `assert.fail` with a unique sentinel to
`docs.test.mjs`, then run `npm run verify:docs`; repeat for
`release-package.test.mjs` and `npm run test:release:package`. Each command must
exit nonzero with its sentinel before the implementation gate executes.
Restore each file byte-for-byte in `finally`. Both checks passed; the restored
native gates subsequently passed in the clean checkout.

Retirement parsing now requires the backticked ID list immediately after the
marker, on the same or next line. Every malformed marker throws, including a
malformed second marker after a valid first one. Permissive prose lead-ins were
removed deliberately: arbitrary prose can turn cross-references into false
retirements. The strict format plus a loud error preserves requirement coverage
under rewording instead of silently interpreting intent.

### Artifact identity

Final local tarball SHA-256:
`aca4fe384b6cf3dad0919c25d53d0bafc9df0fbddc9b69bc3fce75b12ab87ecc`.
Installed-demo output: private h5i object `ff3493934b58553b`.
Resolved installed dependency graph: private h5i object `0e25cf9e463247ce`.

The earlier `a4d8ad609f220b02c567b47d954a3ddbf2eb62af1fe073ad5e7a74ab93160f64`
digest remained unchanged across verifier/test-only corrections. The final
digest changed because `7df3be97` changed npm scripts in the packed
`package.json`; registry and example digests stayed unchanged. These are local
verification artifacts, not public release assets. Keep `refs/h5i/*` private.

---

_Reviewed: 2026-09-10T07:34:47Z_
_Reviewer: Claude (dark factory radio · official code-review skill)_
_Depth: standard_
