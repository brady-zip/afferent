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
const packedFixtureContract = "fixtures/packed-vite-convex";

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
      env: sanitizedEnvironment(options.env),
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
            `${command} ${args.join(" ")} failed${signal ? ` (${signal})` : ""}:\n${stderr}\n${stdout}`,
          ),
        );
      }
    });
  });
}

function sanitizedEnvironment(overrides = {}) {
  const blocked = new Set([
    "INIT_CWD",
    "npm_config_local_prefix",
    "npm_config_workspace",
    "npm_config_workspaces",
    "npm_package_json",
  ]);
  return Object.fromEntries(
    Object.entries({ ...process.env, ...overrides }).filter(
      ([name, value]) => !blocked.has(name) && value !== undefined,
    ),
  );
}

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(root, entry.name);
      return entry.isDirectory() ? await listFiles(path) : [path];
    }),
  );
  return nested.flat();
}

const sourceRoot = await realpath(
  process.env.AFFERENT_SOURCE_ROOT ?? repositoryRoot,
);
const materializedConsumer = await realpath(consumerDir);
if (isWithin(sourceRoot, materializedConsumer)) {
  throw new Error(
    "consumer directory must be outside the Afferent source repository",
  );
}

const fixtureFiles = await listFiles(materializedConsumer);
for (const file of fixtureFiles) {
  if (!/\.(?:json|mjs|ts|tsx|html)$/.test(file)) continue;
  const source = await readFile(file, "utf8");
  if (source.includes("../..") || source.includes(sourceRoot)) {
    throw new Error(`repository-relative import or alias found in ${file}`);
  }
}

for (const suite of [
  "test:static",
  "test:model",
  "test:component",
  "test:auth-conformance",
  "test:scope",
  "test:backend",
  "test:react",
]) {
  await run("npm", ["run", suite], { cwd: repositoryRoot });
}
await run("npm", ["run", "codegen:component"], { cwd: repositoryRoot });
await run("npm", ["run", "typecheck"], { cwd: repositoryRoot });
await run("npm", ["run", "build"], { cwd: repositoryRoot });

const artifactRoot = dirname(materializedConsumer);
const packResult = await run(
  "npm",
  ["pack", "--ignore-scripts", "--json", "--pack-destination", artifactRoot],
  { cwd: repositoryRoot },
);
const packJsonStart = packResult.stdout.indexOf("[");
if (packJsonStart === -1)
  throw new Error(`npm pack did not return JSON: ${packResult.stdout}`);
const [packed] = JSON.parse(packResult.stdout.slice(packJsonStart));
const tarballPath = await realpath(join(artifactRoot, packed.filename));
const packedPaths = new Set(packed.files.map((file) => file.path));
for (const required of [
  "LICENSE",
  "package.json",
  "dist/client/index.js",
  "dist/client/index.d.ts",
  "dist/client/server.js",
  "dist/client/server.d.ts",
  "dist/react/index.js",
  "dist/react/index.d.ts",
  "dist/client/adapters/convex-auth.js",
  "dist/client/adapters/convex-auth.d.ts",
  "dist/client/adapters/clerk.js",
  "dist/client/adapters/clerk.d.ts",
  "dist/client/adapters/better-auth.js",
  "dist/client/adapters/better-auth.d.ts",
  "dist/component/convex.config.js",
  "dist/component/_generated/component.d.ts",
  "dist/component/tsconfig.json",
  "src/test.ts",
]) {
  if (!packedPaths.has(required))
    throw new Error(`tarball is missing ${required}`);
}

await rm(join(materializedConsumer, "node_modules"), {
  force: true,
  recursive: true,
});
await rm(join(materializedConsumer, "package-lock.json"), { force: true });
await run("npm", ["install", "--ignore-scripts", "--save-exact", tarballPath], {
  cwd: materializedConsumer,
});

const convex = join(materializedConsumer, "node_modules/.bin/convex");
const anonymousEnv = {
  CONVEX_AGENT_MODE: "anonymous",
};
// Typecheck the consumer functions while installing the packed component. The
// Rate-limiter child component publishes compiled output without a packaged
// Tsconfig, so Convex cannot re-typecheck that third-party artifact in place.
await run(
  convex,
  ["dev", "--once", "--typecheck", "enable", "--tail-logs", "disable"],
  { cwd: materializedConsumer, env: anonymousEnv },
);
await run(convex, ["codegen", "--typecheck", "enable"], {
  cwd: materializedConsumer,
  env: anonymousEnv,
});

