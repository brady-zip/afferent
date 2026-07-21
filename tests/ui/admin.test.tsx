// @vitest-environment jsdom

import fs from "node:fs";
import React, { act, useState } from "react";
import { getFunctionName, makeFunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  ControlledUiClient,
  board,
  click,
  feedbackPost,
  renderUi,
  setInput,
} from "./harness.js";

const query = (name: string) => makeFunctionReference<"query">(`admin:${name}`);
const mutation = (name: string) =>
  makeFunctionReference<"mutation">(`admin:${name}`);

const adminPost = {
  contractVersion: 1,
  feedback: feedbackPost,
  moderation: {
    contractVersion: 1,
    discussionLocked: false,
    archived: false,
    disposition: "active",
  },
} as const;
const canonicalAdminPost = {
  ...adminPost,
  feedback: {
    ...feedbackPost,
    id: "post:canonical",
    title: "Editor productivity",
  },
} as const;
const tag = {
  contractVersion: 1,
  id: "tag:one",
  name: "Important",
  slug: "important",
} as const;
const entry = {
  contractVersion: 2,
  id: "changelog:one",
  title: "Editor update",
  body: "Shipped.",
  slug: "editor-update",
  state: "draft",
  createdAt: 1,
  updatedAt: 1,
  links: [],
} as const;
const publishedEntry = {
  ...entry,
  id: "changelog:published",
  title: "Published update",
  slug: "published-update",
  state: "published",
  firstPublishedAt: 1,
  publishedAt: 1,
} as const;
const activityItem = {
  contractVersion: 2,
  id: "activity:one",
  postId: feedbackPost.id,
  type: "status_change",
  occurredAt: 1,
  actor: feedbackPost.author,
  fromStatus: "open",
  toStatus: "planned",
} as const;
const page = (items: readonly unknown[], version = 1) => ({
  contractVersion: version,
  page: items,
  posts: items,
  entries: items,
  isDone: true,
  continueCursor: "done",
});

