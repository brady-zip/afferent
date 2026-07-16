import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { internal } from "../../src/component/_generated/api.js";
import { FANOUT_BATCH_SIZE } from "../../src/component/model/notifications.js";
import schema from "../../src/component/schema.js";
import { withRateLimiter } from "../helpers/rate-limiter.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

describe("notification fanout continuation", () => {
  test("resumes one 50-row chain without duplicate recipient rows", async () => {
    vi.useFakeTimers();
    const backend = withRateLimiter(convexTest(schema, modules));
    const seeded = await backend.run(async (ctx) => {
      const initiatorActorId = await ctx.db.insert("actors", {
        scopeId: "scope:fanout",
        externalKey: "fanout:init",
      });
      const boardId = await ctx.db.insert("boards", {
        scopeId: "scope:fanout",
        slug: "feedback",
        name: "Feedback",
        sortOrder: 0,
      });
      const postId = await ctx.db.insert("posts", {
        scopeId: "scope:fanout",
        boardId,
        actorId: initiatorActorId,
        title: "Fanout",
        body: "Resume safely",
        searchText: "Fanout Resume safely",
        lifecycleState: "active",
        statusKey: "open",
        voteCount: 0,
        commentCount: 0,
        createdAt: 1,
        currentStatusSince: 1,
        trendingScore: 1,
        orderId: "post:1",
        visibilityKey: "visible",
      });
      for (let index = 0; index < FANOUT_BATCH_SIZE + 1; index += 1) {
        const actorId = await ctx.db.insert("actors", {
          scopeId: "scope:fanout",
          externalKey: `fanout:${index}`,
        });
        await ctx.db.insert("postSubscriptions", {
          scopeId: "scope:fanout",
          postId,
          actorId,
          state: "subscribed",
          updatedAt: index,
        });
      }
      return { initiatorActorId, postId };
    });

    const captured = await backend.mutation(internal.notifications.events.captureTestEvent, {
      scopeId: "scope:fanout",
      initiatorActorId: String(seeded.initiatorActorId),
      postId: String(seeded.postId),
      type: "status_changed",
    });
    await backend.mutation(internal.jobs.fanout.continueFanout, {
      jobId: captured.jobId,
    });
    await backend.mutation(internal.jobs.fanout.continueFanout, {
      jobId: captured.jobId,
    });
    await backend.finishAllScheduledFunctions(() => vi.runAllTimers());

    const state = await backend.run(async (ctx) => {
      const inbox = await ctx.db
        .query("notificationInbox")
        .withIndex("by_scope_event_actor", (q) =>
          q.eq("scopeId", "scope:fanout").eq("eventId", captured.eventId),
        )
        .collect();
      const jobs = await ctx.db
        .query("notificationFanoutJobs")
        .withIndex("by_scope_event", (q) =>
          q.eq("scopeId", "scope:fanout").eq("eventId", captured.eventId),
        )
        .collect();
      return { inbox, jobs };
    });
    expect(state.inbox).toHaveLength(FANOUT_BATCH_SIZE + 1);
    expect(new Set(state.inbox.map((row) => String(row.actorId))).size).toBe(
      FANOUT_BATCH_SIZE + 1,
    );
    expect(state.jobs).toHaveLength(1);
    expect(state.jobs[0].state).toBe("complete");
    vi.useRealTimers();
  });
});
