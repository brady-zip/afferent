# Stack Research

**Domain:** Reusable Convex component with headless React APIs, copy-owned shadcn UI, and a hosted Vite example
**Researched:** 2026-07-14
**Confidence:** MEDIUM

> **Scope supersession (2026-07-30):** Vercel, Convex Cloud demo deployment, preview,
> and remote-smoke recommendations are no longer v1 deliverables. The example runs
> locally on a credential-free anonymous Convex development backend. Other stack and
> release recommendations remain research inputs. See
> `.planning/phases/04-hosted-production-release/04-SCOPE-PIVOT.md`.

The recommendations below are a compatibility snapshot, not a command to upgrade blindly to every future `latest`. Versions were checked against official documentation, official repositories, and npm package metadata on the research date. Confidence is MEDIUM because Convex Components are evolving, Convex Auth remains beta, and several frontend tools move quickly.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | `24.17.x` LTS | Development, builds, tests, registry generation, CI | Node 24 is the current LTS line and satisfies Vite 8, shadcn 4, React Router 8, npm trusted publishing, and the official Convex component template's Node 24 types. Pin with `.nvmrc`/`.node-version` and CI. |
| npm | `11.18.x` | Single lockfile, scripts, package publication | Convex's component template deliberately uses one root `package.json` and `node_modules` so the component and example cannot resolve different Convex copies. npm 11 also satisfies trusted-publishing's `>=11.5.1` requirement. Do not add a workspace manager for v1. |
| Convex | `1.42.1` | Component runtime, schema, realtime queries/mutations, codegen, CLI | This is the current component platform and React client. Its component boundary gives Afferent isolated tables/functions while app-level wrappers retain access to `ctx.auth`. Make it a peer dependency and a pinned dev dependency. |
| TypeScript | `6.0.3` | Source, declarations, strict public contracts | Use the version validated by the current official component template, with `strict`, ESM, `moduleResolution: "Bundler"`, declaration maps, and `verbatimModuleSyntax`. Do not adopt TypeScript 7 merely because it is the registry's latest tag; Convex documents the native compiler path as a preview and the template remains on TS 6. |
| React / React DOM | demo: `19.2.7`; peer: `^18.3.1 || ^19.0.0` | Headless providers/hooks and hosted UI | Convex and the official component template support both React 18 and 19. Develop the demo on current React 19.2 while keeping the published headless layer broadly consumable. Do not expose React 19-only behavior in the headless contract without a major release. |
| Vite + React plugin | `8.1.4` + `@vitejs/plugin-react@6.0.3` | Hosted example and registry asset build | Current official Vite line; fast static SPA output fits the chosen example architecture. Node 24 clears Vite's `20.19+ / 22.12+` floor. |
| Tailwind CSS + Vite plugin | `4.3.2` + `@tailwindcss/vite@4.3.2` | Styling the example and source-owned UI | shadcn's current React 19 path is Tailwind 4 with CSS variables, OKLCH tokens, `data-slot` selectors, and `tw-animate-css`, which makes copied source straightforward to restyle. Tailwind is not a runtime dependency of the headless package. |
| shadcn CLI | `4.13.0` | Build and validate the copyable UI registry | The official registry schema supports components, hooks, dependencies, composition via `include`, static JSON output, namespaces, and direct public GitHub registries. Commit the source examples and generated registry metadata; consumers own installed code. |

### Package and Repository Boundaries

Use **one publishable root package**, logically named `afferent` (the unscoped name was unregistered when checked; reserve it before relying on it, otherwise use an organization scope). This follows Convex's own template more closely than a conventional monorepo:

```text
src/
  component/             # isolated Convex schema and functions
  client/                # app-side typed wrappers; auth/policy resolved here
  react/                 # headless providers and hooks only
  test.ts                # convex-test registration helper
example/
  convex/                # host wrappers + Convex Auth demo integration
  src/                   # Vite public/admin sandbox app
registry/                # copy-owned shadcn user/admin blocks and primitives
docs/                    # VitePress Markdown docs
registry.json            # registry catalog (can compose nested catalogs)
package.json             # the only package manifest and dependency graph
```

