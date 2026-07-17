import fs from "node:fs";

import { describe, expect, test } from "vitest";

describe("Phase 2 package and React exports", () => {
  const manifest = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
    exports: Record<string, unknown>;
    scripts: Record<string, string>;
  };
  const reactIndex = fs.readFileSync("src/react/index.ts", "utf8");
  const reactSource = fs
    .readdirSync("src/react/hooks")
    .map((file) => fs.readFileSync(`src/react/hooks/${file}`, "utf8"))
    .join("\n");

  test("publishes the declaration-backed React subpath", () => {
    expect(manifest.exports["./react.js"]).toEqual({
      types: "./dist/react/index.d.ts",
      default: "./dist/react/index.js",
    });
  });

  test("exports the complete stable domain hook inventory", () => {
    for (const exported of [
      "AfferentProvider",
      "useFeedbackFeed",
      "useComments",
      "useFeedbackSearch",
      "useSimilarPosts",
      "usePost",
      "useFeedbackMutations",
      "useAdminCapability",
      "usePostModeration",
      "useTags",
      "useTagManagement",
      "useMergePost",
      "useRoadmap",
      "useChangelogFeed",
      "useChangelogEntry",
      "useChangelogEditor",
      "usePostSubscription",
      "useNotifications",
      "useUnreadNotificationCount",
      "mapAfferentError",
    ]) {
      expect(reactIndex).toContain(exported);
    }
    expect(reactIndex).not.toMatch(/useAfferent(?:Query|Mutation)/);
  });

  test("keeps comment reads on the shared injected pagination substrate", () => {
    const feedbackSource = fs.readFileSync(
      "src/react/hooks/feedback.ts",
      "utf8",
    );
    const bindingsSource = fs.readFileSync("src/react/bindings.ts", "utf8");
    expect(bindingsSource).toContain("CommentFeedQueryReference");
    expect(bindingsSource).toContain("listComments?:");
    expect(feedbackSource).toContain("useComments");
    expect(feedbackSource).toContain(
      "usePaginatedWatchQuery<CommentDto, CommentFeedQueryReference>",
    );
    expect(feedbackSource).not.toContain("client.read.listComments");
    expect(feedbackSource).not.toMatch(/comment(?:Page)?Cache/i);
    expect(feedbackSource).not.toMatch(/replies\s*:/);
  });

  test("has no auth-provider router toast design-system or source-root coupling", () => {
    for (const forbidden of [
      "@clerk/",
      "@convex-dev/auth",
      "better-auth",
      "react-router",
      "next/navigation",
      "sonner",
      "@radix-ui",
      "@/components",
      "../../src/",
    ]) {
      expect(reactSource).not.toContain(forbidden);
    }
  });

  test("defines one named complete Phase 2 verification gate", () => {
    for (const command of [
      "test:model",
      "test:component",
      "test:backend",
      "test:static",
      "test:react",
      "test:package",
      "typecheck",
      "lint",
      "build",
    ]) {
      expect(manifest.scripts["test:phase2"]).toContain(command);
    }
  });
});
