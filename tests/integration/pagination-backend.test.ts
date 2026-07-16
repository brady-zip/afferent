import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import {
  createAfferentClient,
  createScopedAfferentClient,
} from "../../src/client/index.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import { api } from "../../src/component/_generated/api.js";
import schema from "../../src/component/schema.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

describe("component-compatible post pagination", () => {
  test("preserves helper metadata and remains gap-free after reactive mutations", async () => {
    const backend = convexTest(schema, modules);
    const component = api as unknown as ComponentApi;
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
    const fixed = createAfferentClient(component, {
      resolveActor: async () => ({ externalKey: "fixture:fixed" }),
      authorizeAdmin: async () => true,
    });
    const scoped = (scope: string) =>
      createScopedAfferentClient(component, {
        resolveScope: async () => scope,
        resolveActor: async () => ({ externalKey: `fixture:${scope}` }),
        authorizeAdmin: async () => true,
      });
    const alpha = scoped("derived-alpha");
    const beta = scoped("derived-beta");

    const setup = async (client: typeof fixed, prefix: string) => {
      const configured = await client.admin.configureInstallation(ctx as never, {
        readPolicy: "public",
        boards: [
          { slug: "feedback", name: "Feedback" },
          { slug: "bugs", name: "Bugs" },
        ],
      });
      for (let index = 0; index < 50; index += 1) {
        await client.participation.createPost(ctx as never, {
          boardId: configured.boards[index % 2].id,
          title: `${prefix}-${index.toString().padStart(2, "0")}`,
          body: prefix,
        });
      }
      return configured.boards;
    };

    const [fixedBoards, alphaBoards, betaBoards] = await Promise.all([
      setup(fixed, "fixed"),
      setup(alpha, "alpha"),
      setup(beta, "beta"),
    ]);
    expect(alphaBoards.map((board) => board.slug)).toEqual(
      betaBoards.map((board) => board.slug),
    );

    const first = await alpha.read.listPosts(ctx as never, {
      boardId: alphaBoards[0].id,
      paginationOpts: { numItems: 10, cursor: null },
    } as never);
    expect(first.page).toHaveLength(10);
    expect(first.posts).toEqual(first.page);
    expect(first).toEqual(
      expect.objectContaining({
        contractVersion: 1,
        continueCursor: expect.any(String),
        isDone: false,
      }),
    );
    expect(first.page.every((post) => post.title.startsWith("alpha-"))).toBe(
      true,
    );

    const inserted = await alpha.participation.createPost(ctx as never, {
      boardId: alphaBoards[0].id,
      title: "alpha-reactive-insert",
      body: "alpha",
    });
    await alpha.participation.editPost(ctx as never, {
      postId: first.page[0].id,
      title: "alpha-reactive-edit",
    });
    await alpha.participation.withdrawPost(ctx as never, {
      postId: first.page[1].id,
    });

    const second = await alpha.read.listPosts(ctx as never, {
      boardId: alphaBoards[0].id,
      paginationOpts: {
        numItems: 10,
        cursor: first.continueCursor,
        endCursor: first.endCursor,
      },
    } as never);
    expect(second.page).toHaveLength(10);
    expect(
      second.page.some((post) => first.page.some((seen) => seen.id === post.id)),
    ).toBe(false);
    expect(second.page.every((post) => post.title.startsWith("alpha-"))).toBe(
      true,
    );

    const fresh: string[] = [];
    let cursor: string | null = null;
    let done = false;
    while (!done) {
      const page = await alpha.read.listPosts(ctx as never, {
        boardId: alphaBoards[0].id,
        paginationOpts: { numItems: 10, cursor },
      } as never);
      fresh.push(...page.page.map((post) => post.id));
      cursor = page.continueCursor;
      done = page.isDone;
    }
    expect(new Set(fresh).size).toBe(fresh.length);
    expect(fresh).toHaveLength(25);
    expect(fresh).toContain(inserted.id);
    expect(fresh).not.toContain(first.page[1].id);

    const betaPage = await beta.read.listPosts(ctx as never, {
      boardId: betaBoards[0].id,
      paginationOpts: { numItems: 10, cursor: null },
    } as never);
    expect(betaPage.page.every((post) => post.title.startsWith("beta-"))).toBe(
      true,
    );
    const fixedPage = await fixed.read.listPosts(ctx as never, {
      boardId: fixedBoards[0].id,
      paginationOpts: { numItems: 10, cursor: null },
    } as never);
    expect(Object.keys(fixedPage).sort()).toEqual(Object.keys(betaPage).sort());
    expect(fixedPage.page).toHaveLength(betaPage.page.length);
  });
});
