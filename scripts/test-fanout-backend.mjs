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
const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-fanout-backend-"));
const convexBinary = join(repositoryRoot, "node_modules/.bin/convex");
let developmentProcess;

const probeSource = `
import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { captureNotificationEvent, listCurrentSubscriberActorIds } from "./notifications/events.js";

export const seed = mutation({
  args: { scopeId: v.string(), count: v.number() },
  returns: v.object({ eventId: v.string(), postId: v.string(), initiatorActorId: v.string() }),
  handler: async (ctx, args) => {
    const initiatorActorId = await ctx.db.insert("actors", {
      scopeId: args.scopeId,
      externalKey: args.scopeId + ":initiator",
    });
    const boardId = await ctx.db.insert("boards", {
      scopeId: args.scopeId,
      slug: "feedback",
      name: "Feedback",
      sortOrder: 0,
    });
    const postId = await ctx.db.insert("posts", {
      scopeId: args.scopeId,
      boardId,
      actorId: initiatorActorId,
      title: "Fanout",
      body: "Real scheduler",
      searchText: "Fanout Real scheduler",
      lifecycleState: "active",
      statusKey: "open",
      voteCount: 0,
      commentCount: 0,
      createdAt: 1,
      currentStatusSince: 1,
      trendingScore: 1,
      orderId: args.scopeId + ":post",
      visibilityKey: "visible",
    });
    for (let index = 0; index < args.count; index += 1) {
      const actorId = await ctx.db.insert("actors", {
        scopeId: args.scopeId,
        externalKey: args.scopeId + ":recipient:" + index,
      });
      await ctx.db.insert("postSubscriptions", {
        scopeId: args.scopeId,
        postId,
        actorId,
        state: "subscribed",
        updatedAt: index,
      });
    }
    const subscriberActorIds = await listCurrentSubscriberActorIds(ctx, args.scopeId, postId);
    const captured = await captureNotificationEvent(ctx, {
      scopeId: args.scopeId,
      type: "status_changed",
      initiatorActorId,
      postId,
      entityId: String(postId),
      guardKey: "probe:" + postId,
      subscriberActorIds,
    });
    if (!captured.eventId) throw new Error("missing event");
    return {
      eventId: String(captured.eventId),
      postId: String(postId),
      initiatorActorId: String(initiatorActorId),
    };
  },
});

export const repeat = mutation({
  args: { scopeId: v.string(), eventId: v.string(), postId: v.string(), initiatorActorId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const postId = ctx.db.normalizeId("posts", args.postId);
    const initiatorActorId = ctx.db.normalizeId("actors", args.initiatorActorId);
    if (!postId || !initiatorActorId) throw new Error("missing probe ids");
    const subscriberActorIds = await listCurrentSubscriberActorIds(ctx, args.scopeId, postId);
    await captureNotificationEvent(ctx, {
      scopeId: args.scopeId,
      type: "status_changed",
      initiatorActorId,
      postId,
      entityId: args.postId,
      guardKey: "probe:" + postId,
      subscriberActorIds,
    });
    return null;
  },
});

export const state = query({
  args: { scopeId: v.string(), eventId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const eventId = ctx.db.normalizeId("notificationEvents", args.eventId);
    if (!eventId) throw new Error("missing event");
    const [inbox, jobs] = await Promise.all([
      ctx.db.query("notificationInbox").withIndex("by_scope_event_actor", q => q.eq("scopeId", args.scopeId).eq("eventId", eventId)).collect(),
      ctx.db.query("notificationFanoutJobs").withIndex("by_scope_event", q => q.eq("scopeId", args.scopeId).eq("eventId", eventId)).collect(),
    ]);
    return {
      inbox: inbox.length,
      uniqueActors: new Set(inbox.map(row => String(row.actorId))).size,
      jobs: jobs.length,
      complete: jobs.length === 0 || jobs.every(job => job.state === "complete"),
    };
  },
});
`;

const harnessSource = `
import { componentsGeneric, mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
const components = componentsGeneric();
export const seed = mutation({
  args: { scopeId: v.string(), count: v.number() }, returns: v.any(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.probe.seed, args),
});
export const repeat = mutation({
  args: { scopeId: v.string(), eventId: v.string(), postId: v.string(), initiatorActorId: v.string() }, returns: v.null(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.probe.repeat, args),
});
export const state = query({
  args: { scopeId: v.string(), eventId: v.string() }, returns: v.any(),
  handler: (ctx, args) => ctx.runQuery(components.afferent.probe.state, args),
});
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
  const line = envFile
    .split("\n")
    .find((candidate) => candidate.startsWith("CONVEX_URL="));
  assert.ok(line);
  return line.slice("CONVEX_URL=".length).trim();
}

try {
  await mkdir(join(temporaryRoot, "convex"), { recursive: true });
  await cp(
    join(repositoryRoot, "src/component"),
    join(temporaryRoot, "component"),
    {
      recursive: true,
      filter: (source) => !source.includes("/_generated"),
    },
  );
  await writeFile(join(temporaryRoot, "component/probe.ts"), probeSource);
  await symlink(join(repositoryRoot, "node_modules"), join(temporaryRoot, "node_modules"));
  await writeFile(
    join(temporaryRoot, "package.json"),
    '{"type":"module","dependencies":{"convex":"1.42.2","convex-helpers":"0.1.120","@convex-dev/rate-limiter":"0.3.2","mdast-util-from-markdown":"2.0.3"}}\n',
  );
  await writeFile(
    join(temporaryRoot, "convex/convex.config.ts"),
    [
      'import { defineApp } from "convex/server";',
      'import afferent from "../component/convex.config.js";',
      "const app = defineApp();",
      'app.use(afferent, { name: "afferent" });',
      "export default app;",
      "",
    ].join("\n"),
  );
  await writeFile(join(temporaryRoot, "convex/harness.ts"), harnessSource);
  await startBackend();

  const client = new ConvexHttpClient(
    deploymentUrl(await readFile(join(temporaryRoot, ".env.local"), "utf8")),
  );
  const seed = reference("seed");
  const repeat = reference("repeat");
  const state = reference("state");
  const alpha = await client.mutation(seed, { scopeId: "alpha", count: 51 });
  const beta = await client.mutation(seed, { scopeId: "beta", count: 1 });

  let alphaState;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    alphaState = await client.query(state, {
      scopeId: "alpha",
      eventId: alpha.eventId,
    });
    if (alphaState.complete && alphaState.inbox === 51) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepEqual(alphaState, {
    inbox: 51,
    uniqueActors: 51,
    jobs: 1,
    complete: true,
  });
  assert.deepEqual(
    await client.query(state, { scopeId: "beta", eventId: beta.eventId }),
    { inbox: 1, uniqueActors: 1, jobs: 0, complete: true },
  );
  await client.mutation(repeat, { scopeId: "alpha", ...alpha });
  assert.deepEqual(
    await client.query(state, { scopeId: "alpha", eventId: alpha.eventId }),
    alphaState,
  );
} finally {
  await stopBackend();
  await rm(temporaryRoot, { force: true, recursive: true });
}
