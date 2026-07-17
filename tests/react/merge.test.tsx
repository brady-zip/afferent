import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { useMutation, usePaginatedQuery, useQuery } = vi.hoisted(() => ({
  useMutation: vi.fn(),
  usePaginatedQuery: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("convex/react", () => ({ useMutation, useQuery }));
vi.mock("convex-helpers/react", () => ({ usePaginatedQuery }));

import {
  AfferentProvider,
  type AfferentBindings,
  mapPostLookupState,
  useMergePost,
  usePost,
} from "../../src/react/index.js";

const bindings = {
  public: {
    listFeedback: { _type: "query" },
    getPost: { _type: "query", name: "getPost" },
  },
  admin: {
    capability: { _type: "query" },
    mergePost: { _type: "mutation", name: "mergePost" },
  },
} as unknown as AfferentBindings;

let mergeProbe: ReturnType<typeof useMergePost> | undefined;

function Probe() {
  const post = usePost("source" as never);
  mergeProbe = useMergePost();
  return <output>{post.status}</output>;
}

describe("headless merge hooks", () => {
  beforeEach(() => {
    useMutation.mockReset();
    usePaginatedQuery.mockReset();
    useQuery.mockReset();
    mergeProbe = undefined;
  });

  test("maps explicit post, merged, and not-found direct results", () => {
    expect(mapPostLookupState(undefined, true)).toMatchObject({ status: "loading" });
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

  test("uses injected refs and guards duplicate merge submissions", async () => {
    let resolveMutation: ((value: object) => void) | undefined;
    const mutation = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );
    useMutation.mockReturnValue(mutation);
    useQuery.mockReturnValue({ contractVersion: 1, status: "notFound" });
    expect(
      renderToStaticMarkup(
        <AfferentProvider bindings={bindings} auth={{ status: "authenticated" }}>
          <Probe />
        </AfferentProvider>,
      ),
    ).toContain("notFound");
    const first = mergeProbe!.merge({
      sourcePostId: "source" as never,
      canonicalPostId: "canonical" as never,
    });
    await expect(
      mergeProbe!.merge({
        sourcePostId: "source" as never,
        canonicalPostId: "canonical" as never,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    resolveMutation?.({ contractVersion: 1, status: "complete" });
    await expect(first).resolves.toMatchObject({ ok: true });
    expect(mutation).toHaveBeenCalledTimes(1);
  });
});
