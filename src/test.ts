/// <reference types="vite/client" />
import type { TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";
import rateLimiterTest from "@convex-dev/rate-limiter/test";

import schema from "./component/schema.js";

const modules = import.meta.glob("./component/**/*.ts");

export function register(
  testBackend: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
  name = "afferent",
) {
  testBackend.registerComponent(name, schema, modules);
  rateLimiterTest.register(testBackend, `${name}/rateLimiter`);
}

export default { register, schema, modules };
