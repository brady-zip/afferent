# Deploy a consuming application

Afferent does not operate a shared service or public demo deployment. You deploy
your own host application, Convex component instance, authentication
configuration, and frontend on your chosen frontend platform.

## Separate preview and production

Keep each environment's authority and data independent:

| Concern            | Preview                                   | Production                              |
| ------------------ | ----------------------------------------- | --------------------------------------- |
| Convex deployment  | preview or development deployment         | production deployment                   |
| Auth configuration | preview issuer, keys, and callback URLs   | production issuer, keys, and callbacks  |
| Frontend variables | preview Convex URL and public auth values | production Convex URL and public values |
| Afferent data      | preview component instance                | production component instance           |

Mount the component and run Convex code generation in the host repository for
each environment. Configure the installation through an authorized host
function; never seed production with the local demo's showcase or sandbox
helpers.

## Deploy the host backend

The following is an adopter-owned account action. Run it only after selecting
the intended Convex team/project and reviewing the target shown by the CLI:

<!-- afferent-docs: shell mode=syntax-only context=adopter reason=adopter-account-required -->

```sh
npx convex deploy
```

Set authentication secrets and issuer configuration in the matching Convex
environment. Do not copy the local demo's generated `.env.local`, JWT private
key, JWKS, or anonymous backend state. Those values are ephemeral test
infrastructure.

## Deploy the frontend

Build the consuming application with that environment's Convex URL and the
public values required by its chosen auth provider, then deploy the build using
your chosen frontend platform. Afferent does not require one frontend vendor,
account identifier, domain, or routing product.

Keep server secrets out of frontend variables. The browser must never provide
`userId`, `isAdmin`, or `scopeId`; deployed host wrappers resolve identity and
admin membership again on every invocation.

## Production checklist

- package and registry items come from the same verified release;
- the host's generated function references match the deployed Convex backend;
- public browsing and authenticated-write policy match the installation;
- every admin wrapper queries production-owned membership;
- indexes, bounded pagination, two-user isolation, and accessible copied UI
  have passed in a production-like preview;
- rollback artifacts and the previous compatible frontend build are retained.

There is intentionally no Afferent-operated deployment to configure or depend
on.
