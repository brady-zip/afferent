import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  loadReleaseIdentity,
  repositoryFromMetadata,
} from "./generate-release-manifest.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const exactPackageFiles = ["dist", "LICENSE"];
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

function exportedTargets(exports) {
  return Object.values(exports ?? {}).flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    return Object.values(entry);
  });
}

export function validatePackageSurface(manifest) {
  const repository = repositoryFromMetadata(manifest.repository);
  if (
    manifest.name !== "afferent" ||
    manifest.version !== "0.1.0" ||
    manifest.private === true
  ) {
    throw new Error("release must remain a public package: afferent@0.1.0");
  }
  if (
    manifest.license !== "Apache-2.0" ||
    manifest.repository?.type !== "git" ||
    !repository
  ) {
    throw new Error("public package license or repository identity drifted");
  }
  const repositoryUrl = `https://github.com/${repository}`;
  if (
    manifest.homepage !== `${repositoryUrl}#readme` ||
    manifest.bugs?.url !== `${repositoryUrl}/issues`
  ) {
    throw new Error(
      "package homepage or issue tracker does not match repository",
    );
  }
  if (
    manifest.publishConfig?.access !== "public" ||
    manifest.publishConfig?.provenance !== true
  ) {
    throw new Error("public package provenance settings are incomplete");
  }
  if (
    manifest.packageManager !== "npm@11.15.0" ||
    manifest.devDependencies?.["@changesets/cli"] !== "2.31.1"
  ) {
    throw new Error("release toolchain pins have drifted");
  }
  if (
    manifest.engines?.node !== ">=22.14.0" ||
    manifest.engines?.npm !== ">=11.5.1"
  ) {
    throw new Error("published package runtime floors have drifted");
  }
  if (JSON.stringify(manifest.files) !== JSON.stringify(exactPackageFiles)) {
    throw new Error("public package files allowlist has drifted");
  }
  for (const target of exportedTargets(manifest.exports)) {
    if (
      (target.endsWith(".ts") && !target.endsWith(".d.ts")) ||
      target.startsWith("../") ||
      target.includes("/src/")
    ) {
      throw new Error(`raw TypeScript export is forbidden: ${target}`);
    }
  }
  const testExport = manifest.exports?.["./test"];
  if (
    testExport?.types !== "./dist/test.d.ts" ||
    testExport?.default !== "./dist/test.js"
  ) {
    throw new Error("compiled afferent/test export has drifted");
  }
  return manifest;
}

export function validateVersionSurfaces({
  changelog,
  docsConfig,
  generator,
  packageManifest,
  registry,
}) {
  const version = packageManifest.version;
  if (!semverPattern.test(version)) {
    throw new Error("package version must be exact semver");
  }
  if (
    registry.name !== packageManifest.name ||
    registry.packageVersion !== version ||
    registry.sourceTag !== `v${version}`
  ) {
    throw new Error("generated registry version does not match package");
  }
  for (const item of registry.items ?? []) {
    if (
      item.meta?.packageName !== packageManifest.name ||
      item.meta?.packageVersion !== version ||
      item.meta?.sourceTag !== `v${version}`
    ) {
      throw new Error(`registry item ${item.name} has stale release metadata`);
    }
  }
  if (
    !docsConfig.includes("loadReleaseIdentity") ||
    !docsConfig.includes("releaseIdentity.docsVersion") ||
    /text:\s*["']v\d+\.\d+["']/u.test(docsConfig)
  ) {
    throw new Error("documentation version is not package-derived");
  }
  if (
    !generator.includes("loadReleaseIdentity") ||
    !generator.includes("packageVersion") ||
    !generator.includes("sourceTag")
  ) {
    throw new Error("UI generator is missing release metadata");
  }
  if (!changelog.includes(`## ${version}`)) {
    throw new Error("changelog version does not match package");
  }
  return { sourceTag: `v${version}`, version };
}

function validateChangesetsConfig(config) {
  if (
    config.access !== "public" ||
    config.baseBranch !== "main" ||
    config.privatePackages?.version !== false ||
    config.privatePackages?.tag !== false
  ) {
    throw new Error("Changesets must target one public package");
  }
}

async function run(command, args) {
  return execFileAsync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, npm_config_workspaces: "false" },
  });
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const generatedPaths = ["registry", "examples/ui/afferent"];
  const beforeGenerationResult = await run("git", [
    "diff",
    "--binary",
    "--",
    ...generatedPaths,
  ]);
  const beforeGeneration = beforeGenerationResult.stdout;
  await run(process.execPath, ["scripts/generate-ui-artifacts.mjs"]);
  const afterGenerationResult = await run("git", [
    "diff",
    "--binary",
    "--",
    ...generatedPaths,
  ]);
  const afterGeneration = afterGenerationResult.stdout;
  if (afterGeneration !== beforeGeneration) {
    throw new Error(
      "generated registry or mirrored UI drifted; run npm run ui:generate",
    );
  }
  const [packageManifest, registry, docsConfig, generator, changelog, config] =
    await Promise.all([
      readJson(join(repositoryRoot, "package.json")),
      readJson(join(repositoryRoot, "registry/registry.json")),
      readFile(join(repositoryRoot, "docs/.vitepress/config.ts"), "utf8"),
      readFile(
        join(repositoryRoot, "scripts/generate-ui-artifacts.mjs"),
        "utf8",
      ),
      readFile(join(repositoryRoot, "CHANGELOG.md"), "utf8"),
      readJson(join(repositoryRoot, ".changeset/config.json")),
    ]);
  const identity = await loadReleaseIdentity(repositoryRoot);
  validatePackageSurface(packageManifest);
  validateChangesetsConfig(config);
  validateVersionSurfaces({
    changelog,
    docsConfig,
    generator,
    packageManifest,
    registry,
  });
  if (!process.argv.includes("--surfaces-only")) {
    await run("npm", ["run", "test:release:package"]);
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "verified",
        package: `${identity.packageName}@${identity.version}`,
        repository: identity.repository,
        sourceTag: identity.sourceTag,
      },
      null,
      2,
    )}\n`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
