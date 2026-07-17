import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
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

test(
  "packed Afferent and the local board registry item typecheck and build in a clean consumer",
  { timeout: 300_000 },
  async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-registry-"));
    const consumer = join(temporaryRoot, "consumer");
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
      await Promise.all(
        ["afferent-ui-core.json", "afferent-board.json"].map((name) =>
          cp(join(root, "registry/r", name), join(consumer, name)),
        ),
      );
      await run(
        join(root, "node_modules/.bin/shadcn"),
        ["add", "--yes", "--overwrite", "./afferent-board.json"],
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
      const app = await readFile(join(consumer, "src/App.tsx"), "utf8");
      assert.match(app, /AfferentProvider/);
      assert.match(app, /AfferentBoardScreen/);
      assert.match(app, /watchQuery/);
      assert.doesNotMatch(app, /AfferentBoardView/);
    } finally {
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
