import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("real backend rate-limiter harness", () => {
  test("pins the approved child component and asserts retry accounting", async () => {
    const source = await readFile(
      new URL("../../scripts/test-rate-limiter-backend.mjs", import.meta.url),
      "utf8",
    );
    expect(source).toContain("@convex-dev/rate-limiter");
    expect(source).toContain("reserve: false");
    expect(source).toContain("OCC");
    expect(source).toContain("RATE_LIMITED");
  });
});
