import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import {
  api,
  components,
  internal,
} from "../../example/convex/_generated/api.js";
import schema from "../../example/convex/schema.js";
import { deriveLogicalSandboxKey } from "../../example/convex/sandboxScope.js";
import { register } from "../../src/test.js";

const hostedModules = import.meta.glob("../../example/convex/**/*.ts");

function hostedBackend() {
  const backend = convexTest(schema, hostedModules);
  register(backend, "showcase");
  register(backend, "sandbox");
  return backend;
}

describe("leased retired-generation cleanup", () => {
  test("resumes bounded cleanup and preserves a colliding active visitor", async () => {
    vi.useFakeTimers();
    const backend = hostedBackend();
    const first = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "cleanup-first",
    });
    const second = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "cleanup-second",
    });
    await first.action(api.sandbox.ensureSandbox, {});
    await second.action(api.sandbox.ensureSandbox, {});
    const secondBefore = await second.query(api.sandbox.listFeedback, {
      order: "top",
      paginationOpts: { numItems: 20, cursor: null },
    });
    await first.action(api.sandbox.resetSandbox, {});

    const retired = await backend.run(async (ctx) => {
      const ownerKey = await deriveLogicalSandboxKey("cleanup-first");
      const generation = await ctx.db
        .query("sandboxGenerations")
        .withIndex("by_owner_state", (query) =>
          query.eq("ownerKey", ownerKey).eq("state", "retired"),
        )
        .unique();
      if (generation === null) throw new Error("missing retired generation");
      return {
        ownerKey,
        generation: generation.generation,
        physicalScopeId: generation.physicalScopeId,
      };
    });

    await backend.action(
      internal.sandboxCleanup.runRetiredGenerationCleanup,
      {
        ownerKey: retired.ownerKey,
        generation: retired.generation,
      },
    );
    await backend.finishAllScheduledFunctions(() => vi.runAllTimers());

    await expect(
      backend.query(components.sandbox.maintenance.sandbox.getScopedUsage, {
        scopeId: retired.physicalScopeId,
      }),
    ).resolves.toMatchObject({ documentCount: 0, complete: true });
    await expect(
      second.query(api.sandbox.listFeedback, {
        order: "top",
        paginationOpts: { numItems: 20, cursor: null },
      }),
    ).resolves.toEqual(secondBefore);
    await expect(
      backend.action(internal.sandboxCleanup.runRetiredGenerationCleanup, {
        ownerKey: retired.ownerKey,
        generation: retired.generation,
      }),
    ).resolves.toMatchObject({ state: "complete" });
    vi.useRealTimers();
  });

  test("rejects a stale lease version and never cleans an active generation", async () => {
    const backend = hostedBackend();
    const user = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "cleanup-lease-user",
    });
    await user.action(api.sandbox.ensureSandbox, {});
    const active = await backend.run(async (ctx) => {
      const ownerKey = await deriveLogicalSandboxKey("cleanup-lease-user");
      const generation = await ctx.db
        .query("sandboxGenerations")
        .withIndex("by_owner_state", (query) =>
          query.eq("ownerKey", ownerKey).eq("state", "active"),
        )
        .unique();
      if (generation === null) throw new Error("missing active generation");
      return { ownerKey, generation: generation.generation };
    });

    await expect(
      backend.mutation(internal.sandboxCleanup.acquireCleanupLease, {
        ownerKey: active.ownerKey,
        generation: active.generation,
        workerId: "stale-worker",
        currentTime: Date.now(),
      }),
    ).resolves.toEqual({ state: "stale" });

    const before = await user.query(api.sandbox.listFeedback, {
      order: "top",
      paginationOpts: { numItems: 20, cursor: null },
    });
    await expect(
      backend.mutation(internal.sandboxCleanup.recordCleanupBatch, {
        ownerKey: active.ownerKey,
        generation: active.generation,
        workerId: "stale-worker",
        leaseVersion: 999,
        result: {
          contractVersion: 1,
          done: true,
          deleted: 0,
        },
        currentTime: Date.now(),
      }),
    ).resolves.toEqual({ state: "stale" });
    await expect(
      user.query(api.sandbox.listFeedback, {
        order: "top",
        paginationOpts: { numItems: 20, cursor: null },
      }),
    ).resolves.toEqual(before);
  });
});
