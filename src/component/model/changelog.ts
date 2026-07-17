import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { conflict, invalidInput, notFound } from "./errors.js";
import { requireScope } from "./scope.js";
import { isPostPubliclyVisible } from "./visibility.js";

export const MAX_CHANGELOG_LINKS = 50;
export const MAX_CHANGELOG_SLUG_LENGTH = 80;
const MAX_SLUG_COLLISIONS = 100;
const MAX_REDIRECT_DEPTH = 20;

type DatabaseContext = Pick<QueryCtx | MutationCtx, "db">;

function sanitizeChangelogSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");
  if (!slug || slug.length > MAX_CHANGELOG_SLUG_LENGTH) {
    invalidInput(
      `slug must contain 1 to ${MAX_CHANGELOG_SLUG_LENGTH} lowercase URL-safe characters`,
    );
  }
  return slug;
}

export function normalizeChangelogSlug(value: string) {
  if (/[./\\]/u.test(value)) {
    invalidInput("slug may not contain path separators or dot segments");
  }
  return sanitizeChangelogSlug(value);
}

export function deriveChangelogSlug(title: string) {
  return sanitizeChangelogSlug(title);
}

export function nextAvailableChangelogSlug(
  base: string,
  occupied: readonly string[],
) {
  const normalized = normalizeChangelogSlug(base);
  const existing = new Set(occupied);
  if (!existing.has(normalized)) return normalized;
  for (let suffix = 2; suffix <= MAX_SLUG_COLLISIONS; suffix += 1) {
    const suffixText = `-${suffix}`;
    const candidate = `${normalized.slice(
      0,
      MAX_CHANGELOG_SLUG_LENGTH - suffixText.length,
    )}${suffixText}`;
    if (!existing.has(candidate)) return candidate;
  }
  conflict("slug", "Unable to derive an available changelog slug");
}

export async function requireChangelogEntryInScope(
  ctx: DatabaseContext,
  scopeId: string,
  entryId: string | Id<"changelogEntries">,
) {
  requireScope(scopeId);
  const normalized = ctx.db.normalizeId("changelogEntries", String(entryId));
  if (!normalized) notFound("changelog");
  const entry = await ctx.db.get(normalized);
  if (!entry || entry.scopeId !== scopeId) notFound("changelog");
  return entry;
}

export async function findChangelogEntryBySlug(
  ctx: DatabaseContext,
  scopeId: string,
  slug: string,
) {
  requireScope(scopeId);
  return await ctx.db
    .query("changelogEntries")
    .withIndex("by_scope_slug", (query) =>
      query.eq("scopeId", scopeId).eq("slug", slug),
    )
    .unique();
}

export async function allocateChangelogSlug(
  ctx: DatabaseContext,
  scopeId: string,
  title: string,
) {
  const base = deriveChangelogSlug(title);
  const occupied: string[] = [];
  for (let suffix = 1; suffix <= MAX_SLUG_COLLISIONS; suffix += 1) {
    const suffixText = suffix === 1 ? "" : `-${suffix}`;
    const candidate = `${base.slice(
      0,
      MAX_CHANGELOG_SLUG_LENGTH - suffixText.length,
    )}${suffixText}`;
    const existing = await findChangelogEntryBySlug(ctx, scopeId, candidate);
    if (!existing) return candidate;
    occupied.push(candidate);
  }
  return nextAvailableChangelogSlug(base, occupied);
}

export async function requireAvailableExplicitSlug(
  ctx: DatabaseContext,
  args: {
    scopeId: string;
    value: string;
    currentEntryId?: Id<"changelogEntries">;
  },
) {
  const slug = normalizeChangelogSlug(args.value);
  const existing = await findChangelogEntryBySlug(ctx, args.scopeId, slug);
  if (existing && existing._id !== args.currentEntryId) {
    conflict("slug", `The changelog slug "${slug}" is already in use`);
  }
  return slug;
}

export function changelogEntryState(entry: Doc<"changelogEntries">) {
  if (entry.publishedAt !== undefined) return "published" as const;
  if (entry.firstPublishedAt !== undefined) return "unpublished" as const;
  return "draft" as const;
}

