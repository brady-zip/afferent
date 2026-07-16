import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import { createScopedAfferentClient } from "../../src/client/server.js";
import { createAfferentClient } from "../../src/client/index.js";
import type { BoardId, PostId } from "../../src/client/index.js";
import { normalizeClerkIdentity } from "../../src/client/adapters/clerk.js";
import { normalizeBetterAuthUser } from "../../src/client/adapters/better-auth.js";
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

describe("server-derived scope isolation", () => {
  test("resolves scope before actor/admin authority and every component call", async () => {
    const order: string[] = [];
    const component = {
      public: { boards: { listBoards: "listBoards" } },
      participation: { posts: { createPost: "createPost" } },
      admin: { installation: { configureInstallation: "configure" } },
    } as unknown as ComponentApi;
    const client = createScopedAfferentClient(component, {
      resolveScope: async () => {
        order.push("scope");
        return "derived-scope";
      },
      resolveActor: async () => {
        order.push("actor");
        return { externalKey: "fixture:actor" };
      },
      authorizeAdmin: async () => {
        order.push("admin");
        return true;
      },
    });
    const ctx = {
      auth: { getUserIdentity: async () => null },
      runQuery: vi.fn(async () => {
        order.push("component");
        return { contractVersion: 1, boards: [] };
      }),
      runMutation: vi.fn(async () => {
        order.push("component");
        return { contractVersion: 1, boards: [], readPolicy: "public" };
      }),
    };

    await client.read.listBoards(ctx as never, {});
    expect(order).toEqual(["scope", "component"]);
    order.length = 0;

    await client.participation.createPost(ctx as never, {
      boardId: "board" as BoardId,
      title: "Scoped",
      body: "Server-derived",
    });
    expect(order).toEqual(["scope", "actor", "component"]);
    order.length = 0;

    await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    expect(order).toEqual(["scope", "admin", "component"]);
  });

  test("keeps identical boards, posts, counts, and reactive reads isolated", async () => {
    const backend = convexTest(schema, modules);
    const component = api as unknown as ComponentApi;
    const ctx = backendContext(backend);
    const makeClient = (scope: string, actor: string) =>
      createScopedAfferentClient(component, {
        resolveScope: async () => scope,
        resolveActor: async () => ({
          externalKey: actor,
          displayName: actor,
        }),
        authorizeAdmin: async () => true,
      });
    const alpha = makeClient("scope-alpha", "fixture:alpha");
    const beta = makeClient("scope-beta", "fixture:beta");

    const alphaConfiguration = await alpha.admin.configureInstallation(
      ctx as never,
      {
        readPolicy: "public",
        boards: [
          { slug: "feedback", name: "Feedback" },
          { slug: "bugs", name: "Bugs" },
        ],
      },
    );
    const alphaBoard = alphaConfiguration.boards[0];
    const betaConfiguration = await beta.admin.configureInstallation(
      ctx as never,
      {
        readPolicy: "public",
        boards: [
          { slug: "feedback", name: "Feedback" },
          { slug: "bugs", name: "Bugs" },
        ],
      },
    );
    const betaBoard = betaConfiguration.boards[0];

    const alphaPost = await alpha.participation.createPost(ctx as never, {
      boardId: alphaBoard.id,
      title: "Alpha only",
      body: "alpha",
    });
    const betaPost = await beta.participation.createPost(ctx as never, {
      boardId: betaBoard.id,
      title: "Beta only",
      body: "beta",
    });

    const alphaBoards = await alpha.read.listBoards(ctx as never, {});
    expect(alphaBoards.boards).toHaveLength(2);
    const alphaPosts = await alpha.read.listPosts(ctx as never, {
      boardId: alphaBoard.id,
    });
    expect(alphaPosts.posts).toMatchObject([{ title: "Alpha only" }]);
    expect(
      await alpha.read.countPosts(ctx as never, { boardId: alphaBoard.id }),
    ).toEqual({ contractVersion: 1, count: 1 });

    await expect(
      beta.read.getPost(ctx as never, { postId: alphaPost.id }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "post" },
    });
    await expect(
      beta.read.getPost(ctx as never, {
        postId: "j57fakeopaqueid" as PostId,
      }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "post" },
    });

    await alpha.participation.createPost(ctx as never, {
      boardId: alphaBoard.id,
      title: "Reactive alpha",
      body: "alpha",
    });
    const betaPosts = await beta.read.listPosts(ctx as never, {
      boardId: betaBoard.id,
    });
    expect(betaPosts.posts).toMatchObject([{ title: "Beta only" }]);

    await expect(
      beta.participation.editPost(ctx as never, {
        postId: alphaPost.id,
        title: "Cross-scope edit",
      }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "post" },
    });
    await expect(
      beta.participation.withdrawPost(ctx as never, {
        postId: alphaPost.id,
      }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "post" },
    });

    await expect(
      beta.participation.setVote(ctx as never, {
        postId: alphaPost.id,
        desired: true,
      }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "post" },
    });
    expect(
      await alpha.participation.setVote(ctx as never, {
        postId: alphaPost.id,
        desired: true,
      }),
    ).toMatchObject({ voteCount: 1, totals: { votes: 1 } });
    expect(
      await alpha.participation.setVote(ctx as never, {
        postId: alphaPost.id,
        desired: false,
      }),
    ).toMatchObject({ voteCount: 0, totals: { votes: 0 } });

    const scopedVotes = await backend.run(async (runCtx) => ({
      alpha: await runCtx.db
        .query("votes")
        .withIndex("by_scope_post_actor", (q) =>
          q.eq("scopeId", "scope-alpha"),
        )
        .collect(),
      beta: await runCtx.db
        .query("votes")
        .withIndex("by_scope_post_actor", (q) =>
          q.eq("scopeId", "scope-beta"),
        )
        .collect(),
    }));
    expect(scopedVotes).toEqual({ alpha: [], beta: [] });

    const alphaRoot = await alpha.participation.addComment(ctx as never, {
      postId: alphaPost.id,
      body: "Alpha root",
    });
    await alpha.participation.addComment(ctx as never, {
      postId: alphaPost.id,
      parentCommentId: alphaRoot.id,
      body: "Alpha reply",
    });
    await expect(
      beta.participation.addComment(ctx as never, {
        postId: alphaPost.id,
        body: "Cross-scope post",
      }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "post" },
    });
    await expect(
      beta.read.listComments(ctx as never, { postId: alphaPost.id }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "post" },
    });
    expect(
      await alpha.read.listComments(ctx as never, { postId: alphaPost.id }),
    ).toMatchObject({
      comments: [
        { id: alphaRoot.id, body: "Alpha root" },
        { parentCommentId: alphaRoot.id, body: "Alpha reply" },
      ],
    });
    expect(
      await alpha.read.getPost(ctx as never, { postId: alphaPost.id }),
    ).toMatchObject({ commentCount: 2, totals: { comments: 2 } });
    expect(
      await beta.read.getPost(ctx as never, { postId: betaPost.id }),
    ).toMatchObject({ commentCount: 0, totals: { comments: 0 } });

    await expect(
      beta.admin.anonymizeActor(ctx as never, {
        actorId: alphaPost.author.id,
      }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "actor" },
    });
    await expect(
      beta.admin.anonymizeActor(ctx as never, {
        actorId: "j57fakeopaqueid" as typeof alphaPost.author.id,
      }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "actor" },
    });
    expect(
      await alpha.admin.anonymizeActor(ctx as never, {
        actorId: alphaPost.author.id,
      }),
    ).toEqual({ id: alphaPost.author.id, displayName: "Anonymous" });
    expect(
      await beta.read.getPost(ctx as never, { postId: betaPost.id }),
    ).toMatchObject({ author: { displayName: "fixture:beta" } });
  });

  test("runs provider-shaped actors through fixed and server-scoped clients without linking", async () => {
    const backend = convexTest(schema, modules);
    const component = api as unknown as ComponentApi;
    const ctx = backendContext(backend);
    const clerkActor = normalizeClerkIdentity({
      issuer: "issuer.example",
      subject: "same-raw-id",
      name: "Clerk Before",
    });
    const betterActor = normalizeBetterAuthUser({
      id: "same-raw-id",
      name: "Better User",
    });
    const fixed = createAfferentClient(component, {
      resolveActor: async () => clerkActor,
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    });
    const scoped = createScopedAfferentClient(component, {
      resolveScope: async () => "provider-sandbox",
      resolveActor: async () => betterActor,
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    });

    const fixedBoard = (
      await fixed.admin.configureInstallation(ctx as never, {
        readPolicy: "authenticated",
        boards: [{ slug: "feedback", name: "Feedback" }],
      })
    ).boards[0];
    const scopedBoard = (
      await scoped.admin.configureInstallation(ctx as never, {
        readPolicy: "authenticated",
        boards: [{ slug: "feedback", name: "Feedback" }],
      })
    ).boards[0];
    const fixedPost = await fixed.participation.createPost(ctx as never, {
      boardId: fixedBoard.id,
      title: "Fixed",
      body: "Clerk",
    });
    const scopedPost = await scoped.participation.createPost(ctx as never, {
      boardId: scopedBoard.id,
      title: "Scoped",
      body: "Better Auth",
    });
    await fixed.participation.editPost(ctx as never, {
      postId: fixedPost.id,
      body: "Clerk edited",
    });
    await fixed.participation.setVote(ctx as never, {
      postId: fixedPost.id,
      desired: true,
    });
    await fixed.participation.addComment(ctx as never, {
      postId: fixedPost.id,
      body: "Clerk comment",
    });
    expect(await fixed.read.listBoards(ctx as never, {})).toMatchObject({
      boards: [{ slug: "feedback" }],
    });
    expect(await fixed.read.listPosts(ctx as never, { boardId: fixedBoard.id })).toMatchObject({
      posts: [{ id: fixedPost.id }],
    });
    expect(await fixed.read.getPost(ctx as never, { postId: fixedPost.id })).toMatchObject({
      body: "Clerk edited",
      voteCount: 1,
      commentCount: 1,
    });
    expect(await fixed.read.countPosts(ctx as never, { boardId: fixedBoard.id })).toEqual({
      contractVersion: 1,
      count: 1,
    });
    expect(await fixed.read.listComments(ctx as never, { postId: fixedPost.id })).toMatchObject({
      comments: [{ body: "Clerk comment" }],
    });
    await fixed.participation.withdrawPost(ctx as never, { postId: fixedPost.id });

    const actors = await backend.run(async (runCtx) =>
      runCtx.db.query("actors").withIndex("by_scope_external_key").collect(),
    );
    expect(actors.map(({ scopeId, externalKey }) => ({ scopeId, externalKey }))).toEqual(
      expect.arrayContaining([
        { scopeId: "afferent:single-product:v1", externalKey: clerkActor.externalKey },
        { scopeId: "provider-sandbox", externalKey: betterActor.externalKey },
      ]),
    );
    expect(fixedPost.author.id).not.toBe(scopedPost.author.id);
  });
});
