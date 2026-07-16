import type { VerifiedActor } from "../contracts.js";

export type SessionValidatedBetterAuthUser = Readonly<{
  id: string;
  name?: string | null;
  image?: string | null;
}>;

function optionalDisplay(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function normalizeBetterAuthUser(
  user: SessionValidatedBetterAuthUser,
): VerifiedActor {
  const stableUserId = user.id.trim();
  if (!stableUserId) throw new Error("AUTHENTICATION_REQUIRED");
  const displayName = optionalDisplay(user.name);
  const avatarUrl = optionalDisplay(user.image);
  return Object.freeze({
    externalKey: `better-auth:${stableUserId}`,
    ...(displayName === undefined ? {} : { displayName }),
    ...(avatarUrl === undefined ? {} : { avatarUrl }),
  });
}
