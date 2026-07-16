import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";

import { api, internal } from "../../src/component/_generated/api.js";
import {
  TAG_CLEANUP_BATCH_SIZE,
  nextTagCleanupState,
} from "../../src/component/jobs/tag_cleanup.js";
import schema from "../../src/component/schema.js";
import { withRateLimiter } from "../helpers/rate-limiter.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

afterEach(() => vi.useRealTimers());

describe("tag cleanup continuation contract", () => {
  test("advances in fixed 50-row batches and only finalizes after every projection is gone", async () => {
    expect(TAG_CLEANUP_BATCH_SIZE).toBe(50);
    expect(
      nextTagCleanupState({ memberships: 51, feeds: 51, searches: 51 }),
    ).toEqual({ done: false, scheduleNext: true });
    expect(
      nextTagCleanupState({ memberships: 0, feeds: 0, searches: 0 }),
    ).toEqual({ done: true, scheduleNext: false });

    vi.useFakeTimers();
    const backend = withRateLimiter(convexTest(schema, modules));
    const seeded = await backend.run(async (ctx) => {
      const alphaActorId = await ctx.db.insert("actors", {
        scopeId: "scope:alpha",
        externalKey: "fixture:tag-admin",
      });
      const betaActorId = await ctx.db.insert("actors", {
        scopeId: "scope:beta",
        externalKey: "fixture:beta-admin",
      });
      const alphaBoardId = await ctx.db.insert("boards", {
        scopeId: "scope:alpha",
        slug: "feedback",
        name: "Feedback",
        sortOrder: 0,
      });
      const betaBoardId = await ctx.db.insert("boards", {
        scopeId: "scope:beta",
        slug: "feedback",
        name: "Feedback",
        sortOrder: 0,
      });
      const alphaTagId = await ctx.db.insert("tags", {
        scopeId: "scope:alpha",
        name: "Platform",
        normalizedName: "platform",
        state: "active",
      });
      const betaTagId = await ctx.db.insert("tags", {
        scopeId: "scope:beta",
        name: "Platform",
        normalizedName: "platform",
        state: "active",
      });
      for (let index = 0; index < 51; index += 1) {
        const postId = await ctx.db.insert("posts", {
          scopeId: "scope:alpha",
          boardId: alphaBoardId,
          actorId: alphaActorId,
          title: `Alpha ${index}`,
          body: "Cleanup",
          searchText: `Alpha ${index} Cleanup`,
          lifecycleState: "active",
          statusKey: "open",
          voteCount: 0,
          commentCount: 0,
          createdAt: index,
          currentStatusSince: index,
          trendingScore: index,
          orderId: `alpha:${index}`,
          visibilityKey: "visible",
        });
        await ctx.db.insert("postTags", {
          scopeId: "scope:alpha",
          postId,
          tagId: alphaTagId,
        });
        await ctx.db.insert("postTagFeeds", {
          scopeId: "scope:alpha",
          postId,
          tagId: alphaTagId,
          boardId: alphaBoardId,
          statusKey: "open",
          visibilityKey: "visible",
          createdAt: index,
          voteCount: 0,
          trendingScore: index,
          orderId: `alpha:${index}`,
        });
        await ctx.db.insert("postTagSearches", {
          scopeId: "scope:alpha",
          postId,
          tagId: alphaTagId,
          boardId: alphaBoardId,
          statusKey: "open",
          visibilityKey: "visible",
          searchText: `Alpha ${index} Cleanup`,
        });
      }
      const betaPostId = await ctx.db.insert("posts", {
        scopeId: "scope:beta",
        boardId: betaBoardId,
        actorId: betaActorId,
        title: "Beta",
        body: "Must survive",
        searchText: "Beta Must survive",
        lifecycleState: "active",
        statusKey: "open",
        voteCount: 0,
        commentCount: 0,
        createdAt: 1,
        currentStatusSince: 1,
        trendingScore: 1,
        orderId: "beta:1",
        visibilityKey: "visible",
      });
      await ctx.db.insert("postTags", {
        scopeId: "scope:beta",
        postId: betaPostId,
        tagId: betaTagId,
      });
      await ctx.db.insert("postTagFeeds", {
        scopeId: "scope:beta",
        postId: betaPostId,
        tagId: betaTagId,
        boardId: betaBoardId,
        statusKey: "open",
        visibilityKey: "visible",
        createdAt: 1,
        voteCount: 0,
        trendingScore: 1,
        orderId: "beta:1",
      });
      await ctx.db.insert("postTagSearches", {
        scopeId: "scope:beta",
        postId: betaPostId,
        tagId: betaTagId,
        boardId: betaBoardId,
        statusKey: "open",
        visibilityKey: "visible",
        searchText: "Beta Must survive",
      });
      return { alphaTagId, betaTagId };
    });

    const started = await backend.mutation(api.admin.tags.deleteTag, {
      scopeId: "scope:alpha",
      actor: { externalKey: "fixture:tag-admin" },
      tagId: String(seeded.alphaTagId),
    });
    expect(started.status).toBe("pending");
    expect(
      await backend.query(api.admin.tags.listTags, { scopeId: "scope:alpha" }),
    ).toEqual({ contractVersion: 1, tags: [] });

    const jobId = await backend.run(async (ctx) => {
      const job = await ctx.db
        .query("tagCleanupJobs")
        .withIndex("by_scope_tag", (query) =>
          query.eq("scopeId", "scope:alpha").eq("tagId", seeded.alphaTagId),
        )
        .unique();
      return job!._id;
    });

    async function resume() {
      await backend.mutation(internal.jobs.tag_cleanup.continueTagCleanup, {
        jobId: String(jobId),
      });
      return await backend.run(async (ctx) => {
        const memberships = await ctx.db
          .query("postTags")
          .withIndex("by_scope_tag_post", (q) =>
            q.eq("scopeId", "scope:alpha").eq("tagId", seeded.alphaTagId),
          )
          .collect();
        const feeds = await ctx.db
          .query("postTagFeeds")
          .withIndex("by_scope_tag_post", (q) =>
            q.eq("scopeId", "scope:alpha").eq("tagId", seeded.alphaTagId),
          )
          .collect();
        const searches = await ctx.db
          .query("postTagSearches")
          .withIndex("by_scope_tag_post", (q) =>
            q.eq("scopeId", "scope:alpha").eq("tagId", seeded.alphaTagId),
          )
          .collect();
        return {
          memberships: memberships.length,
          feeds: feeds.length,
          searches: searches.length,
        };
      });
    }

    expect(await resume()).toEqual({ memberships: 1, feeds: 51, searches: 51 });
    expect(await resume()).toEqual({ memberships: 0, feeds: 51, searches: 51 });
    expect(await resume()).toEqual({ memberships: 0, feeds: 1, searches: 51 });
    expect(await resume()).toEqual({ memberships: 0, feeds: 0, searches: 51 });
    expect(await resume()).toEqual({ memberships: 0, feeds: 0, searches: 1 });
    expect(await resume()).toEqual({ memberships: 0, feeds: 0, searches: 0 });
    expect(await resume()).toEqual({ memberships: 0, feeds: 0, searches: 0 });

    await backend.finishAllScheduledFunctions(() => vi.runAllTimers());
    const finalState = await backend.run(async (ctx) => {
      const [alphaTag, betaTag, betaMemberships, activity] = await Promise.all([
        ctx.db.get(seeded.alphaTagId),
        ctx.db.get(seeded.betaTagId),
        ctx.db
          .query("postTags")
          .withIndex("by_scope_tag_post", (q) =>
            q.eq("scopeId", "scope:beta").eq("tagId", seeded.betaTagId),
          )
          .collect(),
        ctx.db
          .query("postActivity")
          .withIndex("by_scope_post_occurred", (q) =>
            q.eq("scopeId", "scope:alpha"),
          )
          .collect(),
      ]);
      return {
        alphaTag,
        betaTag,
        betaMemberships: betaMemberships.length,
        activity: activity.filter((entry) => entry.type === "tag_remove")
          .length,
      };
    });
    expect(finalState.alphaTag?.state).toBe("deleted");
    expect(finalState.betaTag?.state).toBe("active");
    expect(finalState.betaMemberships).toBe(1);
    expect(finalState.activity).toBe(51);
    await expect(
      backend.mutation(api.admin.tags.deleteTag, {
        scopeId: "scope:alpha",
        actor: { externalKey: "fixture:tag-admin" },
        tagId: String(seeded.alphaTagId),
      }),
    ).resolves.toMatchObject({ status: "deleted" });
  });
});
