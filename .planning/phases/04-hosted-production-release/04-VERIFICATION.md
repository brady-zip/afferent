---
phase: 04-hosted-production-release
verified: 2026-09-10
status: passed
score: 5/5 roadmap success criteria verified
behavior_unverified: 0
overrides_applied: 0
human_verification: 0
source_commit: 279d6e47558612476752d81a2a4a844230d7a306
tag: v0.1.0
verification_mode: inline-execution-evidence
---

# Phase 4: Local Production Release Verification

**Goal:** Adopters can build and install the production artifact from tagged source, use the public registry/documentation, and evaluate the complete integration through one credential-free local application against a real anonymous Convex development backend.

**Result:** Passed. All five current roadmap success criteria have behavioral evidence from the exact released tag and matching public candidate. The configured standalone verifier agent is disabled; this report records the executing agent's completed verification, not an independent verifier-agent run.

## Roadmap Success Criteria

| Criterion                                                                              | Evidence                                                                                                                                                                                                                                          | Result |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Clean clone and one-command credential-free local bootstrap                            | Fresh public `v0.1.0` clone, pinned dependency installation, successful `npm run dev:demo`, ready message, anonymous backend, frontend HTTP 200, and owned-process cleanup.                                                                       | Passed |
| Immutable signed-out showcase and authenticated private admin sandbox                  | Tagged `demo.spec.ts` and `sandbox-isolation.spec.ts` exercised the installed package/UI against real local Convex; showcase and authenticated sandbox journeys passed.                                                                           | Passed |
| Bounded quotas, expiry, reset and cleanup with complete two-user scope isolation       | Tagged maintenance suites plus `sandbox-lifecycle.spec.ts` and `sandbox-isolation.spec.ts` passed against the same artifact/backend identity.                                                                                                     | Passed |
| Real browser product workflows, keyboard, responsive and axe checks                    | Final evidence requires and completes six suite/project combinations: demo, isolation, lifecycle and accessibility on Chromium, plus accessibility on tablet and mobile.                                                                          | Passed |
| Complete adopter documentation and immutable synchronized public source/static release | Tagged documentation and packed-consumer gates passed; source tag and successful CI/release runs bind the local tarball to public registry/docs. All five public feature installs built cleanly; all 77 deployed docs assets match the candidate. | Passed |

## Plan and Requirement Accounting

All nine plans have completion summaries. Historical plans are interpreted through the current PROJECT, REQUIREMENTS, ROADMAP, and the accepted distribution pivot.

| Requirement | Evidence                                                                                     | Disposition                         |
| ----------- | -------------------------------------------------------------------------------------------- | ----------------------------------- |
| DEMO-02     | Seeded showcase in the tagged real Convex browser journey                                    | Complete                            |
| DEMO-03     | Two authenticated visitors, isolated reads/writes and private administration                 | Complete                            |
| DEMO-04     | Separate static showcase/sandbox installations in the tested host                            | Complete                            |
| DEMO-05     | Trusted host authorization exercised by adversarial scope-isolation coverage                 | Complete                            |
| DEMO-06     | Deterministic seed/reset and generation-fenced lifecycle suites                              | Complete                            |
| DEMO-07     | Maintenance, quotas, rate limits, expiry and cleanup suites                                  | Complete                            |
| DEMO-08     | Exact documented local demo bootstrap from the public tag                                    | Complete                            |
| QUAL-05     | Complete product journeys against real local Convex                                          | Complete                            |
| QUAL-06     | Adversarial two-user scope and lifecycle tests                                               | Complete                            |
| QUAL-09     | Executable documentation gate plus rendered public docs and registry consumer                | Complete                            |
| QUAL-11     | Immutable tag, candidate continuity, public asset digests, clean local package and consumers | Complete                            |
| DEMO-01     | Historical hosted demo requirement replaced by DEMO-08 on July 30, 2026                      | Superseded; no hosted demo claimed  |
| COMP-01     | Historical npm-publication requirement removed by the August 7 distribution pivot            | Removed; no npm publication claimed |

The corresponding historical npm OIDC/name-preflight and hosted-demo plan truths were explicitly superseded. Local package export/declaration checks remain required and passed. No removed requirement is counted as a delivered public service or package.

## Exact Evidence

- Source commit: `279d6e47558612476752d81a2a4a844230d7a306`, annotated tag `v0.1.0`.
- Required candidate CI: [34457806781](https://github.com/brady-zip/afferent/actions/runs/34457806781), all three jobs successful.
- Publication: [34460472107](https://github.com/brady-zip/afferent/actions/runs/34460472107), readiness, assembly, Pages deployment and public verification successful.
- Tagged normalized evidence: `status: complete`, `backendKind: local-real-convex`, `required: 6`, `completed: 6`.
- The CI and independently rebuilt tagged package share SHA-256 `b8279ea847fa672ace6ef151390b90c839f31162c3b70309348d4812100d1d4d`.
- The tagged checkout remained clean after full verification and the extra documented-start smoke test.
- [Release evidence](../../../docs/releases/0.1.0.md) includes the full identity, digests, public-byte checks, toolchain, controls and review outcome.

## Human Authorization and Review Limits

The user's explicit publication authorization covered repository ownership/IP, Apache-2.0 source, protected tag and Pages publication. The owner approved the protected deployment. No human authorization remains pending for this release.

The live Claude peer's official review approved the code at confidence 92/100 with zero critical, one nonblocking warning and five informational findings. The review's limitations, including the narrower causal coverage of the edited-source overwrite test, remain recorded in `04-REVIEW.md`. They do not invalidate the separate all-feature public install/build or the complete tagged real Convex gate. Automated accessibility evidence is not a blanket WCAG certification.
