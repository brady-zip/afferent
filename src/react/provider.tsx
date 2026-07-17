// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { createContext, createElement, useContext, useRef } from "react";
// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import type { ReactNode } from "react";

import type { AfferentBindings } from "./bindings.js";
import type { AfferentWatchClient } from "./query.js";

export type AfferentAuthState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "unauthenticated" }>
  | Readonly<{
      status: "authenticated";
      identityToken: string;
    }>;

export interface AfferentContextValue {
  bindings: AfferentBindings;
  auth: AfferentAuthState;
  client: AfferentWatchClient;
  generation: number;
  sessionKey: string;
}

export function getAfferentSessionKey(auth: AfferentAuthState): string {
  if (auth.status !== "authenticated") return auth.status;
  if (auth.identityToken.trim().length === 0) {
    throw new Error("Afferent authenticated identityToken must be non-empty");
  }
  return "authenticated";
}

const AfferentContext = createContext(undefined) as {
  Provider: unknown;
};

export function AfferentProvider({
  bindings,
  auth,
  client,
  children,
}: Readonly<{
  bindings: AfferentBindings;
  auth: AfferentAuthState;
  client: AfferentWatchClient;
  children: ReactNode;
}>) {
  getAfferentSessionKey(auth);
  const identity = useRef({
    status: auth.status,
    token: auth.status === "authenticated" ? auth.identityToken : undefined,
    generation: 1,
  });
  const token =
    auth.status === "authenticated" ? auth.identityToken : undefined;
  if (
    identity.current.status !== auth.status ||
    identity.current.token !== token
  ) {
    identity.current = {
      status: auth.status,
      token,
      generation: identity.current.generation + 1,
    };
  }
  const generation = identity.current.generation;
  const sessionKey = `generation:${generation}`;
  return createElement(
    AfferentContext.Provider,
    { value: { bindings, auth, client, generation, sessionKey } },
    children,
  );
}

export function useAfferentContext() {
  const value = useContext(AfferentContext) as AfferentContextValue | undefined;
  if (value === undefined) {
    throw new Error("useAfferentContext requires an AfferentProvider");
  }
  return value;
}
