import { createReadStream } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve, sep } from "node:path";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const fromEnvironment = process.argv.includes("--from-env");
const rootInput = required(
  fromEnvironment
    ? process.env.PHASE4_CANDIDATE_ROOT
    : option("--candidate-root"),
  "PHASE4_CANDIDATE_ROOT",
);
const port = Number(
  required(
    fromEnvironment ? process.env.PHASE4_WEB_PORT : option("--port"),
    "PHASE4_WEB_PORT",
  ),
);
const artifactDigest = required(
  fromEnvironment
    ? process.env.PHASE4_ARTIFACT_DIGEST
    : option("--artifact-digest"),
  "PHASE4_ARTIFACT_DIGEST",
);
const backendUrl = required(
  fromEnvironment ? process.env.PHASE4_BACKEND_URL : option("--backend-url"),
  "PHASE4_BACKEND_URL",
);
const targetId = required(
  fromEnvironment ? process.env.PHASE4_TARGET_ID : option("--target-id"),
  "PHASE4_TARGET_ID",
);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PHASE4_WEB_PORT must be an allocated TCP port");
}
if (!/^[a-f0-9]{64}$/.test(artifactDigest)) {
  throw new Error("PHASE4_ARTIFACT_DIGEST must be a SHA-256 digest");
}
if (!/^https?:\/\//.test(backendUrl)) {
  throw new Error("PHASE4_BACKEND_URL must be an HTTP(S) URL");
}

const candidateRoot = await realpath(rootInput);
const distRoot = await realpath(join(candidateRoot, "dist"));
await access(join(distRoot, "index.html"));

function inside(path, root) {
  const child = resolve(path);
  const parent = resolve(root);
  return child === parent || child.startsWith(`${parent}${sep}`);
}

async function fileFor(requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const normalized = normalize(decoded).replace(/^[/\\]+/, "");
  const requested = join(distRoot, normalized || "index.html");
  if (!inside(requested, distRoot)) return undefined;
  try {
    const details = await stat(requested);
    if (details.isFile()) return requested;
  } catch {
    // SPA navigation falls through to index.html.
  }
  return join(distRoot, "index.html");
}

const identity = {
  schemaVersion: 1,
  artifactDigest,
  backendUrl,
  targetId,
};

const server = createServer(async (request, response) => {
  try {
    if (request.url?.split("?")[0] === "/__phase4/identity") {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      });
      response.end(`${JSON.stringify(identity)}\n`);
      return;
    }
    const path = await fileFor(request.url ?? "/");
    if (!path) {
      response.writeHead(400).end("Bad request");
      return;
    }
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": contentTypes[extname(path)] ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
    });
    createReadStream(path).pipe(response);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(`${error instanceof Error ? error.message : String(error)}\n`);
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `${JSON.stringify({
      status: "ready",
      root: relative(candidateRoot, distRoot),
      url: `http://127.0.0.1:${port}`,
      ...identity,
    })}\n`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
