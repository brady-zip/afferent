import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  sandboxOwners: defineTable({
    ownerKey: v.string(),
    activeGeneration: v.optional(v.number()),
    pendingGeneration: v.optional(v.number()),
    nextGeneration: v.number(),
    lastActivityAt: v.number(),
    lifecycleState: v.union(
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("resetting"),
      v.literal("expired"),
      v.literal("error"),
    ),
    leaseOwner: v.optional(v.string()),
    leaseUntil: v.optional(v.number()),
    leaseVersion: v.number(),
  }).index("by_owner_key", ["ownerKey"]),
  sandboxGenerations: defineTable({
    ownerKey: v.string(),
    generation: v.number(),
    physicalScopeId: v.string(),
    state: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("retired"),
      v.literal("failed"),
    ),
    createdAt: v.number(),
    activatedAt: v.optional(v.number()),
    retiredAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    seedVersion: v.number(),
    seedStep: v.number(),
    leaseVersion: v.number(),
  })
    .index("by_owner_generation", ["ownerKey", "generation"])
    .index("by_owner_state", ["ownerKey", "state"]),
});
