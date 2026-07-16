import type { VerifiedActor } from "../contracts.js";

export type VerifiedClerkIdentity = Readonly<{
  issuer: string;
  subject: string;
  name?: string;
  pictureUrl?: string;
}>;

function optionalDisplay(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function normalizeClerkIdentity(
  identity: VerifiedClerkIdentity,
): VerifiedActor {
  const issuer = identity.issuer.trim();
  const subject = identity.subject.trim();
  if (!issuer || !subject) throw new Error("AUTHENTICATION_REQUIRED");
  const displayName = optionalDisplay(identity.name);
  const avatarUrl = optionalDisplay(identity.pictureUrl);
  return Object.freeze({
    externalKey: `clerk:${encodeURIComponent(issuer)}:${encodeURIComponent(subject)}`,
    ...(displayName === undefined ? {} : { displayName }),
    ...(avatarUrl === undefined ? {} : { avatarUrl }),
  });
}
