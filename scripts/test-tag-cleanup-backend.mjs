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
const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-tag-backend-"));
const convexBinary = join(repositoryRoot, "node_modules/.bin/convex");
let developmentProcess;

const probeSource = `
import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const seed = mutation({
  args: { scopeId: v.string(), count: v.number() },
  returns: v.object({ tagId: v.string() }),
  handler: async (ctx, args) => {
    const actorId = await ctx.db.insert("actors", {
      scopeId: args.scopeId,
      externalKey: args.scopeId + ":admin",
    });
    const boardId = await ctx.db.insert("boards", {
      scopeId: args.scopeId,
      slug: "feedback",
      name: "Feedback",
      sortOrder: 0,
    });
    const tagId = await ctx.db.insert("tags", {
      scopeId: args.scopeId,
      name: "Platform",
      normalizedName: "platform",
      state: "active",
    });
    for (let index = 0; index < args.count; index += 1) {
      const postId = await ctx.db.insert("posts", {
        scopeId: args.scopeId,
        boardId,
        actorId,
        title: "Feedback " + index,
        body: "Cleanup",
        searchText: "Feedback " + index + " Cleanup",
        lifecycleState: "active",
        statusKey: "open",
        voteCount: 0,
        commentCount: 0,
        createdAt: index,
        currentStatusSince: index,
        trendingScore: index,
        orderId: args.scopeId + ":" + index,
        visibilityKey: "visible",
      });
      await ctx.db.insert("postTags", { scopeId: args.scopeId, postId, tagId });
      await ctx.db.insert("postTagFeeds", {
        scopeId: args.scopeId, postId, tagId, boardId, statusKey: "open",
        visibilityKey: "visible", createdAt: index, voteCount: 0,
        trendingScore: index, orderId: args.scopeId + ":" + index,
      });
      await ctx.db.insert("postTagSearches", {
        scopeId: args.scopeId, postId, tagId, boardId, statusKey: "open",
        visibilityKey: "visible", searchText: "Feedback " + index + " Cleanup",
      });
    }
    return { tagId: String(tagId) };
  },
});

export const state = query({
  args: { scopeId: v.string(), tagId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const tagId = ctx.db.normalizeId("tags", args.tagId);
    if (!tagId) throw new Error("missing tag");
    const [tag, memberships, feeds, searches, activity] = await Promise.all([
      ctx.db.get(tagId),
      ctx.db.query("postTags").withIndex("by_scope_tag_post", q => q.eq("scopeId", args.scopeId).eq("tagId", tagId)).collect(),
      ctx.db.query("postTagFeeds").withIndex("by_scope_tag_post", q => q.eq("scopeId", args.scopeId).eq("tagId", tagId)).collect(),
      ctx.db.query("postTagSearches").withIndex("by_scope_tag_post", q => q.eq("scopeId", args.scopeId).eq("tagId", tagId)).collect(),
      ctx.db.query("postActivity").withIndex("by_scope_post_occurred", q => q.eq("scopeId", args.scopeId)).collect(),
    ]);
    return {
      tagState: tag?.state ?? null,
      memberships: memberships.length,
      feeds: feeds.length,
      searches: searches.length,
      removals: activity.filter(entry => entry.type === "tag_remove" && entry.tagId === tagId).length,
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
export const remove = mutation({
  args: { scopeId: v.string(), tagId: v.string() }, returns: v.any(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.admin.tags.deleteTag, {
    ...args, actor: { externalKey: args.scopeId + ":admin" },
  }),
});
export const state = query({
  args: { scopeId: v.string(), tagId: v.string() }, returns: v.any(),
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
      setTimeout(
        () => reject(new Error("Timed out starting Convex backend")),
        30_000,
      ),
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
  await symlink(
    join(repositoryRoot, "node_modules"),
    join(temporaryRoot, "node_modules"),
  );
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
  const remove = reference("remove");
  const state = reference("state");
  const alpha = await client.mutation(seed, { scopeId: "alpha", count: 51 });
  const beta = await client.mutation(seed, { scopeId: "beta", count: 1 });
  const started = await client.mutation(remove, {
    scopeId: "alpha",
    tagId: alpha.tagId,
  });
  assert.equal(started.status, "pending");

  let alphaState;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    alphaState = await client.query(state, {
      scopeId: "alpha",
      tagId: alpha.tagId,
    });
    if (alphaState.tagState === "deleted") break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepEqual(alphaState, {
    tagState: "deleted",
    memberships: 0,
    feeds: 0,
    searches: 0,
    removals: 51,
  });
  assert.deepEqual(
    await client.query(state, { scopeId: "beta", tagId: beta.tagId }),
    {
      tagState: "active",
      memberships: 1,
      feeds: 1,
      searches: 1,
      removals: 0,
    },
  );
  const repeated = await client.mutation(remove, {
    scopeId: "alpha",
    tagId: alpha.tagId,
  });
  assert.equal(repeated.status, "deleted");

  console.log("Real Convex tag cleanup resume and scope matrix passed");
} finally {
  await stopBackend();
  await rm(temporaryRoot, { force: true, recursive: true });
}
