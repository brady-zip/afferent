// @vitest-environment jsdom

import { readFile } from "node:fs/promises";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App, HostedProductBoundary } from "../../example/src/App.js";
import type {
  HostedAuthState,
  SandboxLifecycleDto,
} from "../../example/src/bindings.js";
import { ResetSandboxDialog } from "../../example/src/components/host/ResetSandboxDialog.js";
import { SandboxLifecycle } from "../../example/src/components/host/SandboxLifecycle.js";
import { uiBindings, ControlledUiClient, board, click } from "./harness.js";

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  document.body.replaceChildren();
});

function render(children: React.ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(children));
  return {
    container,
    rerender(next: React.ReactNode) {
      act(() => root.render(next));
    },
    unmount() {
      act(() => root.unmount());
    },
  };
}

const client = new ControlledUiClient();
const defaultLifecycle: SandboxLifecycleDto = {
  state: "signed_out",
  message: "Sign in to open your private sandbox.",
};

function renderApp(
  path: string,
  options: {
    auth?: HostedAuthState;
    lifecycle?: SandboxLifecycleDto;
    cacheEpoch?: number;
    onSignIn?: () => void;
    onSignOut?: () => void;
    onEnsureSandbox?: () => void;
    onResetSandbox?: () => void;
  } = {},
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App
        client={client}
        auth={options.auth ?? { status: "signed_out" }}
        lifecycle={options.lifecycle ?? defaultLifecycle}
        cacheEpoch={options.cacheEpoch ?? 1}
        showcaseBoards={[board]}
        sandboxBoards={[board]}
        onSignIn={options.onSignIn ?? vi.fn()}
        onSignOut={options.onSignOut ?? vi.fn()}
        onEnsureSandbox={options.onEnsureSandbox ?? vi.fn()}
        onResetSandbox={options.onResetSandbox ?? vi.fn()}
        version="0.1.0"
        sourceCommit="0123456789abcdef"
      />
    </MemoryRouter>,
  );
}

