import { describe, expect, test } from "vitest";

import { normalizeConvexAuthUserId } from "../../src/client/adapters/convex-auth.js";
import { runAuthorityConformance } from "./harness.js";

describe("Convex Auth trusted-host adapter", () => {
  runAuthorityConformance({
    name: "Convex Auth",
    authenticatedActor: async () => normalizeConvexAuthUserId("user_123"),
    anonymousActor: async () => null,
  });

  test("uses only the stable helper-resolved user ID", () => {
    expect(normalizeConvexAuthUserId("user_123")).toEqual({
      externalKey: "convex-auth:user_123",
    });
  });
});
