import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const featureItems = [
  "board",
  "roadmap",
  "changelog",
  "notifications",
  "admin",
];
const runtimeDependencies = [
  "class-variance-authority",
  "clsx",
  "lucide-react",
  "radix-ui",
  "tailwind-merge",
];

function run(command, args, cwdOrOptions) {
  return new Promise((resolveRun, rejectRun) => {
    const options =
      typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;
    const { cwd } = options;
    const env = { ...process.env, npm_config_workspaces: "false" };
    delete env.NODE_TEST_CONTEXT;
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          if (settled) return;
          settled = true;
          child.kill("SIGTERM");
          rejectRun(
            new Error(
              `${command} ${args.join(" ")} timed out after ${options.timeoutMs}ms:\n${output}`,
            ),
          );
        }, options.timeoutMs)
      : undefined;
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      rejectRun(error);
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      if (code === 0) resolveRun(output);
      else
        rejectRun(new Error(`${command} ${args.join(" ")} failed:\n${output}`));
    });
  });
}

async function runWithRetries(command, args, options) {
  let lastError;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await run(command, args, options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function prepareRegistryConsumer(root = defaultRoot) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-registry-all-"));
  const consumer = join(temporaryRoot, "consumer");
  const transcript = [];
  try {
    await cp(join(root, "fixtures/registry-vite"), consumer, {
      recursive: true,
    });
    transcript.push(
      await run(process.execPath, ["scripts/generate-ui-artifacts.mjs"], root),
    );
    transcript.push(await run("npm", ["run", "build"], root));
    const packed = await run(
      "npm",
      [
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        temporaryRoot,
      ],
      root,
    );
    const payload = JSON.parse(packed.slice(packed.indexOf("[")));
    transcript.push(
      await run(
        "npm",
        [
          "install",
          "--ignore-scripts",
          "--save-exact",
          join(temporaryRoot, payload[0].filename),
        ],
        consumer,
      ),
    );
    for (const name of [
      "afferent-ui-core",
      ...featureItems.map((item) => `afferent-${item}`),
    ])
      await cp(
        join(root, "registry/r", `${name}.json`),
        join(consumer, `${name}.json`),
      );
    transcript.push(
      await runWithRetries(
        join(root, "node_modules/.bin/shadcn"),
        [
          "add",
          "--yes",
          "--overwrite",
          ...featureItems.map((item) => `./afferent-${item}.json`),
        ],
        { attempts: 3, cwd: consumer, timeoutMs: 30_000 },
      ),
    );
    transcript.push(await run("npm", ["run", "typecheck"], consumer));
    transcript.push(await run("npm", ["run", "build"], consumer));
    const manifest = JSON.parse(
      await readFile(join(consumer, "package.json"), "utf8"),
    );
    for (const dependency of runtimeDependencies)
      assert.ok(manifest.dependencies?.[dependency]);
    for (const tool of [
      "@axe-core/playwright",
      "playwright",
      "shadcn",
      "typescript",
      "vitest",
    ])
      assert.equal(manifest.dependencies?.[tool], undefined);
    for (const screen of [
      "board/board-screen",
      "roadmap/roadmap-screen",
      "changelog/changelog-screen",
      "notifications/notifications-list",
      "admin/admin-screen",
    ]) {
      const source = await readFile(
        join(consumer, `src/components/afferent/${screen}.tsx`),
        "utf8",
      );
      assert.doesNotMatch(
        source,
        /\/Users\/|examples\/ui|ui\/afferent\/|\.\.\/\.\.\//,
      );
    }
    return {
      consumer,
      featureItems,
      runtime: runtimeDependencies,
      transcript: transcript
        .join("\n")
        .replaceAll(temporaryRoot, "<temporary>"),
      async cleanup() {
        await rm(temporaryRoot, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function testRegistryConsumer(root = defaultRoot) {
  const prepared = await prepareRegistryConsumer(root);
  try {
    return {
      featureItems: prepared.featureItems,
      runtime: prepared.runtime,
      transcript: prepared.transcript,
    };
  } finally {
    await prepared.cleanup();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(JSON.stringify(await testRegistryConsumer(), null, 2));
}
