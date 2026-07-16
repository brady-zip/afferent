import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "vitest.scope.config.ts",
    "tests/integration/fanout-backend.test.ts",
  ],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
