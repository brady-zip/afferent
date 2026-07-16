import { describe, expect, test, vi } from "vitest";

import { createConvexAuthAfferentFixture } from "../../fixtures/auth-convex-auth/convex/afferent.js";
import { normalizeConvexAuthUserId } from "../../src/client/adapters/convex-auth.js";
import { runFactoryAuthorityConformance } from "./harness.js";

const getAuthUserId = vi.fn(async (ctx: { auth: { getUserIdentity(): Promise<unknown> } }) => {
  const identity = (await ctx.auth.getUserIdentity()) as
    | { subject?: string }
    | null;
  return identity?.subject ?? null;
});

describe("Convex Auth trusted-host factory", () => {
  runFactoryAuthorityConformance({
    name: "Convex Auth",
    identity: {
      issuer: "https://convex-auth.example.test",
      subject: "user_123",
      tokenIdentifier: "convex-auth|user_123",
    },
    createClient: (component, authorizeAdmin) =>
      createConvexAuthAfferentFixture(
        component,
        authorizeAdmin,
        getAuthUserId,
      ),
    assertTrustedIdentityResolution: () => {
      expect(getAuthUserId).toHaveBeenCalled();
    },
  });

  test("uses only the stable helper-resolved user ID", () => {
    expect(normalizeConvexAuthUserId("user_123")).toEqual({
      externalKey: "convex-auth:user_123",
    });
  });
});
