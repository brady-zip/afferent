import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { createAfferentClient } from "../../src/client/index.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";
import { withRateLimiter } from "../helpers/rate-limiter.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

function context(backend: ReturnType<typeof convexTest>) {
  return {
    auth: { getUserIdentity: async () => null },
    runMutation: (reference: Parameters<typeof backend.mutation>[0], args: object) => backend.mutation(reference, args),
    runQuery: (reference: Parameters<typeof backend.query>[0], args: object) => backend.query(reference, args),
  };
}

describe("admin activity presentation", () => {
  test("preserves snapshot history and safely resolves every legacy relation branch", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:history-admin" }),
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    }) as any;
    const ctx = context(backend) as never;
    const installation = await client.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [
        { slug: "snapshot-from", name: "Snapshot from" },
        { slug: "snapshot-to", name: "Snapshot to" },
      ],
    });
    const post = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Historical projection",
      body: "History body",
    });

    await client.admin.movePost(ctx, {
      postId: post.id,
      boardId: installation.boards[1].id,
    });
    const snapshotTag = await client.admin.createTag(ctx, {
      name: "Snapshot tag",
    });
    await client.admin.setPostTag(ctx, {
      postId: post.id,
      tagId: snapshotTag.id,
      desired: true,
    });
    const snapshotChangelog = await client.admin.createChangelogDraft(ctx, {
      title: "Snapshot release",
      body: "Snapshot release body",
      slug: "snapshot-release",
    });
    await client.admin.setChangelogLinks(ctx, {
      entryId: snapshotChangelog.id,
      postIds: [post.id],
    });
    await client.admin.publishChangelog(ctx, {
      entryId: snapshotChangelog.id,
    });
    await client.admin.unpublishChangelog(ctx, {
      entryId: snapshotChangelog.id,
    });
    await client.admin.editChangelog(ctx, {
      entryId: snapshotChangelog.id,
      title: "Changed after history",
    });
    await client.admin.deleteTag(ctx, { tagId: snapshotTag.id });

    const legacy = await backend.run(async (runCtx) => {
      await runCtx.db.patch(installation.boards[0].id, {
        name: "Changed from board",
        slug: "changed-from-board",
      });
      await runCtx.db.patch(installation.boards[1].id, {
        name: "Changed to board",
        slug: "changed-to-board",
      });
      const liveBoard = await runCtx.db.insert("boards", {
        scopeId: "afferent:single-product:v1",
        name: "Legacy live board",
        slug: "legacy-live-board",
        sortOrder: 20,
      });
      const liveTag = await runCtx.db.insert("tags", {
        scopeId: "afferent:single-product:v1",
        name: "Legacy live tag",
        normalizedName: "legacy live tag",
        state: "active",
      });
      const liveChangelog = await runCtx.db.insert("changelogEntries", {
        scopeId: "afferent:single-product:v1",
        title: "Legacy live changelog",
        body: "Legacy body",
        slug: "legacy-live-changelog",
        publishedKey: "hidden",
        createdAt: 30_000,
        updatedAt: 30_000,
        orderId: "legacy-live",
      });
      const missingBoard = await runCtx.db.insert("boards", {
        scopeId: "afferent:single-product:v1",
        name: "Soon deleted board",
        slug: "soon-deleted-board",
        sortOrder: 21,
      });
      const missingTag = await runCtx.db.insert("tags", {
        scopeId: "afferent:single-product:v1",
        name: "Soon deleted tag",
        normalizedName: "soon deleted tag",
        state: "active",
      });
      const missingChangelog = await runCtx.db.insert("changelogEntries", {
        scopeId: "afferent:single-product:v1",
        title: "Soon deleted changelog",
        body: "Soon deleted body",
        slug: "soon-deleted-changelog",
        publishedKey: "hidden",
        createdAt: 30_001,
        updatedAt: 30_001,
        orderId: "legacy-missing",
      });
      const foreignBoard = await runCtx.db.insert("boards", {
        scopeId: "scope:foreign-history",
        name: "Foreign board secret",
        slug: "foreign-board-secret",
        sortOrder: 0,
      });
      const foreignTag = await runCtx.db.insert("tags", {
        scopeId: "scope:foreign-history",
        name: "Foreign tag secret",
        normalizedName: "foreign tag secret",
        state: "active",
      });
      const foreignChangelog = await runCtx.db.insert("changelogEntries", {
        scopeId: "scope:foreign-history",
        title: "Foreign changelog secret",
        body: "Foreign changelog body secret",
        slug: "foreign-changelog-secret",
        publishedKey: "hidden",
        createdAt: 30_002,
        updatedAt: 30_002,
        orderId: "legacy-foreign",
      });
      let occurredAt = 40_000;
      const insert = async (
        type: "board_move" | "tag_add" | "changelog_publish",
        relation: Record<string, unknown>,
      ) => {
        occurredAt += 1;
        return String(
          await runCtx.db.insert("postActivity", {
            scopeId: "afferent:single-product:v1",
            postId: post.id,
            type,
            occurredAt,
            ...relation,
          } as never),
        );
      };
      const ids = {
        liveBoard: await insert("board_move", { fromBoardId: liveBoard }),
        liveTag: await insert("tag_add", { tagId: liveTag }),
        liveChangelog: await insert("changelog_publish", {
          changelogEntryId: liveChangelog,
        }),
        missingBoard: await insert("board_move", {
          fromBoardId: missingBoard,
        }),
        missingTag: await insert("tag_add", { tagId: missingTag }),
        missingChangelog: await insert("changelog_publish", {
          changelogEntryId: missingChangelog,
        }),
        foreignBoard: await insert("board_move", {
          fromBoardId: foreignBoard,
        }),
        foreignTag: await insert("tag_add", { tagId: foreignTag }),
        foreignChangelog: await insert("changelog_publish", {
          changelogEntryId: foreignChangelog,
        }),
      };
      await runCtx.db.delete(missingBoard);
      await runCtx.db.delete(missingTag);
      await runCtx.db.delete(missingChangelog);
      return ids;
    });

    const page = await client.admin.listPostActivity(ctx, {
      postId: post.id,
      paginationOpts: { numItems: 50, cursor: null },
    });
    const byId = new Map(page.page.map((row: any) => [row.id, row]));
    const boardSnapshot = page.page.find(
      (row: any) =>
        row.type === "board_move" &&
        row.fromBoard?.slug === "snapshot-from",
    );
    const tagSnapshot = page.page.find(
      (row: any) => row.type === "tag_add" && row.tag?.name === "Snapshot tag",
    );
    const changelogSnapshots = page.page.filter(
      (row: any) =>
        (row.type === "changelog_publish" ||
          row.type === "changelog_unpublish") &&
        row.changelog?.slug === "snapshot-release",
    );
    expect(boardSnapshot).toMatchObject({
      fromBoard: {
        contractVersion: 1,
        name: "Snapshot from",
        slug: "snapshot-from",
      },
      toBoard: {
        contractVersion: 1,
        name: "Snapshot to",
        slug: "snapshot-to",
      },
    });
    expect(tagSnapshot).toMatchObject({
      tag: { contractVersion: 1, name: "Snapshot tag" },
    });
    expect(changelogSnapshots).toHaveLength(2);
    for (const row of changelogSnapshots) {
      expect(row).toMatchObject({
        changelog: {
          contractVersion: 1,
          title: "Snapshot release",
          slug: "snapshot-release",
        },
      });
    }

    expect(byId.get(legacy.liveBoard)).toMatchObject({
      fromBoard: {
        contractVersion: 1,
        name: "Legacy live board",
        slug: "legacy-live-board",
      },
    });
    expect(byId.get(legacy.liveTag)).toMatchObject({
      tag: { contractVersion: 1, name: "Legacy live tag" },
    });
    expect(byId.get(legacy.liveChangelog)).toMatchObject({
      changelog: {
        contractVersion: 1,
        title: "Legacy live changelog",
        slug: "legacy-live-changelog",
      },
    });
    for (const id of [legacy.missingBoard, legacy.foreignBoard]) {
      expect(byId.get(id)).toMatchObject({
        fromBoard: {
          contractVersion: 1,
          name: "Deleted board",
          slug: "deleted-board",
        },
      });
    }
    for (const id of [legacy.missingTag, legacy.foreignTag]) {
      expect(byId.get(id)).toMatchObject({
        tag: { contractVersion: 1, name: "Deleted tag" },
      });
    }
    for (const id of [
      legacy.missingChangelog,
      legacy.foreignChangelog,
    ]) {
      expect(byId.get(id)).toMatchObject({
        changelog: {
          contractVersion: 1,
          title: "Unavailable changelog entry",
          slug: "unavailable-changelog-entry",
        },
      });
    }

    const tested = [
      boardSnapshot,
      tagSnapshot,
      ...changelogSnapshots,
      ...Object.values(legacy).map((id) => byId.get(id)),
    ];
    for (const row of tested) {
      expect(row).toBeDefined();
      expect(row).not.toHaveProperty("fromBoardId");
      expect(row).not.toHaveProperty("toBoardId");
      expect(row).not.toHaveProperty("tagId");
      expect(row).not.toHaveProperty("changelogEntryId");
    }
    const serialized = JSON.stringify(tested);
    expect(serialized).not.toContain("Foreign board secret");
    expect(serialized).not.toContain("Foreign tag secret");
    expect(serialized).not.toContain("Foreign changelog secret");
  });

  test("projects readable board references and never leaks opaque ids", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:admin" }),
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    }) as any;
    const ctx = context(backend) as never;
    const installation = await client.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "one", name: "One" }, { slug: "two", name: "Two" }],
    });
    const post = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Move me",
      body: "Body",
    });
    await client.admin.movePost(ctx, { postId: post.id, boardId: installation.boards[1].id });
    const page = await client.admin.listPostActivity(ctx, {
      postId: post.id,
      paginationOpts: { numItems: 10, cursor: null },
    });
    const moved = page.page.find((row: any) => row.type === "board_move");
    expect(page.contractVersion).toBe(2);
    expect(moved).toMatchObject({
      contractVersion: 2,
      fromBoard: { contractVersion: 1, name: "One", slug: "one" },
      toBoard: { contractVersion: 1, name: "Two", slug: "two" },
    });
    expect(moved).not.toHaveProperty("fromBoardId");
    expect(moved).not.toHaveProperty("toBoardId");
  });
});
