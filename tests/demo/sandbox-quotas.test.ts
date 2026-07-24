import { describe, expect, test } from "vitest";

import {
  SANDBOX_QUOTAS,
  evaluateSandboxQuota,
  sumScopedUsage,
  type SandboxQuotaUsage,
} from "../../example/convex/sandboxQuotas.js";

function usage(
  overrides: Partial<SandboxQuotaUsage> = {},
): SandboxQuotaUsage {
  return {
    documentCount: 0,
    semanticBytes: 0,
    complete: true,
    roots: {
      boards: 0,
      posts: 0,
      comments: 0,
      changelogEntries: 0,
      tags: 0,
      votes: 0,
      subscriptions: 0,
      notificationActivity: 0,
      mergeWork: 0,
    },
    ...overrides,
  };
}

describe("host-owned sandbox quotas", () => {
  test("includes active, pending, and retired-not-cleaned generations in one logical footprint", () => {
    const logical = sumScopedUsage([
      usage({ documentCount: 10, roots: { ...usage().roots, posts: 4 } }),
      usage({ documentCount: 8, roots: { ...usage().roots, posts: 3 } }),
      usage({ documentCount: 6, roots: { ...usage().roots, posts: 2 } }),
    ]);

    expect(logical.documentCount).toBe(24);
    expect(logical.roots.posts).toBe(9);
  });

  test("returns a stable actionable error without authority identifiers", () => {
    const current = usage({
      documentCount: SANDBOX_QUOTAS.totalRecords,
      roots: {
        ...usage().roots,
        posts: SANDBOX_QUOTAS.roots.posts,
      },
    });

    const rejected = evaluateSandboxQuota(current, "posts");

    expect(rejected).toEqual({
      contractVersion: 1,
      code: "SANDBOX_QUOTA_EXCEEDED",
      resource: "posts",
      current: SANDBOX_QUOTAS.roots.posts,
      limit: SANDBOX_QUOTAS.roots.posts,
      recovery:
        "Delete content to free space, or reset after the current rate-limit window.",
    });
    expect(JSON.stringify(rejected)).not.toMatch(
      /owner|actor|scope|generation|lease/iu,
    );
  });

  test("fails closed when a bounded usage snapshot is incomplete", () => {
    expect(
      evaluateSandboxQuota(
        usage({ complete: false, documentCount: 1 }),
        "comments",
      ),
    ).toMatchObject({
      code: "SANDBOX_QUOTA_EXCEEDED",
      resource: "totalRecords",
      current: SANDBOX_QUOTAS.totalRecords,
    });
  });
});
