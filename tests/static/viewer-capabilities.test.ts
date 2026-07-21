import fs from "node:fs";
import { describe, expect, test } from "vitest";

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("trusted viewer authority boundary", () => {
  test("keeps browser bindings and intent validators free of viewer authority", () => {
    const contracts = read("src/client/contracts.ts");
    const publicPostReadValidators = [
      "listPostsIntentValidator",
      "listFeedbackIntentValidator",
      "getPostIntentValidator",
    ].map((name) => {
      const start = contracts.indexOf(`export const ${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const nextExport = contracts.indexOf("\nexport const ", start + 1);
      const declaration = contracts.slice(
        start,
        nextExport === -1 ? contracts.length : nextExport,
      );
      expect(declaration.length).toBeGreaterThan(0);
      return declaration;
    });
    const browserSurface = [
      read("src/react/bindings.ts"),
      ...publicPostReadValidators,
    ].join("\n");
    for (const forbidden of [
      "userId",
      "actorId",
      "viewerActor",
      "viewerHasVoted",
      "viewerCanEdit",
      "viewerCanWithdraw",
      "isOwner",
    ]) {
      expect(browserSurface).not.toContain(forbidden);
    }
  });

  test("uses only scope-leading indexed actor and vote membership lookups", () => {
    const actors = read("src/component/model/actors.ts");
    const votes = read("src/component/model/votes.ts");
    expect(actors).toContain("findExistingActor");
    expect(actors).toContain('withIndex("by_scope_external_key"');
    expect(votes).toContain('withIndex("by_scope_post_actor"');
    expect(actors).not.toMatch(/findExistingActor[\s\S]*?\.collect\(\)/);
    expect(votes).not.toMatch(/findVoteMembership[\s\S]*?\.collect\(\)/);
  });

  test("shares capability predicates and never mutates actors from public queries", () => {
    const publicReads = [
      read("src/component/public/posts.ts"),
      read("src/component/public/feeds.ts"),
    ].join("\n");
    const participation = read("src/component/participation/posts.ts");
    const views = read("src/component/model/views.ts");
    expect(publicReads).not.toContain("upsertActor");
    expect(participation).toContain("canActorEditPost");
    expect(participation).toContain("canActorWithdrawPost");
    expect(views).toContain("canActorEditPost");
    expect(views).toContain("canActorWithdrawPost");
    expect(views).not.toMatch(/author\.id\s*===|actorId\s*===\s*viewer/);
  });

  test("keeps headless and copied UI free of identity reconstruction", () => {
    const sources = [
      read("src/react/hooks/feedback.ts"),
      ...fs
        .readdirSync("ui/afferent", { recursive: true })
        .filter((entry) => String(entry).endsWith(".tsx"))
        .map((entry) => read(`ui/afferent/${String(entry)}`)),
    ].join("\n");
    expect(sources).not.toMatch(/author\.id\s*===|currentUser|currentActor|viewerActor/);
  });
});
