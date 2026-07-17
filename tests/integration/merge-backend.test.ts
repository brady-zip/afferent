import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("real-backend merge harness", () => {
  test("keeps the disposable backend probe wired to bounded resume assertions", async () => {
    const source = await readFile("scripts/test-merge-backend.mjs", "utf8");
    expect(source).toContain("MERGE_BATCH_SIZE");
    expect(source).toContain("continueMerge");
    expect(source).toContain("crashBoundary");
    expect(source).toContain("uniqueActors");
  });
});
