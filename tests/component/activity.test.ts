import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { createAfferentClient } from "../../src/client/index.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";
import { withRateLimiter } from "../helpers/rate-limiter.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

function context(backend: ReturnType<typeof convexTest>) {
  return {
    auth: { getUserIdentity: async () => null },
    runMutation: (reference: Parameters<typeof backend.mutation>[0], args: object) => backend.mutation(reference, args),
    runQuery: (reference: Parameters<typeof backend.query>[0], args: object) => backend.query(reference, args),
  };
}

describe("admin activity presentation", () => {
  test("projects readable board references and never leaks opaque ids", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:admin" }),
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    }) as any;
    const ctx = context(backend) as never;
    const installation = await client.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "one", name: "One" }, { slug: "two", name: "Two" }],
    });
    const post = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Move me",
      body: "Body",
    });
    await client.admin.movePost(ctx, { postId: post.id, boardId: installation.boards[1].id });
    const page = await client.admin.listPostActivity(ctx, {
      postId: post.id,
      paginationOpts: { numItems: 10, cursor: null },
    });
    const moved = page.page.find((row: any) => row.type === "board_move");
    expect(page.contractVersion).toBe(2);
    expect(moved).toMatchObject({
      contractVersion: 2,
      fromBoard: { contractVersion: 1, name: "One", slug: "one" },
      toBoard: { contractVersion: 1, name: "Two", slug: "two" },
    });
    expect(moved).not.toHaveProperty("fromBoardId");
    expect(moved).not.toHaveProperty("toBoardId");
  });
});
