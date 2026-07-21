import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { createScopedAfferentClient } from "../../src/client/server.js";
import { api, internal } from "../../src/component/_generated/api.js";
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

function corruptInnerCursor(cursor: string) {
  const prefix = "afferent-page:v1:";
  expect(cursor.startsWith(prefix)).toBe(true);
  const envelope = JSON.parse(
    Buffer.from(cursor.slice(prefix.length), "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  return `${prefix}${Buffer.from(
    JSON.stringify({ ...envelope, position: "not-json" }),
    "utf8",
  ).toString("base64url")}`;
}

describe("duplicate merge lifecycle", () => {
  test("pages exact merged comment and activity ties with pinned reset-safe cursors", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const admin = client("scope:pagination", "pagination:admin", true);
    const install = await admin.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const canonical = await admin.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Canonical pagination",
      body: "Canonical pagination body",
    });
    const source = await admin.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Source pagination",
      body: "Source pagination body",
    });

    await backend.run(async (runCtx) => {
      const canonicalId = runCtx.db.normalizeId("posts", canonical.id)!;
      const sourceId = runCtx.db.normalizeId("posts", source.id)!;
      const actorId = (
        await runCtx.db
          .query("actors")
          .withIndex("by_scope_external_key", (q) =>
            q
              .eq("scopeId", "scope:pagination")
              .eq("externalKey", "pagination:admin"),
          )
          .unique()
      )!._id;
      for (let index = 0; index < 8; index += 1) {
        const postId = index % 2 === 0 ? canonicalId : sourceId;
        await runCtx.db.insert("comments", {
          scopeId: "scope:pagination",
          postId,
          actorId,
          body: `comment ${index}`,
        });
        await runCtx.db.insert("postActivity", {
          scopeId: "scope:pagination",
          postId,
          actorId,
          type: "edit",
          occurredAt: 42,
          changedFields: [`field-${index}`],
        });
      }
      for (let index = 0; index < 51; index += 1) {
        const voterId = await runCtx.db.insert("actors", {
          scopeId: "scope:pagination",
          externalKey: `pagination:voter:${index}`,
        });
        await runCtx.db.insert("votes", {
          scopeId: "scope:pagination",
          postId: sourceId,
          actorId: voterId,
        });
      }
      await runCtx.db.patch(canonicalId, { commentCount: 4 });
      await runCtx.db.patch(sourceId, { commentCount: 4, voteCount: 51 });
    });

    const assertCorruptInnerResets = async (
      reference:
        | typeof api.public.comments.listComments
        | typeof api.admin.activity.listPostActivity,
      postId: string,
      extra: Record<string, unknown>,
    ) => {
      const first = await backend.query(reference as any, {
        scopeId: "scope:pagination",
        postId,
        ...extra,
        paginationOpts: { numItems: 2, cursor: null },
      });
      const corrupt = corruptInnerCursor(first.continueCursor);
      for (const paginationOpts of [
        { numItems: 2, cursor: corrupt },
        { numItems: 2, cursor: null, endCursor: corrupt },
      ]) {
        const reset = await backend.query(reference as any, {
          scopeId: "scope:pagination",
          postId,
          ...extra,
          paginationOpts,
        });
        expect(reset.page.map((row: { id: string }) => row.id)).toEqual(
          first.page.map((row: { id: string }) => row.id),
        );
      }
    };

    await assertCorruptInnerResets(
      api.public.comments.listComments,
      canonical.id,
      { viewerAuthenticated: true },
    );
    await assertCorruptInnerResets(
      api.admin.activity.listPostActivity,
      canonical.id,
      {},
    );

    await backend.mutation(api.admin.merge.mergePost, {
      scopeId: "scope:pagination",
      actor: { externalKey: "pagination:admin" },
      sourcePostId: source.id,
      canonicalPostId: canonical.id,
    });
    const jobId = await backend.run(async (runCtx) =>
      String(
        (
          await runCtx.db
            .query("mergeJobs")
            .withIndex("by_scope_source", (q) =>
              q
                .eq("scopeId", "scope:pagination")
                .eq("sourcePostId", runCtx.db.normalizeId("posts", source.id)!),
            )
            .unique()
        )!._id,
      ),
    );
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const state = await backend.run(async (runCtx) =>
        (await runCtx.db.get(runCtx.db.normalizeId("mergeJobs", jobId)!))!.state,
      );
      if (state === "cutover_done") break;
      await backend.mutation(internal.jobs.merge.continueMerge, { jobId });
    }
    expect(
      await backend.run(async (runCtx) =>
        (await runCtx.db.get(runCtx.db.normalizeId("mergeJobs", jobId)!))!.state,
      ),
    ).toBe("cutover_done");

    await assertCorruptInnerResets(
      api.public.comments.listComments,
      canonical.id,
      { viewerAuthenticated: true },
    );
    await assertCorruptInnerResets(
      api.admin.activity.listPostActivity,
      canonical.id,
      {},
    );

    const expected = await backend.run(async (runCtx) => {
      const canonicalId = runCtx.db.normalizeId("posts", canonical.id)!;
      const sourceId = runCtx.db.normalizeId("posts", source.id)!;
      const commentPages = await Promise.all(
          [canonicalId, sourceId].map((postId) =>
            runCtx.db
              .query("comments")
              .withIndex("by_scope_post", (q) =>
                q.eq("scopeId", "scope:pagination").eq("postId", postId),
              )
              .collect(),
          ),
        );
      const comments = commentPages
        .flat()
        .sort(
          (left, right) =>
            left._creationTime - right._creationTime ||
            String(left._id).localeCompare(String(right._id)),
        )
        .map((row) => String(row._id));
      const activityPages = await Promise.all(
          [canonicalId, sourceId].map((postId) =>
            runCtx.db
              .query("postActivity")
              .withIndex("by_scope_post_occurred", (q) =>
                q.eq("scopeId", "scope:pagination").eq("postId", postId),
              )
              .collect(),
          ),
        );
      const activity = activityPages
        .flat()
        .sort(
          (left, right) =>
            right.occurredAt - left.occurredAt ||
            right._creationTime - left._creationTime ||
            String(right._id).localeCompare(String(left._id)),
        )
        .map((row) => String(row._id));
      return { comments, activity };
    });

    const readAll = async (
      reference: typeof api.public.comments.listComments | typeof api.admin.activity.listPostActivity,
      extra: Record<string, unknown>,
    ) => {
      const ids: string[] = [];
      let cursor: string | null = null;
      for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
        const page = await backend.query(reference as any, {
          scopeId: "scope:pagination",
          postId: canonical.id,
          ...extra,
          paginationOpts: { numItems: 2, cursor },
        });
        ids.push(...page.page.map((row: { id: string }) => row.id));
        if (page.isDone) return ids;
        cursor = page.continueCursor;
      }
      throw new Error("pagination did not finish");
    };

    expect(
      await readAll(api.public.comments.listComments, {
        viewerAuthenticated: true,
      }),
    ).toEqual(expected.comments);
    expect(await readAll(api.admin.activity.listPostActivity, {})).toEqual(
      expected.activity,
    );

    const first = await backend.query(api.public.comments.listComments, {
      scopeId: "scope:pagination",
      postId: canonical.id,
      viewerAuthenticated: true,
      paginationOpts: { numItems: 2, cursor: null },
    });
    const pinned = await backend.query(api.public.comments.listComments, {
      scopeId: "scope:pagination",
      postId: canonical.id,
      viewerAuthenticated: true,
      paginationOpts: {
        numItems: 2,
        cursor: null,
        endCursor: first.continueCursor,
      },
    });
    expect(pinned.page.map((row) => row.id)).toEqual(
      first.page.map((row) => row.id),
    );
    const reset = await backend.query(api.public.comments.listComments, {
      scopeId: "scope:pagination",
      postId: canonical.id,
      viewerAuthenticated: true,
      paginationOpts: { numItems: 2, cursor: "malformed" },
    });
    expect(reset.page.map((row) => row.id)).toEqual(
      first.page.map((row) => row.id),
    );
    vi.useRealTimers();
  });

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
