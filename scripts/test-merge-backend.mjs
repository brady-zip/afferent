import { spawn } from "node:child_process";

// The production continuation is exercised against the disposable Convex backend by
// running the focused integration matrix in its own process. The source sent to that
// backend imports MERGE_BATCH_SIZE and internal.jobs.merge.continueMerge, injects a
// crashBoundary between batches, then asserts uniqueActors after resume.
const child = spawn(
  process.execPath,
  ["./node_modules/vitest/vitest.mjs", "run", "tests/integration/merge-backend.test.ts"],
  { stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 1));
