import { convexTest } from "convex-test";

import { withRateLimiter } from "../helpers/rate-limiter.js";
import { describe, expect, test } from "vitest";

import { createAfferentClient } from "../../src/client/index.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

function createHarness() {
  const backend = withRateLimiter(convexTest(schema, modules));
  const client = createAfferentClient(api as unknown as ComponentApi, {
    resolveActor: async () => ({
      externalKey: "fixture:installation-author",
      displayName: "Installation Author",
    }),
    authorizeAdmin: async () => true,
    isAuthenticated: async () => true,
  });
  const ctx = {
    auth: { getUserIdentity: async () => null },
    runMutation: (
      reference: Parameters<typeof backend.mutation>[0],
      args: object,
    ) => backend.mutation(reference, args),
    runQuery: (reference: Parameters<typeof backend.query>[0], args: object) =>
      backend.query(reference, args),
  };
  return { backend, client, ctx };
}

describe("additive installation configuration", () => {
  test("updates matching slugs while preserving omitted boards and their posts", async () => {
    const { client, ctx } = createHarness();
    const initial = await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [
        { slug: "feedback", name: "Feedback" },
        { slug: "bugs", name: "Bug Reports" },
      ],
    });
    const feedback = initial.boards.find((board) => board.slug === "feedback")!;
    const bugs = initial.boards.find((board) => board.slug === "bugs")!;
    const post = await client.participation.createPost(ctx as never, {
      boardId: bugs.id,
      title: "Preserve this post",
      body: "Omitted boards remain attached to their content.",
    });

    const renamed = await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feature Requests" }],
    });
    expect(renamed.boards).toEqual([
      expect.objectContaining({
        id: feedback.id,
        slug: "feedback",
        name: "Feature Requests",
      }),
      expect.objectContaining({
        id: bugs.id,
        slug: "bugs",
        name: "Bug Reports",
      }),
    ]);
    expect(
      await client.read.getPost(ctx as never, { postId: post.id }),
    ).toMatchObject({
      id: post.id,
      boardId: bugs.id,
    });

    const appended = await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "ideas", name: "Ideas" }],
    });
    const ideas = appended.boards.find((board) => board.slug === "ideas")!;
    expect(appended.boards.map(({ slug }) => slug)).toEqual([
      "feedback",
      "bugs",
      "ideas",
    ]);

    const retried = await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "ideas", name: "Product Ideas" }],
    });
    expect(retried.boards).toHaveLength(3);
    expect(
      retried.boards.find((board) => board.slug === "ideas"),
    ).toMatchObject({
      id: ideas.id,
      name: "Product Ideas",
    });
  });

  test("rejects cumulative overflow before changing installation or board state", async () => {
    const { backend, client, ctx } = createHarness();
    await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: Array.from({ length: 19 }, (_, index) => ({
        slug: `board-${index}`,
        name: `Board ${index}`,
      })),
    });

    await expect(
      client.admin.configureInstallation(ctx as never, {
        readPolicy: "authenticated",
        boards: [
          { slug: "overflow-a", name: "Overflow A" },
          { slug: "overflow-b", name: "Overflow B" },
        ],
      }),
    ).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });

    const persisted = await backend.run(async (runCtx) => ({
      installation: await runCtx.db
        .query("installations")
        .withIndex("by_scope", (q) =>
          q.eq("scopeId", "afferent:single-product:v1"),
        )
        .unique(),
      boards: await runCtx.db
        .query("boards")
        .withIndex("by_scope_order", (q) =>
          q.eq("scopeId", "afferent:single-product:v1"),
        )
        .collect(),
    }));
    expect(persisted.installation?.readPolicy).toBe("public");
    expect(persisted.boards).toHaveLength(19);
    expect(persisted.boards.map(({ slug }) => slug)).not.toContain(
      "overflow-a",
    );
    expect(persisted.boards.map(({ slug }) => slug)).not.toContain(
      "overflow-b",
    );
  });
});
