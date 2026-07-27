import { spawn } from "node:child_process";
import { builtinModules, createRequire } from "node:module";
import { createHash } from "node:crypto";
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { validatePackageCandidate } from "./verify-package-release.mjs";

export const DEMO_CANDIDATE_DIR = ".demo-candidate";
export const REACT_ROUTER_VERSION = "8.3.0";
export const DEMO_GATE_STEPS = ["prepare", "typecheck", "build", "host-tests"];

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const generatedUiRoot = "src/components/afferent";
const registryItems = [
  "afferent-board",
  "afferent-roadmap",
  "afferent-changelog",
  "afferent-notifications",
  "afferent-admin",
];
const moduleExtensions = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".json",
  ".d.ts",
];
const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

function isInside(path, root) {
  const child = resolve(path);
  const parent = resolve(root);
  return child === parent || child.startsWith(`${parent}${sep}`);
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repositoryRoot,
      env: {
        ...process.env,
        npm_config_audit: "false",
        npm_config_fund: "false",
        npm_config_workspaces: "false",
        ...options.env,
      },
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
      if (code === 0) {
        resolveRun({ stdout, stderr });
        return;
      }
      rejectRun(
        new Error(`${command} ${args.join(" ")} failed:\n${stderr}\n${stdout}`),
      );
    });
  });
}

function parseJsonOutput(output) {
  const object = output.indexOf("{");
  const array = output.indexOf("[");
  let start = Math.min(object, array);
  if (object === -1) start = array;
  if (array === -1) start = object;
  if (start === -1) throw new Error(`command did not return JSON:\n${output}`);
  return JSON.parse(output.slice(start));
}

