import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const canonicalRoot = join(root, "ui/afferent");
const mirrorRoot = join(root, "examples/ui/afferent");

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

test("canonical UI generation is deterministic and byte-equal to its mirror", async () => {
  await access(join(root, "scripts/generate-ui-artifacts.mjs"));
  const canonical = await filesUnder(canonicalRoot);
  const mirrored = await filesUnder(mirrorRoot);
  const distributed = canonical.filter(
    (path) => relative(canonicalRoot, path) !== "registry.ts",
  );
  assert.deepEqual(
    mirrored.map((path) => relative(mirrorRoot, path)),
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

test("registry catalog and emitted items use stable approved metadata", async () => {
  const catalog = JSON.parse(
    await readFile(join(root, "registry/registry.json"), "utf8"),
  );
  assert.equal(catalog.$schema, "https://ui.shadcn.com/schema/registry.json");
  assert.deepEqual(
    catalog.items.map((item) => item.name),
    [...catalog.items.map((item) => item.name)].sort(),
  );
  for (const name of ["afferent-ui-core", "afferent-board"]) {
    const path = join(root, `registry/r/${name}.json`);
    assert.ok((await stat(path)).size > 0);
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
  assert.deepEqual(board.registryDependencies, ["./afferent-ui-core.json"]);
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
