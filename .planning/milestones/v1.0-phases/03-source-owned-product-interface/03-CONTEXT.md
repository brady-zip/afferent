# Phase 3: Source-Owned Product Interface - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the accessible, responsive, source-owned shadcn interface layer for every public and administrative workflow already exposed by the Phase 2 headless React contract. One canonical UI source must deterministically produce both shadcn registry artifacts and mirrored repository examples, and clean-consumer tests plus concrete WCAG 2.2 AA-oriented evidence must prove the copied source installs, builds, and remains usable. This phase does not add new backend workflows, a router, an opaque design system, or an SSR data contract.

</domain>

<decisions>
## Implementation Decisions

### Visual language and theming
- Use a neutral, product-embeddable shadcn aesthetic with no Afferent brand chrome. Public surfaces use comfortable density; administrative surfaces are compact without becoming a dense data grid.
- Express color, radius, and typography through standard shadcn CSS variables such as `--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`, and `--radius` so an existing shadcn host inherits theming and dark mode without forking components.
- Ship a documented default token palette that meets 4.5:1 text and 3:1 non-text contrast where applicable. Host overrides are explicitly responsible for preserving contrast.
- Use injectable icon slots with lucide icons as the default copied-source implementation. Keep the slots swappable and install `lucide-react` only into consumers of the copied UI.

### Composition, navigation, and state ownership
- Ship route-agnostic feature screens plus smaller primitives that consume only Afferent headless hooks. Copied UI must never call Convex directly or recreate data fetching, authorization, optimism, rollback, pagination, or error rules.
- Inject real-link rendering for shareable public post, roadmap, and changelog URLs, navigation actions for host-controlled transitions, and current-location state as props. Components never import a router or read `window.location`.
- Hook-consuming copied components are explicit client components. Server-rendered host wrappers may compose around that boundary, but v1 adds no initial-data or hydration-reconciliation contract. First render must be deterministic and hydration-safe.
- Treat client-only public rendering and its weaker SEO than server-rendered HTML as a documented v1 limitation. Keep the headless API compatible with a future additive initial-data option without implementing it in this phase.
- Render loading, empty, unsupported/not-configured, unauthenticated/not-authorized, error, retry, pending, merged, and not-found states directly from the closed headless state vocabulary. A merged post renders a real redirect link to its canonical post.
- Pending and optimistic UI derives only from generation-fenced headless hook state. Copied UI owns no parallel optimistic cache, navigation, or toast behavior.

### Public and administrative workflows
- Public feedback uses a responsive board-first list/detail composition with deep links. Changelog entries remain chronological; notifications ship as composable popover and list surfaces.
- Roadmap UI renders exactly the Planned, In Progress, and Complete groups returned by the server-owned roadmap projection, with optional board filtering. It never re-derives status bucketing; semantic sections may progressively become columns when space permits.
- Administrative UI uses a queue/list plus detail workspace. Forms render in-page or in dialogs according to task scope, tables become labelled cards on phones, and every workflow remains keyboard-complete.
- Require typed-name confirmation only for irreversible, high-blast-radius operations such as duplicate merge or a future bulk-destructive action. Reversible archive and editable publish operations use a plain confirmation dialog.
- Provide one complete English copy dictionary, deep-merged once at the UI provider, with per-screen overrides. Copy is concise and product-neutral; a host can replace individual strings without redefining the dictionary.
- UI visibility is never authorization. Admin controls reflect server-derived hook states, while trusted host wrappers remain the only identity, authorization, and scope boundary.

### Responsive and accessibility evidence
- Prefer native semantics. Supply landmarks, ordered headings, skip navigation where a screen owns the page frame, visible focus, focus restoration, modal focus trapping only for true dialogs, and status/error announcements through appropriate live regions.
- Target 44 CSS-pixel coarse-pointer controls as a product best practice while documenting the WCAG 2.2 AA 24 CSS-pixel minimum and justified exceptions. Avoid page-level horizontal scrolling at phone widths.
- Respect reduced-motion preferences. Provide non-drag alternatives for any rearrangement interaction; roadmap status management must not require dragging.
- Test keyboard-only operation, focus order and non-obscuration, dialog restoration, announcements, contrast, 320 CSS-pixel reflow, 200% zoom, phone/tablet/desktop layouts, and deterministic hydration. Explicit manual/interaction fixtures are primary evidence; axe is a regression net.
- Produce checkable release evidence: automated accessibility reports, keyboard scenario transcripts, and captured 320 CSS-pixel and 200% zoom layouts. Name relevant WCAG 2.2 criteria rather than claiming blanket certification.

