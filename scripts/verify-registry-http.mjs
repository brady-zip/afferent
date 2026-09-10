import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const names = ["board", "admin", "roadmap", "changelog", "notifications"];
const consumer = await mkdtemp(join(tmpdir(), "afferent-http-registry-"));
const requests = [];
const payloads = new Map(
  await Promise.all(
    [...names, "ui-core"].map(async (name) => [
      `/afferent/r/afferent-${name}.json`,
      await readFile(join(root, `registry/r/afferent-${name}.json`)),
    ]),
  ),
);
const server = createServer((request, response) => {
  requests.push(request.url);
  const payload = payloads.get(request.url);
  response.writeHead(payload ? 200 : 404, {
    "Content-Type": "application/json",
  });
  response.end(payload ?? "{}");
});

function runCli(args, declineOverwrite = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(join(root, "node_modules/.bin/shadcn"), args, {
      cwd: consumer,
      stdio: [declineOverwrite ? "pipe" : "ignore", "pipe", "pipe"],
      timeout: 120_000,
    });
    let transcript = "";
    let declined = false;
    const collect = (chunk) => {
      transcript += chunk;
      if (
        declineOverwrite &&
        !declined &&
        transcript.includes("Would you like to overwrite?")
      ) {
        declined = true;
        setTimeout(() => child.stdin.end("n\r"), 50);
      }
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0 && !child.killed) resolve({ transcript, declined });
      else reject(new Error(`HTTP registry CLI failed:\n${transcript}`));
    });
  });
}

try {
  await cp(join(root, "fixtures/registry-vite"), consumer, { recursive: true });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const configPath = join(consumer, "components.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.registries = {
    "@afferent": `http://127.0.0.1:${server.address().port}/afferent/r/{name}.json`,
  };
  await writeFile(configPath, JSON.stringify(config));
  for (const name of names) {
    const requestStart = requests.length;
    const url = `http://127.0.0.1:${server.address().port}/afferent/r/afferent-${name}.json`;
    const { transcript: output } = await runCli([
      "add",
      "--yes",
      "--dry-run",
      url,
    ]);
    assert.match(
      output,
      /afferent-ui-provider\.tsx/u,
      `${name} omits shared core`,
    );
    assert(
      requests
        .slice(requestStart)
        .includes("/afferent/r/afferent-ui-core.json"),
      `${name} did not fetch shared core over HTTP`,
    );
  }
  const base = `http://127.0.0.1:${server.address().port}/afferent/r/`;
  await runCli(["add", "--yes", `${base}afferent-board.json`]);
  const ownedPath = join(
    consumer,
    "src/components/afferent/core/afferent-ui-provider.tsx",
  );
  const ownedSource = `${await readFile(ownedPath, "utf8")}\n// Adopter-owned customization.\n`;
  await writeFile(ownedPath, ownedSource);
  const second = await runCli(
    ["add", "--yes", `${base}afferent-roadmap.json`],
    true,
  );
  assert(
    second.declined,
    "second feature did not offer to preserve the edited core file",
  );
  assert.equal(await readFile(ownedPath, "utf8"), ownedSource);
  assert(requests.every((path) => payloads.has(path)));
  console.log(
    JSON.stringify({
      status: "verified",
      transport: "http",
      independentItems: names.length,
      sharedCore: true,
      editedCorePreserved: true,
    }),
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(consumer, { recursive: true, force: true });
}
