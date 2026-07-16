import rateLimiterTest from "@convex-dev/rate-limiter/test";
import type { TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";

export function withRateLimiter<
  Backend extends TestConvex<SchemaDefinition<GenericSchema, boolean>>,
>(backend: Backend): Backend {
  rateLimiterTest.register(backend, "rateLimiter");
  return backend;
}
