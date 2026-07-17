import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  AfferentProvider,
  getAfferentSessionKey,
  type AfferentBindings,
  useAfferentContext,
} from "../../src/react/index.js";

const bindings = {
  public: { listFeedback: { _type: "query" } },
} as unknown as AfferentBindings;
const client = { watchQuery: () => ({}) } as never;

function Probe() {
  const context = useAfferentContext();
  return (
    <output>
      {JSON.stringify({
        auth: context.auth.status,
        generation: context.generation,
        sessionKey: context.sessionKey,
      })}
    </output>
  );
}

describe("AfferentProvider contract", () => {
  test("requires a non-empty opaque identity without serializing it", () => {
    expect(getAfferentSessionKey({ status: "loading" })).toBe("loading");
    expect(getAfferentSessionKey({ status: "unauthenticated" })).toBe(
      "unauthenticated",
    );
    expect(
      getAfferentSessionKey({
        status: "authenticated",
        identityToken: "actor-a-private-token",
      }),
    ).toBe("authenticated");
    expect(() =>
      getAfferentSessionKey({
        status: "authenticated",
        identityToken: "   ",
      }),
    ).toThrow("identityToken must be non-empty");
  });

  test("exposes only a local numeric generation and generation key", () => {
    const html = renderToStaticMarkup(
      <AfferentProvider
        bindings={bindings}
        client={client}
        auth={{ status: "authenticated", identityToken: "private-actor-a" }}
      >
        <Probe />
      </AfferentProvider>,
    );
    expect(html).toContain("&quot;generation&quot;:1");
    expect(html).toContain("&quot;sessionKey&quot;:&quot;generation:1&quot;");
    expect(html).not.toContain("private-actor-a");
    expect(html).not.toContain("authenticated:default");
  });
});
