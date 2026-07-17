"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  mergeAfferentUiCopy,
  type AfferentUiCopy,
  type DeepPartial,
} from "@/components/afferent/core/copy";
import {
  defaultAfferentIcons,
  type AfferentIconSlots,
} from "@/components/afferent/core/icons";
import {
  NativeAfferentLink,
  type AfferentHrefBuilder,
  type AfferentLinkComponent,
  type AfferentNavigation,
} from "@/components/afferent/core/navigation";

export type AfferentUiContextValue = Readonly<{
  copy: AfferentUiCopy;
  icons: AfferentIconSlots;
  navigation: AfferentNavigation;
}>;

const AfferentUiContext = createContext<AfferentUiContextValue | undefined>(
  undefined,
);

export function AfferentUiProvider({
  children,
  copy,
  icons,
  href,
  Link = NativeAfferentLink,
  navigate,
  currentLocation,
}: Readonly<{
  children: ReactNode;
  copy?: DeepPartial<AfferentUiCopy>;
  icons?: Partial<AfferentIconSlots>;
  href: AfferentHrefBuilder;
  Link?: AfferentLinkComponent;
  navigate?: (href: string) => void;
  currentLocation: string;
}>) {
  const value = useMemo<AfferentUiContextValue>(
    () => ({
      copy: mergeAfferentUiCopy(copy),
      icons: { ...defaultAfferentIcons, ...icons },
      navigation: { href, Link, navigate, currentLocation },
    }),
    [copy, icons, href, Link, navigate, currentLocation],
  );
  return (
    <AfferentUiContext.Provider value={value}>
      {children}
    </AfferentUiContext.Provider>
  );
}

export function useAfferentUi() {
  const value = useContext(AfferentUiContext);
  if (!value) {
    throw new Error("useAfferentUi requires an AfferentUiProvider");
  }
  return value;
}
