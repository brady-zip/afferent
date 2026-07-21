// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { getFunctionName, makeFunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  AfferentProvider,
  useAdminCapability,
  useAdminChangelog,
  useAdminFeedback,
  useAdminPost,
  useChangelogEntry,
  useChangelogFeed,
  useComments,
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
import { createPaginatedWatchStore } from "../../src/react/query.js";

interface QueryRecord {
  name: string;
  args: Record<string, unknown>;
  value: unknown;
  error?: unknown;
  listeners: Set<() => void>;
  disposeCount: number;
}

interface Deferred {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

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
  mutationCalls: {
    name: string;
    args: Record<string, unknown>;
    options?: { optimisticUpdate?: (store: unknown, args: unknown) => void };
  }[] = [];
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
      disposeCount: 0,
    };
    this.records.push(record);
    return {
      onUpdate: (listener: () => void) => {
        record.listeners.add(listener);
        return () => {
          if (record.listeners.delete(listener)) record.disposeCount += 1;
        };
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
      for (const listener of record.listeners) listener();
    }
  }

  updateTransaction(
    name: string,
    updates: readonly {
      predicate: (args: Record<string, unknown>) => boolean;
      value: unknown;
    }[],
    listenerOrder?: readonly number[],
  ) {
    const records = updates.map(({ predicate }) => {
      const matches = this.matching(name, predicate);
      expect(matches).toHaveLength(1);
      return matches[0];
    });
    for (let index = 0; index < records.length; index += 1) {
      records[index].error = undefined;
      records[index].value = updates[index].value;
    }
    for (const index of listenerOrder ??
      records.map((_record, index) => index)) {
      for (const listener of records[index].listeners) listener();
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
      for (const listener of record.listeners) listener();
    }
  }

  failAll(error: unknown) {
    for (const record of this.records) {
      record.error = error;
      for (const listener of record.listeners) listener();
    }
  }

  active(name: string) {
    return this.matching(name).filter((record) => record.listeners.size > 0);
  }
}

const query = (name: string) =>
  makeFunctionReference<"query">(`headless:${name}`);
const mutation = (name: string) =>
  makeFunctionReference<"mutation">(`headless:${name}`);

const refs = {
  feed: query("feed"),
  comments: query("comments"),
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
  adminFeedback: query("adminFeedback"),
  adminPost: query("adminPost"),
  adminChangelog: query("adminChangelog"),
};

