import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { createAfferentClient } from "../../src/client/index.js";
import type { VerifiedActor } from "../../src/client/index.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import { reconcileVoteCount } from "../../src/component/model/votes.js";
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

describe("authenticated participation", () => {
  test("sets one retry-safe vote membership and reconciles its projection", async () => {
    const backend = convexTest(schema, modules);
    let actor: VerifiedActor = { externalKey: "fixture:voter" };
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => actor,
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    });
    const ctx = backendContext(backend);
    const configured = await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await client.participation.createPost(ctx as never, {
      boardId: configured.boards[0].id,
      title: "Retry-safe votes",
      body: "Membership is canonical.",
    });

    expect(
      await client.participation.setVote(ctx as never, {
        postId: post.id,
        desired: true,
      }),
    ).toMatchObject({ id: post.id, voteCount: 1, totals: { votes: 1 } });
    expect(
      await client.participation.setVote(ctx as never, {
        postId: post.id,
        desired: true,
      }),
    ).toMatchObject({ voteCount: 1 });

    await Promise.all(
      Array.from({ length: 8 }, () =>
        client.participation.setVote(ctx as never, {
          postId: post.id,
          desired: true,
        }),
      ),
    );
    let persisted = await backend.run(async (runCtx) => ({
      post: await runCtx.db.get(post.id as never),
      votes: await runCtx.db.query("votes").collect(),
    }));
    expect(persisted.votes).toHaveLength(1);
    expect(persisted.post).toMatchObject({ voteCount: 1 });

    actor = { externalKey: "fixture:second-voter" };
    await client.participation.setVote(ctx as never, {
      postId: post.id,
      desired: true,
    });
    await backend.run(async (runCtx) => {
      await runCtx.db.patch(post.id as never, { voteCount: 99 });
      await reconcileVoteCount(
        runCtx as never,
        "afferent:single-product:v1",
        post.id,
      );
    });
    expect(await client.read.getPost(ctx as never, { postId: post.id })).toMatchObject(
      { voteCount: 2, totals: { votes: 2 } },
    );

    await Promise.all(
      Array.from({ length: 8 }, () =>
        client.participation.setVote(ctx as never, {
          postId: post.id,
          desired: false,
        }),
      ),
    );
    persisted = await backend.run(async (runCtx) => ({
      post: await runCtx.db.get(post.id as never),
      votes: await runCtx.db.query("votes").collect(),
    }));
    expect(persisted.votes).toHaveLength(1);
    expect(persisted.post).toMatchObject({ voteCount: 1 });

    actor = { externalKey: "fixture:voter" };
    await client.participation.setVote(ctx as never, {
      postId: post.id,
      desired: false,
    });
    expect(
      await client.participation.setVote(ctx as never, {
        postId: post.id,
        desired: false,
      }),
    ).toMatchObject({ voteCount: 0 });
  });

  test("rejects invalid vote targets without actor or membership writes", async () => {
    const backend = convexTest(schema, modules);
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:rejected-voter" }),
      authorizeAdmin: async () => true,
    });
    const ctx = backendContext(backend);
    const configured = await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await client.participation.createPost(ctx as never, {
      boardId: configured.boards[0].id,
      title: "Withdrawn",
      body: "Cannot vote here.",
    });
    await client.participation.withdrawPost(ctx as never, { postId: post.id });

    await expect(
      client.participation.setVote(ctx as never, {
        postId: post.id,
        desired: true,
      }),
    ).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(
      client.participation.setVote(ctx as never, {
        postId: "j57fakeopaqueid" as typeof post.id,
        desired: true,
      }),
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND", resource: "post" } });

    const persisted = await backend.run(async (runCtx) => ({
      actors: await runCtx.db.query("actors").collect(),
      votes: await runCtx.db.query("votes").collect(),
    }));
    expect(persisted.actors).toHaveLength(1);
    expect(persisted.votes).toEqual([]);
  });

  test("adds flat root comments and one-level replies with exact totals", async () => {
    const backend = convexTest(schema, modules);
    let actor: VerifiedActor = {
      externalKey: "fixture:commenter",
      displayName: "Commenter",
    };
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => actor,
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    });
    const ctx = backendContext(backend);
    const configured = await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const firstPost = await client.participation.createPost(ctx as never, {
      boardId: configured.boards[0].id,
      title: "Flat comments",
      body: "One reply edge.",
    });
    const secondPost = await client.participation.createPost(ctx as never, {
      boardId: configured.boards[0].id,
      title: "Other post",
      body: "Parents cannot cross posts.",
    });

    const root = await client.participation.addComment(ctx as never, {
      postId: firstPost.id,
      body: " Root comment ",
    });
    expect(root).toMatchObject({
      postId: firstPost.id,
      body: "Root comment",
      author: { displayName: "Commenter" },
    });
    expect(root).not.toHaveProperty("parentCommentId");

    const reply = await client.participation.addComment(ctx as never, {
      postId: firstPost.id,
      parentCommentId: root.id,
      body: "One reply",
    });
    expect(reply).toMatchObject({
      postId: firstPost.id,
      parentCommentId: root.id,
    });

    actor = { externalKey: "fixture:invalid-commenter" };
    await expect(
      client.participation.addComment(ctx as never, {
        postId: firstPost.id,
        parentCommentId: reply.id,
        body: "Too deep",
      }),
    ).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(
      client.participation.addComment(ctx as never, {
        postId: secondPost.id,
        parentCommentId: root.id,
        body: "Wrong post",
      }),
    ).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(
      client.participation.addComment(ctx as never, {
        postId: firstPost.id,
        parentCommentId: "j57fakeopaqueid" as typeof root.id,
        body: "Missing parent",
      }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "comment" },
    });

    const page = await client.read.listComments(ctx as never, {
      postId: firstPost.id,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.comments).toHaveLength(2);
    expect(page.comments).toEqual(expect.arrayContaining([root, reply]));
    expect(page.comments.every((comment) => !Array.isArray(comment.replies))).toBe(
      true,
    );
    expect(
      await client.read.getPost(ctx as never, { postId: firstPost.id }),
    ).toMatchObject({ commentCount: 2, totals: { comments: 2 } });

    const persisted = await backend.run(async (runCtx) => ({
      comments: await runCtx.db.query("comments").collect(),
      rejectedActor: await runCtx.db
        .query("actors")
        .withIndex("by_scope_external_key", (q) =>
          q
            .eq("scopeId", "afferent:single-product:v1")
            .eq("externalKey", "fixture:invalid-commenter"),
        )
        .unique(),
    }));
    expect(persisted.comments).toHaveLength(2);
    expect(persisted.rejectedActor).toBeNull();

    await client.participation.withdrawPost(ctx as never, {
      postId: firstPost.id,
    });
    await expect(
      client.participation.addComment(ctx as never, {
        postId: firstPost.id,
        body: "Too late",
      }),
    ).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    expect(
      await client.read.getPost(ctx as never, { postId: firstPost.id }),
    ).toMatchObject({ commentCount: 2 });
  });
});
