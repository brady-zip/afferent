import fs from "node:fs";

import { describe, expect, test } from "vitest";

describe("notification target trust boundary", () => {
  test("resolves closed targets only in the component inbox projection", () => {
    const inbox = fs.readFileSync("src/component/notifications/inbox.ts", "utf8");
    const bindings = fs.readFileSync("src/react/bindings.ts", "utf8");
    const hooks = fs.readFileSync("src/react/hooks/notifications.ts", "utf8");

    expect(inbox).toContain("resolveNotificationTarget");
    expect(inbox).toContain("target:");
    expect(inbox).not.toMatch(/\.query\([^)]*\)\.collect\(/s);
    expect(bindings).not.toMatch(/target\??:/);
    expect(hooks).not.toMatch(/runQuery|watchQuery|target\s*=|entityId/);
  });

  test("does not expose internal changelog IDs or public notification entity IDs", () => {
    const contracts = fs.readFileSync("src/client/contracts.ts", "utf8");
    const notificationSlice = contracts.slice(
      contracts.indexOf("export type NotificationTarget"),
      contracts.indexOf("export type UnreadNotificationCountDto"),
    );
    expect(notificationSlice).not.toMatch(/ChangelogId|entryId|entityId/);
    expect(notificationSlice).toContain("slug: string");
    expect(notificationSlice).toContain("label: string");
  });
});
