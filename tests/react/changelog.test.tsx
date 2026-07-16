import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { useMutation, usePaginatedQuery, useQuery } = vi.hoisted(() => ({
  useMutation: vi.fn(),
  usePaginatedQuery: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("convex/react", () => ({ useMutation, useQuery }));
vi.mock("convex-helpers/react", () => ({ usePaginatedQuery }));

import {
  AfferentProvider,
  type AfferentBindings,
  mapChangelogEntryState,
  mapChangelogFeedState,
  useChangelogEditor,
  useChangelogEntry,
  useChangelogFeed,
} from "../../src/react/index.js";

const bindings = {
  public: { listFeedback: { _type: "query" } },
  changelog: {
    listPublished: { _type: "query", name: "listPublished" },
    getPublishedBySlug: { _type: "query", name: "getPublishedBySlug" },
  },
  admin: {
    capability: { _type: "query" },
    createChangelogDraft: { _type: "mutation" },
    editChangelog: { _type: "mutation" },
    setChangelogLinks: { _type: "mutation" },
    publishChangelog: { _type: "mutation" },
    unpublishChangelog: { _type: "mutation" },
  },
} as unknown as AfferentBindings;

function Probe() {
  const feed = useChangelogFeed();
  const entry = useChangelogEntry("summer-release");
  const editor = useChangelogEditor();
  return (
    <output>
      {JSON.stringify({
        feed: feed.status,
        entry: entry.status,
        editor: editor.status,
      })}
    </output>
  );
}

describe("headless changelog hooks", () => {
  beforeEach(() => {
    useMutation.mockReset();
    usePaginatedQuery.mockReset();
    useQuery.mockReset();
    useMutation.mockReturnValue(vi.fn());
  });

  test("maps helper pagination and public slug lookup states", () => {
    const results = [{ id: "entry-1" }];
    const loadMore = vi.fn();
    const feed = mapChangelogFeedState({
      results,
      status: "CanLoadMore",
      loadMore,
    });
    expect(feed).toMatchObject({
      status: "ready",
      items: results,
      canLoadMore: true,
    });
    expect(feed.items).toBe(results);
    feed.loadMore();
    expect(loadMore).toHaveBeenCalledWith(20);
    expect(mapChangelogEntryState(undefined, true)).toMatchObject({
      status: "loading",
    });
    expect(
      mapChangelogEntryState(
        { contractVersion: 1, status: "notFound" },
        true,
      ),
    ).toMatchObject({ status: "notFound" });
  });

  test("uses injected refs and exposes explicit unsupported/async states", () => {
    usePaginatedQuery.mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    useQuery.mockReturnValue({ contractVersion: 1, status: "notFound" });
    const markup = renderToStaticMarkup(
      <AfferentProvider
        bindings={bindings}
        auth={{ status: "authenticated", sessionGeneration: "actor-a" }}
      >
        <Probe />
      </AfferentProvider>,
    );
    expect(markup).toContain('&quot;feed&quot;:&quot;empty&quot;');
    expect(markup).toContain('&quot;entry&quot;:&quot;notFound&quot;');
    expect(markup).toContain('&quot;editor&quot;:&quot;ready&quot;');

    const unsupported = renderToStaticMarkup(
      <AfferentProvider
        bindings={{ public: bindings.public } as AfferentBindings}
        auth={{ status: "unauthenticated" }}
      >
        <Probe />
      </AfferentProvider>,
    );
    expect(unsupported).toContain('&quot;feed&quot;:&quot;unsupported&quot;');
    expect(unsupported).toContain('&quot;entry&quot;:&quot;unsupported&quot;');
    expect(unsupported).toContain('&quot;editor&quot;:&quot;unsupported&quot;');
  });
});
