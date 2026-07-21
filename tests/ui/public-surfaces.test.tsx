// @vitest-environment jsdom

import fs from "node:fs";
import React, { act } from "react";
import { getFunctionName, makeFunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { AfferentChangelogScreen } from "../../ui/afferent/changelog/changelog-screen.js";
import { AfferentNotificationsList } from "../../ui/afferent/notifications/notifications-list.js";
import { AfferentNotificationsPopover } from "../../ui/afferent/notifications/notifications-popover.js";
import { AfferentRoadmapScreen } from "../../ui/afferent/roadmap/roadmap-screen.js";
import {
  ControlledUiClient,
  board,
  click,
  feedbackPost,
  renderUi,
  uiBindings,
} from "./harness.js";

const query = (name: string) => makeFunctionReference<"query">(`ui:${name}`);
const mutation = (name: string) =>
  makeFunctionReference<"mutation">(`ui:${name}`);

const surfaceReferences = {
  roadmap: query("roadmap"),
  changelogFeed: query("changelogFeed"),
  changelogEntry: query("changelogEntry"),
  notifications: query("notifications"),
  unread: query("unread"),
};

const surfaceBindings = {
  ...uiBindings,
  roadmap: { listRoadmapGroup: surfaceReferences.roadmap },
  changelog: {
    listPublished: surfaceReferences.changelogFeed,
    getPublishedBySlug: surfaceReferences.changelogEntry,
  },
  notifications: {
    ...uiBindings.notifications,
    listNotifications: surfaceReferences.notifications,
    getUnreadCount: surfaceReferences.unread,
    markNotificationRead: mutation("markNotificationRead"),
  },
} as never;

const roadmapBoard = {
  id: "board:roadmap",
  slug: "roadmap",
  name: "Roadmap board",
} as const;

function roadmapItem(
  id: string,
  title: string,
  status: "planned" | "in_progress" | "complete",
) {
  const labels = {
    planned: "Planned",
    in_progress: "In Progress",
    complete: "Complete",
  } as const;
  return {
    contractVersion: 1,
    id,
    boardId: roadmapBoard.id,
    board: roadmapBoard,
    title,
    status: { key: status, label: labels[status] },
    currentStatusSince: 100,
    createdAt: 50,
    voteCount: 3,
    commentCount: 2,
  } as const;
}

const roadmapGroups = {
  planned: [
    roadmapItem("post:planned-one", "Planned first", "planned"),
    roadmapItem("post:planned-two", "Planned second", "planned"),
  ],
  in_progress: [roadmapItem("post:progress", "Building now", "in_progress")],
  complete: [roadmapItem("post:complete", "Already shipped", "complete")],
} as const;

const changelogEntries = [
  {
    contractVersion: 1,
    id: "changelog:new",
    title: "Latest release",
    body: "The latest release body.",
    slug: "latest-release",
    firstPublishedAt: 200,
    updatedAt: 200,
    links: [
      {
        contractVersion: 1,
        id: feedbackPost.id,
        title: feedbackPost.title,
        status: feedbackPost.status,
      },
    ],
  },
  {
    contractVersion: 1,
    id: "changelog:old",
    title: "Earlier release",
    body: "The earlier release body.",
    slug: "earlier-release",
    firstPublishedAt: 100,
    updatedAt: 100,
    links: [],
  },
] as const;

const notifications = [
  {
    contractVersion: 2,
    id: "notification:post",
    eventId: "event:post",
    type: "comment_replied",
    target: {
      contractVersion: 1,
      kind: "post",
      postId: feedbackPost.id,
      commentId: "comment:root",
      label: `View comment on feedback: ${feedbackPost.title}`,
    },
    occurredAt: 200,
    read: false,
    initiator: { id: "actor:two", displayName: "Morgan" },
  },
  {
    contractVersion: 2,
    id: "notification:changelog",
    eventId: "event:changelog",
    type: "changelog_published",
    target: {
      contractVersion: 1,
      kind: "changelog",
      slug: "latest-release",
      label: "View changelog: Latest release",
    },
    occurredAt: 100,
    read: true,
    initiator: { id: "actor:three", displayName: "Riley" },
  },
] as const;

function page(contractVersion: 1 | 2, items: readonly unknown[]) {
  return {
    contractVersion,
    page: items,
    items,
    entries: items,
    notifications: items,
    isDone: false,
    continueCursor: "next",
  };
}

class PublicSurfaceClient extends ControlledUiClient {
  override watchQuery(reference: unknown, args: Record<string, unknown> = {}) {
    const name = getFunctionName(reference as never);
    if (name === "ui:roadmap") {
      const status = args.status as keyof typeof roadmapGroups;
      this.values.set(name, page(1, roadmapGroups[status]));
    } else if (name === "ui:changelogFeed") {
      this.values.set(name, page(1, changelogEntries));
    } else if (name === "ui:changelogEntry") {
      this.values.set(name, {
        contractVersion: 1,
        status: "entry",
        entry: changelogEntries[0],
      });
    } else if (name === "ui:notifications") {
      this.values.set(name, page(2, notifications));
    } else if (name === "ui:unread") {
      this.values.set(name, { contractVersion: 1, count: 1 });
    }
    return super.watchQuery(reference, args);
  }
}

function change(element: HTMLSelectElement, value: string) {
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value",
    );
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("public roadmap", () => {
  test("renders exact server groups in order with board filtering and independent pagination", async () => {
    const client = new PublicSurfaceClient();
    const mounted = renderUi(
      <AfferentRoadmapScreen boards={[board, roadmapBoard]} />,
      { client, bindings: surfaceBindings },
    );
    await act(async () => {});

    expect(
      [
        ...mounted.container.querySelectorAll("section[data-roadmap-group]"),
      ].map((group) => group.getAttribute("data-roadmap-group")),
    ).toEqual(["planned", "in_progress", "complete"]);
    expect(
      [
        ...mounted.container.querySelectorAll(
          "[data-roadmap-group='planned'] article h3",
        ),
      ].map((heading) => heading.textContent),
    ).toEqual(["Planned first", "Planned second"]);
    expect(mounted.container.textContent).not.toContain("Open");

    const plannedLoad = mounted.container.querySelector<HTMLButtonElement>(
      "[data-roadmap-group='planned'] button",
    )!;
    click(plannedLoad);
    await act(async () => {});
    expect(
      client.records.filter(
        (record) =>
          record.name === "ui:roadmap" && record.args.status === "planned",
      ).length,
    ).toBeGreaterThan(
      client.records.filter(
        (record) =>
          record.name === "ui:roadmap" && record.args.status === "complete",
      ).length,
    );

    change(
      mounted.container.querySelector<HTMLSelectElement>(
        "select[name='roadmap-board']",
      )!,
      roadmapBoard.id,
    );
    await act(async () => {});
    expect(
      client.records
        .filter((record) => record.name === "ui:roadmap")
        .slice(-3)
        .every((record) => record.args.boardId === roadmapBoard.id),
    ).toBe(true);
    mounted.unmount();
  });
});

describe("public changelog", () => {
  test("preserves server chronology and renders stable entry and linked-feedback hrefs", async () => {
    const mounted = renderUi(
      <AfferentChangelogScreen slug="latest-release" />,
      { client: new PublicSurfaceClient(), bindings: surfaceBindings },
    );
    await act(async () => {});
    expect(
      [...mounted.container.querySelectorAll("[data-changelog-entry]")].map(
        (entry) => entry.querySelector("h2, h3")?.textContent,
      ),
    ).toEqual(["Latest release", "Earlier release"]);
    expect(
      mounted.container.querySelector("a[href='/changelog/latest-release']")
        ?.textContent,
    ).toContain("Latest release");
    expect(
      mounted.container.querySelector(`a[href='/feedback/${feedbackPost.id}']`)
        ?.textContent,
    ).toContain(feedbackPost.title);
    expect(mounted.container.textContent).toContain("The latest release body.");
    mounted.unmount();
  });
});

describe("notifications", () => {
  test("works independently with exact targets, unread state, paging, and mark-read hook actions", async () => {
    const client = new PublicSurfaceClient();
    const mounted = renderUi(<AfferentNotificationsList />, {
      client,
      bindings: surfaceBindings,
    });
    await act(async () => {});
    expect(mounted.container.textContent).toContain("1 unread notification");
    expect(
      mounted.container.querySelector(`a[href='/feedback/${feedbackPost.id}']`)
        ?.textContent,
    ).toBe(`View comment on feedback: ${feedbackPost.title}`);
    expect(
      mounted.container.querySelector("a[href='/changelog/latest-release']")
        ?.textContent,
    ).toBe("View changelog: Latest release");
    expect(
      mounted.container.querySelector("[data-notification-unread='true']")
        ?.textContent,
    ).toContain("Unread");

    click(
      mounted.container.querySelector<HTMLButtonElement>(
        "[data-notification-unread='true'] button",
      )!,
    );
    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent === "Load more notifications",
      )!,
    );
    await act(async () => {});
    expect(client.mutationCalls).toContainEqual({
      name: "ui:markNotificationRead",
      args: { notificationId: "notification:post" },
    });
    expect(
      client.records.filter((record) => record.name === "ui:notifications"),
    ).toHaveLength(2);
    expect(
      mounted.container.querySelector("[role='status']")?.textContent,
    ).toMatch(/notification|Loading/i);
    mounted.unmount();
  });

  test("popover closes on Escape and restores its trigger without trapping page focus", async () => {
    const mounted = renderUi(<AfferentNotificationsPopover />, {
      client: new PublicSurfaceClient(),
      bindings: surfaceBindings,
    });
    await act(async () => {});
    const trigger = mounted.container.querySelector<HTMLButtonElement>(
      "button[aria-haspopup='dialog']",
    )!;
    trigger.focus();
    click(trigger);
    await act(async () => {});
    expect(document.body.textContent).toContain(
      "View changelog: Latest release",
    );
    act(() =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    await act(async () => {});
    expect(
      document.body.querySelector("[data-afferent-notifications-popover]"),
    ).toBeNull();
    expect(document.activeElement).toBe(trigger);
    mounted.unmount();
  });
});