### Canonical source and distribution
- Author each copied component and stylesheet once under a canonical UI source tree. A deterministic generator with stable sorting and no timestamps emits shadcn registry index/item JSON and mirrored repository examples.
- Generated registry and mirror output is never hand-edited. CI regenerates both and fails on any diff; mirrored source must be byte-equivalent to the canonical files it represents.
- Namespace registry items (`afferent-board`, `afferent-roadmap`, and similar) so installation cannot clobber generic consumer shadcn primitives.
- Registry items declare shadcn registry dependencies and copied-source runtime dependencies. Radix primitives are used only where their interaction behavior is justified; native elements remain preferred.
- Keep all styling/UI libraries out of the core `afferent` package runtime and peer dependency surface. Copied-source consumers receive exact, audited dependencies such as CVA, clsx, tailwind-merge, Radix packages, lucide, and the validated Tailwind v4 toolchain through registry metadata or their fixture.
- Prove both distribution paths in a clean fixture: install the packed Afferent tarball, install locally generated registry artifacts through the supported shadcn path, and build the resulting Vite consumer.

### Working-tree dependency isolation
- Before Phase 3 dependency edits, confirm the only package manifest experiment is the unstaged TypeScript 6.0.3 to 7.0.2 change and its regenerated lock closure.
- Temporarily restore only `package.json` and `package-lock.json` to the committed TypeScript 6 baseline, apply and commit the complete exact Phase 3 dependency set atomically, then restore TypeScript 7.0.2 and regenerate the working-tree lock once after the final dependency commit.
- Leave the restored TypeScript 7 manifest and lock changes unstaged. Verify the final diff against the new Phase 3 HEAD contains only that experiment and its lock closure; stop on any unrelated package delta.
- Treat TypeScript 7 adoption as a separate unapproved compatibility decision. Validate every new dependency's TypeScript peer range without committing or normalizing the user's experiment.

### the agent's Discretion
- Exact component names within the required namespaced registry convention.
- Exact neutral spacing scale, breakpoint values, and component composition when the responsive and accessibility contracts above remain true.
- Which justified interaction surfaces use Radix primitives versus native elements.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/react/provider.tsx` and the domain hooks under `src/react/hooks/` expose the complete public, participation, roadmap, changelog, notification, and admin behavior contract.
- Phase 2 tests already cover explicit state unions, provider injection, pagination, optimistic mutations, redirects, and live errors; copied UI can render these states without inventing a second state machine.
- `fixtures/packed-vite-convex/` and the packed-artifact test provide an existing clean Vite/Convex consumer base for registry-install and build coverage.

### Established Patterns
- Public DTOs are stable and versioned; UI source consumes DTOs and hook actions rather than documents or generic CRUD.
- Expected failures are typed values, mutations expose pending/error/reset state, and only vote, subscribe, and mark-read use hook-owned optimistic updates.
- The package is currently styling-agnostic and has only Convex and React peers; copied UI dependencies must not widen the core package runtime surface.

### Integration Points
- Canonical UI source composes `AfferentProvider` and the domain hooks exported from `afferent/react.js`.
- Registry generation and clean-consumer tests extend the existing scripts, package, fixture, static-contract, and packed-artifact gates.
- Phase 4's hosted Vite demo will consume the mirrored/canonical Phase 3 UI rather than establish a divergent interface implementation.

</code_context>

<specifics>
## Specific Ideas

- The interface should feel native inside an adopter's existing shadcn application rather than like an embedded third-party feedback SaaS.
- Public post, roadmap, and changelog surfaces must preserve real shareable links even though Afferent does not own routing.
- The roadmap remains the exact three-lane server-derived projection locked in Phase 2.
- Accessibility evidence is a versioned release artifact, not an informal visual assertion.

</specifics>

<deferred>
## Deferred Ideas

- Server-rendered public DTO snapshots and live hydration reconciliation are deferred beyond v1; the client-only SEO tradeoff must be documented and the future API must remain additive.
- Localization files and locale negotiation are deferred; v1 provides an overridable dictionary contract and a complete English baseline.
- Drag-and-drop roadmap administration is unnecessary in v1 because status actions already provide a complete non-drag workflow.

</deferred>
