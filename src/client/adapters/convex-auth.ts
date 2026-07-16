import type { VerifiedActor } from "../contracts.js";

const CONVEX_AUTH_DOMAIN = "convex-auth";

export function normalizeConvexAuthUserId(userId: string): VerifiedActor {
  const stableUserId = userId.trim();
  if (!stableUserId) throw new Error("AUTHENTICATION_REQUIRED");
  return Object.freeze({
    externalKey: `${CONVEX_AUTH_DOMAIN}:${stableUserId}`,
  });
}
