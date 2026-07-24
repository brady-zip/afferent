import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api, components } from "../../src/component/_generated/api.js";
import schema from "../../src/component/schema.js";
import { withRateLimiter } from "../helpers/rate-limiter.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

describe("sandbox maintenance intents", () => {
  test("returns a bounded aggregate across the complete scoped schema", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const scopeId = "maintenance-scope";
    const installation = await backend.mutation(
      api.admin.installation.configureInstallation,
      {
        scopeId,
        readPolicy: "public",
        boards: [{ slug: "feedback", name: "Feedback" }],
      },
    );
    await backend.mutation(api.participation.posts.createPost, {
      scopeId,
      actor: { externalKey: "fixture:maintenance-author" },
      boardId: installation.boards[0].id,
      title: "Bound every table",
      body: "Usage is derived through scope-leading indexes.",
    });

    const usage = await backend.query(
      api.maintenance.sandbox.getScopedUsage,
      { scopeId },
    );

    expect(usage).toMatchObject({
      contractVersion: 1,
      complete: true,
      scannedTableCount: 26,
      roots: {
        boards: 1,
        posts: 1,
        comments: 0,
        changelogEntries: 0,
      },
    });
    expect(usage.documentCount).toBeGreaterThanOrEqual(6);
    expect(usage.semanticBytes).toBeGreaterThan(0);
    expect(JSON.stringify(usage)).not.toContain(scopeId);
  });

  test("caps oversized usage snapshots instead of issuing an unbounded scan", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    await backend.run(async (ctx) => {
      for (let index = 0; index < 5; index += 1) {
        await ctx.db.insert("boards", {
          scopeId: "bounded-scope",
          slug: `board-${index}`,
          name: `Board ${index}`,
          sortOrder: index,
        });
      }
    });

    await expect(
      backend.query(api.maintenance.sandbox.getScopedUsage, {
        scopeId: "bounded-scope",
        documentBudget: 3,
      }),
    ).resolves.toMatchObject({
      contractVersion: 1,
      complete: false,
      documentCount: 4,
    });
  });

  test("deletes one retired scope in bounded stages including actor limiter keys", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const firstScope = "retired-maintenance-scope";
    const secondScope = "active-maintenance-scope";
    for (const scopeId of [firstScope, secondScope]) {
      const installation = await backend.mutation(
        api.admin.installation.configureInstallation,
        {
          scopeId,
          readPolicy: "public",
          boards: [{ slug: "same-slug", name: "Same board" }],
        },
      );
      await backend.mutation(api.participation.posts.createPost, {
        scopeId,
        actor: { externalKey: "fixture:colliding-actor" },
        boardId: installation.boards[0].id,
        title: "Same title",
        body: "Same body",
      });
    }
    const firstActorId = await backend.run(async (ctx) => {
      const actor = await ctx.db
        .query("actors")
        .withIndex("by_scope_external_key", (query) =>
          query
            .eq("scopeId", firstScope)
            .eq("externalKey", "fixture:colliding-actor"),
        )
        .unique();
      if (actor === null) throw new Error("missing actor fixture");
      return String(actor._id);
    });
    const actorLimitBefore = await backend.query(
      components.rateLimiter.lib.getValue,
      {
        name: "createPostActor",
        key: `${firstScope}:${firstActorId}`,
        config: { kind: "fixed window", rate: 5, period: 3_600_000 },
      },
    );
    expect(actorLimitBefore.value).toBe(4);
    const secondBefore = await backend.query(
      api.maintenance.sandbox.getScopedUsage,
      { scopeId: secondScope },
    );

    let continuation:
      | { stage: number; cursor?: string }
      | undefined = undefined;
    let done = false;
    let calls = 0;
    while (!done && calls < 100) {
      const result = await backend.mutation(
        api.maintenance.sandbox.cleanupScopeBatch,
        {
          scopeId: firstScope,
          continuation,
          documentBudget: 2,
        },
      );
      done = result.done;
      continuation = result.continuation;
      calls += 1;
    }

    expect(done).toBe(true);
    expect(calls).toBeGreaterThan(2);
    await expect(
      backend.query(api.maintenance.sandbox.getScopedUsage, {
        scopeId: firstScope,
      }),
    ).resolves.toMatchObject({ documentCount: 0, complete: true });
    await expect(
      backend.query(api.maintenance.sandbox.getScopedUsage, {
        scopeId: secondScope,
      }),
    ).resolves.toEqual(secondBefore);
    await expect(
      backend.query(components.rateLimiter.lib.getValue, {
        name: "createPostActor",
        key: `${firstScope}:${firstActorId}`,
        config: { kind: "fixed window", rate: 5, period: 3_600_000 },
      }),
    ).resolves.toMatchObject({ value: 5 });
    await expect(
      backend.mutation(api.maintenance.sandbox.cleanupScopeBatch, {
        scopeId: firstScope,
        continuation,
        documentBudget: 2,
      }),
    ).resolves.toMatchObject({ done: true, deleted: 0 });
  });
});
