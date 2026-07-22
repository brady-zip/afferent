---
phase: 03-source-owned-product-interface
verified: 2026-07-22T21:31:31.926Z
status: human_needed
score: 47/47 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification: 3
---

# Phase 3: Source-Owned Product Interface Verification Report

**Phase Goal:** As a developer adopting Afferent, I want to install and restyle source-owned public and admin shadcn interfaces from one canonical registry-backed source, so that my users and administrators can complete the feedback lifecycle through accessible, responsive screens without replacing the headless behavior layer.

**Verified:** 2026-07-22T21:31:31.926Z

**Status:** human_needed

**Score:** 47/47 objective must-haves verified; 0 present-but-behavior-unverified

## User Flow Coverage

| Step | Expected | Evidence | Status |
| --- | --- | --- | --- |
| Install and restyle | An adopter installs the packed package and all source-owned public/admin items through the real local shadcn path, then owns the copied source and standard shadcn variables | Fresh clean-consumer registry gate installed the packed tarball plus all five feature items/core, typechecked, and built; canonical adoption guide and exact dependency metadata are present | VERIFIED |
| Complete the public lifecycle | Visitors browse/search/filter/page feedback, follow detail/merged links, create and participate, inspect roadmap/changelog, and use notifications through closed headless states | Fresh mounted/headless matrix passed; installed Chromium exercises every public surface and twelve default/custom recovery families | VERIFIED |
| Complete the admin lifecycle | Authorized admins triage, moderate, manage status/tags, archive/restore, merge, inspect activity, and draft/publish/unpublish changelog entries with keyboard-complete confirmations | Fresh mounted admin coverage and installed keyboard/dialog/state scenarios pass; controls use server/headless truth rather than browser authority | VERIFIED |
| Preserve source ownership | One canonical catalog emits the registry and byte-equivalent examples deterministically, without repository-relative consumer imports or generated-source authority | Fresh double generation, schema/manifest checks, byte comparison, scoped drift check, anti-skip, and external temporary-consumer path audit pass | VERIFIED |
| Outcome | Users and administrators can use accessible, responsive screens without replacing the headless behavior layer | Hydration, contrast, keyboard/focus, announcements, targets, reflow, zoom, phone/tablet/desktop, dark-theme, and full regression gates pass | VERIFIED; SUBJECTIVE REVIEW REMAINS |

The MVP user-story validator reports a valid role, capability, and outcome for the roadmap goal.

## Final Verdict

Phase 3 has no objective implementation, distribution, authority, interaction, accessibility, responsive-layout, retry, evidence-integrity, or regression gap. All 47 plan truths and all seven assigned requirements have substantive implementation plus fresh behavioral evidence.

The status is `human_needed`, not `passed`, because the canonical final UI review and evidence index explicitly retain three judgment-dependent items: overall aesthetic polish/desirability, administrative density/rhythm, and behavior under adopter-specific theme/content extremes. Those are not known defects and do not make any objective truth behavior-unverified, but the verifier protocol does not allow subjective visual acceptance to be converted into an automated pass.

## Roadmap Success Criteria

| # | Success criterion | Status | Independent evidence |
| --- | --- | --- | --- |
| 1 | Install and restyle public feedback, roadmap, changelog, and notification source without replacing the headless behavior layer | VERIFIED | Public canonical source imports `afferent/react.js`; clean packed/local-shadcn installation, mounted public flows, and installed browser scenarios pass. |
| 2 | Install complete keyboard-usable admin triage, moderation, status, and changelog-publishing source | VERIFIED | Admin mounted behavior, consequential confirmations, focus restoration, installed keyboard/state scenarios, and clean consumer build pass. |
| 3 | Generate registry and byte-equivalent repository examples from one canonical source and build them in a clean supported consumer | VERIFIED | Double generation, schema/catalog/hash/byte checks, real shadcn installation, external path containment, typecheck, and Vite build pass. |
| 4 | Supply documented WCAG 2.2 AA-oriented keyboard, focus, announcement, contrast, 320px reflow, 200% zoom, and responsive evidence | VERIFIED objectively | Criterion-named reports, 19 captures, exact contrast, 13 installed Chromium scenarios, and deterministic evidence pass; subjective aesthetic judgment remains human. |

## Must-Have Accounting