export async function listChangelogLinks(
  ctx: DatabaseContext,
  entry: Doc<"changelogEntries">,
) {
  const links = await ctx.db
    .query("changelogPostLinks")
    .withIndex("by_scope_entry_order", (query) =>
      query.eq("scopeId", entry.scopeId).eq("entryId", entry._id),
    )
    .take(MAX_CHANGELOG_LINKS + 1);
  if (links.length > MAX_CHANGELOG_LINKS) {
    throw new ConvexError({ code: "INVARIANT_VIOLATION" });
  }
  return links;
}

export async function resolveCanonicalLinkedPost(
  ctx: DatabaseContext,
  scopeId: string,
  initialPostId: Id<"posts">,
) {
  let postId = initialPostId;
  const seen = new Set<string>();
  for (let depth = 0; depth < MAX_REDIRECT_DEPTH; depth += 1) {
    if (seen.has(String(postId))) {
      throw new ConvexError({ code: "INVARIANT_VIOLATION" });
    }
    seen.add(String(postId));
    const post = await ctx.db.get(postId);
    if (!post || post.scopeId !== scopeId) return null;
    if (post.mergedIntoPostId === undefined) return post;
    postId = post.mergedIntoPostId;
  }
  throw new ConvexError({ code: "INVARIANT_VIOLATION" });
}

export async function toChangelogLinkedPostDto(
  _ctx: DatabaseContext,
  post: Doc<"posts">,
) {
  const labels = {
    open: "Open",
    under_review: "Under Review",
    planned: "Planned",
    in_progress: "In Progress",
    complete: "Complete",
    closed: "Closed",
  } as const;
  return {
    contractVersion: 1 as const,
    id: String(post._id),
    title: post.title,
    status: { key: post.statusKey, label: labels[post.statusKey] },
  };
}

export async function toAdminChangelogEntryDto(
  ctx: DatabaseContext,
  entry: Doc<"changelogEntries">,
) {
  const links = await listChangelogLinks(ctx, entry);
  return {
    contractVersion: 1 as const,
    id: String(entry._id),
    title: entry.title,
    body: entry.body,
    slug: entry.slug,
    state: changelogEntryState(entry),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    ...(entry.firstPublishedAt === undefined
      ? {}
      : { firstPublishedAt: entry.firstPublishedAt }),
    ...(entry.publishedAt === undefined
      ? {}
      : { publishedAt: entry.publishedAt }),
    postIds: [
      ...new Set(
        await Promise.all(
          links.map(async (link) => {
            const canonical = await resolveCanonicalLinkedPost(
              ctx,
              entry.scopeId,
              link.postId,
            );
            return String(canonical?._id ?? link.postId);
          }),
        ),
      ),
    ],
  };
}

export async function toPublicChangelogEntryDto(
  ctx: DatabaseContext,
  entry: Doc<"changelogEntries">,
) {
  if (
    entry.publishedAt === undefined ||
    entry.firstPublishedAt === undefined ||
    entry.publishedKey !== "published"
  ) {
    throw new ConvexError({ code: "INVARIANT_VIOLATION" });
  }
  const links = await listChangelogLinks(ctx, entry);
  const resolved = await Promise.all(
    links.map((link) =>
      resolveCanonicalLinkedPost(ctx, entry.scopeId, link.postId),
    ),
  );
  const visible = resolved.filter(
    (post): post is Doc<"posts"> =>
      post !== null && isPostPubliclyVisible(post),
  );
  const unique = visible.filter(
    (post, index) =>
      visible.findIndex((candidate) => candidate._id === post._id) === index,
  );
  return {
    contractVersion: 1 as const,
    id: String(entry._id),
    title: entry.title,
    body: entry.body,
    slug: entry.slug,
    firstPublishedAt: entry.firstPublishedAt,
    updatedAt: entry.updatedAt,
    links: await Promise.all(
      unique.map((post) => toChangelogLinkedPostDto(ctx, post)),
    ),
  };
}
