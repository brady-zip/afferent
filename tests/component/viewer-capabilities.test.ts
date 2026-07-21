import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { createAfferentClient } from "../../src/client/index.js";
import type { VerifiedActor } from "../../src/client/index.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";
import { withRateLimiter } from "../helpers/rate-limiter.js";

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

function viewerFields(
  viewerHasVoted: boolean,
  viewerCanEdit: boolean,
  viewerCanWithdraw: boolean,
) {
  return { viewerHasVoted, viewerCanEdit, viewerCanWithdraw };
}

describe("server-derived viewer capabilities", () => {
  test("projects exact anonymous, no-row, non-owner, owner, voter, post, and scope truth", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    let mutationActor: VerifiedActor = { externalKey: "fixture:owner" };
    let viewerActor: VerifiedActor | null = null;
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => mutationActor,
      resolveViewerActor: async () => viewerActor,
      authorizeAdmin: async () => true,
      isAuthenticated: async () => viewerActor !== null,
    } as never);
    const ctx = backendContext(backend);
    const configured = await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const boardId = configured.boards[0].id;
    const owned = await client.participation.createPost(ctx as never, {
      boardId,
      title: "Owned post",
      body: "Viewer truth is server-derived.",
    });
    const second = await client.participation.createPost(ctx as never, {
      boardId,
      title: "Second post",
      body: "Membership is post-specific.",
    });

    async function readAll(expected: ReturnType<typeof viewerFields>) {
      const [legacy, feedback, direct, lookup] = await Promise.all([
        client.read.listPosts(ctx as never, { boardId }),
        client.read.listFeedback(ctx as never, { boardId, order: "newest" }),
        client.read.getPost(ctx as never, { postId: owned.id }),
        client.read.resolvePost(ctx as never, { postId: owned.id }),
      ]);
      expect(legacy.contractVersion).toBe(2);
      expect(feedback.contractVersion).toBe(3);
      expect(direct).toMatchObject({ contractVersion: 2, ...expected });
      expect(legacy.posts.find((post) => post.id === owned.id)).toMatchObject(
        expected,
      );
      expect(
        feedback.posts.find((post) => post.id === owned.id),
      ).toMatchObject({ contractVersion: 3, ...expected });
      expect(lookup).toMatchObject({
        contractVersion: 2,
        status: "post",
        post: { contractVersion: 3, ...expected },
      });
    }

    await readAll(viewerFields(false, false, false));
    viewerActor = { externalKey: "fixture:no-row" };
    await readAll(viewerFields(false, false, false));
    mutationActor = { externalKey: "fixture:other" };
    await client.participation.setVote(ctx as never, {
      postId: owned.id,
      desired: false,
    });
    viewerActor = mutationActor;
    await readAll(viewerFields(false, false, false));
    await client.participation.setVote(ctx as never, {
      postId: owned.id,
      desired: true,
    });
    await readAll(viewerFields(true, false, false));
    expect(
      await client.read.getPost(ctx as never, { postId: second.id }),
    ).toMatchObject(viewerFields(false, false, false));
    viewerActor = { externalKey: "fixture:owner" };
    await readAll(viewerFields(false, true, true));

    const actorCountBefore = await backend.run(async (runCtx) => {
      const actors = await runCtx.db.query("actors").collect();
      return actors.length;
    });
    viewerActor = { externalKey: "fixture:still-no-row" };
    await readAll(viewerFields(false, false, false));
    const actorCountAfter = await backend.run(async (runCtx) => {
      const actors = await runCtx.db.query("actors").collect();
      return actors.length;
    });
    expect(actorCountAfter).toBe(actorCountBefore);
  });

  test("keeps read capability predicates in parity with edit and repeat-withdraw enforcement", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const actor = { externalKey: "fixture:policy-owner" };
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => actor,
      resolveViewerActor: async () => actor,
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    } as never);
    const ctx = backendContext(backend);
    const configured = await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await client.participation.createPost(ctx as never, {
      boardId: configured.boards[0].id,
      title: "Policy parity",
      body: "One predicate for reads and writes.",
    });
    expect(
      await client.read.getPost(ctx as never, { postId: post.id }),
    ).toMatchObject(viewerFields(false, true, true));
    await expect(
      client.participation.editPost(ctx as never, {
        postId: post.id,
        title: "Still editable",
      }),
    ).resolves.toMatchObject(viewerFields(false, true, true));
    const withdrawn = await client.participation.withdrawPost(ctx as never, {
      postId: post.id,
    });
    expect(withdrawn).toMatchObject(viewerFields(false, false, true));
    await expect(
      client.participation.withdrawPost(ctx as never, { postId: post.id }),
    ).resolves.toMatchObject(viewerFields(false, false, true));
    await expect(
      client.participation.editPost(ctx as never, {
        postId: post.id,
        title: "Forbidden",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });
});
