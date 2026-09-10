---
phase: 04-hosted-production-release
plan: "09"
status: publishing_authorized_release
updated: 2026-09-10
source_commit: 7df3be978da472998f5fa5b4faea6cc49f64f719
---

# Plan 04-09: Local preparation and publication checkpoint

Task 1 is implemented and locally verified. On 2026-09-10, the human replied
"yes" to the exact public Apache-2.0 GitHub/IP/Actions/Pages authorization
question. Task 2 configuration and Tasks 3-4 publication/verification are now
executing within that approved scope. Do not
create the plan SUMMARY or mark QUAL-11 complete before actual public and
tagged-local verification.

## Completed local work

- `f04f96cf`: removed the npm publication path, retaining private local packaging.
- `739c6cc8`: documented source-build distribution.
- `1051f33f`: excluded the retired npm requirement from the documentation gate.
- `6c1184e4`: aligned package, release workflow, and canonical/generated registry
  metadata with `brady-zip/afferent`; made local tarball installation a required
  prerequisite of every registry item.
- `c98cc992`: fixed the reviewed fetch/push, annotated-tag, identity casing,
  artifact-reuse, documentation, and demo source-link gaps; added real Git and
  mounted UI regression tests.
- `e6aa48c5`: pinned the runtime helper to the already-vetted `0.1.120` version
  after the clean demo caught a newer helper requiring Convex 1.43; preserved
  legitimate `git+ssh` metadata support. All direct runtime dependencies now use
  the existing exact-pin policy, preserving the tested Convex 1.42.2 floor.
- `c3a3cde1`: assigned the three real Git tests an explicit 30-second timeout
  after the peer reproduced a five-second timeout on their machine.
- `2c3ab869`: replaced the static command denylist with per-job allowlists,
  corrected installed-package metadata test resolution and independent link
  expectations, and closed the remaining parser, diagnostic, and test-isolation
  review notes.
- `10fdc136`: allowed backticked non-ID words in retirement-marker lead-ins;
  both peer-provided regressions and the active narrative requirement guard pass.
- `7df3be97`: wired docs/package unit tests and all four Phase 4 contract
  suites into the CI release path. Both native gates rejected deliberately
  failing assertions. Replaced permissive retirement parsing with an explicit
  ID-list format and an error for every malformed marker, and aligned link-test
  casing with the package contract.
- Preserved the user's unstaged TypeScript 7 manifest/lock experiment and other
  existing working-tree edits. Verification used a separate clean checkout with
  the committed TypeScript 6.0.3 graph. The final source commit is `7df3be97`.

## Verification

Node 22.22.2 and npm 11.15.0 were used for clean-checkout verification.
The native package/version and documentation gates passed at `7df3be97` after
wiring their regression suites. The new `test:release:contracts` command passed
all 36 Phase 4 integration tests. The installed-demo gate also passed at the
same source commit after the final assertion changes. The disposable verification
checkout was removed after its evidence was captured.

| Check                                                    | Result                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Clean `npm ci`                                           | Passed; 882 packages installed from the committed lockfile                                   |
| `npm run verify:version-sync`                            | Passed, including `test:release:package`, clean tarball consumer, publint, and ATTW          |
| `npm run verify:docs`                                    | Passed: 19 documents, 29 code fences, three executable provider examples, six registry items |
| `npm run verify:release-candidate -- --workflow`         | Passed for CI and release workflows                                                          |
| Mounted shell Vitest suite                               | 15 tests passed                                                                              |
| Phase 4 contract Vitest suites                           | 36 tests passed                                                                              |
| Documentation/package Node test suites                   | Six tests passed                                                                             |
| Changed-file formatting and diff whitespace              | Passed                                                                                       |
| Tested checkout tracked-file status                      | Clean                                                                                        |
| `--external-config`                                      | Expected checkpoint failure: no usable `origin` remote                                       |
| Public source/static and tagged-local Phase 4 acceptance | Pending; no public release exists                                                            |

The full real-Convex Phase 4 gate has not been rerun for a released tag in this
continuation. The three source/static URL markers remain unresolved until the
publication steps establish their destinations.

## Installed demo and dependency evidence

