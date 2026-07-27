"use client";

import { useState } from "react";

import type { SandboxLifecycleDto } from "../../bindings.js";

export type HostedCredentials = Readonly<{
  email: string;
  password: string;
}>;

export function SandboxLifecycle({
  lifecycle,
  onEnsure,
  onReset,
  onSignIn,
  onCreateAccount,
}: Readonly<{
  lifecycle: SandboxLifecycleDto;
  onEnsure: () => void | Promise<void>;
  onReset: () => void | Promise<void>;
  onSignIn?: (credentials: HostedCredentials) => void | Promise<void>;
  onCreateAccount?: (credentials: HostedCredentials) => void | Promise<void>;
}>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingAuth, setPendingAuth] = useState(false);
  const [authError, setAuthError] = useState<string>();
  const busy = ["checking", "preparing", "resetting", "expired"].includes(
    lifecycle.state,
  );

  async function authenticate(
    action:
      ((credentials: HostedCredentials) => void | Promise<void>) | undefined,
  ) {
    if (!action) {
      await onEnsure();
      return;
    }
    setPendingAuth(true);
    setAuthError(undefined);
    try {
      await action({ email, password });
    } catch {
      setAuthError(
        "We couldn't complete authentication. Check your details and try again.",
      );
    } finally {
      setPendingAuth(false);
    }
  }

  if (lifecycle.quota) {
    const quota = lifecycle.quota;
    const resourceName =
      quota.kind === "resource" ? quota.resource : "Sandbox storage";
    return (
      <section
        className="host-lifecycle host-lifecycle--error"
        data-sandbox-lifecycle={lifecycle.state}
        aria-busy="false"
        role="alert"
      >
        <div>
          <h1>{resourceName} limit reached</h1>
          <p>
            {quota.kind === "resource"
              ? `Your private sandbox has ${quota.used} of ${quota.limit} ${quota.resource}. Remove content or reset the sandbox to restore the demo baseline.`
              : "This private demo environment has reached its storage limit. Remove content or reset it to continue."}
          </p>
        </div>
        <div className="host-lifecycle__actions">
          <a className="host-button" href="/sandbox/admin">
            Review sandbox content
          </a>
          <button
            type="button"
            className="host-button host-button--destructive"
            onClick={() => void onReset()}
          >
            Reset my sandbox
          </button>
        </div>
      </section>
    );
  }

  const content = lifecycleContent(lifecycle);
  return (
    <section
      className={`host-lifecycle${
        lifecycle.state === "error" ? " host-lifecycle--error" : ""
      }`}
      data-sandbox-lifecycle={lifecycle.state}
      aria-busy={busy}
      aria-live="polite"
      role={lifecycle.state === "error" ? "alert" : undefined}
    >
      <div>
        <h1>{content.heading}</h1>
        <p>
          {lifecycle.state === "signed_out"
            ? content.body
            : lifecycle.message || content.body}
        </p>
        {lifecycle.state === "signed_out" ? (
          <div className="host-auth-fields">
            <label>
              Email
              <input
                autoComplete="email"
                inputMode="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                minLength={8}
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
              />
            </label>
          </div>
        ) : null}
        {authError ? <p role="alert">{authError}</p> : null}
      </div>
      <LifecycleActions
        state={lifecycle.state}
        pendingAuth={pendingAuth}
        onEnsure={onEnsure}
        onSignIn={() => void authenticate(onSignIn)}
        onCreateAccount={
          onCreateAccount ? () => void authenticate(onCreateAccount) : undefined
        }
      />
    </section>
  );
}

function LifecycleActions({
  state,
  pendingAuth,
  onEnsure,
  onSignIn,
  onCreateAccount,
}: Readonly<{
  state: SandboxLifecycleDto["state"];
  pendingAuth: boolean;
  onEnsure: () => void | Promise<void>;
  onSignIn: () => void;
  onCreateAccount?: () => void;
}>) {
  if (state === "signed_out") {
    return (
      <div className="host-lifecycle__actions">
        <button
          type="button"
          className="host-button host-button--primary"
          disabled={pendingAuth}
          aria-busy={pendingAuth}
          onClick={onSignIn}
        >
          Sign in to open my sandbox
        </button>
        {onCreateAccount ? (
          <button
            type="button"
            className="host-button"
            disabled={pendingAuth}
            onClick={onCreateAccount}
          >
            Create a demo account
          </button>
        ) : null}
        <a className="host-link" href="/">
          Return to showcase
        </a>
      </div>
    );
  }
  if (state === "expired") {
    return (
      <div className="host-lifecycle__actions">
        <button
          type="button"
          className="host-button host-button--primary"
          onClick={() => void onEnsure()}
        >
          Prepare a fresh private sandbox
        </button>
        <a className="host-link" href="/">
          Return to showcase
        </a>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="host-lifecycle__actions">
        <button
          type="button"
          className="host-button host-button--primary"
          onClick={() => void onEnsure()}
        >
          Try opening my sandbox
        </button>
        <a className="host-link" href="/">
          Return to showcase
        </a>
      </div>
    );
  }
  return null;
}

function lifecycleContent(lifecycle: SandboxLifecycleDto) {
  switch (lifecycle.state) {
    case "checking": {
      return {
        heading: "Checking your session…",
        body: "Your sandbox has not been opened yet.",
      };
    }
    case "signed_out": {
      return {
        heading: "Sign in to open your private sandbox",
        body: "Sign in with Convex Auth to try the complete feedback and admin workflow.",
      };
    }
    case "preparing": {
      return {
        heading: "Preparing your private sandbox…",
        body: "We're restoring the deterministic demo content.",
      };
    }
    case "ready": {
      return {
        heading: "Your private sandbox is ready",
        body: "The complete feedback and administration workflow is available.",
      };
    }
    case "resetting": {
      return {
        heading: "Resetting your private sandbox…",
        body: "Afferent will restore the original demo content.",
      };
    }
    case "expired": {
      return {
        heading: "Preparing a fresh private sandbox…",
        body: "Your previous sandbox expired after 7 days without activity.",
      };
    }
    case "error": {
      return {
        heading: "We couldn't open your sandbox",
        body: "Your previous sandbox has not been changed. Try opening it again.",
      };
    }
  }
}
