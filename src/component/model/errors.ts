import { ConvexError } from "convex/values";

export type PublicErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "INSTALLATION_NOT_CONFIGURED"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "NOT_OWNER";

export function invalidInput(message: string): never {
  throw new ConvexError({ code: "INVALID_INPUT", message });
}

export function notFound(
  resource: "board" | "post" | "comment" | "actor" | "tag",
): never {
  throw new ConvexError({ code: "NOT_FOUND", resource });
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
