import { ConvexError } from "convex/values";

export type PublicErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "INSTALLATION_NOT_CONFIGURED"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "NOT_OWNER"
  | "DISCUSSION_LOCKED"
  | "CONFLICT"
  | "RATE_LIMITED";

export type ParticipationOperation =
  "create_post" | "edit_post" | "comment" | "vote" | "subscribe";

export function expectedFailure(
  code: "VALIDATION" | "NOT_FOUND" | "DISCUSSION_LOCKED" | "NOT_AUTHORIZED",
  message: string,
) {
  return {
    ok: false as const,
    error: { contractVersion: 1 as const, code, message },
  };
}

export function rateLimited(
  operation: ParticipationOperation,
  retryAfterMs: number,
) {
  return {
    ok: false as const,
    error: {
      contractVersion: 1 as const,
      code: "RATE_LIMITED" as const,
      operation,
      retryAfterMs: Math.max(0, Math.ceil(retryAfterMs)),
    },
  };
}

export function invalidInput(message: string): never {
  throw new ConvexError({ code: "INVALID_INPUT", message });
}

export function notFound(
  resource:
    | "board"
    | "post"
    | "comment"
    | "actor"
    | "tag"
    | "changelog"
    | "notification",
): never {
  throw new ConvexError({ code: "NOT_FOUND", resource });
}

export function conflict(field: string, message: string): never {
  throw new ConvexError({ code: "CONFLICT", field, message });
}

export function authenticationRequired(): never {
  throw new ConvexError({ code: "AUTHENTICATION_REQUIRED" });
}

export function notOwner(): never {
  throw new ConvexError({ code: "NOT_OWNER" });
}

export function installationNotConfigured(): never {
  throw new ConvexError({ code: "INSTALLATION_NOT_CONFIGURED" });
}
