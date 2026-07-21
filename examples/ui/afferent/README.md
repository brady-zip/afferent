# Afferent copied UI

These files are source-owned shadcn-compatible React components. Install the packed `afferent`
package first, then add the feature items you need from the generated local registry. Each feature
item declares `./afferent-ui-core.json` explicitly; copy and restyle the resulting files in your
application.

## Host adapter

Mount `AfferentProvider` and `AfferentUiProvider` from a host-owned client module. Pass generated
function references to the headless provider and provide real `href.post`, `href.roadmap`, and
`href.changelog` builders, an optional router-aware `Link`/`navigate`, and the stable
`currentLocation`. Do not pass identity, admin permission, or scope from the browser.

The default link adapter renders real anchors. Router integration remains host-owned and must stay
inside a safe client boundary; copied components never import a router or inspect browser globals.

## Restyling and copy

Override standard shadcn-style CSS variables in `afferent.css` for color, radius, typography, and
focus presentation. `AfferentUiProvider` deep-merges per-screen copy overrides and accepts icon
slots, so adopters can change language and visual vocabulary without forking behavior hooks.

Hosts are responsible for preserving text/non-text contrast and visible focus after theme, icon,
or token overrides. Validate overrides at phone, tablet, desktop, 200% zoom, forced colors, and
reduced motion.

## Client-only boundary and SEO

Hook-consuming screens are explicit client components with deterministic loading, authentication,
empty, and ready shells. Version 1 has no SSR initial-data API, so content populated after the
client hooks run has the normal client-only SEO limitation. A future additive initial-data contract
can improve server-rendered content without changing the copied component names, but no such API is
available today. Do not invent serialized hook state or read time, randomness, media, location, or
other browser globals during render.
