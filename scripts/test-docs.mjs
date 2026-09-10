import { spawn } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  join,
  posix,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

import { fromMarkdown } from "mdast-util-from-markdown";
import ts from "typescript";

import { repositoryFromMetadata } from "./generate-release-manifest.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const allowedReleaseTokens = new Set([
  "AFFERENT_RELEASE_DOCS_URL",
  "AFFERENT_RELEASE_REGISTRY_URL",
  "AFFERENT_RELEASE_REPOSITORY_URL",
]);
const operationalReleaseTokens = new Set([
  "AFFERENT_RELEASE_APPROVED_TAG",
  "AFFERENT_RELEASE_OWNER",
]);
const requiredDocuments = [
  "README.md",
  "docs/index.md",
  "docs/guide/local-demo.md",
  "docs/guide/install.md",
  "docs/guide/mount.md",
  "docs/auth/convex-auth.md",
  "docs/auth/clerk.md",
  "docs/auth/better-auth.md",
  "docs/ui/headless.md",
  "docs/ui/registry.md",
  "docs/ui/customization.md",
  "docs/operations/testing.md",
  "docs/operations/deployment.md",
  "docs/operations/upgrades.md",
];
const requiredPackageExports = [
  ".",
  "./react.js",
  "./server.js",
  "./adapters/convex-auth.js",
  "./adapters/clerk.js",
  "./adapters/better-auth.js",
  "./convex.config.js",
  "./_generated/component.js",
  "./test",
];

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

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

async function readDocuments() {
  const docsFiles = await filesUnder(join(repositoryRoot, "docs"));
  const paths = [
    join(repositoryRoot, "README.md"),
    ...docsFiles.filter((path) => path.endsWith(".md")),
  ];
  return new Map(
    await Promise.all(
      paths.map(async (path) => [
        relative(repositoryRoot, path).split(sep).join("/"),
        await readFile(path, "utf8"),
      ]),
    ),
  );
}

function walk(node, visit) {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

function internalLinkCandidates(documentPath, url) {
  const withoutFragment = url.split("#", 1)[0].split("?", 1)[0];
  if (!withoutFragment) return [];
  const resolved = withoutFragment.startsWith("/")
    ? posix.normalize(`docs${withoutFragment}`)
    : posix.normalize(posix.join(posix.dirname(documentPath), withoutFragment));
  if (posix.extname(resolved)) return [resolved];
  return [resolved, `${resolved}.md`, posix.join(resolved, "index.md")];
}

export function validateInternalLinks(
  documents,
  existingPaths = new Set(documents.keys()),
) {
  for (const [documentPath, source] of documents) {
    const tree = fromMarkdown(source);
    walk(tree, (node) => {
      if (node.type !== "link" && node.type !== "image") return;
      const url = node.url;
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(url)) {
        return;
      }
      const candidates = internalLinkCandidates(documentPath, url);
      if (
        candidates.length > 0 &&
        !candidates.some((candidate) => existingPaths.has(candidate))
      ) {
        throw new Error(
          `dead internal link in ${documentPath}: ${url} (tried ${candidates.join(", ")})`,
        );
      }
    });
  }
}

