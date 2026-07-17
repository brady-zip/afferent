import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel.js";
import { mutation } from "../_generated/server.js";
import type { MutationCtx } from "../_generated/server.js";
import { appendPostActivity } from "../model/activity.js";
import { upsertActor } from "../model/actors.js";
import {
  allocateChangelogSlug,
  MAX_CHANGELOG_LINKS,
  listChangelogLinks,
  requireAvailableExplicitSlug,
  requireChangelogEntryInScope,
  resolveCanonicalLinkedPost,
  toAdminChangelogEntryDto,
} from "../model/changelog.js";
import { normalizePlainText, validateSafeMarkdown } from "../model/content.js";
import { conflict, invalidInput, notFound } from "../model/errors.js";
import { requirePostInScope, requireScope } from "../model/scope.js";
import { isPostPubliclyVisible } from "../model/visibility.js";
import {
  adminChangelogEntryDtoValidator,
  verifiedActorValidator,
} from "../validators.js";
import {
  captureNotificationEvent,
  listCurrentSubscriberActorIds,
} from "../notifications/events.js";
import { fenceActiveMergeWrite } from "../model/merge.js";

async function insertNotificationGuard(
  ctx: MutationCtx,
  args: {
    scopeId: string;
    entryId: Id<"changelogEntries">;
    postId: Id<"posts">;
  },
) {
  const existing = await ctx.db
    .query("changelogNotificationGuards")
    .withIndex("by_scope_entry_post", (query) =>
      query
        .eq("scopeId", args.scopeId)
        .eq("entryId", args.entryId)
        .eq("postId", args.postId),
    )
    .unique();
  if (!existing) {
    const id = await ctx.db.insert("changelogNotificationGuards", {
      ...args,
      createdAt: Date.now(),
    });
    await fenceActiveMergeWrite(ctx, {
      scopeId: args.scopeId,
      postId: args.postId,
      writes: [
        {
          kind: "notification_guard",
          originalId: String(id),
          logicalKey: String(args.entryId),
        },
      ],
    });
    return true;
  }
  return false;
}

async function captureChangelogNotification(
  ctx: MutationCtx,
  args: {
    scopeId: string;
    entryId: Id<"changelogEntries">;
    postId: Id<"posts">;
    actorId: Id<"actors">;
  },
) {
  const subscriberActorIds = await listCurrentSubscriberActorIds(
    ctx,
    args.scopeId,
    args.postId,
  );
  await captureNotificationEvent(ctx, {
    scopeId: args.scopeId,
    type: "changelog_published",
    initiatorActorId: args.actorId,
    postId: args.postId,
    entityId: String(args.entryId),
    guardKey: `changelog:${args.entryId}:${args.postId}`,
    subscriberActorIds,
  });
}

async function appendLinkedActivity(
  ctx: Parameters<typeof appendPostActivity>[0],
  args: {
    entry: Doc<"changelogEntries">;
    actorId: Id<"actors">;
    type: "changelog_publish" | "changelog_unpublish";
  },
) {
  const links = await listChangelogLinks(ctx, args.entry);
  const canonicalIds = new Set<string>();
  for (const link of links) {
    const canonical = await resolveCanonicalLinkedPost(
      ctx,
      args.entry.scopeId,
      link.postId,
    );
    if (!canonical || canonicalIds.has(String(canonical._id))) continue;
    canonicalIds.add(String(canonical._id));
    await appendPostActivity(ctx, {
      scopeId: args.entry.scopeId,
      postId: canonical._id,
      actorId: args.actorId,
      type: args.type,
      changelogEntryId: args.entry._id,
    });
  }
}

