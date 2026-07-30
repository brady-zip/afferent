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

Install the package in the consuming application:

```sh
npm install afferent
```

Before public publication, the documentation verifier replaces that registry
request with the exact locally packed tarball. The immutable npm release link
remains `AFFERENT_RELEASE_NPM_URL` until release verification.

## Public package surfaces

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
