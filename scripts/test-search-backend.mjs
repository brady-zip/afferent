import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-search-backend-"));
const convexBinary = join(repositoryRoot, "node_modules/.bin/convex");
const SEARCH_HARD_LIMIT = 50;
let developmentProcess;

const harnessSource = `
import { componentsGeneric, mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
const components = componentsGeneric();
export const seed = mutation({ args: { count: v.number() }, returns: v.null(), handler: (ctx, args) => ctx.runMutation(components.probe.search.seed, args) });
export const boundedSearch = query({ args: { query: v.string() }, returns: v.any(), handler: (ctx, args) => ctx.runQuery(components.probe.search.boundedSearch, args) });
export const nativePaginatedSearch = query({ args: { query: v.string() }, returns: v.any(), handler: (ctx, args) => ctx.runQuery(components.probe.search.nativePaginatedSearch, { ...args, paginationOpts: { numItems: 10, cursor: null } }) });
export const helperPaginatedSearch = query({ args: { query: v.string() }, returns: v.any(), handler: (ctx, args) => ctx.runQuery(components.probe.search.helperPaginatedSearch, { ...args, paginationOpts: { numItems: 10, cursor: null } }) });
`;

const probeSchema = `
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({ items: defineTable({ scopeId: v.string(), visibilityKey: v.string(), searchText: v.string() }).searchIndex("search_items", { searchField: "searchText", filterFields: ["scopeId", "visibilityKey"] }) });
`;

const probeFunctions = `
import { paginator } from "convex-helpers/server/pagination";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import schema from "./schema.js";
const SEARCH_HARD_LIMIT = 50;
export const seed = mutation({ args: { count: v.number() }, returns: v.null(), handler: async (ctx, args) => { for (let index = 0; index < args.count; index += 1) await ctx.db.insert("items", { scopeId: "alpha", visibilityKey: "visible", searchText: \`export feedback \${index}\` }); return null; } });
export const boundedSearch = query({ args: { query: v.string() }, returns: v.any(), handler: async (ctx, args) => { const rows = await ctx.db.query("items").withSearchIndex("search_items", (q) => q.search("searchText", args.query).eq("scopeId", "alpha").eq("visibilityKey", "visible")).take(SEARCH_HARD_LIMIT + 1); return { items: rows.slice(0, SEARCH_HARD_LIMIT), hasMore: rows.length > SEARCH_HARD_LIMIT }; } });
export const nativePaginatedSearch = query({ args: { query: v.string(), paginationOpts: v.any() }, returns: v.any(), handler: (ctx, args) => ctx.db.query("items").withSearchIndex("search_items", (q) => q.search("searchText", args.query).eq("scopeId", "alpha").eq("visibilityKey", "visible")).paginate(args.paginationOpts) });
export const helperPaginatedSearch = query({ args: { query: v.string(), paginationOpts: v.any() }, returns: v.any(), handler: (ctx, args) => paginator(ctx.db, schema).query("items").withSearchIndex("search_items", (q) => q.search("searchText", args.query).eq("scopeId", "alpha").eq("visibilityKey", "visible")).paginate(args.paginationOpts) });
`;

function ref(name) {
  return makeFunctionReference(`harness:${name}`);
}

async function stop() {
  if (!developmentProcess || developmentProcess.exitCode !== null) return;
  developmentProcess.kill("SIGINT");
  await Promise.race([
    new Promise((resolve) => developmentProcess.once("close", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  if (developmentProcess.exitCode === null) developmentProcess.kill("SIGTERM");
}

async function start() {
  developmentProcess = spawn(
    convexBinary,
    ["dev", "--typecheck", "disable", "--tail-logs", "disable"],
    {
      cwd: temporaryRoot,
      env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  const ready = new Promise((resolve, reject) => {
    const inspect = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
      if (output.includes("Convex functions ready!")) resolve();
    };
    developmentProcess.stdout.on("data", inspect);
    developmentProcess.stderr.on("data", inspect);
    developmentProcess.once("error", reject);
    developmentProcess.once("close", (code) => {
      if (!output.includes("Convex functions ready!")) {
        reject(new Error(`Convex dev exited before readiness (${code})`));
      }
    });
  });
  await Promise.race([
    ready,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timed out starting Convex backend")), 30_000),
    ),
  ]);
}

function deploymentUrl(envFile) {
  const match = /^CONVEX_URL=(?<url>.+)$/mu.exec(envFile);
  if (!match) throw new Error("Convex local deployment did not write CONVEX_URL");
  return match.groups.url.trim();
}

async function rejects(promise) {
  try {
    await promise;
  } catch (error) {
    return String(error);
  }
  throw new Error("Expected query to reject");
}

try {
  await mkdir(join(temporaryRoot, "convex"), { recursive: true });
  await mkdir(join(temporaryRoot, "probe"), { recursive: true });
  await cp(join(repositoryRoot, "src/component"), join(temporaryRoot, "component"), {
    recursive: true,
    filter: (source) => !source.includes("/_generated"),
  });
  await symlink(join(repositoryRoot, "node_modules"), join(temporaryRoot, "node_modules"));
  await writeFile(join(temporaryRoot, "package.json"), '{"type":"module","dependencies":{"convex":"1.42.2","convex-helpers":"0.1.120"}}\n');
  await writeFile(join(temporaryRoot, "probe/convex.config.ts"), 'import { defineComponent } from "convex/server"; export default defineComponent("searchProbe");\n');
  await writeFile(join(temporaryRoot, "probe/schema.ts"), probeSchema);
  await writeFile(join(temporaryRoot, "probe/search.ts"), probeFunctions);
  await writeFile(join(temporaryRoot, "convex/harness.ts"), harnessSource);
  await writeFile(
    join(temporaryRoot, "convex/convex.config.ts"),
    [
      'import { defineApp } from "convex/server";',
      'import afferent from "../component/convex.config.js";',
      'import probe from "../probe/convex.config.js";',
      "const app = defineApp();",
      'app.use(afferent, { name: "afferent" });',
      'app.use(probe, { name: "probe" });',
      "export default app;",
      "",
    ].join("\n"),
  );
  await start();

  const client = new ConvexHttpClient(
    deploymentUrl(await readFile(join(temporaryRoot, ".env.local"), "utf8")),
  );
  await client.mutation(ref("seed"), { count: SEARCH_HARD_LIMIT + 2 });
  const bounded = await client.query(ref("boundedSearch"), {
    query: "export feedback",
  });
  assert.equal(bounded.items.length, SEARCH_HARD_LIMIT);
  assert.equal(bounded.hasMore, true);
  assert.match(
    await rejects(client.query(ref("nativePaginatedSearch"), { query: "export" })),
    /paginate|pagination/iu,
  );
  assert.match(
    await rejects(client.query(ref("helperPaginatedSearch"), { query: "export" })),
    /paginate|search/iu,
  );
  console.log("Real Convex bounded search and pagination boundary passed");
} finally {
  await stop();
  await rm(temporaryRoot, { force: true, recursive: true });
}
