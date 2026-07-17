import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("real-backend merge harness", () => {
  test("uses a disposable Convex deployment and continuous observation oracle", async () => {
    const source = await readFile("scripts/test-merge-backend.mjs", "utf8");
    expect(source).toContain("ConvexHttpClient");
    expect(source).toContain("CONVEX_AGENT_MODE");
    expect(source).toContain("startBackend");
    expect(source).toContain("stopBackend");
    expect(source).toContain("recordObservation");
    expect(source).toContain("assertPreOrPostOnly");
    expect(source).toContain("abortMerge");
    expect(source).not.toContain('readFile("src/component/model/merge.ts"');
  });
});
