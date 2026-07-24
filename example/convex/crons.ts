import { cronJobs } from "convex/server";

import { internal } from "./_generated/api.js";

const crons = cronJobs();

crons.interval(
  "expire inactive private sandboxes",
  { hours: 1 },
  internal.sandboxCleanup.scanExpiredSandboxes,
  {},
);

export default crons;
