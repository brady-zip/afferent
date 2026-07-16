import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npm",
  ["exec", "--", "vitest", "run", "tests/integration/tag-cleanup-backend.test.ts"],
  { cwd: process.cwd(), encoding: "utf8" },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

process.stdout.write("Tag cleanup continuation contract passed.\n");
