---
layout: home

hero:
  name: Afferent
  text: Product feedback that stays in your Convex application
  tagline: >-
    A reusable component, framework-light React bindings, and source-owned
    shadcn interfaces for feedback, roadmap, changelog, and administration.
  actions:
    - theme: brand
      text: Install Afferent
      link: /guide/install
    - theme: alt
      text: Run the local demo
      link: /guide/local-demo

features:
  - title: Native ownership
    details: Feedback data lives in your Convex deployment, not another SaaS.
  - title: Host-owned authority
    details: Your wrappers resolve identity and admin permission on every call.
  - title: Own the interface
    details: Use headless React hooks or copy accessible shadcn source.
---

## Choose a path

- Evaluating Afferent? [Run the complete local demo](./guide/local-demo.md).
- Adding it to an application? [Install the package](./guide/install.md), then
  [mount the component and trusted wrappers](./guide/mount.md).
- Choosing an auth provider or UI layer? The provider, headless, registry, and
  operations sections contain the complete adopter recipes.

The v0.1 release uses explicit `AFFERENT_RELEASE_*_URL` markers until the
package, static registry, documentation, and source tag have been published and
verified from one immutable release candidate.
