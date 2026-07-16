import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { createAfferentClient } from "../../src/client/index.js";
import type { VerifiedActor } from "../../src/client/index.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

describe("author-owned post lifecycle", () => {
  test("refreshes actors transactionally and preserves withdrawn history", async () => {
    const backend = convexTest(schema, modules);
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
    ).rejects.toMatchObject({ data: { code: "NOT_OWNER" } });

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
    expect((await client.read.listPosts(ctx as never, { boardId })).posts).toEqual(
      [],
    );
    expect(await client.read.getPost(ctx as never, { postId: created.id })).toMatchObject(
      { id: created.id, title: "Edited title" },
    );

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
});
