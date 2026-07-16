import fs from "node:fs";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";

import { init, parse } from "es-module-lexer";
import { describe, expect, test } from "vitest";

import {
  addCommentIntentValidator,
  anonymizeActorIntentValidator,
  createPostIntentValidator,
  editPostIntentValidator,
  publicPostDtoValidator,
  publicCommentDtoValidator,
  setVoteIntentValidator,
  withdrawPostIntentValidator,
} from "../../src/client/contracts.js";
import { toActorDto, toBoardDto } from "../../src/component/model/views.js";

const CLIENT_FILES = [
  "src/client/contracts.ts",
  "src/client/index.ts",
  "src/client/internal.ts",
  "src/client/server.ts",
];
const FORBIDDEN_MODULES = [
  "@convex-dev/auth",
  "@clerk/",
  "@convex-dev/better-auth",
  "better-auth",
  "_generated/dataModel",
];

function sourceFilesBelow(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFilesBelow(child)
      : entry.name.endsWith(".ts")
        ? [child]
        : [];
  });
}

describe("public contract privacy", () => {
  test("keeps authority and provider records out of intent validators", () => {
    expect(Object.keys(createPostIntentValidator.fields).sort()).toEqual([
      "boardId",
      "body",
      "title",
    ]);
    expect(Object.keys(editPostIntentValidator.fields).sort()).toEqual([
      "body",
      "postId",
      "title",
    ]);
    expect(Object.keys(withdrawPostIntentValidator.fields)).toEqual(["postId"]);
    expect(Object.keys(setVoteIntentValidator.fields).sort()).toEqual([
      "desired",
      "postId",
    ]);
    expect(Object.keys(addCommentIntentValidator.fields).sort()).toEqual([
      "body",
      "parentCommentId",
      "postId",
    ]);
    expect(Object.keys(anonymizeActorIntentValidator.fields)).toEqual([
      "actorId",
    ]);
  });

  test("freezes the exact versioned public post DTO shape", () => {
    expect(Object.keys(publicPostDtoValidator.fields).sort()).toEqual([
      "author",
      "board",
      "boardId",
      "body",
      "commentCount",
      "contractVersion",
      "id",
      "status",
      "tags",
      "title",
      "totals",
      "voteCount",
    ]);
    expect(Object.keys(publicPostDtoValidator.fields.author.fields).sort()).toEqual(
      ["avatarUrl", "displayName", "id"],
    );
  });

  test("keeps comment DTOs flat and provider-neutral", () => {
    expect(Object.keys(publicCommentDtoValidator.fields).sort()).toEqual([
      "author",
      "body",
      "contractVersion",
      "id",
      "parentCommentId",
      "postId",
    ]);
    expect(publicCommentDtoValidator.fields).not.toHaveProperty("replies");
    expect(
      Object.keys(publicCommentDtoValidator.fields.author.fields).sort(),
    ).toEqual(["avatarUrl", "displayName", "id"]);
  });

  test("structurally audits imports, runtime exports, and DTO mapping", async () => {
    await init;
    const violations: string[] = [];
    for (const relative of CLIENT_FILES) {
      const sourceText = fs.readFileSync(path.resolve(relative), "utf8");
      const stripped = stripTypeScriptTypes(sourceText, { mode: "strip" });
      const [imports] = parse(stripped);
      for (const imported of imports) {
        const specifier = stripped.slice(imported.s, imported.e);
        if (FORBIDDEN_MODULES.some((name) => specifier.includes(name))) {
          violations.push(`${relative}: forbidden import ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);

    const componentText = sourceFilesBelow("src/component")
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");
    for (const providerShape of [
      "@convex-dev/auth",
      "@convex-dev/better-auth",
      "@clerk/",
      "better-auth",
      "providerRecord",
    ]) {
      expect(componentText).not.toContain(providerShape);
    }

    const manifest = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const runtimePackages = {
      ...manifest.dependencies,
      ...manifest.peerDependencies,
    };
    expect(runtimePackages).not.toHaveProperty("@convex-dev/auth");
    expect(runtimePackages).not.toHaveProperty("@convex-dev/better-auth");
    expect(runtimePackages).not.toHaveProperty("@clerk/react");
    expect(runtimePackages).not.toHaveProperty("better-auth");

    expect(
      toBoardDto({
        _id: "board",
        slug: "feedback",
        name: "Feedback",
        scopeId: "private",
        secret: "never spread",
      } as never),
    ).toEqual({ id: "board", slug: "feedback", name: "Feedback" });
    expect(
      toActorDto({
        _id: "actor",
        externalKey: "private",
        scopeId: "private",
        displayName: "Safe",
        token: "never spread",
      } as never),
    ).toEqual({ id: "actor", displayName: "Safe" });
  });
});
