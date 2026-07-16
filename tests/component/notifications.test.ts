import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { createScopedAfferentClient } from "../../src/client/server.js";
import { api } from "../../src/component/_generated/api.js";
import type { ComponentApi } from "../../src/component/_generated/component.js";
import schema from "../../src/component/schema.js";
import { withRateLimiter } from "../helpers/rate-limiter.js";

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

function client(scopeId: string, actorKey: string, admin = false) {
  return createScopedAfferentClient(api as unknown as ComponentApi, {
    resolveScope: async () => scopeId,
    resolveActor: async () => ({
      externalKey: actorKey,
      displayName: actorKey,
    }),
    authorizeAdmin: async () => admin,
    isAuthenticated: async () => true,
  }) as any;
}

describe("subscription and notification invariants", () => {
  test("preserves durable opt-out and does not subscribe voters", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const admin = client("scope:alpha", "alpha:admin", true);
    const author = client("scope:alpha", "alpha:author");
    const participant = client("scope:alpha", "alpha:participant");
    const install = await admin.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await author.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Notifications",
      body: "Notify interested actors",
    });

    expect(
      await author.notifications.getPostSubscription(ctx, { postId: post.id }),
    ).toMatchObject({ subscribed: true, explicitOptOut: false });
    await participant.notifications.setPostSubscription(ctx, {
      postId: post.id,
      desired: false,
    });
    await participant.participation.addComment(ctx, {
      postId: post.id,
      body: "I remain opted out",
    });
    expect(
      await participant.notifications.getPostSubscription(ctx, {
        postId: post.id,
      }),
    ).toMatchObject({ subscribed: false, explicitOptOut: true });
    await participant.participation.setVote(ctx, {
      postId: post.id,
      desired: true,
    });
    expect(
      await participant.notifications.getPostSubscription(ctx, {
        postId: post.id,
      }),
    ).toMatchObject({ subscribed: false, explicitOptOut: true });
  });

  test("captures only the fixed event taxonomy with recipient dedupe", async () => {
    vi.useFakeTimers();
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const admin = client("scope:alpha", "alpha:admin", true);
    const author = client("scope:alpha", "alpha:author");
    const recipient = client("scope:alpha", "alpha:recipient");
    const beta = client("scope:beta", "beta:actor", true);
    const install = await admin.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    await beta.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await author.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Event taxonomy",
      body: "Exactly five event kinds",
    });
    await recipient.notifications.setPostSubscription(ctx, {
      postId: post.id,
      desired: true,
    });

    await admin.admin.setPostStatus(ctx, {
      postId: post.id,
      status: "planned",
    });
    const root = await recipient.participation.addComment(ctx, {
      postId: post.id,
      body: "Parent",
    });
    await author.participation.addComment(ctx, {
      postId: post.id,
      parentCommentId: root.id,
      body: `Reply with @[{${root.author.id}}]`,
    });
    await recipient.participation.addComment(ctx, {
      postId: post.id,
      body: "Ordinary comments do not broadcast",
    });
    await backend.finishAllScheduledFunctions(() => vi.runAllTimers());

    const inbox = await recipient.notifications.listNotifications(ctx, {
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(inbox.page.map((row: any) => row.type).sort()).toEqual([
      "comment_replied",
      "status_changed",
    ]);
    expect(new Set(inbox.page.map((row: any) => row.eventId)).size).toBe(2);
    expect(
      await beta.notifications.listNotifications(ctx, {
        paginationOpts: { numItems: 20, cursor: null },
      }),
    ).toMatchObject({ page: [] });
    vi.useRealTimers();
  });

  test("keeps exact unread counts idempotent and trims the oldest row at 501", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const seeded = await backend.run(async (ctx) => {
      const actorId = await ctx.db.insert("actors", {
        scopeId: "scope:trim",
        externalKey: "trim:actor",
      });
      for (let index = 0; index < 501; index += 1) {
        const eventId = await ctx.db.insert("notificationEvents", {
          scopeId: "scope:trim",
          type: "status_changed",
          initiatorActorId: actorId,
          entityId: `post:${index}`,
          occurredAt: index,
          guardKey: `event:${index}`,
        });
        await ctx.db.insert("notificationInbox", {
          scopeId: "scope:trim",
          actorId,
          eventId,
          type: "status_changed",
          entityId: `post:${index}`,
          occurredAt: index,
          orderId: `row:${index}`,
          unreadKey: "unread",
        });
      }
      return actorId;
    });

    await backend.mutation(api.notifications.inbox.enforceInboxRetention, {
      scopeId: "scope:trim",
      actorId: String(seeded),
    });
    const rows = await backend.run(async (ctx) =>
      ctx.db
        .query("notificationInbox")
        .withIndex("by_scope_actor_time", (q) =>
          q.eq("scopeId", "scope:trim").eq("actorId", seeded),
        )
        .collect(),
    );
    expect(rows).toHaveLength(500);
    expect(rows.some((row) => row.occurredAt === 0)).toBe(false);
    expect(
      await backend.query(api.notifications.inbox.getUnreadCount, {
        scopeId: "scope:trim",
        actor: { externalKey: "trim:actor" },
      }),
    ).toMatchObject({ count: 500 });
    const newest = rows.sort((left, right) => right.occurredAt - left.occurredAt)[0];
    await backend.mutation(api.notifications.inbox.markNotificationRead, {
      scopeId: "scope:trim",
      actor: { externalKey: "trim:actor" },
      notificationId: String(newest._id),
    });
    await backend.mutation(api.notifications.inbox.markNotificationRead, {
      scopeId: "scope:trim",
      actor: { externalKey: "trim:actor" },
      notificationId: String(newest._id),
    });
    expect(
      await backend.query(api.notifications.inbox.getUnreadCount, {
        scopeId: "scope:trim",
        actor: { externalKey: "trim:actor" },
      }),
    ).toMatchObject({ count: 499 });
  });
});
