import assert from "node:assert/strict";
import test from "node:test";

import {
  validatePackageCandidate,
  validateRuntimeFloor,
} from "../../scripts/verify-package-release.mjs";

const manifest = {
  name: "afferent",
  version: "0.1.0",
  description: "A provider-neutral product feedback Convex component.",
  license: "Apache-2.0",
  type: "module",
  files: ["dist", "LICENSE"],
  repository: {
    type: "git",
    url: "git+https://github.com/bradywatkinson/afferent.git",
  },
  homepage: "https://github.com/bradywatkinson/afferent#readme",
  bugs: { url: "https://github.com/bradywatkinson/afferent/issues" },
  engines: { node: ">=22.14.0", npm: ">=11.5.1" },
  publishConfig: { access: "public", provenance: true },
  exports: {
    ".": {
      types: "./dist/client/index.d.ts",
      default: "./dist/client/index.js",
    },
    "./_generated/component.js": {
      types: "./dist/component/_generated/component.d.ts",
    },
    "./test": {
      types: "./dist/test.d.ts",
      default: "./dist/test.js",
    },
    "./package.json": "./package.json",
  },
};
const files = new Set([
  "package.json",
  "LICENSE",
  "dist/client/index.js",
  "dist/client/index.d.ts",
  "dist/component/_generated/component.d.ts",
  "dist/test.js",
  "dist/test.d.ts",
]);

test("package candidate requires exact metadata and existing export targets", () => {
  assert.doesNotThrow(() =>
    validatePackageCandidate({
      manifest,
      packedFiles: files,
      registry: { name: "afferent", compatibleVersion: "0.1.0" },
    }),
  );

  for (const field of [
    "license",
    "version",
    "repository",
    "homepage",
    "bugs",
    "engines",
    "publishConfig",
  ]) {
    const invalid = structuredClone(manifest);
    delete invalid[field];
    assert.throws(
      () =>
        validatePackageCandidate({
          manifest: invalid,
          packedFiles: files,
          registry: { name: "afferent", compatibleVersion: "0.1.0" },
        }),
      new RegExp(field),
    );
  }

  assert.throws(
    () =>
      validatePackageCandidate({
        manifest,
        packedFiles: new Set([...files].filter((file) => file !== "dist/test.d.ts")),
        registry: { name: "afferent", compatibleVersion: "0.1.0" },
      }),
    /dist\/test\.d\.ts/,
  );
  assert.throws(
    () =>
      validatePackageCandidate({
        manifest,
        packedFiles: files,
        registry: { name: "afferent", compatibleVersion: "0.2.0" },
      }),
    /compatible version/,
  );
});

test("package candidate rejects raw source publication and raw TypeScript exports", () => {
  const invalid = structuredClone(manifest);
  invalid.files = ["dist", "src", "LICENSE"];
  invalid.exports["./test"] = "./src/test.ts";
  assert.throws(
    () =>
      validatePackageCandidate({
        manifest: invalid,
        packedFiles: new Set([...files, "src/test.ts"]),
        registry: { name: "afferent", compatibleVersion: "0.1.0" },
      }),
    /raw TypeScript|files allowlist/,
  );
});

test("trusted publishing runtime floor is explicit", () => {
  assert.doesNotThrow(() =>
    validateRuntimeFloor({ node: "22.14.0", npm: "11.5.1" }),
  );
  assert.throws(
    () => validateRuntimeFloor({ node: "22.13.9", npm: "11.5.1" }),
    /Node 22\.14\.0/,
  );
  assert.throws(
    () => validateRuntimeFloor({ node: "22.14.0", npm: "11.4.9" }),
    /npm 11\.5\.1/,
  );
});
