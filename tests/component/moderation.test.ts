import { convexTest } from "convex-test";

import { withRateLimiter } from "../helpers/rate-limiter.js";
import { describe, expect, test } from "vitest";

import { createAfferentClient } from "../../src/client/index.js";
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
      expect(updated.status.key).toBe(status);
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
    expect(moved.board.id).toBe(installation.boards[1].id);
    const edited = await client.admin.editPost(ctx, {
      postId: post.id,
      title: "Edited by admin",
    });
    expect(edited.title).toBe("Edited by admin");

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
    expect(page.contractVersion).toBe(1);
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
