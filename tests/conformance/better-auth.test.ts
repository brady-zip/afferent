import { describe, expect, test } from "vitest";

import { normalizeBetterAuthUser } from "../../src/client/adapters/better-auth.js";
import { runAuthorityConformance } from "./harness.js";

describe("Better Auth trusted-host adapter", () => {
  const user = {
    id: "user_123",
    name: "Grace",
    image: "https://img.example.test/grace.png",
    email: "private@example.test",
    role: "admin",
  };

  runAuthorityConformance({
    name: "Better Auth",
    authenticatedActor: async () => normalizeBetterAuthUser(user),
    anonymousActor: async () => null,
  });

  test("uses only the stable session-validated user and safe display facts", () => {
    const actor = normalizeBetterAuthUser(user);
    expect(actor).toEqual({
      externalKey: "better-auth:user_123",
      displayName: "Grace",
      avatarUrl: "https://img.example.test/grace.png",
    });
    expect(actor).not.toHaveProperty("email");
    expect(actor).not.toHaveProperty("role");
  });

  test("rejects an invalid stable ID instead of accepting a stale identity shortcut", () => {
    expect(() => normalizeBetterAuthUser({ id: "" })).toThrow(
      "AUTHENTICATION_REQUIRED",
    );
  });

  test("refreshes optional display snapshots without changing actor identity", () => {
    const first = normalizeBetterAuthUser({ id: "stable", name: "Before" });
    const refreshed = normalizeBetterAuthUser({ id: "stable", name: "After" });
    expect(refreshed.externalKey).toBe(first.externalKey);
    expect(refreshed.displayName).toBe("After");
  });
});
