import { describe, expect, it, vi } from "vitest";

import {
  createSandboxLifecycle,
  type SeedGeneration,
} from "../../example/convex/sandboxLifecycle.js";
import {
  deriveLogicalSandboxKey,
  derivePhysicalSandboxScope,
} from "../../example/convex/sandboxScope.js";

const USER = "verified-convex-auth-user";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("sandbox physical scope derivation", () => {
  it("is deterministic, fixed length, opaque, and generation-fenced", async () => {
    const owner = await deriveLogicalSandboxKey(USER);
    const sameOwner = await deriveLogicalSandboxKey(USER);
    const otherOwner = await deriveLogicalSandboxKey("another-user");
    const first = await derivePhysicalSandboxScope(owner, 1);
    const firstRetry = await derivePhysicalSandboxScope(owner, 1);
    const second = await derivePhysicalSandboxScope(owner, 2);
    const other = await derivePhysicalSandboxScope(otherOwner, 1);

    expect(owner).toBe(sameOwner);
    expect(owner).toHaveLength(43);
    expect(first).toBe(firstRetry);
    expect(first).toHaveLength(43);
    expect(new Set([first, second, other])).toHaveLength(3);
    expect(first).not.toContain(USER);
    expect(owner).not.toContain(USER);
    expect(first).not.toContain("1");
  });
});

describe("generation-fenced sandbox lifecycle", () => {
  it("coalesces concurrent first access behind one pending generation", async () => {
    const gate = deferred();
    const seed = vi.fn<SeedGeneration>(async () => gate.promise);
    const lifecycle = createSandboxLifecycle({ seedGeneration: seed });

    const first = lifecycle.ensure(USER);
    const concurrent = lifecycle.ensure(USER);
    await vi.waitFor(() => expect(seed).toHaveBeenCalledTimes(1));

    const preparing = await lifecycle.inspectForTest(USER);
    expect(preparing.activeGeneration).toBeNull();
    expect(preparing.pendingGeneration).toBe(1);

    gate.resolve();
    const [firstResult, concurrentResult] = await Promise.all([
      first,
      concurrent,
    ]);
    expect(firstResult).toEqual(concurrentResult);
    expect(firstResult.state).toBe("ready");
    expect(seed).toHaveBeenCalledTimes(1);
    expect(await lifecycle.resolvePhysicalScope(USER)).toBe(
      (await lifecycle.inspectForTest(USER)).activePhysicalScope,
    );
  });

  it("coalesces reset and switches only after the complete seed is ready", async () => {
    const resetGate = deferred();
    const seed = vi
      .fn<SeedGeneration>()
      .mockResolvedValueOnce()
      .mockImplementationOnce(async () => resetGate.promise);
    const lifecycle = createSandboxLifecycle({ seedGeneration: seed });
    await lifecycle.ensure(USER);
    const before = await lifecycle.inspectForTest(USER);

    const reset = lifecycle.reset(USER);
    const concurrent = lifecycle.reset(USER);
    await vi.waitFor(() => expect(seed).toHaveBeenCalledTimes(2));

    const pending = await lifecycle.inspectForTest(USER);
    expect(pending.activeGeneration).toBe(before.activeGeneration);
    expect(pending.pendingGeneration).toBe(2);
    await expect(lifecycle.resolvePhysicalScope(USER)).rejects.toThrow(
      "SANDBOX_NOT_READY",
    );

    resetGate.resolve();
    const [result, concurrentResult] = await Promise.all([reset, concurrent]);
    expect(result).toEqual(concurrentResult);
    const after = await lifecycle.inspectForTest(USER);
    expect(after.activeGeneration).toBe(2);
    expect(after.pendingGeneration).toBeNull();
    expect(after.retiredGenerations).toEqual([1]);
    expect(after.activePhysicalScope).not.toBe(before.activePhysicalScope);
  });

  it("retains the previous active generation when pending seed fails", async () => {
    const seedFailure = new Error("injected seed failure");
    const seed = vi
      .fn<SeedGeneration>()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(seedFailure)
      .mockResolvedValueOnce();
    const lifecycle = createSandboxLifecycle({ seedGeneration: seed });
    await lifecycle.ensure(USER);
    const before = await lifecycle.inspectForTest(USER);

    const failed = await lifecycle.reset(USER);
    expect(failed.state).toBe("error");
    expect(JSON.stringify(failed)).not.toContain(seedFailure.message);
    const retained = await lifecycle.inspectForTest(USER);
    expect(retained.activeGeneration).toBe(before.activeGeneration);
    expect(retained.failedGenerations).toEqual([2]);
    await expect(lifecycle.resolvePhysicalScope(USER)).resolves.toBe(
      before.activePhysicalScope,
    );

    await expect(lifecycle.reset(USER)).resolves.toMatchObject({
      state: "ready",
    });
    expect((await lifecycle.inspectForTest(USER)).activeGeneration).toBe(3);
  });

  it("returns a closed visitor-safe lifecycle shape", async () => {
    const lifecycle = createSandboxLifecycle({
      seedGeneration: async () => undefined,
    });
    const result = await lifecycle.ensure(USER);
    const serialized = JSON.stringify(result);

    expect(Object.keys(result).sort()).toEqual([
      "expiresAt",
      "lastActivityAt",
      "message",
      "state",
    ]);
    expect(serialized).not.toContain(USER);
    expect(serialized).not.toMatch(
      /owner|logical|scopeId|generation|lease|provider/iu,
    );
  });
});