describe("closed public surface states", () => {
  test("renders unsupported, unauthenticated, loading, empty, and error copy without stealing focus", async () => {
    const unsupported = renderUi(<AfferentRoadmapScreen boards={[board]} />, {
      bindings: uiBindings,
    });
    await act(async () => {});
    expect(unsupported.container.textContent).toContain(
      "This feature isn't configured",
    );
    unsupported.unmount();

    const unauthenticated = renderUi(<AfferentNotificationsList />, {
      bindings: surfaceBindings,
      auth: { status: "unauthenticated" },
    });
    await act(async () => {});
    expect(unauthenticated.container.textContent).toContain(
      "Sign in to continue",
    );
    expect(unauthenticated.container.textContent).toContain(
      "Sign in through this application to view notifications.",
    );
    unauthenticated.unmount();

    const loadingClient = new PublicSurfaceClient();
    loadingClient.values.set("ui:changelogFeed", undefined);
    const loading = renderUi(<AfferentChangelogScreen />, {
      client: loadingClient,
      bindings: surfaceBindings,
    });
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    await act(async () => {});
    expect(loading.container.textContent).toContain("Loading changelog…");
    expect(document.activeElement).toBe(outside);
    act(() => loading.client.publish("changelogFeed", page(1, [])));
    expect(loading.container.textContent).toContain("Updates will appear here");
    act(() => loading.client.fail("changelogFeed", new Error("offline")));
    expect(loading.container.textContent).toContain(
      "We couldn't load changelog",
    );
    expect(loading.container.textContent).toContain("Try loading again");
    loading.unmount();
  });

  test("source and CSS retain server grouping, route agnosticism, hook ownership, and pointer sizing", () => {
    const source = [
      "ui/afferent/roadmap/roadmap-screen.tsx",
      "ui/afferent/changelog/changelog-screen.tsx",
      "ui/afferent/notifications/notifications-list.tsx",
      "ui/afferent/notifications/notifications-popover.tsx",
    ]
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");
    expect(source).toMatch(/groups\.planned/);
    expect(source).toMatch(/groups\.inProgress/);
    expect(source).toMatch(/groups\.complete/);
    expect(source).toMatch(/target\.kind/);
    expect(source).not.toMatch(
      /window\.|from ["'][^"']*router|useMediaQuery|dangerouslySetInnerHTML|entityId/,
    );
    expect(
      fs.readFileSync(
        "ui/afferent/notifications/notifications-list.tsx",
        "utf8",
      ),
    ).not.toMatch(/useState|useReducer/);
    const styles = fs.readFileSync("ui/afferent/afferent.css", "utf8");
    expect(styles).toMatch(/@media \(min-width: 768px\)/);
    expect(styles).toMatch(
      /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
    );
    expect(styles).toMatch(/@media \(pointer: coarse\)/);
    expect(styles).toMatch(/min-height: 44px/);
    expect(styles).toMatch(/min-width: 44px/);
  });
});
