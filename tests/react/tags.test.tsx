import { describe, expect, test } from "vitest";

import { mapTagListState, tagActionKey } from "../../src/react/hooks/admin.js";

describe("headless tag administration", () => {
  test("maps explicit unsupported, loading, empty, and ready list states", () => {
    expect(mapTagListState(undefined, false)).toEqual({
      status: "unsupported",
      items: [],
    });
    expect(mapTagListState(undefined, true)).toEqual({
      status: "loading",
      items: [],
    });
    expect(mapTagListState({ contractVersion: 1, tags: [] }, true)).toEqual({
      status: "empty",
      items: [],
    });
    expect(
      mapTagListState(
        {
          contractVersion: 1,
          tags: [{ id: "tag-1", name: "Platform" }],
        },
        true,
      ),
    ).toEqual({
      status: "ready",
      items: [{ id: "tag-1", name: "Platform" }],
    });
  });

  test("keys tag and membership mutations per entity and action", () => {
    expect(tagActionKey("tag-1", "rename")).toBe("tag-1:rename");
    expect(tagActionKey("post-1:tag-1", "assign")).toBe("post-1:tag-1:assign");
    expect(tagActionKey("tag-1", "delete")).toBe("tag-1:delete");
  });
});
