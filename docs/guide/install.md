# Install Afferent

Afferent installs into an existing Convex + React application. The component
stores one product's feedback data in the host's Convex deployment. The host
application remains responsible for authentication, admin authorization,
routing, and external side effects.

## Compatibility

| Surface               | Supported v0.1 range                |
| --------------------- | ----------------------------------- |
| Convex                | `^1.42.2`                           |
| React                 | `^18.3.1` or `^19.0.0`              |
| Package module format | ESM                                 |
| Repository tools      | Node.js `>=22.14.0`, npm `>=11.5.1` |

## Build the v1 package locally

Afferent v0.1 is not published to npm. Clone the immutable `v0.1.0` tag from
`AFFERENT_RELEASE_REPOSITORY_URL`, enter that checkout, and build one local
tarball:

<!-- afferent-docs: shell mode=source-build context=adopter -->

```sh
npm ci
npm run build
npm pack --ignore-scripts
```

Install the resulting tarball from its absolute path in the consuming
application:

<!-- afferent-docs: shell mode=local-package-install context=adopter -->

```sh
npm install /absolute/path/to/afferent-0.1.0.tgz
```

Do not request the unscoped package name from npm: v1 deliberately has no npm
registry package. The release verifier builds and installs the same local
tarball in clean fixtures before publishing the matching registry and docs.

## Packed component surfaces

| Import                             | Purpose                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| `afferent`                         | fixed-scope client, validators, and versioned DTO types  |
| `afferent/react.js`                | provider, headless hooks, bindings, and closed UI states |
| `afferent/server.js`               | explicit server-only scoped client and delivery APIs     |
| `afferent/adapters/convex-auth.js` | Convex Auth actor normalization                          |
| `afferent/adapters/clerk.js`       | Clerk identity normalization                             |
| `afferent/adapters/better-auth.js` | Better Auth actor normalization                          |
| `afferent/convex.config.js`        | Convex component definition                              |
| `afferent/_generated/component.js` | generated `ComponentApi` declarations                    |
| `afferent/test`                    | compiled testing-only registration helpers               |

The regular `createAfferentClient` fixes the installation to one server-owned
scope. Do not accept `scopeId` from a browser or use
`createScopedAfferentClient` to model products or organizations.

## Continue the integration

1. [Mount the component and generate references](./mount.md).
2. Choose the Convex Auth, Clerk, or Better Auth host-wrapper recipe.
3. Expose only the public-read, authenticated-participation, and authorized-admin
   functions your frontend needs.
4. Use `afferent/react.js` for a custom interface, or install the matching
   version of the source-owned UI from `AFFERENT_RELEASE_REGISTRY_URL`.

The component cannot read host `ctx.auth`. Every host function must derive the
current actor and re-authorize admin access for that call.
