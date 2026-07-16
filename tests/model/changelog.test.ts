import { describe, expect, test } from "vitest";

import {
  deriveChangelogSlug,
  nextAvailableChangelogSlug,
  normalizeChangelogSlug,
} from "../../src/component/model/changelog.js";

describe("changelog editorial model", () => {
  test("derives stable human-readable slugs and deterministic suffixes", () => {
    expect(deriveChangelogSlug("  Ship It: Better Search!  ")).toBe(
      "ship-it-better-search",
    );
    expect(normalizeChangelogSlug(" Release--Notes ")).toBe("release-notes");
    expect(nextAvailableChangelogSlug("release-notes", [])).toBe(
      "release-notes",
    );
    expect(
      nextAvailableChangelogSlug("release-notes", [
        "release-notes",
        "release-notes-2",
        "release-notes-4",
      ]),
    ).toBe("release-notes-3");
  });

  test.each(["", "---", "../release", "release/notes", "x".repeat(81)])(
    "rejects invalid explicit slug %j",
    (slug) => expect(() => normalizeChangelogSlug(slug)).toThrow(),
  );
});
