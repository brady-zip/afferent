"use client";

import { useState } from "react";
import { ConvexProvider } from "convex/react";
import { getFunctionName, makeFunctionReference } from "convex/server";

import { AfferentProvider } from "afferent/react.js";

import { AfferentAdminScreen } from "@/components/afferent/admin/admin-screen";
import { AfferentBoardScreen } from "@/components/afferent/board/board-screen";
import { AfferentChangelogScreen } from "@/components/afferent/changelog/changelog-screen";
import { AfferentUiProvider } from "@/components/afferent/core/afferent-ui-provider";
import { AfferentNotificationsList } from "@/components/afferent/notifications/notifications-list";
import { AfferentNotificationsPopover } from "@/components/afferent/notifications/notifications-popover";
import { AfferentRoadmapScreen } from "@/components/afferent/roadmap/roadmap-screen";

const query = (name: string) =>
  makeFunctionReference<"query">(`evidence:${name}`);
const mutation = (name: string) =>
  makeFunctionReference<"mutation">(`evidence:${name}`);

const board = { id: "board:feedback", slug: "feedback", name: "Feedback" };
const roadmapBoard = {
  id: "board:roadmap",
  slug: "roadmap",
  name: "Roadmap board",
};
const fixturePost = {
  id: "post:keyboard",
  contractVersion: 3,
  title: "Keyboard shortcuts",
  body: "Add keyboard shortcuts to the editor.",
  status: { key: "planned", label: "Planned" },
  boardId: board.id,
  board,
  author: { id: "actor:alex", displayName: "Alex" },
  voteCount: 7,
  commentCount: 2,
  totals: { votes: 7, comments: 2 },
  tags: [],
  viewerHasVoted: false,
  viewerCanEdit: true,
  viewerCanWithdraw: true,
};
const canonicalPost = {
  ...fixturePost,
  id: "post:canonical",
  title: "Editor productivity",
  viewerCanEdit: false,
  viewerCanWithdraw: false,
};
const adminPost = {
  contractVersion: 1,
  feedback: fixturePost,
  moderation: {
    contractVersion: 1,
    discussionLocked: false,
    archived: false,
    disposition: "active",
  },
};
const canonicalAdminPost = {
  contractVersion: 1,
  feedback: canonicalPost,
  moderation: {
    contractVersion: 1,
    discussionLocked: false,
    archived: false,
    disposition: "active",
  },
};
const comments = [
  {
    contractVersion: 1,
    id: "comment:root",
    postId: fixturePost.id,
    body: "This would help every day.",
    author: { id: "actor:morgan", displayName: "Morgan" },
  },
  {
    contractVersion: 1,
    id: "comment:reply",
    postId: fixturePost.id,
    body: "Especially for power users.",
    author: { id: "actor:riley", displayName: "Riley" },
    parentCommentId: "comment:root",
  },
];
const roadmapItems = {
  planned: [
    {
      contractVersion: 1,
      id: fixturePost.id,
      boardId: roadmapBoard.id,
      board: roadmapBoard,
      title: fixturePost.title,
      status: { key: "planned", label: "Planned" },
      currentStatusSince: 200,
      createdAt: 100,
      voteCount: 7,
      commentCount: 2,
    },
  ],
  in_progress: [
    {
      contractVersion: 1,
      id: "post:progress",
      boardId: roadmapBoard.id,
      board: roadmapBoard,
      title: "Building notification filters",
      status: { key: "in_progress", label: "In Progress" },
      currentStatusSince: 180,
      createdAt: 90,
      voteCount: 4,
      commentCount: 1,
    },
  ],
  complete: [
    {
      contractVersion: 1,
      id: "post:complete",
      boardId: roadmapBoard.id,
      board: roadmapBoard,
      title: "Shipped accessible feedback",
      status: { key: "complete", label: "Complete" },
      currentStatusSince: 160,
      createdAt: 80,
      voteCount: 12,
      commentCount: 3,
    },
  ],
};
const changelogEntries = [
  {
    contractVersion: 1,
    id: "changelog:latest",
    title: "Accessible feedback shipped",
    body: "Keyboard and responsive improvements are now available.",
    slug: "accessible-feedback",
    firstPublishedAt: 200,
    updatedAt: 200,
    links: [
      {
        contractVersion: 1,
        id: fixturePost.id,
        title: fixturePost.title,
        status: fixturePost.status,
      },
    ],
  },
];
const adminChangelogEntries = [
  {
    contractVersion: 2,
    id: "changelog:draft",
    title: "Editor update",
    body: "Shipped.",
    slug: "editor-update",
    state: "draft",
    createdAt: 1,
    updatedAt: 1,
    links: [],
  },
];
const notifications = [
  {
    contractVersion: 2,
    id: "notification:reply",
    eventId: "event:reply",
    type: "comment_replied",
    target: {
      contractVersion: 1,
      kind: "post",
      postId: fixturePost.id,
      commentId: "comment:root",
      label: `View comment on feedback: ${fixturePost.title}`,
    },
    occurredAt: 200,
    read: false,
    initiator: { id: "actor:morgan", displayName: "Morgan" },
  },
  {
    contractVersion: 2,
    id: "notification:release",
    eventId: "event:release",
    type: "changelog_published",
    target: {
      contractVersion: 1,
      kind: "changelog",
      slug: "accessible-feedback",
      label: "View changelog: Accessible feedback shipped",
    },
    occurredAt: 100,
    read: true,
    initiator: { id: "actor:riley", displayName: "Riley" },
  },
];

