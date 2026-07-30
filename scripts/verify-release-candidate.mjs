import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

import {
  createReleaseManifest,
  loadReleaseIdentity,
  validateReleaseManifest,
} from "./generate-release-manifest.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sha256Pattern = /^[a-f0-9]{64}$/u;
const commitPattern = /^[a-f0-9]{40}$/u;
const actionPinPattern = /^[^@\s]+@[a-f0-9]{40}$/u;
const canonicalRepository = "bradywatkinson/afferent";
const canonicalCiActions = new Set([
  "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
  "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
  "actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c",
]);
const forbiddenWorkflowPattern =
  /NODE_AUTH_TOKEN|NPM_TOKEN|CONVEX_DEPLOY_KEY|CONVEX_DEPLOYMENT|VERCEL_(?:ORG|PROJECT)_ID|(?:^|\s)vercel(?:\s|$)|convex\s+deploy|remote[\s_-]*playwright|test:e2e:phase4:remote|--remote|VITE_CONVEX_URL/imu;

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

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function filesUnder(root) {
  if (!(await exists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return filesUnder(path);
      return entry.isFile() ? [path] : [];
    }),
  );
  return nested.flat().sort();
}

async function sha256File(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
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
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => (stdout += chunk));
      child.stderr.on("data", (chunk) => (stderr += chunk));
    }
    child.once("error", rejectRun);
    child.once("close", (code) => {
      if (code === 0) {
        resolveRun({ stdout, stderr });
        return;
      }
      rejectRun(
        new Error(
          `${command} ${args.join(" ")} failed (${code})${
            options.capture ? `\n${stderr}\n${stdout}` : ""
          }`,
        ),
      );
    });
  });
}

function commandFor(job) {
  return (job?.steps ?? [])
    .map((step) => step.run)
    .filter(Boolean)
    .join("\n");
}

function dependencyList(job) {
  if (Array.isArray(job?.needs)) return job.needs;
  return job?.needs ? [job.needs] : [];
}

function validatePinnedActions(workflow, allowedActions) {
  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (!step.uses) continue;
      if (!actionPinPattern.test(step.uses) || !allowedActions.has(step.uses)) {
        throw new Error(
          `workflow job ${jobName} has an invalid immutable action pin: ${step.uses}`,
        );
      }
    }
  }
}

