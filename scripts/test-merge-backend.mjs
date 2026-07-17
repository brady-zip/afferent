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
const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-merge-backend-"));
const convexBinary = join(repositoryRoot, "node_modules/.bin/convex");
let developmentProcess;

const probeSource = `
import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import {
  abortMergeJob,
  continueMergeJob,
  createMergeJob,
  fenceMergeWrite,
  mergeObservation,
} from "./model/merge.js";

export const seed = mutation({
  args: { scopeId: v.string(), relationCount: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const adminId = await ctx.db.insert("actors", {
      scopeId: args.scopeId,
      externalKey: args.scopeId + ":admin",
    });
    const boardId = await ctx.db.insert("boards", {
      scopeId: args.scopeId,
      slug: "feedback",
      name: "Feedback",
      sortOrder: 0,
    });
    const base = {
      scopeId: args.scopeId,
      boardId,
      actorId: adminId,
      body: "body",
      searchText: "body",
      lifecycleState: "active",
      statusKey: "open",
      voteCount: 0,
      commentCount: 0,
      createdAt: 1,
      currentStatusSince: 1,
      trendingScore: 1,
      visibilityKey: "visible",
    };
    const canonicalPostId = await ctx.db.insert("posts", {
      ...base,
      title: "Canonical",
      orderId: args.scopeId + ":canonical",
    });
    const sourcePostId = await ctx.db.insert("posts", {
      ...base,
      title: "Source",
      orderId: args.scopeId + ":source",
    });
    for (let index = 0; index < args.relationCount; index += 1) {
      const actorId = await ctx.db.insert("actors", {
        scopeId: args.scopeId,
        externalKey: args.scopeId + ":actor:" + index,
      });
      const postId = index % 3 === 0 ? canonicalPostId : sourcePostId;
      await ctx.db.insert("votes", { scopeId: args.scopeId, postId, actorId });
      await ctx.db.insert("postSubscriptions", {
        scopeId: args.scopeId,
        postId,
        actorId,
        state: index % 5 === 0 ? "opted_out" : "subscribed",
        updatedAt: index,
      });
      if (index < 8) {
        await ctx.db.insert("comments", {
          scopeId: args.scopeId,
          postId,
          actorId,
          body: "comment " + index,
        });
      }
    }
    const counts = await Promise.all([
      ctx.db.query("votes").withIndex("by_scope_post_actor", q => q.eq("scopeId", args.scopeId).eq("postId", canonicalPostId)).collect(),
      ctx.db.query("votes").withIndex("by_scope_post_actor", q => q.eq("scopeId", args.scopeId).eq("postId", sourcePostId)).collect(),
      ctx.db.query("comments").withIndex("by_scope_post", q => q.eq("scopeId", args.scopeId).eq("postId", canonicalPostId)).collect(),
      ctx.db.query("comments").withIndex("by_scope_post", q => q.eq("scopeId", args.scopeId).eq("postId", sourcePostId)).collect(),
    ]);
    await ctx.db.patch(canonicalPostId, { voteCount: counts[0].length, commentCount: counts[2].length });
    await ctx.db.patch(sourcePostId, { voteCount: counts[1].length, commentCount: counts[3].length });
    return {
      adminId: String(adminId),
      canonicalPostId: String(canonicalPostId),
      sourcePostId: String(sourcePostId),
    };
  },
});

export const begin = mutation({
  args: {
    scopeId: v.string(),
    adminId: v.string(),
    sourcePostId: v.string(),
    canonicalPostId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const actorId = ctx.db.normalizeId("actors", args.adminId);
    const sourcePostId = ctx.db.normalizeId("posts", args.sourcePostId);
    const canonicalPostId = ctx.db.normalizeId("posts", args.canonicalPostId);
    if (!actorId || !sourcePostId || !canonicalPostId) throw new Error("bad ids");
    const result = await createMergeJob(ctx, {
      scopeId: args.scopeId,
      actorId,
      sourcePostId,
      canonicalPostId,
    });
    return { jobId: String(result.jobId), state: result.state };
  },
});

export const step = mutation({
  args: { scopeId: v.string(), jobId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => continueMergeJob(ctx, args.scopeId, args.jobId),
});

export const abortMerge = mutation({
  args: { scopeId: v.string(), jobId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => abortMergeJob(ctx, args.scopeId, args.jobId),
});

export const concurrentWrite = mutation({
  args: { scopeId: v.string(), jobId: v.string(), postId: v.string(), suffix: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const postId = ctx.db.normalizeId("posts", args.postId);
    if (!postId) throw new Error("bad post");
    const actorId = await ctx.db.insert("actors", {
      scopeId: args.scopeId,
      externalKey: args.scopeId + ":concurrent:" + args.suffix,
    });
    const voteId = await ctx.db.insert("votes", { scopeId: args.scopeId, postId, actorId });
    const commentId = await ctx.db.insert("comments", {
      scopeId: args.scopeId,
      postId,
      actorId,
      body: "concurrent " + args.suffix,
    });
    await fenceMergeWrite(ctx, {
      scopeId: args.scopeId,
      jobId: args.jobId,
      postId,
      writes: [
        { kind: "vote", originalId: String(voteId), logicalKey: String(actorId) },
        { kind: "comment", originalId: String(commentId), logicalKey: String(commentId) },
      ],
    });
    return null;
  },
});

export const observe = query({
  args: { scopeId: v.string(), jobId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => mergeObservation(ctx, args.scopeId, args.jobId),
});
`;

