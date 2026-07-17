import { describe, expect, test } from "vitest";

import {
  MERGE_BATCH_SIZE,
  flattenMergeTarget,
  unionActorMemberships,
} from "../../src/component/model/merge.js";

describe("merge model", () => {
  test("freezes the conservative continuation bound", () => {
    expect(MERGE_BATCH_SIZE).toBe(50);
  });

  test("unions canonical memberships by actor and preserves canonical state", () => {
    expect(
      unionActorMemberships(
        [
          { actorId: "actor:a", state: "subscribed" },
          { actorId: "actor:b", state: "opted_out" },
        ],
        [
          { actorId: "actor:a", state: "opted_out" },
          { actorId: "actor:c", state: "subscribed" },
        ],
      ),
    ).toEqual([
      { actorId: "actor:a", state: "subscribed" },
      { actorId: "actor:b", state: "opted_out" },
      { actorId: "actor:c", state: "subscribed" },
    ]);
  });

  test("flattens redirect chains and rejects cycles", () => {
    const redirects = new Map([
      ["post:a", "post:b"],
      ["post:b", "post:c"],
    ]);
    expect(flattenMergeTarget("post:a", redirects)).toBe("post:c");
    expect(() =>
      flattenMergeTarget(
        "post:a",
        new Map([
          ["post:a", "post:b"],
          ["post:b", "post:a"],
        ]),
      ),
    ).toThrow("MERGE_REDIRECT_CYCLE");
  });
});
