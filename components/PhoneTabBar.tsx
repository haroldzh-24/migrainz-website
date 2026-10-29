"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Phone and tablet tab bar (design canvas board 5): five sections at the bottom of terminal pages wherever the header's
// section links are hidden (860 px and narrower). The grey-window desktop has its own taskbar (CSS hides this bar there),
// and so does an open window or the SYSTEM monitor. Board 5 had four tabs; TRACKER was added on Harold's word
// (2026-10-29).
const TABS = [
  { href: "/", label: "HOME", icon: "▣", section: /^\/$/ },
  { href: "/projects", label: "PROJECTS", icon: "▤", section: /^\/projects(\/|$)/ },
  { href: "/comics", label: "COMICS", icon: "▥", section: /^\/comics(\/|$)/ },
  { href: "/archive", label: "ARCHIVE", icon: "▦", section: /^\/archive(\/|$)/ },
  { href: "/tracker", label: "TRACKER", icon: "▧", section: /^\/tracker(\/|$)/ },
];

export default function PhoneTabBar() {
  const pathname = usePathname();
  const bar = useRef<HTMLElement>(null);
  // Keyboard focus is never hidden under the bar (WCAG 2.4.11): a browser does not scroll a control that is still inside
  // the viewport even when this fixed bar covers it, so one frame after its own focus scrolling the page moves up by the
  // overlap (never pushing the control past the top). Keyboard focus only; a tap does not move the page.
  useEffect(() => {
    let frame = 0;
    const onFocus = (event: FocusEvent) => {
      const element = event.target as HTMLElement | null;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const own = bar.current;
        if (!own || !element?.isConnected || own.contains(element) || !element.matches(":focus-visible") || getComputedStyle(own).display === "none") return;
        if (element.closest(".public-window-layer, .pixel-monitor, .promo-window, .startup-sequence")) return;
        const top = own.getBoundingClientRect().top;
        const rect = element.getBoundingClientRect();
        // Not for containers focused by script (tabindex="-1": the page's main section after a window closes, with
        // preventScroll), nor for a control taller than the space above the bar whose top already shows: moving those
        // would only scroll the header away. A tall control whose top is under the bar still moves (8c).
        if (rect.bottom <= top - 4 || element.getAttribute("tabindex") === "-1" || (rect.height > top - 16 && rect.top < top - 4)) return;
        window.scrollBy({ top: Math.max(0, Math.min(rect.bottom - top + 16, rect.top - 8)), behavior: "instant" as ScrollBehavior });
      });
    };
    document.addEventListener("focusin", onFocus);
    return () => { document.removeEventListener("focusin", onFocus); cancelAnimationFrame(frame); };
  }, []);
  return (
    <nav ref={bar} className="phone-tabs" aria-label="Main">
      {TABS.map(tab => (
        // "page" on the section's own page, "true" anywhere inside the section.
        <Link key={tab.href} href={tab.href} prefetch={false} aria-current={pathname === tab.href ? "page" : tab.section.test(pathname) ? "true" : undefined}>
          <span aria-hidden="true">{tab.icon}</span>{tab.label}
        </Link>
      ))}
    </nav>
  );
}
