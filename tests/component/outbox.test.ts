import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { api, internal } from "../../src/component/_generated/api.js";
import schema from "../../src/component/schema.js";
import { withRateLimiter } from "../helpers/rate-limiter.js";

const modules = import.meta.glob("../../src/component/**/*.ts");
const LEASE_MS = 5 * 60 * 1000;

function backend() {
  return withRateLimiter(convexTest(schema, modules));
}

async function seedDelivery(
  testBackend: ReturnType<typeof backend>,
  args: {
    scopeId: string;
    recipientKey: string;
    availableAt?: number;
    attempts?: number;
    suffix?: string;
  },
) {
  return await testBackend.run(async (ctx) => {
    const actorId = await ctx.db.insert("actors", {
      scopeId: args.scopeId,
      externalKey: args.recipientKey,
    });
    const eventId = await ctx.db.insert("notificationEvents", {
      scopeId: args.scopeId,
      type: "status_changed",
      initiatorActorId: actorId,
      entityId: `post:${args.suffix ?? "one"}`,
      occurredAt: 100,
      guardKey: `guard:${args.scopeId}:${args.suffix ?? "one"}`,
    });
    const deliveryId = await ctx.db.insert("notificationDeliveries", {
      scopeId: args.scopeId,
      eventId,
      actorId,
      type: "status_changed",
      entityId: `post:${args.suffix ?? "one"}`,
      occurredAt: 100,
      sequence: 100,
      state: "pending",
      availableAt: args.availableAt ?? 100,
      attempts: args.attempts ?? 0,
      leaseVersion: 0,
    });
    return { actorId, deliveryId, eventId };
  });
}

