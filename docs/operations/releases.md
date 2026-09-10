# Release operations

Afferent v0.1 is a public source and static-site release. It does not claim an
npm package name, configure npm trusted publishing, or publish a package
tarball. The installable package remains a locally built, checksum-bound test
artifact derived from the exact source tag.

The demo is not deployed. Release configuration never needs a Convex Cloud
project, Convex deploy key, Vercel project, or remote browser target.

## Locked distribution policy

The human-approved 2026-08-07 distribution pivot is encoded in
`scripts/release-policy.mjs` and
`.planning/milestones/v1.0-phases/04-hosted-production-release/04-DISTRIBUTION-PIVOT.md`.

| Surface                   | Exact v0.1 policy                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Package publication       | None; local `npm pack` evidence only                                                |
| Source repository         | `brady-zip/afferent`, declared by `package.json`; publication authorized 2026-09-10 |
| Source publication        | Immutable GitHub tag `v0.1.0`                                                       |
| Workflow                  | `.github/workflows/release.yml`                                                     |
| Static publication        | GitHub Pages, environment `github-pages`                                            |
| Documentation             | `https://brady-zip.github.io/afferent/`                                             |
| shadcn registry           | `https://brady-zip.github.io/afferent`                                              |
| Source/tag entry point    | `https://github.com/brady-zip/afferent`                                             |
| Node                      | `.node-version` (`22.22.2`)                                                         |
| npm CLI for source builds | `11.15.0`                                                                           |

The root `package.json` is deliberately `private: true` and has no
`publishConfig`. Changesets may update the private source version and changelog,
but the workflow has no package-publish input, job, permission, environment, or
credential. A future npm distribution path requires a new milestone decision;
it must not be inferred from the package name or the ability to run `npm pack`.

## Authorized external release boundary

On 2026-09-10, the owner explicitly confirmed IP/open-source authority and
authorized the following v0.1.0 publication scope:

1. Publish `brady-zip/afferent` as public Apache-2.0 source, with confirmed
   employer/open-source/IP authority.
2. Create or update the repository, push `main`, create the
   protected `v0.1.0` tag, run the release workflow, and publish GitHub Pages.
3. Configure Actions permissions, tag protection, and the protected
   `github-pages` environment at `https://brady-zip.github.io/afferent/`.
4. Keep `refs/h5i/*` private. Publishing those refs requires separate inspection
   and explicit authorization.

Future releases require their own publication authorization before external
writes; the v0.1.0 approval does not authorize a different release or destination.

The repository variables below are assertions, not credentials:

| Variable                        | Required value                          |
| ------------------------------- | --------------------------------------- |
| `AFFERENT_RELEASE_APPROVED_TAG` | `v0.1.0`                                |
| `AFFERENT_RELEASE_OWNER`        | Exact confirmed GitHub owner/repository |
| `AFFERENT_STATIC_PUBLICATION`   | `github-pages`                          |

`package.json#repository` is the declared repository identity. The release
verifier requires that declaration, every effective origin fetch and push
destination (including explicit `pushurl`, Git `insteadOf`, and `pushInsteadOf`
rewrites), `GITHUB_REPOSITORY`, workflow
ref, repository visibility, release owner, CI run, candidate, and source tag to
agree. A missing or non-GitHub origin, private repository, or owner mismatch
fails closed before release.

No npm account, package-name availability check, bootstrap version, 2FA step,
trusted publisher, package environment, registry credential, OIDC package
permission, signature audit, or provenance assertion belongs in this release.

## Public source and private h5i refs

An ordinary branch or tag push does not include `refs/h5i/*`. Keep those refs
out of the public repository by default: `refs/h5i/msg` and `refs/h5i/notes`
can contain internal agent messages and verbatim human prompts, while context,
objects, and snapshot refs can contain working traces. Do not run
`h5i share push` against the public remote unless a human separately inspects
and explicitly authorizes that disclosure. Source publication and h5i trace
publication are independent decisions.

## Version pull requests cannot release artifacts

Pushes to `main` run only the `version-pr` job. Its pinned Changesets action
receives `version: npm run version:packages`, has no publish input, and does not
create GitHub releases. Changesets can therefore create or update a source
version pull request but cannot publish a package or deploy Pages.

## Candidate and artifact continuity

CI builds the release candidate with the repository's
`verify:release-candidate` script. The candidate contains:

- the locally packed `afferent-0.1.0.tgz` used only for verification;
- generated registry JSON;
- built documentation;
- the local demo build and provenance record;
- the release manifest, Phase 4 evidence, and checksum inventory.

The local gate must report `backendKind: local-real-convex`, all six required
suites complete, and the same local tarball digest as `candidate.json`.
Clean-package, publint, ATTW, documentation, registry, and demo gates all reuse
that one tarball.

The workflow pins `actions/upload-artifact@v7` and
`actions/download-artifact@v8`. The CI-to-release transfer uses a
commit-qualified artifact name, validates the selected successful `ci.yml`
push on `main`, and verifies all inner checksums after download. Release jobs do
not rebuild or repack.

The preserved candidate is a short-lived authenticated Actions artifact. It is
not attached to a GitHub release and is never copied into the Pages site.

## Source and static publication order

The protected workflow is strictly ordered:

1. `release-readiness` validates external GitHub configuration, selected CI run,
   candidate checksums, clean checkout, exact source commit, and protected tag.
2. `prepare-static` downloads that preserved candidate and assembles only the
   checksum-matched registry, documentation, release manifest, and public
   release metadata.
3. `publish-static` deploys the prepared artifact through the protected
   `github-pages` environment.
4. `verify-static` downloads the same candidate and compares every public
   registry/manifest byte plus release metadata and docs index against it. It
   also verifies that no tarball exists at the public package paths.

The workflow dispatch input is `allow_release=false` by default. It may be set
to true only after the human checkpoint. The protected tag must already point
to the exact successful CI commit; the workflow never creates or moves it.

The Pages site contains documentation at its root, `registry.json`, generated
items under `r/`, `release-manifest.json`, and `release.json`. `release.json`
labels the package digest as `localPackage` and declares
`packagePublication: none`. No `.tgz` file or `package/` directory is permitted.

## Adopter installation boundary

Adopters clone the immutable source tag, install the pinned repository
dependencies, build, and run `npm pack --ignore-scripts`. They install the
resulting absolute tarball path into their Convex application before adding the
matching public registry source. Release-facing documentation must never imply
that requesting the unscoped package name from the npm registry works in v0.1.

This source-build path preserves the same exported JavaScript, declarations,
license, component config, and clean-fixture proof that a registry package would
have supplied without creating a public package channel.

## Failure and rerun boundaries

- A missing owner, public visibility, IP authorization, variable, Pages
  setting, tag, CI artifact, or environment approval stops before any public
  write.
- A source tag mismatch or dirty checkout stops before Pages preparation.
- A checksum or local-package gate failure invalidates the candidate; do not
  edit evidence or rebuild in a downstream job.
- If Pages deployment fails, rerun only after confirming the tag and candidate
  are unchanged.
- If public verification fails, preserve the failed state and investigate the
  deployed bytes; do not move the tag or rewrite release evidence.
- Never attach the local tarball, add a package-publish job, authenticate to npm,
  or make a skipped check appear complete.

After publication, Plan 04-09 records the exact workflow run, source commit,
tag, local package digest, registry digest, public source/registry/docs URLs,
no-npm disposition, and tagged local Phase 4 completion markers in
`docs/releases/0.1.0.md`.
