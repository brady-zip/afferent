import { describe, expect, test } from "vitest";

import { projectVoteState } from "../../src/component/model/votes.js";

describe("vote membership projection", () => {
  test("changes the count only when desired membership changes", () => {
    expect(projectVoteState(false, false, 0)).toEqual({
      membershipChanged: false,
      voteCount: 0,
    });
    expect(projectVoteState(false, true, 0)).toEqual({
      membershipChanged: true,
      voteCount: 1,
    });
    expect(projectVoteState(true, true, 1)).toEqual({
      membershipChanged: false,
      voteCount: 1,
    });
    expect(projectVoteState(true, false, 1)).toEqual({
      membershipChanged: true,
      voteCount: 0,
    });
  });

  test("never projects a negative count when clearing drifted state", () => {
    expect(projectVoteState(true, false, 0)).toEqual({
      membershipChanged: true,
      voteCount: 0,
    });
  });
});
