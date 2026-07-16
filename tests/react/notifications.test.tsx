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
  mapNotificationFeedState,
  useNotifications,
  usePostSubscription,
  useUnreadNotificationCount,
} from "../../src/react/index.js";

const bindings = {
  public: { listFeedback: { _type: "query" } },
  notifications: {
    getPostSubscription: { _type: "query" },
    setPostSubscription: { _type: "mutation" },
    listNotifications: { _type: "query" },
    getUnreadCount: { _type: "query" },
    markNotificationRead: { _type: "mutation" },
  },
} as unknown as AfferentBindings;

let subscriptionProbe: ReturnType<typeof usePostSubscription> | undefined;
let notificationsProbe: ReturnType<typeof useNotifications> | undefined;

function Probe() {
  subscriptionProbe = usePostSubscription("post:1" as never);
  notificationsProbe = useNotifications();
  const unread = useUnreadNotificationCount();
  return (
    <output>
      {JSON.stringify({
        subscription: subscriptionProbe.status,
        notifications: notificationsProbe.status,
        unread: unread.status,
      })}
    </output>
  );
}

describe("headless notification hooks", () => {
  beforeEach(() => {
    useMutation.mockReset();
    usePaginatedQuery.mockReset();
    useQuery.mockReset();
    useMutation.mockReturnValue(vi.fn());
    subscriptionProbe = undefined;
    notificationsProbe = undefined;
  });

  test("maps helper results directly without a parallel inbox cache", () => {
    const results = [{ id: "notification:1", read: false }];
    const loadMore = vi.fn();
    const mapped = mapNotificationFeedState({
      results,
      status: "CanLoadMore",
      loadMore,
    });
    expect(mapped).toMatchObject({
      status: "ready",
      items: results,
      canLoadMore: true,
    });
    expect(mapped.items).toBe(results);
    mapped.loadMore();
    expect(loadMore).toHaveBeenCalledWith(20);
  });

  test("exposes unsupported unauthenticated and authenticated states", () => {
    usePaginatedQuery.mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    useQuery
      .mockReturnValueOnce({ subscribed: true, explicitOptOut: false })
      .mockReturnValueOnce({ count: 0 });
    const authenticated = renderToStaticMarkup(
      <AfferentProvider
        bindings={bindings}
        auth={{ status: "authenticated", sessionGeneration: "actor-a" }}
      >
        <Probe />
      </AfferentProvider>,
    );
    expect(authenticated).toContain(
      "&quot;subscription&quot;:&quot;ready&quot;",
    );
    expect(authenticated).toContain(
      "&quot;notifications&quot;:&quot;empty&quot;",
    );

    const unauthenticated = renderToStaticMarkup(
      <AfferentProvider bindings={bindings} auth={{ status: "unauthenticated" }}>
        <Probe />
      </AfferentProvider>,
    );
    expect(unauthenticated).toContain("&quot;unread&quot;:&quot;unauthenticated&quot;");

    const unsupported = renderToStaticMarkup(
      <AfferentProvider
        bindings={{ public: bindings.public } as AfferentBindings}
        auth={{ status: "authenticated" }}
      >
        <Probe />
      </AfferentProvider>,
    );
    expect(unsupported).toContain("&quot;notifications&quot;:&quot;unsupported&quot;");
  });

  test("guards duplicate subscription mutations and reports expected failures", async () => {
    let resolveMutation: ((value: object) => void) | undefined;
    const mutation = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );
    useMutation.mockReturnValue(mutation);
    usePaginatedQuery.mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    useQuery
      .mockReturnValueOnce({ subscribed: false, explicitOptOut: false })
      .mockReturnValueOnce({ count: 0 });
    renderToStaticMarkup(
      <AfferentProvider bindings={bindings} auth={{ status: "authenticated" }}>
        <Probe />
      </AfferentProvider>,
    );
    const first = subscriptionProbe!.setSubscribed(true);
    await expect(subscriptionProbe!.setSubscribed(true)).resolves.toMatchObject({
      ok: false,
      error: { code: "VALIDATION" },
    });
    resolveMutation?.({ subscribed: true, explicitOptOut: false });
    await expect(first).resolves.toMatchObject({ ok: true });
    expect(mutation).toHaveBeenCalledTimes(1);
  });
});