Publish explicit ESM/type entry points:

| Export | Contents | Dependency rule |
|--------|----------|-----------------|
| `afferent` | App-side typed component client, identity/access-policy types, wrapper helpers | May import `convex/server`; must not import an auth provider. |
| `afferent/react` | Framework-light headless providers/hooks over host-exported Convex API references | React and Convex are peers; no Tailwind, Radix, router, or form-library dependency. |
| `afferent/convex.config.js` | Component registration config | Required by consuming app's `convex/convex.config.ts`. |
| `afferent/_generated/component.js` | Generated `ComponentApi` type | Types-only public component contract. |
| `afferent/test` | `convex-test` registration utility | Source entry, matching the official component convention. |

The shadcn registry is **not another npm UI package**. Registry items install source that imports `afferent/react` and declares its own shadcn/runtime dependencies. Mirrored source under `registry/` is the repository example the project promised.

### Auth Integration Stack and Boundary

Afferent itself must not depend on Convex Auth, Clerk, or Better Auth. Every provider is resolved in the consuming app's Convex wrapper, where `ctx.auth` and host authorization are available, then reduced to a provider-neutral value such as `{ subject, displayName?, imageUrl? }` plus an operation-scoped admin decision. The component persists the stable external `subject`, never provider user IDs in provider-specific tables or raw tokens.

| Integration fixture | Verified versions | How to use |
|---------------------|-------------------|------------|
| Convex Auth | `@convex-dev/auth@0.0.94`, `@auth/core@0.41.2` | Canonical hosted Vite demo only. Resolve the current user in app-level Convex functions (for example with `getAuthUserId`), then call Afferent. Keep the beta packages out of Afferent's peers. |
| Clerk | `@clerk/react@6.12.3` | Documentation and integration fixture. Current Convex docs use `@clerk/react` with `ConvexProviderWithClerk`; wrappers read `ctx.auth.getUserIdentity()`. Do not use the older `@clerk/clerk-react` package in new examples. |
| Convex Better Auth component | `@convex-dev/better-auth@0.12.5`, `better-auth@~1.6.23` | Documentation and integration fixture. The component requires Convex `>=1.25`; use its app-level `getAuthUser`/session validation before forwarding Afferent identity and authorization. Keep Better Auth's component and schema separate from Afferent. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-router` | `8.2.0` | Demo-only routing for boards, post detail, roadmap, changelog, and admin | Hosted example only. It requires Node `>=22.22` and React/DOM `>=19.2.7`, both met by the selected demo stack. Never make it a headless peer. |
| `radix-ui` | `1.6.2` | Accessible UI primitives for copied shadcn source | Registry/example items that need dialogs, menus, popovers, tabs, etc. Prefer the current unified package in new source. |
| `lucide-react` | `1.24.0` | Icons | Registry/example source; list it in each item's `dependencies`. |
| `class-variance-authority`, `clsx`, `tailwind-merge` | `0.7.1`, `2.1.1`, `3.6.0` | Variants and safe class composition | Registry/example source, not headless runtime. |
| `react-hook-form` + `@hookform/resolvers` + `zod` | `7.81.0`, `5.4.0`, `4.4.3` | Complex admin/editor forms and client UX validation | Use for multi-field admin forms. Convex argument validators remain the security boundary; client validation is not authorization. |
| `sonner` | `2.0.7` | Mutation success/error feedback | Copied UI only; shadcn has deprecated its old toast component in favor of Sonner. |
| `tw-animate-css` | `1.4.0` | Tailwind 4 animation utilities | Copied UI when motion is needed; respect reduced-motion preferences. |
| VitePress | `1.6.4` stable | Install, auth adapter, API, registry, and deployment documentation | Keep under `docs/` with root scripts. Use stable 1.x for v1; do not base production docs on the `2.0.0-alpha` line. |

