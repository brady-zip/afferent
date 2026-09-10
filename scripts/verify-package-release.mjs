import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  matchesRepositoryWebUrl,
  repositoryFromMetadata,
} from "./generate-release-manifest.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const declaredPackageManifest = JSON.parse(
  await readFile(join(repositoryRoot, "package.json"), "utf8"),
);
const declaredRepository = repositoryFromMetadata(
  declaredPackageManifest.repository,
);
if (!declaredRepository) {
  throw new Error(
    "package.json repository must identify a github.com owner/repository",
  );
}
const requiredIdentity = Object.freeze({
  name: "afferent",
  version: "0.1.0",
  license: "Apache-2.0",
  repository: declaredRepository,
});
const runtimeFloor = Object.freeze({ node: "22.14.0", npm: "11.5.1" });

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repositoryRoot,
      env: { ...process.env, npm_config_workspaces: "false" },
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
            `${command} ${args.join(" ")} failed:\n${stderr}\n${stdout}`,
          ),
        );
    });
  });
}

function compareVersions(actual, minimum) {
  const left = actual.replace(/^v/, "").split(".").map(Number);
  const right = minimum.replace(/^v/, "").split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if ((left[index] ?? 0) > (right[index] ?? 0)) return 1;
    if ((left[index] ?? 0) < (right[index] ?? 0)) return -1;
  }
  return 0;
}

export function validateRuntimeFloor(runtime) {
  if (compareVersions(runtime.node, runtimeFloor.node) < 0) {
    throw new Error(`release requires Node ${runtimeFloor.node} or newer`);
  }
  if (compareVersions(runtime.npm, runtimeFloor.npm) < 0) {
    throw new Error(`release requires npm ${runtimeFloor.npm} or newer`);
  }
}

function exportTargets(exports) {
  return Object.values(exports).flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    return Object.values(entry);
  });
}

export function validatePackageCandidate({ manifest, packedFiles, registry }) {
  for (const field of [
    "license",
    "version",
    "repository",
    "homepage",
    "bugs",
    "engines",
    "private",
  ]) {
    if (!manifest[field])
      throw new Error(`package metadata is missing ${field}`);
  }
  for (const [field, expected] of Object.entries(requiredIdentity)) {
    if (field === "repository") continue;
    if (manifest[field] !== expected) {
      throw new Error(`package ${field} must be ${expected}`);
    }
  }
  if (
    manifest.repository.type !== "git" ||
    repositoryFromMetadata(manifest.repository) !== requiredIdentity.repository
  ) {
    throw new Error(
      "package repository must identify the canonical repository",
    );
  }
  if (!manifest.homepage || !manifest.bugs?.url) {
    throw new Error("package homepage and bugs metadata are required");
  }
  if (manifest.private !== true || manifest.publishConfig !== undefined) {
    throw new Error(
      "package must remain private with no npm publishConfig in v1",
    );
  }
  if (
    !matchesRepositoryWebUrl(
      manifest.homepage,
      requiredIdentity.repository,
      "#readme",
    ) ||
    !matchesRepositoryWebUrl(
      manifest.bugs.url,
      requiredIdentity.repository,
      "/issues",
    )
  ) {
    throw new Error(
      "package homepage or issue tracker does not match repository",
    );
  }
  if (
    manifest.engines.node !== `>=${runtimeFloor.node}` ||
    manifest.engines.npm !== `>=${runtimeFloor.npm}`
  ) {
    throw new Error(
      "package engines must pin the source-build toolchain floor",
    );
  }
  if (JSON.stringify(manifest.files) !== JSON.stringify(["dist", "LICENSE"])) {
    throw new Error(
      "package files allowlist must contain only dist and LICENSE",
    );
  }
  if (registry.name !== manifest.name) {
    throw new Error("generated registry name does not match package name");
  }
  if (registry.compatibleVersion !== manifest.version) {
    throw new Error(
      "generated registry compatible version does not match package",
    );
  }
  for (const target of exportTargets(manifest.exports)) {
    if (target.endsWith(".ts") && !target.endsWith(".d.ts")) {
      throw new Error(`raw TypeScript export is forbidden: ${target}`);
    }
    const packedPath = target.replace(/^\.\//, "");
    if (!packedFiles.has(packedPath)) {
      throw new Error(`tarball is missing exported target ${packedPath}`);
    }
  }
  for (const path of packedFiles) {
    if (
      path.startsWith("src/") ||
      /(?:^|\/)(?:\.env|\.npmrc)$/.test(path) ||
      (path.endsWith("tsconfig.json") &&
        path !== "dist/component/tsconfig.json")
    ) {
      throw new Error(`tarball contains forbidden repository file ${path}`);
    }
  }
}

async function verifyOfflineCandidate() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-release-"));
  try {
    await run("npm", ["run", "build"]);
    const packedResult = await run("npm", [
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      temporaryRoot,
    ]);
    const [packed] = JSON.parse(
      packedResult.stdout.slice(packedResult.stdout.indexOf("[")),
    );
    const tarball = await realpath(join(temporaryRoot, packed.filename));
    const manifest = JSON.parse(
      await readFile(join(repositoryRoot, "package.json"), "utf8"),
    );
    const registryCatalog = JSON.parse(
      await readFile(join(repositoryRoot, "registry/r/registry.json"), "utf8"),
    );
    validatePackageCandidate({
      manifest,
      packedFiles: new Set(packed.files.map((file) => file.path)),
      registry: {
        name: registryCatalog.name,
        compatibleVersion: requiredIdentity.version,
      },
    });

    const consumer = join(temporaryRoot, "consumer");
    await cp(join(repositoryRoot, "fixtures/packed-vite-convex"), consumer, {
      recursive: true,
    });
    await run(
      process.execPath,
      [
        join(repositoryRoot, "scripts/test-packed-consumer.mjs"),
        "--consumer-dir",
        consumer,
        "--tarball",
        tarball,
        "--json",
      ],
      { cwd: temporaryRoot },
    );
    await run(
      join(repositoryRoot, "node_modules/.bin/publint"),
      ["run", "--strict", tarball],
      { cwd: repositoryRoot },
    );
    await run(
      join(repositoryRoot, "node_modules/.bin/attw"),
      ["--profile", "esm-only", "--quiet", tarball],
      { cwd: repositoryRoot },
    );
    return {
      localArtifact: `${manifest.name}@${manifest.version}`,
      files: packed.files.length,
      registry: registryCatalog.name,
      tarball: "<temporary>/afferent-0.1.0.tgz",
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function main() {
  const result = await verifyOfflineCandidate();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
