"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { BoardDto } from "afferent";
import {
  AfferentProvider,
  type AfferentAuthState,
  type AfferentBindings,
} from "afferent/react.js";
import { ConvexProvider, type ConvexReactClient } from "convex/react";
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
} from "react-router";

import { AfferentUiProvider } from "@/components/afferent/core/afferent-ui-provider";
import type { AfferentLinkProps } from "@/components/afferent/core/navigation";

import {
  sandboxBindings,
  showcaseBindings,
  type HostedAuthState,
  type SandboxLifecycleDto,
} from "./bindings.js";
import {
  AppShell,
  type HostedEnvironment,
} from "./components/host/AppShell.js";
import {
  SandboxLifecycle,
  type HostedCredentials,
} from "./components/host/SandboxLifecycle.js";
import { HostedRoutes } from "./router.js";

type HostedClient = Pick<ConvexReactClient, "mutation" | "watchQuery">;

export function App({
  client,
  auth,
  lifecycle,
  cacheEpoch,
  showcaseBoards,
  sandboxBoards,
  onSignIn,
  onCreateAccount,
  onSignOut,
  onEnsureSandbox,
  onResetSandbox,
  version,
  sourceCommit,
}: Readonly<{
  client: HostedClient;
  auth: HostedAuthState;
  lifecycle: SandboxLifecycleDto;
  cacheEpoch: number;
  showcaseBoards: readonly BoardDto[];
  sandboxBoards: readonly BoardDto[];
  onSignIn: (credentials?: HostedCredentials) => void | Promise<void>;
  onCreateAccount?: (credentials: HostedCredentials) => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  onEnsureSandbox: () => void | Promise<void>;
  onResetSandbox: () => void | Promise<void>;
  version: string;
  sourceCommit: string;
}>) {
  const location = useLocation();
  const navigate = useNavigate();
  const previousPath = useRef(location.pathname);
  const preserveFocusForReset = useRef(false);
  const environment: HostedEnvironment = location.pathname.startsWith(
    "/sandbox",
  )
    ? "sandbox"
    : "showcase";
  const sandboxReady =
    auth.status === "signed_in" && lifecycle.state === "ready";
  const sandboxLifecycle = resolveSandboxLifecycle(auth, lifecycle);

  useEffect(() => {
    document.title = routeTitle(location.pathname, environment);
    if (previousPath.current !== location.pathname) {
      if (preserveFocusForReset.current) {
        preserveFocusForReset.current = false;
      } else {
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>("#host-main")?.focus();
        });
      }
    }
    previousPath.current = location.pathname;
  }, [environment, location.pathname]);

  async function resetSandboxAndReturn() {
    await onResetSandbox();
    preserveFocusForReset.current = true;
    navigate("/sandbox");
  }
  let product: ReactNode;
  if (environment === "showcase") {
    product = (
      <HostedProductBoundary
        environment="showcase"
        cacheKey={`showcase:${cacheEpoch}`}
        bindings={showcaseBindings}
        auth={{ status: "unauthenticated" }}
        client={client}
        currentLocation={location.pathname}
      >
        <HostedRoutes environment="showcase" boards={showcaseBoards} />
      </HostedProductBoundary>
    );
  } else if (sandboxReady && auth.status === "signed_in") {
    product = (
      <HostedProductBoundary
        environment="sandbox"
        cacheKey={`sandbox:${auth.sessionEpoch}:${cacheEpoch}`}
        bindings={sandboxBindings}
        auth={{
          status: "authenticated",
          identityToken: auth.sessionEpoch,
        }}
        client={client}
        currentLocation={location.pathname}
      >
        <HostedRoutes environment="sandbox" boards={sandboxBoards} />
      </HostedProductBoundary>
    );
  } else {
    product = (
      <SandboxLifecycle
        lifecycle={sandboxLifecycle}
        onEnsure={onEnsureSandbox}
        onReset={resetSandboxAndReturn}
        onSignIn={(credentials) => onSignIn(credentials)}
        onCreateAccount={onCreateAccount}
      />
    );
  }

  return (
    <AppShell
      environment={environment}
      auth={auth}
      lifecycle={sandboxLifecycle}
      version={version}
      sourceCommit={sourceCommit}
      onSignOut={onSignOut}
      onReset={resetSandboxAndReturn}
    >
      {product}
    </AppShell>
  );
}

function routeTitle(pathname: string, environment: HostedEnvironment) {
  let route = "Feedback";
  if (pathname.includes("/roadmap")) route = "Roadmap";
  else if (pathname.includes("/changelog")) route = "Changelog";
  else if (pathname.includes("/notifications")) route = "Notifications";
  else if (pathname.includes("/admin")) route = "Administration";
  else if (pathname.includes("/feedback/")) route = "Feedback detail";
  const context = environment === "sandbox" ? "private sandbox" : "showcase";
  return `${route} — Afferent ${context}`;
}

function resolveSandboxLifecycle(
  auth: HostedAuthState,
  lifecycle: SandboxLifecycleDto,
): SandboxLifecycleDto {
  if (auth.status === "checking") {
    return {
      state: "checking",
      message: "Your sandbox has not been opened yet.",
    };
  }
  if (auth.status === "signed_out") {
    return {
      state: "signed_out",
      message: "Sign in to open your private sandbox.",
    };
  }
  return lifecycle;
}

export function HostedProductBoundary({
  environment,
  cacheKey,
  bindings,
  auth,
  client,
  currentLocation,
  children,
}: Readonly<{
  environment: HostedEnvironment;
  cacheKey: string;
  bindings: AfferentBindings;
  auth: AfferentAuthState;
  client: HostedClient;
  currentLocation: string;
  children: ReactNode;
}>) {
  const prefix = environment === "sandbox" ? "/sandbox" : "";
  return (
    <div
      key={cacheKey}
      data-environment-key={cacheKey}
      data-hosted-environment={environment}
    >
      <ConvexProvider client={client as ConvexReactClient}>
        <AfferentProvider bindings={bindings} auth={auth} client={client}>
          <AfferentUiProvider
            href={{
              post: (id) => `${prefix}/feedback/${id}`,
              roadmap: () => `${prefix}/roadmap`,
              changelog: (slug) => `${prefix}/changelog/${slug}`,
            }}
            Link={HostedRouterLink}
            navigate={navigateWithoutReload}
            currentLocation={currentLocation}
          >
            {children}
          </AfferentUiProvider>
        </AfferentProvider>
      </ConvexProvider>
    </div>
  );
}

function navigateWithoutReload(href: string) {
  globalThis.history.pushState(null, "", href);
  globalThis.dispatchEvent(new globalThis.PopStateEvent("popstate"));
}

function HostedRouterLink({ href, children, ...props }: AfferentLinkProps) {
  return (
    <RouterLink to={href} {...props}>
      {children}
    </RouterLink>
  );
}
