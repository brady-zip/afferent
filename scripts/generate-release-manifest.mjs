import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const defaultRepositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const canonicalRepository = "bradywatkinson/afferent";
const releaseWorkflow = "release.yml";
const sha256Pattern = /^[a-f0-9]{64}$/u;
const commitPattern = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stable(child)]),
    );
  }
  return value;
}

function json(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function git(args, repositoryRoot) {
  const result = await execFileAsync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return result.stdout.trim();
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }),
  );
  return files.flat().sort();
}

async function digestFiles(repositoryRoot, paths) {
  const hash = createHash("sha256");
  for (const path of paths.sort()) {
    const repositoryPath = relative(repositoryRoot, path).replaceAll("\\", "/");
    const content = await readFile(path);
    hash.update(repositoryPath);
    hash.update("\0");
    hash.update(String(content.byteLength));
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function repositoryName(url) {
  const match = url.match(
    /github\.com[/:](?<repository>[^/]+\/[^/#]+?)(?:\.git)?$/u,
  );
  return match?.groups?.repository ?? "";
}

export async function loadReleaseIdentity(
  repositoryRoot = defaultRepositoryRoot,
) {
  const packageManifest = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  );
  const repository = repositoryName(packageManifest.repository?.url ?? "");
  if (packageManifest.name !== "afferent") {
    throw new Error("release package name must remain afferent");
  }
  if (!semverPattern.test(packageManifest.version)) {
    throw new Error("release package version must be exact semver");
  }
  if (repository !== canonicalRepository) {
    throw new Error(
      `release repository must be ${canonicalRepository}, received ${repository || "<missing>"}`,
    );
  }
  return Object.freeze({
    docsVersion: packageManifest.version,
    packageName: packageManifest.name,
    registryVersion: packageManifest.version,
    releaseWorkflow,
    repository,
    sourceTag: `v${packageManifest.version}`,
    version: packageManifest.version,
  });
}

export async function digestRegistry(repositoryRoot = defaultRepositoryRoot) {
  const registryRoot = join(repositoryRoot, "registry");
  const paths = [
    join(registryRoot, "registry.json"),
    ...(await filesUnder(join(registryRoot, "r"))),
  ];
  return {
    files: paths
      .map((path) => relative(repositoryRoot, path).replaceAll("\\", "/"))
      .sort(),
    sha256: await digestFiles(repositoryRoot, paths),
  };
}

export function validateReleaseManifest(manifest) {
  const version = manifest.package?.version;
  if (!semverPattern.test(version ?? "")) {
    throw new Error("release manifest package version is invalid");
  }
  if (
    manifest.registry?.version !== version ||
    manifest.registry?.version !== manifest.documentation?.version
  ) {
    throw new Error("release manifest registry version does not match package");
  }
  if (manifest.source?.tag !== `v${version}`) {
    throw new Error("release manifest source tag does not match package");
  }
  if (
    !sha256Pattern.test(manifest.package?.sha256 ?? "") ||
    !sha256Pattern.test(manifest.registry?.sha256 ?? "")
  ) {
    throw new Error("release manifest artifact digest is invalid");
  }
  if (!commitPattern.test(manifest.source?.commit ?? "")) {
    throw new Error("release manifest source commit is invalid");
  }
  if (
    !Number.isSafeInteger(manifest.source?.sourceDateEpoch) ||
    manifest.source.sourceDateEpoch < 0 ||
    manifest.source?.timestampPolicy !== "git-commit-source-date-epoch"
  ) {
    throw new Error("release manifest source date policy is invalid");
  }
  if (
    manifest.repository?.name !== canonicalRepository ||
    manifest.repository?.workflow !== releaseWorkflow
  ) {
    throw new Error("release manifest repository identity is invalid");
  }
  const { evidence, ...body } = manifest;
  const expectedManifestDigest = sha256(json(body));
  if (evidence?.manifestSha256 !== expectedManifestDigest) {
    throw new Error("release manifest evidence digest does not match");
  }
  return manifest;
}

export async function createReleaseManifest({
  repositoryRoot = defaultRepositoryRoot,
  sourceCommit,
  sourceDateEpoch,
  tarball,
}) {
  if (!tarball) throw new Error("--tarball is required");
  const identity = await loadReleaseIdentity(repositoryRoot);
  const packageManifest = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  );
  const nodeVersionSource = await readFile(
    join(repositoryRoot, ".node-version"),
    "utf8",
  );
  const nodeVersion = nodeVersionSource.trim();
  const npmVersion = packageManifest.packageManager?.replace(/^npm@/u, "");
  const commit =
    sourceCommit ?? (await git(["rev-parse", "HEAD"], repositoryRoot));
  const epoch =
    sourceDateEpoch ??
    Number.parseInt(
      await git(["show", "-s", "--format=%ct", commit], repositoryRoot),
      10,
    );
  const registry = await digestRegistry(repositoryRoot);
  const body = {
    schemaVersion: 1,
    documentation: {
      version: identity.docsVersion,
    },
    package: {
      name: identity.packageName,
      sha256: sha256(await readFile(tarball)),
      tarball: basename(tarball),
      version: identity.version,
    },
    registry: {
      files: registry.files,
      sha256: registry.sha256,
      version: identity.registryVersion,
    },
    repository: {
      name: identity.repository,
      workflow: identity.releaseWorkflow,
    },
    source: {
      commit,
      sourceDateEpoch: epoch,
      tag: identity.sourceTag,
      timestamp: new Date(epoch * 1000).toISOString(),
      timestampPolicy: "git-commit-source-date-epoch",
    },
    toolchain: {
      changesets: packageManifest.devDependencies?.["@changesets/cli"],
      node: nodeVersion,
      npm: npmVersion,
      typescript: packageManifest.devDependencies?.typescript,
    },
  };
  const manifest = {
    ...body,
    evidence: {
      manifestSha256: sha256(json(body)),
    },
  };
  return validateReleaseManifest(manifest);
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const tarball = option("--tarball");
  const output = option("--output");
  const manifest = await createReleaseManifest({
    repositoryRoot: defaultRepositoryRoot,
    sourceCommit: option("--source-commit"),
    sourceDateEpoch: option("--source-date-epoch")
      ? Number.parseInt(option("--source-date-epoch"), 10)
      : undefined,
    tarball: tarball ? resolve(tarball) : undefined,
  });
  if (!output || output === "-") {
    process.stdout.write(json(manifest));
    return;
  }
  const outputPath = resolve(output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, json(manifest));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
