import { describe, expect, test } from "vitest";

import { createClerkAfferentFixture } from "../../fixtures/auth-clerk/convex/afferent.js";
import { normalizeClerkIdentity } from "../../src/client/adapters/clerk.js";
import { normalizeBetterAuthUser } from "../../src/client/adapters/better-auth.js";
import { runFactoryAuthorityConformance } from "./harness.js";

describe("Clerk trusted-host factory", () => {
  const identity = {
    issuer: "https://clerk.example.test",
    subject: "user_123",
    tokenIdentifier: "clerk|user_123",
    name: "Ada",
    pictureUrl: "https://img.example.test/ada.png",
    email: "private@example.test",
    role: "admin",
  };

  runFactoryAuthorityConformance({
    name: "Clerk",
    identity,
    expectedDisplayName: "Ada",
    createClient: createClerkAfferentFixture,
  });

  test("namespaces verified issuer and subject and maps only display facts", () => {
    const actor = normalizeClerkIdentity(identity);
    expect(actor).toEqual({
      externalKey: "clerk:https%3A%2F%2Fclerk.example.test:user_123",
      displayName: "Ada",
      avatarUrl: "https://img.example.test/ada.png",
    });
    expect(actor).not.toHaveProperty("email");
    expect(actor).not.toHaveProperty("role");
  });

  test("keeps identical subjects from different issuers separate", () => {
    const first = normalizeClerkIdentity({ issuer: "issuer-a", subject: "same" });
    const second = normalizeClerkIdentity({ issuer: "issuer-b", subject: "same" });
    expect(first.externalKey).not.toBe(second.externalKey);
  });

  test("never links the same raw provider ID across providers", () => {
    const clerk = normalizeClerkIdentity({ issuer: "issuer", subject: "same" });
    const better = normalizeBetterAuthUser({ _id: "same" });
    expect(clerk.externalKey).not.toBe(better.externalKey);
  });
});
