import fs from "node:fs";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";

import { init, parse } from "es-module-lexer";
import { describe, expect, test } from "vitest";

import {
  addCommentIntentValidator,
  adminCapabilityIntentValidator,
  anonymizeActorIntentValidator,
  createPostIntentValidator,
  countResultValidator,
  editPostIntentValidator,
  getPostIntentValidator,
  getPostSubscriptionIntentValidator,
  getPublishedChangelogBySlugIntentValidator,
  getUnreadNotificationCountIntentValidator,
  listFeedbackIntentValidator,
  listCommentsIntentValidator,
  listNotificationsIntentValidator,
  listPostActivityIntentValidator,
  listPublishedChangelogIntentValidator,
  listRoadmapGroupIntentValidator,
  listTagsIntentValidator,
  publicPostDtoValidator,
  publicCommentDtoValidator,
  setVoteIntentValidator,
  searchFeedbackIntentValidator,
  suggestSimilarPostsIntentValidator,
  withdrawPostIntentValidator,
} from "../../src/client/contracts.js";
import { normalizeBetterAuthUser } from "../../src/client/adapters/better-auth.js";
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
    if (entry.isDirectory()) return sourceFilesBelow(child);
    return entry.name.endsWith(".ts") ? [child] : [];
  });
}

describe("public contract privacy", () => {
  test("publishes one closed versioned headless result and error vocabulary", () => {
    const contractsSource = fs.readFileSync("src/client/contracts.ts", "utf8");
    expect(contractsSource).toContain("export type AfferentError =");
    expect(contractsSource).toContain("export type AfferentResult<T>");
    for (const code of [
      "AUTHENTICATION_REQUIRED",
      "NOT_AUTHORIZED",
      "VALIDATION",
      "NOT_FOUND",
      "RATE_LIMITED",
      "CONFLICT",
      "TRANSIENT",
      "UNKNOWN",
    ]) {
      expect(contractsSource).toContain(`"${code}"`);
    }
  });

  test("normalizes the session-validated Better Auth component user document", () => {
    expect(
      normalizeBetterAuthUser({
        _id: "better-auth-user-document-id",
        name: "  Example User  ",
        image: "  https://example.com/avatar.png  ",
        email: "private@example.com",
        role: "admin",
        session: { token: "private" },
      } as never),
    ).toEqual({
      externalKey: "better-auth:better-auth-user-document-id",
      displayName: "Example User",
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(() =>
      normalizeBetterAuthUser({ _id: "   ", name: "Ignored" } as never),
    ).toThrow("AUTHENTICATION_REQUIRED");
  });

  test("keeps full provider-helper capabilities server-side", () => {
    const internalSource = fs.readFileSync("src/client/internal.ts", "utf8");
    expect(internalSource).not.toContain("Pick<");
    expect(internalSource).toContain("GenericQueryCtx<any>");
    expect(internalSource).toContain("GenericMutationCtx<any>");
  });

  test("keeps delivery leases on the explicit server-only surface", () => {
    const serverSource = fs.readFileSync("src/client/server.ts", "utf8");
    const rootSource = fs.readFileSync("src/client/index.ts", "utf8");
    const reactSource = sourceFilesBelow("src/react")
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");

    expect(serverSource).toContain("createDeliveryClient");
    expect(serverSource).toContain("authorizeDelivery");
    for (const forbiddenSource of [rootSource, reactSource]) {
      expect(forbiddenSource).not.toContain("createDeliveryClient");
      expect(forbiddenSource).not.toContain("claimDeliveryBatch");
      expect(forbiddenSource).not.toContain("ackDelivery");
      expect(forbiddenSource).not.toContain("releaseDelivery");
    }
  });

  test("keeps delivery payloads versioned, typed, and free of PII fields", () => {
    const contractsSource = fs.readFileSync("src/client/contracts.ts", "utf8");
    expect(contractsSource).toContain("DeliveryEventDto");
    expect(contractsSource).toContain("DeliveryLeaseDto");
    expect(contractsSource).toContain("recipientKey");
    const deliverySlice = contractsSource.slice(
      contractsSource.indexOf("export type DeliveryEventDto"),
      contractsSource.indexOf("export type DeliveryLeaseDto"),
    );
    expect(deliverySlice).not.toMatch(
      /email|displayName|avatarUrl|provider|rendered|message/i,
    );
  });

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

  test("keeps the browser cache generation out of component intents", () => {
    for (const validator of [
      listFeedbackIntentValidator,
      listCommentsIntentValidator,
      getPostIntentValidator,
      searchFeedbackIntentValidator,
      suggestSimilarPostsIntentValidator,
      listRoadmapGroupIntentValidator,
      listPublishedChangelogIntentValidator,
      getPublishedChangelogBySlugIntentValidator,
      getPostSubscriptionIntentValidator,
      listNotificationsIntentValidator,
      getUnreadNotificationCountIntentValidator,
      adminCapabilityIntentValidator,
      listPostActivityIntentValidator,
      listTagsIntentValidator,
    ]) {
      expect(validator.fields).not.toHaveProperty("sessionGeneration");
    }
    const wrapper = fs.readFileSync(
      "fixtures/packed-vite-convex/convex/afferent.ts",
      "utf8",
    );
    expect(wrapper).toContain("sessionGeneration: v.number()");
    expect(wrapper).toContain("withoutSessionGeneration(args)");
  });

  test("keeps the comment read intent narrow and the React shape flat", () => {
    expect(Object.keys(listCommentsIntentValidator.fields).sort()).toEqual([
      "paginationOpts",
      "postId",
    ]);
    const bindingsSource = fs.readFileSync("src/react/bindings.ts", "utf8");
    const feedbackSource = fs.readFileSync(
      "src/react/hooks/feedback.ts",
      "utf8",
    );
    expect(bindingsSource).toContain("CommentPageDto");
    expect(bindingsSource).toContain("CommentFeedQueryReference");
    expect(feedbackSource).toContain("CommentDto[]");
    expect(feedbackSource).not.toMatch(/replies\s*:/);
    expect(feedbackSource).not.toMatch(/client\.read\.listComments/);
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
      "viewerCanEdit",
      "viewerCanWithdraw",
      "viewerHasVoted",
      "voteCount",
    ]);
    expect(
      Object.keys(publicPostDtoValidator.fields.author.fields).sort(),
    ).toEqual(["avatarUrl", "displayName", "id"]);
    const validatorsSource = fs.readFileSync(
      "src/component/validators.ts",
      "utf8",
    );
    expect(validatorsSource).toContain("postDtoValidator = v.object({\n  contractVersion: v.literal(2)");
    expect(validatorsSource).toContain("feedbackPostDtoValidator = v.object({\n  contractVersion: v.literal(3)");
  });

  test("makes bounded post counts explicit in the public result validator", () => {
    expect(Object.keys(countResultValidator.fields).sort()).toEqual([
      "contractVersion",
      "count",
      "hasMore",
    ]);
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

describe("provider fixture projects", () => {
  test.each(["auth-convex-auth", "auth-clerk", "auth-better-auth"])(
    "%s has an independent strict no-emit TypeScript project",
    (fixture) => {
      const configPath = `fixtures/${fixture}/tsconfig.json`;
      expect(fs.existsSync(configPath)).toBe(true);
      const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
        compilerOptions?: Record<string, unknown>;
        include?: string[];
      };
      expect(config.compilerOptions).toMatchObject({
        strict: true,
        noEmit: true,
        moduleResolution: "Bundler",
      });
      expect(config.compilerOptions).not.toHaveProperty("paths");
      expect(config.include).toContain("./convex/**/*.ts");
    },
  );

  test("commits typed Better Auth and Afferent component registration", () => {
    const configSource = fs.readFileSync(
      "fixtures/auth-better-auth/convex/convex.config.ts",
      "utf8",
    );
    expect(configSource).toContain('from "afferent/convex.config.js"');
    expect(configSource).toContain(
      'from "@convex-dev/better-auth/convex.config.js"',
    );
    expect(configSource.match(/app\.use\(/g)).toHaveLength(2);

    const generatedApiSource = fs.readFileSync(
      "fixtures/auth-better-auth/convex/_generated/api.ts",
      "utf8",
    );
    expect(generatedApiSource).toContain("AfferentComponentApi");
    expect(generatedApiSource).toContain("BetterAuthComponentApi");
    expect(generatedApiSource).toContain("betterAuth: BetterAuthComponentApi");
    expect(generatedApiSource).toContain("afferent: AfferentComponentApi");

    const fixtureSource = fs.readFileSync(
      "fixtures/auth-better-auth/convex/afferent.ts",
      "utf8",
    );
    expect(fixtureSource).toContain("createClient(components.betterAuth)");
    expect(fixtureSource).toMatch(/\.(?:getAuthUser|safeGetAuthUser)\(ctx\)/);
  });
});
