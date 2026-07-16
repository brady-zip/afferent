import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";
import { createAfferentClient } from "../../src/client/index.js";
import type { BoardId } from "../../src/client/index.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

describe("packed walking skeleton component", () => {
  test("configures a fixed-scope board and creates and lists one safe post DTO", async () => {
    const backend = convexTest(schema, modules);
    const component = api as unknown as ComponentApi;
    const client = createAfferentClient(component, {
      resolveActor: async () => ({
        externalKey: "fixture:test-actor",
        displayName: "Test Actor",
      }),
      authorizeAdmin: async () => true,
    });
    const ctx = {
      auth: { getUserIdentity: async () => null },
      runMutation: (reference: Parameters<typeof backend.mutation>[0], args: object) =>
        backend.mutation(reference, args),
      runQuery: (reference: Parameters<typeof backend.query>[0], args: object) =>
        backend.query(reference, args),
    };

    const configured = await client.admin.configureInstallation(
      ctx as unknown as Parameters<typeof client.admin.configureInstallation>[0],
      {
        readPolicy: "public",
        boards: [{ slug: "feedback", name: "Product Feedback" }],
      },
    );
    const board = configured.boards[0];
    expect(board).toMatchObject({ name: "Product Feedback", slug: "feedback" });

    const created = await client.participation.createPost(
      ctx as unknown as Parameters<typeof client.participation.createPost>[0],
      {
        boardId: board.id,
        title: "A safer feedback loop",
        body: "Keep authority in trusted host functions.",
      },
    );
    const listed = await client.read.listPosts(
      ctx as unknown as Parameters<typeof client.read.listPosts>[0],
      { boardId: board.id },
    );

    expect(listed.posts).toEqual([created]);
    expect(created).toMatchObject({
      contractVersion: 1,
      boardId: board.id,
      title: "A safer feedback loop",
      status: { key: "open", label: "Open" },
      voteCount: 0,
      commentCount: 0,
      totals: { votes: 0, comments: 0 },
      tags: [],
      author: { displayName: "Test Actor" },
    });
    expect(created).not.toHaveProperty("scopeId");
    expect(created.author).not.toHaveProperty("externalKey");
  });

  test("rejects anonymous participation before calling the component", async () => {
    const componentCalls: unknown[] = [];
    const client = createAfferentClient({} as ComponentApi, {
      resolveActor: async () => null,
      authorizeAdmin: async () => false,
    });
    const ctx = {
      auth: { getUserIdentity: async () => null },
      runMutation: (...args: unknown[]) => {
        componentCalls.push(args);
        throw new Error("component should not be called");
      },
      runQuery: (...args: unknown[]) => {
        componentCalls.push(args);
        throw new Error("component should not be called");
      },
    };

    await expect(
      client.participation.createPost(
        ctx as unknown as Parameters<typeof client.participation.createPost>[0],
        {
          boardId: "forged-board" as BoardId,
          title: "Forged",
          body: "Anonymous callers cannot write.",
        },
      ),
    ).rejects.toThrow("AUTHENTICATION_REQUIRED");
    expect(componentCalls).toEqual([]);
  });

  test("keeps authority-shaped fields out of browser intent contracts", async () => {
    const { createPostIntentValidator } = await import("../../src/client/contracts.js");
    expect(Object.keys(createPostIntentValidator.fields).sort()).toEqual([
      "boardId",
      "body",
      "title",
    ]);
  });
});