describe("hosted Afferent shell", () => {
  test("opens on an explicitly immutable read-only showcase", () => {
    const mounted = renderApp("/");

    expect(mounted.container.querySelectorAll("header")).not.toHaveLength(0);
    expect(mounted.container.querySelectorAll("main")).toHaveLength(1);
    expect(mounted.container.querySelectorAll("footer")).toHaveLength(1);
    expect(
      [...mounted.container.querySelectorAll("nav a")].map((link) =>
        link.textContent?.trim(),
      ),
    ).toEqual(expect.arrayContaining(["Showcase", "My sandbox"]));
    expect(
      mounted.container.querySelector("a[aria-current='page']")?.textContent,
    ).toContain("Showcase");
    expect(mounted.container.textContent).toContain("Immutable showcase");
    expect(mounted.container.textContent).toContain(
      "This shared example is read-only.",
    );
    expect(mounted.container.textContent).not.toContain("Reset my sandbox");
    expect(mounted.container.textContent).toContain("afferent v0.1.0");
    expect(mounted.container.textContent).toContain("Source 0123456");
    mounted.unmount();
  });

  test("keeps signed-out sandbox data unmounted behind the Convex Auth gate", () => {
    const signIn = vi.fn();
    const mounted = renderApp("/sandbox", { onSignIn: signIn });

    expect(mounted.container.textContent).toContain(
      "Sign in to open your private sandbox",
    );
    expect(mounted.container.textContent).toContain(
      "Sign in with Convex Auth to try the complete feedback and admin workflow",
    );
    expect(
      mounted.container.querySelector("[data-environment-key]"),
    ).toBeNull();
    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Sign in to open my sandbox",
      )!,
    );
    expect(signIn).toHaveBeenCalledOnce();
    mounted.unmount();
  });

  test.each([
    {
      state: "checking",
      heading: "Checking your session…",
      body: "Your sandbox has not been opened yet.",
      busy: true,
    },
    {
      state: "preparing",
      heading: "Preparing your private sandbox…",
      body: "We're restoring the deterministic demo content.",
      busy: true,
    },
    {
      state: "resetting",
      heading: "Resetting your private sandbox…",
      body: "Afferent will restore the original demo content.",
      busy: true,
    },
    {
      state: "expired",
      heading: "Preparing a fresh private sandbox…",
      body: "expired after 7 days without activity",
      busy: true,
    },
    {
      state: "error",
      heading: "We couldn't open your sandbox",
      body: "Your previous sandbox has not been changed.",
      busy: false,
    },
  ] as const)(
    "renders the closed $state lifecycle without stale product content",
    ({ state, heading, body, busy }) => {
      const mounted = render(
        <SandboxLifecycle
          lifecycle={{ state, message: body }}
          onEnsure={vi.fn()}
          onReset={vi.fn()}
        />,
      );
      expect(mounted.container.textContent).toContain(heading);
      expect(mounted.container.textContent).toContain(body);
      expect(
        mounted.container
          .querySelector("[data-sandbox-lifecycle]")
          ?.getAttribute("aria-busy"),
      ).toBe(String(busy));
      expect(mounted.container.textContent).not.toMatch(
        /\b(?:scope|generation|owner|userId|isAdmin)\b/i,
      );
      mounted.unmount();
    },
  );

  test("ready sandbox exposes every public and administrative route family", () => {
    const mounted = renderApp("/sandbox/admin", {
      auth: { status: "signed_in", sessionEpoch: "session-1" },
      lifecycle: {
        state: "ready",
        message: "Your private sandbox is ready.",
        expiresAt: Date.now() + 86_400_000,
      },
    });
    for (const label of [
      "Feedback",
      "Roadmap",
      "Changelog",
      "Notifications",
      "Administration",
    ]) {
      expect(mounted.container.textContent).toContain(label);
    }
    expect(mounted.container.textContent).toContain("Private sandbox");
    expect(mounted.container.textContent).toContain(
      "Expires after 7 days without activity",
    );
    expect(mounted.container.textContent).toContain("Reset my sandbox");
    expect(
      mounted.container.querySelector("[data-environment-key]"),
    ).not.toBeNull();
    mounted.unmount();
  });

  test("reset requires the exact destructive confirmation and a neutral escape", () => {
    const confirm = vi.fn();
    const close = vi.fn();
    const mounted = render(
      <ResetSandboxDialog
        open
        busy={false}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        onConfirm={confirm}
      />,
    );
    expect(mounted.container.textContent).toContain(
      "Reset your private sandbox?",
    );
    expect(mounted.container.textContent).toContain(
      "The shared showcase and every other visitor's sandbox are not affected.",
    );
    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Keep my sandbox",
      )!,
    );
    expect(close).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();

    mounted.rerender(
      <ResetSandboxDialog
        open
        busy={false}
        onOpenChange={vi.fn()}
        onConfirm={confirm}
      />,
    );
    click(
      [...mounted.container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Reset my sandbox",
      )!,
    );
    expect(confirm).toHaveBeenCalledOnce();
    mounted.unmount();
  });

  test("environment and lifecycle epochs remount the data boundary", () => {
    function Probe() {
      const [value, setValue] = useState(0);
      return (
        <button
          type="button"
          onClick={() => setValue((current) => current + 1)}
        >
          Probe {value}
        </button>
      );
    }
    const boundary = (cacheKey: string) => (
      <HostedProductBoundary
        environment="sandbox"
        cacheKey={cacheKey}
        bindings={uiBindings}
        auth={{ status: "authenticated", identityToken: cacheKey }}
        client={client}
        currentLocation="/sandbox"
      >
        <Probe />
      </HostedProductBoundary>
    );
    const mounted = render(boundary("sandbox:session-1:1"));
    click(mounted.container.querySelector("button")!);
    expect(mounted.container.textContent).toContain("Probe 1");
    mounted.rerender(boundary("sandbox:session-1:2"));
    expect(mounted.container.textContent).toContain("Probe 0");
    mounted.unmount();
  });

  test("browser bindings and host components contain no authority inputs", async () => {
    const sources = await Promise.all(
      [
        "example/src/bindings.ts",
        "example/src/App.tsx",
        "example/src/components/host/AppShell.tsx",
        "example/src/components/host/SandboxLifecycle.tsx",
        "example/src/components/host/ResetSandboxDialog.tsx",
      ].map((path) => readFile(path, "utf8")),
    );
    expect(sources.join("\n")).not.toMatch(
      /\b(?:userId|isAdmin|scopeId|ownerKey|physicalScope|generation)\b/,
    );
  });
});
