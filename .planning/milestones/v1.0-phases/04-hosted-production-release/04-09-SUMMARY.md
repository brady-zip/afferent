---
phase: 04-hosted-production-release
plan: "09"
subsystem: source-and-static-release
tags: [github-actions, github-pages, source-release, shadcn, real-convex]
requires:
  - phase: 04-08
    provides: Immutable candidate automation and synchronized release identity
  - phase: 04-07
    provides: Executable adopter documentation and the complete local release gate
provides:
  - Public immutable Apache-2.0 v0.1.0 source with matching registry and documentation
  - Checksum-verified public assets and a clean public registry consumer
  - Complete real Convex verification and documented bootstrap from the exact public tag
affects: [future-release-maintenance]
tech-stack:
  added: []
  patterns:
    - Isolate authorized public release history from subsequent private workspace history
    - Configure namespaced shadcn dependencies for both HTTP and local registry consumers
    - Publish only the final candidate from a verified successful CI push on main
key-files:
  created:
    - scripts/verify-registry-http.mjs
    - docs/releases/0.1.0.md
  modified:
    - .github/workflows/ci.yml
    - .github/workflows/release.yml
    - scripts/verify-release-candidate.mjs
    - scripts/test-docs.mjs
    - scripts/codegen-demo.mjs
    - scripts/dev-demo.mjs
    - scripts/prepare-demo-consumer.mjs
    - scripts/release-policy.mjs
    - ui/afferent/registry.ts
    - docs/ui/registry.md
    - example/components.json
    - fixtures/registry-vite/components.json
    - example/convex/sandboxLifecycle.ts
    - package.json
key-decisions:
  - The user authorized brady-zip/afferent and its GitHub Pages source/static release; npm publication remains outside v1.
  - Publish from the reviewed release baseline in an independent checkout, preserving later private history and the TypeScript 7 experiment.
  - Keep immutable v0.1.0 at 279d6e47558612476752d81a2a4a844230d7a306; add post-publication evidence on main.
  - Use an isolated npm 11.15.0 installation in CI and require its exact bootstrap in every current npm-using job.
  - Resolve shared registry source through namespaced dependencies and explicit consumer registry mappings.
requirements-completed: [QUAL-11]
coverage:
  - id: D1
    description: Authorized immutable source tag and synchronized public documentation and registry
    requirement: QUAL-11
    verification:
      - kind: other
        ref: https://github.com/brady-zip/afferent/actions/runs/34460472107
        status: pass
      - kind: other
        ref: docs/releases/0.1.0.md
        status: pass
    human_judgment: false
  - id: D2
    description: Exact candidate continuity, public asset checksums, and clean public registry consumer
    requirement: QUAL-11
    verification:
      - kind: integration
        ref: scripts/verify-registry-http.mjs
        status: pass
      - kind: other
        ref: https://github.com/brady-zip/afferent/actions/runs/34457806781
        status: pass
      - kind: other
        ref: docs/releases/0.1.0.md
        status: pass
    human_judgment: false
  - id: D3
    description: Exact public-tag packed consumers, real Convex acceptance, and documented demo startup
    requirement: QUAL-11
    verification:
      - kind: e2e
        ref: npm run verify:phase4 at v0.1.0 (six of six real Convex suite/project markers)
        status: pass
      - kind: e2e
        ref: npm run dev:demo at v0.1.0 (ready message and frontend HTTP 200)
        status: pass
    human_judgment: false
duration: multi-session
completed: 2026-09-10
status: complete
---

# Phase 4 Plan 09: Public Source and Static Release Summary

Afferent `v0.1.0` is published as immutable Apache-2.0 source with matching public registry and documentation. Exact public-tag verification proves the locally built package and complete credential-free local example.

## Performance

- Completed: September 10, 2026, across resumed sessions and the human publication checkpoint.
- Tasks: 4 of 4 complete.
- Publication continuation: 42 changed paths between checkpoint `3368ff50` and release commit `279d6e47`, before closing records.
- Phase progress: 9 of 9 plans; milestone progress: 51 of 51 plans.

## Accomplishments

