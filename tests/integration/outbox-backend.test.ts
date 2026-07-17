import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { api } from "../../src/component/_generated/api.js";
import schema from "../../src/component/schema.js";
import { withRateLimiter } from "../helpers/rate-limiter.js";

const modules = import.meta.glob("../../src/component/**/*.ts");

describe("outbox lease concurrency", () => {
  test("serializes two workers and rejects a stale ack after expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const backend = withRateLimiter(convexTest(schema, modules));
    await backend.run(async (ctx) => {
      const actorId = await ctx.db.insert("actors", {
        scopeId: "scope:concurrent",
        externalKey: "concurrent:recipient",
      });
      const eventId = await ctx.db.insert("notificationEvents", {
        scopeId: "scope:concurrent",
        type: "status_changed",
        initiatorActorId: actorId,
        entityId: "post:one",
        occurredAt: 1,
        guardKey: "concurrent:event",
      });
      await ctx.db.insert("notificationDeliveries", {
        scopeId: "scope:concurrent",
        eventId,
        actorId,
        type: "status_changed",
        entityId: "post:one",
        occurredAt: 1,
        sequence: 1,
        state: "pending",
        availableAt: 1,
        attempts: 0,
        leaseVersion: 0,
      });
    });

    const [left, right] = await Promise.all([
      backend.mutation(api.notifications.outbox.claimDeliveryBatch, {
        scopeId: "scope:concurrent",
        leaseOwner: "worker:left",
        limit: 50,
      }),
      backend.mutation(api.notifications.outbox.claimDeliveryBatch, {
        scopeId: "scope:concurrent",
        leaseOwner: "worker:right",
        limit: 50,
      }),
    ]);
    expect(left.leases.length + right.leases.length).toBe(1);
    const original = left.leases[0] ?? right.leases[0];
    vi.setSystemTime(301_001);
    const reclaimed = await backend.mutation(
      api.notifications.outbox.claimDeliveryBatch,
      { scopeId: "scope:concurrent", leaseOwner: "worker:new", limit: 1 },
    );
    expect(reclaimed.leases[0].leaseVersion).toBe(original.leaseVersion + 1);
    expect(
      await backend.mutation(api.notifications.outbox.ackDelivery, {
        scopeId: "scope:concurrent",
        deliveryId: original.id,
        leaseOwner: original.leaseOwner,
        leaseVersion: original.leaseVersion,
      }),
    ).toMatchObject({ ok: false, error: { code: "LEASE_LOST" } });
    vi.useRealTimers();
  });
});
