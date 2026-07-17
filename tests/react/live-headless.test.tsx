// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { getFunctionName, makeFunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  AfferentProvider,
  useAdminCapability,
  useChangelogEntry,
  useChangelogFeed,
  useFeedbackFeed,
  useFeedbackMutations,
  useFeedbackSearch,
  useNotifications,
  usePost,
  usePostActivity,
  usePostSubscription,
  useRoadmap,
  useSimilarPosts,
  useTags,
  useUnreadNotificationCount,
  type AfferentBindings,
  type AfferentAuthState,
} from "../../src/react/index.js";

type QueryRecord = {
  name: string;
  args: Record<string, unknown>;
  value: unknown;
  error?: unknown;
  listeners: Set<() => void>;
};

type Deferred = {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};

function deferred(): Deferred {
  let resolve!: (value: unknown) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

class ControlledWatchClient {
  records: QueryRecord[] = [];
  mutationCalls: Array<{
    name: string;
    args: Record<string, unknown>;
    options?: { optimisticUpdate?: (store: unknown, args: unknown) => void };
  }> = [];
  mutationQueue: Deferred[] = [];
  defaultError: unknown;
  resolver: (name: string, args: Record<string, unknown>) => unknown =
    defaultQueryValue;

  watchQuery(reference: unknown, args: Record<string, unknown> = {}) {
    const name = getFunctionName(reference as never);
    const record: QueryRecord = {
      name,
      args,
      value: this.resolver(name, args),
      error: this.defaultError,
      listeners: new Set(),
    };
    this.records.push(record);
    return {
      onUpdate: (listener: () => void) => {
        record.listeners.add(listener);
        return () => record.listeners.delete(listener);
      },
      localQueryResult: () => {
        if (record.error !== undefined) throw record.error;
        return record.value;
      },
      localQueryLogs: () => undefined,
      journal: () => undefined,
    };
  }

  mutation(
    reference: unknown,
    args: Record<string, unknown>,
    options?: { optimisticUpdate?: (store: unknown, args: unknown) => void },
  ) {
    this.mutationCalls.push({
      name: getFunctionName(reference as never),
      args,
      options,
    });
    const next = this.mutationQueue.shift();
    return next?.promise ?? Promise.resolve({ contractVersion: 1 });
  }

  matching(name: string, predicate = (_args: Record<string, unknown>) => true) {
    return this.records.filter(
      (record) => record.name === name && predicate(record.args),
    );
  }

  update(
    name: string,
    predicate: (args: Record<string, unknown>) => boolean,
    value: unknown,
  ) {
    const matches = this.matching(name, predicate);
    expect(matches.length).toBeGreaterThan(0);
    for (const record of matches) {
      record.error = undefined;
      record.value = value;
      for (const listener of [...record.listeners]) listener();
    }
  }

  fail(
    name: string,
    predicate: (args: Record<string, unknown>) => boolean,
    error: unknown,
  ) {
    const matches = this.matching(name, predicate);
    expect(matches.length).toBeGreaterThan(0);
    for (const record of matches) {
      record.error = error;
      for (const listener of [...record.listeners]) listener();
    }
  }

  failAll(error: unknown) {
    for (const record of this.records) {
      record.error = error;
      for (const listener of [...record.listeners]) listener();
    }
  }
}

const query = (name: string) =>
  makeFunctionReference<"query">(`headless:${name}`);
const mutation = (name: string) =>
  makeFunctionReference<"mutation">(`headless:${name}`);

const refs = {
  feed: query("feed"),
  post: query("post"),
  search: query("search"),
  similar: query("similar"),
  roadmap: query("roadmap"),
  changelogFeed: query("changelogFeed"),
  changelogEntry: query("changelogEntry"),
  subscription: query("subscription"),
  notifications: query("notifications"),
  unread: query("unread"),
  capability: query("capability"),
  activity: query("activity"),
  tags: query("tags"),
};

const bindings = {
  public: {
    listFeedback: refs.feed,
    getPost: refs.post,
    searchFeedback: refs.search,
    suggestSimilarPosts: refs.similar,
  },
  participation: {
    createPost: mutation("createPost"),
    editPost: mutation("editPost"),
    withdrawPost: mutation("withdrawPost"),
    setVote: mutation("setVote"),
    addComment: mutation("addComment"),
  },
  roadmap: { listRoadmapGroup: refs.roadmap },
  changelog: {
    listPublished: refs.changelogFeed,
    getPublishedBySlug: refs.changelogEntry,
  },
  notifications: {
    getPostSubscription: refs.subscription,
    setPostSubscription: mutation("setSubscription"),
    listNotifications: refs.notifications,
    getUnreadCount: refs.unread,
    markNotificationRead: mutation("markRead"),
  },
  admin: {
    capability: refs.capability,
    editPost: mutation("adminEdit"),
    movePost: mutation("movePost"),
    setPostStatus: mutation("setStatus"),
    setDiscussionLock: mutation("setLock"),
    setArchived: mutation("setArchived"),
    listPostActivity: refs.activity,
    listTags: refs.tags,
    createTag: mutation("createTag"),
    renameTag: mutation("renameTag"),
    setPostTag: mutation("setPostTag"),
    deleteTag: mutation("deleteTag"),
  },
} as unknown as AfferentBindings;

function page(items: Array<Record<string, unknown>>, overrides = {}) {
  return {
    contractVersion: 2,
    page: items,
    posts: items,
    isDone: true,
    continueCursor: "done",
    ...overrides,
  };
}

function defaultQueryValue(name: string) {
  if (name === "headless:feed") return page([]);
  if (name === "headless:post")
    return { contractVersion: 1, status: "notFound" };
  if (name === "headless:search" || name === "headless:similar")
    return { contractVersion: 1, items: [], hasMore: false };
  if (name === "headless:roadmap") return page([]);
  if (name === "headless:changelogFeed") return page([]);
  if (name === "headless:changelogEntry")
    return { contractVersion: 1, status: "notFound" };
  if (name === "headless:subscription")
    return { contractVersion: 1, subscribed: false, explicitOptOut: false };
  if (name === "headless:notifications") return page([]);
  if (name === "headless:unread") return { contractVersion: 1, count: 0 };
  if (name === "headless:capability") return true;
  if (name === "headless:activity") return page([]);
  if (name === "headless:tags") return { contractVersion: 1, tags: [] };
  return undefined;
}

class SentinelBoundary extends React.Component<
  { children: React.ReactNode },
  { error?: Error }
> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <output data-sentinel="threw">{this.state.error.message}</output>;
    }
    return this.props.children;
  }
}

