"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Link, NavLink } from "react-router";

import type { HostedAuthState, SandboxLifecycleDto } from "../../bindings.js";
import { ResetSandboxDialog } from "./ResetSandboxDialog.js";

export type HostedEnvironment = "showcase" | "sandbox";

export function AppShell({
  environment,
  auth,
  lifecycle,
  version,
  sourceCommit,
  onSignOut,
  onReset,
  children,
}: Readonly<{
  environment: HostedEnvironment;
  auth: HostedAuthState;
  lifecycle: SandboxLifecycleDto;
  version: string;
  sourceCommit: string;
  onSignOut: () => void | Promise<void>;
  onReset: () => void | Promise<void>;
  children: ReactNode;
}>) {
  const [resetOpen, setResetOpen] = useState(false);
  const resetTriggerRef = useRef<HTMLButtonElement>(null);
  const resetRequested = useRef(false);
  const resetBusy = lifecycle.state === "resetting";
  const readySandbox =
    environment === "sandbox" &&
    auth.status === "signed_in" &&
    lifecycle.state === "ready";
  let environmentSummary: ReactNode = null;
  if (environment === "showcase") {
    environmentSummary = (
      <section className="host-environment-note" aria-label="Showcase mode">
        <div>
          <strong>Immutable showcase</strong>
          <p>
            This shared example is read-only. Browse representative feedback,
            roadmap, discussion, and changelog journeys safely.
          </p>
        </div>
        <Link className="host-button host-button--primary" to="/sandbox">
          Open my sandbox
        </Link>
      </section>
    );
  } else if (readySandbox) {
    environmentSummary = (
      <SandboxReadySummary
        expiresAt={lifecycle.expiresAt}
        resetBusy={resetBusy}
        resetTriggerRef={resetTriggerRef}
        onReset={() => setResetOpen(true)}
      />
    );
  }

  useEffect(() => {
    if (resetBusy || !resetRequested.current) return;
    resetRequested.current = false;
    requestAnimationFrame(() => resetTriggerRef.current?.focus());
  }, [resetBusy]);

  async function resetAndRestoreFocus() {
    resetRequested.current = true;
    await onReset();
  }

  return (
    <div className="host-app">
      <a className="host-skip-link" href="#host-main">
        Skip to main content
      </a>
      <header className="host-header">
        <div className="host-header__inner">
          <div className="host-brand">
            <Link to="/" aria-label="Afferent showcase">
              Afferent
            </Link>
            <a
              href={`https://www.npmjs.com/package/afferent/v/${version}`}
              rel="noreferrer"
              target="_blank"
            >
              afferent v{version}
            </a>
          </div>
          <nav className="host-environment-nav" aria-label="Demo environment">
            <NavLink to="/" end>
              Showcase
            </NavLink>
            <NavLink to="/sandbox">My sandbox</NavLink>
          </nav>
          <div className="host-account">
            {auth.status === "signed_in" ? (
              <button
                type="button"
                className="host-button"
                onClick={() => void onSignOut()}
              >
                Sign out
              </button>
            ) : (
              <span>Browsing anonymously</span>
            )}
          </div>
        </div>
        {readySandbox ? <SandboxNavigation /> : null}
      </header>

      <div className="host-content">
        {environmentSummary}
        <main id="host-main" tabIndex={-1}>
          {children}
        </main>
      </div>

      <footer className="host-footer">
        <div>
          <span>Apache-2.0 open source</span>
          <a
            href={`https://github.com/bradywatkinson/afferent/commit/${sourceCommit}`}
            rel="noreferrer"
            target="_blank"
          >
            Source {sourceCommit.slice(0, 7)}
          </a>
          <a
            href="https://github.com/bradywatkinson/afferent"
            rel="noreferrer"
            target="_blank"
          >
            Repository
          </a>
        </div>
      </footer>

      <ResetSandboxDialog
        open={resetOpen}
        busy={resetBusy}
        onOpenChange={setResetOpen}
        onConfirm={resetAndRestoreFocus}
        restoreFocusRef={resetTriggerRef}
      />
    </div>
  );
}

function SandboxNavigation() {
  return (
    <nav className="host-product-nav" aria-label="Private sandbox">
      <NavLink to="/sandbox" end>
        Feedback
      </NavLink>
      <NavLink to="/sandbox/roadmap">Roadmap</NavLink>
      <NavLink to="/sandbox/changelog">Changelog</NavLink>
      <NavLink to="/sandbox/notifications">Notifications</NavLink>
      <NavLink to="/sandbox/admin">Administration</NavLink>
    </nav>
  );
}

function SandboxReadySummary({
  expiresAt,
  resetBusy,
  resetTriggerRef,
  onReset,
}: Readonly<{
  expiresAt?: number;
  resetBusy: boolean;
  resetTriggerRef: RefObject<HTMLButtonElement | null>;
  onReset: () => void;
}>) {
  return (
    <section className="host-environment-note" aria-label="Sandbox status">
      <div>
        <strong>Private sandbox</strong>
        <p>
          Expires after 7 days without activity
          {expiresAt ? ` · current window ends ${formatDate(expiresAt)}` : ""}
        </p>
      </div>
      <button
        ref={resetTriggerRef}
        type="button"
        className="host-button host-button--destructive"
        disabled={resetBusy}
        aria-busy={resetBusy}
        onClick={onReset}
      >
        Reset my sandbox
      </button>
    </section>
  );
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}