1. Removed the retired npm publication path, resolved actual repository/Pages identities, and made source installation, registry configuration, release policy, and generated artifacts consistent.
2. Exercised the user's explicit owner/IP/publication authorization: created the public repository, configured release protections, and kept private workspace history and h5i refs outside publication.
3. Published protected `v0.1.0` and the exact accepted Pages artifact. All required CI and release jobs passed; public bytes match the immutable candidate.
4. Verified all five public registry features in a clean packed consumer, all 77 documentation assets, rendered desktop/mobile documentation, the complete Phase 4 gate in a fresh public-tag clone, and the documented `npm run dev:demo` startup.

## Task Commits

Local preparation and reviewed checkpoint history are retained in commits `6c1184e4`, `c98cc992`, `e6aa48c5`, `c3a3cde1`, `2c3ab869`, `10fdc136`, `7df3be97`, and `3368ff50`.

The authorized publication continuation committed:

- `21bf7ff7` — resolve approved source and Pages destinations.
- `c4aededb` — satisfy release lint and portable demo code generation.
- `855a100f` — stabilize CI npm bootstrap and require resolved release documentation.
- `2ccfd872` — build package exports before CI conformance tests.
- `c3543425` — preserve the narrow lifecycle state return type in installed consumers.
- `279d6e47` — resolve shared registry core over both HTTP and local files, including permanent HTTP regression coverage.

Tasks 2 and 3 also changed external repository configuration and created the immutable tag and Pages deployment. Evidence: [release run 34460472107](https://github.com/brady-zip/afferent/actions/runs/34460472107), sourced from [CI run 34457806781](https://github.com/brady-zip/afferent/actions/runs/34457806781). Closing documentation is committed after the tag and does not alter released code.

## Verification Evidence

[docs/releases/0.1.0.md](../../../docs/releases/0.1.0.md) records public URLs, exact tag/source identities, SHA-256 digests, toolchain, controls, and every completed verification surface.

The final tag clone reproduced tarball SHA-256 `b8279ea847fa672ace6ef151390b90c839f31162c3b70309348d4812100d1d4d`. Normalized Phase 4 evidence binds it to `279d6e47558612476752d81a2a4a844230d7a306`, `local-real-convex`, and six required/completed browser suite/project combinations. These cover signed-out showcase, authenticated admin workflows, two-user isolation, lifecycle and reset, keyboard behavior, responsive layouts, and axe checks. The clean checkout remained unchanged after an additional documented demo-start smoke test.

Private audit captures retain supporting raw command output: final CI watch `ed3c2b7c6c2c6153`, release watch `149b52f215222932`, public registry consumer `062ee2d3206be9de`, and tagged Phase 4 verification `f0ca3d0d61c78f2f`. These are local audit references, not public artifact URLs.

## Deviations from Plan

- **CI bootstrap defects:** replacing npm in its own global installation broke CI dependencies. Installed pinned npm into an isolated runner prefix and validated the exact bootstrap in every current npm-using job.
- **Clean CI sequencing and browser prerequisites:** package exports needed a build before conformance tests, and real browser acceptance needed explicit Chromium/system dependency installation. Added both and verified all jobs on the release commit.
- **Installed-consumer failures:** corrected baseline lint findings, removed a machine-specific generated component import, and retained the literal lifecycle state union required by the installed consumer.
- **Shared artifact race:** serialized release contract test files because concurrent registry generation and digest reads caused nondeterministic results.
- **Actual HTTP registry defect:** pre-publication shadcn testing proved relative shared-core URLs were interpreted as local paths. Namespaced dependencies and explicit local/HTTP mappings now work in both consumers. The permanent regression covers each feature's HTTP core fetch and observed preservation of edited shared source.
- **Workspace isolation:** published the reviewed release graph independently so later private workspace history and the unrelated TypeScript 7 experiment remain preserved.

These repairs stayed within the authorized release work. The release tag was created only after final code review and CI passed.

## Review and Remaining Work

The live Claude peer's official review approved commit `279d6e47` at confidence 92/100. `04-REVIEW.md` preserves the final one warning and five informational findings, with zero critical findings, plus test limitations. All are nonblocking maintenance follow-ups; no required plan work remains.

QUAL-11 is complete. Source, registry/docs, local packaging, and local example gates are closed. npm publication and a hosted demo remain outside v1. Milestone archival or a subsequent release is separate future work.

## Self-Check: PASSED

The immutable public tag, successful required workflow jobs, matching public checksums, all-feature clean registry consumer, clean tagged checkout, and complete real Convex evidence have been verified. Summary, checkpoint, review, and release evidence are present.
