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
import { validateRuntimeFloor } from "./verify-package-release.mjs";

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
const canonicalReleaseActions = new Set([
  ...canonicalCiActions,
  "actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9",
  "actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128",
  "changesets/action@a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d",
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

function environmentName(job) {
  return typeof job?.environment === "string"
    ? job.environment
    : job?.environment?.name;
}

function hasDispatchGuard(job) {
  const condition = String(job?.if ?? "");
  return (
    condition.includes("github.event_name == 'workflow_dispatch'") &&
    condition.includes("inputs.allow_publish == true")
  );
}

function actionStep(job, action) {
  return (job?.steps ?? []).find((step) => step.uses?.startsWith(`${action}@`));
}

export function validateReleaseWorkflow(source) {
  assertNoForbiddenWorkflowSurface(source);
  const workflow = parseWorkflow(source, "release.yml");
  const githubTokenExpression = "$" + "{{ github.token }}";
  const ciRunIdExpression = "$" + "{{ inputs.ci_run_id }}";
  const sourceCommitExpression = "$" + "{{ inputs.source_commit }}";
  if (
    workflow.permissions?.contents !== "read" ||
    Object.keys(workflow.permissions).length !== 1
  ) {
    throw new Error(
      "release workflow top-level permissions must be contents: read",
    );
  }
  if (
    workflow.on?.pull_request ||
    !workflow.on?.push?.branches?.includes("main") ||
    workflow.on?.workflow_dispatch?.inputs?.allow_publish?.default !== false
  ) {
    throw new Error(
      "release workflow must separate main versioning from manual publication",
    );
  }
  if (
    workflow.concurrency?.["cancel-in-progress"] !== false ||
    typeof workflow.concurrency?.group !== "string"
  ) {
    throw new Error("release workflow must serialize without canceling");
  }
  validatePinnedActions(workflow, canonicalReleaseActions);

  const version = workflow.jobs["version-pr"];
  const readiness = workflow.jobs["release-readiness"];
  const publish = workflow.jobs["publish-npm"];
  const verifyPublic = workflow.jobs["verify-public-npm"];
  const prepareStatic = workflow.jobs["prepare-static"];
  const publishStatic = workflow.jobs["publish-static"];
  if (
    !version ||
    !readiness ||
    !publish ||
    !verifyPublic ||
    !prepareStatic ||
    !publishStatic
  ) {
    throw new Error("release workflow is missing a dependency-ordered job");
  }
  for (const [name, job] of Object.entries({
    "version-pr": version,
    "release-readiness": readiness,
    "publish-npm": publish,
    "verify-public-npm": verifyPublic,
    "prepare-static": prepareStatic,
    "publish-static": publishStatic,
  })) {
    if (
      job["runs-on"] !== "ubuntu-latest" ||
      !Number.isSafeInteger(job["timeout-minutes"]) ||
      job["timeout-minutes"] > 45
    ) {
      throw new Error(`${name} must use a bounded cloud-hosted runner`);
    }
  }

  const changesets = actionStep(version, "changesets/action");
  if (
    !String(version.if).includes("github.event_name == 'push'") ||
    changesets?.with?.version !== "npm run version:packages" ||
    changesets.with.publish !== undefined ||
    changesets.with.createGithubReleases !== false
  ) {
    throw new Error(
      "Changesets must remain version-PR-only and cannot publish",
    );
  }
  if (
    version.permissions?.contents !== "write" ||
    version.permissions?.["pull-requests"] !== "write" ||
    version.permissions?.["id-token"] !== undefined
  ) {
    throw new Error("version PR permissions are invalid");
  }

  for (const job of [
    readiness,
    publish,
    verifyPublic,
    prepareStatic,
    publishStatic,
  ]) {
    if (!hasDispatchGuard(job)) {
      throw new Error(
        "publication jobs require the manual allow-publish guard",
      );
    }
  }
  if (!dependencyList(publish).includes("release-readiness")) {
    throw new Error("npm publication must depend on release readiness");
  }
  if (!dependencyList(verifyPublic).includes("publish-npm")) {
    throw new Error("public npm verification must depend on npm publication");
  }
  if (!dependencyList(prepareStatic).includes("verify-public-npm")) {
    throw new Error(
      "static publication preparation must depend on public npm verification",
    );
  }
  if (
    !dependencyList(publishStatic).includes("verify-public-npm") ||
    !dependencyList(publishStatic).includes("prepare-static")
  ) {
    throw new Error(
      "static publication dependency must include verified public npm",
    );
  }

  if (
    environmentName(publish) !== "npm-production" ||
    publish.permissions?.contents !== "read" ||
    publish.permissions?.["id-token"] !== "write"
  ) {
    throw new Error(
      "npm publication requires the protected environment and OIDC id-token",
    );
  }
  if (
    environmentName(publishStatic) !== "github-pages" ||
    publishStatic.permissions?.pages !== "write" ||
    publishStatic.permissions?.["id-token"] !== "write"
  ) {
    throw new Error(
      "static publication permissions or environment are invalid",
    );
  }
  for (const [name, job] of Object.entries({
    "publish-npm": publish,
    "verify-public-npm": verifyPublic,
  })) {
    if (
      actionStep(job, "actions/setup-node")?.with?.["registry-url"] !==
      undefined
    ) {
      throw new Error(
        `${name} must not configure token-oriented npm registry authentication`,
      );
    }
  }
  const readinessSteps = readiness.steps ?? [];
  const runIdentityIndex = readinessSteps.findIndex((step) =>
    String(step.run ?? "").includes("--ci-run-metadata"),
  );
  const crossRunDownloadIndex = readinessSteps.findIndex((step) =>
    String(step.uses ?? "").startsWith("actions/download-artifact@"),
  );
  const runIdentityStep = readinessSteps[runIdentityIndex];
  const runIdentityCommand = String(runIdentityStep?.run ?? "");
  if (
    runIdentityIndex === -1 ||
    crossRunDownloadIndex === -1 ||
    runIdentityIndex >= crossRunDownloadIndex ||
    runIdentityStep.if !== undefined ||
    runIdentityStep?.env?.GH_TOKEN !== githubTokenExpression ||
    runIdentityStep?.env?.AFFERENT_CI_RUN_ID !== ciRunIdExpression ||
    runIdentityStep?.env?.AFFERENT_SOURCE_COMMIT !== sourceCommitExpression ||
    !runIdentityCommand.includes(
      'gh api --method GET "repos/$GITHUB_REPOSITORY/actions/runs/$AFFERENT_CI_RUN_ID" > "$RUNNER_TEMP/ci-run.json"',
    ) ||
    !runIdentityCommand.includes(
      'npm run verify:release-candidate -- --ci-run-metadata "$RUNNER_TEMP/ci-run.json"',
    ) ||
    !runIdentityCommand.includes('"$AFFERENT_CI_RUN_ID" =~ ^[0-9]+$')
  ) {
    throw new Error(
      "release readiness must bind CI run identity to candidate provenance before download",
    );
  }
  const publishCommands = commandFor(publish);
  const exactPublish =
    'npm publish "$RUNNER_TEMP/release-candidate/package/afferent-0.1.0.tgz" --access public --provenance';
  if (
    !publishCommands.includes(exactPublish) ||
    /npm\s+(?:run\s+)?(?:build|pack)|changeset\s+publish/iu.test(
      publishCommands,
    )
  ) {
    throw new Error(
      "npm publication must consume the tested tarball without rebuilding",
    );
  }
  if (
    !commandFor(readiness).includes(
      "npm run verify:release-candidate -- --external-config",
    ) ||
    !commandFor(readiness).includes(
      "npm run verify:release-candidate -- --release-preflight",
    ) ||
    !commandFor(publish).includes(
      "npm run verify:release-candidate -- --publish-preflight",
    ) ||
    !commandFor(verifyPublic).includes(
      "npm run verify:release-candidate -- --published-version 0.1.0",
    ) ||
    !commandFor(verifyPublic).includes("npm audit signatures")
  ) {
    throw new Error("release verification commands are incomplete");
  }
  if (
    !actionStep(prepareStatic, "actions/upload-pages-artifact") ||
    !actionStep(publishStatic, "actions/deploy-pages")
  ) {
    throw new Error("registry and documentation publication is incomplete");
  }
  return workflow;
}

export function validateArtifactActionCompatibility(ciSource, releaseSource) {
  const ci = validateCiWorkflow(ciSource);
  const release = validateReleaseWorkflow(releaseSource);
  const githubShaExpression = "$" + "{{ github.sha }}";
  const sourceCommitExpression = "$" + "{{ inputs.source_commit }}";
  const ciUpload = actionStep(
    ci.jobs["local-acceptance"],
    "actions/upload-artifact",
  );
  const crossRunDownload = actionStep(
    release.jobs["release-readiness"],
    "actions/download-artifact",
  );
  if (
    ciUpload?.uses !==
      "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a" ||
    crossRunDownload?.uses !==
      "actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c" ||
    ciUpload.with.name !==
      `afferent-verified-release-candidate-${githubShaExpression}` ||
    crossRunDownload.with.name !==
      `afferent-verified-release-candidate-${sourceCommitExpression}` ||
    crossRunDownload.with.repository !== canonicalRepository ||
    !crossRunDownload.with["run-id"]
  ) {
    throw new Error(
      "upload-artifact v7 to download-artifact v8 continuity is invalid",
    );
  }
  const releaseUpload = actionStep(
    release.jobs["release-readiness"],
    "actions/upload-artifact",
  );
  for (const jobName of [
    "publish-npm",
    "verify-public-npm",
    "prepare-static",
  ]) {
    const download = actionStep(
      release.jobs[jobName],
      "actions/download-artifact",
    );
    if (
      releaseUpload?.with?.name !== download?.with?.name ||
      releaseUpload?.with?.path !== download?.with?.path ||
      !download.with.name.includes("inputs.source_commit")
    ) {
      throw new Error(
        `release artifact checksum continuity failed in ${jobName}`,
      );
    }
  }
  return { upload: ciUpload.uses, download: crossRunDownload.uses };
}

export function validateExternalConfiguration(configuration) {
  const expected = {
    githubActions: true,
    repository: canonicalRepository,
    workflowRef:
      "bradywatkinson/afferent/.github/workflows/release.yml@refs/heads/main",
    runnerEnvironment: "github-hosted",
    releaseOwner: canonicalRepository,
    trustedPublisher:
      "bradywatkinson/afferent:release.yml:npm-production:allow-publish",
    staticPublication: "github-pages",
    approvedTag: "v0.1.0",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (configuration?.[key] !== value) {
      throw new Error(
        `external release configuration is incomplete: ${key} must be ${value}`,
      );
    }
  }
  return configuration;
}

export function validateCiRunMetadata(metadata, expected) {
  const runId = String(expected?.runId ?? "");
  const sourceCommit = String(expected?.sourceCommit ?? "");
  if (!/^\d+$/u.test(runId) || !commitPattern.test(sourceCommit)) {
    throw new Error("CI run metadata expectations are invalid");
  }
  if (
    String(metadata?.id ?? "") !== runId ||
    metadata?.path !== ".github/workflows/ci.yml" ||
    metadata?.event !== "push" ||
    metadata?.status !== "completed" ||
    metadata?.conclusion !== "success" ||
    metadata?.head_branch !== "main" ||
    metadata?.head_sha !== sourceCommit ||
    metadata?.repository?.full_name !== canonicalRepository ||
    metadata?.head_repository?.full_name !== canonicalRepository
  ) {
    throw new Error(
      "CI run metadata does not bind the successful main push to candidate provenance",
    );
  }
  return metadata;
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
    copyPayload(join(repositoryRoot, "dist/docs"), join(candidateRoot, "docs")),
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

function externalConfigurationFromEnvironment() {
  return {
    githubActions: process.env.GITHUB_ACTIONS === "true",
    repository: process.env.GITHUB_REPOSITORY,
    workflowRef: process.env.GITHUB_WORKFLOW_REF,
    runnerEnvironment: process.env.RUNNER_ENVIRONMENT,
    releaseOwner: process.env.AFFERENT_RELEASE_OWNER,
    trustedPublisher: process.env.AFFERENT_NPM_TRUSTED_PUBLISHER,
    staticPublication: process.env.AFFERENT_STATIC_PUBLICATION,
    approvedTag: process.env.AFFERENT_RELEASE_APPROVED_TAG,
  };
}

async function npmVersion() {
  const result = await run("npm", ["--version"], { capture: true });
  return result.stdout.trim();
}

export async function validateReleasePreflight(candidateDirectory) {
  validateExternalConfiguration(externalConfigurationFromEnvironment());
  if (process.env.AFFERENT_ALLOW_PUBLISH !== "true") {
    throw new Error("manual publication approval is missing");
  }
  const sourceCommit = process.env.AFFERENT_SOURCE_COMMIT ?? "";
  const sourceTag = process.env.AFFERENT_SOURCE_TAG ?? "";
  if (
    !commitPattern.test(sourceCommit) ||
    !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(sourceTag)
  ) {
    throw new Error("release source commit or tag is invalid");
  }
  const record = await validateCandidateDirectory(candidateDirectory, {
    requireFinal: true,
  });
  if (
    record.source.commit !== sourceCommit ||
    record.source.tag !== sourceTag ||
    record.source.repository !== canonicalRepository
  ) {
    throw new Error("release source does not match the verified candidate");
  }
  const [headResult, tagResult, statusResult] = await Promise.all([
    run("git", ["rev-parse", "HEAD"], { capture: true }),
    run("git", ["rev-parse", `refs/tags/${sourceTag}`], { capture: true }),
    run("git", ["status", "--porcelain", "--untracked-files=no"], {
      capture: true,
    }),
  ]);
  if (
    headResult.stdout.trim() !== sourceCommit ||
    tagResult.stdout.trim() !== sourceCommit ||
    statusResult.stdout.trim() !== ""
  ) {
    throw new Error("release tag, commit, or clean checkout gate failed");
  }
  validateRuntimeFloor({
    node: process.versions.node,
    npm: await npmVersion(),
  });
  return record;
}

export async function validatePublishPreflight(candidateDirectory) {
  const record = await validateReleasePreflight(candidateDirectory);
  if (
    process.env.AFFERENT_RELEASE_ENVIRONMENT !== "npm-production" ||
    !process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  ) {
    throw new Error(
      "protected npm publication environment or OIDC request URL is missing",
    );
  }
  return record;
}

function repositoryFromMetadata(repository) {
  const url = typeof repository === "string" ? repository : repository?.url;
  const match = url?.match(
    /github\.com[/:](?<name>[^/]+\/[^/#]+?)(?:\.git)?$/u,
  );
  return match?.groups?.name;
}

export async function verifyPublishedNpm(candidateDirectory, version) {
  const record = await validateCandidateDirectory(candidateDirectory, {
    requireFinal: true,
  });
  if (version !== record.package.version || version !== "0.1.0") {
    throw new Error("published npm version does not match the candidate");
  }
  const metadataResult = await run(
    "npm",
    [
      "view",
      `afferent@${version}`,
      "name",
      "version",
      "repository",
      "license",
      "--json",
    ],
    { capture: true },
  );
  const metadata = JSON.parse(metadataResult.stdout);
  if (
    metadata.name !== record.package.name ||
    metadata.version !== version ||
    metadata.license !== "Apache-2.0" ||
    repositoryFromMetadata(metadata.repository) !== canonicalRepository
  ) {
    throw new Error("public npm metadata does not match the release candidate");
  }

  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "afferent-published-package-"),
  );
  try {
    const packedResult = await run(
      "npm",
      [
        "pack",
        `afferent@${version}`,
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        temporaryRoot,
      ],
      { capture: true },
    );
    const start = packedResult.stdout.indexOf("[");
    if (start === -1) {
      throw new Error("npm pack did not return published artifact metadata");
    }
    const [packed] = JSON.parse(packedResult.stdout.slice(start));
    const publicTarball = join(temporaryRoot, packed.filename);
    if ((await sha256File(publicTarball)) !== record.package.sha256) {
      throw new Error(
        "published npm tarball checksum does not match the tested artifact",
      );
    }
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
  return record;
}

export async function preparePagesSite(candidateDirectory, outputDirectory) {
  const record = await validateCandidateDirectory(candidateDirectory, {
    requireFinal: true,
  });
  const outputRoot = resolve(outputDirectory);
  if (
    outputRoot === resolve("/") ||
    outputRoot === resolve(tmpdir()) ||
    !basename(outputRoot).includes("pages-site")
  ) {
    throw new Error("Pages output must be a dedicated pages-site directory");
  }
  await rm(outputRoot, { force: true, recursive: true });
  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    copyPayload(join(candidateDirectory, "docs"), outputRoot),
    copyPayload(join(candidateDirectory, "registry/r"), join(outputRoot, "r")),
    copyPayload(
      join(candidateDirectory, "registry/registry.json"),
      join(outputRoot, "registry.json"),
    ),
    copyPayload(
      join(candidateDirectory, "release-manifest.json"),
      join(outputRoot, "release-manifest.json"),
    ),
  ]);
  await writeFile(
    join(outputRoot, "release.json"),
    json({
      schemaVersion: 1,
      package: record.package,
      source: record.source,
    }),
  );
  return { outputRoot, record };
}

export async function validateRepositoryWorkflows() {
  const [ciSource, releaseSource] = await Promise.all([
    readFile(join(repositoryRoot, ".github/workflows/ci.yml"), "utf8"),
    readFile(join(repositoryRoot, ".github/workflows/release.yml"), "utf8"),
  ]);
  const ci = validateCiWorkflow(ciSource);
  const release = validateReleaseWorkflow(releaseSource);
  validateArtifactActionCompatibility(ciSource, releaseSource);
  return { ci, release };
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  if (process.argv.includes("--workflow")) {
    await validateRepositoryWorkflows();
    process.stdout.write(
      `${JSON.stringify({
        status: "verified",
        workflows: ["ci.yml", "release.yml"],
      })}\n`,
    );
    return;
  }
  if (process.argv.includes("--external-config")) {
    validateExternalConfiguration(externalConfigurationFromEnvironment());
    process.stdout.write(
      `${JSON.stringify({
        status: "verified",
        externalConfiguration: "confirmed",
      })}\n`,
    );
    return;
  }
  if (process.argv.includes("--ci-run-metadata")) {
    const metadataPath = option("--ci-run-metadata");
    if (!metadataPath) {
      throw new Error("--ci-run-metadata requires a JSON file path");
    }
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    validateCiRunMetadata(metadata, {
      runId: process.env.AFFERENT_CI_RUN_ID,
      sourceCommit: process.env.AFFERENT_SOURCE_COMMIT,
    });
    process.stdout.write(
      `${JSON.stringify({
        status: "verified",
        ciRun: {
          id: metadata.id,
          workflow: metadata.path,
          commit: metadata.head_sha,
        },
      })}\n`,
    );
    return;
  }
  if (process.argv.includes("--publish-preflight")) {
    const candidate = option("--candidate-dir");
    if (!candidate) {
      throw new Error("--publish-preflight requires --candidate-dir");
    }
    const record = await validatePublishPreflight(candidate);
    process.stdout.write(
      `${JSON.stringify({
        status: "verified",
        package: record.package,
        source: record.source,
      })}\n`,
    );
    return;
  }
  if (process.argv.includes("--release-preflight")) {
    const candidate = option("--candidate-dir");
    if (!candidate) {
      throw new Error("--release-preflight requires --candidate-dir");
    }
    const record = await validateReleasePreflight(candidate);
    process.stdout.write(
      `${JSON.stringify({
        status: "verified",
        package: record.package,
        source: record.source,
      })}\n`,
    );
    return;
  }
  const publishedVersion = option("--published-version");
  if (publishedVersion) {
    const candidate = option("--candidate-dir");
    if (!candidate) {
      throw new Error("--published-version requires --candidate-dir");
    }
    const record = await verifyPublishedNpm(candidate, publishedVersion);
    process.stdout.write(
      `${JSON.stringify({
        status: "verified",
        published: record.package,
      })}\n`,
    );
    return;
  }
  if (process.argv.includes("--prepare-pages")) {
    const candidate = option("--candidate-dir");
    const output = option("--output");
    if (!candidate || !output) {
      throw new Error("--prepare-pages requires --candidate-dir and --output");
    }
    const result = await preparePagesSite(candidate, output);
    process.stdout.write(
      `${JSON.stringify({
        status: "prepared",
        output: result.outputRoot,
        package: result.record.package,
      })}\n`,
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
