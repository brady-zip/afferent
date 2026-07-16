import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { createScopedAfferentClient } from "../../src/client/server.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";
import { withRateLimiter } from "../helpers/rate-limiter.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

const DAY_MS = 24 * 60 * 60 * 1000;

function context(backend: ReturnType<typeof convexTest>) {
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

function scopedClient(scopeId: string, authenticated = true) {
  return createScopedAfferentClient(api as unknown as ComponentApi, {
    resolveScope: async () => scopeId,
    resolveActor: async () => ({ externalKey: `${scopeId}:actor` }),
    authorizeAdmin: async () => true,
    isAuthenticated: async () => authenticated,
  }) as any;
}

describe("status-derived public roadmap", () => {
  test("pages fixed groups independently with scope, board, visibility, and recency enforced in the query", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const alpha = scopedClient("scope:alpha");
    const beta = scopedClient("scope:beta");
    const alphaInstall = await alpha.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [
        { slug: "ideas", name: "Ideas" },
        { slug: "bugs", name: "Bugs" },
      ],
    });
    const betaInstall = await beta.admin.configureInstallation(ctx, {
      readPolicy: "authenticated",
      boards: [{ slug: "ideas", name: "Ideas" }],
    });
    const now = Date.now();

    const seeded = await backend.run(async (runCtx) => {
      const alphaActor = await runCtx.db.insert("actors", {
        scopeId: "scope:alpha",
        externalKey: "scope:alpha:seed",
      });
      const betaActor = await runCtx.db.insert("actors", {
        scopeId: "scope:beta",
        externalKey: "scope:beta:seed",
      });
      const insert = async (args: {
        scopeId: string;
        boardId: string;
        actorId: string;
        title: string;
        statusKey:
          | "open"
          | "under_review"
          | "planned"
          | "in_progress"
          | "complete"
          | "closed";
        createdAt: number;
        currentStatusSince: number;
        visibilityKey?: "visible" | "hidden";
        lifecycleState?: "active" | "withdrawn";
        archivedAt?: number;
        mergedIntoPostId?: string;
      }) => {
        const id = await runCtx.db.insert("posts", {
          scopeId: args.scopeId,
          boardId: args.boardId as never,
          actorId: args.actorId as never,
          title: args.title,
          body: args.title,
          statusKey: args.statusKey,
          lifecycleState: args.lifecycleState ?? "active",
          voteCount: 0,
          commentCount: 0,
          createdAt: args.createdAt,
          currentStatusSince: args.currentStatusSince,
          trendingScore: args.createdAt,
          visibilityKey: args.visibilityKey ?? "visible",
          ...(args.archivedAt === undefined
            ? {}
            : { archivedAt: args.archivedAt }),
          ...(args.mergedIntoPostId === undefined
            ? {}
            : { mergedIntoPostId: args.mergedIntoPostId as never }),
        });
        await runCtx.db.patch(id, { orderId: String(id) });
        return id;
      };

      const plannedOlder = await insert({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Planned older",
        statusKey: "planned",
        createdAt: now - 5000,
        currentStatusSince: now - 2000,
      });
      const plannedNewer = await insert({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Planned newer",
        statusKey: "planned",
        createdAt: now - 10_000,
        currentStatusSince: now - 1000,
      });
      const plannedTieNewerCreated = await insert({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Planned tie newer creation",
        statusKey: "planned",
        createdAt: now - 4000,
        currentStatusSince: now - 3000,
      });
      const plannedTieA = await insert({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Planned opaque tie A",
        statusKey: "planned",
        createdAt: now - 5000,
        currentStatusSince: now - 3000,
      });
      const plannedTieB = await insert({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Planned opaque tie B",
        statusKey: "planned",
        createdAt: now - 5000,
        currentStatusSince: now - 3000,
      });
      const inProgress = await insert({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[1].id,
        actorId: alphaActor,
        title: "In progress",
        statusKey: "in_progress",
        createdAt: now - 20_000,
        currentStatusSince: now - 500,
      });
      const recentComplete = await insert({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Recent complete",
        statusKey: "complete",
        createdAt: now - 20 * DAY_MS,
        currentStatusSince: now - 10 * DAY_MS,
      });
      await insert({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Stale complete",
        statusKey: "complete",
        createdAt: now - 120 * DAY_MS,
        currentStatusSince: now - 100 * DAY_MS,
      });
      for (const [title, statusKey] of [
        ["Open", "open"],
        ["Under review", "under_review"],
        ["Closed", "closed"],
      ] as const) {
        await insert({
          scopeId: "scope:alpha",
          boardId: alphaInstall.boards[0].id,
          actorId: alphaActor,
          title,
          statusKey,
          createdAt: now,
          currentStatusSince: now,
        });
      }
      const hiddenCanonical = await insert({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Hidden canonical",
        statusKey: "planned",
        createdAt: now,
        currentStatusSince: now,
        visibilityKey: "hidden",
        archivedAt: now,
      });
      await insert({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Withdrawn",
        statusKey: "planned",
        createdAt: now,
        currentStatusSince: now,
        visibilityKey: "hidden",
        lifecycleState: "withdrawn",
      });
      await insert({
        scopeId: "scope:alpha",
        boardId: alphaInstall.boards[0].id,
        actorId: alphaActor,
        title: "Merged source",
        statusKey: "planned",
        createdAt: now,
        currentStatusSince: now,
        visibilityKey: "hidden",
        mergedIntoPostId: String(hiddenCanonical),
      });
      const betaPlanned = await insert({
        scopeId: "scope:beta",
        boardId: betaInstall.boards[0].id,
        actorId: betaActor,
        title: "Beta planned",
        statusKey: "planned",
        createdAt: now,
        currentStatusSince: now,
      });
      return {
        plannedOlder,
        plannedNewer,
        plannedTieNewerCreated,
        plannedTieA,
        plannedTieB,
        inProgress,
        recentComplete,
        betaPlanned,
      };
    });

    const firstPlanned = await alpha.read.listRoadmapGroup(ctx, {
      status: "planned",
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(firstPlanned.page.map((item: any) => item.id)).toEqual([
      String(seeded.plannedNewer),
    ]);
    expect(firstPlanned.isDone).toBe(false);

    const plannedTail = await alpha.read.listRoadmapGroup(ctx, {
      status: "planned",
      paginationOpts: {
        numItems: 10,
        cursor: firstPlanned.continueCursor,
        ...(firstPlanned.splitCursor === undefined
          ? {}
          : { endCursor: firstPlanned.splitCursor }),
      },
    });
    const opaqueTieIds = [
      String(seeded.plannedTieA),
      String(seeded.plannedTieB),
    ].sort((left, right) => right.localeCompare(left));
    expect(plannedTail.page.map((item: any) => item.id)).toEqual([
      String(seeded.plannedOlder),
      String(seeded.plannedTieNewerCreated),
      ...opaqueTieIds,
    ]);

    const inProgress = await alpha.read.listRoadmapGroup(ctx, {
      status: "in_progress",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(inProgress.page.map((item: any) => item.id)).toEqual([
      String(seeded.inProgress),
    ]);

    const complete = await alpha.read.listRoadmapGroup(ctx, {
      status: "complete",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(complete.page.map((item: any) => item.id)).toEqual([
      String(seeded.recentComplete),
    ]);

    const boardFiltered = await alpha.read.listRoadmapGroup(ctx, {
      status: "in_progress",
      boardId: alphaInstall.boards[0].id,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(boardFiltered.page).toEqual([]);

    const betaPage = await beta.read.listRoadmapGroup(ctx, {
      status: "planned",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(betaPage.page.map((item: any) => item.id)).toEqual([
      String(seeded.betaPlanned),
    ]);
    await expect(
      scopedClient("scope:beta", false).read.listRoadmapGroup(ctx, {
        status: "planned",
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toMatchObject({ data: { code: "AUTHENTICATION_REQUIRED" } });
  });

  test("status transitions update roadmap order without coupling workflow side effects", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const client = scopedClient("scope:transitions");
    const installation = await client.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "ideas", name: "Ideas" }],
    });
    const post = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Transition independently",
      body: "Status is workflow state only.",
    });

    const before = Date.now();
    await client.admin.setPostStatus(ctx, {
      postId: post.id,
      status: "planned",
    });
    const plannedRow = await backend.run(async (runCtx) =>
      runCtx.db.get(post.id),
    );
    expect(plannedRow?.currentStatusSince).toBeGreaterThanOrEqual(before);
    expect(plannedRow?.discussionLocked ?? false).toBe(false);

    expect(
      await client.participation.setVote(ctx, {
        postId: post.id,
        desired: true,
      }),
    ).toMatchObject({ voteCount: 1 });
    await expect(
      client.participation.addComment(ctx, {
        postId: post.id,
        body: "Still open for discussion",
      }),
    ).resolves.toMatchObject({ body: "Still open for discussion" });

    await client.admin.setPostStatus(ctx, {
      postId: post.id,
      status: "complete",
    });
    const complete = await client.read.listRoadmapGroup(ctx, {
      status: "complete",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(complete.page.map((item: any) => item.id)).toContain(post.id);
    const activity = await client.admin.listPostActivity(ctx, {
      postId: post.id,
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(
      activity.page.filter((entry: any) => entry.type === "status_change"),
    ).toHaveLength(2);
    expect(
      activity.page.some((entry: any) => entry.type === "changelog_publish"),
    ).toBe(false);
  });
});
