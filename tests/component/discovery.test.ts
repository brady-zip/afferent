import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { createScopedAfferentClient } from "../../src/client/server.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

function backendContext(backend: ReturnType<typeof convexTest>) {
  return {
    auth: { getUserIdentity: async () => null },
    runMutation: (
      reference: Parameters<typeof backend.mutation>[0],
      args: object,
    ) => backend.mutation(reference, args),
    runQuery: (reference: Parameters<typeof backend.query>[0], args: object) =>
      backend.query(reference, args),
  };
}

function scopedClient(scopeId: string) {
  return createScopedAfferentClient(api as unknown as ComponentApi, {
    resolveScope: async () => scopeId,
    resolveActor: async () => ({ externalKey: `${scopeId}:actor` }),
    authorizeAdmin: async () => true,
    isAuthenticated: async () => true,
  });
}

describe("ranked public feedback discovery", () => {
  test("pages Newest, Top, and Trending through the trusted scoped host client", async () => {
    const backend = convexTest(schema, modules);
    const ctx = backendContext(backend);
    const alpha = scopedClient("scope:alpha");
    const beta = scopedClient("scope:beta");
    const alphaInstall = await alpha.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [
        { slug: "ideas", name: "Ideas" },
        { slug: "bugs", name: "Bugs" },
      ],
    });
    const betaInstall = await beta.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "ideas", name: "Ideas" }],
    });

    const seeded = await backend.run(async (runCtx) => {
      const alphaActor = await runCtx.db.insert("actors", {
        scopeId: "scope:alpha",
        externalKey: "scope:alpha:seed",
      });
      const betaActor = await runCtx.db.insert("actors", {
        scopeId: "scope:beta",
        externalKey: "scope:beta:seed",
      });
      const insertPost = async (args: {
        scopeId: string;
        boardId: string;
        actorId: string;
        title: string;
        createdAt: number;
        voteCount: number;
        commentCount: number;
        statusKey?: "open" | "planned";
        lifecycleState?: "active" | "withdrawn";
        archivedAt?: number;
        mergedIntoPostId?: string;
      }) => {
        const trendingScore =
          args.createdAt +
          args.voteCount * 43_200_000 +
          args.commentCount * 21_600_000;
        const postId = await runCtx.db.insert("posts", {
          scopeId: args.scopeId,
          boardId: args.boardId as never,
          actorId: args.actorId as never,
          title: args.title,
          body: args.title,
          lifecycleState: args.lifecycleState ?? "active",
          statusKey: args.statusKey ?? "open",
          voteCount: args.voteCount,
          commentCount: args.commentCount,
          createdAt: args.createdAt,
          currentStatusSince: args.createdAt,
          trendingScore,
          visibilityKey:
            (args.lifecycleState ?? "active") === "active" &&
            args.archivedAt === undefined &&
            args.mergedIntoPostId === undefined
              ? "visible"
              : "hidden",
          ...(args.archivedAt === undefined
            ? {}
            : { archivedAt: args.archivedAt }),
          ...(args.mergedIntoPostId === undefined
            ? {}
            : { mergedIntoPostId: args.mergedIntoPostId as never }),
        });
        await runCtx.db.patch(postId, { orderId: String(postId) });
        return postId;
      };

      const newest = await insertPost({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Newest",
        createdAt: 3000,
        voteCount: 0,
        commentCount: 0,
      });
      const top = await insertPost({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Top",
        createdAt: 1000,
        voteCount: 5,
        commentCount: 0,
        statusKey: "planned",
      });
      const discussed = await insertPost({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[1].id,
        actorId: alphaActor,
        title: "Discussed",
        createdAt: 2000,
        voteCount: 0,
        commentCount: 9,
      });
      const hiddenIds = await Promise.all([
        insertPost({
          scopeId: "scope:alpha",
          boardId: alphaInstall.boards[0].id,
          actorId: alphaActor,
          title: "Withdrawn",
          createdAt: 9000,
          voteCount: 99,
          commentCount: 99,
          lifecycleState: "withdrawn",
        }),
        insertPost({
          scopeId: "scope:alpha",
          boardId: alphaInstall.boards[0].id,
          actorId: alphaActor,
          title: "Archived",
          createdAt: 8000,
          voteCount: 99,
          commentCount: 99,
          archivedAt: 8001,
        }),
        insertPost({
          scopeId: "scope:alpha",
          boardId: alphaInstall.boards[0].id,
          actorId: alphaActor,
          title: "Merged source",
          createdAt: 7000,
          voteCount: 99,
          commentCount: 99,
          mergedIntoPostId: String(top),
        }),
      ]);
      const betaOnly = await insertPost({
        scopeId: "scope:beta",
        boardId: betaInstall.boards[0].id,
        actorId: betaActor,
        title: "Beta only",
        createdAt: 10_000,
        voteCount: 100,
        commentCount: 100,
      });
      return { newest, top, discussed, hiddenIds, betaOnly };
    });

    const list = (order: "newest" | "top" | "trending") =>
      alpha.read.listFeedback(ctx as never, {
        order,
        paginationOpts: { numItems: 2, cursor: null },
      });
    const newestPage = await list("newest");
    expect(newestPage.page.map(({ id }) => id)).toEqual([
      String(seeded.newest),
      String(seeded.discussed),
    ]);
    expect(newestPage.posts).toEqual(newestPage.page);
    expect(newestPage.isDone).toBe(false);
    expect(newestPage.continueCursor).toEqual(expect.any(String));

    const newestTail = await alpha.read.listFeedback(ctx as never, {
      order: "newest",
      paginationOpts: {
        numItems: 2,
        cursor: newestPage.continueCursor,
        ...(newestPage.splitCursor === undefined
          ? {}
          : { endCursor: newestPage.splitCursor }),
      },
    });
    expect(newestTail.page.map(({ id }) => id)).toEqual([String(seeded.top)]);
    expect(newestTail.isDone).toBe(true);

    const topPage = await list("top");
    expect(topPage.page.map(({ id }) => id)).toEqual([
      String(seeded.top),
      String(seeded.newest),
    ]);
    const trendingPage = await list("trending");
    expect(trendingPage.page.map(({ id }) => id)).toEqual([
      String(seeded.top),
      String(seeded.discussed),
    ]);

    const repeatedNewestPage = await list("newest");
    const visibleIds = [...repeatedNewestPage.page, ...newestTail.page].map(
      ({ id }) => id,
    );
    for (const hiddenId of [...seeded.hiddenIds, seeded.betaOnly]) {
      expect(visibleIds).not.toContain(String(hiddenId));
    }
  });

  test("serves board, status, and one-tag shapes without post-page filtering", async () => {
    const backend = convexTest(schema, modules);
    const ctx = backendContext(backend);
    const client = scopedClient("scope:filters");
    const installation = await client.admin.configureInstallation(
      ctx as never,
      {
        readPolicy: "public",
        boards: [
          { slug: "ideas", name: "Ideas" },
          { slug: "bugs", name: "Bugs" },
        ],
      },
    );
    const seeded = await backend.run(async (runCtx) => {
      const actorId = await runCtx.db.insert("actors", {
        scopeId: "scope:filters",
        externalKey: "scope:filters:seed",
      });
      const tagId = await runCtx.db.insert("tags", {
        scopeId: "scope:filters",
        name: "Performance",
      });
      const insert = async (
        boardId: string,
        title: string,
        statusKey: "open" | "planned",
      ) => {
        const postId = await runCtx.db.insert("posts", {
          scopeId: "scope:filters",
          boardId: boardId as never,
          actorId,
          title,
          body: title,
          lifecycleState: "active",
          statusKey,
          voteCount: 0,
          commentCount: 0,
          createdAt: 1000,
          currentStatusSince: 1000,
          trendingScore: 1000,
          visibilityKey: "visible",
        });
        await runCtx.db.patch(postId, { orderId: String(postId) });
        return postId;
      };
      const idea = await insert(
        installation.boards[0].id,
        "Planned idea",
        "planned",
      );
      const bug = await insert(installation.boards[1].id, "Open bug", "open");
      await runCtx.db.insert("postTags", {
        scopeId: "scope:filters",
        postId: idea,
        tagId,
      });
      await runCtx.db.insert("postTagFeeds", {
        scopeId: "scope:filters",
        postId: idea,
        tagId,
        boardId: installation.boards[0].id as never,
        statusKey: "planned",
        visibilityKey: "visible",
        createdAt: 1000,
        voteCount: 0,
        trendingScore: 1000,
        orderId: String(idea),
      });
      return { idea, bug, tagId };
    });

    const page = (filter: {
      boardId?: string;
      status?: "open" | "planned";
      tagId?: string;
    }) =>
      client.read.listFeedback(ctx as never, {
        order: "newest",
        ...filter,
        paginationOpts: { numItems: 10, cursor: null },
      });
    const ideaBoardPage = await page({ boardId: installation.boards[0].id });
    expect(ideaBoardPage.page.map(({ id }) => id)).toEqual([
      String(seeded.idea),
    ]);
    const plannedPage = await page({ status: "planned" });
    expect(plannedPage.page.map(({ id }) => id)).toEqual([String(seeded.idea)]);
    const tagPage = await page({ tagId: String(seeded.tagId) });
    expect(tagPage.page.map(({ id }) => id)).toEqual([String(seeded.idea)]);
    const bugBoardPage = await page({ boardId: installation.boards[1].id });
    expect(bugBoardPage.page.map(({ id }) => id)).toEqual([String(seeded.bug)]);
  });
});
