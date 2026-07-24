import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../../src/component/_generated/api.js";
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
});
