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
  digestRegistry,
  loadReleaseIdentity,
  normalizeRepositoryName,
  repositoryFromMetadata,
  validateReleaseManifest,
} from "./generate-release-manifest.mjs";
import { plannedReleasePolicy } from "./release-policy.mjs";
import { validateRuntimeFloor } from "./verify-package-release.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sha256Pattern = /^[a-f0-9]{64}$/u;
const commitPattern = /^[a-f0-9]{40}$/u;
const actionPinPattern = /^[^@\s]+@[a-f0-9]{40}$/u;
const declaredIdentity = await loadReleaseIdentity(repositoryRoot);
const declaredRepository = declaredIdentity.repository;
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
  /NODE_AUTH_TOKEN|NPM_TOKEN|AFFERENT_NPM_|npm-production|npm\s+(?:stage\s+)?publish\b|npm\s+trust\b|CONVEX_DEPLOY_KEY|CONVEX_DEPLOYMENT|VERCEL_(?:ORG|PROJECT)_ID|(?:^|\s)vercel(?:\s|$)|convex\s+deploy|remote[\s_-]*playwright|test:e2e:phase4:remote|--remote|VITE_CONVEX_URL/imu;

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
      'npm install --global --prefix "$RUNNER_TEMP/afferent-npm" npm@11.15.0',
      'echo "$RUNNER_TEMP/afferent-npm/bin" >> "$GITHUB_PATH"',
      'export PATH="$RUNNER_TEMP/afferent-npm/bin:$PATH"',
      "node --version",
      "npm --version",
      'test "$(npm --version)" = "11.15.0"',
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
    "npm run build",
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
      "npx --no-install playwright install --with-deps chromium",
    ) ||
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
    condition.includes("inputs.allow_release == true")
  );
}

function actionStep(job, action) {
  return (job?.steps ?? []).find((step) => step.uses?.startsWith(`${action}@`));
}