const harnessSource = `
import { componentsGeneric, mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
const components = componentsGeneric();
export const seed = mutation({ args: { scopeId: v.string(), relationCount: v.number() }, returns: v.any(), handler: (ctx, args) => ctx.runMutation(components.afferent.probe.seed, args) });
export const begin = mutation({ args: { scopeId: v.string(), adminId: v.string(), sourcePostId: v.string(), canonicalPostId: v.string() }, returns: v.any(), handler: (ctx, args) => ctx.runMutation(components.afferent.probe.begin, args) });
export const step = mutation({ args: { scopeId: v.string(), jobId: v.string() }, returns: v.any(), handler: (ctx, args) => ctx.runMutation(components.afferent.probe.step, args) });
export const abortMerge = mutation({ args: { scopeId: v.string(), jobId: v.string() }, returns: v.any(), handler: (ctx, args) => ctx.runMutation(components.afferent.probe.abortMerge, args) });
export const concurrentWrite = mutation({ args: { scopeId: v.string(), jobId: v.string(), postId: v.string(), suffix: v.string() }, returns: v.null(), handler: (ctx, args) => ctx.runMutation(components.afferent.probe.concurrentWrite, args) });
export const observe = query({ args: { scopeId: v.string(), jobId: v.string() }, returns: v.any(), handler: (ctx, args) => ctx.runQuery(components.afferent.probe.observe, args) });
`;

function reference(name) {
  return makeFunctionReference(`harness:${name}`);
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
      if (!output.includes("Convex functions ready!")) reject(new Error(`Convex dev exited before readiness (${code})`));
    });
  });
  await Promise.race([
    ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out starting Convex backend")), 30_000)),
  ]);
}

function deploymentUrl(envFile) {
  const line = envFile.split("\n").find((candidate) => candidate.startsWith("CONVEX_URL="));
  assert.ok(line);
  return line.slice("CONVEX_URL=".length).trim();
}

const observations = [];
async function recordObservation(client, job) {
  const snapshot = await client.query(reference("observe"), {
    scopeId: job.scopeId,
    jobId: job.jobId,
  });
  observations.push(snapshot);
  return snapshot;
}

function observable(snapshot) {
  const { state: _state, physical: _physical, ...view } = snapshot;
  return view;
}

function assertPreOrPostOnly(samples, pre, post) {
  for (const sample of samples) {
    const value = observable(sample);
    assert.ok(
      JSON.stringify(value) === JSON.stringify(pre) ||
        JSON.stringify(value) === JSON.stringify(post),
      `mixed merge observation: ${JSON.stringify(sample)}`,
    );
  }
}

async function advanceTo(client, job, wanted) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const current = await recordObservation(client, job);
    if (current.state === wanted) return current;
    await client.mutation(reference("step"), { scopeId: job.scopeId, jobId: job.jobId });
  }
  throw new Error(`merge did not reach ${wanted}`);
}