The clean `verify:demo:artifacts` gate passed at `7df3be97`, including package and
real shadcn registry installation, dependency-tree validation, Convex codegen,
typechecking, and production build. The mounted shell suite passed 15 tests;
with 36 release/Phase 4 contract tests and six documentation/package tests,
57 focused tests passed.

- Local tarball SHA-256: `aca4fe384b6cf3dad0919c25d53d0bafc9df0fbddc9b69bc3fce75b12ab87ecc`.
- Installed-demo gate output: private h5i object `ff3493934b58553b`.
- Final installed-demo `npm ls --all --json` dependency graph: private h5i object
  `0e25cf9e463247ce`.
- Earlier failing graph with helper `0.1.124`: private h5i object `df38a240320ac192`.

An installed-metadata mutation check also passed: changing the disposable
installed package homepage made the independent source-link assertion fail with
the incorrect candidate URL. A valid mixed-case GitHub homepage also passed at
`7df3be97`. The candidate JSON was restored byte-for-byte.

These are local evidence, not a released artifact or a public tag. The clean
consumer gate intentionally resolves without the repository lockfile; retain
its resolved graph when diagnosing future dependency drift.

## Live peer review

Reviewer: the live Claude peer using the official Anthropic code-review skill.
Final threaded reply `894febcbd45daa2b` to ASK `28f274aeb4dd86ff` approves
`7df3be97` with confidence 88/100: zero Critical, one Warning, and three Info
findings, all explicitly nonblocking. `04-REVIEW.md` preserves the findings,
mutation procedures, and validation limits. Its required GSD status remains
`issues_found` because nonblocking findings exist. No code-review blocker remains;
publication authorization is still pending.

## Earlier-phase test-routing follow-up

The requested integration-test sweep found eight earlier-phase test files that
are not selected by the current npm scripts: `walking-skeleton.test.mjs`,
`headless-backend.test.mjs`, and the `search`, `rate-limiter`, `merge`,
`tag-cleanup`, `fanout`, and `outbox` `*-backend.test.ts` files. These are not
claimed as passing release evidence. The real backend probe scripts
remain wired through `test:backend:phase2`; review the dormant test files and their
routing as an earlier-phase follow-up. The six Phase 4 suites found missing from
the release path are now explicitly wired by `7df3be97`.

## Confirmed destination and remaining authority

- The peer confirmed the recorded human owner choice is `brady-zip` and reported
  no newer authorization to perform external writes. Read-only `gh api user`
  independently returned `brady-zip`.
- Read-only GitHub lookup could not resolve `brady-zip/afferent`; no Git remote is
  configured. The destination must be checked again immediately before creation.
- The source version is `0.1.0`, intended tag `v0.1.0`, workflow `release.yml`, and
  static environment `github-pages`.
- Planned public destinations are `https://github.com/brady-zip/afferent` and
  `https://brady-zip.github.io/afferent/`, with registry items under `r/`.
  These are proposed destinations, not verified public URLs.

The human must authorize publishing this work under Apache-2.0, creation of the
public repository, an explicit `main` push, required Actions/Pages/release
protection configuration, the immutable source tag, and the source/static release
workflow. The selected owner does not itself authorize those actions.

Keep `refs/h5i/*` private. Publish no npm package or public tarball, and do not
deploy the demo. No external writes have been performed in this continuation.

## Resume

1. Obtain the exact outstanding GitHub publication authorization.
2. Recheck destination/account state; configure only the approved public source
   and static release surfaces, then run the external configuration gate.
3. Publish only the approved branch, let CI verify its exact candidate, protect
   and create its immutable tag, and dispatch the source/static release workflow.
4. Verify public bytes and the exact tagged clone, including the complete local
   real-Convex Phase 4 gate, before writing release evidence and the plan SUMMARY.

## Authorization and isolated release checkout — 2026-09-10

The approval covers public `brady-zip/afferent`, pushing `main`, protected
Actions/Pages, and publishing the immutable `v0.1.0` source plus registry/docs
at `https://brady-zip.github.io/afferent/`. Private h5i refs remain excluded.
No npm package, public tarball asset, or hosted demo is authorized or required.

The release starts from reviewed checkpoint `3368ff50` in an independent clone.
The original workspace's newer local tooling and TypeScript 7 experiment remain
private and have no public remote. The public clone contains only the reviewed
release history and this publication continuation.
