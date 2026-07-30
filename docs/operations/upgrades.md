# Upgrade Afferent

A release can change the package, generated static registry, copied UI source,
and component data contract together. Review all four before promoting an
upgrade.

## Read release evidence

Start with the repository changelog generated from Changesets. Note package
version, compatibility ranges, DTO or intent-validator changes, migration
instructions, registry changes, and known limitations.

The npm package and registry must come from the same release. Do not combine a
new package with an older registry snapshot merely because the copied source
still typechecks.

## Upgrade in preview

1. Update `afferent` and regenerate the host's Convex references.
2. Fetch the matching registry item versions.
3. Diff each item against the application's copied source.
4. Reapply or revise intentional copy, styling, routing, and component changes.
5. Run typechecks, packed-consumer tests, auth-provider tests, two-user
   isolation, responsive interaction, and accessibility checks.
6. Apply any documented component migration to the preview deployment and
   verify bounded reads and writes before production.

Copied source is application code. Never overwrite it without review, and do
not assume a registry update can preserve local edits automatically.

## Contract and migration boundaries

Versioned DTOs and narrow intent operations are the public integration
contract. Treat a removed export, validator change, or incompatible DTO field
as a semver concern even when component documents can still be read. Provider
records and raw component documents are not migration APIs.

Data migrations run through documented, authorized component operations. Back
up or otherwise retain the recovery mechanism appropriate for the host Convex
deployment before a destructive migration. Do not write directly to isolated
component tables from browser or host application code.

## Rollback

Rollback must keep these layers compatible:

- the previous npm package and generated host references;
- the previous reviewed copied-source snapshot;
- the corresponding registry release;
- the component schema/data state supported by that package.

If a migration is backward-compatible, restore the previous package and
frontend together. If it is not, follow the release's explicit reverse
migration or restore the host deployment using its planned recovery mechanism.
Never roll back only the browser bundle while leaving incompatible host
wrappers or component data in place.
