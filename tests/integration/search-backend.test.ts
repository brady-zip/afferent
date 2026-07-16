import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

describe("real Convex search harness", () => {
  test("keeps relevance search bounded and probes both unsupported cursor paths", async () => {
    const source = await readFile("scripts/test-search-backend.mjs", "utf8");
    expect(source).toContain("boundedSearch");
    expect(source).toContain("nativePaginatedSearch");
    expect(source).toContain("helperPaginatedSearch");
    expect(source).toContain("SEARCH_HARD_LIMIT + 1");
  });
});
