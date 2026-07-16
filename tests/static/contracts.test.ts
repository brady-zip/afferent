import fs from "node:fs";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";

import { init, parse } from "es-module-lexer";
import { describe, expect, test } from "vitest";

import {
  createPostIntentValidator,
  editPostIntentValidator,
  publicPostDtoValidator,
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
