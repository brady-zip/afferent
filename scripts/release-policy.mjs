// The no-npm v1 distribution is locked. Exact GitHub ownership and external
// publication authority still require the Plan 04-09 human checkpoint.
// Revise the policy, workflow, tests, and documentation together on override.
export const plannedReleasePolicy = Object.freeze({
  branch: "main",
  packagePublication: "none",
  sourcePublication: "github-tag",
  staticEnvironment: "github-pages",
  staticPublication: "github-pages",
  workflow: "release.yml",
});
