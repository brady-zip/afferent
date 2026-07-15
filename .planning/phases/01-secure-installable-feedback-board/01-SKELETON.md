# Walking Skeleton — Afferent

**Phase:** 1
**Generated:** 2026-07-15

## Capability Proven End-to-End

A developer installs the packed Afferent artifact into a clean Vite/Convex consumer, mounts a trusted fixed-scope host wrapper, and uses one real UI interaction to create and then read a feedback post on a real board without resolving any repository source.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Vite 8 + React 19 consumer fixture | Matches the hosted-example direction while keeping the component and host client framework-light. |
| Data layer | Convex component with a component-local schema and generated `ComponentApi` | Preserves native Convex ownership and the isolated component boundary. |
| Auth | Host-owned resolver callbacks; the skeleton uses a trusted fixture actor and later slices exercise Convex Auth, Clerk, and Better Auth | The component cannot access host `ctx.auth`, so authority must be derived by host wrappers on every call. |
| Scope | Mandatory opaque `scopeId` on every row and scope-first index; normal clients inject one private fixed scope | Satisfies D-01 and D-02 without exposing multi-product tenancy in the consumer contract. |
| API contract | Narrow read, participation, and admin capabilities with validators, branded string IDs, and `contractVersion: 1` DTOs | Prevents component documents, provider records, and authority fields from crossing public boundaries. |
| Deployment target | Documented local full-stack run plus a current Convex dev/preview deployment gate | The package and cursor contracts require a real Convex proof before Phase 1 completes. |
| Directory layout | `src/component`, `src/client`, `fixtures`, `tests`, and `scripts` | Separates isolated domain code, trusted host bindings, consumers, verification, and release tooling. |

## Stack Touched in Phase 1

- [ ] Project scaffold — strict ESM TypeScript, build, lint/static checks, and Vitest
- [ ] Routing — the clean Vite fixture serves one feedback-board route
- [ ] Database — one real board/post write and one real post read through the component
- [ ] UI — a submit interaction calls a host-generated function reference and renders the returned post
- [ ] Deployment — `npm run test:backend` exercises the stack on a current Convex deployment; `npm run fixture:dev` documents local use

## Outside the Skeleton

The skeleton proves the first path only. Later Phase 1 slices add:

- multiple boards, authenticated-read policy, editing, withdrawal, actor refresh/anonymization, idempotent votes, flat comments, and bounded pagination;
- the server-only scope resolver and two-scope adversarial matrix;
- Convex Auth, Clerk, and Better Auth conformance fixtures and forged-authority rejection;
- the complete packed-artifact codegen, declaration, export-map, typecheck, build, `publint`, and ATTW gates.

Later roadmap phases add discovery/search, moderation, roadmap, changelog, notifications, headless React, copied shadcn interfaces, and the hosted showcase/sandbox lifecycle.

## Subsequent Slice Plan

- Phase 2: complete the feedback-to-roadmap-to-changelog workflow through provider-neutral headless APIs.
- Phase 3: deliver accessible, responsive, source-owned public and admin interfaces.
- Phase 4: publish the package, registry, documentation, immutable showcase, and isolated mutable sandbox.