const refs = {
  capability: query("capability"),
  feedback: query("feedback"),
  post: query("post"),
  tags: query("tags"),
  activity: query("activity"),
  changelog: query("changelog"),
};
const adminBindings = {
  public: { listFeedback: query("public") },
  admin: {
    capability: refs.capability,
    listAdminFeedback: refs.feedback,
    getAdminPost: refs.post,
    listTags: refs.tags,
    listPostActivity: refs.activity,
    listAdminChangelog: refs.changelog,
    editPost: mutation("editPost"),
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

class AdminClient extends ControlledUiClient {
  entries = [entry, publishedEntry] as readonly unknown[];

  override watchQuery(reference: unknown, args: Record<string, unknown> = {}) {
    const name = getFunctionName(reference as never);
    if (name === "admin:capability") this.values.set(name, true);
    if (name === "admin:feedback")
      this.values.set(
        name,
        args.visibility === "hidden"
          ? page([])
          : page([adminPost, canonicalAdminPost]),
      );
    if (name === "admin:post") this.values.set(name, adminPost);
    if (name === "admin:tags")
      this.values.set(name, { contractVersion: 1, tags: [tag] });
    if (name === "admin:activity")
      this.values.set(name, page([activityItem], 2));
    if (name === "admin:changelog") this.values.set(name, page(this.entries));
    return super.watchQuery(reference, args);
  }
}

function buttonNamed(root: ParentNode, name: string) {
  const button = [...root.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!button) throw new Error(`Missing button: ${name}`);
  return button;
}

async function settle() {
  await act(async () => {});
}

function ControlledAdmin() {
  const [mobileView, setMobileView] = useState<"queue" | "detail">("queue");
  return (
    <AfferentAdminScreenForTest
      boards={[board]}
      mobileView={mobileView}
      onMobileViewChange={setMobileView}
    />
  );
}

let AfferentAdminScreenForTest: React.ComponentType<any>;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => document.body.replaceChildren());

describe("admin product interface", () => {
  test("capability gates the complete moderation, tag, activity, merge, and changelog workspace", async () => {
    const { AfferentAdminScreen } =
      await import("../../ui/afferent/admin/admin-screen.js");
    AfferentAdminScreenForTest = AfferentAdminScreen;
    const client = new AdminClient();
    const mounted = renderUi(
      <AfferentAdminScreen
        boards={[board]}
        mobileView="queue"
        onMobileViewChange={() => {}}
      />,
      { client, bindings: adminBindings },
    );
    await act(async () => {});
    expect(mounted.container.textContent).toContain("Feedback management");
    expect(mounted.container.textContent).toContain(feedbackPost.title);
    click(mounted.container.querySelector("[data-admin-feedback] button")!);
    await act(async () => {});
    for (const label of [
      "Update feedback status",
      "Lock discussion",
      "Archive feedback",
      "Manage tags",
      "Merge duplicate",
      "Changelog publishing",
    ]) {
      expect(mounted.container.textContent).toContain(label);
    }
    expect(
      mounted.container.querySelector("select[name='status']"),
    ).not.toBeNull();
    expect(
      mounted.container.querySelector("[data-admin-workspace]"),
    )?.not.toBeNull();
    mounted.unmount();
  });

  test("renders unsupported and not-authorized states without accepting authority props", async () => {
    const { AfferentAdminScreen } =
      await import("../../ui/afferent/admin/admin-screen.js");
    const props = {
      boards: [board],
      mobileView: "queue" as const,
      onMobileViewChange: () => {},
    };
    const unsupported = renderUi(<AfferentAdminScreen {...props} />, {
      bindings: { public: adminBindings.public } as never,
    });
    await act(async () => {});
    expect(unsupported.container.textContent).toContain(
      "This feature isn't configured",
    );
    unsupported.unmount();
    const denied = renderUi(<AfferentAdminScreen {...props} />, {
      bindings: adminBindings,
      auth: { status: "unauthenticated" },
    });
    await act(async () => {});
    expect(denied.container.textContent).toContain(
      "You don't have access to this area",
    );
    denied.unmount();
    const source = fs.readFileSync(
      "ui/afferent/admin/admin-screen.tsx",
      "utf8",
    );
    expect(source).not.toMatch(/isAdmin|userId|scopeId|window\.|drag/i);
  });

  test("confirms every consequential action before invoking its exact headless mutation", async () => {
    const { AfferentAdminScreen } =
      await import("../../ui/afferent/admin/admin-screen.js");
    const client = new AdminClient();
    const mounted = renderUi(
      <AfferentAdminScreen
        boards={[board]}
        mobileView="detail"
        onMobileViewChange={() => {}}
      />,
      { client, bindings: adminBindings },
    );
    await settle();
    click(mounted.container.querySelector("[data-admin-feedback] button")!);
    await settle();

    const cases = [
      {
        trigger: "Archive feedback",
        title: `Archive “${feedbackPost.title}”?`,
        body: "It will leave public feedback views until restored.",
        confirm: "Archive feedback",
        escape: "Keep feedback",
        mutation: "admin:setArchived",
      },
      {
        trigger: "Delete feedback tag",
        title: `Delete “${tag.name}”?`,
        body: "The tag will be removed from assigned feedback without deleting feedback.",
        confirm: "Delete feedback tag",
        escape: "Keep tag",
        mutation: "admin:deleteTag",
      },
      {
        trigger: "Publish changelog entry",
        title: `Publish “${entry.title}” now?`,
        body: "It will become visible at its public changelog link.",
        confirm: "Publish changelog entry",
        escape: "Return to editing",
        mutation: "admin:publishChangelog",
      },
      {
        trigger: "Unpublish changelog entry",
        title: `Unpublish “${publishedEntry.title}”?`,
        body: "Its public changelog link will stop showing the entry until republished.",
        confirm: "Unpublish changelog entry",
        escape: "Keep changelog published",
        mutation: "admin:unpublishChangelog",
      },
    ] as const;

    for (const scenario of cases) {
      const before = client.mutationCalls.length;
      const trigger = buttonNamed(mounted.container, scenario.trigger);
      trigger.focus();
      click(trigger);
      await settle();
      expect(client.mutationCalls).toHaveLength(before);
      expect(document.body.textContent).toContain(scenario.title);
      expect(document.body.textContent).toContain(scenario.body);
      expect(document.body.textContent).toContain(scenario.escape);
      const dialog = document.body.querySelector("[role='dialog']")!;
      click(buttonNamed(dialog, scenario.confirm));
      await settle();
      expect(client.mutationCalls.at(-1)?.name).toBe(scenario.mutation);
      expect(document.body.querySelector("[role='dialog']")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    }
    mounted.unmount();
  });

  test("explains merge consequences, requires the duplicate title, and exposes destructive semantics", async () => {
    const { AfferentAdminScreen } =
      await import("../../ui/afferent/admin/admin-screen.js");
    const client = new AdminClient();
    const mounted = renderUi(
      <AfferentAdminScreen
        boards={[board]}
        mobileView="detail"
        onMobileViewChange={() => {}}
      />,
      { client, bindings: adminBindings },
    );
    await settle();
    click(mounted.container.querySelector("[data-admin-feedback] button")!);
    await settle();
    click(buttonNamed(mounted.container, "Merge duplicate"));
    await settle();
    const dialog = document.body.querySelector("[role='dialog']")!;
    expect(dialog.textContent).toContain(feedbackPost.title);
    expect(dialog.textContent).toContain(canonicalAdminPost.feedback.title);
    expect(dialog.textContent).toContain(
      "This moves its votes, comments, and history and cannot be undone.",
    );
    expect(dialog.getAttribute("data-tone")).toBe("destructive");
    const confirm = buttonNamed(dialog, "Merge duplicate");
    expect(confirm.disabled).toBe(true);
    setInput(dialog.querySelector("input")!, feedbackPost.title);
    expect(confirm.disabled).toBe(false);
    click(confirm);
    await settle();
    expect(client.mutationCalls.at(-1)).toEqual({
      name: "admin:mergePost",
      args: {
        sourcePostId: feedbackPost.id,
        canonicalPostId: canonicalAdminPost.feedback.id,
      },
    });
    mounted.unmount();
  });

  test("keeps queue selection semantic after focus moves and lets the host control the phone pane", async () => {
    const { AfferentAdminScreen } =
      await import("../../ui/afferent/admin/admin-screen.js");
    AfferentAdminScreenForTest = AfferentAdminScreen;
    const mounted = renderUi(<ControlledAdmin />, {
      client: new AdminClient(),
      bindings: adminBindings,
    });
    await settle();
    const selected = mounted.container.querySelector(
      "[data-admin-feedback] button",
    )!;
    click(selected);
    await settle();
    expect(selected.getAttribute("aria-current")).toBe("true");
    expect(selected.textContent).toContain("Selected feedback");
    expect(
      mounted.container
        .querySelector("[data-admin-workspace]")
        ?.getAttribute("data-mobile-view"),
    ).toBe("detail");
    const detailField = mounted.container.querySelector<HTMLInputElement>(
      ".afferent-admin-detail input",
    )!;
    detailField.focus();
    expect(selected.getAttribute("aria-current")).toBe("true");
    click(buttonNamed(mounted.container, "Return to feedback queue"));
    await settle();
    expect(
      mounted.container
        .querySelector("[data-admin-workspace]")
        ?.getAttribute("data-mobile-view"),
    ).toBe("queue");
    mounted.unmount();
  });

  test("renders domain copy for administrative activity, editorial, loading, empty, and error states", async () => {
    const { AfferentAdminScreen } =
      await import("../../ui/afferent/admin/admin-screen.js");
    const client = new AdminClient();
    const mounted = renderUi(
      <AfferentAdminScreen
        boards={[board]}
        mobileView="detail"
        onMobileViewChange={() => {}}
      />,
      { client, bindings: adminBindings },
    );
    await settle();
    click(mounted.container.querySelector("[data-admin-feedback] button")!);
    await settle();
    expect(mounted.container.textContent).toContain(
      "Alex changed the feedback status from Open to Planned.",
    );
    expect(mounted.container.textContent).toContain("Draft");
    expect(mounted.container.textContent).toContain("Published");
    expect(mounted.container.textContent).not.toMatch(
      /status_change|\bdraft\b|\bpublished\b/,
    );
    mounted.unmount();

    const loading = renderUi(
      <AfferentAdminScreen
        boards={[board]}
        mobileView="queue"
        onMobileViewChange={() => {}}
      />,
      { client: new ControlledUiClient(), bindings: adminBindings },
    );
    await settle();
    expect(loading.container.textContent).toContain(
      "Loading feedback management…",
    );
    loading.unmount();

    const errorClient = new AdminClient();
    errorClient.errors.set("admin:capability", new Error("offline"));
    const failed = renderUi(
      <AfferentAdminScreen
        boards={[board]}
        mobileView="queue"
        onMobileViewChange={() => {}}
      />,
      { client: errorClient, bindings: adminBindings },
    );
    await settle();
    expect(failed.container.textContent).toContain(
      "We couldn't load feedback management",
    );
    expect(failed.container.querySelector("[data-tone='error']")).not.toBeNull();
    failed.unmount();
  });

  test("retains keyboard dialog, labelled card, responsive, and hook ownership contracts", () => {
    const source = [
      "admin-screen",
      "moderation-form",
      "tag-manager",
      "merge-dialog",
      "changelog-editor",
    ]
      .map((name) => fs.readFileSync(`ui/afferent/admin/${name}.tsx`, "utf8"))
      .join("\n");
    expect(source).toMatch(/useAdminCapability/);
    expect(source).toMatch(/useMergePost/);
    expect(source).toMatch(/useChangelogEditor/);
    expect(source).toMatch(/pending/);
    expect(source).toMatch(/errors/);
    expect(source).toMatch(/reset/);
    expect(source).not.toMatch(
      /dangerouslySetInnerHTML|from ["'][^"']*convex|isAdmin|scopeId/,
    );
    const css = fs.readFileSync("ui/afferent/afferent.css", "utf8");
    expect(css).toMatch(
      /grid-template-columns: minmax\(280px, 35fr\) minmax\(0, 65fr\)/,
    );
    expect(css).toMatch(/data-admin-label/);
    expect(css).toMatch(/data-selected="true"/);
    expect(css).toMatch(/data-tone="error"/);
    expect(css).toMatch(/data-tone="destructive"/);
  });
});
