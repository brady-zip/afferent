---
phase: 04-hosted-production-release
reviewed: 2026-09-10T09:19:42Z
depth: deep
files_reviewed: 42
files_reviewed_list:
  - .github/workflows/ci.yml
  - .github/workflows/release.yml
  - .planning/phases/04-hosted-production-release/04-09-CHECKPOINT.md
  - README.md
  - docs/.vitepress/config.ts
  - docs/guide/install.md
  - docs/guide/mount.md
  - docs/index.md
  - docs/operations/releases.md
  - docs/ui/registry.md
  - example/components.json
  - example/convex/_generated/api.d.ts
  - example/convex/sandboxLifecycle.ts
  - example/convex/seeds.ts
  - examples/ui/afferent/README.md
  - examples/ui/afferent/manifest.json
  - fixtures/registry-vite/components.json
  - package.json
  - registry/r/afferent-admin.json
  - registry/r/afferent-board.json
  - registry/r/afferent-changelog.json
  - registry/r/afferent-manifest.json
  - registry/r/afferent-notifications.json
  - registry/r/afferent-roadmap.json
  - registry/r/registry.json
  - registry/registry.json
  - scripts/codegen-demo.mjs
  - scripts/dev-demo.mjs
  - scripts/prepare-demo-consumer.mjs
  - scripts/release-policy.mjs
  - scripts/test-docs.mjs
  - scripts/verify-registry-http.mjs
  - scripts/verify-release-candidate.mjs
  - src/component/maintenance/sandbox.ts
  - tests/demo/sandbox-lifecycle.test.ts
  - tests/e2e/fixtures/phase4Test.ts
  - tests/integration/docs.test.mjs
  - tests/integration/phase4-gate.test.mjs
  - tests/integration/release-workflows.test.mjs
  - tests/integration/ui-artifacts.test.mjs
  - ui/afferent/README.md
  - ui/afferent/registry.ts
findings:
  critical: 0
  warning: 1
  info: 5
  total: 6
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-09-10T09:19:42Z

**Depth:** deep

**Files Reviewed:** 42

**Status:** issues_found

**Verdict:** APPROVED — confidence 92/100

## Summary

The live Claude peer approved release commit `279d6e47558612476752d81a2a4a844230d7a306`. The cumulative publication scope is checkpoint `3368ff50` through that commit. All blocking findings from earlier passes were resolved before tagging; the final official pass retains one nonblocking warning and five informational follow-ups. The verdict does not mean the report is clean.

Final approval is correlated to ASK `8be074a1ae2b71c0` by Claude's reply `ec3285a45daeb1d0` (`re #8be074a1ae2b71c0`, 2026-09-10T08:57:37Z). Correction `2599fadd557ed413` reconciles the initial informational count. Official-pass addendum `2920b37ce3013060` (2026-09-10T09:19:42Z), explicitly scoped to `c3543425..279d6e47`, adds one warning and three informational findings without changing approval. The resulting counts below preserve the peer's severities. These are private radio audit IDs, not public message links.

## Warnings

### WR-01: Registry identity URLs outside the documentation identity gate

**File:** `ui/afferent/README.md:7` and its generated mirror `examples/ui/afferent/README.md:7`

**Issue:** These correct current public registry URLs sit outside the root README/docs inputs scanned by the identity validator. A future repository rename could leave obsolete identity in the README copied to adopters. This does not invalidate the current release URLs.

**Fix:** Include canonical UI and mirrored example READMEs in documentation identity validation, or generate their identity-bearing URLs from canonical metadata.

## Info

### IN-01: Optional GSD harness uses nonportable absolute includes

**File:** `.codex/agents/` and related optional GSD harness files

**Issue:** The optional harness contains 206 absolute includes across its 561-file scope, which are not portable to other clones. The peer withdrew its earlier critical classification: these references are optional tooling, not a runtime defect or secret.

**Fix:** Make harness includes portable during tooling maintenance, preserving the planning inputs used by the executable documentation gate.

### IN-02: HTTP registry preservation test depends on the pinned CLI prompt

**File:** `scripts/verify-registry-http.mjs:44`

**Issue:** The test recognizes the exact `Would you like to overwrite?` prompt. The pinned shadcn 4.11.0 behavior is verified; a future CLI upgrade could change that prompt and fail the gate.

**Fix:** Revalidate overwrite semantics when upgrading shadcn, including the prompt and preservation behavior, rather than merely changing a matching string.

### IN-03: Prefixed unresolved release placeholders can evade detection

**File:** `scripts/test-docs.mjs:468`

**Issue:** A word-boundary check can miss prefixed forms such as `VITE_AFFERENT_RELEASE_DOCS_URL` and `NEXT_PUBLIC_AFFERENT_RELEASE_REGISTRY_URL`. None is present in shipped documentation; this is a future validation gap.

**Fix:** Remove the word-boundary assumption and add negative cases for prefixed release placeholders.

### IN-04: Registry commands rely on the separately documented configuration prerequisite

**File:** `docs/ui/registry.md:44`

**Issue:** The command fence requires the registry mapping documented immediately above it. Copying the fence alone into an unconfigured application will fail. The full documented sequence is correct and was tested against the public registry.

**Fix:** Present the required `components.json` mapping alongside installation commands to make their configuration dependency explicit when copied.

### IN-05: npm bootstrap validation enumerates current jobs

**File:** `scripts/verify-release-candidate.mjs:237` and `scripts/verify-release-candidate.mjs:441`

**Issue:** All eight current npm-using jobs have the correct pinned bootstrap, but future jobs could be omitted from the validator's explicit list.

**Fix:** Discover jobs requiring bootstrap from their `npm ci` usage and validate that set, so newly introduced jobs are covered automatically.

## Evidence and Limitations

Final required CI run `34457806781` passed all three jobs; release run `34460472107` passed readiness, assembly, Pages deployment, and public-byte verification. A fresh public `v0.1.0` clone passed the full Phase 4 gate with six of six real Convex suite/project completion markers. Public checks installed all five registry features into a clean packed consumer, passed type checking and production build, compared all 77 documentation files/assets, and exercised desktop/mobile documentation. See [release evidence](../../../../docs/releases/0.1.0.md).

The shared-source negative test observes an overwrite prompt and preserves the edited provider marker. It does not independently prove that the delayed `n` response was consumed or that the second feature's own files landed in that specific negative case; an aborted default-false prompt can also preserve the file. Future strengthening should assert the second feature's files and add a paired positive overwrite case. The separate public clean-consumer check does prove installation/build of all five features.

The official addendum also noted nonblocking robustness follow-ups for the delayed stdin write's possible EPIPE, network-install retries, and diagnostics when a quality-job test step is absent. These were additional validation observations, not additional classified findings; they are not silently folded into the severity counts.

## Historical Review Scope

The earlier approved baseline review at commit `3368ff50` retained concerns about repeated demo preparation cost, duplicated integration-test routing, malformed retirement-record diagnostic location, and a contract command that also builds artifacts. That historical scope remains available in Git history. Its counts are separate from this final publication review. Earlier blocking npm-bootstrap, CI build ordering, unresolved-identity, installed-consumer typing, and real HTTP registry findings were repaired before the final approved commit.

---

_Reviewed: 2026-09-10T09:19:42Z_

_Reviewer: Claude (dark factory radio · official code-review skill)_

_Depth: deep_