function parseWorkflow(source, filename) {
  let workflow;
  try {
    workflow = parseYaml(source);
  } catch (error) {
    throw new Error(
      `${filename} is not valid YAML: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  if (!workflow || typeof workflow !== "object" || !workflow.jobs) {
    throw new Error(`${filename} must define workflow jobs`);
  }
  return workflow;
}

function assertNoForbiddenWorkflowSurface(source) {
  const match = forbiddenWorkflowPattern.exec(source);
  if (match) {
    throw new Error(
      `workflow contains a forbidden credential or hosted-demo surface: ${match[0]}`,
    );
  }
}

export function validateCiWorkflow(source) {
  assertNoForbiddenWorkflowSurface(source);
  const workflow = parseWorkflow(source, "ci.yml");
  if (
    workflow.permissions?.contents !== "read" ||
    Object.keys(workflow.permissions).length !== 1
  ) {
    throw new Error("CI permissions must be least-privilege contents: read");
  }
  if (
    workflow.concurrency?.["cancel-in-progress"] !== true ||
    typeof workflow.concurrency?.group !== "string"
  ) {
    throw new Error("CI must define canceling concurrency control");
  }
  if (!workflow.on?.push || !workflow.on?.pull_request) {
    throw new Error("CI must run on push and pull requests");
  }
  validatePinnedActions(workflow, canonicalCiActions);

  const quality = workflow.jobs.quality;
  const candidate = workflow.jobs.candidate;
  const localAcceptance = workflow.jobs["local-acceptance"];
  if (!quality || !candidate || !localAcceptance) {
    throw new Error(
      "CI must define quality, candidate, and local-acceptance jobs",
    );
  }
  for (const [name, job] of Object.entries({
    quality,
    candidate,
    "local-acceptance": localAcceptance,
  })) {
    if (
      job["runs-on"] !== "ubuntu-latest" ||
      !Number.isSafeInteger(job["timeout-minutes"]) ||
      job["timeout-minutes"] > 60
    ) {
      throw new Error(`${name} must use a bounded cloud-hosted runner`);
    }
    const commands = commandFor(job);
    for (const required of [
      "npm install --global npm@11.15.0",
      "node --version",
      "npm --version",
      "npm ci",
    ]) {
      if (!commands.includes(required)) {
        throw new Error(`${name} is missing required command: ${required}`);
      }
    }
  }
  if (!dependencyList(candidate).includes("quality")) {
    throw new Error("candidate must depend on quality");
  }
  if (!dependencyList(localAcceptance).includes("candidate")) {
    throw new Error("local acceptance must depend on candidate");
  }
  const qualityCommands = commandFor(quality);
  for (const required of [
    "npm run verify:version-sync -- --surfaces-only",
    "npm run typecheck",
    "npm run lint",
    "npm test",
  ]) {
    if (!qualityCommands.includes(required)) {
      throw new Error(`quality is missing required command: ${required}`);
    }
  }
  if (
    !commandFor(candidate).includes(
      "npm run verify:release-candidate -- --build",
    ) ||
    !commandFor(localAcceptance).includes("npm run verify:phase4") ||
    !commandFor(localAcceptance).includes(
      "npm run verify:release-candidate -- --finalize",
    )
  ) {
    throw new Error("candidate build or local acceptance command is missing");
  }

  const candidateUpload = candidate.steps.find((step) =>
    step.uses?.startsWith("actions/upload-artifact@"),
  );
  const candidateDownload = localAcceptance.steps.find((step) =>
    step.uses?.startsWith("actions/download-artifact@"),
  );
  const verifiedUpload = localAcceptance.steps.find((step) =>
    step.uses?.startsWith("actions/upload-artifact@"),
  );
  if (
    candidateUpload?.with?.name !== candidateDownload?.with?.name ||
    !candidateUpload?.with?.path ||
    candidateUpload.with["retention-days"] !== 7 ||
    !verifiedUpload?.with?.name?.includes("verified-release-candidate") ||
    verifiedUpload.with["retention-days"] !== 7
  ) {
    throw new Error("CI candidate artifact continuity or retention is invalid");
  }
  return workflow;
}

function candidateArtifactMap(record) {
  return new Map(
    (record.artifacts ?? []).map((artifact) => [
      artifact.path,
      artifact.sha256,
    ]),
  );
}

export function validateCandidateRecord(record) {
  if (
    record?.schemaVersion !== 1 ||
    typeof record.artifactName !== "string" ||
    record.artifactName.length === 0
  ) {
    throw new Error("release candidate record is invalid");
  }
  if (!commitPattern.test(record.source?.commit ?? "")) {
    throw new Error("release candidate source commit is invalid");
  }
  if (
    record.package?.name !== "afferent" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(
      record.package?.version ?? "",
    ) ||
    record.source?.tag !== `v${record.package.version}`
  ) {
    throw new Error("release candidate package tag or version is invalid");
  }
  if (
    !record.package.tarball?.startsWith("package/") ||
    !sha256Pattern.test(record.package.sha256 ?? "")
  ) {
    throw new Error("release candidate package checksum is invalid");
  }
  const artifacts = candidateArtifactMap(record);
  if (artifacts.get(record.package.tarball) !== record.package.sha256) {
    throw new Error("release candidate tarball checksum continuity failed");
  }
  for (const [path, digest] of artifacts) {
    if (
      path.startsWith("/") ||
      path.includes("../") ||
      !sha256Pattern.test(digest)
    ) {
      throw new Error(`release candidate artifact digest is invalid: ${path}`);
    }
  }
  if (
    record.evidence?.checksums !== "checksums.sha256" ||
    typeof record.evidence?.phase4 !== "string"
  ) {
    throw new Error("release candidate evidence paths are invalid");
  }
  return record;
}

function safeCandidateDirectory(path) {
  const candidate = resolve(path);
  const root = resolve(repositoryRoot);
  if (
    candidate === root ||
    candidate === resolve("/") ||
    candidate === resolve(tmpdir()) ||
    !basename(candidate).includes("release-candidate")
  ) {
    throw new Error(
      "release candidate output must be a dedicated release-candidate directory",
    );
  }
  return candidate;
}

async function copyPayload(source, target) {
  if (!(await exists(source))) {
    throw new Error(`release candidate source is missing: ${source}`);
  }
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

async function artifactEntries(candidateRoot) {
  const ignored = new Set(["candidate.json", "checksums.sha256"]);
  const files = await filesUnder(candidateRoot);
  return Promise.all(
    files
      .map((path) => relative(candidateRoot, path).split(sep).join("/"))
      .filter((path) => !ignored.has(path))
      .map(async (path) => ({
        path,
        sha256: await sha256File(join(candidateRoot, path)),
      })),
  );
}

async function writeCandidateMetadata(candidateRoot, record) {
  await writeFile(join(candidateRoot, "candidate.json"), json(record));
  const files = await filesUnder(candidateRoot);
  const paths = files
    .map((path) => relative(candidateRoot, path).split(sep).join("/"))
    .filter((path) => path !== "checksums.sha256")
    .sort();
  const checksums = await Promise.all(
    paths.map(
      async (path) => `${await sha256File(join(candidateRoot, path))}  ${path}`,
    ),
  );
  await writeFile(
    join(candidateRoot, "checksums.sha256"),
    `${checksums.join("\n")}\n`,
  );
}

async function testPackedTarball(tarball) {
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "afferent-candidate-consumer-"),
  );
  try {
    const consumer = join(temporaryRoot, "consumer");
    await cp(join(repositoryRoot, "fixtures/packed-vite-convex"), consumer, {
      recursive: true,
    });
    await run(process.execPath, [
      "scripts/test-packed-consumer.mjs",
      "--consumer-dir",
      consumer,
      "--tarball",
      tarball,
      "--json",
    ]);
    await run("node_modules/.bin/publint", ["run", "--strict", tarball]);
    await run("node_modules/.bin/attw", [
      "--profile",
      "esm-only",
      "--quiet",
      tarball,
    ]);
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

async function findPhase4Evidence(demoRoot) {
  const files = await filesUnder(join(demoRoot, ".phase4-evidence"));
  const candidates = files
    .filter((path) => path.endsWith(`${sep}phase4-e2e.json`))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) {
    throw new Error("Phase 4 completion evidence is missing");
  }
  return {
    path: latest,
    evidence: JSON.parse(await readFile(latest, "utf8")),
  };
}

async function releaseCandidateRecord(candidateRoot, phase4) {
  const identity = await loadReleaseIdentity(repositoryRoot);
  const commitResult = await run("git", ["rev-parse", "HEAD"], {
    capture: true,
  });
  const commit = commitResult.stdout.trim();
  const artifacts = await artifactEntries(candidateRoot);
  const tarballPath = artifacts
    .map((artifact) => artifact.path)
    .find((path) => /^package\/afferent-.+\.tgz$/u.test(path));
  if (!tarballPath) throw new Error("release candidate tarball is missing");
  return validateCandidateRecord({
    schemaVersion: 1,
    artifactName: `afferent-release-candidate-${identity.version}`,
    source: {
      commit,
      repository: canonicalRepository,
      tag: identity.sourceTag,
    },
    package: {
      name: identity.packageName,
      version: identity.version,
      tarball: tarballPath,
      sha256: await sha256File(join(candidateRoot, tarballPath)),
    },
    artifacts,
    evidence: {
      checksums: "checksums.sha256",
      phase4: "evidence/phase4.json",
      phase4Status: phase4.status,
    },
  });
}

export async function buildReleaseCandidate(outputDirectory) {
  const candidateRoot = safeCandidateDirectory(outputDirectory);
  await rm(candidateRoot, { force: true, recursive: true });
  await mkdir(candidateRoot, { recursive: true });

  const ciSource = await readFile(
    join(repositoryRoot, ".github/workflows/ci.yml"),
    "utf8",
  );
  validateCiWorkflow(ciSource);
  await run("npm", ["run", "verify:version-sync", "--", "--surfaces-only"]);
  await run("npm", ["run", "verify:demo:artifacts"]);
  await run("npm", ["run", "docs:build"]);

  const demoRoot = join(repositoryRoot, ".demo-candidate");
  const demoProvenance = JSON.parse(
    await readFile(join(demoRoot, ".afferent-provenance.json"), "utf8"),
  );
  const demoTarball = await realpath(
    join(demoRoot, demoProvenance.artifacts.package.file),
  );
  await testPackedTarball(demoTarball);

  const identity = await loadReleaseIdentity(repositoryRoot);
  const tarballTarget = join(candidateRoot, "package", basename(demoTarball));
  await Promise.all([
    copyPayload(demoTarball, tarballTarget),
    copyPayload(
      join(repositoryRoot, "registry"),
      join(candidateRoot, "registry"),
    ),
    copyPayload(
      join(repositoryRoot, "docs/.vitepress/dist"),
      join(candidateRoot, "docs"),
    ),
    copyPayload(join(demoRoot, "dist"), join(candidateRoot, "demo/dist")),
    copyPayload(
      join(demoRoot, ".afferent-provenance.json"),
      join(candidateRoot, "demo/provenance.json"),
    ),
  ]);
  const releaseManifest = await createReleaseManifest({
    repositoryRoot,
    tarball: tarballTarget,
  });
  await writeFile(
    join(candidateRoot, "release-manifest.json"),
    json(releaseManifest),
  );
  const pendingPhase4 = {
    schemaVersion: 1,
    status: "pending-local-acceptance",
    artifactDigest: await sha256File(tarballTarget),
    sourceCommit: releaseManifest.source.commit,
  };
  await mkdir(join(candidateRoot, "evidence"), { recursive: true });
  await Promise.all([
    writeFile(
      join(candidateRoot, "evidence/build.json"),
      json({
        schemaVersion: 1,
        status: "complete",
        sourceCommit: releaseManifest.source.commit,
        package: `${identity.packageName}@${identity.version}`,
        gates: [
          "version-surfaces",
          "packed-consumer",
          "publint",
          "attw",
          "documentation",
          "demo-artifacts",
        ],
      }),
    ),
    writeFile(join(candidateRoot, "evidence/phase4.json"), json(pendingPhase4)),
  ]);
  const record = await releaseCandidateRecord(candidateRoot, pendingPhase4);
  await writeCandidateMetadata(candidateRoot, record);
  await validateCandidateDirectory(candidateRoot);
  return { candidateRoot, record };
}

export async function finalizeReleaseCandidate(
  candidateDirectory,
  demoCandidateDirectory,
) {
  const candidateRoot = safeCandidateDirectory(candidateDirectory);
  const before = await validateCandidateDirectory(candidateRoot);
  const demoRoot = resolve(demoCandidateDirectory);
  const { evidence } = await findPhase4Evidence(demoRoot);
  if (
    evidence.status !== "complete" ||
    evidence.backendKind !== "local-real-convex" ||
    evidence.artifactDigest !== before.package.sha256 ||
    evidence.sourceCommit !== before.source.commit
  ) {
    throw new Error(
      "Phase 4 evidence does not match the immutable release candidate",
    );
  }
  await writeFile(join(candidateRoot, "evidence/phase4.json"), json(evidence));
  const record = await releaseCandidateRecord(candidateRoot, evidence);
  await writeCandidateMetadata(candidateRoot, record);
  await validateCandidateDirectory(candidateRoot, { requireFinal: true });
  return { candidateRoot, record };
}

function parseChecksums(source) {
  const checksums = new Map();
  for (const line of source.trim().split("\n")) {
    const match = /^(?<digest>[a-f0-9]{64}) {2}(?<path>.+)$/u.exec(line);
    if (!match) throw new Error(`invalid checksum line: ${line}`);
    checksums.set(match.groups.path, match.groups.digest);
  }
  return checksums;
}

export async function validateCandidateDirectory(
  candidateDirectory,
  options = {},
) {
  const candidateRoot = safeCandidateDirectory(candidateDirectory);
  const record = validateCandidateRecord(
    JSON.parse(await readFile(join(candidateRoot, "candidate.json"), "utf8")),
  );
  const checksums = parseChecksums(
    await readFile(join(candidateRoot, "checksums.sha256"), "utf8"),
  );
  const files = await filesUnder(candidateRoot);
  const actualPaths = files
    .map((path) => relative(candidateRoot, path).split(sep).join("/"))
    .filter((path) => path !== "checksums.sha256")
    .sort();
  if (
    actualPaths.length !== checksums.size ||
    actualPaths.some((path) => !checksums.has(path))
  ) {
    throw new Error("release candidate checksum inventory is incomplete");
  }
  for (const path of actualPaths) {
    if ((await sha256File(join(candidateRoot, path))) !== checksums.get(path)) {
      throw new Error(`release candidate checksum mismatch: ${path}`);
    }
  }
  const manifest = validateReleaseManifest(
    JSON.parse(
      await readFile(join(candidateRoot, "release-manifest.json"), "utf8"),
    ),
  );
  if (
    manifest.package.sha256 !== record.package.sha256 ||
    manifest.package.version !== record.package.version ||
    manifest.source.commit !== record.source.commit
  ) {
    throw new Error("release manifest does not match candidate record");
  }
  const phase4 = JSON.parse(
    await readFile(join(candidateRoot, record.evidence.phase4), "utf8"),
  );
  if (
    phase4.artifactDigest !== record.package.sha256 ||
    phase4.sourceCommit !== record.source.commit
  ) {
    throw new Error("candidate Phase 4 evidence digest does not match");
  }
  if (
    options.requireFinal &&
    (phase4.status !== "complete" ||
      phase4.backendKind !== "local-real-convex" ||
      record.evidence.phase4Status !== "complete")
  ) {
    throw new Error(
      "release candidate has not passed local Phase 4 acceptance",
    );
  }
  return record;
}

export async function validateRepositoryWorkflows() {
  const ciSource = await readFile(
    join(repositoryRoot, ".github/workflows/ci.yml"),
    "utf8",
  );
  return { ci: validateCiWorkflow(ciSource) };
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  if (process.argv.includes("--workflow")) {
    await validateRepositoryWorkflows();
    process.stdout.write(
      `${JSON.stringify({ status: "verified", workflow: "ci.yml" })}\n`,
    );
    return;
  }
  if (process.argv.includes("--build")) {
    const output = option("--output");
    if (!output) throw new Error("--build requires --output");
    const result = await buildReleaseCandidate(output);
    process.stdout.write(
      `${JSON.stringify({
        status: "built",
        candidate: result.candidateRoot,
        package: result.record.package,
      })}\n`,
    );
    return;
  }
  if (process.argv.includes("--finalize")) {
    const candidate = option("--candidate-dir");
    const demo = option("--phase4-candidate");
    if (!candidate || !demo) {
      throw new Error(
        "--finalize requires --candidate-dir and --phase4-candidate",
      );
    }
    const result = await finalizeReleaseCandidate(candidate, demo);
    process.stdout.write(
      `${JSON.stringify({
        status: "verified",
        candidate: result.candidateRoot,
        package: result.record.package,
      })}\n`,
    );
    return;
  }
  if (process.argv.includes("--local")) {
    const temporaryRoot = await mkdtemp(
      join(tmpdir(), "afferent-release-candidate-"),
    );
    const candidateRoot = join(temporaryRoot, "release-candidate");
    try {
      await buildReleaseCandidate(candidateRoot);
      await run("npm", ["run", "verify:phase4"]);
      const result = await finalizeReleaseCandidate(
        candidateRoot,
        join(repositoryRoot, ".demo-candidate"),
      );
      process.stdout.write(
        `${JSON.stringify({
          status: "verified",
          candidate: "<temporary>/release-candidate",
          package: result.record.package,
        })}\n`,
      );
    } finally {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
    return;
  }
  throw new Error(
    "choose --local, --workflow, --build --output, or --finalize",
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
