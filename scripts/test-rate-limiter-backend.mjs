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
const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-rate-backend-"));
const convexBinary = join(repositoryRoot, "node_modules/.bin/convex");
let developmentProcess;

const harnessSource = `
import { componentsGeneric, mutationGeneric as mutation } from "convex/server";
import { v } from "convex/values";
const components = componentsGeneric();
const actor = v.object({ externalKey: v.string() });
export const configure = mutation({
  args: { scopeId: v.string() }, returns: v.any(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.admin.installation.configureInstallation, {
    scopeId: args.scopeId, readPolicy: "public", boards: [{ slug: "feedback", name: "Feedback" }],
  }),
});
export const create = mutation({
  args: { scopeId: v.string(), actor, boardId: v.string(), title: v.string() }, returns: v.any(),
  handler: (ctx, args) => ctx.runMutation(components.afferent.participation.posts.createPost, {
    ...args, body: "Real backend OCC rate-limit proof",
  }),
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
  await symlink(
    join(repositoryRoot, "node_modules"),
    join(temporaryRoot, "node_modules"),
  );
  await writeFile(
    join(temporaryRoot, "package.json"),
    '{"type":"module","dependencies":{"convex":"1.42.2","convex-helpers":"0.1.120","@convex-dev/rate-limiter":"0.3.2"}}\n',
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
  const configure = reference("configure");
  const create = reference("create");

  const charged = await client.mutation(configure, {
    scopeId: "charged-failures",
  });
  for (let index = 0; index < 5; index += 1) {
    const invalid = await client.mutation(create, {
      scopeId: "charged-failures",
      actor: { externalKey: "fixture:charged" },
      boardId: charged.boards[0].id,
      title: " ",
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error.code, "VALIDATION");
  }
  const deniedAfterInvalid = await client.mutation(create, {
    scopeId: "charged-failures",
    actor: { externalKey: "fixture:charged" },
    boardId: charged.boards[0].id,
    title: "Would otherwise be valid",
  });
  assert.equal(deniedAfterInvalid.error.code, "RATE_LIMITED");
  assert.equal(deniedAfterInvalid.error.operation, "create_post");
  assert.ok(deniedAfterInvalid.error.retryAfterMs > 0);

  const concurrent = await client.mutation(configure, {
    scopeId: "occ-concurrency",
  });
  const OCC_CONCURRENCY = 20;
  const results = await Promise.all(
    Array.from({ length: OCC_CONCURRENCY }, (_, index) =>
      client.mutation(create, {
        scopeId: "occ-concurrency",
        actor: { externalKey: "fixture:occ" },
        boardId: concurrent.boards[0].id,
        title: `Concurrent ${index}`,
      }),
    ),
  );
  assert.equal(results.filter((result) => result.ok !== false).length, 5);
  assert.equal(
    results.filter((result) => result.error?.code === "RATE_LIMITED").length,
    OCC_CONCURRENCY - 5,
  );

  const repeatedDenial = await client.mutation(create, {
    scopeId: "occ-concurrency",
    actor: { externalKey: "fixture:occ" },
    boardId: concurrent.boards[0].id,
    title: "Repeated denial",
  });
  assert.equal(repeatedDenial.error.code, "RATE_LIMITED");
  assert.ok(repeatedDenial.error.retryAfterMs > 0);

  console.log("Real Convex rate-limit commit and OCC matrix passed");
} finally {
  await stopBackend();
  await rm(temporaryRoot, { force: true, recursive: true });
}