function page(contractVersion: number, items: readonly unknown[]) {
  return {
    contractVersion,
    page: items,
    posts: items,
    entries: items,
    notifications: items,
    comments: items,
    items,
    isDone: true,
    continueCursor: "done",
  };
}

function queryValue(name: string, args: Record<string, unknown>) {
  if (name === "evidence:feed") return page(3, [fixturePost, canonicalPost]);
  if (name === "evidence:post") {
    return { contractVersion: 2, status: "post", post: fixturePost };
  }
  if (name === "evidence:comments") return page(1, comments);
  if (name === "evidence:search" || name === "evidence:similar") {
    return {
      contractVersion: 1,
      items: [
        {
          contractVersion: 1,
          id: fixturePost.id,
          title: fixturePost.title,
          board,
          status: fixturePost.status,
        },
      ],
      hasMore: false,
    };
  }
  if (name === "evidence:subscription") {
    return { contractVersion: 1, subscribed: false, explicitOptOut: false };
  }
  if (name === "evidence:roadmap") {
    const status = args.status as keyof typeof roadmapItems;
    return page(1, roadmapItems[status] ?? []);
  }
  if (name === "evidence:changelogFeed") return page(1, changelogEntries);
  if (name === "evidence:changelogEntry") {
    return {
      contractVersion: 1,
      status: "entry",
      entry: changelogEntries[0],
    };
  }
  if (name === "evidence:notifications") return page(2, notifications);
  if (name === "evidence:unread") {
    return { contractVersion: 1, count: 1 };
  }
  if (name === "evidence:adminCapability") return true;
  if (name === "evidence:adminFeedback") {
    if (args.visibility === "hidden") return page(1, []);
    return page(1, [adminPost, canonicalAdminPost]);
  }
  if (name === "evidence:adminPost") return adminPost;
  if (name === "evidence:tags") {
    return {
      contractVersion: 1,
      tags: [
        {
          contractVersion: 1,
          id: "tag:important",
          name: "Important",
          slug: "important",
        },
      ],
    };
  }
  if (name === "evidence:activity") return page(2, []);
  if (name === "evidence:adminChangelog") {
    return page(1, adminChangelogEntries);
  }
  return undefined;
}

const client = {
  watchQuery(reference: unknown, args: Record<string, unknown> = {}) {
    const value = queryValue(getFunctionName(reference as never), args);
    return {
      onUpdate() {
        return () => {};
      },
      localQueryResult() {
        return value;
      },
      localQueryLogs() {
        return undefined;
      },
      journal() {
        return undefined;
      },
    };
  },
  mutation() {
    return Promise.resolve({ contractVersion: 1, ok: true, data: {} });
  },
};

