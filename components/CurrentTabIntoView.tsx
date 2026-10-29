"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * A row of tabs that scrolls sideways on phones: on load, the current tab (aria-current) is scrolled into the row's view,
 * without moving the page.
 */
export default function CurrentTabIntoView({ className, label, children }: { className: string; label: string; children: ReactNode }) {
  const row = useRef<HTMLElement>(null);
  // Before the first paint, so the row never shows scrolled to the start and then jumps (8c).
  useLayoutEffect(() => {
    const nav = row.current;
    const current = nav?.querySelector<HTMLElement>("[aria-current]");
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = Math.max(0, nav.scrollLeft + current.getBoundingClientRect().left - nav.getBoundingClientRect().left - 16);
  }, []);
  return <nav ref={row} className={className} aria-label={label}>{children}</nav>;
}
