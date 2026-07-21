import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { createScopedAfferentClient } from "../../src/client/server.js";
import { api, internal } from "../../src/component/_generated/api.js";
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
  test("projects every event kind to a versioned accessible navigation target", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const admin = client("scope:targets", "targets:admin", true);
    const install = await admin.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await admin.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Keyboard navigation",
      body: "Make notifications actionable",
    });

    await backend.run(async (runCtx) => {
      const postId = runCtx.db.normalizeId("posts", post.id)!;
      const actor = await runCtx.db
        .query("actors")
        .withIndex("by_scope_external_key", (q) =>
          q
            .eq("scopeId", "scope:targets")
            .eq("externalKey", "targets:admin"),
        )
        .unique();
      const commentId = await runCtx.db.insert("comments", {
        scopeId: "scope:targets",
        postId,
        actorId: actor!._id,
        body: "A navigable reply",
      });
      const entryId = await runCtx.db.insert("changelogEntries", {
        scopeId: "scope:targets",
        title: "Accessible inbox",
        body: "Notification destinations are ready.",
        slug: "accessible-inbox",
        publishedKey: "published",
        createdAt: 1,
        updatedAt: 1,
        firstPublishedAt: 1,
        publishedAt: 1,
        orderId: "entry:targets",
      });
      const sources = [
        ["status_changed", String(postId)],
        ["admin_replied", String(commentId)],
        ["comment_replied", String(commentId)],
        ["mentioned", String(commentId)],
        ["changelog_published", String(entryId)],
      ] as const;
      for (const [index, [type, entityId]] of sources.entries()) {
        const eventId = await runCtx.db.insert("notificationEvents", {
          scopeId: "scope:targets",
          type,
          initiatorActorId: actor!._id,
          postId,
          entityId,
          occurredAt: index + 1,
          guardKey: `target:${type}`,
        });
        await runCtx.db.insert("notificationInbox", {
          scopeId: "scope:targets",
          actorId: actor!._id,
          eventId,
          type,
          entityId,
          occurredAt: index + 1,
          orderId: `target:${index}`,
          unreadKey: "unread",
        });
      }
    });

    const inbox = await backend.query(api.notifications.inbox.listNotifications, {
      scopeId: "scope:targets",
      actor: { externalKey: "targets:admin" },
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(inbox.contractVersion).toBe(2);
    const byType = Object.fromEntries(
      inbox.page.map((row: any) => [row.type, row]),
    );
    expect(byType.status_changed.target).toEqual({
      contractVersion: 1,
      kind: "post",
      postId: post.id,
      label: "View feedback: Keyboard navigation",
    });
    for (const type of ["admin_replied", "comment_replied", "mentioned"]) {
      expect(byType[type].target).toMatchObject({
        contractVersion: 1,
        kind: "post",
        postId: post.id,
        label: "View comment on feedback: Keyboard navigation",
      });
      expect(byType[type].target.commentId).toEqual(expect.any(String));
    }
    expect(byType.changelog_published.target).toEqual({
      contractVersion: 1,
      kind: "changelog",
      slug: "accessible-inbox",
      label: "View changelog: Accessible inbox",
    });
    for (const row of inbox.page) expect(row).not.toHaveProperty("entityId");
  });

  test("degrades a legacy-invalid comment anchor to its validated post target", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const admin = client("scope:legacy-target", "legacy:admin", true);
    const install = await admin.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await admin.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Canonical destination",
      body: "Keep the post link",
    });
    await backend.run(async (runCtx) => {
      const postId = runCtx.db.normalizeId("posts", post.id)!;
      const actor = await runCtx.db
        .query("actors")
        .withIndex("by_scope_external_key", (q) =>
          q
            .eq("scopeId", "scope:legacy-target")
            .eq("externalKey", "legacy:admin"),
        )
        .unique();
      const eventId = await runCtx.db.insert("notificationEvents", {
        scopeId: "scope:legacy-target",
        type: "mentioned",
        initiatorActorId: actor!._id,
        postId,
        entityId: "legacy-clobbered-comment-id",
        occurredAt: 1,
        guardKey: "legacy:mentioned",
      });
      await runCtx.db.insert("notificationInbox", {
        scopeId: "scope:legacy-target",
        actorId: actor!._id,
        eventId,
        type: "mentioned",
        entityId: "legacy-clobbered-comment-id",
        occurredAt: 1,
        orderId: "legacy:mentioned",
        unreadKey: "unread",
      });
    });
    const inbox = await backend.query(api.notifications.inbox.listNotifications, {
      scopeId: "scope:legacy-target",
      actor: { externalKey: "legacy:admin" },
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(inbox.page[0].target).toEqual({
      contractVersion: 1,
      kind: "post",
      postId: post.id,
      label: "View feedback: Canonical destination",
    });
    expect(inbox.page[0].target).not.toHaveProperty("commentId");
  });

  test("rejects a cross-scope required post without leaking its destination", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const alpha = client("scope:post-alpha", "post-alpha:admin", true);
    const beta = client("scope:post-beta", "post-beta:admin", true);
    await alpha.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const betaInstall = await beta.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const foreignPost = await beta.participation.createPost(ctx, {
      boardId: betaInstall.boards[0].id,
      title: "Foreign post title must stay private",
      body: "Foreign post body must stay private",
    });
    await backend.run(async (runCtx) => {
      const existingActor = await runCtx.db
        .query("actors")
        .withIndex("by_scope_external_key", (q) =>
          q
            .eq("scopeId", "scope:post-alpha")
            .eq("externalKey", "post-alpha:admin"),
        )
        .unique();
      const actorId = existingActor?._id ?? await runCtx.db.insert("actors", {
        scopeId: "scope:post-alpha",
        externalKey: "post-alpha:admin",
      });
      const foreignPostId = runCtx.db.normalizeId("posts", foreignPost.id)!;
      const eventId = await runCtx.db.insert("notificationEvents", {
        scopeId: "scope:post-alpha",
        type: "status_changed",
        initiatorActorId: actorId,
        postId: foreignPostId,
        entityId: String(foreignPostId),
        occurredAt: 1,
        guardKey: "cross-scope:post",
      });
      await runCtx.db.insert("notificationInbox", {
        scopeId: "scope:post-alpha",
        actorId,
        eventId,
        type: "status_changed",
        entityId: String(foreignPostId),
        occurredAt: 1,
        orderId: "cross-scope:post",
        unreadKey: "unread",
      });
    });

    let rejection: unknown;
    try {
      await backend.query(api.notifications.inbox.listNotifications, {
        scopeId: "scope:post-alpha",
        actor: { externalKey: "post-alpha:admin" },
        paginationOpts: { numItems: 20, cursor: null },
      });
    } catch (error) {
      rejection = error;
    }
    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toBe(
      "NOTIFICATION_TARGET_POST_INVARIANT",
    );
    const serialized = `${String(rejection)} ${JSON.stringify(rejection)}`;
    expect(serialized).not.toContain(foreignPost.id);
    expect(serialized).not.toContain("Foreign post title must stay private");
    expect(serialized).not.toContain("target");
  });

  test("rejects a cross-scope required changelog without leaking its destination", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const admin = client("scope:changelog-alpha", "changelog-alpha:admin", true);
    const install = await admin.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const post = await admin.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Validated event post",
      body: "Required post remains in scope",
    });
    const foreign = await backend.run(async (runCtx) => {
      const postId = runCtx.db.normalizeId("posts", post.id)!;
      const actor = await runCtx.db
        .query("actors")
        .withIndex("by_scope_external_key", (q) =>
          q
            .eq("scopeId", "scope:changelog-alpha")
            .eq("externalKey", "changelog-alpha:admin"),
        )
        .unique();
      const entryId = await runCtx.db.insert("changelogEntries", {
        scopeId: "scope:changelog-beta",
        title: "Foreign changelog title must stay private",
        body: "Foreign changelog body must stay private",
        slug: "foreign-changelog-slug-must-stay-private",
        publishedKey: "published",
        createdAt: 1,
        updatedAt: 1,
        firstPublishedAt: 1,
        publishedAt: 1,
        orderId: "cross-scope:changelog",
      });
      const eventId = await runCtx.db.insert("notificationEvents", {
        scopeId: "scope:changelog-alpha",
        type: "changelog_published",
        initiatorActorId: actor!._id,
        postId,
        entityId: String(entryId),
        occurredAt: 1,
        guardKey: "cross-scope:changelog",
      });
      await runCtx.db.insert("notificationInbox", {
        scopeId: "scope:changelog-alpha",
        actorId: actor!._id,
        eventId,
        type: "changelog_published",
        entityId: String(entryId),
        occurredAt: 1,
        orderId: "cross-scope:changelog",
        unreadKey: "unread",
      });
      return String(entryId);
    });

    let rejection: unknown;
    try {
      await backend.query(api.notifications.inbox.listNotifications, {
        scopeId: "scope:changelog-alpha",
        actor: { externalKey: "changelog-alpha:admin" },
        paginationOpts: { numItems: 20, cursor: null },
      });
    } catch (error) {
      rejection = error;
    }
    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toBe(
      "NOTIFICATION_TARGET_CHANGELOG_INVARIANT",
    );
    const serialized = `${String(rejection)} ${JSON.stringify(rejection)}`;
    expect(serialized).not.toContain(foreign);
    expect(serialized).not.toContain("foreign-changelog-slug-must-stay-private");
    expect(serialized).not.toContain("Foreign changelog title must stay private");
    expect(serialized).not.toContain("target");
  });

  test("degrades cross-scope and wrong-post comments to the event post only", async () => {
    const backend = withRateLimiter(convexTest(schema, modules));
    const ctx = context(backend) as never;
    const admin = client("scope:comment-alpha", "comment-alpha:admin", true);
    const install = await admin.admin.configureInstallation(ctx, {
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Feedback" }],
    });
    const eventPost = await admin.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Safe event destination",
      body: "This is the only destination that may be exposed",
    });
    const wrongPost = await admin.participation.createPost(ctx, {
      boardId: install.boards[0].id,
      title: "Wrong related post must stay private",
      body: "Same-scope but not the event post",
    });
    const invalidIds = await backend.run(async (runCtx) => {
      const eventPostId = runCtx.db.normalizeId("posts", eventPost.id)!;
      const wrongPostId = runCtx.db.normalizeId("posts", wrongPost.id)!;
      const actor = await runCtx.db
        .query("actors")
        .withIndex("by_scope_external_key", (q) =>
          q
            .eq("scopeId", "scope:comment-alpha")
            .eq("externalKey", "comment-alpha:admin"),
        )
        .unique();
      const foreignActorId = await runCtx.db.insert("actors", {
        scopeId: "scope:comment-beta",
        externalKey: "comment-beta:author",
      });
      const foreignBoardId = await runCtx.db.insert("boards", {
        scopeId: "scope:comment-beta",
        slug: "feedback",
        name: "Foreign Feedback",
        sortOrder: 0,
      });
      const foreignPostId = await runCtx.db.insert("posts", {
        scopeId: "scope:comment-beta",
        boardId: foreignBoardId,
        actorId: foreignActorId,
        title: "Foreign comment post must stay private",
        body: "Foreign comment relation",
        lifecycleState: "active",
        statusKey: "open",
        voteCount: 0,
        commentCount: 1,
      });
      const foreignCommentId = await runCtx.db.insert("comments", {
        scopeId: "scope:comment-beta",
        postId: foreignPostId,
        actorId: foreignActorId,
        body: "Foreign comment body must stay private",
      });
      const wrongPostCommentId = await runCtx.db.insert("comments", {
        scopeId: "scope:comment-alpha",
        postId: wrongPostId,
        actorId: actor!._id,
        body: "Wrong-post comment body must stay private",
      });
      for (const [index, [type, entityId]] of [
        ["comment_replied", String(foreignCommentId)],
        ["mentioned", String(wrongPostCommentId)],
      ].entries()) {
        const eventId = await runCtx.db.insert("notificationEvents", {
          scopeId: "scope:comment-alpha",
          type: type as "comment_replied" | "mentioned",
          initiatorActorId: actor!._id,
          postId: eventPostId,
          entityId,
          occurredAt: index + 1,
          guardKey: `invalid-comment:${type}`,
        });
        await runCtx.db.insert("notificationInbox", {
          scopeId: "scope:comment-alpha",
          actorId: actor!._id,
          eventId,
          type: type as "comment_replied" | "mentioned",
          entityId,
          occurredAt: index + 1,
          orderId: `invalid-comment:${index}`,
          unreadKey: "unread",
        });
      }
      return [String(foreignCommentId), String(wrongPostCommentId)];
    });

    const inbox = await backend.query(api.notifications.inbox.listNotifications, {
      scopeId: "scope:comment-alpha",
      actor: { externalKey: "comment-alpha:admin" },
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(inbox.page).toHaveLength(2);
    for (const notification of inbox.page) {
      expect(notification.target).toEqual({
        contractVersion: 1,
        kind: "post",
        postId: eventPost.id,
        label: "View feedback: Safe event destination",
      });
      expect(notification.target).not.toHaveProperty("commentId");
    }
    const serialized = JSON.stringify(inbox);
    for (const invalidId of invalidIds) expect(serialized).not.toContain(invalidId);
    expect(serialized).not.toContain("Wrong related post must stay private");
    expect(serialized).not.toContain("Foreign comment post must stay private");
  });

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
      await backend.query(api.participation.subscriptions.getPostSubscription, {
        scopeId: "scope:alpha",
        actor: { externalKey: "alpha:author" },
        postId: post.id,
      }),
    ).toMatchObject({ subscribed: true, explicitOptOut: false });
    await backend.mutation(api.participation.subscriptions.setSubscription, {
      scopeId: "scope:alpha",
      actor: { externalKey: "alpha:participant" },
      postId: post.id,
      desired: false,
    });
    await participant.participation.addComment(ctx, {
      postId: post.id,
      body: "I remain opted out",
    });
    expect(
      await backend.query(api.participation.subscriptions.getPostSubscription, {
        scopeId: "scope:alpha",
        actor: { externalKey: "alpha:participant" },
        postId: post.id,
      }),
    ).toMatchObject({ subscribed: false, explicitOptOut: true });
    await participant.participation.setVote(ctx, {
      postId: post.id,
      desired: true,
    });
    expect(
      await backend.query(api.participation.subscriptions.getPostSubscription, {
        scopeId: "scope:alpha",
        actor: { externalKey: "alpha:participant" },
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
    await backend.mutation(api.participation.subscriptions.setSubscription, {
      scopeId: "scope:alpha",
      actor: { externalKey: "alpha:recipient" },
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

    const inbox = await backend.query(api.notifications.inbox.listNotifications, {
      scopeId: "scope:alpha",
      actor: { externalKey: "alpha:recipient" },
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(inbox.page.map((row: any) => row.type).sort()).toEqual([
      "comment_replied",
      "status_changed",
    ]);
    expect(new Set(inbox.page.map((row: any) => row.eventId)).size).toBe(2);
    expect(
      await backend.query(api.notifications.inbox.listNotifications, {
        scopeId: "scope:beta",
        actor: { externalKey: "beta:actor" },
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
      const boardId = await ctx.db.insert("boards", {
        scopeId: "scope:trim",
        slug: "feedback",
        name: "Feedback",
        sortOrder: 0,
      });
      const postId = await ctx.db.insert("posts", {
        scopeId: "scope:trim",
        boardId,
        actorId,
        title: "Retention target",
        body: "One valid destination for retained rows",
        lifecycleState: "active",
        statusKey: "open",
        voteCount: 0,
        commentCount: 0,
      });
      for (let index = 0; index < 501; index += 1) {
        const eventId = await ctx.db.insert("notificationEvents", {
          scopeId: "scope:trim",
          type: "status_changed",
          initiatorActorId: actorId,
          postId,
          entityId: String(postId),
          occurredAt: index,
          guardKey: `event:${index}`,
        });
        await ctx.db.insert("notificationInbox", {
          scopeId: "scope:trim",
          actorId,
          eventId,
          type: "status_changed",
          entityId: String(postId),
          occurredAt: index,
          orderId: `row:${index}`,
          unreadKey: "unread",
        });
      }
      return actorId;
    });

    await backend.mutation(internal.notifications.inbox.enforceInboxRetention, {
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
