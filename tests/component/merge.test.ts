import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { createScopedAfferentClient } from "../../src/client/server.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";
import { withRateLimiter } from "../helpers/rate-limiter.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

function context(backend: ReturnType<typeof convexTest>) {
  return {
    auth: { getUserIdentity: async () => null },
    runMutation: (reference: any, args: object) =>
      backend.mutation(reference, args),
    runQuery: (reference: any, args: object) => backend.query(reference, args),
  };
}

function client(scopeId: string, actorKey: string, admin = false) {
  return createScopedAfferentClient(api as unknown as ComponentApi, {
    resolveScope: async () => scopeId,
    resolveActor: async () => ({ externalKey: actorKey, displayName: actorKey }),
    authorizeAdmin: async () => admin,
    isAuthenticated: async () => true,
  }) as any;
}

describe("duplicate merge lifecycle", () => {
  test("keeps every original untouched while a large merge is preparing", async () => {
    vi.useFakeTimers();
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const admin = client("scope:large", "large:admin", true);
    const install = await admin.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const canonical = await admin.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Canonical",
      body: "Canonical body",
    });
    const source = await admin.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Source",
      body: "Source body",
    });
    await backend.run(async (runCtx) => {
      const sourceId = runCtx.db.normalizeId("posts", source.id)!;
      for (let index = 0; index < 51; index += 1) {
        const actorId = await runCtx.db.insert("actors", {
          scopeId: "scope:large",
          externalKey: `large:voter:${index}`,
        });
        await runCtx.db.insert("votes", {
          scopeId: "scope:large",
          postId: sourceId,
          actorId,
        });
      }
      await runCtx.db.patch(sourceId, { voteCount: 51 });
    });

    expect(
      await backend.mutation(api.admin.merge.mergePost, {
        scopeId: "scope:large",
        actor: { externalKey: "large:admin" },
        sourcePostId: source.id,
        canonicalPostId: canonical.id,
      }),
    ).toMatchObject({ status: "pending" });
    expect(
      await backend.query(api.public.posts.resolvePost, {
        scopeId: "scope:large",
        viewerAuthenticated: true,
        postId: source.id,
      }),
    ).toMatchObject({ status: "post", post: { voteCount: 51 } });
    expect(
      await backend.run(async (runCtx) => {
        const sourceId = runCtx.db.normalizeId("posts", source.id)!;
        const [votes, job, stages] = await Promise.all([
          runCtx.db
            .query("votes")
            .withIndex("by_scope_post_actor", (q) =>
              q.eq("scopeId", "scope:large").eq("postId", sourceId),
            )
            .collect(),
          runCtx.db
            .query("mergeJobs")
            .withIndex("by_scope_source", (q) =>
              q.eq("scopeId", "scope:large").eq("sourcePostId", sourceId),
            )
            .unique(),
          runCtx.db
            .query("mergeStages")
            .withIndex("by_scope_job_kind_key", (q) =>
              q.eq("scopeId", "scope:large"),
            )
            .collect(),
        ]);
        return { votes: votes.length, state: job?.state, stages: stages.length };
      }),
    ).toEqual({ votes: 51, state: "preparing", stages: 0 });
    vi.useRealTimers();
  });

  test("preserves relation truth and exposes one flattened durable redirect", async () => {
    vi.useFakeTimers();
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const admin = client("scope:alpha", "alpha:admin", true);
    const author = client("scope:alpha", "alpha:author");
    const voter = client("scope:alpha", "alpha:voter");
    const install = await admin.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const canonical = await author.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Canonical",
      body: "Keep this post",
    });
    const source = await author.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Duplicate",
      body: "Move this history",
    });
    await voter.participation.setVote(ctx, { postId: canonical.id, desired: true });
    await voter.participation.setVote(ctx, { postId: source.id, desired: true });
    await voter.participation.addComment(ctx, {
      postId: source.id,
      body: "Preserve my comment",
    });

    const result = await backend.mutation(api.admin.merge.mergePost, {
      scopeId: "scope:alpha",
      actor: { externalKey: "alpha:admin" },
      sourcePostId: source.id,
      canonicalPostId: canonical.id,
    });
    await backend.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(result).toMatchObject({ status: expect.stringMatching(/complete|pending/) });
    expect(await backend.query(api.public.posts.resolvePost, {
      scopeId: "scope:alpha",
      viewerAuthenticated: true,
      postId: source.id,
    })).toEqual({
      contractVersion: 1,
      status: "merged",
      requestedPostId: source.id,
      canonicalPostId: canonical.id,
    });
    expect(await backend.query(api.public.posts.resolvePost, {
      scopeId: "scope:alpha",
      viewerAuthenticated: true,
      postId: canonical.id,
    })).toMatchObject({
      status: "post",
      post: { id: canonical.id, voteCount: 1, commentCount: 1 },
    });
    vi.useRealTimers();
  });

  test("does not disclose cross-scope or hidden canonical targets", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const alpha = client("scope:alpha", "alpha:admin", true);
    const beta = client("scope:beta", "beta:admin", true);
    const alphaInstall = await alpha.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const betaInstall = await beta.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const source = await alpha.participation.createPost(ctx, {
      boardId: alphaInstall.boards[0].id,
      title: "Source",
      body: "Alpha",
    });
    const foreign = await beta.participation.createPost(ctx, {
      boardId: betaInstall.boards[0].id,
      title: "Foreign",
      body: "Beta",
    });
    await expect(
      backend.mutation(api.admin.merge.mergePost, {
        scopeId: "scope:alpha",
        actor: { externalKey: "alpha:admin" },
        sourcePostId: source.id,
        canonicalPostId: foreign.id,
      }),
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    expect(await backend.query(api.public.posts.resolvePost, {
      scopeId: "scope:alpha",
      viewerAuthenticated: true,
      postId: foreign.id,
    })).toEqual({
      contractVersion: 1,
      status: "notFound",
    });
  });
});
