import { convexTest } from "convex-test";

import { withRateLimiter } from "../helpers/rate-limiter.js";
import { describe, expect, test } from "vitest";

import { createAfferentClient } from "../../src/client/index.js";
import type { VerifiedActor } from "../../src/client/index.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

describe("author-owned post lifecycle", () => {
  test("refreshes actors transactionally and preserves withdrawn history", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    let actor: VerifiedActor = {
      externalKey: "fixture:author",
      displayName: "Original Author",
    };
    let authenticated = true;
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => actor,
      authorizeAdmin: async () => true,
      isAuthenticated: async () => authenticated,
    });
    const ctx = {
      auth: { getUserIdentity: async () => null },
      runMutation: (
        reference: Parameters<typeof backend.mutation>[0],
        args: object,
      ) => backend.mutation(reference, args),
      runQuery: (
        reference: Parameters<typeof backend.query>[0],
        args: object,
      ) => backend.query(reference, args),
    };
    const configured = await client.admin.configureInstallation(ctx as never, {
      readPolicy: "authenticated",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const boardId = configured.boards[0].id;
    const created = await client.participation.createPost(ctx as never, {
      boardId,
      title: "Original title",
      body: "Original body",
    });

    actor = { externalKey: "fixture:other", displayName: "Other Author" };
    await expect(
      client.participation.editPost(ctx as never, {
        postId: created.id,
        title: "Stolen",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "NOT_AUTHORIZED" },
    });

    actor = {
      externalKey: "fixture:author",
      displayName: "Refreshed Author",
      avatarUrl: "https://example.test/avatar.png",
    };
    const edited = await client.participation.editPost(ctx as never, {
      postId: created.id,
      title: "Edited title",
      body: "Edited body",
    });
    expect(edited).toMatchObject({
      id: created.id,
      title: "Edited title",
      author: {
        id: created.author.id,
        displayName: "Refreshed Author",
        avatarUrl: "https://example.test/avatar.png",
      },
      totals: { votes: 0, comments: 0 },
    });

    authenticated = false;
    await expect(
      client.read.listPosts(ctx as never, { boardId }),
    ).rejects.toMatchObject({ data: { code: "AUTHENTICATION_REQUIRED" } });
    authenticated = true;

    const withdrawn = await client.participation.withdrawPost(ctx as never, {
      postId: created.id,
    });
    expect(withdrawn).toMatchObject({
      id: created.id,
      author: { id: created.author.id },
      totals: { votes: 0, comments: 0 },
    });
    const activePosts = await client.read.listPosts(ctx as never, { boardId });
    expect(activePosts.posts).toEqual([]);
    await expect(
      client.read.getPost(ctx as never, { postId: created.id }),
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND", resource: "post" } });

    const persisted = await backend.run(async (runCtx) => {
      const actors = await runCtx.db
        .query("actors")
        .withIndex("by_scope_external_key", (q) =>
          q
            .eq("scopeId", "afferent:single-product:v1")
            .eq("externalKey", "fixture:author"),
        )
        .collect();
      const post = await runCtx.db.get(created.id as never);
      return { actors, post };
    });
    expect(persisted.actors).toHaveLength(1);
    expect(persisted.actors[0]).toMatchObject({
      externalKey: "fixture:author",
      displayName: "Refreshed Author",
    });
    expect(persisted.post).toMatchObject({ lifecycleState: "withdrawn" });
  });

  test("reports exact and truncated board counts without changing post totals", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:count-author" }),
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    });
    const ctx = {
      auth: { getUserIdentity: async () => null },
      runMutation: (
        reference: Parameters<typeof backend.mutation>[0],
        args: object,
      ) => backend.mutation(reference, args),
      runQuery: (
        reference: Parameters<typeof backend.query>[0],
        args: object,
      ) => backend.query(reference, args),
    };
    const configured = await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const boardId = configured.boards[0].id;

    expect(await client.read.countPosts(ctx as never, { boardId })).toEqual({
      contractVersion: 1,
      count: 0,
      hasMore: false,
    });

    const exactPostId = await backend.run(async (runCtx) => {
      const actorId = await runCtx.db.insert("actors", {
        scopeId: "afferent:single-product:v1",
        externalKey: "fixture:seeded-count-author",
      });
      let firstPostId;
      for (let index = 0; index < 50; index += 1) {
        const postId = await runCtx.db.insert("posts", {
          scopeId: "afferent:single-product:v1",
          boardId: boardId as never,
          actorId,
          title: `Post ${index}`,
          body: "Count boundary",
          lifecycleState: "active",
          statusKey: "open",
          voteCount: index === 0 ? 7 : 0,
          commentCount: index === 0 ? 9 : 0,
        });
        firstPostId ??= postId;
      }
      await runCtx.db.insert("posts", {
        scopeId: "afferent:single-product:v1",
        boardId: boardId as never,
        actorId,
        title: "Withdrawn",
        body: "Not counted",
        lifecycleState: "withdrawn",
        statusKey: "open",
        voteCount: 0,
        commentCount: 0,
      });
      await runCtx.db.insert("posts", {
        scopeId: "another-scope",
        boardId: boardId as never,
        actorId,
        title: "Another scope",
        body: "Not counted",
        lifecycleState: "active",
        statusKey: "open",
        voteCount: 0,
        commentCount: 0,
      });
      return firstPostId!;
    });

    expect(await client.read.countPosts(ctx as never, { boardId })).toEqual({
      contractVersion: 1,
      count: 50,
      hasMore: false,
    });
    expect(
      await client.read.getPost(ctx as never, { postId: exactPostId as never }),
    ).toMatchObject({
      voteCount: 7,
      commentCount: 9,
      totals: { votes: 7, comments: 9 },
    });

    await backend.run(async (runCtx) => {
      const actor = await runCtx.db
        .query("actors")
        .withIndex("by_scope_external_key", (q) =>
          q
            .eq("scopeId", "afferent:single-product:v1")
            .eq("externalKey", "fixture:seeded-count-author"),
        )
        .unique();
      await runCtx.db.insert("posts", {
        scopeId: "afferent:single-product:v1",
        boardId: boardId as never,
        actorId: actor!._id,
        title: "Sentinel post",
        body: "Signals truncation",
        lifecycleState: "active",
        statusKey: "open",
        voteCount: 0,
        commentCount: 0,
      });
    });

    expect(await client.read.countPosts(ctx as never, { boardId })).toEqual({
      contractVersion: 1,
      count: 50,
      hasMore: true,
    });
  });
});
