import type { AnchorHTMLAttributes, ComponentType, ReactNode } from "react";

export type AfferentHrefBuilder = Readonly<{
  post: (id: string) => string;
  roadmap: (boardId?: string) => string;
  changelog: (slug: string) => string;
}>;

export type AfferentLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  Readonly<{ href: string; children: ReactNode }>;

export type AfferentLinkComponent = ComponentType<AfferentLinkProps>;

export type AfferentNavigation = Readonly<{
  href: AfferentHrefBuilder;
  Link: AfferentLinkComponent;
  navigate?: (href: string) => void;
  currentLocation: string;
}>;

export function NativeAfferentLink(props: AfferentLinkProps) {
  return <a {...props} />;
}
