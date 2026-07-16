import { spawn } from "node:child_process";
import { access, readFile, realpath, readdir, rm } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const consumerFlag = process.argv.indexOf("--consumer-dir");
const consumerDir =
  consumerFlag === -1 ? null : resolve(process.argv[consumerFlag + 1] ?? "");
const printJson = process.argv.includes("--json");

if (!consumerDir) throw new Error("--consumer-dir <path> is required");

function isWithin(parent, candidate) {
  const pathFromParent = relative(parent, candidate);
  return (
    pathFromParent === "" ||
    (!pathFromParent.startsWith("..") && !isAbsolute(pathFromParent))
  );
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", rejectRun);
    child.once("close", (code, signal) => {
      if (code === 0) resolveRun({ stdout, stderr });
      else {
        rejectRun(
          new Error(
            `${command} ${args.join(" ")} failed${signal ? ` (${signal})` : ""}:\n${stderr || stdout}`,
          ),
        );
      }
    });
  });
}

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = join(root, entry.name);
        return entry.isDirectory() ? await listFiles(path) : [path];
      }),
    )
  ).flat();
}

const sourceRoot = await realpath(
  process.env.AFFERENT_SOURCE_ROOT ?? repositoryRoot,
);
const materializedConsumer = await realpath(consumerDir);
if (isWithin(sourceRoot, materializedConsumer)) {
  throw new Error("consumer directory must be outside the Afferent source repository");
}

const fixtureFiles = await listFiles(materializedConsumer);
for (const file of fixtureFiles) {
  if (!/\.(?:json|mjs|ts|tsx|html)$/.test(file)) continue;
  const source = await readFile(file, "utf8");
  if (source.includes("../..") || source.includes(sourceRoot)) {
    throw new Error(`repository-relative import or alias found in ${file}`);
  }
}

await run("npm", ["run", "codegen:component"], { cwd: repositoryRoot });
await run("npm", ["run", "build"], { cwd: repositoryRoot });

const artifactRoot = dirname(materializedConsumer);
const packResult = await run(
  "npm",
  ["pack", "--ignore-scripts", "--json", "--pack-destination", artifactRoot],
  { cwd: repositoryRoot },
);
const packJsonStart = packResult.stdout.indexOf("[");
if (packJsonStart === -1) throw new Error(`npm pack did not return JSON: ${packResult.stdout}`);
const [packed] = JSON.parse(packResult.stdout.slice(packJsonStart));
const tarballPath = await realpath(join(artifactRoot, packed.filename));
const packedPaths = new Set(packed.files.map((file) => file.path));
for (const required of [
  "LICENSE",
  "dist/client/index.js",
  "dist/client/index.d.ts",
  "dist/component/convex.config.js",
  "dist/component/_generated/component.d.ts",
  "src/test.ts",
]) {
  if (!packedPaths.has(required)) throw new Error(`tarball is missing ${required}`);
}

await rm(join(materializedConsumer, "node_modules"), { force: true, recursive: true });
await rm(join(materializedConsumer, "package-lock.json"), { force: true });
await run("npm", ["install", "--ignore-scripts", "--save-exact", tarballPath], {
  cwd: materializedConsumer,
  env: { npm_config_workspaces: "false" },
});

const convex = join(materializedConsumer, "node_modules/.bin/convex");
const anonymousEnv = {
  CONVEX_AGENT_MODE: "anonymous",
  npm_config_workspaces: "false",
};
await run(
  convex,
  [
    "dev",
    "--once",
    "--typecheck",
    "enable",
    "--typecheck-components",
    "--tail-logs",
    "disable",
  ],
  { cwd: materializedConsumer, env: anonymousEnv },
);
await run(convex, ["codegen", "--typecheck", "enable"], {
  cwd: materializedConsumer,
  env: anonymousEnv,
});

const interactionPath = join(artifactRoot, "afferent-interaction.json");
await run("npm", ["test"], {
  cwd: materializedConsumer,
  env: { AFFERENT_TRANSCRIPT_PATH: interactionPath },
});
await run("npm", ["run", "typecheck"], { cwd: materializedConsumer });
await run("npm", ["run", "build"], { cwd: materializedConsumer });

await run(join(repositoryRoot, "node_modules/.bin/publint"), ["run", tarballPath], {
  cwd: repositoryRoot,
});
await run(
  join(repositoryRoot, "node_modules/.bin/attw"),
  ["--profile", "esm-only", "--quiet", tarballPath],
  { cwd: repositoryRoot },
);

const installedPackage = join(materializedConsumer, "node_modules/afferent");
const resolvedPaths = await Promise.all(
  [
    "dist/client/index.js",
    "dist/client/index.d.ts",
    "dist/component/convex.config.js",
    "dist/component/_generated/component.d.ts",
    "src/test.ts",
    "package.json",
  ].map((path) => realpath(join(installedPackage, path))),
);
for (const resolvedPath of resolvedPaths) {
  if (!isWithin(materializedConsumer, resolvedPath) || isWithin(sourceRoot, resolvedPath)) {
    throw new Error(`installed export escaped the clean consumer: ${resolvedPath}`);
  }
}

const licensePath = await realpath(join(installedPackage, "LICENSE"));
await access(licensePath, fsConstants.R_OK);
const interaction = JSON.parse(await readFile(interactionPath, "utf8"));
const transcript = {
  artifact: {
    kind: "packed Afferent artifact",
    packCommand: "npm pack",
    license: "Apache-2.0",
    tarballOnly: true,
    repositoryRelativeImports: false,
    tarballPath,
    licensePath,
    resolvedPaths,
  },
  interaction,
};

if (printJson) process.stdout.write(`${JSON.stringify(transcript)}\n`);
else process.stdout.write(`${JSON.stringify(transcript, null, 2)}\n`);
