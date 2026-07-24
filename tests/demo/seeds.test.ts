import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

import {
  REPRESENTATIVE_SEED,
  SEED_VERSION,
  createMemorySeedProgressStore,
  runRepresentativeSeed,
  type SeedOperations,
} from "../../example/convex/seeds.js";

function recordingOperations(events: string[]): SeedOperations {
  return {
    configureInstallation: vi.fn(async (boards) => {
      events.push(`boards:${boards.map(({ key }) => key).join(",")}`);
    }),
    createPost: vi.fn(async (post) => {
      events.push(`post:${post.key}`);
    }),
    setPostStatus: vi.fn(async (postKey, status) => {
      events.push(`status:${postKey}:${status}`);
    }),
    addComment: vi.fn(async (comment) => {
      events.push(`comment:${comment.key}`);
    }),
    setVote: vi.fn(async (vote) => {
      events.push(`vote:${vote.key}`);
    }),
    createPublishedChangelog: vi.fn(async (entry) => {
      events.push(`changelog:${entry.key}:${entry.linkedPostKeys.join(",")}`);
    }),
  };
}

describe("representative demo seed", () => {
  it("describes a realistic feedback-to-roadmap-to-changelog story", () => {
    expect(REPRESENTATIVE_SEED.version).toBe(SEED_VERSION);
    expect(REPRESENTATIVE_SEED.boards.length).toBeGreaterThanOrEqual(2);
    expect(REPRESENTATIVE_SEED.posts.length).toBeGreaterThanOrEqual(5);
    expect(
      new Set(REPRESENTATIVE_SEED.posts.map(({ status }) => status)).size,
    ).toBeGreaterThanOrEqual(4);
    expect(
      REPRESENTATIVE_SEED.posts.some(({ status }) =>
        ["planned", "in_progress", "complete"].includes(status),
      ),
    ).toBe(true);
    expect(REPRESENTATIVE_SEED.comments.length).toBeGreaterThanOrEqual(3);
    expect(REPRESENTATIVE_SEED.votes.length).toBeGreaterThanOrEqual(3);
    expect(REPRESENTATIVE_SEED.changelog).toMatchObject({
      published: true,
    });
    expect(REPRESENTATIVE_SEED.changelog.linkedPostKeys.length).toBeGreaterThan(
      0,
    );
    for (const linked of REPRESENTATIVE_SEED.changelog.linkedPostKeys) {
      expect(REPRESENTATIVE_SEED.posts.some(({ key }) => key === linked)).toBe(
        true,
      );
    }
  });

  it("is idempotent for retries of one physical scope", async () => {
    const progress = createMemorySeedProgressStore();
    const events: string[] = [];
    const operations = recordingOperations(events);

    const first = await runRepresentativeSeed({
      physicalScopeId: "opaque-scope-a",
      operations,
      progress,
    });
    const retry = await runRepresentativeSeed({
      physicalScopeId: "opaque-scope-a",
      operations,
      progress,
    });

    expect(first).toEqual({ version: SEED_VERSION, complete: true });
    expect(retry).toEqual(first);
    expect(events.filter((event) => event.startsWith("post:"))).toHaveLength(
      REPRESENTATIVE_SEED.posts.length,
    );
    expect(
      events.filter((event) => event.startsWith("changelog:")),
    ).toHaveLength(1);
  });

  it("resumes after a bounded step failure without duplicating completed steps", async () => {
    const progress = createMemorySeedProgressStore();
    const events: string[] = [];
    const operations = recordingOperations(events);
    vi.mocked(operations.addComment)
      .mockRejectedValueOnce(new Error("injected comment failure"))
      .mockImplementation(async (comment) => {
        events.push(`comment:${comment.key}`);
      });

    await expect(
      runRepresentativeSeed({
        physicalScopeId: "opaque-scope-a",
        operations,
        progress,
      }),
    ).rejects.toThrow("injected comment failure");
    await runRepresentativeSeed({
      physicalScopeId: "opaque-scope-a",
      operations,
      progress,
    });

    expect(events.filter((event) => event.startsWith("boards:"))).toHaveLength(
      1,
    );
    expect(events.filter((event) => event.startsWith("post:"))).toHaveLength(
      REPRESENTATIVE_SEED.posts.length,
    );
  });

  it("produces identical semantic baselines in disjoint physical scopes", async () => {
    const progress = createMemorySeedProgressStore();
    const first: string[] = [];
    const second: string[] = [];

    await runRepresentativeSeed({
      physicalScopeId: "opaque-scope-a",
      operations: recordingOperations(first),
      progress,
    });
    await runRepresentativeSeed({
      physicalScopeId: "opaque-scope-b",
      operations: recordingOperations(second),
      progress,
    });

    expect(first).toEqual(second);
    expect(first.join("|")).not.toContain("opaque-scope");
  });

  it("keeps showcase seeding internal-only", async () => {
    const source = await readFile(
      new URL("../../example/convex/seeds.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /seedShowcase\s*=\s*(?:query|mutation|action)\s*\(/u,
    );
    expect(source).toMatch(/seedShowcase\s*=\s*internalMutation\s*\(/u);
  });
});
