import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const canonicalRoot = join(root, "ui/afferent");
const mirrorRoot = join(root, "examples/ui/afferent");
const registryRoot = join(root, "registry");
const outputRoot = join(registryRoot, "r");
const generationLock = join(
  tmpdir(),
  `afferent-ui-generation-${createHash("sha256").update(root).digest("hex")}.lock`,
);
const { afferentRegistry } = await import(
  pathToFileURL(join(canonicalRoot, "registry.ts"))
);

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

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.once("error", rejectRun);
    child.once("close", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function acquireGenerationLock() {
  while (true) {
    try {
      await mkdir(generationLock);
      return;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      await delay(25);
    }
  }
}

await acquireGenerationLock();

try {
  const items = [...afferentRegistry.items]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((item) => ({
      name: item.name,
      type: "registry:block",
      title: item.name,
      description: item.description,
      dependencies: [...afferentRegistry.dependencies],
      registryDependencies: [...item.registryDependencies].sort(),
      files: [...item.files].sort((left, right) =>
        left.path.localeCompare(right.path),
      ),
    }));
  const catalog = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: afferentRegistry.name,
    homepage: afferentRegistry.homepage,
    items,
  };

  await mkdir(registryRoot, { recursive: true });
  await writeFile(join(registryRoot, "registry.json"), json(catalog));
  await rm(outputRoot, { recursive: true, force: true });
  await run(join(root, "node_modules/.bin/shadcn"), [
    "build",
    join(registryRoot, "registry.json"),
    "--output",
    outputRoot,
  ]);

  await rm(mirrorRoot, { recursive: true, force: true });
  const sourceFiles = new Set(
    items.flatMap((item) => item.files.map((file) => file.path)),
  );
  sourceFiles.add("ui/afferent/README.md");
  const manifest = [];
  for (const sourcePath of [...sourceFiles].sort()) {
    const absoluteSource = resolve(root, sourcePath);
    const path = relative(canonicalRoot, absoluteSource);
    if (path.startsWith("..")) {
      throw new Error(`Canonical source escaped ui/afferent: ${sourcePath}`);
    }
    const content = await readFile(absoluteSource);
    const mirrorPath = join(mirrorRoot, path);
    await mkdir(dirname(mirrorPath), { recursive: true });
    await writeFile(mirrorPath, content);
    manifest.push({
      path,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }
  await writeFile(join(outputRoot, "afferent-manifest.json"), json(manifest));
  await writeFile(join(mirrorRoot, "manifest.json"), json(manifest));
} finally {
  await rm(generationLock, { recursive: true, force: true });
}