let mutationProbe: ReturnType<typeof useFeedbackMutations> | undefined;
let feedProbe: ReturnType<typeof useFeedbackFeed> | undefined;

function AllHooksProbe() {
  const feed = useFeedbackFeed({ order: "newest" });
  const search = useFeedbackSearch({ query: "feedback", debounceMs: 0 });
  const similar = useSimilarPosts({ title: "feedback", debounceMs: 0 });
  const post = usePost("post:1" as never);
  const roadmap = useRoadmap();
  const changelog = useChangelogFeed();
  const entry = useChangelogEntry("release");
  const subscription = usePostSubscription("post:1" as never);
  const notifications = useNotifications();
  const unread = useUnreadNotificationCount();
  const capability = useAdminCapability();
  const activity = usePostActivity("post:1" as never);
  const tags = useTags();
  mutationProbe = useFeedbackMutations();
  feedProbe = feed;
  return (
    <output data-headless="state">
      {JSON.stringify({
        feed: feed.status,
        feedItems: feed.items.map((item) => item.id),
        search: search.status,
        similar: similar.status,
        post: post.status,
        planned: roadmap.groups.planned.status,
        inProgress: roadmap.groups.inProgress.status,
        complete: roadmap.groups.complete.status,
        changelog: changelog.status,
        entry: entry.status,
        subscription: subscription.status,
        notifications: notifications.status,
        notificationItems: notifications.items.map((item) => item.id),
        unread: unread.status,
        unreadCount: unread.count,
        capability: capability.status,
        activity: activity.status,
        tags: tags.status,
        pending: mutationProbe.pending,
        errors: mutationProbe.errors,
      })}
    </output>
  );
}

