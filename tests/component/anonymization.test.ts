import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { createAfferentClient } from "../../src/client/index.js";
import type { ActorId, VerifiedActor } from "../../src/client/index.js";
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

describe("actor anonymization", () => {
  test("authorizes in the host before invoking the component", async () => {
    const runMutation = vi.fn();
    const client = createAfferentClient(
      {
        admin: { actors: { anonymizeActor: "anonymizeActor" } },
      } as unknown as ComponentApi,
      {
        resolveActor: async () => null,
        authorizeAdmin: async () => false,
      },
    );
    const ctx = {
      auth: { getUserIdentity: async () => null },
      runMutation,
      runQuery: vi.fn(),
    };

    await expect(
      client.admin.anonymizeActor(ctx as never, {
        actorId: "actor" as ActorId,
      }),
    ).rejects.toThrow("ADMIN_AUTHORIZATION_REQUIRED");
    expect(runMutation).not.toHaveBeenCalled();
  });

  test("removes identity while retaining content, relationships, and totals", async () => {
    const backend = convexTest(schema, modules);
    let actor: VerifiedActor = {
      externalKey: "fixture:erasable-user",
      displayName: "Erase Me",
      avatarUrl: "https://example.test/private.png",
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
    const post = await client.participation.createPost(ctx as never, {
      boardId: configured.boards[0].id,
      title: "Retained history",
      body: "Keep this content.",
    });
    await client.participation.setVote(ctx as never, {
      postId: post.id,
      desired: true,
    });
    const comment = await client.participation.addComment(ctx as never, {
      postId: post.id,
      body: "Keep this comment.",
    });

    const anonymized = await client.admin.anonymizeActor(ctx as never, {
      actorId: post.author.id,
    });
    expect(anonymized).toEqual({
      id: post.author.id,
      displayName: "Anonymous",
    });
    expect(
      await client.admin.anonymizeActor(ctx as never, {
        actorId: post.author.id,
      }),
    ).toEqual(anonymized);

    const visiblePost = await client.read.getPost(ctx as never, {
      postId: post.id,
    });
    expect(visiblePost).toMatchObject({
      id: post.id,
      author: anonymized,
      voteCount: 1,
      commentCount: 1,
      totals: { votes: 1, comments: 1 },
    });
    const visibleComments = await client.read.listComments(ctx as never, {
      postId: post.id,
    });
    expect(visibleComments.comments).toMatchObject([
      { id: comment.id, author: anonymized, body: "Keep this comment." },
    ]);

    const retained = await backend.run(async (runCtx) => ({
      actor: await runCtx.db.get(post.author.id as never),
      post: await runCtx.db.get(post.id as never),
      votes: await runCtx.db.query("votes").collect(),
      comments: await runCtx.db.query("comments").collect(),
    }));
    expect(retained.actor).toMatchObject({ _id: post.author.id });
    expect(retained.actor?.externalKey).toMatch(/^afferent:anonymous:v1:/);
    expect(retained.actor?.externalKey).not.toContain("erasable-user");
    expect(retained.actor).not.toHaveProperty("displayName");
    expect(retained.actor).not.toHaveProperty("avatarUrl");
    expect(retained.post).toMatchObject({
      actorId: post.author.id,
      voteCount: 1,
      commentCount: 1,
    });
    expect(retained.votes).toMatchObject([{ actorId: post.author.id }]);
    expect(retained.comments).toMatchObject([{ actorId: post.author.id }]);

    actor = {
      externalKey: "fixture:erasable-user",
      displayName: "New Registration",
    };
    const newPost = await client.participation.createPost(ctx as never, {
      boardId: configured.boards[0].id,
      title: "New registration",
      body: "No history relinking.",
    });
    expect(newPost.author.id).not.toBe(post.author.id);
    expect(newPost.author.displayName).toBe("New Registration");
  });
});
