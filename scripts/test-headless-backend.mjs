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
import { getFunctionName, makeFunctionReference } from "convex/server";

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
  controls: defineTable({ key: v.string(), mode: v.optional(v.string()), revision: v.optional(v.number()) }).index("by_key", ["key"]),
  items: defineTable({ position: v.number(), label: v.string(), padding: v.string() })
    .index("by_position", ["position"])
    .index("by_label", ["label"]),
});
`;

const harnessSource = `
import { mutation, query } from "./_generated/server.js";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

async function mode(ctx) {
  return (await ctx.db.query("controls").withIndex("by_key", q => q.eq("key", "fault")).unique())?.mode ?? "none";
}

async function revision(ctx) {
  return (await ctx.db.query("controls").withIndex("by_key", q => q.eq("key", "revision")).unique())?.revision ?? 0;
}

async function bumpRevision(ctx) {
  const row = await ctx.db.query("controls").withIndex("by_key", q => q.eq("key", "revision")).unique();
  const next = (row?.revision ?? 0) + 1;
  if (row) await ctx.db.patch(row._id, { revision: next });
  else await ctx.db.insert("controls", { key: "revision", revision: next });
  return next;
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

export const seedItems = mutation({
  args: { labels: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const item of await ctx.db.query("items").collect()) await ctx.db.delete(item._id);
    for (let index = 0; index < args.labels.length; index += 1) {
      await ctx.db.insert("items", {
        position: (index + 1) * 10,
        label: args.labels[index],
        padding: "x".repeat(1024),
      });
    }
    await bumpRevision(ctx);
    return null;
  },
});

export const insertItem = mutation({
  args: { label: v.string(), position: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    await ctx.db.insert("items", { position: args.position, label: args.label, padding: "x".repeat(1024) });
    return await bumpRevision(ctx);
  },
});

export const deleteItem = mutation({
  args: { label: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const target = await ctx.db.query("items").withIndex("by_label", q => q.eq("label", args.label)).unique();
    if (!target) throw new Error("missing label " + args.label);
    await ctx.db.delete(target._id);
    return await bumpRevision(ctx);
  },
});

export const moveItem = mutation({
  args: { label: v.string(), position: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const target = await ctx.db.query("items").withIndex("by_label", q => q.eq("label", args.label)).unique();
    if (!target) throw new Error("missing label " + args.label);
    await ctx.db.patch(target._id, { position: args.position });
    return await bumpRevision(ctx);
  },
});