const bindings = {
  public: {
    listFeedback: query("feed"),
    listComments: query("comments"),
    getPost: query("post"),
    searchFeedback: query("search"),
    suggestSimilarPosts: query("similar"),
  },
  participation: {
    createPost: mutation("createPost"),
    editPost: mutation("editPost"),
    withdrawPost: mutation("withdrawPost"),
    setVote: mutation("setVote"),
    addComment: mutation("addComment"),
  },
  roadmap: { listRoadmapGroup: query("roadmap") },
  changelog: {
    listPublished: query("changelogFeed"),
    getPublishedBySlug: query("changelogEntry"),
  },
  notifications: {
    getPostSubscription: query("subscription"),
    setPostSubscription: mutation("setSubscription"),
    listNotifications: query("notifications"),
    getUnreadCount: query("unread"),
    markNotificationRead: mutation("markNotificationRead"),
  },
  admin: {
    capability: query("adminCapability"),
    listAdminFeedback: query("adminFeedback"),
    getAdminPost: query("adminPost"),
    listTags: query("tags"),
    listPostActivity: query("activity"),
    listAdminChangelog: query("adminChangelog"),
    editPost: mutation("adminEditPost"),
    movePost: mutation("movePost"),
    setPostStatus: mutation("setPostStatus"),
    setDiscussionLock: mutation("setDiscussionLock"),
    setArchived: mutation("setArchived"),
    createTag: mutation("createTag"),
    renameTag: mutation("renameTag"),
    setPostTag: mutation("setPostTag"),
    deleteTag: mutation("deleteTag"),
    mergePost: mutation("mergePost"),
    createChangelogDraft: mutation("createChangelogDraft"),
    editChangelog: mutation("editChangelog"),
    setChangelogLinks: mutation("setChangelogLinks"),
    publishChangelog: mutation("publishChangelog"),
    unpublishChangelog: mutation("unpublishChangelog"),
  },
} as never;

type Surface =
  | "board"
  | "detail"
  | "roadmap"
  | "changelog"
  | "notifications"
  | "popover"
  | "admin";

const surfaces: readonly Readonly<{ id: Surface; label: string }>[] = [
  { id: "board", label: "Board" },
  { id: "detail", label: "Feedback detail" },
  { id: "roadmap", label: "Roadmap" },
  { id: "changelog", label: "Changelog" },
  { id: "notifications", label: "Notifications" },
  { id: "popover", label: "Notifications popover" },
  { id: "admin", label: "Administration" },
];

export function App() {
  const [surface, setSurface] = useState<Surface>("board");
  const [adminMobileView, setAdminMobileView] = useState<"queue" | "detail">(
    "queue",
  );
  return (
    <ConvexProvider client={client as never}>
      <AfferentProvider
        bindings={bindings}
        auth={{ status: "authenticated", identityToken: "fixture-actor" }}
        client={client as never}
      >
        <AfferentUiProvider
          href={{
            post: (id) => `/feedback/${id}`,
            roadmap: () => "/roadmap",
            changelog: (slug) => `/changelog/${slug}`,
          }}
          currentLocation={`/${surface}`}
        >
          <output
            className="evidence-source"
            data-evidence-source="packed-registry-installed"
          >
            Packed package and generated registry source
          </output>
          <nav className="evidence-nav" aria-label="Evidence surfaces">
            {surfaces.map((candidate) => (
              <button
                aria-current={surface === candidate.id ? "page" : undefined}
                key={candidate.id}
                onClick={() => setSurface(candidate.id)}
                type="button"
              >
                {candidate.label}
              </button>
            ))}
          </nav>
          {surface === "board" ? (
            <AfferentBoardScreen boards={[board, roadmapBoard] as never} />
          ) : null}
          {surface === "detail" ? (
            <AfferentBoardScreen
              boards={[board, roadmapBoard] as never}
              postId={fixturePost.id as never}
            />
          ) : null}
          {surface === "roadmap" ? (
            <AfferentRoadmapScreen boards={[board, roadmapBoard] as never} />
          ) : null}
          {surface === "changelog" ? (
            <AfferentChangelogScreen slug="accessible-feedback" />
          ) : null}
          {surface === "notifications" ? <AfferentNotificationsList /> : null}
          {surface === "popover" ? (
            <main className="evidence-popover-surface">
              <h1>Notification preview</h1>
              <AfferentNotificationsPopover />
            </main>
          ) : null}
          {surface === "admin" ? (
            <AfferentAdminScreen
              boards={[board, roadmapBoard] as never}
              mobileView={adminMobileView}
              onMobileViewChange={setAdminMobileView}
            />
          ) : null}
        </AfferentUiProvider>
      </AfferentProvider>
    </ConvexProvider>
  );
}
