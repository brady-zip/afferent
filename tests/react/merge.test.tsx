import { describe, expect, test } from "vitest";

import { mapPostLookupState } from "../../src/react/index.js";

describe("headless merge hooks", () => {
  test("maps explicit post, merged, and not-found direct results", () => {
    expect(mapPostLookupState(undefined, true)).toMatchObject({
      status: "loading",
    });
    expect(
      mapPostLookupState(
        {
          contractVersion: 1,
          status: "merged",
          requestedPostId: "source",
          canonicalPostId: "canonical",
        } as never,
        true,
      ),
    ).toMatchObject({ status: "merged", canonicalPostId: "canonical" });
    expect(
      mapPostLookupState({ contractVersion: 1, status: "notFound" }, true),
    ).toMatchObject({ status: "notFound" });
  });

  test("preserves unsupported state without a direct lookup binding", () => {
    expect(mapPostLookupState(undefined, false)).toEqual({
      status: "unsupported",
    });
  });
});
