// Plan 04-08 defaults await explicit human confirmation at Plan 04-09.
// Revise the policy, workflow, tests, and documentation together on override.
export const plannedReleasePolicy = Object.freeze({
  branch: "main",
  npmEnvironment: "npm-production",
  staticEnvironment: "github-pages",
  staticPublication: "github-pages",
  trustedPublisherPermission: "allow-publish",
  workflow: "release.yml",
});
