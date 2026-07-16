import betterAuthTest from "@convex-dev/better-auth/test";
import { expect, test } from "vitest";

import { createBetterAuthAfferentFixture } from "../../fixtures/auth-better-auth/convex/afferent.js";
import { components } from "../../fixtures/auth-better-auth/convex/_generated/api.js";
import { normalizeBetterAuthUser } from "../../src/client/adapters/better-auth.js";
import {
  runFactoryAuthorityConformance,
  type ProviderFactoryScenario,
} from "./harness.js";

const now = Date.now();

const scenario = {
  name: "Better Auth",
  identity: {
    issuer: "https://better-auth.example.test",
    subject: "unseeded-user",
    tokenIdentifier: "better-auth|unseeded",
    sessionId: "unseeded-session",
  },
  expectedDisplayName: "Grace",
  registerBackend: (backend) => {
    betterAuthTest.register(backend, "betterAuth");
  },
  prepareIdentity: async (backend) => {
    const user = await backend.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name: "Grace",
          email: "private@example.test",
          emailVerified: true,
          image: "https://img.example.test/grace.png",
          createdAt: now,
          updatedAt: now,
        },
      },
    });
    const validSession = await backend.mutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "session",
          data: {
            userId: user._id,
            token: "valid-session-token",
            expiresAt: now + 60_000,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    );
    const expiredSession = await backend.mutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "session",
          data: {
            userId: user._id,
            token: "expired-session-token",
            expiresAt: now - 1,
            createdAt: now - 60_000,
            updatedAt: now - 60_000,
          },
        },
      },
    );
    const identity = {
      issuer: "https://better-auth.example.test",
      subject: user._id,
      tokenIdentifier: `better-auth|${user._id}`,
      sessionId: validSession._id,
    };
    return {
      identity,
      invalidIdentities: [
        {
          ...identity,
          tokenIdentifier: `better-auth|${user._id}|missing-session`,
          sessionId: "00000000000000000000000000session",
        },
        {
          ...identity,
          tokenIdentifier: `better-auth|${user._id}|expired-session`,
          sessionId: expiredSession._id,
        },
      ],
    };
  },
  createClient: createBetterAuthAfferentFixture,
} satisfies ProviderFactoryScenario & {
  registerBackend: (backend: Parameters<typeof betterAuthTest.register>[0]) => void;
  prepareIdentity: (
    backend: Parameters<typeof betterAuthTest.register>[0],
  ) => Promise<{
    identity: ProviderFactoryScenario["identity"];
    invalidIdentities: ProviderFactoryScenario["identity"][];
  }>;
};

runFactoryAuthorityConformance(scenario);

test("uses only the stored session-validated user and safe display facts", () => {
  const actor = normalizeBetterAuthUser({
    _id: "user_123",
    name: "Grace",
    image: "https://img.example.test/grace.png",
    email: "private@example.test",
    role: "admin",
  });
  expect(actor).toEqual({
    externalKey: "better-auth:user_123",
    displayName: "Grace",
    avatarUrl: "https://img.example.test/grace.png",
  });
  expect(actor).not.toHaveProperty("email");
  expect(actor).not.toHaveProperty("role");
});

test("rejects an invalid stable ID instead of accepting a stale identity shortcut", () => {
  expect(() => normalizeBetterAuthUser({ _id: "" })).toThrow(
    "AUTHENTICATION_REQUIRED",
  );
});

test("refreshes optional display snapshots without changing actor identity", () => {
  const first = normalizeBetterAuthUser({ _id: "stable", name: "Before" });
  const refreshed = normalizeBetterAuthUser({ _id: "stable", name: "After" });
  expect(refreshed.externalKey).toBe(first.externalKey);
  expect(refreshed.displayName).toBe("After");
});
