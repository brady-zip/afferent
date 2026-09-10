---
phase: 04-hosted-production-release
plan: "09"
status: complete
completed: 2026-09-10
release_base_commit: 3368ff50f8ba52aea0cf15bff618fa361be6d62b
source_commit: 279d6e47558612476752d81a2a4a844230d7a306
tag: v0.1.0
ci_run: 34457806781
release_run: 34460472107
---

# Plan 04-09 publication checkpoint — complete

The user's explicit `yes` authorized public `brady-zip/afferent`, Apache-2.0/IP authority, pushing `main`, protected Actions/Pages configuration, immutable `v0.1.0`, and registry/documentation publication at `https://brady-zip.github.io/afferent/`. That authorization has been exercised and the public artifacts verified. No authorization remains pending for this plan.

## Completed external configuration

- Public source repository: [brady-zip/afferent](https://github.com/brady-zip/afferent).
- Immutable `v*` tag ruleset `22744415`: update/deletion prohibited, no bypass actors.
- Main history ruleset `22744417`: deletion/non-fast-forward prohibited, no bypass actors.
- `github-pages` environment `21629584898`: owner reviewer, custom `main` branch policy `59591483`; the owner approved the actual deployment.
- Actions defaults to read permissions. Release owner, approved tag, and static-publication variables match the authorized values.
- Pages uses the GitHub Actions build, enforces HTTPS, and serves the verified candidate.
- Publication pushed only the authorized source branch and tag. Private h5i refs remain private.

## Completed publication and verification

- Tag `v0.1.0` points to `279d6e47558612476752d81a2a4a844230d7a306`; annotated tag object `715824b13225c3d8a683cd9bb88e1bdd3d49a561`.
- [CI run 34457806781](https://github.com/brady-zip/afferent/actions/runs/34457806781): all three required jobs passed.
- [Release run 34460472107](https://github.com/brady-zip/afferent/actions/runs/34460472107): readiness, assembly, protected Pages deployment, and public checksum verification passed. The version-PR job was intentionally skipped for manual dispatch.
- Public registry consumer installed all five features and shared core, then passed type checking and production build.
- All 77 deployed documentation files/assets matched candidate checksums. Public desktop/mobile browser checks had zero failed requests or page errors.
- A fresh public-tag clone passed the complete Phase 4 gate with six of six real Convex browser suite/project markers and independently passed the documented demo startup. The tagged checkout remained clean.
- Live official Claude review approved the release, with zero critical findings, one nonblocking warning, and five informational findings retained in `04-REVIEW.md`.

Exact digests and links are in [the release evidence](../../../../docs/releases/0.1.0.md). Task history, deviations, and requirement completion are in `04-09-SUMMARY.md`.

## Workspace boundary

Publication used the isolated `afferent-public-release` checkout based on the reviewed release checkpoint. Later private workspace history and its TypeScript 7 experiment were preserved independently. Closing planning records may be synchronized into the original workspace; that does not authorize publishing its private history. The released source remains on the verified TypeScript 6 toolchain.

## Remaining work

No required Plan 04-09 work remains. The review's nonblocking maintenance findings are recorded for future work. npm distribution, a hosted demo, and a subsequent release are outside this completed plan.
