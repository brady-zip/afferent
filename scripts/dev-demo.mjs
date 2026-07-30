import { spawn, spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  prepareLocalDemoTarget,
  stopOwned,
} from "./test-demo.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const minimumNodeVersion = [22, 14, 0];
const readinessTimeoutMs = 60_000;

function compareVersions(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

async function assertPrerequisites() {
  const nodeVersion = process.versions.node
    .split(".")
    .map((part) => Number.parseInt(part, 10));
  if (compareVersions(nodeVersion, minimumNodeVersion) < 0) {
    throw new Error(
      `Node ${minimumNodeVersion.join(".")} or newer is required; current version is ${process.versions.node}`,
    );
  }

  const npm = spawnSync("npm", ["--version"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (npm.error || npm.status !== 0) {
    throw new Error("npm is unavailable; install npm 11.5.1 or newer");
  }

  for (const binary of ["convex", "shadcn"]) {
    const executable = process.platform === "win32" ? `${binary}.cmd` : binary;
    try {
      await access(join(repositoryRoot, "node_modules/.bin", executable));
    } catch {
      throw new Error(
        `${binary} is not installed; run \`npm install\` from the repository root`,
      );
    }
  }
}

function startVite(target) {
  const child = spawn(
    "npm",
    [
      "run",
      "dev",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(target.webPort),
      "--strictPort",
    ],
    {
      cwd: target.candidateRoot,
      detached: false,
      env: {
        ...process.env,
        VITE_AFFERENT_SOURCE_COMMIT: target.sourceCommit,
        VITE_CONVEX_URL: target.backendUrl,
      },
      stdio: "inherit",
    },
  );
  return child;
}

async function waitForVite(baseURL, child) {
  const deadline = Date.now() + readinessTimeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Vite exited before readiness with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(baseURL, {
        headers: { accept: "text/html" },
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return;
    } catch {
      // The owned Vite process is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error(`Vite did not become ready at ${baseURL} within 60 seconds`);
}

async function waitForExit(child) {
  if (child.exitCode !== null) return child.exitCode;
  return await new Promise((resolveExit, rejectExit) => {
    child.once("error", rejectExit);
    child.once("close", (code) => resolveExit(code));
  });
}

async function main() {
  let target;
  let vite;
  let stopPromise;

  const stop = () => {
    stopPromise ??= (async () => {
      await stopOwned(vite, { processGroup: false });
      await stopOwned(target?.convex, { processGroup: false });
    })();
    return stopPromise;
  };

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      void stop();
    });
  }

  try {
    await assertPrerequisites();
    process.stdout.write(
      "Preparing the packed Afferent package and copy-owned registry UI…\n",
    );
    target = await prepareLocalDemoTarget({
      detachedProcesses: false,
      includeTestControls: false,
    });
    vite = startVite(target);
    await waitForVite(target.baseURL, vite);
    process.stdout.write(
      [
        "",
        "Afferent local demo is ready.",
        `Open: ${target.baseURL}`,
        "Backend: anonymous local Convex (no account, project, or deploy key)",
        "Showcase: available while signed out",
        "Sandbox/admin: create a local demo account in the app",
        "Press Ctrl-C to stop the owned Vite and Convex processes.",
        "",
      ].join("\n"),
    );
    const code = await waitForExit(vite);
    if (stopPromise === undefined && code !== 0) {
      throw new Error(`Vite exited unexpectedly with code ${code}`);
    }
  } finally {
    await stop();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(
      [
        "",
        `Unable to start the Afferent local demo: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "Recovery: run `npm install`, then retry `npm run dev:demo`.",
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
  }
}
