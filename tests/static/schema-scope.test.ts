import { describe, expect, test } from "vitest";

import schema from "../../src/component/schema.js";
import { deriveScopeId } from "../../src/client/scope.js";
import { readFile } from "node:fs/promises";

describe("scope-complete schema", () => {
  test("requires scopeId on every table and leads every database index with it", () => {
    for (const [tableName, table] of Object.entries(schema.tables)) {
      const scope = table.validator.fields.scopeId;
      expect(scope, `${tableName} must define scopeId`).toBeDefined();
      expect(scope?.isOptional, `${tableName}.scopeId must be required`).toBe(
        "required",
      );

      for (const index of [...table.indexes, ...table.stagedDbIndexes]) {
        expect(
          index.fields[0],
          `${tableName}.${index.indexDescriptor} must be scope-first`,
        ).toBe("scopeId");
      }

      for (const search of [
        ...table.searchIndexes,
        ...table.stagedSearchIndexes,
      ]) {
        expect(
          search.filterFields,
          `${tableName}.${search.indexDescriptor} must filter by scope`,
        ).toContain("scopeId");
      }
    }
  });

  test("derives a full domain-separated SHA-256 scope from verified identity", async () => {
    const externalKey = "clerk:https://issuer.example:user_123";
    const scope = await deriveScopeId(externalKey);

    expect(scope).toBe("iTXEjbZd1srwM2h032HJKhVfi738T4UCSSUKNyrOwqI");
    expect(scope).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await expect(deriveScopeId("   ")).rejects.toThrow(
      "verified external identity key",
    );
  });

  test("routes comments and activity through one index-bounded merged paginator", async () => {
    const [comments, activity] = await Promise.all([
      readFile(
        new URL("../../src/component/public/comments.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/component/admin/activity.ts", import.meta.url),
        "utf8",
      ),
    ]);

    for (const source of [comments, activity]) {
      expect(source).toMatch(/paginateMergedPostStream/);
      expect(source).not.toMatch(/\.filter\(/);
      expect(source).not.toMatch(/startsWith\("merge:"\)/);
    }
  });
});
