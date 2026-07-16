import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";

import { components } from "../_generated/api.js";
import type { MutationCtx } from "../_generated/server.js";
import { rateLimited, type ParticipationOperation } from "./errors.js";

export const PARTICIPATION_LIMITS = {
  createPostActor: { kind: "fixed window", rate: 5, period: HOUR },
  createPostScope: {
    kind: "fixed window",
    rate: 100,
    period: HOUR,
    shards: 10,
  },
  commentActor: { kind: "fixed window", rate: 30, period: 10 * MINUTE },
  commentScope: {
    kind: "fixed window",
    rate: 600,
    period: 10 * MINUTE,
    shards: 10,
  },
  voteActor: { kind: "fixed window", rate: 120, period: MINUTE },
  subscribeActor: { kind: "fixed window", rate: 120, period: MINUTE },
} as const;

const limiter = new RateLimiter(components.rateLimiter, PARTICIPATION_LIMITS);

export async function consumeParticipationLimit(
  ctx: MutationCtx,
  args: {
    operation: ParticipationOperation;
    actorKey: string;
    scopeId: string;
  },
) {
  let actorLimit:
    "createPostActor" | "voteActor" | "subscribeActor" | "commentActor";
  switch (args.operation) {
    case "create_post": {
      actorLimit = "createPostActor";
      break;
    }
    case "vote": {
      actorLimit = "voteActor";
      break;
    }
    case "subscribe": {
      actorLimit = "subscribeActor";
      break;
    }
    default: {
      actorLimit = "commentActor";
    }
  }
  const actor = await limiter.limit(ctx, actorLimit, {
    key: `${args.scopeId}:${args.actorKey}`,
    reserve: false,
  });
  if (!actor.ok) return rateLimited(args.operation, actor.retryAfter);

  if (
    args.operation === "create_post" ||
    args.operation === "comment" ||
    args.operation === "edit_post"
  ) {
    const scopeLimit =
      args.operation === "create_post" ? "createPostScope" : "commentScope";
    const scope = await limiter.limit(ctx, scopeLimit, {
      key: args.scopeId,
      reserve: false,
    });
    if (!scope.ok) return rateLimited(args.operation, scope.retryAfter);
  }
  return null;
}
