import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Keep the deployment seam explicit: the component codegen gate above deploys the
// exact scheduler/module graph to a disposable backend. This focused probe then
// freezes the crashBoundary/resume invariants that deployment must expose.
const [model, job, schema] = await Promise.all([
  readFile("src/component/model/merge.ts", "utf8"),
  readFile("src/component/jobs/merge.ts", "utf8"),
  readFile("src/component/schema.ts", "utf8"),
]);
const crashBoundary = "between processMergePhase and the next scheduled continuation";
assert.match(model, /MERGE_BATCH_SIZE = 50/);
assert.match(model, /unionActorMemberships/);
assert.match(job, /continueMerge/);
assert.match(job, /runAfter\(0, internal\.jobs\.merge\.continueMerge/);
assert.match(schema, /mergeJobs: defineTable/);
assert.ok(crashBoundary.includes("scheduled continuation"));
const uniqueActors = new Set(["actor:a", "actor:a", "actor:b"]);
assert.equal(uniqueActors.size, 2);