describe("vendor-neutral notification outbox", () => {
  test("materializes one PII-free delivery row with the inbox recipient", async () => {
    const testBackend = backend();
    const seeded = await testBackend.run(async (ctx) => {
      const initiatorActorId = await ctx.db.insert("actors", {
        scopeId: "scope:materialize",
        externalKey: "materialize:initiator",
        displayName: "Private Initiator",
      });
      const recipientActorId = await ctx.db.insert("actors", {
        scopeId: "scope:materialize",
        externalKey: "materialize:recipient",
        displayName: "Private Recipient",
        avatarUrl: "https://example.com/private.png",
      });
      const eventId = await ctx.db.insert("notificationEvents", {
        scopeId: "scope:materialize",
        type: "status_changed",
        initiatorActorId,
        entityId: "post:opaque",
        occurredAt: 123,
        guardKey: "guard:materialize",
      });
      await ctx.db.insert("notificationEventRecipients", {
        scopeId: "scope:materialize",
        eventId,
        actorId: recipientActorId,
        state: "pending",
      });
      const jobId = await ctx.db.insert("notificationFanoutJobs", {
        scopeId: "scope:materialize",
        eventId,
        state: "pending",
        createdAt: 123,
      });
      return { eventId, jobId };
    });

    await testBackend.mutation(internal.jobs.fanout.continueFanout, {
      jobId: String(seeded.jobId),
    });
    const rows = await testBackend.run(async (ctx) => ({
      inbox: await ctx.db
        .query("notificationInbox")
        .withIndex("by_scope_event_actor", (q) =>
          q.eq("scopeId", "scope:materialize").eq("eventId", seeded.eventId),
        )
        .collect(),
      deliveries: await ctx.db
        .query("notificationDeliveries")
        .withIndex("by_scope_event_actor", (q) =>
          q.eq("scopeId", "scope:materialize").eq("eventId", seeded.eventId),
        )
        .collect(),
    }));
    expect(rows.inbox).toHaveLength(1);
    expect(rows.deliveries).toHaveLength(1);
    expect(rows.deliveries[0]).toMatchObject({
      entityId: "post:opaque",
      state: "pending",
      attempts: 0,
      leaseVersion: 0,
    });
    expect(JSON.stringify(rows.deliveries[0])).not.toMatch(
      /Private|avatar|email|provider|rendered/i,
    );
  });

  test("claims at most 50 rows, fences stale workers, and reclaims expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const testBackend = backend();
    for (let index = 0; index < 51; index += 1) {
      await seedDelivery(testBackend, {
        scopeId: "scope:lease",
        recipientKey: `lease:${index}`,
        suffix: String(index),
      });
    }

    const first = await testBackend.mutation(
      api.notifications.outbox.claimDeliveryBatch,
      { scopeId: "scope:lease", leaseOwner: "worker:a", limit: 999 },
    );
    expect(first.contractVersion).toBe(1);
    expect(first.leases).toHaveLength(50);
    expect(first.leases[0]).toMatchObject({
      contractVersion: 1,
      leaseOwner: "worker:a",
      leaseVersion: 1,
      leaseUntil: 1000 + LEASE_MS,
    });
    expect(Object.keys(first.leases[0].event).sort()).toEqual([
      "contractVersion",
      "entityId",
      "eventId",
      "occurredAt",
      "recipientKey",
      "sequence",
      "type",
    ]);

    const concurrent = await testBackend.mutation(
      api.notifications.outbox.claimDeliveryBatch,
      { scopeId: "scope:lease", leaseOwner: "worker:b", limit: 50 },
    );
    expect(concurrent.leases).toHaveLength(1);

    vi.setSystemTime(1000 + LEASE_MS + 1);
    const reclaimed = await testBackend.mutation(
      api.notifications.outbox.claimDeliveryBatch,
      { scopeId: "scope:lease", leaseOwner: "worker:b", limit: 1 },
    );
    expect(reclaimed.leases).toHaveLength(1);
    expect(reclaimed.leases[0].leaseVersion).toBe(2);
    expect(
      await testBackend.mutation(api.notifications.outbox.ackDelivery, {
        scopeId: "scope:lease",
        deliveryId: reclaimed.leases[0].id,
        leaseOwner: "worker:a",
        leaseVersion: 1,
      }),
    ).toEqual({
      contractVersion: 1,
      ok: false,
      error: { code: "LEASE_LOST" },
    });
    expect(
      await testBackend.mutation(api.notifications.outbox.ackDelivery, {
        scopeId: "scope:lease",
        deliveryId: reclaimed.leases[0].id,
        leaseOwner: "worker:b",
        leaseVersion: 2,
      }),
    ).toEqual({ contractVersion: 1, ok: true, status: "acked" });
    vi.useRealTimers();
  });

  test("releases with bounded backoff and parks attempt eight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const testBackend = backend();
    const seeded = await seedDelivery(testBackend, {
      scopeId: "scope:retry",
      recipientKey: "retry:recipient",
      attempts: 7,
    });
    const claimed = await testBackend.mutation(
      api.notifications.outbox.claimDeliveryBatch,
      { scopeId: "scope:retry", leaseOwner: "worker:retry", limit: 1 },
    );
    expect(
      await testBackend.mutation(api.notifications.outbox.releaseDelivery, {
        scopeId: "scope:retry",
        deliveryId: String(seeded.deliveryId),
        leaseOwner: "worker:stale",
        leaseVersion: claimed.leases[0].leaseVersion,
      }),
    ).toEqual({
      contractVersion: 1,
      ok: false,
      error: { code: "LEASE_LOST" },
    });
    expect(
      await testBackend.mutation(api.notifications.outbox.releaseDelivery, {
        scopeId: "scope:retry",
        deliveryId: String(seeded.deliveryId),
        leaseOwner: "worker:retry",
        leaseVersion: claimed.leases[0].leaseVersion,
      }),
    ).toEqual({ contractVersion: 1, ok: true, status: "dead_letter" });
    const parked = await testBackend.run((ctx) => ctx.db.get(seeded.deliveryId));
    expect(parked).toMatchObject({ state: "dead_letter", attempts: 8 });

    const retry = await seedDelivery(testBackend, {
      scopeId: "scope:retry",
      recipientKey: "retry:first",
      suffix: "first",
    });
    const first = await testBackend.mutation(
      api.notifications.outbox.claimDeliveryBatch,
      { scopeId: "scope:retry", leaseOwner: "worker:first", limit: 1 },
    );
    expect(
      await testBackend.mutation(api.notifications.outbox.releaseDelivery, {
        scopeId: "scope:retry",
        deliveryId: String(retry.deliveryId),
        leaseOwner: "worker:first",
        leaseVersion: first.leases[0].leaseVersion,
      }),
    ).toEqual({
      contractVersion: 1,
      ok: true,
      status: "pending",
      availableAt: 40_000,
    });
    vi.useRealTimers();
  });

  test("discards anonymized recipients, isolates scopes, and prunes acked rows", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(50_000);
    const testBackend = backend();
    const alpha = await seedDelivery(testBackend, {
      scopeId: "scope:alpha",
      recipientKey: "alpha:recipient",
    });
    await seedDelivery(testBackend, {
      scopeId: "scope:beta",
      recipientKey: "beta:recipient",
    });
    await testBackend.run(async (ctx) => {
      await ctx.db.patch(alpha.actorId, {
        externalKey: "afferent:anonymous:v1:deadbeef",
      });
    });

    expect(
      await testBackend.mutation(api.notifications.outbox.claimDeliveryBatch, {
        scopeId: "scope:alpha",
        leaseOwner: "worker:alpha",
        limit: 50,
      }),
    ).toMatchObject({ leases: [] });
    const beta = await testBackend.mutation(
      api.notifications.outbox.claimDeliveryBatch,
      { scopeId: "scope:beta", leaseOwner: "worker:beta", limit: 50 },
    );
    expect(beta.leases).toHaveLength(1);
    await testBackend.mutation(api.notifications.outbox.ackDelivery, {
      scopeId: "scope:beta",
      deliveryId: beta.leases[0].id,
      leaseOwner: "worker:beta",
      leaseVersion: beta.leases[0].leaseVersion,
    });
    expect(
      await testBackend.mutation(internal.jobs.outbox.pruneAckedDeliveries, {
        scopeId: "scope:beta",
        before: 50_001,
      }),
    ).toEqual({ deleted: 1, hasMore: false });
    vi.useRealTimers();
  });
});