| Plan | Verified | Total | Notes |
| --- | ---: | ---: | --- |
| 03-01 | 4 | 4 | Canonical board slice, deterministic registry, dependency placement, and protected package experiment |
| 03-02 | 3 | 3 | Complete feedback discovery/participation/detail/discussion and responsive composition |
| 03-03 | 3 | 3 | Exact roadmap/changelog/notification behavior and generated public distribution |
| 03-04 | 4 | 4 | Full admin behavior, authority presentation, confirmation, and responsive workflow |
| 03-05 | 4 | 4 | Six-item distribution, clean consumer, deterministic hydration, and adoption contract |
| 03-06 | 4 | 4 | Keyboard/focus, contrast, reflow/zoom/layout evidence, and aggregate gate |
| 03-07 | 5 | 5 | Consequence dialogs, merge copy, selection/error hierarchy, phone control, and token/domain copy |
| 03-08 | 4 | 4 | Installed repaired-state proof, whole-product capture matrix, responsive evidence, and complete gate |
| 03-09 | 4 | 4 | Query-owned retry, exhaustive Activity states, authority preservation, and regenerated distribution |
| 03-10 | 4 | 4 | Portal ownership, spacing, collision-free detail, admin chunking, and deterministic evidence |
| 03-11 | 4 | 4 | One typed recovery sentence, preserved actions/callbacks, mounted coverage, and installed evidence |
| 03-12 | 4 | 4 | Source-grounded anti-skip, exhaustive default/custom matrices, packed retries, and full gate integrity |
| **Total** | **47** | **47** | **All objective truths verified** |

`behavior_unverified: 0`: every behavior-dependent must-have has a passing mounted, integration, clean-consumer, or installed-browser test. The three remaining human items are subjective review judgments rather than untested behavioral truths.

## Artifacts and Key Links

All 54 plan-declared artifacts exist and are substantive. All 42 declared key links are wired.

| Scope | Result | Details |
| --- | --- | --- |
| Automated artifact query | 54/54 | Every declared canonical, generated, fixture, test, report, and capture artifact exists. |
| Automated key-link query | 37 direct matches | All literal file-to-file patterns outside two helper limitations passed. |
| Plan 03-06 indirect server link | VERIFIED manually | `playwright.config.ts` runs `scripts/serve-ui-evidence-fixture.mjs`, which calls `prepareRegistryConsumer`; the helper expected the server filename literally inside the spec. |
| Plan 03-09 directory-level link set | VERIFIED manually | The helper cannot read declared source directory `ui/afferent` and returns `EISDIR`; source inspection verifies query-owned retry projection, Activity formatting, changelog retry wiring, and canonical generator-to-manifest flow. |
| Plans 03-01 through 03-12 summaries | VERIFIED | Every declared task/implementation commit referenced by the summaries resolves in history; summaries were used only as navigation, not proof. |

### Canonical distribution flow

`ui/afferent/registry.ts` is the sole six-item catalog. `scripts/generate-ui-artifacts.mjs` stable-sorts metadata and files, emits schema-valid registry JSON, copies the same canonical bytes into `examples/ui/afferent`, and writes timestamp-free SHA-256 manifests. The fresh gate generated twice, compared all canonical/mirror bytes, and found no scoped registry/example diff.

`scripts/test-registry-consumer.mjs` creates an OS-temporary consumer, installs the packed Afferent tarball, invokes the pinned local shadcn CLI on the generated items, rejects repository-relative imports, then typechecks and builds the installed source. Playwright reaches that same prepared consumer through `playwright.config.ts` and `scripts/serve-ui-evidence-fixture.mjs`; the fixture exposes `data-evidence-source="packed-registry-installed"`, and the anti-skip test requires it.

## Authority and Headless Boundaries

| Boundary | Status | Evidence |
| --- | --- | --- |
| Copied UI -> headless layer | VERIFIED | Hook-consuming copied files import only `afferent/react.js`; source scan found no direct Convex/auth-provider/router/toast dependency in `ui/afferent`. |
| Browser intent -> trusted host authority | VERIFIED | Copied UI accepts no `userId`, `isAdmin`, or `scopeId`; admin capability controls presentation only and every action remains an injected host/headless mutation. |
| Query recovery -> originating watch | VERIFIED | Default and sentinel mounted matrices assert exact binding names/arguments; installed ST-06 observes a second matching attempt for all twelve public recovery families. |
| UI state -> generation-fenced source | VERIFIED | Feed, direct lookup, comments, roadmap, changelog, notifications, and activity use the hook state unions, including the repaired roadmap/notification `retry` error path. |
| Auth/scope/component boundary | VERIFIED by regression | The complete Phase 2 real-backend, auth-conformance, scope, package, and headless regression is embedded in and passed by `test:phase3`. |

