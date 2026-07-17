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
const temporaryRoot = await mkdtemp(
  join(tmpdir(), "afferent-pagination-backend-"),
);
const convexBinary = join(repositoryRoot, "node_modules/.bin/convex");
let developmentProcess;

const harnessSource = `
import { componentsGeneric, mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

const components = componentsGeneric();
const actor = v.object({ externalKey: v.string(), displayName: v.optional(v.string()) });

export const configure = mutation({
  args: { scopeId: v.string(), readPolicy: v.union(v.literal("public"), v.literal("authenticated")), boards: v.array(v.object({ slug: v.string(), name: v.string() })) },
  returns: v.any(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.admin.installation.configureInstallation, args),
});
export const create = mutation({
  args: { scopeId: v.string(), actor, boardId: v.string(), title: v.string(), body: v.string() },
  returns: v.any(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.participation.posts.createPost, args),
});
export const edit = mutation({
  args: { scopeId: v.string(), actor, postId: v.string(), title: v.optional(v.string()), body: v.optional(v.string()) },
  returns: v.any(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.participation.posts.editPost, args),
});
export const withdraw = mutation({
  args: { scopeId: v.string(), actor, postId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.participation.posts.withdrawPost, args),
});
export const list = query({
  args: { scopeId: v.string(), boardId: v.string(), paginationOpts: v.any() },
  returns: v.any(),
  handler: (ctx, args) => ctx.runQuery(components.afferent.public.posts.listPosts, { ...args, viewerAuthenticated: false }),
});
export const get = query({
  args: { scopeId: v.string(), postId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => ctx.runQuery(components.afferent.public.posts.getPost, { ...args, viewerAuthenticated: false }),
});
`;

function functionReference(name) {
  return makeFunctionReference(`harness:${name}`);
}

async function stopDevelopmentProcess() {
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
  const match = /^CONVEX_URL=(?<url>.+)$/mu.exec(envFile);
  if (!match)
    throw new Error("Convex local deployment did not write CONVEX_URL");
  return match.groups.url.trim();
}

async function rejectedData(promise) {
  try {
    await promise;
  } catch (error) {
    return error.data;
  }
  throw new Error("Expected query to reject");
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
  await symlink(
    join(repositoryRoot, "node_modules"),
    join(temporaryRoot, "node_modules"),
  );
  await writeFile(
    join(temporaryRoot, "package.json"),
    '{"type":"module","dependencies":{"convex":"1.42.2","convex-helpers":"0.1.120"}}\n',
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
  const configure = functionReference("configure");
  const create = functionReference("create");
  const edit = functionReference("edit");
  const withdraw = functionReference("withdraw");
  const list = functionReference("list");
  const get = functionReference("get");

  const scopes = ["real-alpha", "real-beta"];
  const boardsByScope = new Map();
  const actorsByPostId = new Map();
  for (const scopeId of scopes) {
    const configured = await client.mutation(configure, {
      scopeId,
      readPolicy: "public",
      boards: [
        { slug: "feedback", name: "Feedback" },
        { slug: "bugs", name: "Bugs" },
      ],
    });
    boardsByScope.set(scopeId, configured.boards);
    for (let index = 0; index < 50; index += 1) {
      const actor = { externalKey: `fixture:${scopeId}:${index}` };
      const created = await client.mutation(create, {
        scopeId,
        actor,
        boardId: configured.boards[index % 2].id,
        title: `${scopeId}-${index.toString().padStart(2, "0")}`,
        body: scopeId,
      });
      assert.ok("id" in created, `seed post ${scopeId}:${index} was rejected`);
      actorsByPostId.set(created.id, actor);
    }
  }

  const alphaBoard = boardsByScope.get("real-alpha")[0];
  const betaBoard = boardsByScope.get("real-beta")[0];
  const first = await client.query(list, {
    scopeId: "real-alpha",
    boardId: alphaBoard.id,
    paginationOpts: { numItems: 10, cursor: null },
  });
  assert.equal(first.page.length, 10);
  assert.equal(first.isDone, false);
  assert.ok(first.page.every((post) => post.title.startsWith("real-alpha-")));

  const inserted = await client.mutation(create, {
    scopeId: "real-alpha",
    actor: { externalKey: "fixture:real-alpha:reactive" },
    boardId: alphaBoard.id,
    title: "real-alpha-reactive-insert",
    body: "real-alpha",
  });
  await client.mutation(edit, {
    scopeId: "real-alpha",
    actor: actorsByPostId.get(first.page[0].id),
    postId: first.page[0].id,
    title: "real-alpha-reactive-edit",
  });
  await client.mutation(withdraw, {
    scopeId: "real-alpha",
    actor: actorsByPostId.get(first.page[1].id),
    postId: first.page[1].id,
  });

  const fresh = [];
  let cursor = null;
  let done = false;
  while (!done) {
    const result = await client.query(list, {
      scopeId: "real-alpha",
      boardId: alphaBoard.id,
      paginationOpts: { numItems: 10, cursor },
    });
    fresh.push(...result.page.map((post) => post.id));
    cursor = result.continueCursor;
    done = result.isDone;
  }
  assert.equal(fresh.length, 25);
  assert.equal(new Set(fresh).size, fresh.length);
  assert.ok(fresh.includes(inserted.id));
  assert.ok(!fresh.includes(first.page[1].id));

  const beta = await client.query(list, {
    scopeId: "real-beta",
    boardId: betaBoard.id,
    paginationOpts: { numItems: 10, cursor: null },
  });
  assert.ok(beta.page.every((post) => post.title.startsWith("real-beta-")));
  assert.deepEqual(
    await rejectedData(
      client.query(get, {
        scopeId: "real-beta",
        postId: first.page[0].id,
      }),
    ),
    await rejectedData(
      client.query(get, { scopeId: "real-beta", postId: "not-an-id" }),
    ),
  );

  console.log("Real Convex pagination matrix passed");
} finally {
  await stopDevelopmentProcess();
  await rm(temporaryRoot, { force: true, recursive: true });
}
