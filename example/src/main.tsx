import { StrictMode, useEffect, useRef, useState } from "react";
import {
  ConvexAuthProvider,
  useAuthActions,
  useConvexAuth,
} from "@convex-dev/auth/react";
import type { BoardDto } from "afferent";
import packageMetadata from "afferent/package.json";
import { ConvexReactClient, useAction, useQuery } from "convex/react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import "@/components/afferent/afferent.css";

import { api } from "../convex/_generated/api.js";
import { App } from "./App.js";
import type { HostedAuthState, SandboxLifecycleDto } from "./bindings.js";
import type { HostedCredentials } from "./components/host/SandboxLifecycle.js";
import "./index.css";

const deploymentUrl = import.meta.env.VITE_CONVEX_URL;
const sourceCommit = import.meta.env.VITE_AFFERENT_SOURCE_COMMIT;

if (!deploymentUrl) {
  throw new Error("VITE_CONVEX_URL is required to start the hosted example");
}
if (!/^[0-9a-f]{40}$/i.test(sourceCommit ?? "")) {
  throw new Error(
    "VITE_AFFERENT_SOURCE_COMMIT must be the exact 40-character source commit",
  );
}

const convex = new ConvexReactClient(deploymentUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <HostedExample />
      </BrowserRouter>
    </ConvexAuthProvider>
  </StrictMode>,
);

function HostedExample() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const ensureSandbox = useAction(api.sandbox.ensureSandbox);
  const resetSandbox = useAction(api.sandbox.resetSandbox);
  const lifecycleResult = useQuery(
    api.sandbox.getSandboxLifecycle,
    isAuthenticated ? {} : "skip",
  );
  const showcaseBoardResult = useQuery(api.showcase.listBoards, {});
  const sandboxBoardResult = useQuery(
    api.sandbox.listBoards,
    isAuthenticated && lifecycleResult?.state === "ready" ? {} : "skip",
  );
  const showcaseBoards =
    showcaseBoardResult?.boards ?? ([] as readonly BoardDto[]);
  const sandboxBoards =
    sandboxBoardResult?.boards ?? ([] as readonly BoardDto[]);
  const [cacheEpoch, setCacheEpoch] = useState(0);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [pendingLifecycle, setPendingLifecycle] =
    useState<SandboxLifecycleDto>();
  const previouslyAuthenticated = useRef(false);
  const ensurePending = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !previouslyAuthenticated.current) {
      setSessionEpoch((current) => current + 1);
      setCacheEpoch((current) => current + 1);
    }
    if (!isAuthenticated && previouslyAuthenticated.current) {
      setCacheEpoch((current) => current + 1);
      setPendingLifecycle(undefined);
    }
    previouslyAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (pendingLifecycle && lifecycleResult?.state === pendingLifecycle.state) {
      setPendingLifecycle(undefined);
    }
  }, [lifecycleResult, pendingLifecycle]);

  const lifecycle: SandboxLifecycleDto = pendingLifecycle ??
    (lifecycleResult as SandboxLifecycleDto | undefined) ?? {
      state: isAuthenticated ? "checking" : "signed_out",
      message: isAuthenticated
        ? "Your sandbox has not been opened yet."
        : "Sign in to open your private sandbox.",
    };

  useEffect(() => {
    if (
      !isAuthenticated ||
      lifecycle.state !== "signed_out" ||
      ensurePending.current
    ) {
      return;
    }
    ensurePending.current = true;
    setPendingLifecycle({
      state: "preparing",
      message: "We're restoring the deterministic demo content.",
    });
    void ensureSandbox({})
      .then((result) => {
        setPendingLifecycle(result as SandboxLifecycleDto);
        if (result.state === "ready") {
          setCacheEpoch((current) => current + 1);
        }
      })
      .catch(() =>
        setPendingLifecycle({
          state: "error",
          message:
            "Your previous sandbox has not been changed. Try opening it again.",
        }),
      )
      .finally(() => {
        ensurePending.current = false;
      });
  }, [ensureSandbox, isAuthenticated, lifecycle.state]);

  let auth: HostedAuthState;
  if (isLoading) {
    auth = { status: "checking" };
  } else if (isAuthenticated) {
    auth = {
      status: "signed_in",
      sessionEpoch: `session-${sessionEpoch}`,
    };
  } else {
    auth = { status: "signed_out" };
  }

  async function authenticate(
    flow: "signIn" | "signUp",
    credentials: HostedCredentials,
  ) {
    if (!credentials.email.trim() || credentials.password.length < 8) {
      throw new Error("Email and a password of at least 8 characters required");
    }
    await signIn("password", {
      email: credentials.email.trim(),
      password: credentials.password,
      flow,
    });
  }

  async function prepareSandbox() {
    if (!isAuthenticated || ensurePending.current) return;
    ensurePending.current = true;
    setPendingLifecycle({
      state: "preparing",
      message: "We're restoring the deterministic demo content.",
    });
    try {
      const result = await ensureSandbox({});
      setPendingLifecycle(result as SandboxLifecycleDto);
      if (result.state === "ready") {
        setCacheEpoch((current) => current + 1);
      }
    } catch {
      setPendingLifecycle({
        state: "error",
        message:
          "Your previous sandbox has not been changed. Try opening it again.",
      });
    } finally {
      ensurePending.current = false;
    }
  }

  async function restoreSandbox() {
    setCacheEpoch((current) => current + 1);
    setPendingLifecycle({
      state: "resetting",
      message: "Afferent will restore the original demo content.",
    });
    try {
      const result = await resetSandbox({});
      setPendingLifecycle(result as SandboxLifecycleDto);
      if (result.state === "ready") {
        setCacheEpoch((current) => current + 1);
      }
    } catch {
      setPendingLifecycle({
        state: "error",
        message:
          "Your sandbox wasn't reset. Your previous content is still available.",
      });
    }
  }

  async function leaveSandbox() {
    setCacheEpoch((current) => current + 1);
    setPendingLifecycle({
      state: "signed_out",
      message: "Sign in to open your private sandbox.",
    });
    await signOut();
  }

  return (
    <App
      client={convex}
      auth={auth}
      lifecycle={lifecycle}
      cacheEpoch={cacheEpoch}
      showcaseBoards={showcaseBoards}
      sandboxBoards={sandboxBoards}
      onSignIn={(credentials) =>
        authenticate("signIn", credentials ?? { email: "", password: "" })
      }
      onCreateAccount={(credentials) => authenticate("signUp", credentials)}
      onSignOut={leaveSandbox}
      onEnsureSandbox={prepareSandbox}
      onResetSandbox={restoreSandbox}
      version={packageMetadata.version}
      sourceCommit={sourceCommit!}
    />
  );
}
