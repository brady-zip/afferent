# Release operations

Afferent releases are built and tested as immutable local candidates before any
public write. The repository prepares `afferent@0.1.0`, the static shadcn
registry, and the documentation as one checksum inventory. Publication is a
human-present Plan 04-09 operation; this runbook does not authorize a release by
itself.

The demo is not deployed. Release configuration never needs a Convex Cloud
project, a Convex deploy key, a Vercel project, or a remote browser target.

## Pending-confirmation release identities

Plan 04-08 prepared these fail-closed defaults. Plan 04-09 requires a human to
confirm them or deliberately revise the policy, metadata, workflow, tests, and
documentation together before any external write. The machine-readable defaults
live in `scripts/release-policy.mjs`:

| Surface            | Exact identity                           |
| ------------------ | ---------------------------------------- |
| npm package        | `afferent@0.1.0`                         |
| source repository  | `bradywatkinson/afferent`                |
| workflow           | `.github/workflows/release.yml`          |
| npm environment    | `npm-production`                         |
| static publication | GitHub Pages, environment `github-pages` |
| source tag         | `v0.1.0`                                 |
| Node               | `.node-version` (`22.22.2`)              |
| npm                | `11.15.0`                                |

The planned npm trusted publisher selects GitHub Actions, repository
`bradywatkinson/afferent`, workflow filename `release.yml`, environment
`npm-production`, and the explicit `npm publish` permission. Staged publishing
is not enabled.

The repository variables below are assertions, not credentials:

```text
AFFERENT_RELEASE_APPROVED_TAG=v0.1.0
AFFERENT_RELEASE_OWNER=bradywatkinson/afferent
AFFERENT_NPM_TRUSTED_PUBLISHER=bradywatkinson/afferent:release.yml:npm-production:allow-publish
AFFERENT_STATIC_PUBLICATION=github-pages
```

Protect `npm-production` with required reviewers. Configure Pages to use GitHub
Actions and retain the standard protected `github-pages` environment. Protect
the `v*` tag pattern so the tag cannot silently move to a different commit.

`package.json#repository` is the single declared repository identity. The
release verifier requires that declaration, the effective
`git remote get-url origin` destination (including any Git `insteadOf`
rewrite), `GITHUB_REPOSITORY`, the workflow ref, release variables, candidate,
CI run, and public npm metadata all agree. A missing or non-GitHub `origin`, or
any owner/repository mismatch, fails closed before publication.

## Public source and private h5i refs

An ordinary branch or tag push does not include `refs/h5i/*`. Keep those refs
out of the public repository by default: `refs/h5i/msg` and `refs/h5i/notes`
can contain internal agent messages and verbatim human prompts, while context,
objects, and snapshot refs can contain working traces. Do not run
`h5i share push` against the public remote unless a human separately inspects
and explicitly authorizes publishing that material. Source publication and h5i
trace publication are independent disclosure decisions.

## Version pull requests cannot publish

Pushes to `main` run the `version-pr` job. Its pinned Changesets action receives
only `version: npm run version:packages`; it has no `publish` input and no npm
credential. Changesets can therefore create or update a version pull request,
but the action cannot publish a package. The only public-package write is the
separate `publish-npm` job behind manual dispatch, the `allow_publish` input,
and approval of the `npm-production` environment.

## Candidate and artifact continuity

CI generates the candidate with:

```sh
npm run verify:release-candidate -- --local
```

The final candidate contains the tested tarball, generated registry, built
documentation, local demo build and provenance, release manifest, Phase 4
evidence, and `checksums.sha256`. The local gate must report
`backendKind: local-real-convex`, all six required suites complete, and the same
tarball digest as `candidate.json`.

