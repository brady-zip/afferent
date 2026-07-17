import { describe, expect, test } from "vitest";

import {
  MERGE_ATOMIC_LIMIT,
  MERGE_BATCH_SIZE,
  canAbortMergeState,
  flattenMergeTarget,
  mergeReaderTruth,
  nextMergePreparationState,
  unionActorMemberships,
} from "../../src/component/model/merge.js";

describe("merge model", () => {
  test("freezes the conservative continuation bound", () => {
    expect(MERGE_ATOMIC_LIMIT).toBe(50);
    expect(MERGE_BATCH_SIZE).toBe(50);
  });

  test("selects one complete reader truth at every durable job state", () => {
    expect(mergeReaderTruth("preparing")).toBe("originals");
    expect(mergeReaderTruth("ready")).toBe("originals");
    expect(mergeReaderTruth("cutover_done")).toBe("staged");
    expect(mergeReaderTruth("cleaning")).toBe("staged");
    expect(mergeReaderTruth("done")).toBe("normalized");
    expect(mergeReaderTruth("aborted")).toBe("originals");
  });

  test("closes abort at cutover and makes preparation transitions explicit", () => {
    expect(canAbortMergeState("preparing")).toBe(true);
    expect(canAbortMergeState("ready")).toBe(true);
    expect(canAbortMergeState("cutover_done")).toBe(false);
    expect(nextMergePreparationState("preparing", true)).toBe("ready");
    expect(nextMergePreparationState("ready", false)).toBe("preparing");
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
