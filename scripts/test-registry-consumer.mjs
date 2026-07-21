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

function run(command, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const env = { ...process.env, npm_config_workspaces: "false" };
    delete env.NODE_TEST_CONTEXT;
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.once("error", rejectRun);
    child.once("close", (code) =>
      code === 0
        ? resolveRun(output)
        : rejectRun(
            new Error(`${command} ${args.join(" ")} failed:\n${output}`),
          ),
    );
  });
}

export async function testRegistryConsumer(root = defaultRoot) {
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
    for (const item of featureItems)
      transcript.push(
        await run(
          join(root, "node_modules/.bin/shadcn"),
          ["add", "--yes", "--overwrite", `./afferent-${item}.json`],
          consumer,
        ),
      );
    transcript.push(await run("npm", ["run", "typecheck"], consumer));
    transcript.push(await run("npm", ["run", "build"], consumer));
    const manifest = JSON.parse(
      await readFile(join(consumer, "package.json"), "utf8"),
    );
    const runtime = [
      "class-variance-authority",
      "clsx",
      "lucide-react",
      "radix-ui",
      "tailwind-merge",
    ];
    for (const dependency of runtime)
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
      featureItems,
      runtime,
      transcript: transcript
        .join("\n")
        .replaceAll(temporaryRoot, "<temporary>"),
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(JSON.stringify(await testRegistryConsumer(), null, 2));
}
