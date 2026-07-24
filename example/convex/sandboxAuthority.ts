import { getAuthUserId } from "@convex-dev/auth/server";
import { normalizeConvexAuthUserId } from "afferent/adapters/convex-auth.js";
import type { ScopedAfferentClientOptions } from "afferent/server.js";

type HostContext = Parameters<ScopedAfferentClientOptions["resolveScope"]>[0];
type ResolveUserId = (ctx: HostContext) => Promise<string | null>;
export type ResolvePhysicalScope = (
  ctx: HostContext,
  verifiedUserId: string,
) => Promise<string>;

async function requireUser(
  ctx: HostContext,
  resolveUserId: ResolveUserId,
): Promise<string> {
  const userId = await resolveUserId(ctx);
  if (userId === null) throw new Error("AUTHENTICATION_REQUIRED");
  return userId;
}

export function createSandboxResolvers(
  resolvePhysicalScope: ResolvePhysicalScope,
  resolveUserId: ResolveUserId = getAuthUserId,
): ScopedAfferentClientOptions {
  const resolveActor = async (ctx: HostContext) =>
    normalizeConvexAuthUserId(await requireUser(ctx, resolveUserId));
  return {
    resolveScope: async (ctx) =>
      resolvePhysicalScope(ctx, await requireUser(ctx, resolveUserId)),
    resolveActor,
    resolveViewerActor: resolveActor,
    authorizeAdmin: async (ctx) => {
      await requireUser(ctx, resolveUserId);
      return true;
    },
    isAuthenticated: async (ctx) => (await resolveUserId(ctx)) !== null,
  };
}