No copied-source raw HTML sink, browser authority field, viewport render branch, time/random first-render dependency, or placeholder implementation was found. Hydration tests passed with equal first DOM and no recoverable hydration error.

## Public and Administrative Behavior

Public mounted coverage exercises feed, search, similar feedback, detail, vote/subscription, edit/withdraw, flat comments/replies, Activity, roadmap groups, changelog feed/detail, notification list/popover, pagination, auth, unsupported, loading, empty, error, merged, not-found, pending, and account-generation states. Real links and the shared comment fragment target remain wired.

Administrative mounted and installed coverage exercises capability states, queue/detail selection, moderation, board/status changes, discussion lock, archive/restore, tag create/assign/delete, Activity, exact-title duplicate merge, changelog draft/link/publish/unpublish, pending/error/reset, mobile queue/detail control, and tablet/desktop simultaneous composition.

Consequential operations are not pre-fired. Archive, tag deletion, publish, and unpublish use consequence-specific plain dialogs; merge alone requires exact duplicate-title confirmation and names both records plus the irreversible vote/comment/history transfer. Installed keyboard scenarios verify containment, Escape dismissal, duplicate-submit prevention, error correction, accepted completion, and logical focus restoration.

## Accessibility, Responsive, and Visual Evidence

The evidence tree contains normalized axe, contrast, keyboard/focus, and status-message reports plus 19 non-empty installed-source captures covering public/admin light and dark themes, confirmations, errors/empty states, both phone admin panes, 320 CSS-pixel reflow, tablet, desktop, and 200% zoom.

Fresh objective checks confirm:

- exact unrounded 4.5:1 text and 3:1 meaningful non-text default-token contrast thresholds;
- keyboard completion, visible focus, no trap, focus order/restoration, and non-obscuration;
- polite status and urgent correction announcements without focus theft;
- 24px minimum and 44px coarse-pointer target contracts;
- no drag-required task;
- no page-level horizontal overflow or action loss at 320px, 768px, 1280px, or the 200% zoom equivalent;
- portaled dialog typography/control geometry survives a hostile host reset;
- long detail content does not intersect metrics at 1280px;
- normalized reports and all captures are required by the anti-skip oracle and were byte-stable across the phase's consecutive-run evidence gate.

The final `03-UI-REVIEW.md` records 24/24 and `PASS — clean`; representative board, detail, notification recovery, merge confirmation, phone admin, admin error, and light/dark captures were independently inspected during this verification. No objective clipping, collision, illegibility, hierarchy, or state-signaling defect was observed.

## Fresh Behavioral Evidence

| Command | Result | Status |
| --- | --- | --- |
| `node --test tests/integration/phase3-gate.test.mjs` | 3/3 anti-skip and aggregate-composition tests passed | PASS |
| Focused mounted/headless/hydration command over board, public, admin, hydration, feedback/search/roadmap/changelog/notifications/admin hooks | 10 files, 52/52 tests passed | PASS |
| `vitest` static UI contracts plus exact contrast | 2 files, 17/17 tests passed | PASS |
| `npm run test:phase3` | Registry 8/8; mounted UI 24/24; hydration 1/1; static/contrast 17/17; installed Chromium 13/13; complete Phase 2 real-backend/auth/scope/package regression; typecheck; lint; and final anti-skip all passed | PASS, RUN ONCE |
| Protected unrelated diff fingerprint | `a9d31b29d26eda53639af1a18df8fdbcc1b6151257326bf82f2a020021a0f304` before and after | PRESERVED |

The full aggregate output is captured by h5i object `fd2c4f4503b1f8a6`. No transient failure or retry occurred in this verification run.