const bindings = {
  public: {
    listFeedback: refs.feed,
    listComments: refs.comments,
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
    listAdminFeedback: refs.adminFeedback,
    getAdminPost: refs.adminPost,
    listAdminChangelog: refs.adminChangelog,
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

function page(items: Record<string, unknown>[], overrides = {}) {
  return {
    contractVersion: 2,
    page: items,
    posts: items,
    isDone: true,
    continueCursor: "done",
    ...overrides,
  };
}

function commentPage(items: Record<string, unknown>[], overrides = {}) {
  return {
    contractVersion: 1,
    page: items,
    comments: items,
    isDone: true,
    continueCursor: "done",
    ...overrides,
  };
}

function defaultQueryValue(name: string) {
  if (name === "headless:feed") return page([]);
  if (name === "headless:comments") return commentPage([]);
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
  if (name === "headless:adminFeedback") return page([]);
  if (name === "headless:adminPost") return undefined;
  if (name === "headless:adminChangelog") return page([]);
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
let commentsProbe: ReturnType<typeof useComments> | undefined;
let commentPublications: { status: string; ids: string[] }[] = [];

function AllHooksProbe() {
  const feed = useFeedbackFeed({ order: "newest" });
  const comments = useComments("post:1" as never);
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
  const adminFeedback = useAdminFeedback("hidden");
  const adminPost = useAdminPost("post:1" as never);
  const adminChangelog = useAdminChangelog();
  mutationProbe = useFeedbackMutations();
  feedProbe = feed;
  commentsProbe = comments;
  commentPublications.push({
    status: comments.status,
    ids: comments.items.map((item) => String(item.id)),
  });
  return (
    <output data-headless="state">
      {JSON.stringify({
        feed: feed.status,
        feedItems: feed.items.map((item) => item.id),
        comments: comments.status,
        commentItems: comments.items.map((item) => ({
          id: item.id,
          parentCommentId: item.parentCommentId,
        })),
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
        notificationTargets: notifications.items.map((item) => item.target),
        unread: unread.status,
        unreadCount: unread.count,
        capability: capability.status,
        activity: activity.status,
        tags: tags.status,
        adminFeedback: adminFeedback.status,
        adminFeedbackItems: adminFeedback.items,
        adminPost: adminPost.status,
        adminPostValue:
          adminPost.status === "ready" ? adminPost.post : undefined,
        adminChangelog: adminChangelog.status,
        adminChangelogItems: adminChangelog.items,
        pending: mutationProbe.pending,
        errors: mutationProbe.errors,
      })}
    </output>
  );
}

function renderHarness(
  client: ControlledWatchClient,
  auth: AfferentAuthState,
  activeBindings: AfferentBindings = bindings,
) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (nextAuth: AfferentAuthState) => {
    root.render(
      <ConvexProvider client={client as never}>
        <SentinelBoundary>
          <AfferentProvider
            {...({ bindings: activeBindings, auth: nextAuth, client } as never)}
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
  commentsProbe = undefined;
  commentPublications = [];
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("mounted non-throwing headless reads", () => {
  test("fences all admin read values across auth generations and stale publications", async () => {
    const client = new ControlledWatchClient();
    const mounted = renderHarness(client, { status: "unauthenticated" });
    await act(async () => {});
    expect(state(mounted.container)).toMatchObject({
      adminFeedback: "not-authorized",
      adminFeedbackItems: [],
      adminPost: "not-authorized",
      adminChangelog: "not-authorized",
      adminChangelogItems: [],
    });
    for (const name of [
      "headless:adminFeedback",
      "headless:adminPost",
      "headless:adminChangelog",
    ]) {
      expect(client.matching(name)).toHaveLength(0);
    }

    mounted.rerender({
      status: "authenticated",
      identityToken: "admin-a",
    } as never);
    await act(async () => {});
    const generationA = client.matching("headless:adminFeedback")[0].args
      .sessionGeneration;
    for (const name of ["headless:adminPost", "headless:adminChangelog"]) {
      expect(client.matching(name)[0].args.sessionGeneration).toBe(generationA);
    }
    const feedbackA = {
      contractVersion: 1,
      feedback: { id: "post-a", title: "Admin A hidden" },
      moderation: {
        contractVersion: 1,
        discussionLocked: true,
        archived: true,
        disposition: "active",
      },
    };
    const changelogA = {
      contractVersion: 2,
      id: "changelog-a",
      title: "Admin A release",
      links: [{ id: "post-a", title: "Admin A hidden" }],
    };
    act(() => {
      client.update(
        "headless:adminFeedback",
        (args) => args.sessionGeneration === generationA,
        page([feedbackA]),
      );
      client.update(
        "headless:adminPost",
        (args) => args.sessionGeneration === generationA,
        feedbackA,
      );
      client.update(
        "headless:adminChangelog",
        (args) => args.sessionGeneration === generationA,
        page([changelogA]),
      );
    });
    expect(state(mounted.container)).toMatchObject({
      adminFeedback: "ready",
      adminFeedbackItems: [feedbackA],
      adminPost: "ready",
      adminPostValue: feedbackA,
      adminChangelog: "ready",
      adminChangelogItems: [changelogA],
    });

    const stale = [
      client.matching("headless:adminFeedback")[0],
      client.matching("headless:adminPost")[0],
      client.matching("headless:adminChangelog")[0],
    ].map((record) => ({ record, listeners: [...record.listeners] }));
    mounted.rerender({
      status: "authenticated",
      identityToken: "admin-b",
    } as never);
    await act(async () => {});
    const cleared = state(mounted.container);
    expect(cleared).toMatchObject({
      adminFeedback: "empty",
      adminFeedbackItems: [],
      adminPost: "loading",
      adminChangelog: "empty",
      adminChangelogItems: [],
    });
    expect(cleared).not.toHaveProperty("adminPostValue");
    const generationB = client.matching("headless:adminFeedback").at(-1)!.args
      .sessionGeneration;
    expect(generationB).not.toBe(generationA);
    for (const name of ["headless:adminPost", "headless:adminChangelog"]) {
      expect(client.matching(name).at(-1)!.args.sessionGeneration).toBe(
        generationB,
      );
    }

    act(() => {
      for (const { record, listeners } of stale) {
        record.value =
          record.name === "headless:adminPost"
            ? feedbackA
            : page(
                record.name === "headless:adminFeedback"
                  ? [feedbackA]
                  : [changelogA],
              );
        for (const listener of listeners) listener();
      }
    });
    expect(state(mounted.container)).toMatchObject({
      adminFeedbackItems: [],
      adminPost: "loading",
      adminChangelogItems: [],
    });

    const feedbackB = {
      contractVersion: 1,
      feedback: { id: "post-b", title: "Admin B hidden" },
      moderation: {
        contractVersion: 1,
        discussionLocked: false,
        archived: true,
        disposition: "active",
      },
    };
    const changelogB = {
      contractVersion: 2,
      id: "changelog-b",
      title: "Admin B release",
      links: [{ id: "post-b", title: "Admin B hidden" }],
    };
    act(() => {
      client.update(
        "headless:adminFeedback",
        (args) => args.sessionGeneration === generationB,
        page([feedbackB]),
      );
      client.update(
        "headless:adminPost",
        (args) => args.sessionGeneration === generationB,
        feedbackB,
      );
      client.update(
        "headless:adminChangelog",
        (args) => args.sessionGeneration === generationB,
        page([changelogB]),
      );
    });
    expect(state(mounted.container)).toMatchObject({
      adminFeedbackItems: [feedbackB],
      adminPostValue: feedbackB,
      adminChangelogItems: [changelogB],
    });

    mounted.rerender({ status: "unauthenticated" });
    await act(async () => {});
    const loggedOut = state(mounted.container);
    expect(loggedOut).toMatchObject({
      adminFeedback: "not-authorized",
      adminFeedbackItems: [],
      adminPost: "not-authorized",
      adminChangelog: "not-authorized",
      adminChangelogItems: [],
    });
    expect(loggedOut).not.toHaveProperty("adminPostValue");
    for (const name of [
      "headless:adminFeedback",
      "headless:adminPost",
      "headless:adminChangelog",
    ]) {
      expect(client.active(name)).toHaveLength(0);
    }
    for (const record of client.records) {
      expect(JSON.stringify(record.args)).not.toContain("admin-a");
      expect(JSON.stringify(record.args)).not.toContain("admin-b");
    }
    mounted.unmount();
  });

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
      "comments",
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

describe("mounted comment feed", () => {
  test("omitted comment binding is inert and explicitly unsupported", async () => {
    const client = new ControlledWatchClient();
    const { listComments: _listComments, ...publicBindings } = bindings.public;
    const mounted = renderHarness(client, { status: "unauthenticated" }, {
      ...bindings,
      public: publicBindings,
    } as AfferentBindings);
    await act(async () => {});
    expect(state(mounted.container)).toMatchObject({
      comments: "unsupported",
      commentItems: [],
    });
    expect(client.matching("headless:comments")).toHaveLength(0);
    act(() => commentsProbe!.loadMore());
    expect(client.matching("headless:comments")).toHaveLength(0);
    mounted.unmount();
  });

  test.each([
    ["first comment listener first", [0, 1]],
    ["tail comment listener first", [1, 0]],
  ] as const)(
    "publishes flat root and reply rows as exact coherent prefixes: %s",
    async (_label, listenerOrder) => {
      const root = {
        contractVersion: 1,
        id: "root-a",
        postId: "post:1",
        body: "Root A",
        author: { id: "actor-a", displayName: "Actor A" },
      };
      const reply = {
        contractVersion: 1,
        id: "reply-a",
        postId: "post:1",
        body: "Reply A",
        author: { id: "actor-b", displayName: "Actor B" },
        parentCommentId: "root-a",
      };
      const tail = {
        contractVersion: 1,
        id: "root-b",
        postId: "post:1",
        body: "Root B",
        author: { id: "actor-c" },
      };
      const inserted = {
        contractVersion: 1,
        id: "root-zero",
        postId: "post:1",
        body: "Root zero",
        author: { id: "actor-zero" },
      };
      const client = new ControlledWatchClient();
      let serveComments = true;
      client.resolver = (name, args) => {
        if (name !== "headless:comments") return defaultQueryValue(name, args);
        if (!serveComments) return undefined;
        const options = args.paginationOpts as {
          cursor: string | null;
          endCursor?: string;
        };
        if (options.cursor === null && options.endCursor === undefined) {
          return commentPage([root, reply], {
            isDone: false,
            continueCursor: "after-reply",
          });
        }
        return undefined;
      };
      const mounted = renderHarness(client, {
        status: "authenticated",
        identityToken: "actor-a",
      } as never);
      await act(async () => {});
      expect(state(mounted.container).commentItems).toEqual([
        { id: "root-a" },
        { id: "reply-a", parentCommentId: "root-a" },
      ]);

      act(() => commentsProbe!.loadMore());
      act(() => {
        client.updateTransaction(
          "headless:comments",
          [
            {
              predicate: (args) => {
                const options = args.paginationOpts as {
                  cursor: string | null;
                  endCursor?: string;
                };
                return (
                  options.cursor === null && options.endCursor === "after-reply"
                );
              },
              value: commentPage([root, reply], {
                continueCursor: "after-reply",
              }),
            },
            {
              predicate: (args) => {
                const options = args.paginationOpts as {
                  cursor: string | null;
                  endCursor?: string;
                };
                return (
                  options.cursor === "after-reply" &&
                  options.endCursor === undefined
                );
              },
              value: commentPage([tail]),
            },
          ],
          listenerOrder,
        );
      });
      expect(state(mounted.container).commentItems).toEqual([
        { id: "root-a" },
        { id: "reply-a", parentCommentId: "root-a" },
        { id: "root-b" },
      ]);

      const mark = commentPublications.length;
      act(() => {
        client.update(
          "headless:comments",
          (args) =>
            (args.paginationOpts as { endCursor?: string }).endCursor ===
            "after-reply",
          commentPage([inserted, root, reply], {
            continueCursor: "after-reply",
          }),
        );
      });
      const previous = JSON.stringify(["root-a", "reply-a", "root-b"]);
      const current = JSON.stringify([
        "root-zero",
        "root-a",
        "reply-a",
        "root-b",
      ]);
      for (const publication of commentPublications.slice(mark)) {
        expect([previous, current]).toContain(JSON.stringify(publication.ids));
      }
      expect(state(mounted.container).commentItems).toEqual([
        { id: "root-zero" },
        { id: "root-a" },
        { id: "reply-a", parentCommentId: "root-a" },
        { id: "root-b" },
      ]);

      act(() => {
        client.fail(
          "headless:comments",
          (args) =>
            (args.paginationOpts as { cursor: string | null }).cursor ===
            "after-reply",
          new Error("comment tail failed"),
        );
      });
      expect(state(mounted.container)).toMatchObject({
        comments: "error",
        commentItems: [
          { id: "root-zero" },
          { id: "root-a" },
          { id: "reply-a", parentCommentId: "root-a" },
        ],
      });
      act(() => {
        client.update(
          "headless:comments",
          (args) =>
            (args.paginationOpts as { cursor: string | null }).cursor ===
            "after-reply",
          commentPage([tail]),
        );
      });
      expect(state(mounted.container)).toMatchObject({
        comments: "ready",
        commentItems: [
          { id: "root-zero" },
          { id: "root-a" },
          { id: "reply-a", parentCommentId: "root-a" },
          { id: "root-b" },
        ],
      });

      const oldRecords = client.active("headless:comments");
      serveComments = false;
      mounted.rerender({
        status: "authenticated",
        identityToken: "actor-b",
      } as never);
      expect(state(mounted.container)).toMatchObject({
        comments: "loading",
        commentItems: [],
      });
      expect(oldRecords.every((record) => record.disposeCount === 1)).toBe(
        true,
      );
      mounted.unmount();
      for (const record of client.matching("headless:comments")) {
        expect(record.listeners.size).toBe(0);
        expect(record.disposeCount).toBe(1);
      }
    },
  );
});

describe("mounted ordered pagination", () => {
  test.each([
    ["first-page listener first", [0, 1]],
    ["middle-page listener first", [1, 0]],
  ] as const)(
    "publishes only the exact prior or current array when one transition changes sibling pages: %s",
    (_label, listenerOrder) => {
      const client = new ControlledWatchClient();
      client.resolver = (name, args) => {
        if (name !== "headless:feed") return defaultQueryValue(name, args);
        const options = args.paginationOpts as {
          cursor: string | null;
          endCursor?: string;
        };
        if (options.cursor === null && options.endCursor === undefined) {
          return page([{ id: "a" }, { id: "b" }], {
            isDone: false,
            continueCursor: "after-b",
          });
        }
        if (options.cursor === null && options.endCursor === "after-b") {
          return page([{ id: "a" }, { id: "b" }], {
            continueCursor: "after-b",
          });
        }
        if (options.cursor === "after-b" && options.endCursor === undefined) {
          return page([{ id: "e" }], {
            isDone: false,
            continueCursor: "after-e",
          });
        }
        if (options.cursor === "after-b" && options.endCursor === "after-e") {
          return page([{ id: "e" }], { continueCursor: "after-e" });
        }
        if (options.cursor === "after-e" && options.endCursor === undefined) {
          return page([{ id: "back" }, { id: "f" }]);
        }
        return undefined;
      };
      const store = createPaginatedWatchStore({
        client: client as never,
        query: refs.feed as never,
        args: {} as never,
        generation: 1,
        initialNumItems: 2,
      });
      const publications: string[][] = [];
      const stop = store.subscribe(() => {
        publications.push(
          store
            .getSnapshot()
            .results.map((item) => String((item as { id: unknown }).id)),
        );
      });
      store.loadMore(2);
      store.loadMore(2);
      expect(
        store.getSnapshot().results.map((item) => (item as { id: unknown }).id),
      ).toEqual(["a", "b", "e", "back", "f"]);
      publications.length = 0;

      client.updateTransaction(
        "headless:feed",
        [
          {
            predicate: (args) => {
              const options = args.paginationOpts as {
                cursor: string | null;
                endCursor?: string;
              };
              return options.cursor === null && options.endCursor === "after-b";
            },
            value: page([{ id: "e" }, { id: "a" }, { id: "b" }], {
              continueCursor: "after-b",
            }),
          },
          {
            predicate: (args) => {
              const options = args.paginationOpts as {
                cursor: string | null;
                endCursor?: string;
              };
              return (
                options.cursor === "after-b" && options.endCursor === "after-e"
              );
            },
            value: page([], { continueCursor: "after-e" }),
          },
        ],
        listenerOrder,
      );

      const previous = JSON.stringify(["a", "b", "e", "back", "f"]);
      const current = JSON.stringify(["e", "a", "b", "back", "f"]);
      expect(publications.length).toBeGreaterThan(0);
      for (const publication of publications) {
        expect([previous, current]).toContain(JSON.stringify(publication));
      }
      expect(publications.at(-1)).toEqual(["e", "a", "b", "back", "f"]);
      stop();
      store.dispose();
    },
  );

  test("pins each loaded tail and grows the exact cursor-bounded window", async () => {
    const client = new ControlledWatchClient();
    client.resolver = (name, args) => {
      if (name !== "headless:feed") return defaultQueryValue(name, args);
      const options = args.paginationOpts as {
        cursor: string | null;
        endCursor?: string;
      };
      if (options.cursor === null && options.endCursor === undefined) {
        return page([{ id: "a" }, { id: "b" }], {
          isDone: false,
          continueCursor: "after-b",
        });
      }
      return undefined;
    };
    const mounted = renderHarness(client, {
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    await act(async () => {});
    expect(state(mounted.container).feedItems).toEqual(["a", "b"]);

    act(() => {
      feedProbe!.loadMore();
      feedProbe!.loadMore();
    });
    const afterFirstLoad = client.active("headless:feed");
    expect(
      afterFirstLoad.filter((record) => {
        const options = record.args.paginationOpts as {
          cursor: string | null;
          endCursor?: string;
        };
        return options.cursor === null && options.endCursor === "after-b";
      }),
    ).toHaveLength(1);
    expect(
      afterFirstLoad.filter((record) => {
        const options = record.args.paginationOpts as {
          cursor: string | null;
          endCursor?: string;
        };
        return options.cursor === "after-b" && options.endCursor === undefined;
      }),
    ).toHaveLength(1);
    expect(state(mounted.container).feedItems).toEqual(["a", "b"]);

    act(() => {
      client.update(
        "headless:feed",
        (args) =>
          (args.paginationOpts as { endCursor?: string }).endCursor ===
          "after-b",
        page([{ id: "a" }, { id: "b" }], {
          continueCursor: "after-b",
        }),
      );
      client.update(
        "headless:feed",
        (args) => {
          const options = args.paginationOpts as {
            cursor: string | null;
            endCursor?: string;
          };
          return (
            options.cursor === "after-b" && options.endCursor === undefined
          );
        },
        page([{ id: "c" }, { id: "d" }], {
          isDone: false,
          continueCursor: "after-d",
        }),
      );
    });
    expect(state(mounted.container).feedItems).toEqual(["a", "b", "c", "d"]);

    act(() =>
      client.update(
        "headless:feed",
        (args) =>
          (args.paginationOpts as { endCursor?: string }).endCursor ===
          "after-b",
        page([{ id: "zero" }, { id: "a" }, { id: "b" }], {
          continueCursor: "after-b",
        }),
      ),
    );
    expect(state(mounted.container).feedItems).toEqual([
      "zero",
      "a",
      "b",
      "c",
      "d",
    ]);

    act(() => {
      feedProbe!.loadMore();
      feedProbe!.loadMore();
    });
    const afterSecondLoad = client.active("headless:feed");
    expect(
      afterSecondLoad.filter((record) => {
        const options = record.args.paginationOpts as {
          cursor: string | null;
          endCursor?: string;
        };
        return options.cursor === "after-b" && options.endCursor === "after-d";
      }),
    ).toHaveLength(1);
    expect(
      afterSecondLoad.filter((record) => {
        const options = record.args.paginationOpts as {
          cursor: string | null;
          endCursor?: string;
        };
        return options.cursor === "after-d" && options.endCursor === undefined;
      }),
    ).toHaveLength(1);
    mounted.unmount();
  });

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
        if (options.cursor === null && options.endCursor === undefined)
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

  test("fails closed when SplitRequired omits its split cursor", async () => {
    const client = new ControlledWatchClient();
    client.resolver = (name, args) =>
      name === "headless:feed"
        ? page([{ id: "incomplete" }], {
            pageStatus: "SplitRequired",
            splitCursor: null,
          })
        : defaultQueryValue(name, args);
    const mounted = renderHarness(client, {
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    await act(async () => {});
    expect(state(mounted.container)).toMatchObject({
      feed: "error",
      feedItems: [],
    });
    mounted.unmount();
  });

  test("publishes only the maximal coherent prefix through a middle-page failure and recovery", async () => {
    const client = new ControlledWatchClient();
    client.resolver = (name, args) => {
      if (name !== "headless:feed") return defaultQueryValue(name, args);
      const options = args.paginationOpts as {
        cursor: string | null;
        endCursor?: string;
      };
      if (options.cursor === null && options.endCursor === undefined) {
        return page([{ id: "a" }], {
          isDone: false,
          continueCursor: "after-a",
        });
      }
      return undefined;
    };
    const mounted = renderHarness(client, {
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    await act(async () => {});
    act(() => feedProbe!.loadMore());
    act(() => {
      client.update(
        "headless:feed",
        (args) =>
          (args.paginationOpts as { endCursor?: string }).endCursor ===
          "after-a",
        page([{ id: "a" }], { continueCursor: "after-a" }),
      );
      client.update(
        "headless:feed",
        (args) => {
          const options = args.paginationOpts as {
            cursor: string | null;
            endCursor?: string;
          };
          return (
            options.cursor === "after-a" && options.endCursor === undefined
          );
        },
        page([{ id: "b" }], {
          isDone: false,
          continueCursor: "after-b",
        }),
      );
    });
    act(() => feedProbe!.loadMore());
    act(() => {
      client.update(
        "headless:feed",
        (args) => {
          const options = args.paginationOpts as {
            cursor: string | null;
            endCursor?: string;
          };
          return (
            options.cursor === "after-a" && options.endCursor === "after-b"
          );
        },
        page([{ id: "b" }], { continueCursor: "after-b" }),
      );
      client.update(
        "headless:feed",
        (args) => {
          const options = args.paginationOpts as {
            cursor: string | null;
            endCursor?: string;
          };
          return (
            options.cursor === "after-b" && options.endCursor === undefined
          );
        },
        page([{ id: "c" }]),
      );
    });
    expect(state(mounted.container).feedItems).toEqual(["a", "b", "c"]);

    act(() =>
      client.fail(
        "headless:feed",
        (args) => {
          const options = args.paginationOpts as {
            cursor: string | null;
            endCursor?: string;
          };
          return (
            options.cursor === "after-a" && options.endCursor === "after-b"
          );
        },
        new Error("middle failed"),
      ),
    );
    expect(state(mounted.container)).toMatchObject({
      feed: "error",
      feedItems: ["a"],
    });
    act(() =>
      client.update(
        "headless:feed",
        (args) => {
          const options = args.paginationOpts as {
            cursor: string | null;
            endCursor?: string;
          };
          return (
            options.cursor === "after-a" && options.endCursor === "after-b"
          );
        },
        page([{ id: "b" }], { continueCursor: "after-b" }),
      ),
    );
    expect(state(mounted.container)).toMatchObject({
      feed: "ready",
      feedItems: ["a", "b", "c"],
    });
    mounted.unmount();
  });

  test("collapses an empty bounded window through one atomic adjacent merge", async () => {
    const client = new ControlledWatchClient();
    let initial = true;
    client.resolver = (name, args) => {
      if (name !== "headless:feed") return defaultQueryValue(name, args);
      const options = args.paginationOpts as {
        cursor: string | null;
        endCursor?: string;
      };
      if (
        initial &&
        options.cursor === null &&
        options.endCursor === undefined
      ) {
        initial = false;
        return page([{ id: "a" }, { id: "b" }], {
          isDone: false,
          continueCursor: "after-b",
        });
      }
      return undefined;
    };
    const mounted = renderHarness(client, {
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    await act(async () => {});
    act(() => feedProbe!.loadMore());
    act(() => {
      client.update(
        "headless:feed",
        (args) =>
          (args.paginationOpts as { endCursor?: string }).endCursor ===
          "after-b",
        page([{ id: "a" }, { id: "b" }], {
          continueCursor: "after-b",
        }),
      );
      client.update(
        "headless:feed",
        (args) => {
          const options = args.paginationOpts as {
            cursor: string | null;
            endCursor?: string;
          };
          return (
            options.cursor === "after-b" && options.endCursor === undefined
          );
        },
        page([{ id: "c" }, { id: "d" }]),
      );
    });
    expect(state(mounted.container).feedItems).toEqual(["a", "b", "c", "d"]);

    act(() =>
      client.update(
        "headless:feed",
        (args) =>
          (args.paginationOpts as { endCursor?: string }).endCursor ===
          "after-b",
        page([], { continueCursor: "after-b" }),
      ),
    );
    await act(async () => {});
    expect(state(mounted.container).feedItems).toEqual(["c", "d"]);
    const merged = client.active("headless:feed").filter((record) => {
      const options = record.args.paginationOpts as {
        cursor: string | null;
        endCursor?: string;
      };
      return options.cursor === null && options.endCursor === undefined;
    });
    expect(merged).toHaveLength(1);
    act(() =>
      client.update(
        "headless:feed",
        (args) => args === merged[0].args,
        page([{ id: "c" }, { id: "d" }]),
      ),
    );
    expect(state(mounted.container)).toMatchObject({
      feed: "ready",
      feedItems: ["c", "d"],
    });
    mounted.unmount();
  });

  test.each([1, 2, 3])(
    "fences and disposes a pending append across an auth generation change (run %i)",
    async () => {
      const client = new ControlledWatchClient();
      let serveOldGeneration = true;
      client.resolver = (name, args) => {
        if (name !== "headless:feed") return defaultQueryValue(name, args);
        const options = args.paginationOpts as {
          cursor: string | null;
          endCursor?: string;
        };
        if (
          serveOldGeneration &&
          options.cursor === null &&
          options.endCursor === undefined
        ) {
          return page([{ id: "old-a" }, { id: "old-b" }], {
            isDone: false,
            continueCursor: "old-boundary",
          });
        }
        return undefined;
      };
      const mounted = renderHarness(client, {
        status: "authenticated",
        identityToken: "actor-a",
      } as never);
      await act(async () => {});
      const oldGeneration =
        client.matching("headless:feed")[0].args.sessionGeneration;

      act(() => feedProbe!.loadMore());
      const staleRecords = client.matching(
        "headless:feed",
        (args) => args.sessionGeneration === oldGeneration,
      );
      expect(staleRecords).toHaveLength(3);
      expect(staleRecords.every((record) => record.listeners.size === 1)).toBe(
        true,
      );

      serveOldGeneration = false;
      mounted.rerender({
        status: "authenticated",
        identityToken: "actor-b",
      } as never);
      expect(state(mounted.container)).toMatchObject({
        feed: "loading",
        feedItems: [],
      });
      for (const record of staleRecords) {
        expect(record.listeners.size).toBe(0);
        expect(record.disposeCount).toBe(1);
      }

      act(() => {
        for (const record of staleRecords) {
          client.update(
            "headless:feed",
            (args) => args === record.args,
            page([{ id: "stale-append-result" }]),
          );
        }
      });
      expect(state(mounted.container).feedItems).toEqual([]);

      const fresh = client
        .active("headless:feed")
        .find((record) => record.args.sessionGeneration !== oldGeneration);
      expect(fresh).toBeDefined();
      act(() =>
        client.update(
          "headless:feed",
          (args) => args === fresh!.args,
          page([{ id: "fresh-b" }]),
        ),
      );
      expect(state(mounted.container).feedItems).toEqual(["fresh-b"]);
      mounted.unmount();
      for (const record of client.matching("headless:feed")) {
        expect(record.listeners.size).toBe(0);
        expect(record.disposeCount).toBe(1);
      }
    },
  );

  test("rejects captured late result and error callbacks after A to B to A replacement", () => {
    const client = new ControlledWatchClient();
    client.resolver = (name, args) => {
      if (name !== "headless:feed") return defaultQueryValue(name, args);
      return page([{ id: `generation-${String(args.sessionGeneration)}` }]);
    };
    const createStore = (sessionGeneration: number) =>
      createPaginatedWatchStore({
        client,
        query: refs.feed as never,
        args: { sessionGeneration } as never,
        generation: sessionGeneration,
        initialNumItems: 2,
      });

    const oldA = createStore(31);
    const stopOldA = oldA.subscribe(() => {});
    expect(oldA.getSnapshot().results).toEqual([{ id: "generation-31" }]);
    const oldRecord = client.matching(
      "headless:feed",
      (args) => args.sessionGeneration === 31,
    )[0];
    const capturedCallbacks = [...oldRecord.listeners];
    expect(capturedCallbacks).toHaveLength(1);
    stopOldA();
    oldA.dispose();

    const actorB = createStore(32);
    const stopB = actorB.subscribe(() => {});
    expect(actorB.getSnapshot().results).toEqual([{ id: "generation-32" }]);
    stopB();
    actorB.dispose();

    const currentA = createStore(33);
    let currentPublications = 0;
    const stopCurrentA = currentA.subscribe(() => {
      currentPublications += 1;
    });
    const currentEvidence = () => {
      const snapshot = currentA.getSnapshot();
      return {
        results: structuredClone(snapshot.results),
        status: snapshot.status,
        errorCode: snapshot.error?.code,
      };
    };
    const before = currentEvidence();
    const beforePublications = currentPublications;

    oldRecord.error = undefined;
    oldRecord.value = page([{ id: "late-old-result" }]);
    for (const callback of capturedCallbacks) callback();
    expect(currentEvidence()).toEqual(before);
    expect(currentPublications).toBe(beforePublications);

    oldRecord.error = new Error("late old error");
    for (const callback of capturedCallbacks) callback();
    expect(currentEvidence()).toEqual(before);
    expect(currentPublications).toBe(beforePublications);

    stopCurrentA();
    currentA.dispose();
    expect(oldRecord.disposeCount).toBe(1);
  });
});

describe("mounted identity-generation isolation", () => {
  test("installs exact desired-state vote optimism for feed and detail caches", async () => {
    const client = new ControlledWatchClient();
    const mounted = renderHarness(client, {
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    await act(async () => {});
    await act(async () => {
      await mutationProbe!.setVote("post:1" as never, true);
    });
    const optimistic = client.mutationCalls.at(-1)?.options?.optimisticUpdate;
    expect(optimistic).toBeTypeOf("function");
    const feedbackPost = {
      contractVersion: 3,
      id: "post:1",
      voteCount: 4,
      totals: { votes: 4, comments: 0 },
      viewerHasVoted: false,
      viewerCanEdit: false,
      viewerCanWithdraw: false,
    };
    const feedValue = page([feedbackPost]);
    const detailValue = {
      contractVersion: 2,
      status: "post",
      post: feedbackPost,
    };
    const writes: unknown[] = [];
    optimistic!(
      {
        getAllQueries: () => [
          { args: { sessionGeneration: 1 }, value: feedValue },
        ],
        getQuery: () => detailValue,
        setQuery: (_reference: unknown, _args: unknown, value: unknown) =>
          writes.push(value),
      },
      { postId: "post:1", desired: true },
    );
    expect(writes).toContainEqual(
      expect.objectContaining({
        posts: [
          expect.objectContaining({
            voteCount: 5,
            totals: { votes: 5, comments: 0 },
            viewerHasVoted: true,
          }),
        ],
      }),
    );
    expect(writes).toContainEqual({
      ...detailValue,
      post: {
        ...detailValue.post,
        voteCount: 5,
        totals: { votes: 5, comments: 0 },
        viewerHasVoted: true,
      },
    });

    writes.length = 0;
    const alreadyVoted = {
      ...feedbackPost,
      viewerHasVoted: true,
    };
    optimistic!(
      {
        getAllQueries: () => [
          {
            args: { sessionGeneration: 1 },
            value: page([alreadyVoted]),
          },
        ],
        getQuery: () => ({
          contractVersion: 2,
          status: "post",
          post: alreadyVoted,
        }),
        setQuery: (_reference: unknown, _args: unknown, value: unknown) =>
          writes.push(value),
      },
      { postId: "post:1", desired: true },
    );
    for (const value of writes) {
      expect(JSON.stringify(value)).toContain('"voteCount":4');
      expect(JSON.stringify(value)).toContain('"viewerHasVoted":true');
    }

    writes.length = 0;
    optimistic!(
      {
        getAllQueries: () => [
          {
            args: { sessionGeneration: 1 },
            value: page([alreadyVoted]),
          },
        ],
        getQuery: () => ({
          contractVersion: 2,
          status: "post",
          post: alreadyVoted,
        }),
        setQuery: (_reference: unknown, _args: unknown, value: unknown) =>
          writes.push(value),
      },
      { postId: "post:1", desired: false },
    );
    for (const value of writes) {
      expect(JSON.stringify(value)).toContain('"voteCount":3');
      expect(JSON.stringify(value)).toContain('"viewerHasVoted":false');
    }
    mounted.unmount();
  });

  test("clears actor pages and capabilities on the first A to B to A renders", async () => {
    const client = new ControlledWatchClient();
    client.resolver = (name, args) => {
      if (
        name === "headless:feed" ||
        name === "headless:notifications" ||
        name === "headless:capability"
      ) {
        return undefined;
      }
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
    act(() => {
      client.update(
        "headless:feed",
        (args) => args.sessionGeneration === firstGeneration,
        page([{ id: `feed-${firstGeneration}` }]),
      );
      client.update(
        "headless:notifications",
        (args) => args.sessionGeneration === firstGeneration,
        page([
          {
            id: `notification-${firstGeneration}`,
            target: {
              contractVersion: 1,
              kind: "post",
              postId: "post:1",
              commentId: "comment:1",
              label: "View comment on feedback: Keyboard navigation",
            },
          },
        ]),
      );
      client.update(
        "headless:capability",
        (args) => args.sessionGeneration === firstGeneration,
        true,
      );
    });
    expect(state(mounted.container).feedItems).toEqual([
      `feed-${firstGeneration}`,
    ]);
    expect(state(mounted.container).notificationTargets).toEqual([
      {
        contractVersion: 1,
        kind: "post",
        postId: "post:1",
        commentId: "comment:1",
        label: "View comment on feedback: Keyboard navigation",
      },
    ]);

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
    act(() => {
      client.update(
        "headless:feed",
        (args) => args.sessionGeneration === firstGeneration,
        page([{ id: "stale-direct-page" }]),
      );
    });
    expect(state(mounted.container).feedItems).toEqual([]);

    mounted.rerender({
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    const thirdGeneration = client.matching("headless:feed").at(-1)!.args
      .sessionGeneration;
    expect(thirdGeneration).not.toBe(firstGeneration);
    expect(thirdGeneration).not.toBe(secondGeneration);
    mounted.rerender({ status: "unauthenticated" });
    const fourthGeneration = client.matching("headless:feed").at(-1)!.args
      .sessionGeneration;
    expect(fourthGeneration).not.toBe(thirdGeneration);
    mounted.rerender({
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    const fifthGeneration = client.matching("headless:feed").at(-1)!.args
      .sessionGeneration;
    expect(fifthGeneration).not.toBe(thirdGeneration);
    expect(fifthGeneration).not.toBe(fourthGeneration);
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
    await act(async () => {
      request = mutationProbe!.setVote("post:1" as never, true);
      await Promise.resolve();
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

  test("cancels a rate-limit retry timer when generation changes", async () => {
    vi.useFakeTimers();
    const client = new ControlledWatchClient();
    const limitedMutation = deferred();
    client.mutationQueue.push(limitedMutation);
    const mounted = renderHarness(client, {
      status: "authenticated",
      identityToken: "actor-a",
    } as never);
    await act(async () => {});
    const actorAProbe = mutationProbe!;
    let request!: Promise<unknown>;
    await act(async () => {
      request = actorAProbe.setVote("post:1" as never, true);
      await Promise.resolve();
      limitedMutation.resolve({
        ok: false,
        error: {
          contractVersion: 1,
          code: "RATE_LIMITED",
          operation: "vote",
          retryAfterMs: 100,
        },
      });
      await request;
    });
    expect(state(mounted.container).errors["post:1:vote"]).toMatchObject({
      code: "RATE_LIMITED",
    });
    const retry = actorAProbe.retry("post:1:vote");
    mounted.rerender({ status: "unauthenticated" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
      await retry;
    });
    expect(client.mutationCalls).toHaveLength(1);
    expect(state(mounted.container).errors).toEqual({});
    mounted.unmount();
  });
});
