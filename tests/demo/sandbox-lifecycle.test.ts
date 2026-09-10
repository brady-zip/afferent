import { readFile } from "node:fs/promises";
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";

import { api } from "../../example/convex/_generated/api.js";
import schema from "../../example/convex/schema.js";
import {
  createSandboxLifecycle,
  type SeedGeneration,
} from "../../example/convex/sandboxLifecycle.js";
import {
  deriveLogicalSandboxKey,
  derivePhysicalSandboxScope,
} from "../../example/convex/sandboxScope.js";
import { register } from "../../src/test.js";

const USER = "verified-convex-auth-user";
const hostedModules = import.meta.glob("../../example/convex/**/*.ts");

function hostedBackend() {
  const backend = convexTest(schema, hostedModules);
  register(backend, "showcase");
  register(backend, "sandbox");
  return backend;
}

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
    expect(first).not.toContain(`${owner}:1`);
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
    const ready = await lifecycle.inspectForTest(USER);
    expect(await lifecycle.resolvePhysicalScope(USER)).toBe(
      ready.activePhysicalScope,
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
    const recovered = await lifecycle.inspectForTest(USER);
    expect(recovered.activeGeneration).toBe(3);
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

  it("re-creates an active sandbox after seven days without activity", async () => {
    let now = 1000;
    const seed = vi.fn<SeedGeneration>(async () => undefined);
    const lifecycle = createSandboxLifecycle({
      seedGeneration: seed,
      now: () => now,
    });
    await lifecycle.ensure(USER);
    const first = await lifecycle.inspectForTest(USER);

    now += 7 * 24 * 60 * 60 * 1000 + 1;
    await lifecycle.ensure(USER);
    const refreshed = await lifecycle.inspectForTest(USER);

    expect(seed).toHaveBeenCalledTimes(2);
    expect(refreshed.activeGeneration).toBe(2);
    expect(refreshed.activePhysicalScope).not.toBe(first.activePhysicalScope);
    expect(refreshed.retiredGenerations).toEqual([1]);
  });

  it("mounts the canonical sandbox surface behind empty lifecycle intents", async () => {
    const source = await readFile(
      new URL("../../example/convex/sandbox.ts", import.meta.url),
      "utf8",
    );
    const expectedOperations = [
      "listFeedback",
      "listComments",
      "resolvePost",
      "searchFeedback",
      "listRoadmapGroup",
      "listPublishedChangelog",
      "createPost",
      "setVote",
      "addComment",
      "listNotifications",
      "listAdminFeedback",
      "setPostStatus",
      "createChangelogDraft",
      "publishChangelog",
    ];
    for (const operation of expectedOperations) {
      expect(source).toContain(`export const ${operation} =`);
    }
    expect(source).toMatch(
      /export const ensureSandbox = action\(\{\s*args: \{\}/u,
    );
    expect(source).toMatch(
      /export const resetSandbox = action\(\{\s*args: \{\}/u,
    );
    expect(source).not.toMatch(
      /args:\s*\{[^}]*\b(?:ownerKey|userId|isAdmin|scopeId|generation)\b/su,
    );
  });
});

describe("persisted hosted sandbox lifecycle", () => {
  it("fails closed when anonymous and activates a fully seeded private sandbox", async () => {
    const backend = hostedBackend();
    await expect(backend.action(api.sandbox.ensureSandbox, {})).rejects.toThrow(
      "AUTHENTICATION_REQUIRED",
    );

    const user = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "persisted-user",
    });
    await expect(
      user.action(api.sandbox.ensureSandbox, {}),
    ).resolves.toMatchObject({
      state: "ready",
    });
    await expect(
      user.query(api.sandbox.getSandboxLifecycle, {}),
    ).resolves.toMatchObject({
      state: "ready",
    });

    const feedback = await user.query(api.sandbox.listFeedback, {
      order: "top",
      paginationOpts: { numItems: 20, cursor: null },
      sessionGeneration: 0,
    });
    expect(feedback.page.length).toBeGreaterThan(0);
    expect(JSON.stringify(feedback)).not.toContain("physicalScopeId");
  });

  it("restores the deterministic baseline in a new generation without exposing lifecycle identifiers", async () => {
    const backend = hostedBackend();
    const user = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "reset-user",
    });
    await user.action(api.sandbox.ensureSandbox, {});
    const before = await user.query(api.sandbox.listFeedback, {
      order: "top",
      paginationOpts: { numItems: 20, cursor: null },
      sessionGeneration: 0,
    });

    const reset = await user.action(api.sandbox.resetSandbox, {});
    expect(reset).toMatchObject({ state: "ready" });
    expect(JSON.stringify(reset)).not.toMatch(
      /owner|logical|scopeId|generation|lease|provider/iu,
    );
    const after = await user.query(api.sandbox.listFeedback, {
      order: "top",
      paginationOpts: { numItems: 20, cursor: null },
      sessionGeneration: 1,
    });
    expect(after.page.map((post) => post.title)).toEqual(
      before.page.map((post) => post.title),
    );
    expect(after.page.map((post) => post.id)).not.toEqual(
      before.page.map((post) => post.id),
    );
  });

  it("replaces an expired persisted generation and keeps another visitor unchanged", async () => {
    const backend = hostedBackend();
    const first = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "expired-user",
    });
    const second = backend.withIdentity({
      issuer: "https://afferent.test",
      subject: "other-user",
    });
    await first.action(api.sandbox.ensureSandbox, {});
    await second.action(api.sandbox.ensureSandbox, {});
    const firstBefore = await first.query(api.sandbox.listFeedback, {
      order: "top",
      paginationOpts: { numItems: 20, cursor: null },
      sessionGeneration: 0,
    });
    const secondBefore = await second.query(api.sandbox.listFeedback, {
      order: "top",
      paginationOpts: { numItems: 20, cursor: null },
      sessionGeneration: 0,
    });

    await backend.run(async (ctx) => {
      const ownerKey = await deriveLogicalSandboxKey("expired-user");
      const owner = await ctx.db
        .query("sandboxOwners")
        .withIndex("by_owner_key", (query) => query.eq("ownerKey", ownerKey))
        .unique();
      if (owner === null) throw new Error("missing owner fixture");
      await ctx.db.patch(owner._id, { lastActivityAt: 0 });
    });
    await expect(
      first.query(api.sandbox.getSandboxLifecycle, {}),
    ).resolves.toMatchObject({
      state: "expired",
    });
    await expect(
      first.action(api.sandbox.ensureSandbox, {}),
    ).resolves.toMatchObject({
      state: "ready",
    });

    const firstAfter = await first.query(api.sandbox.listFeedback, {
      order: "top",
      paginationOpts: { numItems: 20, cursor: null },
      sessionGeneration: 1,
    });
    const secondAfter = await second.query(api.sandbox.listFeedback, {
      order: "top",
      paginationOpts: { numItems: 20, cursor: null },
      sessionGeneration: 0,
    });
    expect(firstAfter.page.map((post) => post.id)).not.toEqual(
      firstBefore.page.map((post) => post.id),
    );
    expect(secondAfter).toEqual(secondBefore);
  });
});
