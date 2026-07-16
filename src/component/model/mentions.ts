import type { Id } from "../_generated/dataModel.js";
import type { MutationCtx } from "../_generated/server.js";
import { isAnonymizedExternalKey } from "./actors.js";

const MAX_MENTIONS_PER_COMMENT = 20;
const MENTION_PATTERN = /@\[\{([^}\]]+)\}\]/gu;

export function parseMentionActorIds(body: string) {
  const ids = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) {
    ids.add(match[1]);
    if (ids.size > MAX_MENTIONS_PER_COMMENT) {
      throw new Error("TOO_MANY_MENTIONS");
    }
  }
  return [...ids];
}

export async function resolveDeliverableMentionActorIds(
  ctx: MutationCtx,
  scopeId: string,
  body: string,
) {
  const result: Id<"actors">[] = [];
  for (const value of parseMentionActorIds(body)) {
    const actorId = ctx.db.normalizeId("actors", value);
    if (!actorId) continue;
    const actor = await ctx.db.get(actorId);
    if (
      actor &&
      actor.scopeId === scopeId &&
      !isAnonymizedExternalKey(actor.externalKey)
    ) {
      result.push(actor._id);
    }
  }
  return result;
}