### Testing and Quality Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Vitest | `4.1.10` | Unified test runner | Use Vitest projects: `edge-runtime` for component tests and browser/DOM projects for React. |
| `convex-test` + `@edge-runtime/vm` | `0.0.54` + `5.0.0` | Fast isolated component and wrapper tests | Register Afferent through `afferent/test`. Current `convex-test` peers Convex `^1.32`, compatible with 1.42.1. It is a mock, so do not make it the only release gate. |
| Vitest Browser + Playwright | `@vitest/browser-playwright@4.1.10`, `vitest-browser-react@2.2.0`, `playwright@1.61.1` | Real-browser headless hook and copied-component tests | Prefer Browser Mode for focus, keyboard, DOM, CSS, and accessibility-sensitive UI behavior. |
| Playwright Test + axe | `@playwright/test@1.61.1`, `@axe-core/playwright@4.12.1` | Hosted-example end-to-end and accessibility smoke tests | Cover public browsing, authenticated participation, admin sandbox isolation/reset, roadmap, and changelog flows. |
| ESLint + Convex plugin | `eslint@9.39.4`, `@convex-dev/eslint-plugin@2.0.0` | Static correctness | Use the versions validated together by the current official component template and its flat config. Defer ESLint 10 until the Convex template/plugin adopts it. |
| Prettier | `3.9.5` | Deterministic formatting | Apply to TS/TSX/JSON/Markdown and generated registry source definitions, not built JSON if it causes churn. |
| `publint` + `@arethetypeswrong/cli` | `0.3.21` + `0.18.5` | Validate package exports and declarations | Run on the packed tarball before publish. Also install the tarball into a clean fixture to test consumer resolution. |
| Changesets | `@changesets/cli@2.31.0` | Semver intent and changelog/release PRs | Useful even for one package; it avoids ad hoc version scripts while leaving actual publish to npm trusted publishing. |

### Infrastructure

| Technology | Version / mode | Purpose | Why Recommended |
|------------|----------------|---------|-----------------|
| Convex Cloud | managed production + preview deployments | Backend hosting | Native deployment target. Use a production deploy key for production and preview deploy key for PR environments; seed only isolated demo data. |
| Vercel | managed | Host the Vite example and static registry; optionally docs | Convex's official Vercel flow deploys backend and frontend together with `npx convex deploy --cmd 'npm run build'`; preview deployments can receive fresh Convex deployments. |
| GitHub Actions | `actions/checkout@v6`, `actions/setup-node@v6` | CI and release automation | Run lockfile install, codegen/build, typecheck, lint, unit/browser/E2E tests, registry build/validation, docs build, pack inspection, publint, and ATTW. |
| npm trusted publishing | OIDC; npm `>=11.5.1` | Tokenless public package publishing with provenance | Configure the exact GitHub workflow as the trusted publisher, grant `id-token: write`, use GitHub-hosted runners, and publish from the public repository. Provenance is automatic. |

## Installation

Consumer installation should remain small:

```bash
# Core component and headless React API
npm install afferent convex

# Copy a complete source-owned UI surface (example item names)
npx shadcn@4.13.0 add https://afferent.dev/r/feedback-board.json
npx shadcn@4.13.0 add https://afferent.dev/r/admin.json

# Host-selected auth integration, not an Afferent dependency
npm install @convex-dev/auth@0.0.94 @auth/core@0.41.2
# or: npm install @clerk/react@6.12.3
# or: npm install @convex-dev/better-auth@0.12.5 better-auth@~1.6.23
```

Repository bootstrap (versions intentionally pinned in `package-lock.json`):

