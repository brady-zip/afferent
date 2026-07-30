# Customize copied UI

The registry UI is intentionally source-owned. Prefer its stable adapter, copy,
icon, and CSS-token seams first; edit the copied components when application
requirements go beyond them.

## Host navigation and presentation

Wrap copied screens in `AfferentUiProvider`:

```tsx
import { AfferentUiProvider } from "@/components/afferent/core/afferent-ui-provider";
import { AfferentBoardScreen } from "@/components/afferent/board/board-screen";

export function FeedbackPage() {
  return (
    <AfferentUiProvider
      href={{
        post: (id) => `/feedback/${id}`,
        roadmap: (boardId) =>
          boardId ? `/roadmap?board=${boardId}` : "/roadmap",
        changelog: (slug) => `/changelog/${slug}`,
      }}
      currentLocation="/feedback"
    >
      <AfferentBoardScreen />
    </AfferentUiProvider>
  );
}
```

The default `Link` emits real anchors. Supply a router-aware `Link` and optional
`navigate` callback inside your application's client boundary. Keep
`currentLocation` stable and explicit; copied components do not inspect browser
globals or import a router.

`AfferentUiProvider` also accepts:

- a deep `copy` override for labels, guidance, and formatter functions;
- partial `icons` slots for create, error, loading, comments, votes, and
  disclosure;
- route builders through `href`.

None of these presentation props grants identity, admin permission, or scope.

## Theme tokens

Import the copied `components/afferent/afferent.css` and map its standard
shadcn-style variables into your theme:

```css
:root {
  --background: #ffffff;
  --foreground: #18181b;
  --primary: #1d4ed8;
  --primary-foreground: #ffffff;
  --muted: #f4f4f5;
  --muted-foreground: #52525b;
  --border: #71717a;
  --ring: #1d4ed8;
  --destructive: #b91c1c;
  --radius: 8px;
  --font-sans: ui-sans-serif, system-ui, sans-serif;
}
```

## Preserve accessibility

Customization inherits the WCAG 2.2 AA release bar. Recheck text and non-text
contrast, keyboard order, visible focus, labels, live announcements, dialog
focus restoration, and touch targets. Test phone, tablet, desktop, 200% zoom,
reduced motion, and forced colors. A color or icon override must not be the only
way state or meaning is communicated.

The v0.1 screens are client components and have no server-rendered initial-data
contract. Preserve deterministic loading and error shells; do not invent
serialized hook state or read time, randomness, location, or media during
render.
