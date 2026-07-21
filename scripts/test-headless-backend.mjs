import assert from "node:assert/strict";
/* eslint-disable max-params, unicorn/no-await-expression-member -- The disposable oracle favors explicit call-site context. */
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
import { fileURLToPath, pathToFileURL } from "node:url";

import { ConvexHttpClient } from "convex/browser";
import { ConvexReactClient } from "convex/react";
import { getFunctionName, makeFunctionReference } from "convex/server";

import {
  assertExactDescriptorChain,
  assertExactPublicationSequence,
  awaitNextPublication,
  createDeferredWatchTransport,
  createExpectedPublicationModel,
  createPublicationRecorder,
  extractDescriptorChain,
} from "../tests/helpers/headless-publication-oracle.mjs";

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
  comments: defineTable({
    postId: v.string(),
    position: v.number(),
    label: v.string(),
    parentCommentId: v.optional(v.id("comments")),
    padding: v.string(),
  })
    .index("by_post_position", ["postId", "position"])
    .index("by_post_label", ["postId", "label"]),
});
`;

const productProbeSource = `
import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import {
  countAffectedMergeRelations,
  continueMergeJob,
  createMergeJob,
  mergeReadPostIds,
  runAtomicMerge,
} from "./model/merge.js";

export const seedProduct = mutation({
  args: { scopeId: v.string(), relationCount: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.insert("installations", {
      scopeId: args.scopeId,
      readPolicy: "public",
    });
    const adminId = await ctx.db.insert("actors", {
      scopeId: args.scopeId,
      externalKey: args.scopeId + ":admin",
      displayName: "Admin " + args.scopeId,
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
      title: "Canonical " + args.scopeId,
      orderId: args.scopeId + ":canonical",
    });
    const sourcePostId = await ctx.db.insert("posts", {
      ...base,
      title: "Source " + args.scopeId,
      orderId: args.scopeId + ":source",
    });
    let rootCommentId;
    for (let index = 0; index < args.relationCount; index += 1) {
      const actorId = await ctx.db.insert("actors", {
        scopeId: args.scopeId,
        externalKey: args.scopeId + ":actor:" + index,
        displayName: "Actor " + index,
      });
      const postId = index % 2 === 0 ? canonicalPostId : sourcePostId;
      await ctx.db.insert("votes", { scopeId: args.scopeId, postId, actorId });
      if (index < 8) {
        const commentId = await ctx.db.insert("comments", {
          scopeId: args.scopeId,
          postId,
          actorId,
          body: args.scopeId + ":comment:" + index,
          ...(index === 1 && rootCommentId
            ? { parentCommentId: rootCommentId }
            : {}),
        });
        if (index === 0) rootCommentId = commentId;
        await ctx.db.insert("postActivity", {
          scopeId: args.scopeId,
          postId,
          actorId,
          type: "edit",
          occurredAt: 10_000 - index,
          changedFields: [args.scopeId + ":field:" + index],
        });
      }
    }
    const [canonicalComments, sourceComments] = await Promise.all([
      ctx.db.query("comments").withIndex("by_scope_post", q => q.eq("scopeId", args.scopeId).eq("postId", canonicalPostId)).collect(),
      ctx.db.query("comments").withIndex("by_scope_post", q => q.eq("scopeId", args.scopeId).eq("postId", sourcePostId)).collect(),
    ]);
    await ctx.db.patch(canonicalPostId, { commentCount: canonicalComments.length });
    await ctx.db.patch(sourcePostId, { commentCount: sourceComments.length });
    return {
      adminId: String(adminId),
      canonicalPostId: String(canonicalPostId),
      sourcePostId: String(sourcePostId),
      rootCommentId: String(rootCommentId),
    };
  },
});

export const beginProductMerge = mutation({
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
    const affected = await countAffectedMergeRelations(ctx, {
      scopeId: args.scopeId,
      sourcePostId,
      canonicalPostId,
    });
    if (affected <= 50) {
      const job = await ctx.db.get(result.jobId);
      if (!job) throw new Error("missing merge job");
      return { jobId: String(result.jobId), state: (await runAtomicMerge(ctx, job)).state };
    }
    return { jobId: String(result.jobId), state: result.state };
  },
});

