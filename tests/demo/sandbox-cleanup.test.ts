import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import {
  api,
  components,
  internal,
} from "../../example/convex/_generated/api.js";
import schema from "../../example/convex/schema.js";
import { deriveLogicalSandboxKey } from "../../example/convex/sandboxScope.js";
import { SANDBOX_INACTIVITY_MS } from "../../example/convex/sandboxLifecycle.js";
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
      sessionGeneration: 0,
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

    await backend.action(internal.sandboxCleanup.runRetiredGenerationCleanup, {
      ownerKey: retired.ownerKey,
      generation: retired.generation,
    });
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
        sessionGeneration: 0,
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
      sessionGeneration: 0,
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
        sessionGeneration: 0,
      }),
    ).resolves.toEqual(before);
  });

  test("expires an indexed bounded owner page and reuses the shared cleanup worker", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T00:00:00.000Z"));
    const backend = hostedBackend();
    const expired = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "scheduled-expired-owner",
    });
    const active = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "scheduled-active-owner",
    });
    await expired.action(api.sandbox.ensureSandbox, {});
    await active.action(api.sandbox.ensureSandbox, {});
    const expiredOwnerKey = await deriveLogicalSandboxKey(
      "scheduled-expired-owner",
    );
    await backend.run(async (ctx) => {
      const owner = await ctx.db
        .query("sandboxOwners")
        .withIndex("by_owner_key", (query) =>
          query.eq("ownerKey", expiredOwnerKey),
        )
        .unique();
      if (owner === null) throw new Error("missing owner fixture");
      await ctx.db.patch(owner._id, {
        lastActivityAt: Date.now() - SANDBOX_INACTIVITY_MS - 1,
      });
    });

    await backend.mutation(internal.sandboxCleanup.scanExpiredSandboxes, {
      currentTime: Date.now(),
    });
    await expect(
      expired.query(api.sandbox.getSandboxLifecycle, {}),
    ).resolves.toMatchObject({ state: "expired" });
    await expect(
      active.query(api.sandbox.getSandboxLifecycle, {}),
    ).resolves.toMatchObject({ state: "ready" });
    await backend.finishAllScheduledFunctions(() => vi.runAllTimers());
    await expect(
      expired.action(api.sandbox.ensureSandbox, {}),
    ).resolves.toMatchObject({ state: "ready" });
    const states = await backend.run(async (ctx) => {
      const generations = await ctx.db
        .query("sandboxGenerations")
        .withIndex("by_owner_generation", (query) =>
          query.eq("ownerKey", expiredOwnerKey),
        )
        .collect();
      return generations.map(({ state, cleanupState }) => ({
        state,
        cleanupState,
      }));
    });
    expect(states).toContainEqual({
      state: "retired",
      cleanupState: "complete",
    });
    expect(states).toContainEqual({
      state: "active",
      cleanupState: undefined,
    });
    vi.useRealTimers();
  });
});