## Requirements Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| UI-04 | SATISFIED | Complete public feedback, roadmap, changelog, and notification source passes mounted, generated, clean-consumer, and installed-browser behavior. |
| UI-05 | SATISFIED | Complete admin triage, moderation, roadmap-status, merge/tag/activity, and changelog editorial workflows pass keyboard/state/confirmation tests. |
| UI-06 | SATISFIED | The same canonical inventory is available through the generated shadcn registry and byte-equivalent repository examples. |
| UI-07 | SATISFIED | Stable sorting, double generation, schemas, SHA-256 manifest, byte comparison, scoped diff, and anti-skip prevent incompatible copies. |
| QUAL-04 | SATISFIED | An external clean consumer installs the packed tarball and every local generated registry feature item, then typechecks and builds. |
| QUAL-07 | SATISFIED objectively; human judgment pending | Criterion-named keyboard, focus, announcement, contrast, zoom, reflow, target, label/error, and supplemental axe evidence passes. |
| QUAL-08 | SATISFIED objectively; human judgment pending | Phone, tablet, desktop, 320px reflow, 200% zoom, public/admin, light/dark, and controlled one-pane phone layouts pass without action loss. |

All seven Phase 3 requirement IDs appear in plan frontmatter. No requirement is orphaned. `QUAL-05` real-Convex browser workflows remains intentionally assigned to Phase 4 and is not a hidden Phase 3 dependency; Phase 3's acceptance contract is the packed/generated installed UI over controlled real headless hooks.

## Disconfirmation Pass

| Investigation | Result | Severity | Impact |
| --- | --- | --- | --- |
| Could a green source grep substitute for working retry behavior? | No. Exhaustive mounted default/sentinel matrices check exact watch arguments, and installed scenarios observe real attempt increments and ready transitions. | INFO | Plan 03-12 closes the prior false-green risk. |
| Could roadmap or notification recovery still call no-op `loadMore` from an error state? | No. Their error unions expose paginated `retry`, UI buttons invoke it, and focused plus installed matrices pass. | INFO | The discovered Plan 03-12 defect remains closed. |
| Could browser evidence use canonical repository imports rather than distributed source? | No. The server prepares an external packed/local-shadcn consumer, path audits reject canonical/example imports, and anti-skip requires the installed marker. | INFO | Distribution proof is real. |
| Could registry/example files drift while tests still pass? | No. Generation is stable-sorted and timestamp-free; schemas, complete manifests, byte equality, two-generation hashes, scoped git diff, and clean installation all pass. | INFO | UI-06/UI-07 are enforced. |
| Could visible admin controls grant authority? | No. Copied source accepts no actor/admin/scope facts and the complete Phase 2 host/component authority regressions pass. | INFO | Presentation remains outside the security boundary. |
| Could screenshots hide overflow, focus, target, or collision failures? | No. Captures are preceded by executable semantic, geometry, computed-style, overflow, focus, and interaction assertions. | INFO | Images supplement rather than replace behavior. |
| Could automation certify aesthetic quality? | No. The final UI audit and evidence index explicitly preserve aesthetic, density, and adopter-variation judgment for a human. | HUMAN | Prevents a false `passed` verdict. |

No `TODO`, `FIXME`, `XXX`, `HACK`, placeholder, or not-implemented marker appears in Phase 3-owned source/tests/evidence. `git diff --check` passes.

## Human Verification Required

### 1. Overall aesthetic polish and desirability

Inspect the complete 19-image matrix in `docs/accessibility/phase-3/` at original resolution, especially board/detail, roadmap, changelog, notifications, confirmation, and light/dark captures.

**Expected:** The neutral source-owned UI feels coherent and acceptable as an adopter-owned starting point, without a subjective visual defect that should block Phase 4.

### 2. Administrative density and rhythm

Inspect `admin-states-1280.png`, `admin-confirmations-1280.png`, `desktop-1280.png`, `admin-detail-320.png`, `dark-admin-1280.png`, and `zoom-200.png` for perceived whitespace, grouping, and progressive disclosure.

**Expected:** The measured non-overlapping section hierarchy remains subjectively readable rather than overly dense or excessively fragmented.

### 3. Adopter content and theme variability

Apply at least one representative adopter token set and unusually long real product content beyond the deterministic long-content/host-reset fixtures.

**Expected:** Copy-owned source remains straightforward to restyle and preserves readable hierarchy, contrast, focus, reflow, and action discoverability; any host-specific issue is documented as adopter integration work rather than silently waived.

## Gaps Summary

No objective gap remains. Phase 3 can move forward after the three subjective human judgments above are accepted or explicitly dispositioned. No product/test/UI-review/state/roadmap/requirements/radio file was changed by this verifier.

---

_Verified: 2026-07-22T21:31:31.926Z_

_Verifier: independent generic-agent fallback using the repo-local gsd-verifier role_