export function assertSafeTypeScriptSnippet(source, documentPath) {
  const property = source.match(/\b(?<name>userId|isAdmin|scopeId)\s*\??\s*:/u);
  const argument = source.match(
    /\bargs\s*(?:\.\s*(?<dot>userId|isAdmin|scopeId)|\[\s*["'](?<bracket>userId|isAdmin|scopeId)["']\s*\])/u,
  );
  const shorthand = source.match(
    /\b(?:mutation|query|action|runMutation|runAction)\s*\([\s\S]*?\{[\s\S]*?\b(?<name>userId|isAdmin|scopeId)\b\s*(?:,|\})/u,
  );
  const name =
    property?.groups?.name ??
    argument?.groups?.dot ??
    argument?.groups?.bracket ??
    shorthand?.groups?.name;
  if (name) {
    throw new Error(
      `browser authority field ${name} is forbidden in ${documentPath}`,
    );
  }
}

export function assertNoRemoteDemoClaims(source, documentPath) {
  const remoteUrl = source.match(
    /https?:\/\/[^\s)`"']*(?:vercel\.(?:app|com)|convex\.(?:cloud|site))[^\s)`"']*/iu,
  );
  const remoteMode = source.match(/(?:^|\s)--remote(?:\s|$)/imu);
  const ownedIdentifier = source.match(
    /\b(?:AFFERENT_DEMO_URL|AFFERENT_HOSTED_DEMO|VERCEL_(?:ORG|PROJECT)_ID)\b/u,
  );
  const affirmativeHosted = source.match(
    /\b(?:visit|try|open|use|available at|deployed at|hosted at)\b[^\n.]{0,80}\bhosted demo\b/iu,
  );
  const found =
    remoteUrl?.[0] ??
    remoteMode?.[0] ??
    ownedIdentifier?.[0] ??
    affirmativeHosted?.[0];
  if (found) {
    throw new Error(
      `remote demo or hosted demo claim is forbidden in ${documentPath}: ${found}`,
    );
  }
}

export function assertNoNpmPublicationClaims(source, documentPath) {
  const publicInstall = source.match(
    /\b(?:npm\s+(?:install|i|add)|pnpm\s+(?:install|i|add)|yarn\s+add)\s+(?:--?[\w-]+\s+)*afferent(?=@|\s|$|[`"'])/imu,
  );
  const publicationCommand = source.match(/\bnpm\s+(?:stage\s+)?publish\b/iu);
  const npmReleaseSurface = source.match(
    /\b(?:AFFERENT_RELEASE_NPM_URL|npm-production|NODE_AUTH_TOKEN|NPM_TOKEN)\b/u,
  );
  const found =
    publicInstall?.[0] ?? publicationCommand?.[0] ?? npmReleaseSurface?.[0];
  if (found) {
    throw new Error(
      `npm publication claim is forbidden in ${documentPath}: ${found}`,
    );
  }
}

export function validateRegistryExamples(source, registryItems, documentPath) {
  for (const match of source.matchAll(/\bafferent-[a-z][a-z0-9-]*\b/gu)) {
    const name = match[0];
    if (name === "afferent-docs") continue;
    if (!registryItems.has(name)) {
      throw new Error(`unknown registry item ${name} in ${documentPath}`);
    }
  }
}

function parseMetadata(source) {
  const metadata = {};
  for (const match of source.matchAll(
    /(?<key>[a-z][a-z0-9-]*)(?:=(?<value>[^\s]+))?/gu,
  )) {
    const key = match.groups.key;
    const value = match.groups.value ?? true;
    if (metadata.kind === undefined && value === true) metadata.kind = key;
    else metadata[key] = value;
  }
  return metadata;
}

function extractCodeFences(documents) {
  const fences = [];
  const pattern =
    /(?:(?:<!--\s*afferent-docs:\s*(?<metadata>[^>]*?)\s*-->)\s*)?```(?<language>[a-z0-9+-]+)\s*\n(?<source>[\s\S]*?)\n```/giu;
  for (const [documentPath, markdown] of documents) {
    for (const match of markdown.matchAll(pattern)) {
      fences.push({
        documentPath,
        language: match.groups.language.toLowerCase(),
        source: match.groups.source,
        metadata: match.groups.metadata
          ? parseMetadata(match.groups.metadata)
          : undefined,
      });
    }
  }
  return fences;
}

function expectedMetadataKind(language) {
  if (language === "ts" || language === "tsx") return "typescript";
  if (language === "sh" || language === "bash") return "shell";
  return language;
}

function assertFenceMetadata(fence) {
  if (!fence.metadata) {
    throw new Error(`code fence is missing metadata in ${fence.documentPath}`);
  }
  if (fence.metadata.kind !== expectedMetadataKind(fence.language)) {
    throw new Error(
      `code fence metadata kind does not match ${fence.language} in ${fence.documentPath}`,
    );
  }
  if (!fence.metadata.mode || !fence.metadata.context) {
    throw new Error(
      `code fence metadata needs mode and context in ${fence.documentPath}`,
    );
  }
  if (
    fence.metadata.executable &&
    (fence.metadata.mode !== "fixture" || !fence.metadata.fixture)
  ) {
    throw new Error(
      `executable fence needs a fixture in ${fence.documentPath}`,
    );
  }
}

function assertTypeScriptSyntax(fence) {
  const result = ts.transpileModule(fence.source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
    },
    fileName: `${fence.documentPath}.${fence.language}`,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    const message = ts.flattenDiagnosticMessageText(
      errors[0].messageText,
      "\n",
    );
    throw new Error(
      `TypeScript snippet syntax failed in ${fence.documentPath}: ${message}`,
    );
  }
}

function assertCssSyntax(fence) {
  const withoutComments = fence.source.replace(/\/\*[\s\S]*?\*\//gu, "");
  let depth = 0;
  for (const character of withoutComments) {
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth < 0) break;
  }
  if (depth !== 0) {
    throw new Error(`CSS snippet braces are invalid in ${fence.documentPath}`);
  }
}

function packageExportKey(specifier) {
  if (specifier === "afferent") return ".";
  if (specifier.startsWith("afferent/")) {
    return `./${specifier.slice("afferent/".length)}`;
  }
  return undefined;
}

function validatePackageImports(fence, manifest) {
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^"'()]*?\s+from\s*)?["'](?<specifier>[^"']+)["']/gu,
    /\bimport\s*\(\s*["'](?<specifier>[^"']+)["']\s*\)/gu,
  ];
  for (const pattern of patterns) {
    for (const match of fence.source.matchAll(pattern)) {
      const key = packageExportKey(match.groups.specifier);
      if (key && manifest.exports[key] === undefined) {
        throw new Error(
          `unknown package export ${match.groups.specifier} in ${fence.documentPath}`,
        );
      }
    }
  }
}

export function validateShellFence(fence, manifest, registryItems) {
  if (/[;&|>]|\$\(|`/u.test(fence.source)) {
    throw new Error(
      `shell composition is not allowed in ${fence.documentPath}`,
    );
  }
  for (const line of fence.source.split("\n").map((value) => value.trim())) {
    if (!line) continue;
    if (line === "npm install") {
      if (
        fence.metadata.mode !== "package-install" &&
        fence.metadata.mode !== "script-reference"
      ) {
        throw new Error(
          `package install metadata is invalid in ${fence.documentPath}`,
        );
      }
      continue;
    }
    if (line === "npm ci") {
      if (
        fence.metadata.mode !== "source-build" &&
        fence.metadata.mode !== "script-reference"
      ) {
        throw new Error(
          `source install metadata is invalid in ${fence.documentPath}`,
        );
      }
      continue;
    }
    if (line === "npm pack --ignore-scripts") {
      if (fence.metadata.mode !== "source-build") {
        throw new Error(
          `source package metadata is invalid in ${fence.documentPath}`,
        );
      }
      continue;
    }
    if (
      line === `npm install /absolute/path/to/afferent-${manifest.version}.tgz`
    ) {
      if (fence.metadata.mode !== "local-package-install") {
        throw new Error(
          `local package install metadata is invalid in ${fence.documentPath}`,
        );
      }
      continue;
    }
    const npmRun = line.match(/^npm run (?<script>[a-z0-9:_-]+)$/iu);
    if (npmRun) {
      if (!manifest.scripts[npmRun.groups.script]) {
        throw new Error(
          `unknown package script ${npmRun.groups.script} in ${fence.documentPath}`,
        );
      }
      continue;
    }
    if (line === "npx convex dev --once" || line === "npx convex deploy") {
      if (fence.metadata.mode !== "syntax-only") {
        throw new Error(
          `external Convex command must be syntax-only in ${fence.documentPath}`,
        );
      }
      continue;
    }
    const registryInstall = line.match(
      /^npx shadcn@(?<version>\d+\.\d+\.\d+) add (?<registry>\S+)\/r\/(?<item>afferent-[a-z0-9-]+)\.json$/u,
    );
    if (registryInstall) {
      const repository = repositoryFromMetadata(manifest.repository);
      const [owner, name] = repository?.split("/") ?? [];
      const publicRegistry = repository
        ? `https://${owner}.github.io/${name}`
        : undefined;
      if (
        fence.metadata.mode !== "registry-install" ||
        registryInstall.groups.version !== manifest.devDependencies.shadcn ||
        registryInstall.groups.registry !== publicRegistry ||
        !registryItems.has(registryInstall.groups.item)
      ) {
        throw new Error(
          `registry install command drifted in ${fence.documentPath}: ${line}`,
        );
      }
      continue;
    }
    throw new Error(
      `unvalidated shell command in ${fence.documentPath}: ${line}`,
    );
  }
}

export function validateReleaseTokens(documents, manifest) {
  const repository = repositoryFromMetadata(manifest.repository);
  if (!repository) throw new Error("release repository metadata is missing");
  const [owner, name] = repository.split("/");
  const destinations = {
    AFFERENT_RELEASE_DOCS_URL: `https://${owner}.github.io/${name}/`,
    AFFERENT_RELEASE_REGISTRY_URL: `https://${owner}.github.io/${name}`,
    AFFERENT_RELEASE_REPOSITORY_URL: `https://github.com/${repository}`,
  };
  const urls = new Set();
  const found = new Set();
  for (const [documentPath, source] of documents) {
    for (const match of source.matchAll(/https:\/\/[^\s<>"'`)\]]+/gu)) {
      urls.add(match[0]);
    }
    const prose = source.replace(/`(?<value>[^`\n]+)`/gu, (span, value) =>
      operationalReleaseTokens.has(value) ? "" : span,
    );
    for (const match of prose.matchAll(/\bAFFERENT_RELEASE_[^\s`]*/giu)) {
      if (!allowedReleaseTokens.has(match[0])) {
        throw new Error(
          `unknown release placeholder ${match[0]} in ${documentPath}`,
        );
      }
      found.add(match[0]);
    }
  }
  for (const token of allowedReleaseTokens) {
    if (found.has(token)) {
      throw new Error(`unresolved release placeholder: ${token}`);
    }
    if (!urls.has(destinations[token])) {
      throw new Error(`required release destination is missing: ${token}`);
    }
  }
  return [...found].sort();
}

function exportTargets(exports) {
  return Object.values(exports).flatMap((entry) =>
    typeof entry === "string" ? [entry] : Object.values(entry),
  );
}

function validatePackedExports(manifest, packedFiles) {
  for (const key of requiredPackageExports) {
    if (manifest.exports[key] === undefined) {
      throw new Error(`required package export is missing: ${key}`);
    }
  }
  for (const target of exportTargets(manifest.exports)) {
    const path = target.replace(/^\.\//u, "");
    if (!packedFiles.has(path)) {
      throw new Error(`packed package is missing export target ${path}`);
    }
  }
}

async function validateGeneratedRegistry(catalog, generatedCatalog) {
  if (JSON.stringify(catalog) !== JSON.stringify(generatedCatalog)) {
    throw new Error("registry/r/registry.json drifted from registry.json");
  }
  for (const item of catalog.items) {
    const generatedPath = join(
      repositoryRoot,
      "registry/r",
      `${item.name}.json`,
    );
    const generated = JSON.parse(await readFile(generatedPath, "utf8"));
    if (
      generated.name !== item.name ||
      JSON.stringify(generated.registryDependencies) !==
        JSON.stringify(item.registryDependencies)
    ) {
      throw new Error(`generated registry item drifted: ${item.name}`);
    }
    for (const file of generated.files) {
      const canonical = await readFile(join(repositoryRoot, file.path), "utf8");
      if (canonical !== file.content) {
        throw new Error(
          `generated registry content drifted: ${item.name}/${file.path}`,
        );
      }
    }
  }
}

export function validateRequirementCoverage(planSource, requirementsSource) {
  const match = planSource.match(/^requirements:\s*\[(?<ids>[^\]]+)\]/mu);
  if (!match) throw new Error("documentation plan has no requirement IDs");
  const ids = match.groups.ids
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const retired = new Set();
  // A retirement marker must introduce an ID list directly. Validate every
  // Marker so malformed or reflowed prose cannot silently change coverage.
  for (const marker of requirementsSource.matchAll(
    /\*\*Removed from v1:\*\*/gu,
  )) {
    const retirement = requirementsSource
      .slice(marker.index + marker[0].length)
      .match(
        /^[ \t]*(?:\r?\n[ \t]*)?(?<ids>`[A-Z]+-\d+`(?:\s*(?:,\s*(?:and\s+)?|and\s+|&\s+)`[A-Z]+-\d+`)*)/u,
      );
    if (!retirement) {
      throw new Error(
        "Removed from v1 marker must be followed directly by a backticked requirement ID list on the same or next line",
      );
    }
    for (const match of retirement.groups.ids.matchAll(
      /`(?<id>[A-Z]+-\d+)`/gu,
    )) {
      retired.add(match.groups.id);
    }
  }
  for (const id of ids) {
    if (!requirementsSource.includes(id)) {
      throw new Error(`documentation requirement does not exist: ${id}`);
    }
  }
  return {
    active: ids.filter((id) => !retired.has(id)),
    retired: ids.filter((id) => retired.has(id)),
  };
}

async function validateLocalDemoCommand(manifest, documents) {
  if (manifest.scripts["dev:demo"] !== "node scripts/dev-demo.mjs") {
    throw new Error("dev:demo no longer targets the owned local launcher");
  }
  const source = await readFile(
    join(repositoryRoot, "scripts/dev-demo.mjs"),
    "utf8",
  );
  for (const expected of [
    "prepareLocalDemoTarget",
    "stopOwned",
    "detachedProcesses: false",
    "finally",
    "127.0.0.1",
  ]) {
    if (!source.includes(expected)) {
      throw new Error(`local demo ownership contract is missing ${expected}`);
    }
  }
  if (
    ![...documents.values()].some((document) =>
      document.includes("npm run dev:demo"),
    )
  ) {
    throw new Error("documentation omits the tested local demo command");
  }
}

function validateDocuments({
  documents,
  manifest,
  registryItems,
  planSource,
  requirementsSource,
}) {
  for (const path of requiredDocuments) {
    if (!documents.has(path))
      throw new Error(`required docs page is missing: ${path}`);
  }
  validateInternalLinks(documents, new Set([...documents.keys(), "LICENSE"]));
  for (const [documentPath, source] of documents) {
    assertNoRemoteDemoClaims(source, documentPath);
    assertNoNpmPublicationClaims(source, documentPath);
  }
  const releaseTokens = validateReleaseTokens(documents, manifest);
  validateRegistryExamples(
    documents.get("docs/ui/registry.md"),
    registryItems,
    "docs/ui/registry.md",
  );
  const fences = extractCodeFences(documents);
  for (const fence of fences) {
    assertFenceMetadata(fence);
    if (fence.language === "ts" || fence.language === "tsx") {
      assertSafeTypeScriptSnippet(fence.source, fence.documentPath);
      assertTypeScriptSyntax(fence);
      validatePackageImports(fence, manifest);
    } else if (fence.language === "sh" || fence.language === "bash") {
      validateShellFence(fence, manifest, registryItems);
    } else if (fence.language === "css") {
      assertCssSyntax(fence);
    } else {
      throw new Error(
        `unsupported documentation fence language ${fence.language}`,
      );
    }
  }
  return {
    fences,
    releaseTokens,
    requirements: validateRequirementCoverage(planSource, requirementsSource),
  };
}

async function stageAndCompileExecutableFixtures({
  executableFences,
  manifest,
  temporaryRoot,
  tarball,
}) {
  const fixturePackage = {
    name: "afferent-docs-fixtures",
    version: "0.0.0",
    private: true,
    type: "module",
    dependencies: {
      "@auth/core": manifest.devDependencies["@auth/core"],
      "@convex-dev/auth": manifest.devDependencies["@convex-dev/auth"],
      "@convex-dev/better-auth":
        manifest.devDependencies["@convex-dev/better-auth"],
      afferent: `file:./${basename(tarball)}`,
      "better-auth": manifest.devDependencies["better-auth"],
      convex: manifest.devDependencies.convex,
      react: manifest.devDependencies.react,
    },
    devDependencies: {
      typescript: "6.0.3",
    },
  };
  await writeFile(
    join(temporaryRoot, "package.json"),
    `${JSON.stringify(fixturePackage, null, 2)}\n`,
  );
  await run("npm", ["install", "--ignore-scripts", "--package-lock=false"], {
    cwd: temporaryRoot,
  });

  const fixtureRoots = [];
  for (const fence of executableFences) {
    const fixture = fence.metadata.fixture;
    const marker = "/convex/";
    const splitAt = fixture.indexOf(marker);
    if (!fixture.startsWith("fixtures/") || splitAt === -1) {
      throw new Error(`unsafe executable fixture path: ${fixture}`);
    }
    const sourceRoot = fixture.slice(0, splitAt);
    const targetRoot = join(temporaryRoot, "snippets", basename(sourceRoot));
    await cp(join(repositoryRoot, sourceRoot), targetRoot, {
      recursive: true,
    });
    const relativeFixture = fixture.slice(sourceRoot.length + 1);
    await writeFile(join(targetRoot, relativeFixture), `${fence.source}\n`);
    fixtureRoots.push(targetRoot);
  }
  const tsc = join(
    temporaryRoot,
    "node_modules/.bin",
    process.platform === "win32" ? "tsc.cmd" : "tsc",
  );
  for (const fixtureRoot of fixtureRoots) {
    await run(tsc, ["--project", join(fixtureRoot, "tsconfig.json")], {
      cwd: temporaryRoot,
    });
  }
}

async function buildPackAndCompile({ documents, fences, manifest }) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-docs-"));
  try {
    await run("npm", ["run", "docs:build"]);
    await run("npm", ["run", "build"]);
    const packedResult = await run("npm", [
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      temporaryRoot,
    ]);
    const jsonStart = packedResult.stdout.indexOf("[");
    if (jsonStart === -1) throw new Error("npm pack did not return JSON");
    const [packed] = JSON.parse(packedResult.stdout.slice(jsonStart));
    const tarball = join(temporaryRoot, packed.filename);
    validatePackedExports(
      manifest,
      new Set(packed.files.map((file) => file.path)),
    );
    const executableFences = fences.filter(
      (fence) => fence.metadata.executable,
    );
    if (executableFences.length !== 3) {
      throw new Error(
        `expected three executable auth fixtures, found ${executableFences.length}`,
      );
    }
    await stageAndCompileExecutableFixtures({
      executableFences,
      manifest,
      temporaryRoot,
      tarball,
    });
    return {
      localArtifact: `${manifest.name}@${manifest.version}`,
      executableSnippets: executableFences.length,
      packCount: 1,
      packedFiles: packed.files.length,
      documents: documents.size,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function readDocumentationRequirements(root = repositoryRoot) {
  // Phase 04-07 belongs to planning milestone v1.0 (product release v0.1.0).
  // Keep its plan and requirements together after archival; a later milestone's
  // active requirements must never replace this documentation contract.
  const sources = [
    [
      ".planning/milestones/v1.0-phases/04-hosted-production-release/04-07-PLAN.md",
      ".planning/milestones/v1.0-REQUIREMENTS.md",
    ],
    [
      ".planning/phases/04-hosted-production-release/04-07-PLAN.md",
      ".planning/REQUIREMENTS.md",
    ],
  ];
  for (const paths of sources) {
    const results = await Promise.allSettled(
      paths.map((path) => readFile(join(root, path), "utf8")),
    );
    for (const result of results) {
      if (result.status === "rejected" && result.reason.code !== "ENOENT") {
        throw result.reason;
      }
    }
    if (results.every((result) => result.status === "fulfilled")) {
      return {
        planSource: results[0].value,
        requirementsSource: results[1].value,
      };
    }
    if (results.some((result) => result.status === "fulfilled")) {
      throw new Error(
        `Incomplete documentation requirement sources: ${paths.join(", ")}`,
      );
    }
  }
  throw new Error("Missing documentation requirement plan and requirements");
}

export async function verifyDocumentation() {
  const [
    documents,
    manifestSource,
    catalogSource,
    generatedCatalogSource,
    { planSource, requirementsSource },
  ] = await Promise.all([
    readDocuments(),
    readFile(join(repositoryRoot, "package.json"), "utf8"),
    readFile(join(repositoryRoot, "registry/registry.json"), "utf8"),
    readFile(join(repositoryRoot, "registry/r/registry.json"), "utf8"),
    readDocumentationRequirements(),
  ]);
  const manifest = JSON.parse(manifestSource);
  const catalog = JSON.parse(catalogSource);
  const generatedCatalog = JSON.parse(generatedCatalogSource);
  const registryItems = new Set(catalog.items.map((item) => item.name));
  const validation = validateDocuments({
    documents,
    manifest,
    registryItems,
    planSource,
    requirementsSource,
  });
  await validateGeneratedRegistry(catalog, generatedCatalog);
  await validateLocalDemoCommand(manifest, documents);
  const packed = await buildPackAndCompile({
    documents,
    fences: validation.fences,
    manifest,
  });
  return {
    schemaVersion: 1,
    status: "complete",
    ...packed,
    codeFences: validation.fences.length,
    registryItems: registryItems.size,
    requirements: validation.requirements.active,
    retiredRequirements: validation.requirements.retired,
    unresolvedReleaseTokens: validation.releaseTokens,
  };
}

async function main() {
  const result = await verifyDocumentation();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