function renderHarness(client: ControlledWatchClient, auth: AfferentAuthState) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (nextAuth: AfferentAuthState) => {
    root.render(
      <ConvexProvider client={client as never}>
        <SentinelBoundary>
          <AfferentProvider
            {...({ bindings, auth: nextAuth, client } as never)}
          >
            <AllHooksProbe />
          </AfferentProvider>
        </SentinelBoundary>
      </ConvexProvider>,
    );
  };
  act(() => render(auth));
  return {
    container,
    rerender(nextAuth: AfferentAuthState) {
      act(() => render(nextAuth));
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function state(container: HTMLElement) {
  expect(container.querySelector("[data-sentinel='threw']")).toBeNull();
  const output = container.querySelector("[data-headless='state']");
  expect(output).not.toBeNull();
  return JSON.parse(output!.textContent ?? "{}");
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  mutationProbe = undefined;
  feedProbe = undefined;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("mounted non-throwing headless reads", () => {
  test("every public direct and paginated hook returns a typed initial error", async () => {
    const client = new ControlledWatchClient();
    client.defaultError = new Error("initial transport failure");
    const mounted = renderHarness(client, {
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    await act(async () => {});
    const snapshot = state(mounted.container);
    for (const key of [
      "feed",
      "search",
      "similar",
      "post",
      "planned",
      "inProgress",
      "complete",
      "changelog",
      "entry",
      "subscription",
      "notifications",
      "unread",
      "capability",
      "activity",
      "tags",
    ]) {
      expect(snapshot[key], key).toBe("error");
    }
    mounted.unmount();
  });

  test("every successful hook turns a reactive failure into state and recovers", async () => {
    const client = new ControlledWatchClient();
    const mounted = renderHarness(client, {
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    await act(async () => {});
    expect(state(mounted.container).capability).toBe("ready");
    act(() => client.failAll(new TypeError("network offline")));
    expect(state(mounted.container).feed).toBe("error");
    expect(state(mounted.container).capability).toBe("error");
    act(() => {
      for (const record of client.records) {
        client.update(
          record.name,
          (args) => args === record.args,
          defaultQueryValue(record.name),
        );
      }
    });
    expect(state(mounted.container).feed).toBe("empty");
    expect(state(mounted.container).capability).toBe("ready");
    mounted.unmount();
  });
});

describe("mounted ordered pagination", () => {
  test("retains earlier pages across a later failure, blocks duplicate loads, and recovers", async () => {
    const client = new ControlledWatchClient();
    client.resolver = (name, args) => {
      if (name !== "headless:feed") return defaultQueryValue(name, args);
      const cursor = (args.paginationOpts as { cursor: string | null }).cursor;
      if (cursor === null)
        return page([{ id: "one" }, { id: "two" }], {
          isDone: false,
          continueCursor: "page-2",
        });
      return undefined;
    };
    const mounted = renderHarness(client, {
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    await act(async () => {});
    expect(state(mounted.container).feedItems).toEqual(["one", "two"]);
    act(() => {
      feedProbe!.loadMore();
      feedProbe!.loadMore();
    });
    expect(
      client.matching(
        "headless:feed",
        (args) =>
          (args.paginationOpts as { cursor: string | null }).cursor ===
          "page-2",
      ),
    ).toHaveLength(1);
    act(() =>
      client.fail(
        "headless:feed",
        (args) =>
          (args.paginationOpts as { cursor: string | null }).cursor ===
          "page-2",
        new Error("later page failed"),
      ),
    );
    expect(state(mounted.container)).toMatchObject({
      feed: "error",
      feedItems: ["one", "two"],
    });
    act(() =>
      client.update(
        "headless:feed",
        (args) =>
          (args.paginationOpts as { cursor: string | null }).cursor ===
          "page-2",
        page([{ id: "three" }, { id: "four" }]),
      ),
    );
    expect(state(mounted.container)).toMatchObject({
      feed: "ready",
      feedItems: ["one", "two", "three", "four"],
    });
    mounted.unmount();
  });

  test.each(["SplitRecommended", "SplitRequired"] as const)(
    "atomically replaces a %s page with two exact ordered ranges",
    async (pageStatus) => {
      const client = new ControlledWatchClient();
      client.resolver = (name, args) => {
        if (name !== "headless:feed") return defaultQueryValue(name, args);
        const options = args.paginationOpts as {
          cursor: string | null;
          endCursor?: string;
        };
        if (options.endCursor === undefined)
          return page([{ id: "one" }, { id: "two" }], {
            continueCursor: "end",
            isDone: true,
            splitCursor: "middle",
            pageStatus,
          });
        return undefined;
      };
      const mounted = renderHarness(client, {
        status: "authenticated",
        identityToken: "actor-a",
      } as never);
      await act(async () => {});
      const before = state(mounted.container).feedItems;
      expect(before).toEqual(
        pageStatus === "SplitRequired" ? [] : ["one", "two"],
      );
      act(() =>
        client.update(
          "headless:feed",
          (args) =>
            (args.paginationOpts as { endCursor?: string }).endCursor ===
            "middle",
          page([{ id: "one" }], { continueCursor: "middle" }),
        ),
      );
      expect(state(mounted.container).feedItems).toEqual(before);
      act(() =>
        client.update(
          "headless:feed",
          (args) =>
            (args.paginationOpts as { cursor?: string }).cursor === "middle",
          page([{ id: "two" }], { continueCursor: "end" }),
        ),
      );
      expect(state(mounted.container).feedItems).toEqual(["one", "two"]);
      mounted.unmount();
    },
  );
});

describe("mounted identity-generation isolation", () => {
  test("clears actor pages and capabilities on the first A to B to A renders", async () => {
    const client = new ControlledWatchClient();
    client.resolver = (name, args) => {
      const generation = args.sessionGeneration;
      if (name === "headless:feed")
        return generation === undefined
          ? undefined
          : page([{ id: `feed-${generation}` }]);
      if (name === "headless:notifications")
        return generation === undefined
          ? undefined
          : page([{ id: `notification-${generation}` }]);
      if (name === "headless:capability") return true;
      return defaultQueryValue(name, args);
    };
    const mounted = renderHarness(client, {
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    await act(async () => {});
    const firstGeneration =
      client.matching("headless:feed")[0].args.sessionGeneration;
    expect(firstGeneration).toBeDefined();

    mounted.rerender({
      status: "authenticated",
      identityToken: "actor-b",
    } as never);
    const switched = state(mounted.container);
    expect(switched.feedItems).toEqual([]);
    expect(switched.notificationItems).toEqual([]);
    expect(switched.capability).toBe("loading");
    const secondGeneration = client.matching("headless:feed").at(-1)!.args
      .sessionGeneration;
    expect(secondGeneration).not.toBe(firstGeneration);

    mounted.rerender({
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    const thirdGeneration = client.matching("headless:feed").at(-1)!.args
      .sessionGeneration;
    expect(thirdGeneration).not.toBe(firstGeneration);
    expect(thirdGeneration).not.toBe(secondGeneration);
    for (const record of client.records) {
      expect(JSON.stringify(record.args)).not.toContain("actor-a");
      expect(JSON.stringify(record.args)).not.toContain("actor-b");
    }
    mounted.unmount();
  });

  test("drops an old mutation rejection and delayed retry after logout", async () => {
    vi.useFakeTimers();
    const client = new ControlledWatchClient();
    const oldMutation = deferred();
    client.mutationQueue.push(oldMutation);
    const mounted = renderHarness(client, {
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    await act(async () => {});
    let request!: Promise<unknown>;
    act(() => {
      request = mutationProbe!.setVote("post:1" as never, true);
    });
    expect(state(mounted.container).pending["post:1:vote"]).toBe(true);
    mounted.rerender({ status: "unauthenticated" });
    expect(state(mounted.container).pending).toEqual({});
    await act(async () => {
      oldMutation.reject(new Error("old actor failed"));
      await request;
    });
    expect(state(mounted.container).errors).toEqual({});
    mounted.unmount();
  });
});
