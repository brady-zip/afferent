import { describe, expect, test } from "vitest";

import {
  SIMILAR_CANDIDATE_LIMIT,
  SIMILAR_DEFAULT_LIMIT,
  SIMILAR_HARD_LIMIT,
  rankSimilarCandidates,
  scoreSimilarity,
} from "../../src/component/model/similarity.js";

describe("deterministic similar-post ranking", () => {
  test("freezes bounded candidate and result limits", () => {
    expect(SIMILAR_CANDIDATE_LIMIT).toBe(30);
    expect(SIMILAR_DEFAULT_LIMIT).toBe(5);
    expect(SIMILAR_HARD_LIMIT).toBe(10);
  });

  test("weights title overlap above body-only overlap", () => {
    const target = { title: "Export feedback CSV", body: "Download results" };
    expect(
      scoreSimilarity(target, {
        title: "CSV feedback export",
        body: "A different explanation",
      }),
    ).toBeGreaterThan(
      scoreSimilarity(target, {
        title: "Download data",
        body: "Feedback CSV export results",
      }),
    );
  });

  test("reranks deterministically and never returns an engine score", () => {
    const ranked = rankSimilarCandidates(
      { title: "Export feedback CSV", body: "Download results" },
      [
        {
          id: "post-z",
          title: "CSV feedback export",
          body: "Download results",
          createdAt: 100,
        },
        {
          id: "post-a",
          title: "CSV feedback export",
          body: "Download results",
          createdAt: 100,
        },
        {
          id: "post-new",
          title: "CSV feedback export",
          body: "Download results",
          createdAt: 200,
        },
        {
          id: "unrelated",
          title: "Dark mode",
          body: "Theme colors",
          createdAt: 300,
        },
      ],
      3,
    );

    expect(ranked.map(({ id }) => id)).toEqual([
      "post-new",
      "post-a",
      "post-z",
    ]);
    expect(ranked.every((candidate) => !("score" in candidate))).toBe(true);
  });
});
