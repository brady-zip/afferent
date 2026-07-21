import { describe, expect, test, vi } from "vitest";

import { createScopedAfferentClient } from "../../src/client/server.js";

describe("trusted host admin reads", () => {
  test("rejects before a component query can run", async () => {
    const runQuery = vi.fn();
    const client = createScopedAfferentClient({} as never, {
      resolveScope: async () => "scope:server-derived",
      resolveActor: async () => null,
      authorizeAdmin: async () => false,
      isAuthenticated: async () => true,
    }) as any;
    const ctx = { runQuery, runMutation: vi.fn(), auth: { getUserIdentity: vi.fn() } } as never;

    await expect(client.admin.listAdminFeedback(ctx, {
      visibility: "visible",
      paginationOpts: { numItems: 20, cursor: null },
    })).rejects.toThrow("ADMIN_AUTHORIZATION_REQUIRED");
    await expect(client.admin.getAdminPost(ctx, { postId: "spoofed" })).rejects.toThrow(
      "ADMIN_AUTHORIZATION_REQUIRED",
    );
    await expect(client.admin.listAdminChangelog(ctx, {
      paginationOpts: { numItems: 20, cursor: null },
    })).rejects.toThrow("ADMIN_AUTHORIZATION_REQUIRED");
    expect(runQuery).not.toHaveBeenCalled();
  });
});
