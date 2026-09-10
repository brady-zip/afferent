import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const canonicalRoot = join(root, "ui/afferent");
const mirrorRoot = join(root, "examples/ui/afferent");
const execFileAsync = promisify(execFile);

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }),
  );
  return files.flat().sort();
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function distributionDigest() {
  const files = [
    ...(await filesUnder(join(root, "registry"))),
    ...(await filesUnder(mirrorRoot)),
  ];
  const contents = await Promise.all(files.map((path) => readFile(path)));
  return digest(Buffer.concat(contents));
}

test(
  "two consecutive generations are byte-identical",
  { timeout: 120_000 },
  async () => {
    await execFileAsync(
      process.execPath,
      ["scripts/generate-ui-artifacts.mjs"],
      {
        cwd: root,
      },
    );
    const first = await distributionDigest();
    await execFileAsync(
      process.execPath,
      ["scripts/generate-ui-artifacts.mjs"],
      {
        cwd: root,
      },
    );
    assert.equal(await distributionDigest(), first);
  },
);

test("canonical UI generation is deterministic and byte-equal to its mirror", async () => {
  await access(join(root, "scripts/generate-ui-artifacts.mjs"));
  const canonical = await filesUnder(canonicalRoot);
  const mirrored = await filesUnder(mirrorRoot);
  const distributed = canonical.filter(
    (path) => relative(canonicalRoot, path) !== "registry.ts",
  );
  assert.deepEqual(
    mirrored
      .map((path) => relative(mirrorRoot, path))
      .filter((path) => path !== "manifest.json"),
    distributed.map((path) => relative(canonicalRoot, path)),
  );
  for (const sourcePath of distributed) {
    const path = relative(canonicalRoot, sourcePath);
    const [source, mirror] = await Promise.all([
      readFile(sourcePath),
      readFile(join(mirrorRoot, path)),
    ]);
    assert.equal(digest(mirror), digest(source), `${path} mirror drifted`);
  }
});

test("publishes canonical adoption guidance and a complete stable mirror manifest", async () => {
  const [guide, mirroredGuide, manifest] = await Promise.all([
    readFile(join(canonicalRoot, "README.md")),
    readFile(join(mirrorRoot, "README.md")),
    readFile(join(mirrorRoot, "manifest.json"), "utf8").then(JSON.parse),
  ]);
  assert.equal(digest(guide), digest(mirroredGuide));
  assert.deepEqual(
    manifest.map((entry) => entry.path),
    manifest.map((entry) => entry.path).sort(),
  );
  assert.equal(
    manifest.some((entry) => entry.path === "README.md"),
    true,
  );
  assert.doesNotMatch(JSON.stringify(manifest), /timestamp|generatedAt/);
});

test("registry catalog and emitted items use stable approved metadata", async () => {
  const catalog = JSON.parse(
    await readFile(join(root, "registry/registry.json"), "utf8"),
  );
  assert.equal(catalog.$schema, "https://ui.shadcn.com/schema/registry.json");
  assert.deepEqual(
    catalog.items.map((item) => item.name),
    catalog.items.map((item) => item.name).sort(),
  );
  for (const name of [
    "afferent-admin",
    "afferent-board",
    "afferent-changelog",
    "afferent-notifications",
    "afferent-roadmap",
    "afferent-ui-core",
  ]) {
    const path = join(root, `registry/r/${name}.json`);
    const itemStat = await stat(path);
    assert.ok(itemStat.size > 0);
    const item = JSON.parse(await readFile(path, "utf8"));
    assert.equal(item.name, name);
    assert.doesNotMatch(
      JSON.stringify(item),
      /timestamp|generatedAt|createdAt/,
    );
  }
  const board = JSON.parse(
    await readFile(join(root, "registry/r/afferent-board.json"), "utf8"),
  );
  assert.deepEqual(board.registryDependencies, ["@afferent/afferent-ui-core"]);
  assert.deepEqual(board.dependencies, [
    "class-variance-authority@0.7.1",
    "clsx@2.1.1",
    "lucide-react@1.20.0",
    "radix-ui@1.6.0",
    "tailwind-merge@3.6.0",
  ]);
  assert.equal(
    board.dependencies.some((dependency) =>
      /shadcn|tailwindcss|playwright|axe-core/.test(dependency),
    ),
    false,
  );
});

test("repository root remains a registry author rather than a shadcn app", async () => {
  await assert.rejects(access(join(root, "components.json")));
  const fixture = JSON.parse(
    await readFile(
      join(root, "fixtures/registry-vite/components.json"),
      "utf8",
    ),
  );
  assert.equal(fixture.style, "new-york");
  assert.equal(fixture.tailwind.baseColor, "neutral");
  assert.equal(fixture.tailwind.cssVariables, true);
  assert.equal(fixture.tailwind.config, "");
  assert.equal(fixture.rsc, false);
});

test("board source closes every feed state with deterministic accessible recovery", async () => {
  const [source, cardSource] = await Promise.all([
    readFile(join(canonicalRoot, "board/board-screen.tsx"), "utf8"),
    readFile(join(canonicalRoot, "board/feedback-card.tsx"), "utf8"),
  ]);
  assert.match(source, /^"use client";/);
  for (const state of ["loading", "empty", "error", "ready"]) {
    assert.match(source, new RegExp(`case ["']${state}["']`));
  }
  assert.match(source, /assertNever\(feed\)/);
  assert.match(source, /copy\.board\.reloadFeedback/);
  assert.match(source, /onClick=\{feed\.retry\}/);
  assert.match(cardSource, /navigation\.href\.post\(post\.id\)/);
  assert.doesNotMatch(
    `${source}\n${cardSource}`,
    /window\.|Date\.|Math\.random|matchMedia|dangerouslySetInnerHTML/,
  );
});
