import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import { createScopedAfferentClient } from "../../src/client/server.js";
import type { BoardId, PostId } from "../../src/client/index.js";
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

describe("server-derived scope isolation", () => {
  test("resolves scope before actor/admin authority and every component call", async () => {
    const order: string[] = [];
    const component = {
      public: { boards: { listBoards: "listBoards" } },
      participation: { posts: { createPost: "createPost" } },
      admin: { installation: { configureInstallation: "configure" } },
    } as unknown as ComponentApi;
    const client = createScopedAfferentClient(component, {
      resolveScope: async () => {
        order.push("scope");
        return "derived-scope";
      },
      resolveActor: async () => {
        order.push("actor");
        return { externalKey: "fixture:actor" };
      },
      authorizeAdmin: async () => {
        order.push("admin");
        return true;
      },
    });
    const ctx = {
      auth: { getUserIdentity: async () => null },
      runQuery: vi.fn(async () => {
        order.push("component");
        return { contractVersion: 1, boards: [] };
      }),
      runMutation: vi.fn(async () => {
        order.push("component");
        return { contractVersion: 1, boards: [], readPolicy: "public" };
      }),
    };

    await client.read.listBoards(ctx as never, {});
    expect(order).toEqual(["scope", "component"]);
    order.length = 0;

    await client.participation.createPost(ctx as never, {
      boardId: "board" as BoardId,
      title: "Scoped",
      body: "Server-derived",
    });
    expect(order).toEqual(["scope", "actor", "component"]);
    order.length = 0;

    await client.admin.configureInstallation(ctx as never, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    expect(order).toEqual(["scope", "admin", "component"]);
  });

  test("keeps identical boards, posts, counts, and reactive reads isolated", async () => {
    const backend = convexTest(schema, modules);
    const component = api as unknown as ComponentApi;
    const ctx = backendContext(backend);
    const makeClient = (scope: string, actor: string) =>
      createScopedAfferentClient(component, {
        resolveScope: async () => scope,
        resolveActor: async () => ({
          externalKey: actor,
          displayName: actor,
        }),
        authorizeAdmin: async () => true,
      });
    const alpha = makeClient("scope-alpha", "fixture:alpha");
    const beta = makeClient("scope-beta", "fixture:beta");

    const alphaBoard = (
      await alpha.admin.configureInstallation(ctx as never, {
        readPolicy: "public",
        boards: [
          { slug: "feedback", name: "Feedback" },
          { slug: "bugs", name: "Bugs" },
        ],
      })
    ).boards[0];
    const betaBoard = (
      await beta.admin.configureInstallation(ctx as never, {
        readPolicy: "public",
        boards: [
          { slug: "feedback", name: "Feedback" },
          { slug: "bugs", name: "Bugs" },
        ],
      })
    ).boards[0];

    const alphaPost = await alpha.participation.createPost(ctx as never, {
      boardId: alphaBoard.id,
      title: "Alpha only",
      body: "alpha",
    });
    await beta.participation.createPost(ctx as never, {
      boardId: betaBoard.id,
      title: "Beta only",
      body: "beta",
    });

    expect((await alpha.read.listBoards(ctx as never, {})).boards).toHaveLength(
      2,
    );
    expect(
      (await alpha.read.listPosts(ctx as never, { boardId: alphaBoard.id }))
        .posts,
    ).toMatchObject([{ title: "Alpha only" }]);
    expect(
      await alpha.read.countPosts(ctx as never, { boardId: alphaBoard.id }),
    ).toEqual({ contractVersion: 1, count: 1 });

    await expect(
      beta.read.getPost(ctx as never, { postId: alphaPost.id }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "post" },
    });
    await expect(
      beta.read.getPost(ctx as never, {
        postId: "j57fakeopaqueid" as PostId,
      }),
    ).rejects.toMatchObject({
      data: { code: "NOT_FOUND", resource: "post" },
    });

    await alpha.participation.createPost(ctx as never, {
      boardId: alphaBoard.id,
      title: "Reactive alpha",
      body: "alpha",
    });
    expect(
      (await beta.read.listPosts(ctx as never, { boardId: betaBoard.id })).posts,
    ).toMatchObject([{ title: "Beta only" }]);
  });
});
