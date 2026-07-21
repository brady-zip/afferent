import type { ReactNode } from "react";

import { cn } from "@/components/afferent/core/utils";

export function AfferentStateRegion({
  title,
  children,
  action,
  tone = "neutral",
  className,
}: Readonly<{
  title: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "error";
  className?: string;
}>) {
  return (
    <section
      className={cn("afferent-state", className)}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <h2>{title}</h2>
      {children ? <div>{children}</div> : null}
      {action ? <div className="afferent-state__action">{action}</div> : null}
    </section>
  );
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled Afferent state: ${JSON.stringify(value)}`);
}