export const createChangelogDraft = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    title: v.string(),
    body: v.string(),
    slug: v.optional(v.string()),
  },
  returns: adminChangelogEntryDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    await upsertActor(ctx, args.scopeId, args.actor);
    const title = normalizePlainText(args.title, "title");
    const body = validateSafeMarkdown(args.body, "body");
    const slug =
      args.slug === undefined
        ? await allocateChangelogSlug(ctx, args.scopeId, title)
        : await requireAvailableExplicitSlug(ctx, {
            scopeId: args.scopeId,
            value: args.slug,
          });
    const now = Date.now();
    const entryId = await ctx.db.insert("changelogEntries", {
      scopeId: args.scopeId,
      title,
      body,
      slug,
      publishedKey: "hidden",
      createdAt: now,
      updatedAt: now,
      orderId: "pending",
    });
    await ctx.db.patch(entryId, { orderId: String(entryId) });
    const entry = await ctx.db.get(entryId);
    if (!entry) notFound("changelog");
    return await toAdminChangelogEntryDto(ctx, entry);
  },
});

export const editChangelog = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    entryId: v.string(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  returns: adminChangelogEntryDtoValidator,
  handler: async (ctx, args) => {
    const entry = await requireChangelogEntryInScope(
      ctx,
      args.scopeId,
      args.entryId,
    );
    await upsertActor(ctx, args.scopeId, args.actor);
    if (
      args.title === undefined &&
      args.body === undefined &&
      args.slug === undefined
    ) {
      invalidInput("at least one editable field is required");
    }
    if (
      args.slug !== undefined &&
      entry.firstPublishedAt !== undefined &&
      (await requireAvailableExplicitSlug(ctx, {
        scopeId: args.scopeId,
        value: args.slug,
        currentEntryId: entry._id,
      })) !== entry.slug
    ) {
      conflict("slug", "A changelog slug is immutable after first publish");
    }
    const title =
      args.title === undefined
        ? entry.title
        : normalizePlainText(args.title, "title");
    const body =
      args.body === undefined
        ? entry.body
        : validateSafeMarkdown(args.body, "body");
    const slug =
      args.slug === undefined
        ? entry.slug
        : await requireAvailableExplicitSlug(ctx, {
            scopeId: args.scopeId,
            value: args.slug,
            currentEntryId: entry._id,
          });
    const updatedAt = Date.now();
    await ctx.db.patch(entry._id, { title, body, slug, updatedAt });
    return await toAdminChangelogEntryDto(ctx, {
      ...entry,
      title,
      body,
      slug,
      updatedAt,
    });
  },
});

export const setChangelogLinks = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    entryId: v.string(),
    postIds: v.array(v.string()),
  },
  returns: adminChangelogEntryDtoValidator,
  handler: async (ctx, args) => {
    const entry = await requireChangelogEntryInScope(
      ctx,
      args.scopeId,
      args.entryId,
    );
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    if (args.postIds.length > MAX_CHANGELOG_LINKS) {
      invalidInput(
        `changelog entries may link at most ${MAX_CHANGELOG_LINKS} posts`,
      );
    }
    if (new Set(args.postIds).size !== args.postIds.length) {
      invalidInput("changelog links must not contain duplicates");
    }
    const posts: Doc<"posts">[] = [];
    for (const postId of args.postIds) {
      const post = await requirePostInScope(ctx, args.scopeId, postId);
      if (
        post.lifecycleState !== "active" ||
        post.mergedIntoPostId !== undefined
      ) {
        notFound("post");
      }
      if (entry.publishedAt !== undefined && !isPostPubliclyVisible(post)) {
        notFound("post");
      }
      posts.push(post);
    }
    const existing = await listChangelogLinks(ctx, entry);
    const desired = new Set(posts.map((post) => String(post._id)));
    for (const link of existing.filter(
      (candidate) => !desired.has(String(candidate.postId)),
    )) {
      await ctx.db.delete(link._id);
      await fenceActiveMergeWrite(ctx, {
        scopeId: args.scopeId,
        postId: link.postId,
        writes: [
          {
            kind: "changelog_link",
            originalId: String(link._id),
            logicalKey: String(link.entryId),
          },
        ],
      });
    }
    for (const [sortOrder, post] of posts.entries()) {
      const link = existing.find((row) => row.postId === post._id);
      if (link) {
        if (link.sortOrder !== sortOrder) {
          await ctx.db.patch(link._id, { sortOrder });
        }
      } else {
        const linkId = await ctx.db.insert("changelogPostLinks", {
          scopeId: args.scopeId,
          entryId: entry._id,
          postId: post._id,
          sortOrder,
        });
        await fenceActiveMergeWrite(ctx, {
          scopeId: args.scopeId,
          postId: post._id,
          writes: [
            {
              kind: "changelog_link",
              originalId: String(linkId),
              logicalKey: String(entry._id),
            },
          ],
        });
        if (entry.publishedAt !== undefined) {
          const inserted = await insertNotificationGuard(ctx, {
            scopeId: args.scopeId,
            entryId: entry._id,
            postId: post._id,
          });
          if (inserted) {
            await captureChangelogNotification(ctx, {
              scopeId: args.scopeId,
              entryId: entry._id,
              postId: post._id,
              actorId,
            });
          }
          await appendPostActivity(ctx, {
            scopeId: args.scopeId,
            postId: post._id,
            actorId,
            type: "changelog_publish",
            changelogEntryId: entry._id,
          });
        }
      }
    }
    const updatedAt = Date.now();
    await ctx.db.patch(entry._id, { updatedAt });
    return await toAdminChangelogEntryDto(ctx, { ...entry, updatedAt });
  },
});

