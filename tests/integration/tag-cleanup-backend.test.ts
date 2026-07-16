import { describe, expect, test } from "vitest";

import {
  TAG_CLEANUP_BATCH_SIZE,
  nextTagCleanupState,
} from "../../src/component/jobs/tag-cleanup.js";

describe("tag cleanup continuation contract", () => {
  test("advances in fixed 50-row batches and only finalizes after every projection is gone", () => {
    expect(TAG_CLEANUP_BATCH_SIZE).toBe(50);
    expect(nextTagCleanupState({ memberships: 51, feeds: 51, searches: 51 }))
      .toEqual({ done: false, scheduleNext: true });
    expect(nextTagCleanupState({ memberships: 0, feeds: 0, searches: 0 }))
      .toEqual({ done: true, scheduleNext: false });
  });
});
