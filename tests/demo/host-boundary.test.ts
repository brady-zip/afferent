import { describe, expect, it, vi } from "vitest";

import { createSandboxResolvers } from "../../example/convex/sandboxAuthority.js";

const context = (userId: string | null) =>
  ({ auth: { getUserIdentity: vi.fn() }, userId }) as never;

describe("hosted sandbox authority", () => {
  it("rejects anonymous callers before physical scope resolution", async () => {
    const physicalScope = vi.fn();
    const resolvers = createSandboxResolvers(
      physicalScope,
      async (ctx) => (ctx as unknown as { userId: string | null }).userId,
    );
    await expect(resolvers.resolveScope(context(null))).rejects.toThrow(
      "AUTHENTICATION_REQUIRED",
    );
    expect(physicalScope).not.toHaveBeenCalled();
  });

  it("re-derives actor, admin, and scope from the current verified user", async () => {
    const physicalScope = vi.fn(async (_ctx, userId) => `scope:${userId}`);
    const resolveUser = vi.fn(
      async (ctx) => (ctx as unknown as { userId: string | null }).userId,
    );
    const resolvers = createSandboxResolvers(physicalScope, resolveUser);
    const ctx = context("verified-user");

    await expect(resolvers.resolveScope(ctx)).resolves.toBe(
      "scope:verified-user",
    );
    await expect(resolvers.resolveActor(ctx)).resolves.toEqual({
      externalKey: "convex-auth:verified-user",
    });
    await expect(resolvers.authorizeAdmin(ctx)).resolves.toBe(true);
    expect(resolveUser).toHaveBeenCalledTimes(3);
  });
});
