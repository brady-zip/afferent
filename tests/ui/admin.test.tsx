// @vitest-environment jsdom

import fs from "node:fs";
import React, { act } from "react";
import { getFunctionName, makeFunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  ControlledUiClient,
  board,
  click,
  feedbackPost,
  renderUi,
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
  override watchQuery(reference: unknown, args: Record<string, unknown> = {}) {
    const name = getFunctionName(reference as never);
    if (name === "admin:capability") this.values.set(name, true);
    if (name === "admin:feedback") this.values.set(name, page([adminPost]));
    if (name === "admin:post") this.values.set(name, adminPost);
    if (name === "admin:tags")
      this.values.set(name, { contractVersion: 1, tags: [tag] });
    if (name === "admin:activity") this.values.set(name, page([], 2));
    if (name === "admin:changelog") this.values.set(name, page([entry]));
    return super.watchQuery(reference, args);
  }
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => document.body.replaceChildren());

describe("admin product interface", () => {
  test("capability gates the complete moderation, tag, activity, merge, and changelog workspace", async () => {
    const { AfferentAdminScreen } =
      await import("../../ui/afferent/admin/admin-screen.js");
    const client = new AdminClient();
    const mounted = renderUi(<AfferentAdminScreen boards={[board]} />, {
      client,
      bindings: adminBindings,
    });
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
    const unsupported = renderUi(<AfferentAdminScreen boards={[board]} />);
    await act(async () => {});
    expect(unsupported.container.textContent).toContain(
      "This feature isn't configured",
    );
    unsupported.unmount();
    const denied = renderUi(<AfferentAdminScreen boards={[board]} />, {
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
    expect(source).not.toMatch(
      /dangerouslySetInnerHTML|from ["'][^"']*convex|isAdmin|scopeId/,
    );
    const css = fs.readFileSync("ui/afferent/afferent.css", "utf8");
    expect(css).toMatch(
      /grid-template-columns: minmax\(280px, 35fr\) minmax\(0, 65fr\)/,
    );
    expect(css).toMatch(/data-admin-label/);
  });
});