export const publishChangelog = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    entryId: v.string(),
  },
  returns: adminChangelogEntryDtoValidator,
  handler: async (ctx, args) => {
    const entry = await requireChangelogEntryInScope(
      ctx,
      args.scopeId,
      args.entryId,
    );
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    if (entry.publishedAt !== undefined) {
      return await toAdminChangelogEntryDto(ctx, entry);
    }
    const links = await listChangelogLinks(ctx, entry);
    for (const link of links) {
      const post = await resolveCanonicalLinkedPost(
        ctx,
        args.scopeId,
        link.postId,
      );
      if (!post || !isPostPubliclyVisible(post)) notFound("post");
    }
    const now = Date.now();
    const firstPublishedAt = entry.firstPublishedAt ?? now;
    const updated = {
      ...entry,
      firstPublishedAt,
      publishedAt: now,
      publishedKey: "published" as const,
      updatedAt: now,
    };
    await ctx.db.patch(entry._id, {
      firstPublishedAt,
      publishedAt: now,
      publishedKey: "published",
      updatedAt: now,
    });
    for (const link of links) {
      const post = await resolveCanonicalLinkedPost(
        ctx,
        args.scopeId,
        link.postId,
      );
      if (post) {
        const inserted = await insertNotificationGuard(ctx, {
          scopeId: args.scopeId,
          entryId: entry._id,
          postId: post._id,
        });
        if (inserted) {
          await captureChangelogNotification(ctx, {
            scopeId: args.scopeId,
            entryId: entry._id,
            postId: post._id,
            actorId,
          });
        }
      }
    }
    await appendLinkedActivity(ctx, {
      entry: updated,
      actorId,
      type: "changelog_publish",
    });
    return await toAdminChangelogEntryDto(ctx, updated);
  },
});

export const unpublishChangelog = mutation({
  args: {
    scopeId: v.string(),
    actor: verifiedActorValidator,
    entryId: v.string(),
  },
  returns: adminChangelogEntryDtoValidator,
  handler: async (ctx, args) => {
    const entry = await requireChangelogEntryInScope(
      ctx,
      args.scopeId,
      args.entryId,
    );
    const actorId = await upsertActor(ctx, args.scopeId, args.actor);
    if (entry.publishedAt === undefined) {
      return await toAdminChangelogEntryDto(ctx, entry);
    }
    const now = Date.now();
    const updated = {
      ...entry,
      publishedAt: undefined,
      publishedKey: "hidden" as const,
      updatedAt: now,
    };
    await ctx.db.patch(entry._id, {
      publishedAt: undefined,
      publishedKey: "hidden",
      updatedAt: now,
    });
    await appendLinkedActivity(ctx, {
      entry: updated,
      actorId,
      type: "changelog_unpublish",
    });
    return await toAdminChangelogEntryDto(ctx, updated);
  },
});
