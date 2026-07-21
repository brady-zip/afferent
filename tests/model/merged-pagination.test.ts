import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

describe("merged post pagination model", () => {
  test("uses one bounded full-key stream and validates both cursor boundaries", async () => {
    const source = await readFile(
      new URL("../../src/component/model/mergedPagination.ts", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/export async function paginateMergedPostStream/);
    expect(source).toMatch(/mergedStream/);
    expect(source).toMatch(/endCursor/);
    expect(source).toMatch(/maximumRowsRead/);
    expect(source).toMatch(/maximumBytesRead/);
    expect(source).toMatch(/\["_creationTime", "_id"\]/);
    expect(source).toMatch(/\["occurredAt", "_creationTime", "_id"\]/);
    expect(source).not.toMatch(/\.filter\(/);
  });
});
