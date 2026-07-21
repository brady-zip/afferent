import React, { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { getFunctionName, makeFunctionReference } from "convex/server";

import {
  AfferentProvider,
  type AfferentAuthState,
  type AfferentBindings,
} from "../../src/react/index.js";
import { AfferentUiProvider } from "../../ui/afferent/core/afferent-ui-provider.js";

interface QueryRecord {
  name: string;
  args: Record<string, unknown>;
  value: unknown;
  error?: unknown;
  listeners: Set<() => void>;
}

const query = (name: string) => makeFunctionReference<"query">(`ui:${name}`);
const mutation = (name: string) =>
  makeFunctionReference<"mutation">(`ui:${name}`);

export const uiReferences = {
  feed: query("feed"),
  comments: query("comments"),
  post: query("post"),
  search: query("search"),
  similar: query("similar"),
  subscription: query("subscription"),
  activity: query("activity"),
};

export const uiBindings = {
  public: {
    listFeedback: uiReferences.feed,
    listComments: uiReferences.comments,
    getPost: uiReferences.post,
    searchFeedback: uiReferences.search,
    suggestSimilarPosts: uiReferences.similar,
  },
  participation: {
    createPost: mutation("createPost"),
    editPost: mutation("editPost"),
    withdrawPost: mutation("withdrawPost"),
    setVote: mutation("setVote"),
    addComment: mutation("addComment"),
  },
  notifications: {
    getPostSubscription: uiReferences.subscription,
    setPostSubscription: mutation("setSubscription"),
  },
  admin: {
    listPostActivity: uiReferences.activity,
  },
} as unknown as AfferentBindings;

export const board = { id: "board:ideas", slug: "ideas", name: "Ideas" };

export const feedbackPost = {
  contractVersion: 3,
  id: "post:one",
  boardId: board.id,
  board,
  title: "Keyboard shortcuts",
  body: "Add keyboard shortcuts to the editor.",
  author: { id: "actor:one", displayName: "Alex" },
  status: { key: "open", label: "Open" },
  voteCount: 4,
  commentCount: 2,
  totals: { votes: 4, comments: 2 },
  tags: [],
  viewerHasVoted: false,
  viewerCanEdit: true,
  viewerCanWithdraw: true,
} as const;

const page = (items: readonly unknown[]) => ({
  contractVersion: 3,
  page: items,
  posts: items,
  isDone: true,
  continueCursor: "done",
});

const comments = [
  {
    contractVersion: 1,
    id: "comment:root",
    postId: feedbackPost.id,
    body: "This would help every day.",
    author: { id: "actor:two", displayName: "Morgan" },
  },
  {
    contractVersion: 1,
    id: "comment:reply",
    postId: feedbackPost.id,
    body: "Especially for power users.",
    author: { id: "actor:three", displayName: "Riley" },
    parentCommentId: "comment:root",
  },
] as const;

function defaultValue(name: string) {
  if (name === "ui:feed") return page([feedbackPost]);
  if (name === "ui:comments") {
    return {
      contractVersion: 1,
      page: comments,
      comments,
      isDone: true,
      continueCursor: "done",
    };
  }
  if (name === "ui:post") {
    return { contractVersion: 2, status: "post", post: feedbackPost };
  }
  if (name === "ui:search" || name === "ui:similar") {
    return {
      contractVersion: 1,
      items: [
        {
          contractVersion: 1,
          id: feedbackPost.id,
          title: feedbackPost.title,
          board,
          status: feedbackPost.status,
        },
      ],
      hasMore: false,
    };
  }
  if (name === "ui:subscription") {
    return { contractVersion: 1, subscribed: false, explicitOptOut: false };
  }
  if (name === "ui:activity") {
    return {
      contractVersion: 1,
      page: [
        {
          contractVersion: 1,
          id: "activity:one",
          postId: feedbackPost.id,
          type: "create",
          occurredAt: 1,
          actor: feedbackPost.author,
        },
      ],
      isDone: true,
      continueCursor: "done",
    };
  }
  return undefined;
}

export class ControlledUiClient {
  records: QueryRecord[] = [];
  mutationCalls: { name: string; args: Record<string, unknown> }[] = [];
  values = new Map<string, unknown>();
  errors = new Map<string, unknown>();

  watchQuery(reference: unknown, args: Record<string, unknown> = {}) {
    const name = getFunctionName(reference as never);
    const record: QueryRecord = {
      name,
      args,
      value: this.values.has(name) ? this.values.get(name) : defaultValue(name),
      error: this.errors.get(name),
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

  mutation(reference: unknown, args: Record<string, unknown>) {
    this.mutationCalls.push({
      name: getFunctionName(reference as never),
      args,
    });
    return Promise.resolve({ contractVersion: 1, ok: true, data: {} });
  }

  publish(name: string, value: unknown) {
    this.values.set(`ui:${name}`, value);
    for (const record of this.records.filter(
      (candidate) => candidate.name === `ui:${name}`,
    )) {
      record.error = undefined;
      record.value = value;
      for (const listener of record.listeners) listener();
    }
  }

  fail(name: string, error: unknown) {
    this.errors.set(`ui:${name}`, error);
    for (const record of this.records.filter(
      (candidate) => candidate.name === `ui:${name}`,
    )) {
      record.error = error;
      for (const listener of record.listeners) listener();
    }
  }
}

export function renderUi(
  children: ReactNode,
  options: {
    client?: ControlledUiClient;
    auth?: AfferentAuthState;
    bindings?: AfferentBindings;
  } = {},
) {
  const client = options.client ?? new ControlledUiClient();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let auth =
    options.auth ??
    ({ status: "authenticated", identityToken: "actor-session" } as const);
  const render = () =>
    root.render(
      <ConvexProvider client={client as never}>
        <AfferentProvider
          bindings={options.bindings ?? uiBindings}
          auth={auth}
          client={client as never}
        >
          <AfferentUiProvider
            href={{
              post: (id) => `/feedback/${id}`,
              roadmap: () => "/roadmap",
              changelog: (slug) => `/changelog/${slug}`,
            }}
            currentLocation="/feedback"
          >
            {children}
          </AfferentUiProvider>
        </AfferentProvider>
      </ConvexProvider>,
    );
  act(render);
  return {
    client,
    container,
    rerender(nextAuth: AfferentAuthState) {
      auth = nextAuth;
      act(render);
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

export function setInput(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    );
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

export function click(element: Element) {
  act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}