const smoke = [
  "afferent",
  "afferent/server.js",
  "afferent/react.js",
  "afferent/adapters/convex-auth.js",
  "afferent/adapters/clerk.js",
  "afferent/adapters/better-auth.js",
];
// Convex's bundler injects definition paths, so Node only resolves this export.
const resolutionOnly = ["afferent/convex.config.js", "afferent/test"];
await run(
  process.execPath,
  [
    "--input-type=module",
    "--eval",
    `for (const name of ${JSON.stringify(smoke)}) await import(name); for (const name of ${JSON.stringify(resolutionOnly)}) import.meta.resolve(name);`,
  ],
  { cwd: materializedConsumer },
);

const interactionPath = join(artifactRoot, "afferent-interaction.json");
await run("npm", ["test"], {
  cwd: materializedConsumer,
  env: { AFFERENT_TRANSCRIPT_PATH: interactionPath },
});
await run("npm", ["run", "typecheck"], { cwd: materializedConsumer });
await run("npm", ["run", "build"], { cwd: materializedConsumer });

await run(
  join(repositoryRoot, "node_modules/.bin/publint"),
  ["run", "--strict", tarballPath],
  { cwd: repositoryRoot },
);
await run(
  join(repositoryRoot, "node_modules/.bin/attw"),
  ["--profile", "esm-only", "--quiet", tarballPath],
  { cwd: repositoryRoot },
);

const installedPackage = join(materializedConsumer, "node_modules/afferent");
const installedManifest = JSON.parse(
  await readFile(join(installedPackage, "package.json"), "utf8"),
);
if (
  installedManifest.license !== "Apache-2.0" ||
  installedManifest.type !== "module"
) {
  throw new Error("packed package metadata must declare Apache-2.0 ESM");
}
const expectedExports = [
  ".",
  "./server.js",
  "./react.js",
  "./adapters/convex-auth.js",
  "./adapters/clerk.js",
  "./adapters/better-auth.js",
  "./convex.config.js",
  "./_generated/component.js",
  "./test",
  "./package.json",
];
for (const exported of expectedExports) {
  if (!(exported in installedManifest.exports)) {
    throw new Error(`packed package is missing export ${exported}`);
  }
}
if (
  Object.keys(installedManifest.exports).some((exported) =>
    /(?:dataModel|_generated\/api|schema)/.test(exported),
  )
) {
  throw new Error("private data-model export detected in packed package");
}
const resolvedPaths = await Promise.all(
  [
    "dist/client/index.js",
    "dist/client/index.d.ts",
    "dist/client/server.js",
    "dist/client/server.d.ts",
    "dist/react/index.js",
    "dist/react/index.d.ts",
    "dist/client/adapters/convex-auth.js",
    "dist/client/adapters/convex-auth.d.ts",
    "dist/client/adapters/clerk.js",
    "dist/client/adapters/clerk.d.ts",
    "dist/client/adapters/better-auth.js",
    "dist/client/adapters/better-auth.d.ts",
    "dist/component/convex.config.js",
    "dist/component/_generated/component.d.ts",
    "dist/component/tsconfig.json",
    "src/test.ts",
    "package.json",
  ].map((path) => realpath(join(installedPackage, path))),
);
for (const resolvedPath of resolvedPaths) {
  if (
    !isWithin(materializedConsumer, resolvedPath) ||
    isWithin(sourceRoot, resolvedPath)
  ) {
    throw new Error(
      `installed export escaped the clean consumer: ${resolvedPath}`,
    );
  }
}

for (const file of await listFiles(join(installedPackage, "dist"))) {
  if (!/\.(?:js|d\.ts)$/.test(file)) continue;
  const builtSource = await readFile(file, "utf8");
  if (builtSource.includes(sourceRoot)) {
    throw new Error(
      `packed declaration or module contains source-root path: ${file}`,
    );
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
    exports: expectedExports,
    fixtureContract: packedFixtureContract,
  },
  interaction,
};

if (printJson) process.stdout.write(`${JSON.stringify(transcript)}\n`);
else process.stdout.write(`${JSON.stringify(transcript, null, 2)}\n`);
