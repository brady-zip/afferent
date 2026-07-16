import assert from "node:assert/strict";
import { access, cp, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureTemplate = join(repositoryRoot, "fixtures/packed-vite-convex");
const packageGate = join(repositoryRoot, "scripts/test-packed-consumer.mjs");

const browserIntent = Object.freeze({
  title: "Packed consumer feedback",
  body: "Created through the trusted host participation wrapper.",
});

const forbiddenAuthorityFields = new Set([
  "actor",
  "externalKey",
  "isAdmin",
  "scopeId",
  "user",
  "userId",
]);

function isWithin(parent, candidate) {
  const pathFromParent = relative(parent, candidate);
  return pathFromParent === "" || (!pathFromParent.startsWith("..") && !isAbsolute(pathFromParent));
}

async function exists(path) {
  try {
    await access(path, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, options) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      ...options,
      env: {
        ...process.env,
        AFFERENT_SOURCE_ROOT: repositoryRoot,
        npm_config_workspaces: "false",
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
    child.once("close", (code, signal) => resolveRun({ code, signal, stdout, stderr }));
  });
}

test("a packed Afferent artifact completes the external board/post walking skeleton", async (t) => {
  const missingImplementation = [];
  if (!(await exists(fixtureTemplate))) missingImplementation.push("fixtures/packed-vite-convex");
  if (!(await exists(packageGate))) missingImplementation.push("scripts/test-packed-consumer.mjs");

  assert.deepEqual(
    missingImplementation,
    [],
    `Missing packed-artifact board/post path: ${missingImplementation.join(", ")}. ` +
      "Plan 01-02 must provide the clean consumer fixture and package gate.",
  );

  const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-packed-consumer-"));
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const canonicalTemporaryRoot = await realpath(temporaryRoot);
  const sourceRoot = await realpath(repositoryRoot);
  const consumerRoot = join(temporaryRoot, "packed-vite-convex");
  await cp(fixtureTemplate, consumerRoot, { recursive: true, errorOnExist: true });

  const materializedRoot = await realpath(consumerRoot);
  assert.equal(
    isWithin(sourceRoot, materializedRoot),
    false,
    "The packed consumer must be materialized outside the source repository",
  );

  const result = await run(
    process.execPath,
    [packageGate, "--consumer-dir", materializedRoot, "--json"],
    { cwd: temporaryRoot },
  );

  assert.equal(
    result.code,
    0,
    `Packed consumer gate failed${result.signal ? ` with ${result.signal}` : ""}:\n${result.stderr || result.stdout}`,
  );

  let transcript;
  assert.doesNotThrow(() => {
    transcript = JSON.parse(result.stdout);
  }, `Package gate must print one JSON transcript, received:\n${result.stdout}`);

  assert.equal(transcript.artifact?.kind, "packed Afferent artifact");
  assert.equal(transcript.artifact?.packCommand, "npm pack");
  assert.equal(transcript.artifact?.license, "Apache-2.0");
  assert.equal(transcript.artifact?.tarballOnly, true);
  assert.equal(transcript.artifact?.repositoryRelativeImports, false);

  const tarballPath = await realpath(transcript.artifact.tarballPath);
  assert.equal(
    isWithin(canonicalTemporaryRoot, tarballPath),
    true,
    "npm pack output must stay in the external temporary root",
  );
  assert.match(tarballPath, /\.tgz$/);

  const licensePath = await realpath(transcript.artifact.licensePath);
  assert.equal(isWithin(materializedRoot, licensePath), true, "LICENSE must resolve from the clean consumer");
  assert.match(await readFile(licensePath, "utf8"), /Apache License\s+Version 2\.0/i);

  assert.ok(transcript.artifact.resolvedPaths.length > 0, "The gate must report resolved package paths");
  for (const resolvedPath of transcript.artifact.resolvedPaths) {
    const canonicalPath = await realpath(resolvedPath);
    assert.equal(isWithin(materializedRoot, canonicalPath), true, `${canonicalPath} escaped the clean consumer`);
    assert.equal(isWithin(sourceRoot, canonicalPath), false, `${canonicalPath} resolved beneath the repository root`);
  }

  assert.deepEqual(Object.keys(transcript.interaction?.browserArgs ?? {}).sort(), ["boardId", "body", "title"]);
  assert.equal(transcript.interaction.browserArgs.boardId, transcript.interaction.board.id);
  assert.equal(transcript.interaction.browserArgs.title, browserIntent.title);
  assert.equal(transcript.interaction.browserArgs.body, browserIntent.body);
  for (const field of Object.keys(transcript.interaction.browserArgs)) {
    assert.equal(forbiddenAuthorityFields.has(field), false, `Browser args exposed trusted field: ${field}`);
  }

  assert.equal(transcript.interaction?.board?.name, "Product Feedback");
  assert.equal(transcript.interaction?.createdPost?.boardId, transcript.interaction.board.id);
  assert.equal(transcript.interaction?.createdPost?.title, browserIntent.title);
  assert.equal(transcript.interaction?.createdPost?.voteCount, 0);
  assert.equal(transcript.interaction?.createdPost?.commentCount, 0);
  assert.equal(transcript.interaction?.readPost?.id, transcript.interaction.createdPost.id);
  assert.equal(transcript.interaction?.readPost?.title, transcript.interaction.createdPost.title);
  assert.equal(transcript.interaction?.viteRender?.title, transcript.interaction.readPost.title);
  assert.equal(transcript.interaction?.viteRender?.voteCount, transcript.interaction.readPost.voteCount);
  assert.equal(transcript.interaction?.viteRender?.commentCount, transcript.interaction.readPost.commentCount);
  assert.equal(transcript.interaction?.trustedHostScope, "fixed-server-only");
  assert.equal(transcript.interaction?.actorFields?.includes("externalKey"), true);
  assert.equal(transcript.interaction?.actorFields?.includes("email"), false);
  assert.equal(transcript.interaction?.actorFields?.includes("token"), false);
});
