import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  validatePackageCandidate,
  validateRuntimeFloor,
} from "../../scripts/verify-package-release.mjs";

const declaredPackageManifest = JSON.parse(
  await readFile(new URL("../../package.json", import.meta.url), "utf8"),
);

const manifest = {
  name: "afferent",
  version: "0.1.0",
  private: true,
  description: "A provider-neutral product feedback Convex component.",
  license: "Apache-2.0",
  type: "module",
  files: ["dist", "LICENSE"],
  repository: structuredClone(declaredPackageManifest.repository),
  homepage: declaredPackageManifest.homepage,
  bugs: structuredClone(declaredPackageManifest.bugs),
  engines: { node: ">=22.14.0", npm: ">=11.5.1" },
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
    "private",
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
        manifest: { ...manifest, private: false },
        packedFiles: files,
        registry: { name: "afferent", compatibleVersion: "0.1.0" },
      }),
    /private/,
  );
  assert.throws(
    () =>
      validatePackageCandidate({
        manifest: {
          ...manifest,
          publishConfig: { access: "public", provenance: true },
        },
        packedFiles: files,
        registry: { name: "afferent", compatibleVersion: "0.1.0" },
      }),
    /publishConfig/,
  );

  assert.throws(
    () =>
      validatePackageCandidate({
        manifest,
        packedFiles: new Set(
          [...files].filter((file) => file !== "dist/test.d.ts"),
        ),
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

test("source-build runtime floor is explicit", () => {
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
