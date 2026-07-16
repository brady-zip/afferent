import { describe, expect, test } from "vitest";

import {
  COMMENT_SCORE_WEIGHT,
  VOTE_SCORE_WEIGHT,
  compareNewest,
  compareTop,
  compareTrending,
  computeTrendingScore,
} from "../../src/component/model/scoring.js";

const DAY = 86_400_000;

describe("ranked feedback scoring", () => {
  test("freezes the additive transactional trending formula", () => {
    expect(VOTE_SCORE_WEIGHT).toBe(DAY / 2);
    expect(COMMENT_SCORE_WEIGHT).toBe(DAY / 4);
    expect(computeTrendingScore(1000, 3, 2)).toBe(
      1000 + 3 * 43_200_000 + 2 * 21_600_000,
    );
  });

  test("defines stable descending total orders through the opaque post id", () => {
    const older = {
      id: "post-a",
      createdAt: 1000,
      voteCount: 2,
      trendingScore: computeTrendingScore(1000, 2, 0),
    };
    const newer = {
      id: "post-b",
      createdAt: 2000,
      voteCount: 1,
      trendingScore: computeTrendingScore(2000, 1, 0),
    };

    expect([older, newer].sort(compareNewest).map(({ id }) => id)).toEqual([
      "post-b",
      "post-a",
    ]);
    expect([newer, older].sort(compareTop).map(({ id }) => id)).toEqual([
      "post-a",
      "post-b",
    ]);
    expect([newer, older].sort(compareTrending).map(({ id }) => id)).toEqual([
      "post-a",
      "post-b",
    ]);

    const tied = [
      { ...older, id: "post-z" },
      { ...older, id: "post-a" },
    ];
    expect(tied.sort(compareNewest).map(({ id }) => id)).toEqual([
      "post-z",
      "post-a",
    ]);
    expect(tied.sort(compareTop).map(({ id }) => id)).toEqual([
      "post-z",
      "post-a",
    ]);
    expect(tied.sort(compareTrending).map(({ id }) => id)).toEqual([
      "post-z",
      "post-a",
    ]);
  });
});
