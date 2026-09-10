import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { sanitizeGeneratedBindings } from "./prepare-demo-consumer.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const temporary = await mkdtemp(join(tmpdir(), "afferent-demo-codegen-"));

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: temporary,
      env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`convex exited ${code}`)),
    );
  });
}

try {
  await cp(join(root, "example/convex"), join(temporary, "convex"), {
    recursive: true,
    filter: (source) => !source.includes("/_generated"),
  });
  await writeFile(
    join(temporary, "convex/convex.config.ts"),
    [
      `import afferent from ${JSON.stringify(join(root, "dist/component/convex.config.js"))};`,
      'import { defineApp } from "convex/server";',
      "const app = defineApp();",
      'app.use(afferent, { name: "showcase" });',
      'app.use(afferent, { name: "sandbox" });',
      "export default app;",
      "",
    ].join("\n"),
  );
  await mkdir(join(temporary, "node_modules"));
  await symlink(root, join(temporary, "node_modules/afferent"));
  await symlink(
    join(root, "node_modules/convex"),
    join(temporary, "node_modules/convex"),
  );
  await symlink(
    join(root, "node_modules/@convex-dev"),
    join(temporary, "node_modules/@convex-dev"),
  );
  await writeFile(
    join(temporary, "package.json"),
    '{"type":"module","dependencies":{"convex":"1.42.2","afferent":"0.1.0"}}\n',
  );
  await run(join(root, "node_modules/.bin/convex"), [
    "dev",
    "--once",
    "--typecheck",
    "disable",
  ]);
  await rm(join(root, "example/convex/_generated"), {
    recursive: true,
    force: true,
  });
  await cp(
    join(temporary, "convex/_generated"),
    join(root, "example/convex/_generated"),
    { recursive: true },
  );
  await sanitizeGeneratedBindings(join(root, "example"));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
