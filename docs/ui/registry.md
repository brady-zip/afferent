# Copy-owned UI registry

Afferent publishes shadcn-compatible source files in a static registry. Install
the `afferent` package first, then copy only the feature blocks you need. The
files become application source: review, edit, test, and version them with the
host application.

## Generated artifacts

The repository catalog is `registry/registry.json`. Generated install artifacts
live under `registry/r/`, including one JSON file per item and
`registry/r/registry.json`. The release base is
`AFFERENT_RELEASE_REGISTRY_URL`.

| Item                     | Purpose                                 |
| ------------------------ | --------------------------------------- |
| `afferent-ui-core`       | provider, navigation seam, copy, tokens |
| `afferent-board`         | public board, detail, and discussion    |
| `afferent-admin`         | moderation, tags, merge, and publishing |
| `afferent-roadmap`       | status-driven public roadmap            |
| `afferent-changelog`     | public changelog feed and entry         |
| `afferent-notifications` | notification list and popover           |

Every feature item declares `afferent-ui-core` as a registry dependency, so the
shared layer is installed with it.

## Install blocks

From a configured shadcn application:

```sh
npx shadcn@4.11.0 add AFFERENT_RELEASE_REGISTRY_URL/r/afferent-board.json
npx shadcn@4.11.0 add AFFERENT_RELEASE_REGISTRY_URL/r/afferent-roadmap.json
npx shadcn@4.11.0 add AFFERENT_RELEASE_REGISTRY_URL/r/afferent-changelog.json
```

Add `afferent-admin` and `afferent-notifications` only where their host bindings
are present. Generated targets use `components/afferent/**`; change the alias
or move files using the normal shadcn workflow if your application differs.

Mount `AfferentProvider` from the package and `AfferentUiProvider` from the
copied core source. Import the copied `afferent.css`, supply host-owned route
builders, and render the copied screen component.

## Update without losing ownership

Registry installation is not a runtime dependency. When upgrading:

1. update the `afferent` package;
2. fetch the matching registry item JSON;
3. review the diff against your copied source;
4. reconcile intentional application customizations;
5. rerun type, interaction, accessibility, and responsive tests.

Do not overwrite copied files blindly. Package hooks and copied UI versions are
released together, but your source edits remain your responsibility.

## Accessibility is part of ownership

The canonical source is WCAG 2.2 AA-oriented and includes labeled controls,
live regions, visible focus, dialog focus recovery, reduced-motion handling,
forced-colors handling, and responsive states. After changing markup, copy,
tokens, icons, navigation, or layout, the adopting application must verify
those obligations again.

See [customization](./customization.md) for the stable seams.
