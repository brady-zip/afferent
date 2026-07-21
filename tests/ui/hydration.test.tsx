// @vitest-environment jsdom

import React, { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { describe, expect, test } from "vitest";
import { AfferentUiProvider } from "../../ui/afferent/core/afferent-ui-provider.js";

function Shell() {
  return (
    <AfferentUiProvider
      href={{
        post: (id) => `/feedback/${id}`,
        roadmap: () => "/roadmap",
        changelog: (slug) => `/changelog/${slug}`,
      }}
      currentLocation="/feedback"
    >
      <main>
        <h1>Deterministic Afferent shell</h1>
        <p>Loading interface…</p>
      </main>
    </AfferentUiProvider>
  );
}

describe("copied UI hydration boundary", () => {
  test("hydrates the deterministic provider shell without recoverable errors", async () => {
    const html = renderToString(<Shell />);
    const container = document.createElement("div");
    container.innerHTML = html;
    const before = container.innerHTML;
    const errors: unknown[] = [];
    await act(async () => {
      const root = hydrateRoot(container, <Shell />, {
        onRecoverableError: (error) => errors.push(error),
      });
      await Promise.resolve();
      expect(container.innerHTML).toBe(before);
      expect(errors).toEqual([]);
      root.unmount();
    });
  });
});