The workflow pins `actions/upload-artifact@v7` and
`actions/download-artifact@v8`. GitHub's official download action documents
v8 consuming artifacts produced by upload v7, both by name and by immutable
artifact ID. The CI-to-release transfer uses the commit-qualified artifact name
and then verifies Afferent's inner file checksums, release manifest, source
commit, and Phase 4 evidence after download. See the official
[upload action](https://github.com/actions/upload-artifact/blob/main/README.md)
and
[download action](https://github.com/actions/download-artifact/blob/main/README.md).

Release jobs never rebuild or repack. The protected job publishes this exact
file:

```sh
npm publish "$RUNNER_TEMP/release-candidate/package/afferent-0.1.0.tgz" --access public --provenance
```

## First-package trusted-publisher bootstrap

npm trusted-publisher registration requires the package to exist first. npm's
[staged-publishing prerequisites](https://docs.npmjs.com/staged-publishing/)
also require an existing package, so staging cannot create the initial name.
The last read-only name check during Plan 04-08 returned `E404`; Plan 04-09
must recheck immediately because name availability can change.

Use this human-present order:

1. Create and push the exact public `bradywatkinson/afferent` repository with
   `.github/workflows/release.yml` already on `main`.
2. Recheck `npm view afferent name version repository --json`.
3. If it still returns `E404`, stop until the owner explicitly confirms the
   unscoped name. From an isolated temporary directory, create a minimal
   `afferent@0.0.0-bootstrap.0` package with the exact repository and
   Apache-2.0 metadata, then publish interactively with two-factor approval
   using `npm publish --tag bootstrap --access public`. Never use the `latest`
   tag for this placeholder.
4. Immediately deprecate `afferent@0.0.0-bootstrap.0` as a bootstrap-only
   placeholder.
5. While interactively authenticated with npm 11.15.0 or newer, register the
   trusted publisher:

   ```sh
   npm trust github afferent --repo bradywatkinson/afferent --file release.yml --env npm-production --allow-publish
   ```

6. Configure the protected GitHub environments, repository variables, Pages,
   branch rules, and tag rules. Run
   `npm run verify:release-candidate -- --external-config`; any mismatch must
   fail.
7. Create protected tag `v0.1.0` on the exact CI-tested commit, then manually
   dispatch `release.yml` with its successful CI run ID, 40-character commit,
   tag, and `allow_publish=true`.

The bootstrap prerelease is an explicit ownership exception. It receives no v1
provenance claim, is never treated as a successful v1 release, and cannot
satisfy COMP-01 or QUAL-11. Provenance, public checksum, registry,
documentation, and release-success assertions begin with `0.1.0`.

## Dependency order and verification

The protected workflow is strictly ordered:

1. Verify external configuration, CI run identity, candidate checksums, tag,
   commit, and clean checkout.
2. Publish the exact tarball with npm OIDC trusted publishing and provenance.
3. Download the public npm tarball and require its SHA-256 to match the
   candidate.
4. Install the public package and run `npm audit signatures`, which verifies npm
   registry signatures and provenance attestations.
5. Only then assemble and publish the candidate's registry and docs through
   GitHub Pages.

GitHub-hosted runners, Node `>=22.14.0`, npm `>=11.5.1`, exact repository
metadata, `id-token: write`, the protected environment, and public repository
visibility are all required by npm trusted publishing. The workflow pins npm
11.15.0 and explicitly prints both runtime versions before publication. It does
not store a reusable npm publishing credential.

## Failure and rerun boundaries

- A missing variable, environment approval, package ownership check, trusted
  publisher, Pages setting, tag, CI artifact, or OIDC request URL stops before
  `npm publish`.
- A public tarball or provenance failure prevents Pages publication.
- npm versions are immutable. If `afferent@0.1.0` exists with different bytes,
  do not retry or overwrite it; stop and investigate.
- If npm succeeded and Pages failed, rerun only after confirming the public npm
  checksum and provenance. The npm job will refuse a duplicate version, so the
  recovery must preserve evidence and resume downstream rather than republish.
- Never edit release evidence to make a failed or skipped job appear complete.

After publication, Plan 04-09 records the exact workflow run, source commit,
tag, npm provenance, tarball digest, registry/docs URLs, and tagged local Phase
4 completion markers in the versioned release evidence.
