# Phase 4 distribution pivot: source release without npm publication

**Approved:** 2026-08-07
**Status:** Locked
**Decision:** `npm=remove-from-v1`

## User decision

Afferent v1 will not claim an npm package name, configure npm trusted
publishing, or publish any package version to the npm registry. The public v1
release consists of the Apache-2.0 source tag plus matching static shadcn
registry and versioned documentation.

This is a v1 scope change, not a temporary deferral. Future npm-registry
distribution requires a new milestone decision and must not be inferred from
the existence of a packable `package.json`.

## Preserved deliverables and gates

- The component remains an installable npm-format artifact built from the exact
  tagged source with `npm pack`.
- Clean Vite/Convex fixtures must install that local tarball, resolve every
  compiled export and declaration, run Convex code generation, typecheck, and
  build without repository-relative imports.
- The static shadcn registry and documentation remain public, versioned release
  surfaces synchronized with the same source tag and release manifest.
- Registry installation documentation must require the locally built tarball
  before copied UI source whose imports reference `afferent`.
- The clone-and-run local demo and complete real-Convex Phase 4 browser,
  isolation, lifecycle, and accessibility gates remain release-blocking.
- Canonical GitHub ownership, employer/IP authorization, source tag, Pages
  configuration, and public release actions remain human-owned checkpoints.
- `refs/h5i/*` remain private unless separately inspected and authorized.

## Removed deliverables and infrastructure

- Public npm package or npm package URL
- npm package-name claim or bootstrap placeholder
- npm account authentication, 2FA ceremony, trusted-publisher registration, or
  `npm-production` environment
- `npm publish`, `npm stage publish`, npm OIDC, registry-signature audit, or npm
  provenance assertions
- Public npm metadata, tarball-download, or install-from-registry verification
- Any public tarball release asset; the packed artifact is local verification
  evidence, not a separate distribution channel

## Safety invariants

- The root package is marked `private: true` and has no `publishConfig`, making
  accidental npm publication fail closed while preserving `npm pack` and local
  tarball installation.
- Release workflow validation rejects npm publication jobs and commands.
- Release-facing documentation rejects `npm install afferent` and any unresolved
  npm release marker.
- The public Pages artifact contains documentation, registry JSON, and the
  release manifest; it never contains the local package tarball.
- A source/Pages release cannot be called complete unless the exact tag, Pages
  deployment, registry, docs, manifest, and tagged local acceptance evidence all
  agree.

## Requirement migration

- `COMP-01` (install from a published npm package) is removed from v1 rather
  than reinterpreted or marked complete.
- `QUAL-03` remains complete and owns clean-consumer installation from the
  locally packed artifact.
- `QUAL-10` applies to repository source and the packed artifact.
- `QUAL-11` now requires an immutable source release with synchronized registry
  and documentation versions plus checksum-bound local tarball evidence.

## Plan impact

- Completed Plans 04-01 through 04-08 remain historical evidence. Their local
  pack, manifest, CI, demo, documentation, and static-site work is preserved.
- Plan 04-09 is revised in place because it has not executed. It removes the npm
  path, hardens the no-publication guard, publishes only source/registry/docs,
  and records exact public and tagged-local evidence.

