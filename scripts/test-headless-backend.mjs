import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ConvexHttpClient } from "convex/browser";
import { ConvexReactClient } from "convex/react";
import { makeFunctionReference } from "convex/server";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = await mkdtemp(
  join(tmpdir(), "afferent-headless-backend-"),
);
const convexBinary = join(repositoryRoot, "node_modules/.bin/convex");
let developmentProcess;
let setupComplete = false;

const schemaSource = `
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  controls: defineTable({ key: v.string(), mode: v.string() }).index("by_key", ["key"]),
  items: defineTable({ position: v.number(), label: v.string(), padding: v.string() }).index("by_position", ["position"]),
});
`;

const harnessSource = `
import { mutation, query } from "./_generated/server.js";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

async function mode(ctx) {
  return (await ctx.db.query("controls").withIndex("by_key", q => q.eq("key", "fault")).unique())?.mode ?? "none";
}

export const setMode = mutation({
  args: { mode: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.query("controls").withIndex("by_key", q => q.eq("key", "fault")).unique();
    if (row) await ctx.db.patch(row._id, { mode: args.mode });
    else await ctx.db.insert("controls", { key: "fault", mode: args.mode });
    return null;
  },
});

export const replaceItems = mutation({
  args: { labels: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const item of await ctx.db.query("items").collect()) await ctx.db.delete(item._id);
    for (let index = 0; index < args.labels.length; index += 1) {
      await ctx.db.insert("items", {
        position: index,
        label: args.labels[index],
        padding: "x".repeat(1024),
      });
    }
    return null;
  },
});

export const direct = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    if ((await mode(ctx)) === "direct") {
      throw new ConvexError({ code: "TRANSIENT", message: "direct fault" });
    }
    const items = await ctx.db.query("items").withIndex("by_position").collect();
    return { contractVersion: 1, count: items.length };
  },
});

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, args) => {
    const currentMode = await mode(ctx);
    if (currentMode === "first" && args.paginationOpts.cursor === null) {
      throw new ConvexError({ code: "TRANSIENT", message: "first page fault" });
    }
    if (currentMode === "later" && args.paginationOpts.cursor !== null) {
      throw new ConvexError({ code: "TRANSIENT", message: "later page fault" });
    }
    const paginationOpts = currentMode === "split"
      ? { ...args.paginationOpts, maximumBytesRead: 2300 }
      : args.paginationOpts;
    const result = await ctx.db.query("items").withIndex("by_position").paginate(paginationOpts);
    return {
      ...result,
      page: result.page.map(item => ({ id: String(item._id), label: item.label })),
    };
  },
});
`;

function reference(name) {
  return makeFunctionReference(`harness:${name}`);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repositoryRoot,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function stopBackend() {
  if (!developmentProcess || developmentProcess.exitCode !== null) return;
  developmentProcess.kill("SIGINT");
  await Promise.race([
    new Promise((resolve) => developmentProcess.once("close", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  if (developmentProcess.exitCode === null) developmentProcess.kill("SIGTERM");
}

async function startBackend() {
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
  await Promise.race([
    new Promise((resolve, reject) => {
      const inspect = (chunk) => {
        const text = chunk.toString();
        output += text;
        if (output.includes("Convex functions ready!")) resolve();
      };
      developmentProcess.stdout.on("data", inspect);
      developmentProcess.stderr.on("data", inspect);
      developmentProcess.once("error", reject);
      developmentProcess.once("close", (code) => {
        if (!output.includes("Convex functions ready!")) {
          reject(
            new Error(
              `Convex dev exited before readiness (${code})\n${output}`,
            ),
          );
        }
      });
    }),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Timed out starting Convex backend")),
        30_000,
      ),
    ),
  ]);
}

function deploymentUrl(source) {
  const match = /^CONVEX_URL=(?<url>.+)$/mu.exec(source);
  if (!match)
    throw new Error("Convex local deployment did not write CONVEX_URL");
  return match.groups.url.trim();
}

async function waitFor(store, predicate, label) {
  const current = store.getSnapshot();
  if (predicate(current)) return current;
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(
        new Error(
          `Timed out waiting for ${label}: ${JSON.stringify(store.getSnapshot())}`,
        ),
      );
    }, 15_000);
    const unsubscribe = store.subscribe(() => {
      const snapshot = store.getSnapshot();
      if (!predicate(snapshot)) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(snapshot);
    });
  });
}

