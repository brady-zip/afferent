/// <reference types="vite/client" />
// @ts-expect-error Node built-ins are implementation-only for this test export.
import { readdirSync } from "node:fs";
// @ts-expect-error Node built-ins are implementation-only for this test export.
import { createRequire } from "node:module";
// @ts-expect-error Node built-ins are implementation-only for this test export.
import { dirname, join, relative, sep } from "node:path";
// @ts-expect-error Node built-ins are implementation-only for this test export.
import { fileURLToPath, pathToFileURL } from "node:url";

import type { TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";

import schema from "./component/schema.js";

const require = createRequire(import.meta.url);
const rateLimiterRoot = dirname(
  require.resolve("@convex-dev/rate-limiter/package.json"),
);
const rateLimiterComponentRoot = join(rateLimiterRoot, "dist/component");
const rateLimiterSchema = (
  (await import(
    pathToFileURL(join(rateLimiterComponentRoot, "schema.js")).href
  )) as {
    default: SchemaDefinition<GenericSchema, boolean>;
  }
).default;

function listJavaScriptModules(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(
    (entry: { name: string; isDirectory(): boolean; isFile(): boolean }) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return listJavaScriptModules(path);
      return entry.isFile() && /\.(?:js|ts)$/.test(entry.name) ? [path] : [];
    },
  );
}

function loadRateLimiterModules() {
  const normalized: Record<string, () => Promise<unknown>> = {};
  for (const path of listJavaScriptModules(rateLimiterComponentRoot)) {
    const componentPath = relative(rateLimiterComponentRoot, path)
      .split(sep)
      .join("/");
    normalized[`./component/${componentPath}`] = () =>
      import(pathToFileURL(path).href);
  }
  return normalized;
}

function loadAfferentModules() {
  const componentRoot = join(
    dirname(fileURLToPath(import.meta.url)),
    "component",
  );
  const normalized: Record<string, () => Promise<unknown>> = {};
  for (const path of listJavaScriptModules(componentRoot)) {
    const componentPath = relative(componentRoot, path).split(sep).join("/");
    normalized[`./component/${componentPath}`] = () =>
      import(pathToFileURL(path).href);
  }
  return normalized;
}

export function register(
  testBackend: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
  name = "afferent",
) {
  testBackend.registerComponent(name, schema, loadAfferentModules());
  testBackend.registerComponent(
    `${name}/rateLimiter`,
    rateLimiterSchema,
    loadRateLimiterModules(),
  );
}

export default { register, schema };
