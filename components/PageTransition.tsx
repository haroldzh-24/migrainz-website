"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isGraphicsPath } from "@/lib/graphics-mode";

// Design canvas board 19: moving between terminal pages wipes the new page in from the top when going deeper (or to a
// page at the same depth) and from the bottom when going back up, with a bright scan band leading the edge. Only the
// part of the page that is on screen is wiped, so a long page reads as a wipe, not a pop. Not for the grey-window
// desktop (it has its own switch, ModeSwitch), the first render, the boot's power-on, or arrival at "/" (the main open
// screen keeps its own arrival). Reduced motion or CRT off: a cut. CRT "reduced": the wipe without the band (a bloom).
// Never blocks input; the clip is gone the moment the 460 ms animation ends.

type Direction = "down" | "up";
type Band = { direction: Direction; token: number; top: number; height: number };

const CAP_MS = 1200;
const depth = (path: string) => path.split("/").filter(Boolean).length;
const plain = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.crt === "off";

export default function PageTransition() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  const token = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [band, setBand] = useState<Band | null>(null);

  // Before paint, so the new page never shows in full for a frame first.
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    if (from === null || from === pathname) return;
    const main = document.querySelector<HTMLElement>("main#top");
    if (!main || main.classList.contains("power-on")) return;
    if (pathname === "/" || isGraphicsPath(pathname) || isGraphicsPath(from) || document.querySelector(".graphics-route")) return;
    const direction: Direction = depth(pathname) < depth(from) ? "up" : "down";
    const mine = ++token.current;
    window.clearTimeout(timer.current);
    main.removeAttribute("data-page-enter");
    let animated = false;
    if (!plain()) {
      // The part of <main> on screen: below the screen's top, above its bottom and the phone tab bar.
      const box = main.getBoundingClientRect();
      const tabs = document.querySelector<HTMLElement>(".phone-tabs");
      const tabsTop = tabs && getComputedStyle(tabs).display !== "none" ? tabs.getBoundingClientRect().top : Infinity;
      const top = Math.max(box.top, 0);
      const bottom = Math.min(box.bottom, window.innerHeight, tabsTop);
      if (bottom - top > 1) {
        main.style.setProperty("--enter-top", `${top - box.top}px`);
        main.style.setProperty("--enter-bottom", `${bottom - box.top}px`);
        void main.offsetWidth; // a second move in the same direction restarts the animation
        main.setAttribute("data-page-enter", direction);
        animated = true;
        const finish = () => {
          if (token.current !== mine) return;
          window.clearTimeout(timer.current);
          main.removeAttribute("data-page-enter");
          setBand(null);
        };
        const own = main.getAnimations().filter(animation => (animation as CSSAnimation).animationName?.startsWith("page-enter"));
        Promise.allSettled(own.map(animation => animation.finished)).then(finish);
        timer.current = window.setTimeout(finish, CAP_MS);
        setBand(document.documentElement.dataset.crt === "on" ? { direction, token: mine, top, height: bottom - top } : null);
      } else setBand(null);
    } else setBand(null);
    window.dispatchEvent(new CustomEvent("migrainz:page-enter", { detail: { direction, animated, from, to: pathname } }));
  }, [pathname]);

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    document.querySelector("main#top")?.removeAttribute("data-page-enter");
  }, []);

  if (!band) return null;
  return (
    <div key={band.token} className="page-band" data-direction={band.direction} aria-hidden="true"
      style={{ top: band.top, height: band.height, ["--band-span" as string]: `${band.height}px` }}>
      <i />
    </div>
  );
}
