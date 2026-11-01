import type { ReactNode } from "react";
import { useIsDesktop } from "../lib/useIsDesktop";

/**
 * The screen's one h1. Below the desktop breakpoint the top bar carries the
 * screen's name as the h1 instead, so there is never more than one.
 */
export function PageTitle({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  const desktop = useIsDesktop();
  if (!desktop) return null;
  return (
    <h1 id={id} className="text-[22px] leading-7 font-semibold">
      {children}
    </h1>
  );
}
