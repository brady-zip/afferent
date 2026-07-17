import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function run(command, args, { cwd = root } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const env = { ...process.env, npm_config_workspaces: "false" };
    delete env.NODE_TEST_CONTEXT;
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", rejectRun);
    child.once("close", (code) => {
      if (code === 0) resolveRun({ stdout, stderr });
      else
        rejectRun(
          new Error(
            `${command} ${args.join(" ")} failed:\n${stderr || stdout}`,
          ),
        );
    });
  });
}

async function serveRegistry() {
  const directory = join(root, "registry/r");
  const server = createServer(async (request, response) => {
    const name = basename(
      new URL(request.url ?? "/", "http://registry.local").pathname,
    );
    if (extname(name) !== ".json") {
      response.writeHead(404).end();
      return;
    }
    try {
      const body = await readFile(join(directory, name));
      response.writeHead(200, { "content-type": "application/json" }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen) =>
    server.listen(0, "127.0.0.1", resolveListen),
  );
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("registry server did not bind");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  };
}

test(
  "packed Afferent and the local board registry item typecheck and build in a clean consumer",
  { timeout: 300_000 },
  async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-registry-"));
    const consumer = join(temporaryRoot, "consumer");
    let registry;
    try {
      await cp(join(root, "fixtures/registry-vite"), consumer, {
        recursive: true,
      });
      await run(process.execPath, ["scripts/generate-ui-artifacts.mjs"]);
      const packed = await run("npm", [
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        temporaryRoot,
      ]);
      const payload = JSON.parse(
        packed.stdout.slice(packed.stdout.indexOf("[")),
      );
      const tarball = join(temporaryRoot, payload[0].filename);
      await run(
        "npm",
        ["install", "--ignore-scripts", "--save-exact", tarball],
        { cwd: consumer },
      );
      registry = await serveRegistry();
      await run(
        join(root, "node_modules/.bin/shadcn"),
        ["add", "--yes", "--overwrite", `${registry.url}/afferent-board.json`],
        { cwd: consumer },
      );
      await run("npm", ["run", "typecheck"], { cwd: consumer });
      await run("npm", ["run", "build"], { cwd: consumer });

      const installed = await readFile(
        join(consumer, "src/components/afferent/board/board-screen.tsx"),
        "utf8",
      );
      assert.match(installed, /^"use client";/);
      assert.match(installed, /afferent\/react\.js/);
      assert.match(installed, /useFeedbackFeed/);
      assert.match(installed, /href=/);
      assert.doesNotMatch(
        installed,
        /from ["'](?:convex|react-router|next\/|@clerk|sonner|toast)/,
      );
      assert.doesNotMatch(installed, /\.\.\/\.\.\/|\/Users\//);
    } finally {
      await registry?.close();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  },
);

test("registry acceptance uses pinned local tooling and no moving package executor", async () => {
  const source = await readFile(new URL(import.meta.url), "utf8");
  assert.match(source, /node_modules\/\.bin\/shadcn/);
  assert.equal(source.includes(`n${"px"}`), false);
  assert.equal(source.includes(`@${"latest"}`), false);
  assert.match(source, /afferent-board\.json/);
  const fixture = JSON.parse(
    await readFile(join(root, "fixtures/registry-vite/package.json"), "utf8"),
  );
  assert.equal(fixture.dependencies?.afferent, undefined);
});