```bash
npm install convex@1.42.1 react@19.2.7 react-dom@19.2.7 react-router@8.2.0
npm install tailwindcss@4.3.2 @tailwindcss/vite@4.3.2 radix-ui@1.6.2
npm install -D typescript@6.0.3 vite@8.1.4 @vitejs/plugin-react@6.0.3 shadcn@4.13.0
npm install -D vitest@4.1.10 convex-test@0.0.54 @edge-runtime/vm@5.0.0
npm install -D @vitest/browser-playwright@4.1.10 vitest-browser-react@2.2.0 playwright@1.61.1
npm install -D vitepress@1.6.4 @changesets/cli@2.31.0 publint@0.3.21 @arethetypeswrong/cli@0.18.5
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| One root npm package and lockfile | pnpm workspaces + Turborepo | Only after genuinely independent publishable packages exist. For v1 it conflicts with Convex's explicit guidance to avoid multiple package manifests/Convex copies and adds release/build ordering risk. |
| `tsc` declaration/ESM emission | tsdown/tsup/Rollup library bundle | Use only if measured package size or multi-format needs justify bundling. Convex's template uses `tsc`, and component code/config/types need transparent, stable subpath exports more than aggressive bundling. |
| Headless React over Convex hooks | TanStack Query | Use only for non-Convex HTTP data. Convex already provides reactive caching/subscriptions; a second server-state cache creates stale or duplicated state. |
| Static shadcn registry JSON + GitHub source registry | Dynamic registry server | Use dynamic handlers only if access-controlled/private registry items become a requirement. Public v1 needs no registry backend. |
| VitePress 1.6 stable | VitePress 2 alpha, Docusaurus, custom docs app | Choose another system only for versioned multilingual docs or deeply interactive React documentation. For v1, stable Markdown-first static docs are lower risk. |
| Vercel + Convex Cloud | Netlify or Cloudflare Pages | Both are viable if the maintainers already operate them; preserve `convex deploy --cmd` and preview-deployment semantics. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Provider-specific auth inside the component | Components cannot read host `ctx.auth`; coupling tables to Convex Auth/Clerk/Better Auth violates the host-owned identity and authorization requirement. | App-level wrappers that resolve auth/admin permission and pass a stable provider-neutral identity. |
| `@clerk/clerk-react` in new examples | Current Convex Clerk documentation has moved to `@clerk/react`; using the older package makes the docs stale on arrival. | `@clerk/react@6.12.3`. |
| A packaged shadcn design-system runtime | Consumers would not own the UI source and styling would be constrained by Afferent's release cycle. | `afferent/react` headless API plus registry-installed source. |
| Tailwind classes in `afferent/react` | Makes the supposedly headless layer styling- and build-tool-dependent. | Keep styles solely in registry/example code. |
| TypeScript 7 / `tsgo` for the v1 release pipeline | Convex documents this compiler path as preview and the official component template is still validated on TS 6. | TypeScript 6.0.3; evaluate TS 7 after package/codegen/type tests pass upstream. |
| VitePress 2 alpha | A prerelease docs tool adds needless churn to a production-ready v1. | VitePress 1.6.4 stable. |
| `convex-test` as the sole test layer | It does not enforce all production limits/runtime behavior and simplifies some features. | Add browser/E2E tests plus a minimal real Convex deployment smoke test before release. |
| Long-lived `NPM_TOKEN` release secrets | Persistently valuable credential; npm now supports OIDC trusted publishing and automatic provenance. | npm trusted publisher bound to the GitHub release workflow. |
| Create React App | Deprecated for new applications and inferior to the project's explicitly chosen Vite example. | Vite 8. |

## Stack Patterns by Variant

**If a consumer wants only custom UI:**
- Install `afferent` and register the Convex component.
- Use `afferent/react`; do not install shadcn, Tailwind, Radix, React Router, or form libraries unless their app independently needs them.

**If a consumer wants the polished UI:**
- Install the relevant registry block(s), which copy source and declare only their actual npm/registry dependencies.
- Treat copied code as application code; document upgrades as diffs/codemods, not automatic opaque package changes.

**If a consumer uses any supported auth provider:**
- Authenticate and authorize in app-owned Convex wrappers.
- Pass the same Afferent identity/permission contract regardless of provider; only the wrapper implementation changes.

**If the repository grows into multiple independently versioned packages:**
- Re-evaluate npm workspaces/Changesets and enforce a single resolved `convex` peer across all workspaces.
- Do not split merely to organize folders; public API subpath exports already provide boundaries without dependency duplication.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `convex@1.42.1` | `react ^18 || ^19` | Registry peer metadata supports both major React lines. Publish Afferent with the official template's narrower `^18.3.1 || ^19.0.0` peer range. |
| `convex-test@0.0.54` | `convex ^1.32.0` | Compatible with selected Convex 1.42.1. |
| `@convex-dev/auth@0.0.94` | `convex ^1.17`, `react ^18.2 || ^19`, `@auth/core ^0.41.1` | Use `@auth/core@0.41.2` explicitly; the npm `latest` dist-tag observed for `@auth/core` did not reflect the highest published compatible version. |
| `@convex-dev/better-auth@0.12.5` | `convex ^1.25`, `react ^18.3.1 || ^19`, `better-auth >=1.6.11 <1.7` | Pin Better Auth with `~1.6.23` to remain in the supported minor line. |
| `@clerk/react@6.12.3` | React/DOM 18 or supported 19.0–19.3 patch lines | Selected React 19.2.7 is supported. Convex integration comes from `convex/react-clerk`. |
| `vite@8.1.4` + `@vitejs/plugin-react@6.0.3` | Node `^20.19 || >=22.12` | Node 24.17 satisfies the requirement. Plugin React 6 peers Vite 8. |
| `react-router@8.2.0` | Node `>=22.22`, React/DOM `>=19.2.7` | Demo-only; this is why the demo pins React 19.2.7 and Node 24. |
| `vitest@4.1.10` | Vite 6, 7, or 8; Node 20/22/24+ | Browser provider must use the exact same Vitest version. |
| `@vitest/browser-playwright@4.1.10` | `vitest@4.1.10`, any compatible Playwright | Keep exact Vitest/provider versions aligned. |
| `shadcn@4.13.0` | Node `>=20.18.1`; Tailwind 4 + React 19 current path | Node 24, Tailwind 4.3, and React 19.2 meet the current recommended path; copied components may still support React 18 where their dependencies do. |
| npm trusted publishing | npm `>=11.5.1`, Node `>=22.14`, cloud-hosted GitHub runner | Selected npm 11.18 and Node 24 meet the requirement. Public repository and exact `repository` metadata are required for automatic provenance. |

## Sources

- [Convex component authoring](https://docs.convex.dev/components/authoring) — component structure, build ordering, app-level auth boundary, entry points, single-package resolution, and testing (MEDIUM, official docs cross-checked with template).
- [Official Convex component template package](https://github.com/get-convex/templates/blob/main/template-component/package.json) — current scripts, exports, peers, TypeScript/Vite/Vitest choices, and single-manifest layout (MEDIUM, official repository).
- [Using and testing Convex components](https://docs.convex.dev/components/using) and [convex-test](https://docs.convex.dev/testing/convex-test) — test registration, Vitest 4 projects, and mock limitations (MEDIUM, official docs plus npm metadata).
- [Convex Auth](https://docs.convex.dev/auth/convex-auth), [Convex with Clerk](https://docs.convex.dev/auth/clerk), and [Convex Better Auth for React](https://labs.convex.dev/better-auth/framework-guides/react) — provider versions/capabilities and app-owned integration boundaries (MEDIUM; official docs, Convex Auth is beta).
- [shadcn registry getting started](https://ui.shadcn.com/docs/registry/getting-started), [registry item schema](https://ui.shadcn.com/docs/registry/registry-item-json), and [Tailwind v4 support](https://ui.shadcn.com/docs/tailwind-v4) — source registry, static build, dependencies, Tailwind/React path (MEDIUM, official docs plus npm metadata).
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8), [React 19.2](https://react.dev/blog/2025/10/01/react-19-2), and [Node release status](https://nodejs.org/en/about/previous-releases) — current frontend/runtime baselines (MEDIUM, official release documentation plus npm metadata).
- [VitePress stable documentation](https://vitepress.dev/guide/getting-started) — nested docs structure and stable/next status (MEDIUM, official docs; v2 remains alpha).
- [Convex on Vercel](https://docs.convex.dev/production/hosting/vercel) and [`convex deploy`](https://docs.convex.dev/cli/reference/deploy) — production and preview deployment flow (MEDIUM, official docs).
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [npm provenance](https://docs.npmjs.com/generating-provenance-statements/) — Node/npm requirements, OIDC permissions, and automatic provenance (MEDIUM, official docs).
- npm registry metadata queried 2026-07-14 — exact versions, engines, and peer ranges for all named packages (MEDIUM; authoritative registry metadata but fast-moving).

---
*Stack research for: Afferent Convex component and React UI ecosystem*
*Researched: 2026-07-14*
