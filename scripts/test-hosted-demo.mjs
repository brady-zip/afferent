import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEMO_CANDIDATE_DIR,
  prepareDemoConsumer,
} from "./prepare-demo-consumer.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const playwrightBinary = join(repositoryRoot, "node_modules/.bin/playwright");
const convexBinaryName = process.platform === "win32" ? "convex.cmd" : "convex";
const convexBinary = join(
  repositoryRoot,
  "node_modules/.bin",
  convexBinaryName,
);
const configuration = join(repositoryRoot, "playwright.phase4.config.ts");
const readinessTimeoutMs = 120_000;

export const PHASE4_REQUIRED_SUITES = [
  { project: "chromium", spec: "hosted-demo.spec.ts" },
  { project: "chromium", spec: "sandbox-isolation.spec.ts" },
  { project: "chromium", spec: "sandbox-lifecycle.spec.ts" },
  { project: "chromium", spec: "hosted-accessibility.spec.ts" },
  { project: "tablet", spec: "hosted-accessibility.spec.ts" },
  { project: "mobile", spec: "hosted-accessibility.spec.ts" },
];

function markerName(project, spec) {
  return `${project}--${basename(spec)}.json`;
}

export async function recordPhase4Completion(testInfo) {
  const directory = process.env.PHASE4_EVIDENCE_DIR;
  const artifactDigest = process.env.PHASE4_ARTIFACT_DIGEST;
  const targetId = process.env.PHASE4_TARGET_ID;
  if (!directory || !artifactDigest || !targetId) {
    throw new Error("Phase 4 completion evidence environment is incomplete");
  }
  const spec = basename(testInfo.file);
  const project = testInfo.project.name;
  const expected = PHASE4_REQUIRED_SUITES.some(
    (entry) => entry.project === project && entry.spec === spec,
  );
  if (!expected) {
    throw new Error(`undeclared Phase 4 completion marker: ${project}/${spec}`);
  }
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, markerName(project, spec)),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        status: "complete",
        project,
        spec,
        artifactDigest,
        targetId,
      },
      null,
      2,
    )}\n`,
  );
}

export async function validateCompletionMarkers({
  directory,
  artifactDigest,
  targetId,
  requiredSuites = PHASE4_REQUIRED_SUITES,
}) {
  const markers = [];
  for (const suite of requiredSuites) {
    const path = join(directory, markerName(suite.project, suite.spec));
    let marker;
    try {
      marker = JSON.parse(await readFile(path, "utf8"));
    } catch {
      throw new Error(
        `missing completion marker for ${suite.project}/${suite.spec}`,
      );
    }
    if (
      marker.schemaVersion !== 1 ||
      marker.status !== "complete" ||
      marker.project !== suite.project ||
      marker.spec !== suite.spec
    ) {
      throw new Error(
        `invalid completion marker for ${suite.project}/${suite.spec}`,
      );
    }
    if (marker.artifactDigest !== artifactDigest) {
      throw new Error(
        `artifact digest mismatch for ${suite.project}/${suite.spec}`,
      );
    }
    if (marker.targetId !== targetId) {
      throw new Error(`target mismatch for ${suite.project}/${suite.spec}`);
    }
    markers.push(marker);
  }
  return markers;
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repositoryRoot,
      env: { ...process.env, ...options.env },
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
          `${command} ${args.join(" ")} failed (${code})\n${stderr}\n${stdout}`,
        ),
      );
    });
  });
}

async function allocatedPort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (typeof address !== "object" || address === null) {
    throw new Error("could not allocate a Phase 4 web port");
  }
  await new Promise((resolveClose) => server.close(resolveClose));
  return address.port;
}

function deploymentUrl(source) {
  const match = /^CONVEX_URL=(?<url>.+)$/mu.exec(source);
  if (!match) {
    throw new Error("real Convex deployment did not write CONVEX_URL");
  }
  return match.groups.url.trim();
}

async function waitForFile(path, timeoutMs = readinessTimeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await access(path);
      return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
  }
  throw new Error(`timed out waiting for ${path}`);
}

function startConvex(candidateRoot) {
  const child = spawn(
    convexBinary,
    ["dev", "--typecheck", "disable", "--tail-logs", "disable"],
    {
      cwd: candidateRoot,
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        CONVEX_AGENT_MODE: "anonymous",
        CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS: "90",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  const ready = new Promise((resolveReady, rejectReady) => {
    const inspect = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
      if (output.includes("Convex functions ready!")) resolveReady();
    };
    child.stdout.on("data", inspect);
    child.stderr.on("data", inspect);
    child.once("error", rejectReady);
    child.once("close", (code) => {
      if (!output.includes("Convex functions ready!")) {
        rejectReady(
          new Error(`Convex dev exited before backend readiness (${code})`),
        );
      }
    });
  });
  return { child, ready };
}

async function withTimeout(promise, label, timeoutMs = readinessTimeoutMs) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, rejectTimeout) => {
        timer = setTimeout(
          () => rejectTimeout(new Error(`timed out waiting for ${label}`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function stopOwned(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") {
    child.kill("SIGTERM");
  } else {
    try {
      process.kill(-child.pid, "SIGINT");
    } catch {
      child.kill("SIGINT");
    }
  }
  await Promise.race([
    new Promise((resolveClose) => child.once("close", resolveClose)),
    new Promise((resolveWait) => setTimeout(resolveWait, 5000)),
  ]);
  if (child.exitCode === null) {
    if (process.platform === "win32") {
      child.kill("SIGTERM");
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
  }
}

function forwardedArguments() {
  const values = [];
  const consumed = new Set();
  for (let index = 2; index < process.argv.length; index += 1) {
    if (consumed.has(index)) continue;
    const value = process.argv[index];
    if (value === "--remote" || value === "--list") continue;
    if (value === "--base-url") {
      consumed.add(index + 1);
      continue;
    }
    if (value.startsWith("--base-url=")) continue;
    values.push(value);
  }
  return values;
}

function baseUrlArgument() {
  const equals = process.argv.find((value) => value.startsWith("--base-url="));
  if (equals) return equals.slice("--base-url=".length);
  const index = process.argv.indexOf("--base-url");
  return index === -1 ? undefined : process.argv[index + 1];
}

function discoveredSuites(output) {
  const found = [];
  for (const suite of PHASE4_REQUIRED_SUITES) {
    const pattern = new RegExp(
      `\\[${suite.project.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\\][^\\n]*${suite.spec.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}`,
    );
    if (pattern.test(output)) found.push(suite);
  }
  return found;
}

async function listSelected(env, args) {
  const result = await run(
    playwrightBinary,
    ["test", "--config", configuration, "--list", ...args],
    { env, capture: true },
  );
  const output = `${result.stdout}\n${result.stderr}`;
  const selected = discoveredSuites(output);
  if (selected.length === 0) {
    throw new Error(
      `Phase 4 selection discovered no required tests\n${output}`,
    );
  }
  return { output, selected };
}

function isFocused(args) {
  return args.some(
    (value) =>
      value.startsWith("--project") ||
      value.startsWith("--grep") ||
      value.includes("tests/e2e/") ||
      value.endsWith(".spec.ts"),
  );
}

async function localTarget() {
  const candidateRoot = resolve(repositoryRoot, DEMO_CANDIDATE_DIR);
  const prepared = await prepareDemoConsumer({
    candidateDir: candidateRoot,
    force: true,
  });
  const convex = startConvex(candidateRoot);
  await withTimeout(convex.ready, "Convex functions ready");
  const envPath = join(candidateRoot, ".env.local");
  await waitForFile(envPath);
  const backendUrl = deploymentUrl(await readFile(envPath, "utf8"));
  await run(convexBinary, ["run", "seeds:seedShowcase", "{}"], {
    cwd: candidateRoot,
    env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" },
  });
  await run("npm", ["run", "build"], {
    cwd: candidateRoot,
    env: {
      ...process.env,
      VITE_AFFERENT_SOURCE_COMMIT: prepared.sourceCommit,
      VITE_CONVEX_URL: backendUrl,
    },
  });
  const port = await allocatedPort();
  const artifactDigest = prepared.package.sha256;
  const targetId = `local:${backendUrl}:${artifactDigest.slice(0, 12)}`;
  return {
    artifactDigest,
    backendUrl,
    baseURL: `http://127.0.0.1:${port}`,
    candidateRoot,
    convex: convex.child,
    sourceCommit: prepared.sourceCommit,
    targetId,
    webPort: port,
  };
}

