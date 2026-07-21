import { convexTest } from "convex-test";

import { withRateLimiter } from "../helpers/rate-limiter.js";
import { describe, expect, test } from "vitest";

import {
  createAfferentClient,
  createScopedAfferentClient,
} from "../../src/client/index.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

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

describe("admin moderation and append-only activity", () => {
  test("pages exact visible and hidden scope-owned queues and rejects a foreign direct read", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const client = createScopedAfferentClient(
      api as unknown as ComponentApi,
      {
        resolveScope: async () => "scope:queue-alpha",
        resolveActor: async () => ({ externalKey: "queue-alpha:admin" }),
        authorizeAdmin: async () => true,
        isAuthenticated: async () => true,
      },
    ) as any;
    const ctx = context(backend) as never;
    const seeded = await backend.run(async (runCtx) => {
      const alphaBoard = await runCtx.db.insert("boards", {
        scopeId: "scope:queue-alpha",
        slug: "alpha-board",
        name: "Alpha board",
        sortOrder: 0,
      });
      const betaBoard = await runCtx.db.insert("boards", {
        scopeId: "scope:queue-beta",
        slug: "beta-board",
        name: "Beta board",
        sortOrder: 0,
      });
      const alphaActor = await runCtx.db.insert("actors", {
        scopeId: "scope:queue-alpha",
        externalKey: "alpha:author",
      });
      const betaActor = await runCtx.db.insert("actors", {
        scopeId: "scope:queue-beta",
        externalKey: "beta:author",
      });
      const rows: Record<"visible" | "hidden", Array<{ id: string; createdAt: number; orderId: string }>> = {
        visible: [],
        hidden: [],
      };
      for (const visibility of ["visible", "hidden"] as const) {
        for (let index = 0; index < 51; index += 1) {
          const createdAt = 10_000 + Math.floor(index / 2);
          const orderId = `${visibility}-${String(index).padStart(3, "0")}`;
          const id = await runCtx.db.insert("posts", {
            scopeId: "scope:queue-alpha",
            boardId: alphaBoard,
            actorId: alphaActor,
            title: `Alpha ${visibility} ${index}`,
            body: `Alpha ${visibility} body ${index}`,
            lifecycleState: "active",
            statusKey: "open",
            voteCount: 0,
            commentCount: 0,
            createdAt,
            currentStatusSince: createdAt,
            discussionLocked: index % 2 === 0,
            trendingScore: 0,
            orderId,
            visibilityKey: visibility,
            ...(visibility === "hidden" ? { archivedAt: createdAt } : {}),
          });
          rows[visibility].push({ id: String(id), createdAt, orderId });
        }
      }
      const betaIds: string[] = [];
      let foreignHiddenId = "";
      for (const visibility of ["visible", "hidden"] as const) {
        for (let index = 0; index < 3; index += 1) {
          const id = await runCtx.db.insert("posts", {
            scopeId: "scope:queue-beta",
            boardId: betaBoard,
            actorId: betaActor,
            title: `Foreign beta ${visibility} title ${index}`,
            body: `Foreign beta ${visibility} body ${index}`,
            lifecycleState: "active",
            statusKey: "closed",
            voteCount: 7,
            commentCount: 8,
            createdAt: 99_000 + index,
            currentStatusSince: 99_000 + index,
            discussionLocked: true,
            trendingScore: 0,
            orderId: `beta-${visibility}-${index}`,
            visibilityKey: visibility,
            ...(visibility === "hidden" ? { archivedAt: 99_000 + index } : {}),
          });
          betaIds.push(String(id));
          if (visibility === "hidden" && index === 0) foreignHiddenId = String(id);
        }
      }
      return { rows, betaIds, foreignHiddenId };
    });

    for (const visibility of ["visible", "hidden"] as const) {
      const expected = [...seeded.rows[visibility]]
        .sort(
          (left, right) =>
            right.createdAt - left.createdAt ||
            right.orderId.localeCompare(left.orderId),
        )
        .map((row) => row.id);
      const first = await client.admin.listAdminFeedback(ctx, {
        visibility,
        paginationOpts: { numItems: 50, cursor: null },
      });
      expect(first.page.map((row: any) => row.feedback.id)).toEqual(
        expected.slice(0, 50),
      );
      expect(first.isDone).toBe(false);
      expect(first.continueCursor).not.toBe("");
      const second = await client.admin.listAdminFeedback(ctx, {
        visibility,
        paginationOpts: { numItems: 50, cursor: first.continueCursor },
      });
      expect(second.page.map((row: any) => row.feedback.id)).toEqual(
        expected.slice(50),
      );
      expect(second.isDone).toBe(true);
      const allIds = [...first.page, ...second.page].map(
        (row: any) => row.feedback.id,
      );
      expect(allIds).toEqual(expected);
      expect(new Set(allIds).size).toBe(51);
      expect(allIds.some((id: string) => seeded.betaIds.includes(id))).toBe(
        false,
      );
    }

    let foreignError: unknown;
    try {
      await client.admin.getAdminPost(ctx, {
        postId: seeded.foreignHiddenId,
      });
    } catch (error) {
      foreignError = error;
    }
    expect(foreignError).toMatchObject({
      data: { code: "NOT_FOUND", resource: "post" },
    });
    const serialized = JSON.stringify(foreignError);
    expect(serialized).not.toContain("Foreign beta");
    expect(serialized).not.toContain("Beta board");
    expect(serialized).not.toContain("discussionLocked");
    expect(serialized).not.toContain("archived");
  });

  test("returns the closed admin projection from reads and moderation writes", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:admin" }),
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    }) as any;
    const ctx = context(backend) as never;
    const installation = await client.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Admin truth",
      body: "Visible now",
    });

    const locked = await client.admin.setDiscussionLock(ctx, {
      postId: post.id,
      locked: true,
    });
    expect(locked).toMatchObject({
      contractVersion: 1,
      moderation: {
        contractVersion: 1,
        discussionLocked: true,
        archived: false,
        disposition: "active",
      },
    });
    await client.admin.setArchived(ctx, { postId: post.id, archived: true });
    const direct = await client.admin.getAdminPost(ctx, { postId: post.id });
    expect(direct).toMatchObject({
      feedback: { id: post.id },
      moderation: { archived: true, discussionLocked: true },
    });
    const hidden = await client.admin.listAdminFeedback(ctx, {
      visibility: "hidden",
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(hidden).toMatchObject({
      contractVersion: 1,
      page: [{ feedback: { id: post.id } }],
    });
  });

  test("keeps status, archive, and discussion lock orthogonal", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({
        externalKey: "fixture:moderator",
        displayName: "Moderator",
      }),
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    }) as any;
    const ctx = context(backend) as never;
    const installation = await client.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [
        { slug: "feedback", name: "Feedback" },
        { slug: "ideas", name: "Ideas" },
      ],
    });
    const post = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Moderate me",
      body: "Initial body",
    });

    for (const status of [
      "under_review",
      "planned",
      "in_progress",
      "complete",
      "closed",
      "open",
    ]) {
      const updated = await client.admin.setPostStatus(ctx, {
        postId: post.id,
        status,
      });
      expect(updated.feedback.status.key).toBe(status);
    }
    await client.admin.setPostStatus(ctx, {
      postId: post.id,
      status: "closed",
    });
    expect(
      await client.participation.setVote(ctx, {
        postId: post.id,
        desired: true,
      }),
    ).toMatchObject({ voteCount: 1 });

    await client.admin.setDiscussionLock(ctx, {
      postId: post.id,
      locked: true,
    });
    const member = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:member" }),
      authorizeAdmin: async () => false,
      isAuthenticated: async () => true,
    }) as any;
    await expect(
      member.participation.addComment(ctx, {
        postId: post.id,
        body: "blocked",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DISCUSSION_LOCKED" },
    });
    await expect(
      client.participation.addComment(ctx, {
        postId: post.id,
        body: "official",
      }),
    ).resolves.toMatchObject({ body: "official" });

    const moved = await client.admin.movePost(ctx, {
      postId: post.id,
      boardId: installation.boards[1].id,
    });
    expect(moved.feedback.board.id).toBe(installation.boards[1].id);
    const edited = await client.admin.editPost(ctx, {
      postId: post.id,
      title: "Edited by admin",
    });
    expect(edited.feedback.title).toBe("Edited by admin");

    await client.admin.setArchived(ctx, { postId: post.id, archived: true });
    await expect(
      client.read.getPost(ctx, { postId: post.id }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "post" },
    });
    await client.admin.setArchived(ctx, { postId: post.id, archived: false });
    expect(await client.read.getPost(ctx, { postId: post.id })).toMatchObject({
      id: post.id,
    });

    const persisted = await backend.run(async (runCtx) =>
      runCtx.db.get(post.id),
    );
    expect(persisted).toMatchObject({
      statusKey: "closed",
      lifecycleState: "active",
      discussionLocked: true,
    });
    expect(persisted).not.toHaveProperty("archivedAt");
  });

  test("re-authorizes every admin call and exposes bounded admin-only activity", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    let allowed = true;
    let authorizationChecks = 0;
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:admin" }),
      authorizeAdmin: async () => {
        authorizationChecks += 1;
        return allowed;
      },
      isAuthenticated: async () => true,
    }) as any;
    const ctx = context(backend) as never;
    const installation = await client.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Activity",
      body: "History",
    });
    await client.admin.editPost(ctx, { postId: post.id, title: "Changed" });
    await client.admin.setDiscussionLock(ctx, {
      postId: post.id,
      locked: true,
    });

    const page = await client.admin.listPostActivity(ctx, {
      postId: post.id,
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(page.contractVersion).toBe(2);
    expect(page.page).toHaveLength(2);
    expect(page.page[0]).not.toHaveProperty("actorDisplayName");
    expect(
      page.page.every(
        (entry: any) => entry.actor?.id || entry.actor === undefined,
      ),
    ).toBe(true);

    allowed = false;
    await expect(
      client.admin.setArchived(ctx, { postId: post.id, archived: true }),
    ).rejects.toThrow("ADMIN_AUTHORIZATION_REQUIRED");
    await expect(
      client.admin.listPostActivity(ctx, {
        postId: post.id,
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow("ADMIN_AUTHORIZATION_REQUIRED");
    expect(authorizationChecks).toBeGreaterThanOrEqual(5);
  });
});