try {
  const build = await run("npm", ["run", "build"]);
  if (build.code !== 0) throw new Error(build.stderr || build.stdout);
  const queryModule = await import(
    `${pathToFileURL(join(repositoryRoot, "dist/react/query.js")).href}?${Date.now()}`
  );
  assert.equal(typeof queryModule.createDirectWatchStore, "function");
  assert.equal(typeof queryModule.createPaginatedWatchStore, "function");

  await mkdir(join(temporaryRoot, "convex"), { recursive: true });
  await symlink(
    join(repositoryRoot, "node_modules"),
    join(temporaryRoot, "node_modules"),
  );
  await writeFile(
    join(temporaryRoot, "package.json"),
    '{"type":"module","dependencies":{"convex":"1.42.2"}}\n',
  );
  await writeFile(join(temporaryRoot, "convex/schema.ts"), schemaSource);
  await writeFile(join(temporaryRoot, "convex/harness.ts"), harnessSource);
  await startBackend();
  const url = deploymentUrl(
    await readFile(join(temporaryRoot, ".env.local"), "utf8"),
  );
  const http = new ConvexHttpClient(url);
  const react = new ConvexReactClient(url, { unsavedChangesWarning: false });
  assert.equal(typeof react.watchQuery, "function");
  const setMode = reference("setMode");
  const replaceItems = reference("replaceItems");
  const direct = reference("direct");
  const list = reference("list");
  await http.mutation(replaceItems, { labels: ["a", "b", "c", "d", "e", "f"] });
  setupComplete = true;

  try {
    await http.mutation(setMode, { mode: "direct" });
    const directStore = queryModule.createDirectWatchStore({
      client: react,
      query: direct,
      args: {},
      generation: 1,
    });
    const stopDirect = directStore.subscribe(() => {});
    await waitFor(
      directStore,
      (snapshot) => snapshot.status === "error",
      "initial direct failure",
    );
    await http.mutation(setMode, { mode: "none" });
    await waitFor(
      directStore,
      (snapshot) => snapshot.status === "ready",
      "direct recovery",
    );
    await http.mutation(setMode, { mode: "direct" });
    await waitFor(
      directStore,
      (snapshot) => snapshot.status === "error",
      "direct refetch failure",
    );
    await http.mutation(setMode, { mode: "none" });
    await waitFor(
      directStore,
      (snapshot) => snapshot.status === "ready",
      "direct refetch recovery",
    );

    const pageStore = queryModule.createPaginatedWatchStore({
      client: react,
      query: list,
      args: {},
      generation: 1,
      initialNumItems: 2,
    });
    const stopPages = pageStore.subscribe(() => {});
    const first = await waitFor(
      pageStore,
      (snapshot) => snapshot.status === "CanLoadMore",
      "first page",
    );
    assert.deepEqual(
      first.results.map((item) => item.label),
      ["a", "b"],
    );
    await http.mutation(setMode, { mode: "later" });
    pageStore.loadMore(2);
    const laterFailure = await waitFor(
      pageStore,
      (snapshot) => snapshot.status === "Error",
      "later-page failure",
    );
    assert.deepEqual(
      laterFailure.results.map((item) => item.label),
      ["a", "b"],
    );
    await http.mutation(setMode, { mode: "none" });
    const recovered = await waitFor(
      pageStore,
      (snapshot) =>
        snapshot.results.length === 4 && snapshot.status !== "Error",
      "later-page recovery",
    );
    assert.deepEqual(
      recovered.results.map((item) => item.label),
      ["a", "b", "c", "d"],
    );

    await http.mutation(replaceItems, {
      labels: ["zero", "a", "b", "c", "d", "e", "f"],
    });
    const grown = await waitFor(
      pageStore,
      (snapshot) => snapshot.results.some((item) => item.label === "zero"),
      "reactive growth",
    );
    assert.equal(
      new Set(grown.results.map((item) => item.id)).size,
      grown.results.length,
    );
    await http.mutation(replaceItems, { labels: ["a", "b", "c"] });
    const shrunk = await waitFor(
      pageStore,
      (snapshot) => snapshot.results.every((item) => item.label !== "zero"),
      "reactive shrink",
    );
    assert.equal(
      new Set(shrunk.results.map((item) => item.id)).size,
      shrunk.results.length,
    );

    await http.mutation(replaceItems, {
      labels: ["a", "b", "c", "d", "e", "f"],
    });
    await http.mutation(setMode, { mode: "split" });
    const split = await waitFor(
      pageStore,
      (snapshot) =>
        snapshot.status !== "LoadingMore" && snapshot.results.length > 0,
      "reactive split",
    );
    assert.equal(
      new Set(split.results.map((item) => item.id)).size,
      split.results.length,
    );
    await http.mutation(setMode, { mode: "none" });

    stopDirect();
    stopPages();
    directStore.dispose();
    pageStore.dispose();
    await react.close();
    console.log("Real Convex headless watch matrix passed");
  } catch (error) {
    throw new Error("Headless backend contract assertion failed", {
      cause: error,
    });
  }
} catch (error) {
  if (setupComplete) throw error;
  throw new Error("Headless backend harness setup failed", { cause: error });
} finally {
  await stopBackend();
  await rm(temporaryRoot, { force: true, recursive: true });
}
