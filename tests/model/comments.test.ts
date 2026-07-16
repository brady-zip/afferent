import { describe, expect, test } from "vitest";

import { normalizeCommentBody } from "../../src/component/model/comments.js";

describe("comment model", () => {
  test("normalizes bounded non-empty bodies", () => {
    expect(normalizeCommentBody("  Useful context  ")).toBe("Useful context");
    expect(() => normalizeCommentBody("   ")).toThrow();
    expect(() => normalizeCommentBody("x".repeat(10_001))).toThrow();
  });
});
