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
    runMutation: (
      reference: Parameters<typeof backend.mutation>[0],
      args: object,
    ) => backend.mutation(reference, args),
    runQuery: (reference: Parameters<typeof backend.query>[0], args: object) =>
      backend.query(reference, args),
  };
}

function adminClient(options?: {
  authorizeAdmin?: () => Promise<boolean>;
  scopeId?: string;
}) {
  return createScopedAfferentClient(api as unknown as ComponentApi, {
    resolveScope: async () => options?.scopeId ?? "scope:alpha",
    resolveActor: async () => ({
      externalKey: "fixture:tag-admin",
      displayName: "Tag Admin",
    }),
    authorizeAdmin: options?.authorizeAdmin ?? (async () => true),
    isAuthenticated: async () => true,
  }) as any;
}

describe("scope-owned tag lifecycle", () => {
  test("creates, renames, assigns, removes, filters, and records activity", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const client = adminClient();
    const ctx = context(backend) as never;
    const installation = await client.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Taggable feedback",
      body: "Tag search projection",
    });

    const tag = await client.admin.createTag(ctx, { name: "  Integrations  " });
    expect(tag).toMatchObject({ contractVersion: 1, name: "Integrations" });
    expect(await client.admin.listTags(ctx, {})).toEqual({
      contractVersion: 1,
      tags: [tag],
    });

    const assigned = await client.admin.setPostTag(ctx, {
      postId: post.id,
      tagId: tag.id,
      desired: true,
    });
    expect(assigned.feedback.tags).toEqual([tag]);
    expect(
      await client.admin.setPostTag(ctx, {
        postId: post.id,
        tagId: tag.id,
        desired: true,
      }),
    ).toMatchObject({ feedback: { tags: [tag] } });

    const renamed = await client.admin.renameTag(ctx, {
      tagId: tag.id,
      name: "Platform",
    });
    expect(renamed).toEqual({ ...tag, name: "Platform" });
    expect(await client.read.getPost(ctx, { postId: post.id })).toMatchObject({
      id: post.id,
    });
    const filtered = await client.read.listFeedback(ctx, {
      order: "newest",
      tagId: tag.id,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(filtered.page).toMatchObject([
      { id: post.id, tags: [{ id: tag.id, name: "Platform" }] },
    ]);
    const search = await client.read.searchFeedback(ctx, {
      query: "Taggable",
      tagId: tag.id,
    });
    expect(search.items).toMatchObject([{ id: post.id }]);

    const activity = await client.admin.listPostActivity(ctx, {
      postId: post.id,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(activity.page.filter((entry: any) => entry.type === "tag_add"))
      .toHaveLength(1);

    const removed = await client.admin.setPostTag(ctx, {
      postId: post.id,
      tagId: tag.id,
      desired: false,
    });
    expect(removed.feedback.tags).toEqual([]);
    expect(
      await client.admin.setPostTag(ctx, {
        postId: post.id,
        tagId: tag.id,
        desired: false,
      }),
    ).toMatchObject({ feedback: { tags: [] } });
  });

  test("enforces fresh admin authorization, scope equivalence, uniqueness, and the 20-tag ceiling", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    let allowed = true;
    const authorizeAdmin = vi.fn(async () => allowed);
    const alpha = adminClient({ authorizeAdmin });
    const alphaCtx = context(backend) as never;
    const installation = await alpha.admin.configureInstallation(alphaCtx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await alpha.participation.createPost(alphaCtx, {
      boardId: installation.boards[0].id,
      title: "Twenty tags",
      body: "Bounded memberships",
    });
    const tags = [];
    for (let index = 0; index < 21; index += 1) {
      tags.push(await alpha.admin.createTag(alphaCtx, { name: `Tag ${index}` }));
    }
    for (const tag of tags.slice(0, 20)) {
      await alpha.admin.setPostTag(alphaCtx, {
        postId: post.id,
        tagId: tag.id,
        desired: true,
      });
    }
    await expect(
      alpha.admin.setPostTag(alphaCtx, {
        postId: post.id,
        tagId: tags[20].id,
        desired: true,
      }),
    ).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(
      alpha.admin.createTag(alphaCtx, { name: " tag 0 " }),
    ).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });

    const beta = createScopedAfferentClient(api as unknown as ComponentApi, {
      resolveScope: async () => "scope:beta",
      resolveActor: async () => ({ externalKey: "fixture:beta-admin" }),
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    }) as any;
    await beta.admin.configureInstallation(alphaCtx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    await expect(
      beta.admin.renameTag(alphaCtx, { tagId: tags[0].id, name: "Leaked" }),
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND", resource: "tag" } });
    await expect(
      beta.admin.renameTag(alphaCtx, { tagId: "not-a-tag", name: "Missing" }),
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND", resource: "tag" } });

    allowed = false;
    await expect(alpha.admin.listTags(alphaCtx, {})).rejects.toThrow(
      "ADMIN_AUTHORIZATION_REQUIRED",
    );
    await expect(
      alpha.admin.renameTag(alphaCtx, { tagId: tags[0].id, name: "Denied" }),
    ).rejects.toThrow("ADMIN_AUTHORIZATION_REQUIRED");
    expect(authorizeAdmin.mock.calls.length).toBeGreaterThanOrEqual(46);
  });
});
