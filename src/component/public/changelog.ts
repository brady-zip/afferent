import { paginationOptsValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import { v } from "convex/values";

import { query } from "../_generated/server.js";
import { authenticationRequired, invalidInput } from "../model/errors.js";
import {
  findChangelogEntryBySlug,
  toPublicChangelogEntryDto,
} from "../model/changelog.js";
import { requireInstallation, requireScope } from "../model/scope.js";
import schema from "../schema.js";
import {
  changelogPageDtoValidator,
  publishedChangelogLookupDtoValidator,
} from "../validators.js";

const MAX_CHANGELOG_PAGE_SIZE = 50;

async function requireReadPolicy(
  ctx: Parameters<typeof requireInstallation>[0],
  scopeId: string,
  viewerAuthenticated: boolean,
) {
  const installation = await requireInstallation(ctx, scopeId);
  if (installation.readPolicy === "authenticated" && !viewerAuthenticated) {
    authenticationRequired();
  }
}

export const listPublishedChangelog = query({
  args: {
    scopeId: v.string(),
    viewerAuthenticated: v.boolean(),
    paginationOpts: paginationOptsValidator,
  },
  returns: changelogPageDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    await requireReadPolicy(ctx, args.scopeId, args.viewerAuthenticated);
    if (
      args.paginationOpts.numItems < 1 ||
      args.paginationOpts.numItems > MAX_CHANGELOG_PAGE_SIZE
    ) {
      invalidInput(
        `pagination numItems must be between 1 and ${MAX_CHANGELOG_PAGE_SIZE}`,
      );
    }
    const result = await paginator(ctx.db, schema)
      .query("changelogEntries")
      .withIndex("by_scope_published_first", (index) =>
        index.eq("scopeId", args.scopeId).eq("publishedKey", "published"),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    const entries = await Promise.all(
      result.page.map((entry) => toPublicChangelogEntryDto(ctx, entry)),
    );
    return { contractVersion: 1 as const, ...result, page: entries, entries };
  },
});

export const getPublishedChangelogBySlug = query({
  args: {
    scopeId: v.string(),
    viewerAuthenticated: v.boolean(),
    slug: v.string(),
  },
  returns: publishedChangelogLookupDtoValidator,
  handler: async (ctx, args) => {
    requireScope(args.scopeId);
    await requireReadPolicy(ctx, args.scopeId, args.viewerAuthenticated);
    const entry = await findChangelogEntryBySlug(ctx, args.scopeId, args.slug);
    if (
      !entry ||
      entry.publishedAt === undefined ||
      entry.publishedKey !== "published"
    ) {
      return { contractVersion: 1 as const, status: "notFound" as const };
    }
    return {
      contractVersion: 1 as const,
      status: "entry" as const,
      entry: await toPublicChangelogEntryDto(ctx, entry),
    };
  },
});
