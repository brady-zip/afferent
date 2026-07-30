# Headless React

The `afferent/react.js` entry point supplies typed bindings, an
`AfferentProvider`, and hooks. It renders nothing by itself. Your host
application owns routes, markup, copy, styling, and the generated function
references passed to the provider.

## Build bindings from host wrappers

Expose narrow Convex functions in the host application, run Convex code
generation, and map those generated function references to
`AfferentBindings`. The packed consumer fixture at
`fixtures/packed-vite-convex/src/App.tsx` exercises the complete binding map.
A minimal map has this shape:

<!-- afferent-docs: typescript mode=syntax-only context=headless-bindings -->

```ts
import type { AfferentBindings } from "afferent/react.js";

import { api } from "../convex/_generated/api.js";

export const afferentBindings = {
  public: {
    listFeedback: api.afferent.listFeedback,
    listComments: api.afferent.listComments,
    getPost: api.afferent.resolvePost,
    searchFeedback: api.afferent.searchFeedback,
    suggestSimilarPosts: api.afferent.suggestSimilarPosts,
  },
  participation: {
    createPost: api.afferent.createPost,
    editPost: api.afferent.editPost,
    withdrawPost: api.afferent.withdrawPost,
    setVote: api.afferent.setVote,
    addComment: api.afferent.addComment,
  },
  roadmap: { listRoadmapGroup: api.afferent.listRoadmapGroup },
} satisfies AfferentBindings;
```

Bindings point to host wrappers, not directly to component internals. That is
where the host authenticates the actor and re-authorizes admin access.

## Mount the provider

<!-- afferent-docs: typescript mode=syntax-only context=headless-provider -->

```tsx
import { useConvex } from "convex/react";
import { AfferentProvider } from "afferent/react.js";
import type { ReactNode } from "react";

import { afferentBindings } from "./afferent-bindings.js";
import { useHostAuthState } from "./auth.js";

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const client = useConvex();
  const auth = useHostAuthState();

  return (
    <AfferentProvider bindings={afferentBindings} client={client} auth={auth}>
      {children}
    </AfferentProvider>
  );
}
```

`auth` is one of `loading`, `unauthenticated`, or `authenticated` with a
non-empty `identityToken`. The token is a host-owned identity-generation key:
changing it invalidates subscriptions and pending UI from the previous viewer.
It is not sent to the component as authority.

## Consume closed hook states

<!-- afferent-docs: typescript mode=syntax-only context=headless-hook -->

```tsx
import { useFeedbackFeed } from "afferent/react.js";

export function FeedbackList() {
  const feed = useFeedbackFeed({ order: "top" });
  if (feed.status === "loading") return <p>Loading feedback…</p>;
  if (feed.status === "empty") return <p>No feedback yet.</p>;
  if (feed.status === "error") {
    return <button onClick={feed.retry}>Retry feedback</button>;
  }
  return (
    <>
      <ul>
        {feed.items.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
      {feed.canLoadMore ? (
        <button disabled={feed.isLoadingMore} onClick={feed.loadMore}>
          Load more
        </button>
      ) : null}
    </>
  );
}
```

The package exports public feedback, search, comments, roadmap, changelog,
notifications, participation, moderation, tags, merge, and changelog-editor
hooks. Optional bindings produce an explicit `unsupported` state. Authenticated
surfaces distinguish loading, unauthenticated or not-authorized, empty, error,
and ready states; render each branch rather than treating missing data as
authority.

For a ready-made source layer over these hooks, use the
[static registry](./registry.md).
