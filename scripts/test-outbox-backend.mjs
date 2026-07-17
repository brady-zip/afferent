import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-outbox-backend-"));
const convexBinary = join(repositoryRoot, "node_modules/.bin/convex");
let developmentProcess;

const probeSource = `
import { v } from "convex/values";
import { mutation } from "./_generated/server.js";
import { materializeRecipientRow } from "./notifications/fanout.js";
export const seed = mutation({
  args: { scopeId: v.string() },
  returns: v.object({ eventId: v.string() }),
  handler: async (ctx, args) => {
    const initiatorActorId = await ctx.db.insert("actors", { scopeId: args.scopeId, externalKey: args.scopeId + ":initiator" });
    const actorId = await ctx.db.insert("actors", { scopeId: args.scopeId, externalKey: args.scopeId + ":recipient" });
    const eventId = await ctx.db.insert("notificationEvents", {
      scopeId: args.scopeId, type: "status_changed", initiatorActorId,
      entityId: "post:one", occurredAt: Date.now(), guardKey: args.scopeId + ":outbox",
    });
    const recipientId = await ctx.db.insert("notificationEventRecipients", {
      scopeId: args.scopeId, eventId, actorId, state: "pending",
    });
    const recipient = await ctx.db.get(recipientId);
    if (!recipient) throw new Error("missing recipient");
    await materializeRecipientRow(ctx, recipient);
    return { eventId: String(eventId) };
  },
});
`;

const harnessSource = `
import { componentsGeneric, mutationGeneric as mutation } from "convex/server";
import { v } from "convex/values";
const components = componentsGeneric();
export const seed = mutation({ args: { scopeId: v.string() }, returns: v.any(), handler: (ctx, args) => ctx.runMutation(components.afferent.probe.seed, args) });
export const claim = mutation({ args: { scopeId: v.string(), leaseOwner: v.string(), limit: v.number() }, returns: v.any(), handler: (ctx, args) => ctx.runMutation(components.afferent.notifications.outbox.claimDeliveryBatch, args) });
export const ack = mutation({ args: { scopeId: v.string(), deliveryId: v.string(), leaseOwner: v.string(), leaseVersion: v.number() }, returns: v.any(), handler: (ctx, args) => ctx.runMutation(components.afferent.notifications.outbox.ackDelivery, args) });
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
    { cwd: temporaryRoot, env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" }, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  await Promise.race([
    new Promise((resolve, reject) => {
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
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out starting Convex backend")), 30_000)),
  ]);
}

function deploymentUrl(envFile) {
  const line = envFile.split("\n").find((candidate) => candidate.startsWith("CONVEX_URL="));
  assert.ok(line);
  return line.slice("CONVEX_URL=".length).trim();
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
  await writeFile(join(temporaryRoot, "convex/convex.config.ts"), 'import { defineApp } from "convex/server";\nimport afferent from "../component/convex.config.js";\nconst app = defineApp();\napp.use(afferent, { name: "afferent" });\nexport default app;\n');
  await writeFile(join(temporaryRoot, "convex/harness.ts"), harnessSource);
  await startBackend();

  const client = new ConvexHttpClient(deploymentUrl(await readFile(join(temporaryRoot, ".env.local"), "utf8")));
  const seeded = await client.mutation(reference("seed"), { scopeId: "scope:outbox" });
  const [left, right] = await Promise.all([
    client.mutation(reference("claim"), { scopeId: "scope:outbox", leaseOwner: "worker:left", limit: 50 }),
    client.mutation(reference("claim"), { scopeId: "scope:outbox", leaseOwner: "worker:right", limit: 50 }),
  ]);
  assert.equal(left.leases.length + right.leases.length, 1);
  const lease = left.leases[0] ?? right.leases[0];
  assert.equal(lease.event.recipientKey, "scope:outbox:recipient");
  assert.deepEqual(await client.mutation(reference("ack"), {
    scopeId: "scope:outbox",
    deliveryId: lease.id,
    leaseOwner: lease.leaseOwner,
    leaseVersion: lease.leaseVersion,
  }), { contractVersion: 1, ok: true, status: "acked" });
  assert.deepEqual(await client.mutation(reference("claim"), { scopeId: "scope:outbox", leaseOwner: "worker:new", limit: 50 }), { contractVersion: 1, leases: [] });
  assert.equal(seeded.eventId, lease.event.eventId);
} finally {
  await stopBackend();
  await rm(temporaryRoot, { force: true, recursive: true });
}
