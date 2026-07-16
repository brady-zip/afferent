import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { createScopedAfferentClient } from "../../src/client/index.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import { api } from "../../src/component/_generated/api.js";
import schema from "../../src/component/schema.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

function backendContext(backend: ReturnType<typeof convexTest>) {
  return {
    auth: { getUserIdentity: async () => null },
    runMutation: (reference: never, args: object) =>
      backend.mutation(reference, args),
    runQuery: (reference: never, args: object) =>
      backend.query(reference, args),
  };
}

function client(scopeId: string) {
  return createScopedAfferentClient(api as unknown as ComponentApi, {
    resolveScope: async () => scopeId,
    resolveActor: async () => ({ externalKey: `${scopeId}:actor` }),
    authorizeAdmin: async () => true,
  });
}

describe("bounded feedback search", () => {
  test("searches only visible rows in the derived scope with honest truncation", async () => {
    const backend = convexTest(schema, modules);
    const ctx = backendContext(backend);
    const alpha = client("scope:alpha");
    const beta = client("scope:beta");
    const alphaInstall = await alpha.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [
        { slug: "ideas", name: "Ideas" },
        { slug: "bugs", name: "Bugs" },
      ],
    });
    const betaInstall = await beta.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "ideas", name: "Ideas" }],
    });

    for (let index = 0; index < 52; index += 1) {
      await alpha.participation.createPost(ctx as never, {
        boardId: alphaInstall.boards[index % 2].id,
        title: `Export feedback ${index}`,
        body: "Download results as CSV",
      });
    }
    const hidden = await alpha.participation.createPost(ctx as never, {
      boardId: alphaInstall.boards[0].id,
      title: "Export feedback hidden",
      body: "Download results as CSV",
    });
    await alpha.participation.withdrawPost(ctx as never, { postId: hidden.id });
    await beta.participation.createPost(ctx as never, {
      boardId: betaInstall.boards[0].id,
      title: "Export feedback beta",
      body: "Download results as CSV",
    });

    const result = await backend.query(api["public/search"].searchFeedback, {
      scopeId: "scope:alpha",
      viewerAuthenticated: false,
      query: "export feedback",
    });
    expect(result).toMatchObject({ contractVersion: 1, hasMore: true });
    expect(result.items).toHaveLength(50);
    expect(result).not.toHaveProperty("continueCursor");
    expect(result.items.every((item) => item.id !== hidden.id)).toBe(true);
    expect(result.items.every((item) => !item.title.includes("beta"))).toBe(
      true,
    );

    const tagged = await backend.run(async (runCtx) => {
      const postId = runCtx.db.normalizeId("posts", result.items[0].id)!;
      const post = await runCtx.db.get(postId);
      if (!post) throw new Error("SEARCH_TEST_POST_MISSING");
      const tagId = await runCtx.db.insert("tags", {
        scopeId: "scope:alpha",
        name: "Reporting",
      });
      await runCtx.db.insert("postTags", {
        scopeId: "scope:alpha",
        postId,
        tagId,
      });
      await runCtx.db.insert("postTagSearches", {
        scopeId: "scope:alpha",
        postId,
        tagId,
        boardId: post.boardId,
        statusKey: post.statusKey,
        visibilityKey: "visible",
        searchText: post.searchText!,
      });
      return { postId: String(postId), tagId: String(tagId) };
    });
    const tagResult = await backend.query(api["public/search"].searchFeedback, {
      scopeId: "scope:alpha",
      viewerAuthenticated: false,
      query: "export feedback",
      tagId: tagged.tagId,
    });
    expect(tagResult.items.map(({ id }) => id)).toEqual([tagged.postId]);

    const boardResult = await backend.query(
      api["public/search"].searchFeedback,
      {
        scopeId: "scope:alpha",
        viewerAuthenticated: false,
        query: "export feedback",
        boardId: alphaInstall.boards[1].id,
      },
    );
    expect(
      boardResult.items.every(
        (item) => item.board.id === alphaInstall.boards[1].id,
      ),
    ).toBe(true);
  }, 20_000);

  test("returns deterministic cross-board suggestions without raw scores", async () => {
    const backend = convexTest(schema, modules);
    const ctx = backendContext(backend);
    const alpha = client("scope:similar");
    const configured = await alpha.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [
        { slug: "ideas", name: "Ideas" },
        { slug: "bugs", name: "Bugs" },
      ],
    });
    for (const [index, title] of [
      "CSV feedback export",
      "Export feedback reports",
      "Dark mode",
    ].entries()) {
      await alpha.participation.createPost(ctx as never, {
        boardId: configured.boards[index % 2].id,
        title,
        body: title,
      });
    }

    const result = await backend.query(
      api["public/search"].suggestSimilarPosts,
      {
        scopeId: "scope:similar",
        viewerAuthenticated: false,
        title: "Export feedback CSV",
        body: "Download reports",
      },
    );
    expect(result.items.map(({ title }) => title)).toEqual([
      "CSV feedback export",
      "Export feedback reports",
    ]);
    expect(result.items.every((item) => !("score" in item))).toBe(true);
  });
});
