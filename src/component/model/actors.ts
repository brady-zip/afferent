import type { Id } from "../_generated/dataModel.js";
import type { MutationCtx } from "../_generated/server.js";
import type { VerifiedActorValue } from "../validators.js";
import { invalidInput } from "./errors.js";
import { requireScope } from "./scope.js";

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
