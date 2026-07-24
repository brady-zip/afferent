import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";

import {
  api,
  components,
} from "../../example/convex/_generated/api.js";
import schema from "../../example/convex/schema.js";
import {
  SANDBOX_QUOTAS,
  evaluateSandboxQuota,
  sumScopedUsage,
  type SandboxQuotaUsage,
} from "../../example/convex/sandboxQuotas.js";
import { deriveLogicalSandboxKey } from "../../example/convex/sandboxScope.js";
import { register } from "../../src/test.js";

const hostedModules = import.meta.glob("../../example/convex/**/*.ts");

function hostedBackend() {
  const backend = convexTest(schema, hostedModules);
  register(backend, "showcase");
  register(backend, "sandbox");
  return backend;
}

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

  test("counts a retired generation until cleanup instead of granting reset quota", async () => {
    const backend = hostedBackend();
    const first = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "quota-reset-first",
    });
    const second = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "quota-reset-second",
    });
    await first.action(api.sandbox.ensureSandbox, {});
    await second.action(api.sandbox.ensureSandbox, {});
    const firstScope = await backend.run(async (ctx) => {
      const ownerKey = await deriveLogicalSandboxKey("quota-reset-first");
      const owner = await ctx.db
        .query("sandboxOwners")
        .withIndex("by_owner_key", (query) => query.eq("ownerKey", ownerKey))
        .unique();
      if (owner?.activeGeneration === undefined) {
        throw new Error("missing owner fixture");
      }
      const generation = await ctx.db
        .query("sandboxGenerations")
        .withIndex("by_owner_generation", (query) =>
          query
            .eq("ownerKey", ownerKey)
            .eq("generation", owner.activeGeneration!),
        )
        .unique();
      if (generation === null) throw new Error("missing generation fixture");
      return generation.physicalScopeId;
    });
    for (let index = 0; index < SANDBOX_QUOTAS.roots.tags; index += 1) {
      await backend.mutation(components.sandbox.admin.tags.createTag, {
        scopeId: firstScope,
        name: `Quota tag ${index}`,
      });
    }

    await first.action(api.sandbox.resetSandbox, {});
    await expect(
      first.mutation(api.sandbox.createTag, { name: "Denied after reset" }),
    ).rejects.toMatchObject({
      data: {
        contractVersion: 1,
        code: "SANDBOX_QUOTA_EXCEEDED",
        resource: "tags",
        current: SANDBOX_QUOTAS.roots.tags,
      },
    });
    await expect(
      second.mutation(api.sandbox.createTag, { name: "Other owner tag" }),
    ).resolves.toMatchObject({ name: "Other owner tag" });
  });

  test("throttles writes and repeated resets on the logical owner across generations", async () => {
    const backend = hostedBackend();
    const user = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "logical-abuse-owner",
    });
    await user.action(api.sandbox.ensureSandbox, {});
    for (let attempt = 0; attempt < SANDBOX_QUOTAS.resetAttemptsPerHour; attempt += 1) {
      await expect(user.action(api.sandbox.resetSandbox, {})).resolves.toMatchObject({
        state: "ready",
      });
    }
    await expect(user.action(api.sandbox.resetSandbox, {})).rejects.toMatchObject({
      data: {
        contractVersion: 1,
        code: "SANDBOX_RESET_RATE_LIMITED",
        retryAfterMs: expect.any(Number),
      },
    });

    await backend.run(async (ctx) => {
      const ownerKey = await deriveLogicalSandboxKey("logical-abuse-owner");
      const owner = await ctx.db
        .query("sandboxOwners")
        .withIndex("by_owner_key", (query) => query.eq("ownerKey", ownerKey))
        .unique();
      if (owner === null) throw new Error("missing owner fixture");
      await ctx.db.patch(owner._id, {
        writeWindowStartedAt: Date.now(),
        writeCount: SANDBOX_QUOTAS.writesPerMinute,
      });
    });
    await expect(
      user.mutation(api.sandbox.createTag, { name: "Write denied" }),
    ).rejects.toMatchObject({
      data: {
        contractVersion: 1,
        code: "SANDBOX_WRITE_RATE_LIMITED",
        retryAfterMs: expect.any(Number),
      },
    });
  });
});
