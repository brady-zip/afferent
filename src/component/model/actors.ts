import type { Id } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import type { VerifiedActorValue } from "../validators.js";
import { invalidInput, notFound } from "./errors.js";
import { requireScope } from "./scope.js";

const ANONYMIZED_KEY_PREFIX = "afferent:anonymous:v1:";
export const ANONYMIZED_AUTHOR_LABEL = "Anonymous";

type DatabaseContext = Pick<QueryCtx | MutationCtx, "db">;

export function isAnonymizedExternalKey(externalKey: string) {
  return externalKey.startsWith(ANONYMIZED_KEY_PREFIX);
}

function randomTombstone() {
  const randomHex = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 4_294_967_296)
      .toString(16)
      .padStart(8, "0"),
  ).join("");
  return `${ANONYMIZED_KEY_PREFIX}${randomHex}`;
}

export async function requireActorInScope(
  ctx: DatabaseContext,
  scopeId: string,
  actorId: string | Id<"actors">,
) {
  requireScope(scopeId);
  const normalized = ctx.db.normalizeId("actors", String(actorId));
  if (!normalized) notFound("actor");
  const actor = await ctx.db.get(normalized);
  if (!actor || actor.scopeId !== scopeId) notFound("actor");
  return actor;
}

export async function anonymizeActor(
  ctx: MutationCtx,
  scopeId: string,
  actorId: string | Id<"actors">,
) {
  const actor = await requireActorInScope(ctx, scopeId, actorId);
  if (isAnonymizedExternalKey(actor.externalKey)) return actor;

  let externalKey = randomTombstone();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const collision = await ctx.db
      .query("actors")
      .withIndex("by_scope_external_key", (q) =>
        q.eq("scopeId", scopeId).eq("externalKey", externalKey),
      )
      .unique();
    if (!collision) {
      await ctx.db.patch(actor._id, {
        externalKey,
        displayName: undefined,
        avatarUrl: undefined,
      });
      return { ...actor, externalKey, displayName: undefined, avatarUrl: undefined };
    }
    externalKey = randomTombstone();
  }
  throw new Error("ANONYMIZATION_TOMBSTONE_COLLISION");
}

export async function upsertActor(
  ctx: MutationCtx,
  scopeId: string,
  actor: VerifiedActorValue,
): Promise<Id<"actors">> {
  requireScope(scopeId);
  if (!actor.externalKey.trim()) invalidInput("trusted actor is required");
  const existing = await ctx.db
    .query("actors")
    .withIndex("by_scope_external_key", (q) =>
      q.eq("scopeId", scopeId).eq("externalKey", actor.externalKey),
    )
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, {
      displayName: actor.displayName,
      avatarUrl: actor.avatarUrl,
    });
    return existing._id;
  }
  return await ctx.db.insert("actors", {
    scopeId,
    externalKey: actor.externalKey,
    displayName: actor.displayName,
    avatarUrl: actor.avatarUrl,
  });
}