export const canonical = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => ({
    revision: await revision(ctx),
    labels: (await ctx.db.query("items").withIndex("by_position").collect()).map(item => item.label),
  }),
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
    if (currentMode === "middle" && args.paginationOpts.cursor !== null && args.paginationOpts.endCursor !== undefined) {
      throw new ConvexError({ code: "TRANSIENT", message: "middle page fault" });
    }
    if (currentMode === "tail" && args.paginationOpts.cursor !== null && args.paginationOpts.endCursor === undefined) {
      throw new ConvexError({ code: "TRANSIENT", message: "tail page fault" });
    }
    const paginationOpts = currentMode === "recommended"
      ? { ...args.paginationOpts, maximumBytesRead: 8000 }
      : currentMode === "required"
        ? { ...args.paginationOpts, maximumBytesRead: 4300 }
        : currentMode === "required_no_cursor"
          ? { ...args.paginationOpts, maximumBytesRead: 1200 }
        : args.paginationOpts;
    const result = await ctx.db.query("items").withIndex("by_position").paginate(paginationOpts);
    return {
      ...result,
      revision: await revision(ctx),
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

class TrackingWatchClient {
  records = [];

  constructor(client) {
    this.client = client;
  }

  watchQuery(reference, args = {}) {
    const underlying = this.client.watchQuery(reference, args);
    const record = {
      name: getFunctionName(reference),
      args,
      active: 0,
      disposeCount: 0,
      result: undefined,
      error: undefined,
    };
    this.records.push(record);
    const read = () => {
      try {
        record.result = underlying.localQueryResult();
        record.error = undefined;
        return record.result;
      } catch (error) {
        record.error = error;
        throw error;
      }
    };
    return {
      onUpdate: (listener) => {
        record.active += 1;
        const stop = underlying.onUpdate(listener);
        return () => {
          if (record.active > 0) {
            record.active -= 1;
            record.disposeCount += 1;
          }
          stop();
        };
      },
      localQueryResult: read,
      localQueryLogs: () => underlying.localQueryLogs(),
      journal: () => underlying.journal(),
    };
  }

  activePages() {
    return this.records.filter(
      (record) => record.active > 0 && record.args.paginationOpts,
    );
  }
}

function assertActiveBoundaries(tracker) {
  const active = tracker.activePages();
  assert.ok(active.length > 0, "expected at least one active page watch");
  const ordered = [];
  let cursor = null;
  while (ordered.length < active.length) {
    const matches = active.filter(
      (record) =>
        !ordered.includes(record) &&
        record.args.paginationOpts.cursor === cursor,
    );
    assert.equal(
      matches.length,
      1,
      `expected one active page at cursor ${String(cursor)}: ${JSON.stringify(active.map(record => record.args.paginationOpts))}`,
    );
    const current = matches[0];
    ordered.push(current);
    cursor = current.args.paginationOpts.endCursor;
    if (cursor === undefined) break;
  }
  assert.equal(ordered.length, active.length, "active pages must form one chain");
  for (let index = 0; index < ordered.length - 1; index += 1) {
    assert.equal(
      ordered[index].args.paginationOpts.endCursor,
      ordered[index + 1].args.paginationOpts.cursor,
      `adjacent page boundary ${index} must be identical`,
    );
  }
  assert.equal(
    ordered.at(-1).args.paginationOpts.endCursor,
    undefined,
    "the committed chain must have one unbounded tail",
  );
  return ordered;
}

function assertAllWatchesDisposedOnce(tracker) {
  assert.deepEqual(
    tracker.records
      .filter((record) => record.active !== 0 || record.disposeCount !== 1)
      .map((record) => ({
        name: record.name,
        paginationOpts: record.args.paginationOpts,
        active: record.active,
        disposeCount: record.disposeCount,
      })),
    [],
    "every attached watch must be inactive and disposed exactly once",
  );
}

async function assertCanonicalWindow(...args) {
  const [http, canonical, tracker, snapshot, expected] = args;
  const labels = snapshot.results.map((item) => item.label);
  assert.deepEqual(labels, expected);
  const truth = await http.query(canonical, {});
  const terminal = labels.at(-1);
  const terminalIndex = terminal === undefined ? -1 : truth.labels.indexOf(terminal);
  assert.deepEqual(
    labels,
    terminalIndex === -1 ? [] : truth.labels.slice(0, terminalIndex + 1),
    `revision ${truth.revision} must equal canonical truth through the active tail`,
  );
  assertActiveBoundaries(tracker);
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
  const tracking = new TrackingWatchClient(react);
  assert.equal(typeof react.watchQuery, "function");
  const setMode = reference("setMode");
  const seedItems = reference("seedItems");
  const insertItem = reference("insertItem");
  const deleteItem = reference("deleteItem");
  const moveItem = reference("moveItem");
  const canonical = reference("canonical");
  const direct = reference("direct");
  const list = reference("list");
  await http.mutation(seedItems, { labels: ["a", "b", "c", "d", "e", "f"] });
  setupComplete = true;

  try {
    await http.mutation(setMode, { mode: "direct" });
    const directStore = queryModule.createDirectWatchStore({
      client: tracking,
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
      client: tracking,
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
    await assertCanonicalWindow(http, canonical, tracking, first, ["a", "b"]);
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
    await assertCanonicalWindow(http, canonical, tracking, recovered, [
      "a",
      "b",
      "c",
      "d",
    ]);

    pageStore.loadMore(2);
    const threeWindows = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
          JSON.stringify(["a", "b", "c", "d", "e", "f"]) &&
        snapshot.status !== "LoadingMore",
      "three loaded windows",
    );
    await assertCanonicalWindow(http, canonical, tracking, threeWindows, [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);

    await http.mutation(insertItem, { label: "zero", position: 5 });
    const grown = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
        JSON.stringify(["zero", "a", "b", "c", "d", "e", "f"]),
      "front insertion growth",
    );
    await assertCanonicalWindow(http, canonical, tracking, grown, [
      "zero",
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);

    await http.mutation(insertItem, { label: "middle", position: 35 });
    const middleGrown = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
        JSON.stringify(["zero", "a", "b", "c", "middle", "d", "e", "f"]),
      "middle insertion growth",
    );
    await assertCanonicalWindow(http, canonical, tracking, middleGrown, [
      "zero",
      "a",
      "b",
      "c",
      "middle",
      "d",
      "e",
      "f",
    ]);

    await http.mutation(insertItem, { label: "back", position: 55 });
    const backInserted = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
        JSON.stringify(["zero", "a", "b", "c", "middle", "d", "e", "back", "f"]),
      "back insertion",
    );
    await assertCanonicalWindow(http, canonical, tracking, backInserted, [
      "zero",
      "a",
      "b",
      "c",
      "middle",
      "d",
      "e",
      "back",
      "f",
    ]);

    await http.mutation(deleteItem, { label: "zero" });
    const frontDeleted = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
        JSON.stringify(["a", "b", "c", "middle", "d", "e", "back", "f"]),
      "front deletion",
    );
    await assertCanonicalWindow(http, canonical, tracking, frontDeleted, [
      "a",
      "b",
      "c",
      "middle",
      "d",
      "e",
      "back",
      "f",
    ]);

    await http.mutation(deleteItem, { label: "middle" });
    const middleDeleted = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
        JSON.stringify(["a", "b", "c", "d", "e", "back", "f"]),
      "middle deletion",
    );
    await assertCanonicalWindow(http, canonical, tracking, middleDeleted, [
      "a",
      "b",
      "c",
      "d",
      "e",
      "back",
      "f",
    ]);

    await http.mutation(deleteItem, { label: "c" });
    await http.mutation(deleteItem, { label: "d" });
    const collapsed = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
          JSON.stringify(["a", "b", "e", "back", "f"]) &&
        snapshot.status !== "LoadingMore" &&
        tracking.activePages().some(
          (record) =>
            record.args.paginationOpts.cursor === null &&
            record.args.paginationOpts.numItems === 4,
        ),
      "empty middle-window collapse",
    );
    await assertCanonicalWindow(http, canonical, tracking, collapsed, [
      "a",
      "b",
      "e",
      "back",
      "f",
    ]);

    await http.mutation(moveItem, { label: "e", position: 5 });
    const reordered = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
        JSON.stringify(["e", "a", "b", "back", "f"]),
      "sort-key movement",
    );
    await assertCanonicalWindow(http, canonical, tracking, reordered, [
      "e",
      "a",
      "b",
      "back",
      "f",
    ]);

    const thresholdExpectations = [
      [1200, "SplitRequired", false],
      [1800, "SplitRequired", false],
      [2300, "SplitRequired", true],
      [2800, "SplitRequired", true],
      [4300, "SplitRequired", true],
      [8000, null, true],
    ];
    for (const [maximumBytesRead, pageStatus, hasSplitCursor] of thresholdExpectations) {
      const probe = await http.query(list, {
        paginationOpts: { numItems: 10, cursor: null, maximumBytesRead },
      });
      assert.equal(probe.pageStatus, pageStatus);
      assert.equal(Boolean(probe.splitCursor), hasSplitCursor);
    }

    stopPages();
    pageStore.dispose();
    await http.mutation(seedItems, {
      labels: ["s1", "s2", "s3", "s4", "s5", "s6"],
    });
    await http.mutation(setMode, { mode: "recommended" });
    const opportunisticStore = queryModule.createPaginatedWatchStore({
      client: tracking,
      query: list,
      args: {},
      generation: 2,
      initialNumItems: 2,
    });
    const stopOpportunistic = opportunisticStore.subscribe(() => {});
    await waitFor(
      opportunisticStore,
      (snapshot) => snapshot.results.length === 2,
      "opportunistic split seed",
    );
    await http.mutation(insertItem, { label: "r1", position: 7 });
    await http.mutation(insertItem, { label: "r2", position: 8 });
    await http.mutation(insertItem, { label: "r3", position: 9 });
    const split = await waitFor(
      opportunisticStore,
      (snapshot) =>
        tracking.records.some(
          (record) =>
            record.result?.pageStatus == null &&
            record.result?.splitCursor &&
            record.result.page.length > 4,
        ) &&
        !tracking
          .activePages()
          .some((record) => record.result?.page.length > 4) &&
        snapshot.status !== "LoadingMore",
      "real null-status splitCursor opportunistic split",
    );
    await assertCanonicalWindow(
      http,
      canonical,
      tracking,
      split,
      ["r1", "r2", "r3", "s1", "s2"],
    );
    stopOpportunistic();
    opportunisticStore.dispose();

    await http.mutation(seedItems, {
      labels: ["q1", "q2", "q3", "q4", "q5", "q6"],
    });
    await http.mutation(setMode, { mode: "required" });
    const requiredStore = queryModule.createPaginatedWatchStore({
      client: tracking,
      query: list,
      args: {},
      generation: 3,
      initialNumItems: 6,
    });
    const stopRequired = requiredStore.subscribe(() => {});
    const requiredSplit = await waitFor(
      requiredStore,
      (snapshot) =>
        tracking.records.some(
          (record) =>
            record.result?.pageStatus === "SplitRequired" &&
            Boolean(record.result.splitCursor),
        ) &&
        (snapshot.status === "CanLoadMore" || snapshot.status === "Exhausted"),
      "native required split with cursor",
    );
    await assertCanonicalWindow(http, canonical, tracking, requiredSplit, [
      "q1",
      "q2",
      "q3",
      "q4",
      "q5",
      "q6",
    ]);
    stopRequired();
    requiredStore.dispose();

    await http.mutation(setMode, { mode: "required_no_cursor" });
    const missingCursorStore = queryModule.createPaginatedWatchStore({
      client: tracking,
      query: list,
      args: {},
      generation: 4,
      initialNumItems: 6,
    });
    const stopMissingCursor = missingCursorStore.subscribe(() => {});
    const missingCursor = await waitFor(
      missingCursorStore,
      (snapshot) => snapshot.status === "Error",
      "native required split without cursor",
    );
    assert.deepEqual(missingCursor.results, []);
    assert.equal(missingCursor.error?.code, "UNKNOWN");
    await http.mutation(setMode, { mode: "none" });
    const missingCursorRecovered = await waitFor(
      missingCursorStore,
      (snapshot) =>
        snapshot.status !== "Error" &&
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
          JSON.stringify(["q1", "q2"]),
      "required split missing-cursor recovery",
    );
    await assertCanonicalWindow(
      http,
      canonical,
      tracking,
      missingCursorRecovered,
      ["q1", "q2"],
    );
    stopMissingCursor();
    missingCursorStore.dispose();

    stopDirect();
    directStore.dispose();
    assertAllWatchesDisposedOnce(tracking);
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
