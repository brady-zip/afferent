import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { createAfferentClient } from "../../src/client/index.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";

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

describe("fixed transactional participation limits", () => {
  test("returns an actionable actor create-post denial after five attempts", async () => {
    const backend = convexTest(schema, modules);
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:limited-author" }),
      authorizeAdmin: async () => false,
      isAuthenticated: async () => true,
    }) as any;
    const admin = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:admin" }),
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    }) as any;
    const ctx = context(backend) as never;
    const installation = await admin.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    for (let index = 0; index < 5; index += 1) {
      await expect(
        client.participation.createPost(ctx, {
          boardId: installation.boards[0].id,
          title: `Post ${index}`,
          body: "Allowed",
        }),
      ).resolves.toMatchObject({ title: `Post ${index}` });
    }
    await expect(
      client.participation.createPost(ctx, {
        boardId: installation.boards[0].id,
        title: "Denied",
        body: "Too many",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        contractVersion: 1,
        code: "RATE_LIMITED",
        operation: "create_post",
        retryAfterMs: expect.any(Number),
      },
    });
  });

  test("commits one charge for a semantic failure and does not double-charge a denial", async () => {
    const backend = convexTest(schema, modules);
    const client = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:invalid-author" }),
      authorizeAdmin: async () => false,
      isAuthenticated: async () => true,
    }) as any;
    const admin = createAfferentClient(api as unknown as ComponentApi, {
      resolveActor: async () => ({ externalKey: "fixture:admin" }),
      authorizeAdmin: async () => true,
      isAuthenticated: async () => true,
    }) as any;
    const ctx = context(backend) as never;
    const installation = await admin.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    for (let index = 0; index < 5; index += 1) {
      await expect(
        client.participation.createPost(ctx, {
          boardId: installation.boards[0].id,
          title: " ",
          body: "Invalid but chargeable",
        }),
      ).resolves.toMatchObject({ ok: false, error: { code: "VALIDATION" } });
    }
    const firstDenial = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Would be valid",
      body: "Denied",
    });
    const secondDenial = await client.participation.createPost(ctx, {
      boardId: installation.boards[0].id,
      title: "Still denied",
      body: "No double charge",
    });
    expect(firstDenial).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMITED" },
    });
    expect(secondDenial).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMITED" },
    });
    expect(secondDenial.error.retryAfterMs).toBeLessThanOrEqual(
      firstDenial.error.retryAfterMs,
    );
  });
});
