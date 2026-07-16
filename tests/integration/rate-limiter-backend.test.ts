import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("real backend rate-limiter harness", () => {
  test("pins the approved child component and asserts retry accounting", async () => {
    const harness = await readFile(
      new URL("../../scripts/test-rate-limiter-backend.mjs", import.meta.url),
      "utf8",
    );
    const implementation = await readFile(
      new URL("../../src/component/model/rateLimits.ts", import.meta.url),
      "utf8",
    );
    expect(harness).toContain("@convex-dev/rate-limiter");
    expect(implementation).toContain("reserve: false");
    expect(harness).toContain("OCC_CONCURRENCY");
    expect(harness).toContain("RATE_LIMITED");
  });
});