export const stepProductMerge = mutation({
  args: { scopeId: v.string(), jobId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => continueMergeJob(ctx, args.scopeId, args.jobId),
});

export const productMergeState = query({
  args: { scopeId: v.string(), jobId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("mergeJobs", args.jobId);
    const job = id ? await ctx.db.get(id) : null;
    if (!job || job.scopeId !== args.scopeId) throw new Error("missing merge job");
    return { state: job.state };
  },
});

export const productTruth = query({
  args: { scopeId: v.string(), postId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const postId = ctx.db.normalizeId("posts", args.postId);
    if (!postId) throw new Error("bad post id");
    const postIds = await mergeReadPostIds(ctx, args.scopeId, postId);
    const comments = (await Promise.all(postIds.map(id =>
      ctx.db.query("comments").withIndex("by_scope_post", q => q.eq("scopeId", args.scopeId).eq("postId", id)).collect()
    ))).flat().sort((left, right) => left._creationTime - right._creationTime || String(left._id).localeCompare(String(right._id)));
    const activity = (await Promise.all(postIds.map(id =>
      ctx.db.query("postActivity").withIndex("by_scope_post_occurred", q => q.eq("scopeId", args.scopeId).eq("postId", id)).collect()
    ))).flat().sort((left, right) => right.occurredAt - left.occurredAt || right._creationTime - left._creationTime || String(right._id).localeCompare(String(left._id)));
    return {
      comments: comments.map(row => String(row._id) + "@" + String(row.postId)),
      activity: activity.map(row => String(row._id) + "@" + String(row.postId)),
    };
  },
});

export const insertProductRow = mutation({
  args: {
    scopeId: v.string(),
    postId: v.string(),
    kind: v.union(v.literal("comment"), v.literal("activity")),
    label: v.string(),
    parentCommentId: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const postId = ctx.db.normalizeId("posts", args.postId);
    const parentCommentId = args.parentCommentId === undefined
      ? undefined
      : ctx.db.normalizeId("comments", args.parentCommentId);
    if (!postId || (args.parentCommentId !== undefined && !parentCommentId)) throw new Error("bad row ids");
    if (args.kind === "comment") {
      const actorId = await ctx.db.insert("actors", {
        scopeId: args.scopeId,
        externalKey: args.scopeId + ":insert:" + args.label,
        displayName: args.label,
      });
      const id = await ctx.db.insert("comments", {
        scopeId: args.scopeId,
        postId,
        actorId,
        body: args.label,
        ...(parentCommentId ? { parentCommentId } : {}),
      });
      return String(id);
    }
    const id = await ctx.db.insert("postActivity", {
      scopeId: args.scopeId,
      postId,
      type: "edit",
      occurredAt: Date.now(),
      changedFields: [args.label],
    });
    return String(id);
  },
});

export const deleteProductRow = mutation({
  args: {
    scopeId: v.string(),
    kind: v.union(v.literal("comment"), v.literal("activity")),
    id: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const table = args.kind === "comment" ? "comments" : "postActivity";
    const id = ctx.db.normalizeId(table, args.id);
    const row = id ? await ctx.db.get(id) : null;
    if (!row || row.scopeId !== args.scopeId) throw new Error("missing product row");
    await ctx.db.delete(row._id);
    return null;
  },
});
`;

const harnessSource = `
import { mutation, query } from "./_generated/server.js";
import { componentsGeneric, paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

const components = componentsGeneric();

async function mode(ctx) {
  return (await ctx.db.query("controls").withIndex("by_key", q => q.eq("key", "fault")).unique())?.mode ?? "none";
}

async function commentMode(ctx) {
  return (await ctx.db.query("controls").withIndex("by_key", q => q.eq("key", "comment-fault")).unique())?.mode ?? "none";
}

async function productMode(ctx, reader) {
  return (await ctx.db.query("controls").withIndex("by_key", q => q.eq("key", "product-fault:" + reader)).unique())?.mode ?? "none";
}

function productFault(reader, currentMode, paginationOpts) {
  const first = paginationOpts.cursor === null;
  const middle = paginationOpts.cursor !== null && paginationOpts.endCursor !== undefined;
  const tail = paginationOpts.cursor !== null && paginationOpts.endCursor === undefined;
  if ((currentMode === "first" && first) || (currentMode === "middle" && middle) || (currentMode === "tail" && tail)) {
    throw new ConvexError({ code: "TRANSIENT", message: reader + " product fault" });
  }
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

export const setCommentMode = mutation({
  args: { mode: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.query("controls").withIndex("by_key", q => q.eq("key", "comment-fault")).unique();
    if (row) await ctx.db.patch(row._id, { mode: args.mode });
    else await ctx.db.insert("controls", { key: "comment-fault", mode: args.mode });
    return null;
  },
});

export const setProductMode = mutation({
  args: { reader: v.union(v.literal("comments"), v.literal("activity")), mode: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = "product-fault:" + args.reader;
    const row = await ctx.db.query("controls").withIndex("by_key", q => q.eq("key", key)).unique();
    if (row) await ctx.db.patch(row._id, { mode: args.mode });
    else await ctx.db.insert("controls", { key, mode: args.mode });
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

async function commentByLabel(ctx, postId, label) {
  return await ctx.db.query("comments").withIndex("by_post_label", q => q.eq("postId", postId).eq("label", label)).unique();
}

export const seedComments = mutation({
  args: {
    postId: v.string(),
    rows: v.array(v.object({
      label: v.string(),
      position: v.number(),
      parentLabel: v.optional(v.string()),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const comment of await ctx.db.query("comments").collect()) await ctx.db.delete(comment._id);
    for (const row of args.rows) {
      const parent = row.parentLabel === undefined
        ? undefined
        : await commentByLabel(ctx, args.postId, row.parentLabel);
      if (row.parentLabel !== undefined && !parent) throw new Error("missing parent " + row.parentLabel);
      await ctx.db.insert("comments", {
        postId: args.postId,
        position: row.position,
        label: row.label,
        ...(parent ? { parentCommentId: parent._id } : {}),
        padding: "x".repeat(1024),
      });
    }
    return null;
  },
});

export const insertComment = mutation({
  args: {
    postId: v.string(),
    label: v.string(),
    position: v.number(),
    parentLabel: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const parent = args.parentLabel === undefined
      ? undefined
      : await commentByLabel(ctx, args.postId, args.parentLabel);
    if (args.parentLabel !== undefined && !parent) throw new Error("missing parent " + args.parentLabel);
    await ctx.db.insert("comments", {
      postId: args.postId,
      position: args.position,
      label: args.label,
      ...(parent ? { parentCommentId: parent._id } : {}),
      padding: "x".repeat(1024),
    });
    return null;
  },
});

export const deleteComment = mutation({
  args: { postId: v.string(), label: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const target = await commentByLabel(ctx, args.postId, args.label);
    if (!target) throw new Error("missing comment " + args.label);
    await ctx.db.delete(target._id);
    return null;
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

function commentDto(comment) {
  return {
    contractVersion: 1,
    id: String(comment._id),
    postId: comment.postId,
    body: comment.label,
    author: { id: "actor:test", displayName: "Test Actor" },
    ...(comment.parentCommentId === undefined
      ? {}
      : { parentCommentId: String(comment.parentCommentId) }),
  };
}

export const canonicalComments = query({
  args: { postId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => ({
    rows: (await ctx.db.query("comments").withIndex("by_post_position", q => q.eq("postId", args.postId)).collect()).map(commentDto),
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

export const listComments = query({
  args: { postId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, args) => {
    const currentMode = await commentMode(ctx);
    if (currentMode === "first" && args.paginationOpts.cursor === null) {
      throw new ConvexError({ code: "TRANSIENT", message: "comment first fault" });
    }
    if (currentMode === "middle" && args.paginationOpts.cursor !== null && args.paginationOpts.endCursor !== undefined) {
      throw new ConvexError({ code: "TRANSIENT", message: "comment middle fault" });
    }
    if (currentMode === "tail" && args.paginationOpts.cursor !== null && args.paginationOpts.endCursor === undefined) {
      throw new ConvexError({ code: "TRANSIENT", message: "comment tail fault" });
    }
    const result = await ctx.db
      .query("comments")
      .withIndex("by_post_position", q => q.eq("postId", args.postId))
      .paginate(args.paginationOpts);
    const page = result.page.map(commentDto);
    return { contractVersion: 1, ...result, page, comments: page };
  },
});

export const seedProduct = mutation({
  args: { scopeId: v.string(), relationCount: v.number() },
  returns: v.any(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.probe.seedProduct, args),
});

export const beginProductMerge = mutation({
  args: { scopeId: v.string(), adminId: v.string(), sourcePostId: v.string(), canonicalPostId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.probe.beginProductMerge, args),
});

export const stepProductMerge = mutation({
  args: { scopeId: v.string(), jobId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.probe.stepProductMerge, args),
});

export const productMergeState = query({
  args: { scopeId: v.string(), jobId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => ctx.runQuery(components.afferent.probe.productMergeState, args),
});

export const productTruth = query({
  args: { scopeId: v.string(), postId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => ctx.runQuery(components.afferent.probe.productTruth, args),
});

export const insertProductRow = mutation({
  args: {
    scopeId: v.string(),
    postId: v.string(),
    kind: v.union(v.literal("comment"), v.literal("activity")),
    label: v.string(),
    parentCommentId: v.optional(v.string()),
  },
  returns: v.string(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.probe.insertProductRow, args),
});

export const deleteProductRow = mutation({
  args: { scopeId: v.string(), kind: v.union(v.literal("comment"), v.literal("activity")), id: v.string() },
  returns: v.null(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.probe.deleteProductRow, args),
});

export const listProductComments = query({
  args: { scopeId: v.string(), postId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, args) => {
    productFault("comments", await productMode(ctx, "comments"), args.paginationOpts);
    return await ctx.runQuery(components.afferent.public.comments.listComments, {
      ...args,
      viewerAuthenticated: true,
    });
  },
});

export const listProductActivity = query({
  args: { scopeId: v.string(), postId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, args) => {
    productFault("activity", await productMode(ctx, "activity"), args.paginationOpts);
    return await ctx.runQuery(components.afferent.admin.activity.listPostActivity, args);
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
      `expected one active page at cursor ${String(cursor)}: ${JSON.stringify(active.map((record) => record.args.paginationOpts))}`,
    );
    const current = matches[0];
    ordered.push(current);
    cursor = current.args.paginationOpts.endCursor;
    if (cursor === undefined) break;
  }
  assert.equal(
    ordered.length,
    active.length,
    "active pages must form one chain",
  );
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
  const terminalIndex =
    terminal === undefined ? -1 : truth.labels.indexOf(terminal);
  assert.deepEqual(
    labels,
    terminalIndex === -1 ? [] : truth.labels.slice(0, terminalIndex + 1),
    `revision ${truth.revision} must equal canonical truth through the active tail`,
  );
  assertActiveBoundaries(tracker);
}

async function assertCanonicalCommentWindow({
  http,
  canonicalComments,
  tracker,
  snapshot,
  postId,
  expectedBodies,
}) {
  await waitUntil(() => {
    try {
      assertActiveBoundaries(tracker);
      return true;
    } catch {
      return false;
    }
  }, "one settled comment cursor chain");
  const bodies = snapshot.results.map((item) => item.body);
  assert.deepEqual(bodies, expectedBodies);
  const truth = await http.query(canonicalComments, { postId });
  const terminal = bodies.at(-1);
  const terminalIndex =
    terminal === undefined
      ? -1
      : truth.rows.findIndex((row) => row.body === terminal);
  assert.deepEqual(
    snapshot.results,
    terminalIndex === -1 ? [] : truth.rows.slice(0, terminalIndex + 1),
    "comment feed must equal the exact closed canonical prefix",
  );
  for (const row of snapshot.results) {
    assert.deepEqual(
      Object.keys(row).sort(),
      [
        "author",
        "body",
        "contractVersion",
        "id",
        ...(row.parentCommentId === undefined ? [] : ["parentCommentId"]),
        "postId",
      ].sort(),
    );
  }
  assertActiveBoundaries(tracker);
}

function recordEveryCommentPublication(store) {
  const publications = [];
  const stop = store.subscribe(() => {
    const snapshot = store.getSnapshot();
    publications.push({
      bodies: snapshot.results.map((item) => item.body),
      status: snapshot.status,
      errorCode: snapshot.error?.code,
    });
  });
  return {
    mark: () => publications.length,
    stop,
    assertExactSince(mark, allowed, label) {
      const observed = publications.slice(mark);
      assert.ok(observed.length > 0, `${label} must publish at least once`);
      const allowedKeys = allowed.map((bodies) => JSON.stringify(bodies));
      for (const publication of observed) {
        assert.ok(
          allowedKeys.includes(JSON.stringify(publication.bodies)),
          `${label} emitted a mixed comment publication: ${JSON.stringify(publication)}`,
        );
      }
    },
    assertFaultSince(mark, { expectedBodies, expectedCode, label }) {
      const observed = publications.slice(mark);
      assert.ok(observed.length > 0, `${label} must publish at least once`);
      for (const publication of observed) {
        assert.deepEqual(
          publication.bodies,
          expectedBodies,
          `${label} must retain the exact comment prefix`,
        );
      }
      assert.ok(
        observed.some(
          (publication) =>
            publication.status === "Error" &&
            publication.errorCode === expectedCode,
        ),
        `${label} must publish typed ${expectedCode} state`,
      );
    },
  };
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

function recordEveryPublication(store) {
  const publications = [];
  const stop = store.subscribe(() => {
    const snapshot = store.getSnapshot();
    publications.push({
      labels: snapshot.results.map((item) => item.label),
      status: snapshot.status,
      errorCode: snapshot.error?.code,
    });
  });
  return {
    mark: () => publications.length,
    stop,
    assertExactSince(mark, allowed, label) {
      const observed = publications.slice(mark);
      assert.ok(observed.length > 0, `${label} must publish at least once`);
      const allowedKeys = allowed.map((labels) => JSON.stringify(labels));
      for (const publication of observed) {
        assert.ok(
          allowedKeys.includes(JSON.stringify(publication.labels)),
          `${label} emitted a mixed publication: ${JSON.stringify(publication)}`,
        );
      }
    },
    assertFaultSince(mark, { expectedLabels, expectedCode, label }) {
      const observed = publications.slice(mark);
      assert.ok(observed.length > 0, `${label} must publish at least once`);
      for (const publication of observed) {
        assert.deepEqual(
          publication.labels,
          expectedLabels,
          `${label} must retain the exact coherent prefix`,
        );
      }
      assert.ok(
        observed.some(
          (publication) =>
            publication.status === "Error" &&
            publication.errorCode === expectedCode,
        ),
        `${label} must publish typed ${expectedCode} state`,
      );
    },
  };
}

function productIds(snapshot) {
  return snapshot.results.map((item) => `${item.id}@${item.postId}`);
}

function productPageIds(result) {
  return (result?.page ?? []).map((item) => `${item.id}@${item.postId}`);
}

function productChains(records) {
  const chains = [];
  const visit = (cursor, chain) => {
    for (const record of records.filter(
      (candidate) => candidate.args.paginationOpts.cursor === cursor,
    )) {
      if (chain.includes(record)) continue;
      const next = [...chain, record];
      const endCursor = record.args.paginationOpts.endCursor;
      if (endCursor === undefined) chains.push(next);
      else visit(endCursor, next);
    }
  };
  visit(null, []);
  return chains;
}

function activeProductBoundaries(tracking, { name, scopeId, snapshot }) {
  const active = tracking.records.filter(
    (record) =>
      record.active > 0 &&
      record.name === name &&
      record.args.scopeId === scopeId &&
      record.args.paginationOpts,
  );
  assert.ok(active.length > 0, "expected active installed product watches");
  const sessionId = active[0].args.paginationOpts.id;
  assert.ok(
    active.every((record) => record.args.paginationOpts.id === sessionId),
    "one store must use one pagination session",
  );
  const chains = productChains(active);
  if (chains.length === 1 && active.length === chains[0].length) {
    return extractDescriptorChain(tracking.records, {
      name,
      scopeId,
      sessionId: active[0].args.paginationOpts.id,
    });
  }
  const wanted = productIds(snapshot);
  const candidates = chains.filter((chain) => {
    if (chain.some((record) => record.result === undefined && !record.error)) {
      return false;
    }
    const ids = chain.flatMap((record) => productPageIds(record.result));
    return JSON.stringify(ids) === JSON.stringify(wanted);
  });
  assert.equal(
    candidates.length,
    1,
    `expected one exact active descriptor chain for ${name}`,
  );
  return assertExactDescriptorChain(
    candidates[0].map((record) => record.args.paginationOpts),
  );
}

function recordExactProductPublications({
  store,
  tracking,
  reader,
  generation,
  name,
  scopeId,
}) {
  const recorder = createPublicationRecorder();
  const stop = store.subscribe(() => {
    const snapshot = store.getSnapshot();
    recorder.push({
      reader,
      generation,
      status: snapshot.status,
      ids: productIds(snapshot),
      boundaries: activeProductBoundaries(tracking, {
        name,
        scopeId,
        snapshot,
      }),
      ...(snapshot.error?.code === undefined
        ? {}
        : { errorCode: snapshot.error.code }),
    });
  });
  return { recorder, stop, cursor: 0, expected: [], reader, generation };
}

function expectedProductPublication(state, publication) {
  return {
    reader: state.reader,
    generation: state.generation,
    ...publication,
  };
}

async function expectExactProductPublication(state, publication, label) {
  const expected = expectedProductPublication(state, publication);
  const next = await awaitNextPublication(
    state.recorder,
    state.cursor,
    Date.now() + 20_000,
    label,
  );
  assertExactPublicationSequence(
    [next.publication],
    createExpectedPublicationModel({
      reader: state.reader,
      generation: state.generation,
      publications: [expected],
    }),
  );
  state.cursor = next.cursor;
  state.expected.push(expected);
}

function assertCompleteProductSequence(state, deferredDeliveries = []) {
  assertExactPublicationSequence(
    state.recorder.publications,
    createExpectedPublicationModel({
      reader: state.reader,
      generation: state.generation,
      publications: state.expected,
      deferredDeliveries,
    }),
    deferredDeliveries,
  );
}

async function productTruth(http, truthReference, args, reader) {
  return (await http.query(truthReference, args))[reader];
}

async function exactProductTruthPublication({
  http,
  truthReference,
  args,
  state,
  boundaries,
  status,
  label,
}) {
  const ids = await productTruth(http, truthReference, args, state.reader);
  await expectExactProductPublication(
    state,
    { status, ids, boundaries },
    label,
  );
  return ids;
}

async function advanceProductMerge(http, references, job, wanted) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const current = await http.query(references.state, job);
    if (current.state === wanted) return current;
    await http.mutation(references.step, job);
  }
  throw new Error(`product merge did not reach ${wanted}`);
}

async function proveInstalledProductWatches({
  react,
  http,
  queryModule,
  tracking,
  references,
}) {
  const alpha = await http.mutation(references.seed, {
    scopeId: "product-alpha",
    relationCount: 51,
  });
  const beta = await http.mutation(references.seed, {
    scopeId: "product-beta",
    relationCount: 8,
  });
  const alphaArgs = {
    scopeId: "product-alpha",
    postId: alpha.canonicalPostId,
  };
  const betaArgs = {
    scopeId: "product-beta",
    postId: beta.canonicalPostId,
  };
  const readerName = (reader) =>
    reader === "comments"
      ? "harness:listProductComments"
      : "harness:listProductActivity";
  const makeStore = (
    reader,
    args,
    generation,
    initialNumItems = 50,
    client = tracking,
  ) =>
    queryModule.createPaginatedWatchStore({
      client,
      query:
        reader === "comments"
          ? references.listComments
          : references.listActivity,
      args,
      generation,
      initialNumItems,
    });
  const lifecycle = new Map();
  for (const [reader, generation] of [
    ["comments", 100],
    ["activity", 101],
  ]) {
    const store = makeStore(reader, alphaArgs, generation);
    const publications = recordExactProductPublications({
      store,
      tracking,
      reader,
      generation,
      name: readerName(reader),
      scopeId: alphaArgs.scopeId,
    });
    lifecycle.set(reader, { store, publications });
    const boundaries = [{ cursor: null, numItems: 50 }];
    await expectExactProductPublication(
      publications,
      { status: "LoadingFirstPage", ids: [], boundaries },
      `installed product ${reader} loading publication`,
    );
    const ids = await exactProductTruthPublication({
      http,
      truthReference: references.truth,
      args: alphaArgs,
      state: publications,
      boundaries,
      status: "Exhausted",
      label: `installed product ${reader} initial publication`,
    });
    lifecycle.get(reader).ids = ids;
    lifecycle.get(reader).boundaries = boundaries;
  }

  const begun = await http.mutation(references.begin, {
    scopeId: "product-alpha",
    adminId: alpha.adminId,
    sourcePostId: alpha.sourcePostId,
    canonicalPostId: alpha.canonicalPostId,
  });
  const job = { scopeId: "product-alpha", jobId: begun.jobId };
  await advanceProductMerge(http, references, job, "ready");
  await http.mutation(references.step, job);
  for (const reader of ["comments", "activity"]) {
    const current = lifecycle.get(reader);
    const before = current.ids;
    current.ids = await exactProductTruthPublication({
      http,
      truthReference: references.truth,
      args: alphaArgs,
      state: current.publications,
      boundaries: current.boundaries,
      status: "Exhausted",
      label: `product merge length 1 to 2 ${reader}`,
    });
    assert.ok(current.ids.length > before.length);
    await http.mutation(references.setMode, { reader, mode: "first" });
    await expectExactProductPublication(
      current.publications,
      {
        status: "Error",
        ids: [],
        boundaries: current.boundaries,
        errorCode: "TRANSIENT",
      },
      `installed product ${reader} coupled error`,
    );
    await http.mutation(references.setMode, { reader, mode: "none" });
    await expectExactProductPublication(
      current.publications,
      {
        status: "Exhausted",
        ids: current.ids,
        boundaries: current.boundaries,
      },
      `installed product ${reader} coupled recovery`,
    );
  }

  await http.mutation(references.insert, {
    scopeId: "product-alpha",
    postId: alpha.sourcePostId,
    kind: "comment",
    label: "product inserted root",
  });
  let current = lifecycle.get("comments");
  current.ids = await exactProductTruthPublication({
    http,
    truthReference: references.truth,
    args: alphaArgs,
    state: current.publications,
    boundaries: current.boundaries,
    status: "Exhausted",
    label: "installed product root comment insertion",
  });
  await http.mutation(references.insert, {
    scopeId: "product-alpha",
    postId: alpha.sourcePostId,
    kind: "comment",
    label: "product inserted reply",
    parentCommentId: alpha.rootCommentId,
  });
  current.ids = await exactProductTruthPublication({
    http,
    truthReference: references.truth,
    args: alphaArgs,
    state: current.publications,
    boundaries: current.boundaries,
    status: "Exhausted",
    label: "installed product reply insertion",
  });
  await http.mutation(references.insert, {
    scopeId: "product-alpha",
    postId: alpha.sourcePostId,
    kind: "activity",
    label: "product inserted activity",
  });
  current = lifecycle.get("activity");
  current.ids = await exactProductTruthPublication({
    http,
    truthReference: references.truth,
    args: alphaArgs,
    state: current.publications,
    boundaries: current.boundaries,
    status: "Exhausted",
    label: "installed product activity insertion",
  });

  current = lifecycle.get("comments");
  await http.mutation(references.delete, {
    scopeId: "product-alpha",
    kind: "comment",
    id: current.ids[Math.floor(current.ids.length / 2)].split("@")[0],
  });
  current.ids = await exactProductTruthPublication({
    http,
    truthReference: references.truth,
    args: alphaArgs,
    state: current.publications,
    boundaries: current.boundaries,
    status: "Exhausted",
    label: "installed product middle comment deletion",
  });

  current = lifecycle.get("activity");
  await http.mutation(references.delete, {
    scopeId: "product-alpha",
    kind: "activity",
    id: current.ids[Math.floor(current.ids.length / 2)].split("@")[0],
  });
  current.ids = await exactProductTruthPublication({
    http,
    truthReference: references.truth,
    args: alphaArgs,
    state: current.publications,
    boundaries: current.boundaries,
    status: "Exhausted",
    label: "installed product middle activity deletion",
  });

  let state = await http.query(references.state, job);
  assert.equal(state.state, "cutover_done");
  await http.mutation(references.step, job);
  state = await http.query(references.state, job);
  assert.equal(state.state, "cleaning");
  const cleanupPublications = { comments: 0, activity: 0 };
  while (state.state === "cleaning") {
    const before = {
      comments: lifecycle.get("comments").ids,
      activity: lifecycle.get("activity").ids,
    };
    await http.mutation(references.step, job);
    state = await http.query(references.state, job);
    for (const reader of ["comments", "activity"]) {
      const next = await productTruth(
        http,
        references.truth,
        alphaArgs,
        reader,
      );
      if (JSON.stringify(next) !== JSON.stringify(before[reader])) {
        current = lifecycle.get(reader);
        await expectExactProductPublication(
          current.publications,
          {
            status: "Exhausted",
            ids: next,
            boundaries: current.boundaries,
          },
          state.state === "done"
            ? `product merge length 2 to 1 ${reader}`
            : `product merge cleaning repoint ${reader}`,
        );
        current.ids = next;
        if (state.state !== "done") cleanupPublications[reader] += 1;
      }
    }
  }
  assert.equal(state.state, "done");
  assert.ok(cleanupPublications.comments > 0);
  assert.ok(cleanupPublications.activity > 0);
  for (const { store, publications } of lifecycle.values()) {
    assertCompleteProductSequence(publications);
    publications.stop();
    store.dispose();
  }

  for (const [reader, generation] of [
    ["comments", 300],
    ["activity", 301],
  ]) {
    const store = makeStore(reader, alphaArgs, generation, 2);
    const publications = recordExactProductPublications({
      store,
      tracking,
      reader,
      generation,
      name: readerName(reader),
      scopeId: alphaArgs.scopeId,
    });
    const first = (await productTruth(
      http,
      references.truth,
      alphaArgs,
      reader,
    )).slice(0, 2);
    const firstBoundary = [{ cursor: null, numItems: 2 }];
    await expectExactProductPublication(
      publications,
      {
        status: "LoadingFirstPage",
        ids: [],
        boundaries: firstBoundary,
      },
      `installed product ${reader} first-page loading`,
    );
    await expectExactProductPublication(
      publications,
      { status: "CanLoadMore", ids: first, boundaries: firstBoundary },
      `installed product ${reader} first page`,
    );
    let baseline = first;
    let settledBoundaries = firstBoundary;
    for (let append = 1; append <= 2; append += 1) {
      store.loadMore(2);
      for (let loading = 0; loading < 5; loading += 1) {
        await expectExactProductPublication(
          publications,
          {
            status: "LoadingMore",
            ids: baseline,
            boundaries: settledBoundaries,
          },
          `installed product ${reader} append ${append} loading ${loading + 1}`,
        );
      }
      await waitFor(
        store,
        (snapshot) =>
          snapshot.status === "CanLoadMore" &&
          productIds(snapshot).length === 2 + append * 2,
        `installed product ${reader} append ${append} completion`,
      );
      const snapshot = store.getSnapshot();
      baseline = productIds(snapshot);
      settledBoundaries = activeProductBoundaries(tracking, {
        name: readerName(reader),
        scopeId: alphaArgs.scopeId,
        snapshot,
      });
      await expectExactProductPublication(
        publications,
        {
          status: "CanLoadMore",
          ids: baseline,
          boundaries: settledBoundaries,
        },
        `installed product ${reader} append ${append} settled`,
      );
    }
    assert.equal(baseline.length, 6);
    for (const [mode, prefixLength] of [
      ["first", 0],
      ["middle", 2],
      ["tail", 4],
    ]) {
      await http.mutation(references.setMode, { reader, mode });
      await expectExactProductPublication(
        publications,
        {
          status: "Error",
          ids: baseline.slice(0, prefixLength),
          boundaries: settledBoundaries,
          errorCode: "TRANSIENT",
        },
        `installed product ${reader} ${mode}-page failure`,
      );
      await http.mutation(references.setMode, { reader, mode: "none" });
      await expectExactProductPublication(
        publications,
        {
          status: "CanLoadMore",
          ids: baseline,
          boundaries: settledBoundaries,
        },
        `installed product ${reader} ${mode}-page recovery`,
      );
    }
    assertCompleteProductSequence(publications);
    publications.stop();
    store.dispose();
  }

  for (const [reader, generation] of [
    ["comments", 400],
    ["activity", 401],
  ]) {
    const deferred = createDeferredWatchTransport(react, {
      generationOf: () => generation,
    });
    const oldTracking = new TrackingWatchClient(deferred.client);
    const oldStore = makeStore(
      reader,
      alphaArgs,
      generation,
      50,
      oldTracking,
    );
    const stopOld = oldStore.subscribe(() => {});
    await waitFor(
      oldStore,
      (snapshot) => snapshot.status === "Exhausted",
      `installed stale ${reader} old A ready`,
    );
    deferred.deferNext({ generation, kind: "result" });
    await http.mutation(references.insert, {
      scopeId: alphaArgs.scopeId,
      postId: alpha.canonicalPostId,
      kind: reader === "comments" ? "comment" : "activity",
      label: `stale ${reader} result`,
    });
    await deferred.awaitHeld(Date.now() + 20_000, `held ${reader} result`);
    deferred.deferNext({ generation, kind: "error" });
    await http.mutation(references.setMode, { reader, mode: "first" });
    await deferred.awaitHeld(Date.now() + 20_000, `held ${reader} error`, 2);
    stopOld();
    oldStore.dispose();
    await http.mutation(references.setMode, { reader, mode: "none" });

    const betaStore = makeStore(reader, betaArgs, generation + 10);
    const stopBeta = betaStore.subscribe(() => {});
    await waitFor(
      betaStore,
      (snapshot) => snapshot.status === "Exhausted",
      `product ${reader} identity B`,
    );
    stopBeta();
    betaStore.dispose();
    const currentStore = makeStore(reader, alphaArgs, generation + 20);
    const stopCurrent = currentStore.subscribe(() => {});
    await waitFor(
      currentStore,
      (snapshot) => snapshot.status === "Exhausted",
      `product ${reader} identity A again`,
    );
    const observe = () => {
      const snapshot = currentStore.getSnapshot();
      return {
        ids: productIds(snapshot),
        status: snapshot.status,
        errorCode: snapshot.error?.code,
        boundaries: activeProductBoundaries(tracking, {
          name: readerName(reader),
          scopeId: alphaArgs.scopeId,
          snapshot,
        }),
      };
    };
    deferred.releaseNext(observe);
    deferred.releaseNext(observe);
    assert.deepEqual(deferred.deferredDeliveries, [
      { originGeneration: generation, kind: "result", rejected: true },
      { originGeneration: generation, kind: "error", rejected: true },
    ]);
    stopCurrent();
    currentStore.dispose();
    assert.ok(
      oldTracking.records.every(
        (record) => record.active === 0 && record.disposeCount === 1,
      ),
      `product ${reader} stale A watches must be disposed exactly once`,
    );
  }
  // Product comment identity A to B to A
  // Product activity identity A to B to A
}

async function waitUntil(predicate, label) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function proveAtomicClientTransition({
  react,
  http,
  list,
  insertItem,
  deleteItem,
}) {
  const watches = [1, 2, 3].map((numItems, index) =>
    react.watchQuery(list, {
      paginationOpts: { numItems, cursor: null, id: 90_000 + index },
    }),
  );
  let armed = false;
  const observations = [];
  const stops = watches.map((watch, listenerIndex) =>
    watch.onUpdate(() => {
      if (!armed) return;
      observations.push({
        listenerIndex,
        results: watches.map((sibling) => sibling.localQueryResult()),
      });
    }),
  );
  await waitUntil(
    () => watches.every((watch) => watch.localQueryResult() !== undefined),
    "three direct page watches",
  );
  armed = true;
  const expectedRevision = await http.mutation(insertItem, {
    label: "atomic-probe",
    position: 1,
  });
  await waitUntil(
    () => observations.length >= watches.length,
    "one callback from every changed direct page watch",
  );
  armed = false;
  for (const observation of observations) {
    assert.deepEqual(
      observation.results.map((result) => result?.revision),
      [expectedRevision, expectedRevision, expectedRevision],
      `listener ${observation.listenerIndex} must reread one installed client transition`,
    );
  }
  for (const stop of stops) stop();
  await http.mutation(deleteItem, { label: "atomic-probe" });
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
  await cp(
    join(repositoryRoot, "src/component"),
    join(temporaryRoot, "component"),
    {
      recursive: true,
      filter: (source) => !source.includes("/_generated"),
    },
  );
  await writeFile(
    join(temporaryRoot, "component/probe.ts"),
    productProbeSource,
  );
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
  const setCommentMode = reference("setCommentMode");
  const seedItems = reference("seedItems");
  const insertItem = reference("insertItem");
  const deleteItem = reference("deleteItem");
  const moveItem = reference("moveItem");
  const canonical = reference("canonical");
  const direct = reference("direct");
  const list = reference("list");
  const seedComments = reference("seedComments");
  const insertComment = reference("insertComment");
  const deleteComment = reference("deleteComment");
  const canonicalComments = reference("canonicalComments");
  const listComments = reference("listComments");
  const productReferences = {
    seed: reference("seedProduct"),
    begin: reference("beginProductMerge"),
    step: reference("stepProductMerge"),
    state: reference("productMergeState"),
    truth: reference("productTruth"),
    insert: reference("insertProductRow"),
    delete: reference("deleteProductRow"),
    setMode: reference("setProductMode"),
    listComments: reference("listProductComments"),
    listActivity: reference("listProductActivity"),
  };
  await http.mutation(seedItems, { labels: ["a", "b", "c", "d", "e", "f"] });
  setupComplete = true;

  try {
    await proveAtomicClientTransition({
      react,
      http,
      list,
      insertItem,
      deleteItem,
    });
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
    const pagePublications = recordEveryPublication(pageStore);
    const stopPages = pagePublications.stop;
    const first = await waitFor(
      pageStore,
      (snapshot) => snapshot.status === "CanLoadMore",
      "first page",
    );
    await assertCanonicalWindow(http, canonical, tracking, first, ["a", "b"]);
    let publicationMark = pagePublications.mark();
    await http.mutation(setMode, { mode: "later" });
    pageStore.loadMore(2);
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
    pagePublications.assertFaultSince(publicationMark, {
      expectedLabels: ["a", "b"],
      expectedCode: "TRANSIENT",
      label: "pending append failure",
    });
    publicationMark = pagePublications.mark();
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
    pagePublications.assertExactSince(
      publicationMark,
      [
        ["a", "b"],
        ["a", "b", "c", "d"],
      ],
      "pending append recovery",
    );

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

    for (const [mode, expectedPrefix, label] of [
      ["first", [], "first-page failure"],
      ["middle", ["a", "b"], "middle-page failure"],
      ["tail", ["a", "b", "c", "d"], "tail-page failure"],
    ]) {
      publicationMark = pagePublications.mark();
      await http.mutation(setMode, { mode });
      await waitFor(
        pageStore,
        (snapshot) =>
          snapshot.status === "Error" &&
          JSON.stringify(snapshot.results.map((item) => item.label)) ===
            JSON.stringify(expectedPrefix),
        label,
      );
      pagePublications.assertFaultSince(publicationMark, {
        expectedLabels: expectedPrefix,
        expectedCode: "TRANSIENT",
        label,
      });
      publicationMark = pagePublications.mark();
      await http.mutation(setMode, { mode: "none" });
      await waitFor(
        pageStore,
        (snapshot) =>
          snapshot.status !== "Error" &&
          JSON.stringify(snapshot.results.map((item) => item.label)) ===
            JSON.stringify(["a", "b", "c", "d", "e", "f"]),
        `${label} recovery`,
      );
      pagePublications.assertExactSince(
        publicationMark,
        [expectedPrefix, ["a", "b", "c", "d", "e", "f"]],
        `${label} recovery`,
      );
    }

    publicationMark = pagePublications.mark();
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
    pagePublications.assertExactSince(
      publicationMark,
      [
        ["a", "b", "c", "d", "e", "f"],
        ["zero", "a", "b", "c", "d", "e", "f"],
      ],
      "front insertion",
    );

    publicationMark = pagePublications.mark();
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
    pagePublications.assertExactSince(
      publicationMark,
      [
        ["zero", "a", "b", "c", "d", "e", "f"],
        ["zero", "a", "b", "c", "middle", "d", "e", "f"],
      ],
      "middle insertion",
    );

    publicationMark = pagePublications.mark();
    await http.mutation(insertItem, { label: "back", position: 55 });
    const backInserted = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
        JSON.stringify([
          "zero",
          "a",
          "b",
          "c",
          "middle",
          "d",
          "e",
          "back",
          "f",
        ]),
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
    pagePublications.assertExactSince(
      publicationMark,
      [
        ["zero", "a", "b", "c", "middle", "d", "e", "f"],
        ["zero", "a", "b", "c", "middle", "d", "e", "back", "f"],
      ],
      "back insertion",
    );

    publicationMark = pagePublications.mark();
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
    pagePublications.assertExactSince(
      publicationMark,
      [
        ["zero", "a", "b", "c", "middle", "d", "e", "back", "f"],
        ["a", "b", "c", "middle", "d", "e", "back", "f"],
      ],
      "front deletion",
    );

    publicationMark = pagePublications.mark();
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
    pagePublications.assertExactSince(
      publicationMark,
      [
        ["a", "b", "c", "middle", "d", "e", "back", "f"],
        ["a", "b", "c", "d", "e", "back", "f"],
      ],
      "middle deletion",
    );

    publicationMark = pagePublications.mark();
    await http.mutation(deleteItem, { label: "c" });
    const cDeleted = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
        JSON.stringify(["a", "b", "d", "e", "back", "f"]),
      "first middle-window deletion",
    );
    await assertCanonicalWindow(http, canonical, tracking, cDeleted, [
      "a",
      "b",
      "d",
      "e",
      "back",
      "f",
    ]);
    pagePublications.assertExactSince(
      publicationMark,
      [
        ["a", "b", "c", "d", "e", "back", "f"],
        ["a", "b", "d", "e", "back", "f"],
      ],
      "middle-window deletion",
    );

    publicationMark = pagePublications.mark();
    await http.mutation(deleteItem, { label: "d" });
    const collapsed = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
          JSON.stringify(["a", "b", "e", "back", "f"]) &&
        snapshot.status !== "LoadingMore" &&
        tracking
          .activePages()
          .some(
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
    pagePublications.assertExactSince(
      publicationMark,
      [
        ["a", "b", "d", "e", "back", "f"],
        ["a", "b", "e", "back", "f"],
      ],
      "empty-window collapse",
    );

    publicationMark = pagePublications.mark();
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
    pagePublications.assertExactSince(
      publicationMark,
      [
        ["a", "b", "e", "back", "f"],
        ["e", "a", "b", "back", "f"],
      ],
      "cross-window sort movement",
    );

    publicationMark = pagePublications.mark();
    await http.mutation(moveItem, { label: "e", position: 50 });
    const movedBack = await waitFor(
      pageStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.label)) ===
        JSON.stringify(["a", "b", "e", "back", "f"]),
      "reverse cross-window sort movement",
    );
    await assertCanonicalWindow(http, canonical, tracking, movedBack, [
      "a",
      "b",
      "e",
      "back",
      "f",
    ]);
    pagePublications.assertExactSince(
      publicationMark,
      [
        ["e", "a", "b", "back", "f"],
        ["a", "b", "e", "back", "f"],
      ],
      "reverse cross-window sort movement",
    );

    const thresholdExpectations = [
      [1200, "SplitRequired", false],
      [1800, "SplitRequired", false],
      [2300, "SplitRequired", true],
      [2800, "SplitRequired", true],
      [4300, "SplitRequired", true],
      [8000, null, true],
    ];
    for (const [
      maximumBytesRead,
      pageStatus,
      hasSplitCursor,
    ] of thresholdExpectations) {
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
    const opportunisticPublications =
      recordEveryPublication(opportunisticStore);
    const stopOpportunistic = opportunisticPublications.stop;
    await waitFor(
      opportunisticStore,
      (snapshot) => snapshot.results.length === 2,
      "opportunistic split seed",
    );
    publicationMark = opportunisticPublications.mark();
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
    await assertCanonicalWindow(http, canonical, tracking, split, [
      "r1",
      "r2",
      "r3",
      "s1",
      "s2",
    ]);
    opportunisticPublications.assertExactSince(
      publicationMark,
      [
        ["s1", "s2"],
        ["r1", "s1", "s2"],
        ["r1", "r2", "s1", "s2"],
        ["r1", "r2", "r3", "s1", "s2"],
      ],
      "opportunistic split transition",
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
    const requiredPublications = recordEveryPublication(requiredStore);
    const stopRequired = requiredPublications.stop;
    publicationMark = requiredPublications.mark();
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
    requiredPublications.assertExactSince(
      publicationMark,
      [[], ["q1", "q2", "q3", "q4", "q5", "q6"]],
      "required split transition",
    );
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
    const missingCursorPublications =
      recordEveryPublication(missingCursorStore);
    const stopMissingCursor = missingCursorPublications.stop;
    publicationMark = missingCursorPublications.mark();
    const missingCursor = await waitFor(
      missingCursorStore,
      (snapshot) => snapshot.status === "Error",
      "native required split without cursor",
    );
    assert.deepEqual(missingCursor.results, []);
    assert.equal(missingCursor.error?.code, "UNKNOWN");
    missingCursorPublications.assertFaultSince(publicationMark, {
      expectedLabels: [],
      expectedCode: "UNKNOWN",
      label: "required split missing-cursor failure",
    });
    publicationMark = missingCursorPublications.mark();
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
    missingCursorPublications.assertExactSince(
      publicationMark,
      [[], ["q1", "q2"]],
      "required split missing-cursor recovery",
    );
    stopMissingCursor();
    missingCursorStore.dispose();

    const commentPostId = "post:comments";
    await http.mutation(seedComments, {
      postId: commentPostId,
      rows: [
        { label: "root-a", position: 10 },
        { label: "reply-a", position: 20, parentLabel: "root-a" },
        { label: "root-b", position: 30 },
        { label: "root-c", position: 40 },
      ],
    });
    const commentStore = queryModule.createPaginatedWatchStore({
      client: tracking,
      query: listComments,
      args: { postId: commentPostId },
      generation: 10,
      initialNumItems: 1,
    });
    const commentPublications = recordEveryCommentPublication(commentStore);
    const stopComments = commentPublications.stop;
    await waitFor(
      commentStore,
      (snapshot) => snapshot.status === "CanLoadMore",
      "comment feed first root",
    );
    for (let loaded = 1; loaded < 4; loaded += 1) {
      commentStore.loadMore(1);
      await waitFor(
        commentStore,
        (snapshot) =>
          snapshot.results.length === loaded + 1 &&
          snapshot.status !== "LoadingMore",
        `comment feed page ${loaded + 1}`,
      );
    }
    let commentSnapshot = commentStore.getSnapshot();
    await assertCanonicalCommentWindow({
      http,
      canonicalComments,
      tracker: tracking,
      snapshot: commentSnapshot,
      postId: commentPostId,
      expectedBodies: ["root-a", "reply-a", "root-b", "root-c"],
    });
    const initialCommentTruth = await http.query(canonicalComments, {
      postId: commentPostId,
    });
    assert.equal(initialCommentTruth.rows[0].parentCommentId, undefined);
    assert.equal(
      initialCommentTruth.rows[1].parentCommentId,
      initialCommentTruth.rows[0].id,
      "reply must preserve its exact root parentCommentId",
    );

    for (const [faultMode, expectedBodies, label] of [
      ["first", [], "comment first-page failure"],
      ["middle", ["root-a"], "comment middle-page failure"],
      ["tail", ["root-a", "reply-a", "root-b"], "comment tail-page failure"],
    ]) {
      let commentMark = commentPublications.mark();
      await http.mutation(setCommentMode, { mode: faultMode });
      await waitFor(
        commentStore,
        (snapshot) =>
          snapshot.status === "Error" &&
          JSON.stringify(snapshot.results.map((item) => item.body)) ===
            JSON.stringify(expectedBodies),
        label,
      );
      commentPublications.assertFaultSince(commentMark, {
        expectedBodies,
        expectedCode: "TRANSIENT",
        label,
      });
      commentMark = commentPublications.mark();
      await http.mutation(setCommentMode, { mode: "none" });
      await waitFor(
        commentStore,
        (snapshot) =>
          snapshot.status !== "Error" &&
          JSON.stringify(snapshot.results.map((item) => item.body)) ===
            JSON.stringify(["root-a", "reply-a", "root-b", "root-c"]),
        `${label} recovery`,
      );
      commentPublications.assertExactSince(
        commentMark,
        [expectedBodies, ["root-a", "reply-a", "root-b", "root-c"]],
        `${label} recovery`,
      );
    }

    let commentMark = commentPublications.mark();
    await http.mutation(insertComment, {
      postId: commentPostId,
      label: "root-zero",
      position: 5,
    });
    commentSnapshot = await waitFor(
      commentStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.body)) ===
        JSON.stringify(["root-zero", "root-a", "reply-a", "root-b", "root-c"]),
      "comment root insertion",
    );
    await assertCanonicalCommentWindow({
      http,
      canonicalComments,
      tracker: tracking,
      snapshot: commentSnapshot,
      postId: commentPostId,
      expectedBodies: ["root-zero", "root-a", "reply-a", "root-b", "root-c"],
    });
    commentPublications.assertExactSince(
      commentMark,
      [
        ["root-a", "reply-a", "root-b", "root-c"],
        ["root-zero", "root-a", "reply-a", "root-b", "root-c"],
      ],
      "comment root insertion",
    );

    commentMark = commentPublications.mark();
    await http.mutation(insertComment, {
      postId: commentPostId,
      label: "reply-new",
      position: 15,
      parentLabel: "root-a",
    });
    commentSnapshot = await waitFor(
      commentStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.body)) ===
        JSON.stringify([
          "root-zero",
          "root-a",
          "reply-new",
          "reply-a",
          "root-b",
          "root-c",
        ]),
      "comment reply insertion",
    );
    await assertCanonicalCommentWindow({
      http,
      canonicalComments,
      tracker: tracking,
      snapshot: commentSnapshot,
      postId: commentPostId,
      expectedBodies: [
        "root-zero",
        "root-a",
        "reply-new",
        "reply-a",
        "root-b",
        "root-c",
      ],
    });
    commentPublications.assertExactSince(
      commentMark,
      [
        ["root-zero", "root-a", "reply-a", "root-b", "root-c"],
        ["root-zero", "root-a", "reply-new", "reply-a", "root-b", "root-c"],
      ],
      "comment reply insertion",
    );

    commentMark = commentPublications.mark();
    await http.mutation(deleteComment, {
      postId: commentPostId,
      label: "root-b",
    });
    commentSnapshot = await waitFor(
      commentStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.body)) ===
        JSON.stringify([
          "root-zero",
          "root-a",
          "reply-new",
          "reply-a",
          "root-c",
        ]),
      "comment middle deletion",
    );
    await assertCanonicalCommentWindow({
      http,
      canonicalComments,
      tracker: tracking,
      snapshot: commentSnapshot,
      postId: commentPostId,
      expectedBodies: ["root-zero", "root-a", "reply-new", "reply-a", "root-c"],
    });
    commentPublications.assertExactSince(
      commentMark,
      [
        ["root-zero", "root-a", "reply-new", "reply-a", "root-b", "root-c"],
        ["root-zero", "root-a", "reply-new", "reply-a", "root-c"],
      ],
      "comment middle deletion",
    );

    stopComments();
    commentStore.dispose();
    const disposedCommentRecords = tracking.records.filter(
      (record) => record.name === "harness:listComments",
    );

    const pendingPostId = "post:pending-comments";
    await http.mutation(seedComments, {
      postId: pendingPostId,
      rows: [
        { label: "pending-a", position: 10 },
        { label: "pending-b", position: 20 },
        { label: "pending-c", position: 30 },
      ],
    });
    const pendingCommentStore = queryModule.createPaginatedWatchStore({
      client: tracking,
      query: listComments,
      args: { postId: pendingPostId },
      generation: 11,
      initialNumItems: 1,
    });
    const pendingPublications =
      recordEveryCommentPublication(pendingCommentStore);
    const stopPendingComments = pendingPublications.stop;
    await waitFor(
      pendingCommentStore,
      (snapshot) => snapshot.status === "CanLoadMore",
      "pending comment first page",
    );
    const pendingMark = pendingPublications.mark();
    pendingCommentStore.loadMore(1);
    await http.mutation(insertComment, {
      postId: pendingPostId,
      label: "pending-new",
      position: 15,
    });
    const pendingSnapshot = await waitFor(
      pendingCommentStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.body)) ===
          JSON.stringify(["pending-a", "pending-new", "pending-b"]) &&
        snapshot.status !== "LoadingMore",
      "pending comment load mutation",
    );
    await waitUntil(() => {
      try {
        assertActiveBoundaries(tracking);
        return true;
      } catch {
        return false;
      }
    }, "pending comment structural replacement");
    await assertCanonicalCommentWindow({
      http,
      canonicalComments,
      tracker: tracking,
      snapshot: pendingSnapshot,
      postId: pendingPostId,
      expectedBodies: ["pending-a", "pending-new", "pending-b"],
    });
    pendingPublications.assertExactSince(
      pendingMark,
      [
        ["pending-a"],
        ["pending-a", "pending-b"],
        ["pending-a", "pending-new", "pending-b"],
      ],
      "pending comment load mutation",
    );
    stopPendingComments();
    pendingCommentStore.dispose();

    const identityPostId = "post:identity-b";
    await http.mutation(seedComments, {
      postId: identityPostId,
      rows: [{ label: "identity-b", position: 10 }],
    });
    const identityStore = queryModule.createPaginatedWatchStore({
      client: tracking,
      query: listComments,
      args: { postId: identityPostId },
      generation: 12,
      initialNumItems: 1,
    });
    const stopIdentity = identityStore.subscribe(() => {});
    const identitySnapshot = await waitFor(
      identityStore,
      (snapshot) =>
        JSON.stringify(snapshot.results.map((item) => item.body)) ===
        JSON.stringify(["identity-b"]),
      "comment identity replacement",
    );
    await assertCanonicalCommentWindow({
      http,
      canonicalComments,
      tracker: tracking,
      snapshot: identitySnapshot,
      postId: identityPostId,
      expectedBodies: ["identity-b"],
    });
    assert.ok(
      disposedCommentRecords.every(
        (record) => record.active === 0 && record.disposeCount === 1,
      ),
      "comment identity replacement must dispose every old generation watch exactly once",
    );
    stopIdentity();
    identityStore.dispose();

    await proveInstalledProductWatches({
      react,
      http,
      queryModule,
      tracking,
      references: productReferences,
    });

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
