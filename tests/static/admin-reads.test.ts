import fs from "node:fs";
import { describe, expect, test } from "vitest";

describe("admin read authority and query plans", () => {
  test("authorizes host reads before invoking the component", () => {
    const source = fs.readFileSync("src/client/internal.ts", "utf8");
    for (const method of ["listAdminFeedback", "getAdminPost", "listAdminChangelog"]) {
      const start = source.indexOf(`async ${method}`);
      const body = source.slice(start, source.indexOf("\n      },", start));
      expect(start).toBeGreaterThan(-1);
      expect(body.indexOf("authorizeAdmin")).toBeGreaterThan(-1);
      expect(body.indexOf("authorizeAdmin")).toBeLessThan(body.indexOf("runQuery"));
      expect(body).not.toMatch(/args\.(?:scopeId|isAdmin|userId)/);
    }
  });

  test("uses the exact bounded indexes for admin queues", () => {
    const posts = fs.readFileSync("src/component/admin/posts.ts", "utf8");
    const changelog = fs.readFileSync("src/component/admin/changelog.ts", "utf8");
    const schema = fs.readFileSync("src/component/schema.ts", "utf8");
    expect(posts).toContain('withIndex("by_scope_visibility_created"');
    expect(changelog).toContain('withIndex("by_scope_created"');
    expect(schema).toContain('.index("by_scope_created", ["scopeId", "createdAt", "orderId"])');
    expect(posts).toMatch(/numItems < 1[\s\S]*numItems > 50/);
    expect(changelog).toMatch(/numItems < 1[\s\S]*numItems > 50/);
  });
});
