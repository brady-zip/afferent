import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

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

function scopedClient(scopeId: string) {
  return createScopedAfferentClient(api as unknown as ComponentApi, {
    resolveScope: async () => scopeId,
    resolveActor: async () => ({
      externalKey: `${scopeId}:editor`,
      displayName: "Editor",
    }),
    authorizeAdmin: async () => true,
    isAuthenticated: async () => true,
  }) as any;
}

describe("manual changelog lifecycle", () => {
  test("re-authorizes every editorial mutation in the trusted host wrapper", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    let allowed = true;
    let checks = 0;
    const client = createScopedAfferentClient(api as unknown as ComponentApi, {
      resolveScope: async () => "scope:authority",
      resolveActor: async () => ({ externalKey: "authority:editor" }),
      authorizeAdmin: async () => {
        checks += 1;
        return allowed;
      },
      isAuthenticated: async () => true,
    }) as any;
    await client.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const draft = await client.admin.createChangelogDraft(ctx, {
      title: "Authorized",
      body: "Editorial body",
    });
    allowed = false;
    await expect(
      client.admin.publishChangelog(ctx, { entryId: draft.id }),
    ).rejects.toThrow("ADMIN_AUTHORIZATION_REQUIRED");
    expect(checks).toBe(3);
  });

  test("locks first-publish identity, pages public entries, and keeps publication status-orthogonal", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const alpha = scopedClient("scope:alpha");
    const beta = scopedClient("scope:beta");
    const alphaInstall = await alpha.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const betaInstall = await beta.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const alphaPost = await alpha.participation.createPost(ctx, {
      boardId: alphaInstall.boards[0].id,
      title: "Alpha request",
      body: "Requested work",
    });
    const secondPost = await alpha.participation.createPost(ctx, {
      boardId: alphaInstall.boards[0].id,
      title: "Second request",
      body: "More work",
    });
    const betaPost = await beta.participation.createPost(ctx, {
      boardId: betaInstall.boards[0].id,
      title: "Beta request",
      body: "Other scope",
    });

    const draft = await alpha.admin.createChangelogDraft(ctx, {
      title: "Summer Release",
      body: "# Highlights\n\nShipped **carefully**.",
    });
    expect(draft).toMatchObject({ slug: "summer-release", state: "draft" });
    expect(
      await alpha.read.listPublishedChangelog(ctx, {
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).toMatchObject({ page: [] });
    expect(
      await alpha.read.getPublishedChangelogBySlug(ctx, {
        slug: "summer-release",
      }),
    ).toEqual({ contractVersion: 1, status: "notFound" });

    const collision = await alpha.admin.createChangelogDraft(ctx, {
      title: "Summer Release",
      body: "Another release",
    });
    expect(collision.slug).toBe("summer-release-2");
    await expect(
      alpha.admin.editChangelog(ctx, {
        entryId: collision.id,
        slug: "summer-release",
      }),
    ).rejects.toMatchObject({ data: { code: "CONFLICT", field: "slug" } });
    const editedDraft = await alpha.admin.editChangelog(ctx, {
      entryId: draft.id,
      title: "Summer Release Updated",
      slug: "summer-release-updated",
    });
    expect(editedDraft.slug).toBe("summer-release-updated");

    await expect(
      alpha.admin.setChangelogLinks(ctx, {
        entryId: draft.id,
        postIds: [betaPost.id],
      }),
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await alpha.admin.setChangelogLinks(ctx, {
      entryId: draft.id,
      postIds: [alphaPost.id],
    });
    const published = await alpha.admin.publishChangelog(ctx, {
      entryId: draft.id,
    });
    expect(published).toMatchObject({
      slug: "summer-release-updated",
      state: "published",
    });
    expect(published.firstPublishedAt).toEqual(expect.any(Number));

    const firstPage = await alpha.read.listPublishedChangelog(ctx, {
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(firstPage.page.map((entry: any) => entry.id)).toEqual([draft.id]);
    const publicEntry = await alpha.read.getPublishedChangelogBySlug(ctx, {
      slug: published.slug,
    });
    expect(publicEntry).toMatchObject({
      status: "entry",
      entry: { id: draft.id, links: [{ id: alphaPost.id }] },
    });

    const idempotent = await alpha.admin.publishChangelog(ctx, {
      entryId: draft.id,
    });
    expect(idempotent.firstPublishedAt).toBe(published.firstPublishedAt);
    await alpha.admin.setPostStatus(ctx, {
      postId: alphaPost.id,
      status: "complete",
    });
    expect(
      await alpha.read.getPublishedChangelogBySlug(ctx, {
        slug: published.slug,
      }),
    ).toMatchObject({ status: "entry" });

    const editedPublished = await alpha.admin.editChangelog(ctx, {
      entryId: draft.id,
      title: "Summer Release Final",
      body: "Updated editorial body",
    });
    expect(editedPublished).toMatchObject({
      slug: published.slug,
      firstPublishedAt: published.firstPublishedAt,
    });
    await expect(
      alpha.admin.editChangelog(ctx, {
        entryId: draft.id,
        slug: "renamed-after-publish",
      }),
    ).rejects.toMatchObject({ data: { code: "CONFLICT", field: "slug" } });

    await alpha.admin.unpublishChangelog(ctx, { entryId: draft.id });
    expect(
      await alpha.read.getPublishedChangelogBySlug(ctx, {
        slug: published.slug,
      }),
    ).toEqual({ contractVersion: 1, status: "notFound" });
    const republished = await alpha.admin.publishChangelog(ctx, {
      entryId: draft.id,
    });
    expect(republished).toMatchObject({
      slug: published.slug,
      firstPublishedAt: published.firstPublishedAt,
    });

    await alpha.admin.setChangelogLinks(ctx, {
      entryId: draft.id,
      postIds: [alphaPost.id, secondPost.id],
    });
    expect(
      await alpha.read.getPublishedChangelogBySlug(ctx, {
        slug: published.slug,
      }),
    ).toMatchObject({
      entry: { links: [{ id: alphaPost.id }, { id: secondPost.id }] },
    });

    await alpha.admin.setArchived(ctx, {
      postId: alphaPost.id,
      archived: true,
    });
    expect(
      await alpha.read.getPublishedChangelogBySlug(ctx, {
        slug: published.slug,
      }),
    ).toMatchObject({ entry: { links: [{ id: secondPost.id }] } });
    await alpha.admin.setArchived(ctx, {
      postId: alphaPost.id,
      archived: false,
    });
    expect(
      await alpha.read.getPublishedChangelogBySlug(ctx, {
        slug: published.slug,
      }),
    ).toMatchObject({
      entry: { links: [{ id: alphaPost.id }, { id: secondPost.id }] },
    });

    const persisted = await backend.run(async (runCtx) => {
      const guards = await runCtx.db
        .query("changelogNotificationGuards")
        .withIndex("by_scope_entry_post", (q) =>
          q.eq("scopeId", "scope:alpha").eq("entryId", draft.id),
        )
        .collect();
      const activity = await runCtx.db
        .query("postActivity")
        .withIndex("by_scope_post_occurred", (q) =>
          q.eq("scopeId", "scope:alpha").eq("postId", alphaPost.id),
        )
        .collect();
      return { guards, activity };
    });
    expect(persisted.guards).toHaveLength(2);
    expect(
      persisted.activity.filter((row: any) => row.type === "changelog_publish"),
    ).toHaveLength(2);
    expect(
      persisted.activity.filter(
        (row: any) => row.type === "changelog_unpublish",
      ),
    ).toHaveLength(1);
  });

  test("projects merged links through the current visible canonical post", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const client = scopedClient("scope:merge");
    const installation = await client.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const source = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Source",
      body: "Source",
    });
    const canonical = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Canonical",
      body: "Canonical",
    });
    const entry = await client.admin.createChangelogDraft(ctx, {
      title: "Merged release",
      body: "Details",
    });
    await client.admin.setChangelogLinks(ctx, {
      entryId: entry.id,
      postIds: [source.id],
    });
    await client.admin.publishChangelog(ctx, { entryId: entry.id });
    await backend.run(async (runCtx) => {
      await runCtx.db.patch(source.id, {
        mergedIntoPostId: canonical.id,
        visibilityKey: "hidden",
      });
    });
    expect(
      await client.read.getPublishedChangelogBySlug(ctx, { slug: entry.slug }),
    ).toMatchObject({ entry: { links: [{ id: canonical.id }] } });
  });
});