async function filesUnder(directory, options = {}) {
  if (!(await pathExists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (options.skip?.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesUnder(path, options)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files.sort();
}

async function digestPaths(root, paths) {
  const hash = createHash("sha256");
  for (const path of [...paths].sort()) {
    const normalized = path.split(sep).join("/");
    hash.update(normalized);
    hash.update("\0");
    hash.update(await readFile(join(root, path)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

async function directoryPayload(root) {
  const absoluteFiles = await filesUnder(root);
  const files = absoluteFiles.map((path) => relative(root, path));
  return {
    files: files.map((path) => path.split(sep).join("/")),
    sha256: await digestPaths(root, files),
  };
}

async function examplePayload(root = repositoryRoot) {
  const exampleRoot = join(root, "example");
  const exampleFiles = await filesUnder(exampleRoot, {
    skip: new Set(["node_modules"]),
  });
  const files = exampleFiles
    .map((path) => relative(exampleRoot, path))
    .filter((path) => !path.startsWith(`convex${sep}_generated${sep}`));
  return {
    files: files.map((path) => path.split(sep).join("/")),
    sha256: await digestPaths(exampleRoot, files),
  };
}

async function registryPayload(root = repositoryRoot) {
  const registryRoot = join(root, "registry");
  const registryFiles = await filesUnder(join(registryRoot, "r"));
  const files = registryFiles.map((path) => relative(registryRoot, path));
  return {
    files: files.map((path) => path.split(sep).join("/")),
    sha256: await digestPaths(registryRoot, files),
  };
}

async function installedUiPayload(candidateRoot) {
  const targetRoot = join(candidateRoot, generatedUiRoot);
  const installedFiles = await filesUnder(targetRoot);
  const files = installedFiles.map((path) => relative(targetRoot, path));
  return {
    files: files.map((path) => path.split(sep).join("/")),
    sha256: await digestPaths(targetRoot, files),
  };
}

function importSpecifiers(source) {
  const matches = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^"'()]*?\s+from\s*)?["'](?<specifier>[^"']+)["']/g,
    /\bimport\s*\(\s*["'](?<specifier>[^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match.groups?.specifier) matches.push(match.groups.specifier);
    }
  }
  return matches;
}

async function resolveFile(base) {
  const bases = [base];
  if (/\.(?:[cm]?js|jsx)$/.test(base)) {
    bases.push(base.replace(/\.(?:[cm]?js|jsx)$/, ""));
  }
  for (const candidateBase of bases) {
    for (const extension of moduleExtensions) {
      const path = `${candidateBase}${extension}`;
      const exists = await pathExists(path);
      const file = exists ? await stat(path) : undefined;
      if (file?.isFile()) {
        return realpath(path);
      }
    }
    for (const extension of moduleExtensions.slice(1)) {
      const path = join(candidateBase, `index${extension}`);
      const exists = await pathExists(path);
      const file = exists ? await stat(path) : undefined;
      if (file?.isFile()) {
        return realpath(path);
      }
    }
  }
  return undefined;
}

function packageParts(specifier) {
  const segments = specifier.split("/");
  const name = specifier.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : segments[0];
  const rest = segments.slice(specifier.startsWith("@") ? 2 : 1).join("/");
  return { name, subpath: rest ? `./${rest}` : "." };
}

async function resolveTypeOnlyPackageExport(specifier, importer) {
  const { name, subpath } = packageParts(specifier);
  let directory = dirname(importer);
  let packageJson;
  while (true) {
    const candidate = join(directory, "node_modules", name, "package.json");
    if (await pathExists(candidate)) {
      packageJson = candidate;
      break;
    }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  if (!packageJson && isInside(importer, repositoryRoot)) {
    const selfManifestPath = join(repositoryRoot, "package.json");
    const selfManifest = JSON.parse(await readFile(selfManifestPath, "utf8"));
    if (selfManifest.name === name) packageJson = selfManifestPath;
  }
  if (!packageJson) return undefined;
  const manifest = JSON.parse(await readFile(packageJson, "utf8"));
  let exported = manifest.exports?.[subpath];
  let wildcard;
  if (!exported && manifest.exports) {
    for (const [key, value] of Object.entries(manifest.exports)) {
      if (!key.includes("*")) continue;
      const [prefix, suffix] = key.split("*");
      if (subpath.startsWith(prefix) && subpath.endsWith(suffix)) {
        wildcard = subpath.slice(prefix.length, subpath.length - suffix.length);
        exported = value;
        break;
      }
    }
  }
  const target =
    typeof exported === "string"
      ? exported
      : (exported?.default ??
        exported?.import ??
        exported?.require ??
        exported?.types);
  const resolvedTarget =
    typeof target === "string" && wildcard
      ? target.replaceAll("*", wildcard)
      : target;
  return typeof resolvedTarget === "string"
    ? resolveFile(join(dirname(packageJson), resolvedTarget))
    : undefined;
}

async function resolveImport(specifier, importer, sourceRoot) {
  if (
    builtins.has(specifier) ||
    specifier.startsWith("data:") ||
    specifier.startsWith("virtual:")
  ) {
    return undefined;
  }
  if (specifier.startsWith("@/")) {
    return resolveFile(join(sourceRoot, "src", specifier.slice(2)));
  }
  if (specifier.startsWith(".") || isAbsolute(specifier)) {
    return resolveFile(
      isAbsolute(specifier) ? specifier : resolve(dirname(importer), specifier),
    );
  }
  try {
    return realpath(createRequire(importer).resolve(specifier));
  } catch {
    return resolveTypeOnlyPackageExport(specifier, importer);
  }
}

export async function assertImportOrigins({
  sourceRoot,
  candidateRoot,
  repositoryRoot: checkedRepositoryRoot = repositoryRoot,
  allowUnresolvedGeneratedUi = false,
}) {
  const absoluteSourceRoot = resolve(sourceRoot);
  const absoluteCandidateRoot = resolve(candidateRoot);
  const forbiddenRoots = [
    join(checkedRepositoryRoot, "src"),
    join(checkedRepositoryRoot, "ui"),
    join(checkedRepositoryRoot, "examples/ui"),
  ];
  const sourceFiles = await filesUnder(absoluteSourceRoot, {
    skip: new Set(["node_modules", "dist", ".git"]),
  });
  const moduleFiles = sourceFiles.filter((path) =>
    /\.(?:[cm]?[jt]sx?|d\.ts)$/.test(path),
  );
  const origins = [];

  for (const importer of moduleFiles) {
    const source = await readFile(importer, "utf8");
    for (const specifier of importSpecifiers(source)) {
      const resolved = await resolveImport(
        specifier,
        importer,
        absoluteSourceRoot,
      );
      if (!resolved) {
        if (
          allowUnresolvedGeneratedUi &&
          specifier.startsWith("@/components/afferent/")
        ) {
          continue;
        }
        if (builtins.has(specifier)) continue;
        throw new Error(
          `demo import did not resolve: ${relative(absoluteSourceRoot, importer)} -> ${specifier}`,
        );
      }
      if (forbiddenRoots.some((root) => isInside(resolved, root))) {
        throw new Error(
          `example import resolved into repository product source: ${relative(absoluteSourceRoot, importer)} -> ${resolved}`,
        );
      }
      if (
        absoluteCandidateRoot !== resolve(checkedRepositoryRoot) &&
        !isInside(resolved, absoluteCandidateRoot)
      ) {
        throw new Error(
          `prepared candidate import escaped its installed root: ${relative(absoluteSourceRoot, importer)} -> ${resolved}`,
        );
      }
      origins.push({
        importer: relative(absoluteSourceRoot, importer).split(sep).join("/"),
        specifier,
        resolved,
      });
    }
  }
  return origins;
}

async function releaseManifest() {
  const committedResult = await run("git", ["show", "HEAD:package.json"]);
  const committed = parseJsonOutput(committedResult.stdout);
  const working = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  );
  committed.devDependencies["react-router"] = REACT_ROUTER_VERSION;
  if (working.scripts["verify:demo:artifacts"]) {
    committed.scripts["verify:demo:artifacts"] =
      working.scripts["verify:demo:artifacts"];
  }
  return committed;
}

async function buildReleasePackage() {
  await rm(join(repositoryRoot, "dist"), { force: true, recursive: true });
  await rm(join(repositoryRoot, "tsconfig.tsbuildinfo"), { force: true });
  await run(
    "npm",
    [
      "exec",
      "--yes",
      "--package=typescript@6.0.3",
      "--",
      "tsc",
      "--project",
      "tsconfig.json",
    ],
    { cwd: repositoryRoot },
  );
  await cp(
    join(repositoryRoot, "src/component/tsconfig.json"),
    join(repositoryRoot, "dist/component/tsconfig.json"),
  );
}

async function sanitizeGeneratedBindings(candidateRoot) {
  const apiTypes = join(candidateRoot, "convex/_generated/api.d.ts");
  if (!(await pathExists(apiTypes))) return;
  const source = await readFile(apiTypes, "utf8");
  const sanitized = source.replace(
    /import\((?<quote>["'])[^"']*\/dist\/component\/_generated\/component\.js\k<quote>\)/g,
    'import("afferent/_generated/component.js")',
  );
  if (sanitized.includes(repositoryRoot)) {
    throw new Error(
      "candidate generated bindings retain a repository-absolute import",
    );
  }
  await writeFile(apiTypes, sanitized);
}

async function writeCandidateManifest(candidateRoot) {
  const manifest = {
    name: "afferent-hosted-demo-candidate",
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: {
      typecheck: "tsc --noEmit --project tsconfig.json",
      build: "vite build",
    },
    dependencies: {
      "@auth/core": "0.41.2",
      "@convex-dev/auth": "0.0.94",
      convex: "1.42.2",
      react: "19.2.7",
      "react-dom": "19.2.7",
      "react-router": REACT_ROUTER_VERSION,
    },
    devDependencies: {
      "@tailwindcss/vite": "4.3.0",
      "@types/react": "19.2.17",
      "@types/react-dom": "19.2.3",
      "@vitejs/plugin-react": "6.0.3",
      tailwindcss: "4.3.0",
      typescript: "6.0.3",
      vite: "8.1.4",
    },
  };
  await writeFile(
    join(candidateRoot, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

async function stageRegistry(candidateRoot) {
  const registryTarget = join(candidateRoot, ".registry/r");
  await mkdir(registryTarget, { recursive: true });
  await cp(join(repositoryRoot, "registry/r"), registryTarget, {
    recursive: true,
  });
  const shadcn = join(repositoryRoot, "node_modules/.bin/shadcn");
  const localItems = ["afferent-ui-core", ...registryItems];
  try {
    for (const name of localItems) {
      await cp(
        join(repositoryRoot, `registry/r/${name}.json`),
        join(candidateRoot, `${name}.json`),
      );
    }
    await run(
      shadcn,
      [
        "add",
        "--yes",
        "--overwrite",
        ...registryItems.map((name) => `./${name}.json`),
      ],
      { cwd: candidateRoot },
    );
  } finally {
    await Promise.all(
      localItems.map((name) =>
        rm(join(candidateRoot, `${name}.json`), { force: true }),
      ),
    );
  }
}

async function assertInstalledRegistryBytes(candidateRoot) {
  const seen = new Map();
  for (const name of ["afferent-ui-core", ...registryItems]) {
    const item = JSON.parse(
      await readFile(join(repositoryRoot, `registry/r/${name}.json`), "utf8"),
    );
    for (const file of item.files) {
      const prior = seen.get(file.target);
      if (prior !== undefined && prior !== file.content) {
        throw new Error(`registry target collision changed ${file.target}`);
      }
      seen.set(file.target, file.content);
    }
  }
  for (const [target, content] of seen) {
    const installed = await readFile(
      join(candidateRoot, "src", target),
      "utf8",
    );
    if (installed !== content) {
      throw new Error(`installed registry source drifted at ${target}`);
    }
  }
}

function assertSafeCandidatePath(candidateRoot) {
  const absolute = resolve(candidateRoot);
  if (
    !isInside(absolute, repositoryRoot) ||
    !relative(repositoryRoot, absolute).startsWith(DEMO_CANDIDATE_DIR)
  ) {
    throw new Error(
      `demo candidate must be an explicit ${DEMO_CANDIDATE_DIR} path inside the repository`,
    );
  }
}

export async function prepareDemoConsumer(options = {}) {
  const candidateRoot = resolve(
    options.candidateDir ?? join(repositoryRoot, DEMO_CANDIDATE_DIR),
  );
  assertSafeCandidatePath(candidateRoot);
  if (
    await pathExists(join(repositoryRoot, "example/src/components/afferent"))
  ) {
    throw new Error(
      "the committed example contains a second product UI tree; install registry source only in the candidate",
    );
  }
  if (options.force || !(await pathExists(candidateRoot))) {
    await rm(candidateRoot, { force: true, recursive: true });
  } else {
    return verifyDemoCandidate(candidateRoot);
  }

  await run(process.execPath, ["scripts/generate-ui-artifacts.mjs"], {
    cwd: repositoryRoot,
  });
  await buildReleasePackage();

  await cp(join(repositoryRoot, "example"), candidateRoot, {
    recursive: true,
  });
  await sanitizeGeneratedBindings(candidateRoot);
  await mkdir(join(candidateRoot, "src"), { recursive: true });
  if (!(await pathExists(join(candidateRoot, "src/index.css")))) {
    await writeFile(
      join(candidateRoot, "src/index.css"),
      '@import "tailwindcss";\n@import "@/components/afferent/afferent.css";\n',
    );
  }
  await writeCandidateManifest(candidateRoot);

  const artifactsRoot = join(candidateRoot, "artifacts");
  const packageSource = join(candidateRoot, ".package-source");
  await mkdir(artifactsRoot, { recursive: true });
  await mkdir(packageSource, { recursive: true });
  await cp(join(repositoryRoot, "dist"), join(packageSource, "dist"), {
    recursive: true,
  });
  await cp(join(repositoryRoot, "LICENSE"), join(packageSource, "LICENSE"));
  const manifest = await releaseManifest();
  await writeFile(
    join(packageSource, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const packResult = await run(
    "npm",
    [
      "pack",
      packageSource,
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      artifactsRoot,
    ],
    { cwd: repositoryRoot },
  );
  const packed = parseJsonOutput(packResult.stdout)[0];
  const tarball = join(artifactsRoot, packed.filename);
  const registry = await registryPayload();
  validatePackageCandidate({
    manifest,
    packedFiles: new Set(packed.files.map((file) => file.path)),
    registry: {
      name: "afferent",
      compatibleVersion: manifest.version,
    },
  });
  await rm(packageSource, { force: true, recursive: true });

  await run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--save-exact",
      `./artifacts/${packed.filename}`,
    ],
    { cwd: candidateRoot },
  );
  await stageRegistry(candidateRoot);
  await run("npm", ["install", "--ignore-scripts", "--save-exact"], {
    cwd: candidateRoot,
  });
  await run(
    "npm",
    ["ls", "afferent", "convex", "react", "react-dom", "react-router"],
    { cwd: candidateRoot },
  );
  await assertInstalledRegistryBytes(candidateRoot);

  const example = await examplePayload();
  const installedUi = await installedUiPayload(candidateRoot);
  const commitResult = await run("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
  });
  const sourceCommit = commitResult.stdout.trim();
  const provenance = {
    schemaVersion: 1,
    sourceCommit,
    reactRouter: REACT_ROUTER_VERSION,
    steps: ["build", "pack", "install-package", "install-registry"],
    artifacts: {
      package: {
        name: manifest.name,
        version: manifest.version,
        file: `artifacts/${packed.filename}`,
        sha256: await sha256(tarball),
      },
      registry,
    },
    example,
    installedUi,
  };
  await writeFile(
    join(candidateRoot, ".afferent-provenance.json"),
    `${JSON.stringify(provenance, null, 2)}\n`,
  );
  return {
    candidateDir: candidateRoot,
    steps: provenance.steps,
    ...(await verifyDemoCandidate(candidateRoot)),
  };
}

export async function verifyDemoCandidate(candidateDir) {
  const candidateRoot = resolve(candidateDir);
  assertSafeCandidatePath(candidateRoot);
  const provenance = JSON.parse(
    await readFile(join(candidateRoot, ".afferent-provenance.json"), "utf8"),
  );
  if (
    provenance.schemaVersion !== 1 ||
    provenance.reactRouter !== REACT_ROUTER_VERSION
  ) {
    throw new Error("demo provenance manifest is missing its versioned pins");
  }
  if (
    JSON.stringify(provenance.steps) !==
    JSON.stringify(["build", "pack", "install-package", "install-registry"])
  ) {
    throw new Error(
      "demo provenance manifest has a skipped or reordered stage",
    );
  }

  const tarball = join(candidateRoot, provenance.artifacts.package.file);
  if ((await sha256(tarball)) !== provenance.artifacts.package.sha256) {
    throw new Error("packed Afferent tarball digest does not match provenance");
  }
  const registry = await registryPayload();
  if (
    registry.sha256 !== provenance.artifacts.registry.sha256 ||
    JSON.stringify(registry.files) !==
      JSON.stringify(provenance.artifacts.registry.files)
  ) {
    throw new Error("generated registry digest does not match provenance");
  }
  const copiedRegistryDigest = await digestPaths(
    join(candidateRoot, ".registry"),
    registry.files,
  );
  if (copiedRegistryDigest !== registry.sha256) {
    throw new Error("candidate registry payload differs from published bytes");
  }

  const example = await examplePayload();
  if (
    example.sha256 !== provenance.example.sha256 ||
    JSON.stringify(example.files) !== JSON.stringify(provenance.example.files)
  ) {
    throw new Error(
      "committed example source differs from candidate provenance",
    );
  }
  for (const path of example.files) {
    const [source, candidate] = await Promise.all([
      readFile(join(repositoryRoot, "example", path)),
      readFile(join(candidateRoot, path)),
    ]);
    if (!source.equals(candidate)) {
      throw new Error(`candidate example source drifted at ${path}`);
    }
  }

  const installedPackageRoot = await realpath(
    join(candidateRoot, "node_modules/afferent"),
  );
  if (!isInside(installedPackageRoot, join(candidateRoot, "node_modules"))) {
    throw new Error(
      "Afferent resolved through a repository workspace fallback",
    );
  }
  const installedPackage = JSON.parse(
    await readFile(join(installedPackageRoot, "package.json"), "utf8"),
  );
  if (
    installedPackage.name !== provenance.artifacts.package.name ||
    installedPackage.version !== provenance.artifacts.package.version ||
    installedPackage.devDependencies?.typescript !== "6.0.3"
  ) {
    throw new Error(
      "installed package identity differs from packed provenance",
    );
  }
  const candidateManifest = JSON.parse(
    await readFile(join(candidateRoot, "package.json"), "utf8"),
  );
  if (
    candidateManifest.dependencies?.["react-router"] !== REACT_ROUTER_VERSION ||
    candidateManifest.dependencies?.afferent !==
      `file:artifacts/${provenance.artifacts.package.file.split("/").at(-1)}`
  ) {
    throw new Error("candidate dependencies are not exact artifact pins");
  }
  await access(join(candidateRoot, "package-lock.json"));
  await assertInstalledRegistryBytes(candidateRoot);
  const installedUi = await installedUiPayload(candidateRoot);
  if (
    installedUi.sha256 !== provenance.installedUi.sha256 ||
    JSON.stringify(installedUi.files) !==
      JSON.stringify(provenance.installedUi.files)
  ) {
    throw new Error("registry-installed UI differs from provenance");
  }

  await assertImportOrigins({
    sourceRoot: join(repositoryRoot, "example"),
    candidateRoot: repositoryRoot,
    repositoryRoot,
    allowUnresolvedGeneratedUi: true,
  });
  await assertImportOrigins({
    sourceRoot: candidateRoot,
    candidateRoot,
    repositoryRoot,
  });

  return {
    candidateDir: candidateRoot,
    steps: provenance.steps,
    package: {
      name: provenance.artifacts.package.name,
      version: provenance.artifacts.package.version,
      sha256: provenance.artifacts.package.sha256,
    },
    registry,
    example,
    installedUi,
    reactRouter: provenance.reactRouter,
    sourceCommit: provenance.sourceCommit,
  };
}

export function validateDemoGateEvidence(gate) {
  if (
    gate?.schemaVersion !== 1 ||
    gate.status !== "complete" ||
    JSON.stringify(gate.steps) !== JSON.stringify(DEMO_GATE_STEPS)
  ) {
    throw new Error("demo aggregate gate has a skipped or reordered stage");
  }
  for (const name of [
    "package",
    "registry",
    "example",
    "installedUi",
    "build",
    "hostTests",
  ]) {
    if (!/^[a-f0-9]{64}$/.test(gate.digests?.[name] ?? "")) {
      throw new Error(
        `demo aggregate gate is missing digest evidence: ${name}`,
      );
    }
  }
  return gate;
}

async function writeGateEvidence(candidateRoot, gate) {
  const provenancePath = join(candidateRoot, ".afferent-provenance.json");
  const provenance = JSON.parse(await readFile(provenancePath, "utf8"));
  provenance.gate = gate;
  await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
}

export async function runDemoArtifactGate(options = {}) {
  const candidateRoot = resolve(
    options.candidateDir ?? join(repositoryRoot, DEMO_CANDIDATE_DIR),
  );
  assertSafeCandidatePath(candidateRoot);
  const prepared = await prepareDemoConsumer({
    candidateDir: candidateRoot,
    force: true,
  });
  await run("npm", ["run", "typecheck"], { cwd: candidateRoot });
  await run("npm", ["run", "build"], {
    cwd: candidateRoot,
    env: {
      VITE_AFFERENT_SOURCE_COMMIT: prepared.sourceCommit,
      VITE_CONVEX_URL:
        process.env.VITE_CONVEX_URL ?? "https://demo-gate.convex.cloud",
    },
  });

  const build = await directoryPayload(join(candidateRoot, "dist"));
  const testingGate = {
    schemaVersion: 1,
    status: "testing",
    steps: DEMO_GATE_STEPS.slice(0, 3),
    digests: {
      package: prepared.package.sha256,
      registry: prepared.registry.sha256,
      example: prepared.example.sha256,
      installedUi: prepared.installedUi.sha256,
      build: build.sha256,
    },
    build,
  };
  await writeGateEvidence(candidateRoot, testingGate);

  const hostTestPath = join(repositoryRoot, "tests/ui/hosted-shell.test.tsx");
  await run(
    "npm",
    [
      "exec",
      "--",
      "vitest",
      "run",
      "--config",
      "vitest.react.config.ts",
      "tests/ui/hosted-shell.test.tsx",
    ],
    {
      cwd: repositoryRoot,
      env: {
        AFFERENT_REQUIRE_DEMO_PROVENANCE: "1",
        AFFERENT_DEMO_PROVENANCE: join(
          candidateRoot,
          ".afferent-provenance.json",
        ),
        AFFERENT_DEMO_UI_ROOT: join(candidateRoot, generatedUiRoot),
        AFFERENT_DEMO_PACKAGE_ROOT: join(
          candidateRoot,
          "node_modules/afferent",
        ),
      },
    },
  );

  const completeGate = {
    ...testingGate,
    status: "complete",
    steps: [...DEMO_GATE_STEPS],
    digests: {
      ...testingGate.digests,
      hostTests: await sha256(hostTestPath),
    },
  };
  validateDemoGateEvidence(completeGate);
  await writeGateEvidence(candidateRoot, completeGate);
  await verifyDemoCandidate(candidateRoot);
  return {
    ...prepared,
    gate: completeGate,
  };
}

async function main() {
  const candidateDir = join(repositoryRoot, DEMO_CANDIDATE_DIR);
  const gate = process.argv.includes("--gate");
  const verifyOnly = process.argv.includes("--verify");
  const fresh = process.argv.includes("--fresh");
  let result;
  if (gate) {
    result = await runDemoArtifactGate({ candidateDir });
  } else if (verifyOnly && !fresh && (await pathExists(candidateDir))) {
    result = await verifyDemoCandidate(candidateDir);
  } else {
    result = await prepareDemoConsumer({ candidateDir, force: true });
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        candidate: DEMO_CANDIDATE_DIR,
        package: result.package,
        registry: result.registry,
        example: result.example,
        reactRouter: result.reactRouter,
        sourceCommit: result.sourceCommit,
        steps: result.steps,
        gate: result.gate,
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
