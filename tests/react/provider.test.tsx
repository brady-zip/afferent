import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

const { usePaginatedQuery, useQuery } = vi.hoisted(() => ({
  usePaginatedQuery: vi.fn(() => ({
    results: [],
    status: "Exhausted",
    loadMore: vi.fn(),
  })),
  useQuery: vi.fn(),
}));

vi.mock("convex-helpers/react", () => ({ usePaginatedQuery }));
vi.mock("convex/react", () => ({ useQuery, useMutation: vi.fn(() => vi.fn()) }));

import {
  AfferentProvider,
  getAfferentSessionKey,
  type AfferentBindings,
  useAdminCapability,
  useAfferentContext,
  useFeedbackFeed,
} from "../../src/react/index.js";

const publicBindings = {
  listFeedback: { _type: "query" },
} as unknown as AfferentBindings["public"];

function Probe() {
  const context = useAfferentContext();
  const feed = useFeedbackFeed({ order: "newest" });
  const admin = useAdminCapability();
  return (
    <output>
      {JSON.stringify({
        auth: context.auth.status,
        sessionKey: context.sessionKey,
        feed: feed.status,
        admin: admin.status,
      })}
    </output>
  );
}

describe("AfferentProvider contract", () => {
  test("derives a reset key from auth state and opaque account generation", () => {
    expect(getAfferentSessionKey({ status: "loading" })).toBe("loading");
    expect(getAfferentSessionKey({ status: "unauthenticated" })).toBe(
      "unauthenticated",
    );
    expect(
      getAfferentSessionKey({
        status: "authenticated",
        sessionGeneration: "actor-a",
      }),
    ).toBe("authenticated:actor-a");
    expect(
      getAfferentSessionKey({
        status: "authenticated",
        sessionGeneration: "actor-b",
      }),
    ).not.toBe("authenticated:actor-a");
  });

  test("runs baseline public reads during auth loading while protected groups wait", () => {
    useQuery.mockReturnValue(undefined);
    const html = renderToStaticMarkup(
      <AfferentProvider
        bindings={{
          public: publicBindings,
          admin: {
            capability: { _type: "query" },
          } as never,
        }}
        auth={{ status: "loading" }}
      >
        <Probe />
      </AfferentProvider>,
    );
    expect(html).toContain("&quot;feed&quot;:&quot;empty&quot;");
    expect(html).toContain("&quot;admin&quot;:&quot;loading&quot;");
    expect(usePaginatedQuery).toHaveBeenCalledWith(
      publicBindings.listFeedback,
      { order: "newest" },
      { initialNumItems: 20 },
    );
    expect(useQuery).toHaveBeenCalledWith(expect.anything(), "skip");
  });

  test("keeps omitted optional groups unsupported instead of failing setup", () => {
    const html = renderToStaticMarkup(
      <AfferentProvider
        bindings={{ public: publicBindings }}
        auth={{ status: "authenticated", sessionGeneration: "actor-a" }}
      >
        <Probe />
      </AfferentProvider>,
    );
    expect(html).toContain("&quot;admin&quot;:&quot;unsupported&quot;");
    expect(html).toContain(
      "&quot;sessionKey&quot;:&quot;authenticated:actor-a&quot;",
    );
  });
});