try {
  await mkdir(join(temporaryRoot, "convex"), { recursive: true });
  await cp(join(repositoryRoot, "src/component"), join(temporaryRoot, "component"), {
    recursive: true,
    filter: (source) => !source.includes("/_generated"),
  });
  await writeFile(join(temporaryRoot, "component/probe.ts"), probeSource);
  await symlink(join(repositoryRoot, "node_modules"), join(temporaryRoot, "node_modules"));
  await writeFile(join(temporaryRoot, "package.json"), '{"type":"module","dependencies":{"convex":"1.42.2","convex-helpers":"0.1.120","@convex-dev/rate-limiter":"0.3.2","mdast-util-from-markdown":"2.0.3"}}\n');
  await writeFile(join(temporaryRoot, "convex/convex.config.ts"), [
    'import { defineApp } from "convex/server";',
    'import afferent from "../component/convex.config.js";',
    "const app = defineApp();",
    'app.use(afferent, { name: "afferent" });',
    "export default app;",
    "",
  ].join("\n"));
  await writeFile(join(temporaryRoot, "convex/harness.ts"), harnessSource);
  await startBackend();

  const url = deploymentUrl(await readFile(join(temporaryRoot, ".env.local"), "utf8"));
  let client = new ConvexHttpClient(url);
  const seeded = await client.mutation(reference("seed"), { scopeId: "alpha", relationCount: 51 });
  const beta = await client.mutation(reference("seed"), { scopeId: "beta", relationCount: 2 });
  const begun = await client.mutation(reference("begin"), { scopeId: "alpha", ...seeded });
  const job = { scopeId: "alpha", jobId: begun.jobId };
  const preSnapshot = await recordObservation(client, job);
  const initialPre = observable(preSnapshot);

  await advanceTo(client, job, "ready");
  await stopBackend();
  await startBackend();
  client = new ConvexHttpClient(url);
  await recordObservation(client, job);

  await Promise.all([
    client.mutation(reference("concurrentWrite"), { scopeId: "alpha", jobId: job.jobId, postId: seeded.sourcePostId, suffix: "source" }),
    client.mutation(reference("concurrentWrite"), { scopeId: "alpha", jobId: job.jobId, postId: seeded.canonicalPostId, suffix: "canonical" }),
  ]);
  const fencedPre = observable(await recordObservation(client, job));
  assert.notDeepEqual(fencedPre, initialPre);
  observations.length = 0;
  await advanceTo(client, job, "ready");
  await client.mutation(reference("step"), { scopeId: "alpha", jobId: job.jobId });
  const postSnapshot = await recordObservation(client, job);
  const post = observable(postSnapshot);
  assert.notDeepEqual(post, fencedPre);

  await stopBackend();
  await startBackend();
  client = new ConvexHttpClient(url);
  await advanceTo(client, job, "done");
  const done = await recordObservation(client, job);
  assert.deepEqual(observable(done), post);
  assert.equal(done.physical.sourceRelations, 0);

  const abortSeed = await client.mutation(reference("seed"), { scopeId: "abort", relationCount: 51 });
  const abortBegun = await client.mutation(reference("begin"), { scopeId: "abort", ...abortSeed });
  const abortJob = { scopeId: "abort", jobId: abortBegun.jobId };
  const abortPre = observable(await recordObservation(client, abortJob));
  await client.mutation(reference("step"), abortJob);
  assert.equal((await client.mutation(reference("abortMerge"), abortJob)).state, "aborted");
  assert.equal((await client.mutation(reference("abortMerge"), abortJob)).state, "aborted");
  assert.deepEqual(observable(await recordObservation(client, abortJob)), abortPre);
  await assert.rejects(
    client.mutation(reference("abortMerge"), job),
    /cutover/i,
  );

  const betaBegun = await client.mutation(reference("begin"), { scopeId: "beta", ...beta });
  assert.notEqual(betaBegun.jobId, job.jobId);
  assertPreOrPostOnly(
    observations.filter((sample) => sample.scopeId === "alpha"),
    fencedPre,
    post,
  );
} finally {
  await stopBackend();
  await rm(temporaryRoot, { force: true, recursive: true });
}
