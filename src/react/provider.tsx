// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { createContext, createElement, useContext } from "react";
// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import type { ReactNode } from "react";

import type { AfferentBindings } from "./bindings.js";

export type AfferentAuthState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "unauthenticated" }>
  | Readonly<{
      status: "authenticated";
      sessionGeneration?: string;
    }>;

export interface AfferentContextValue {
  bindings: AfferentBindings;
  auth: AfferentAuthState;
}

const AfferentContext = createContext(undefined) as {
  Provider: unknown;
};

export function AfferentProvider({
  bindings,
  auth,
  children,
}: Readonly<{
  bindings: AfferentBindings;
  auth: AfferentAuthState;
  children: ReactNode;
}>) {
  return createElement(
    AfferentContext.Provider,
    { value: { bindings, auth } },
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