async function remoteTarget(baseURL) {
  if (!baseURL) {
    throw new Error("remote Phase 4 runs require --base-url <https-url>");
  }
  const parsed = new URL(baseURL);
  if (parsed.protocol !== "https:") {
    throw new Error("remote Phase 4 base URL must use HTTPS");
  }
  const candidateRoot = resolve(repositoryRoot, DEMO_CANDIDATE_DIR);
  const prepared = await prepareDemoConsumer({
    candidateDir: candidateRoot,
    force: true,
  });
  return {
    artifactDigest: prepared.package.sha256,
    baseURL: parsed.href.replace(/\/$/, ""),
    candidateRoot,
    sourceCommit: prepared.sourceCommit,
    targetId: `remote:${parsed.origin}:${prepared.package.sha256.slice(0, 12)}`,
  };
}

async function main() {
  const listOnly = process.argv.includes("--list");
  const remote = process.argv.includes("--remote");
  const args = forwardedArguments();
  if (listOnly) {
    const outputRoot = await mkdtemp(join(tmpdir(), "afferent-phase4-list-"));
    try {
      const env = {
        ...process.env,
        PHASE4_BASE_URL: "https://phase4-list.invalid",
        PHASE4_OUTPUT_DIR: outputRoot,
        PHASE4_REMOTE: "1",
      };
      const listed = await listSelected(env, args);
      if (
        !isFocused(args) &&
        listed.selected.length !== PHASE4_REQUIRED_SUITES.length
      ) {
        throw new Error(
          `Phase 4 list is incomplete: ${listed.selected.length}/${PHASE4_REQUIRED_SUITES.length}`,
        );
      }
      process.stdout.write(listed.output);
      process.stdout.write(
        `\nPhase 4 required suites discovered: ${listed.selected.length}/${isFocused(args) ? listed.selected.length : PHASE4_REQUIRED_SUITES.length}\n`,
      );
      return;
    } finally {
      await rm(outputRoot, { force: true, recursive: true });
    }
  }

  let target;
  let evidenceRoot;
  try {
    target = remote
      ? await remoteTarget(baseUrlArgument())
      : await localTarget();
    const runId = randomUUID();
    evidenceRoot = join(target.candidateRoot, ".phase4-evidence", runId);
    await mkdir(evidenceRoot, { recursive: true });
    const env = {
      ...process.env,
      PHASE4_ARTIFACT_DIGEST: target.artifactDigest,
      PHASE4_BACKEND_KIND: remote ? "remote" : "local-real-convex",
      PHASE4_BACKEND_URL: target.backendUrl ?? "remote-hosted",
      PHASE4_BASE_URL: target.baseURL,
      PHASE4_CANDIDATE_ROOT: target.candidateRoot,
      PHASE4_EVIDENCE_DIR: evidenceRoot,
      PHASE4_OUTPUT_DIR: join(evidenceRoot, "raw"),
      PHASE4_REMOTE: remote ? "1" : "0",
      PHASE4_SOURCE_COMMIT: target.sourceCommit,
      PHASE4_TARGET_ID: target.targetId,
      PHASE4_WEB_PORT: target.webPort?.toString() ?? "",
    };
    const listed = await listSelected(env, args);
    if (
      !isFocused(args) &&
      listed.selected.length !== PHASE4_REQUIRED_SUITES.length
    ) {
      throw new Error(
        `Phase 4 aggregate selection is incomplete: ${listed.selected.length}/${PHASE4_REQUIRED_SUITES.length}`,
      );
    }
    await run(playwrightBinary, ["test", "--config", configuration, ...args], {
      env,
    });
    const markers = await validateCompletionMarkers({
      directory: evidenceRoot,
      artifactDigest: target.artifactDigest,
      targetId: target.targetId,
      requiredSuites: listed.selected,
    });
    const evidence = {
      schemaVersion: 1,
      status: isFocused(args) ? "focused-complete" : "complete",
      artifactDigest: target.artifactDigest,
      backendKind: env.PHASE4_BACKEND_KIND,
      sourceCommit: target.sourceCommit,
      targetId: target.targetId,
      required: listed.selected.length,
      completed: markers.length,
      suites: markers.map(({ project, spec }) => ({ project, spec })),
    };
    await writeFile(
      join(evidenceRoot, "phase4-e2e.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  } finally {
    await stopOwned(target?.convex);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