export function validateReleaseWorkflow(source) {
  assertNoForbiddenWorkflowSurface(source);
  const workflow = parseWorkflow(source, plannedReleasePolicy.workflow);
  const githubTokenExpression = "$" + "{{ github.token }}";
  const ciRunIdExpression = "$" + "{{ inputs.ci_run_id }}";
  const pageUrlExpression = "$" + "{{ steps.deployment.outputs.page_url }}";
  const sourceCommitExpression = "$" + "{{ inputs.source_commit }}";
  if (plannedReleasePolicy.packagePublication !== "none") {
    throw new Error("v1 release policy must forbid package publication");
  }
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
    !workflow.on?.push?.branches?.includes(plannedReleasePolicy.branch) ||
    workflow.on?.workflow_dispatch?.inputs?.allow_release?.default !== false ||
    workflow.on?.workflow_dispatch?.inputs?.allow_publish !== undefined
  ) {
    throw new Error(
      "release workflow must separate main versioning from manual source/static release",
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
  const prepareStatic = workflow.jobs["prepare-static"];
  const publishStatic = workflow.jobs["publish-static"];
  const verifyStatic = workflow.jobs["verify-static"];
  if (
    !version ||
    !readiness ||
    !prepareStatic ||
    !publishStatic ||
    !verifyStatic
  ) {
    throw new Error("release workflow is missing a dependency-ordered job");
  }
  if (
    workflow.jobs["publish-npm"] !== undefined ||
    workflow.jobs["verify-public-npm"] !== undefined
  ) {
    throw new Error("npm publication jobs are forbidden in the v1 workflow");
  }
  for (const [name, job] of Object.entries({
    "version-pr": version,
    "release-readiness": readiness,
    "prepare-static": prepareStatic,
    "publish-static": publishStatic,
    "verify-static": verifyStatic,
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

  for (const job of [readiness, prepareStatic, publishStatic, verifyStatic]) {
    if (!hasDispatchGuard(job)) {
      throw new Error("release jobs require the manual allow-release guard");
    }
  }
  const staticCommands = {
    "prepare-static": new Set([
      "npm ci",
      'npm run verify:release-candidate -- --prepare-pages --candidate-dir "$RUNNER_TEMP/release-candidate" --output "$RUNNER_TEMP/pages-site"',
    ]),
    "publish-static": new Set(),
    "verify-static": new Set([
      "npm ci",
      'npm run verify:release-candidate -- --public-static "$AFFERENT_PUBLIC_BASE_URL" --candidate-dir "$RUNNER_TEMP/release-candidate"',
    ]),
  };
  for (const [name, job] of Object.entries({
    "prepare-static": prepareStatic,
    "publish-static": publishStatic,
    "verify-static": verifyStatic,
  })) {
    for (const step of job.steps ?? []) {
      if (
        step.run !== undefined &&
        (typeof step.run !== "string" ||
          !staticCommands[name].has(step.run.trim()))
      ) {
        throw new Error(`${name} contains an unapproved command`);
      }
    }
  }
  if (!dependencyList(prepareStatic).includes("release-readiness")) {
    throw new Error(
      "static publication preparation must depend on release readiness",
    );
  }
  if (!dependencyList(publishStatic).includes("prepare-static")) {
    throw new Error(
      "static publication must depend on prepared candidate bytes",
    );
  }
  if (
    !dependencyList(verifyStatic).includes("release-readiness") ||
    !dependencyList(verifyStatic).includes("publish-static")
  ) {
    throw new Error(
      "public static verification must depend on readiness and publication",
    );
  }
  if (
    environmentName(publishStatic) !== plannedReleasePolicy.staticEnvironment ||
    publishStatic.permissions?.pages !== "write" ||
    publishStatic.permissions?.["id-token"] !== "write"
  ) {
    throw new Error(
      "static publication permissions or environment are invalid",
    );
  }
  if (publishStatic.outputs?.page_url !== pageUrlExpression) {
    throw new Error(
      "static publication must expose the immutable deployment URL",
    );
  }
  for (const [name, job] of Object.entries(workflow.jobs)) {
    if (
      actionStep(job, "actions/setup-node")?.with?.["registry-url"] !==
      undefined
    ) {
      throw new Error(`${name} must not configure npm registry authentication`);
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
  if (
    !commandFor(readiness).includes(
      "npm run verify:release-candidate -- --external-config",
    ) ||
    !commandFor(readiness).includes(
      "npm run verify:release-candidate -- --release-preflight",
    ) ||
    !commandFor(prepareStatic).includes(
      "npm run verify:release-candidate -- --prepare-pages",
    ) ||
    !commandFor(verifyStatic).includes(
      'npm run verify:release-candidate -- --public-static "$AFFERENT_PUBLIC_BASE_URL"',
    )
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
    crossRunDownload.with.repository !== `\${{ github.repository }}` ||
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
  for (const jobName of ["prepare-static", "verify-static"]) {
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
    repository: declaredRepository,
    originRepository: declaredRepository,
    workflowRef: `${declaredRepository}/.github/workflows/${declaredIdentity.releaseWorkflow}@refs/heads/${plannedReleasePolicy.branch}`,
    runnerEnvironment: "github-hosted",
    releaseOwner: declaredRepository,
    repositoryVisibility: "public",
    staticPublication: plannedReleasePolicy.staticPublication,
    approvedTag: declaredIdentity.sourceTag,
  };
  for (const [key, value] of Object.entries(expected)) {
    let actual = ["originRepository", "releaseOwner", "repository"].includes(
      key,
    )
      ? normalizeRepositoryName(configuration?.[key])
      : configuration?.[key];
    if (key === "workflowRef" && typeof actual === "string") {
      const match = actual.match(/^(?<repository>[^/]+\/[^/]+)(?<ref>\/.*)$/u);
      actual = match
        ? `${normalizeRepositoryName(match.groups.repository)}${match.groups.ref}`
        : undefined;
    }
    if (actual !== value) {
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
    normalizeRepositoryName(metadata?.repository?.full_name) !==
      declaredRepository ||
    normalizeRepositoryName(metadata?.head_repository?.full_name) !==
      declaredRepository
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
    record?.schemaVersion !== 2 ||
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
    record.package?.publication !== plannedReleasePolicy.packagePublication ||
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
    schemaVersion: 2,
    artifactName: `afferent-release-candidate-${identity.version}`,
    source: {
      commit,
      repository: declaredRepository,
      tag: identity.sourceTag,
    },
    package: {
      name: identity.packageName,
      publication: plannedReleasePolicy.packagePublication,
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
        schemaVersion: 2,
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
    declaredIdentity,
  );
  const registry = await digestRegistry(candidateRoot);
  if (
    manifest.package.sha256 !== record.package.sha256 ||
    manifest.package.version !== record.package.version ||
    manifest.source.commit !== record.source.commit ||
    manifest.registry.sha256 !== registry.sha256 ||
    JSON.stringify(manifest.registry.files) !== JSON.stringify(registry.files)
  ) {
    throw new Error(
      "release manifest does not match candidate record or registry contents",
    );
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

export async function originRepository(root = repositoryRoot) {
  let results;
  try {
    // Expand Git's insteadOf/pushInsteadOf rewrites for every destination.
    // Explicit pushurl entries must agree with all fetch URLs.
    results = await Promise.all([
      run("git", ["remote", "get-url", "--all", "origin"], {
        capture: true,
        cwd: root,
      }),
      run("git", ["remote", "get-url", "--push", "--all", "origin"], {
        capture: true,
        cwd: root,
      }),
    ]);
  } catch {
    throw new Error(
      "external release configuration is incomplete: no usable git remote named origin is configured",
    );
  }
  const repositories = results.flatMap((result) =>
    result.stdout.trim().split(/\r?\n/u).map(repositoryFromMetadata),
  );
  if (repositories.some((value) => !value)) {
    throw new Error(
      "external release configuration is incomplete: an origin fetch or push URL has an unsupported GitHub URL form or host",
    );
  }
  const repository = repositories[0];
  if (repositories.some((value) => value !== repository)) {
    throw new Error(
      "external release configuration is incomplete: all origin fetch and push destinations must resolve to the same github.com/<owner>/<repository>",
    );
  }
  return repository;
}

async function externalConfigurationFromEnvironment() {
  return {
    githubActions: process.env.GITHUB_ACTIONS === "true",
    repository: process.env.GITHUB_REPOSITORY,
    originRepository: await originRepository(),
    workflowRef: process.env.GITHUB_WORKFLOW_REF,
    runnerEnvironment: process.env.RUNNER_ENVIRONMENT,
    releaseOwner: process.env.AFFERENT_RELEASE_OWNER,
    repositoryVisibility: process.env.AFFERENT_REPOSITORY_VISIBILITY,
    staticPublication: process.env.AFFERENT_STATIC_PUBLICATION,
    approvedTag: process.env.AFFERENT_RELEASE_APPROVED_TAG,
  };
}

async function npmVersion() {
  const result = await run("npm", ["--version"], { capture: true });
  return result.stdout.trim();
}

export async function validateReleasePreflight(candidateDirectory) {
  validateExternalConfiguration(await externalConfigurationFromEnvironment());
  if (process.env.AFFERENT_ALLOW_RELEASE !== "true") {
    throw new Error("manual source/static release approval is missing");
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
    normalizeRepositoryName(record.source.repository) !== declaredRepository
  ) {
    throw new Error("release source does not match the verified candidate");
  }
  await validateReleaseCheckout(sourceCommit, sourceTag);
  validateRuntimeFloor({
    node: process.versions.node,
    npm: await npmVersion(),
  });
  return record;
}

export async function validateReleaseCheckout(
  sourceCommit,
  sourceTag,
  root = repositoryRoot,
) {
  const [headResult, tagResult, statusResult] = await Promise.all([
    run("git", ["rev-parse", "HEAD"], { capture: true, cwd: root }),
    run("git", ["rev-parse", `refs/tags/${sourceTag}^{commit}`], {
      capture: true,
      cwd: root,
    }),
    run("git", ["status", "--porcelain", "--untracked-files=no"], {
      capture: true,
      cwd: root,
    }),
  ]);
  if (headResult.stdout.trim() !== sourceCommit) {
    throw new Error(
      "release checkout HEAD does not match the candidate commit",
    );
  }
  if (tagResult.stdout.trim() !== sourceCommit) {
    throw new Error("release tag does not point to the candidate commit");
  }
  if (statusResult.stdout.trim() !== "") {
    throw new Error("release checkout contains tracked changes");
  }
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
      schemaVersion: 2,
      distribution: {
        packagePublication: plannedReleasePolicy.packagePublication,
        sourcePublication: plannedReleasePolicy.sourcePublication,
        staticPublication: plannedReleasePolicy.staticPublication,
      },
      localPackage: record.package,
      source: record.source,
    }),
  );
  const outputFiles = await filesUnder(outputRoot);
  const publicPaths = outputFiles.map((path) =>
    relative(outputRoot, path).split(sep).join("/"),
  );
  if (
    publicPaths.some(
      (path) => path.endsWith(".tgz") || path.startsWith("package/"),
    )
  ) {
    throw new Error("Pages output must not contain the local package artifact");
  }
  return { outputRoot, record };
}

function publicBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("public static URL must be an absolute HTTPS URL");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("public static URL must be an absolute HTTPS URL");
  }
  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

async function wait(milliseconds) {
  await new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

async function fetchPublicBytes(path, options) {
  const url = new URL(path, options.baseUrl);
  let lastError;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      const response = await options.fetchImpl(url, { redirect: "follow" });
      if (!response.ok) {
        throw new Error(`${url} returned HTTP ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < options.attempts) await wait(options.delayMs);
    }
  }
  throw new Error(
    `public static artifact did not become available: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export async function verifyPublishedStatic(
  candidateDirectory,
  baseUrl,
  options = {},
) {
  const candidateRoot = safeCandidateDirectory(candidateDirectory);
  const record = await validateCandidateDirectory(candidateRoot, {
    requireFinal: true,
  });
  const request = {
    attempts: options.attempts ?? 10,
    baseUrl: publicBaseUrl(baseUrl),
    delayMs: options.delayMs ?? 3000,
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
  };
  if (
    typeof request.fetchImpl !== "function" ||
    !Number.isSafeInteger(request.attempts) ||
    request.attempts < 1 ||
    !Number.isSafeInteger(request.delayMs) ||
    request.delayMs < 0
  ) {
    throw new Error("public static verification options are invalid");
  }

  const registryFiles = await filesUnder(join(candidateRoot, "registry/r"));
  const expectedFiles = [
    {
      publicPath: "release-manifest.json",
      candidatePath: join(candidateRoot, "release-manifest.json"),
    },
    {
      publicPath: "registry.json",
      candidatePath: join(candidateRoot, "registry/registry.json"),
    },
    ...registryFiles.map((candidatePath) => ({
      publicPath: `r/${relative(
        join(candidateRoot, "registry/r"),
        candidatePath,
      )
        .split(sep)
        .join("/")}`,
      candidatePath,
    })),
  ];
  for (const expected of expectedFiles) {
    const [publicBytes, candidateBytes] = await Promise.all([
      fetchPublicBytes(expected.publicPath, request),
      readFile(expected.candidatePath),
    ]);
    if (!publicBytes.equals(candidateBytes)) {
      throw new Error(
        `public static artifact differs from the candidate: ${expected.publicPath}`,
      );
    }
  }

  const releaseBytes = await fetchPublicBytes("release.json", request);
  const release = JSON.parse(releaseBytes.toString("utf8"));
  if (
    release.schemaVersion !== 2 ||
    release.distribution?.packagePublication !== "none" ||
    release.distribution?.sourcePublication !==
      plannedReleasePolicy.sourcePublication ||
    release.distribution?.staticPublication !==
      plannedReleasePolicy.staticPublication ||
    release.localPackage?.sha256 !== record.package.sha256 ||
    release.localPackage?.publication !== "none" ||
    release.source?.commit !== record.source.commit ||
    release.source?.tag !== record.source.tag
  ) {
    throw new Error("public release metadata does not match the candidate");
  }

  const docsIndexBytes = await fetchPublicBytes("index.html", request);
  const docsIndex = docsIndexBytes.toString("utf8");
  if (!docsIndex.includes("Afferent")) {
    throw new Error("public documentation index is invalid");
  }

  for (const path of [
    `afferent-${record.package.version}.tgz`,
    `package/afferent-${record.package.version}.tgz`,
  ]) {
    const response = await request.fetchImpl(new URL(path, request.baseUrl), {
      redirect: "follow",
    });
    if (response.ok) {
      throw new Error(
        `local package artifact was published unexpectedly: ${path}`,
      );
    }
  }
  return { baseUrl: request.baseUrl.href, record };
}

export async function validateRepositoryWorkflows() {
  const [ciSource, releaseSource] = await Promise.all([
    readFile(join(repositoryRoot, ".github/workflows/ci.yml"), "utf8"),
    readFile(
      join(repositoryRoot, ".github/workflows", plannedReleasePolicy.workflow),
      "utf8",
    ),
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
        workflows: ["ci.yml", plannedReleasePolicy.workflow],
      })}\n`,
    );
    return;
  }
  if (process.argv.includes("--external-config")) {
    validateExternalConfiguration(await externalConfigurationFromEnvironment());
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
  if (process.argv.includes("--release-preflight")) {
    const candidate = option("--candidate-dir");
    if (!candidate) {
      throw new Error("--release-preflight requires --candidate-dir");
    }
    const record = await validateReleasePreflight(candidate);
    process.stdout.write(
      `${JSON.stringify({
        status: "verified",
        localPackage: record.package,
        source: record.source,
      })}\n`,
    );
    return;
  }
  if (process.argv.includes("--public-static")) {
    const publicStaticUrl = option("--public-static");
    const candidate = option("--candidate-dir");
    if (!publicStaticUrl || !candidate) {
      throw new Error("--public-static requires a URL and --candidate-dir");
    }
    const result = await verifyPublishedStatic(candidate, publicStaticUrl);
    process.stdout.write(
      `${JSON.stringify({
        status: "verified",
        publicStatic: result.baseUrl,
        localPackage: result.record.package,
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
        localPackage: result.record.package,
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
        localPackage: result.record.package,
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
        localPackage: result.record.package,
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
          localPackage: result.record.package,
        })}\n`,
      );
    } finally {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
    return;
  }
  throw new Error(
    "choose --local, --workflow, --external-config, --ci-run-metadata, --release-preflight, --prepare-pages, --public-static, --build --output, or --finalize",
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
