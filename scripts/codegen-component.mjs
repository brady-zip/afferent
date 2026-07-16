import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = await mkdtemp(join(tmpdir(), "afferent-component-codegen-"));

function run(command, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        CONVEX_AGENT_MODE: "anonymous",
      },
      stdio: "inherit",
    });
    child.once("error", rejectRun);
    child.once("close", (code, signal) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

try {
  await mkdir(join(temporaryRoot, "convex"), { recursive: true });
  await cp(join(repositoryRoot, "src/component"), join(temporaryRoot, "component"), {
    recursive: true,
    filter: (source) => !source.includes("/_generated"),
  });
  await symlink(join(repositoryRoot, "node_modules"), join(temporaryRoot, "node_modules"));
  await writeFile(
    join(temporaryRoot, "package.json"),
    '{"type":"module","dependencies":{"convex":"1.42.2"}}\n',
  );
  await writeFile(
    join(temporaryRoot, "convex/convex.config.ts"),
    [
      'import { defineApp } from "convex/server";',
      'import afferent from "../component/convex.config.js";',
      "const app = defineApp();",
      "app.use(afferent);",
      "export default app;",
      "",
    ].join("\n"),
  );

  const convex = join(repositoryRoot, "node_modules/.bin/convex");
  await run(convex, ["dev", "--once", "--typecheck", "disable"], temporaryRoot);
  await run(
    convex,
    ["codegen", "--component-dir", "./component", "--typecheck", "disable"],
    temporaryRoot,
  );
  await rm(join(repositoryRoot, "src/component/_generated"), {
    force: true,
    recursive: true,
  });
  await cp(
    join(temporaryRoot, "component/_generated"),
    join(repositoryRoot, "src/component/_generated"),
    { recursive: true },
  );
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}
