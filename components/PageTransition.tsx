"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { arrival } from "@/lib/arrival";
import { isGraphicsPath } from "@/lib/graphics-mode";

// Design canvas board 19: moving between terminal pages wipes the new page in from the top when going deeper (or to a
// page at the same depth) and from the bottom when going back: the browser's Back button always wipes from the bottom
// (Harold, 2026-11-04: "from the bottom so it looks best"), and so does a link up to a shallower page. A scan band leads
// the edge. Only the part of the page that is on screen is wiped, so a long page reads as a wipe, not a pop. Not for the
// grey-window desktop (it has its own switch, ModeSwitch, which also decides from the path), the first render, the
// boot's power-on, or arrival at "/" (the main open screen keeps its own arrival). Reduced motion or CRT off: a cut.
// CRT "reduced": the wipe without the band. Clicks on the part already shown go through; the clip is gone the moment
// the 460 ms animation ends, and any move away cancels a wipe still running (13b).

type Direction = "down" | "up";
type Band = { direction: Direction; token: number; top: number; height: number };
type Traverse = { path: string; back: boolean };
type NavigationLike = EventTarget & { currentEntry?: { index: number } | null };

const CAP_MS = 1200;
const TRAIL_LIMIT = 50;
const depth = (path: string) => path.split("/").filter(Boolean).length;
const plain = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.crt === "off";
const navigationApi = () => (window as unknown as { navigation?: NavigationLike }).navigation;

export default function PageTransition() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  const token = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [band, setBand] = useState<Band | null>(null);
  // Back or Forward (13b): the Navigation API says which way a history move went (by entry index); without it, a trail
  // of visited paths with a cursor stands in (14b): a history move to the entry before the cursor counts as Back, to the
  // one after it as Forward, and a link drops everything after the cursor, like the browser's own history. After a
  // reload the trail starts again from that page (recorded in bugs.md).
  const traverse = useRef<Traverse | null>(null);
  const trail = useRef<{ paths: string[]; at: number }>({ paths: [], at: -1 });

  useEffect(() => {
    const api = navigationApi();
    if (api && api.currentEntry) {
      const changed = (event: Event) => {
        const { navigationType, from } = event as Event & { navigationType?: string; from?: { index: number } };
        if (navigationType !== "traverse" || !from || !api.currentEntry) return;
        traverse.current = { path: location.pathname, back: api.currentEntry.index < from.index };
      };
      api.addEventListener("currententrychange", changed);
      return () => api.removeEventListener("currententrychange", changed);
    }
    const popped = () => {
      const path = location.pathname;
      const { paths, at } = trail.current;
      // When both readings fit (A → B → A, then two Backs), Back wins: it is by far the more common move (16b).
      traverse.current = { path, back: at > 0 && paths[at - 1] === path };
    };
    window.addEventListener("popstate", popped);
    return () => window.removeEventListener("popstate", popped);
  }, []);

  // Before paint, so the new page never shows in full for a frame first.
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    const moved = traverse.current?.path === pathname ? traverse.current : null;
    traverse.current = null;
    if (from !== pathname) {
      const record = trail.current;
      if (moved?.back) record.at = Math.max(0, record.at - 1);
      else if (moved && record.paths[record.at + 1] === pathname) record.at += 1;
      else {
        record.paths = [...record.paths.slice(0, record.at + 1), pathname].slice(-TRAIL_LIMIT);
        record.at = record.paths.length - 1;
      }
    }
    if (from === null || from === pathname) return;
    // Any move cancels a wipe still running, even to a page that gets none (13b).
    const mine = ++token.current;
    window.clearTimeout(timer.current);
    const main = document.querySelector<HTMLElement>("main#top");
    main?.removeAttribute("data-page-enter");
    setBand(null);
    if (!main || main.classList.contains("power-on") || document.documentElement.dataset.power !== "on") return;
    if (pathname === "/" || isGraphicsPath(pathname) || isGraphicsPath(from) || document.querySelector(".graphics-route")) return;
    const direction: Direction = moved?.back || depth(pathname) < depth(from) ? "up" : "down";
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
      }
    }
    // Recorded too (batch 17), for page typing that must wait for the wipe even when it decides after this event.
    arrival.enter = { to: pathname, at: performance.now(), animated };
    window.dispatchEvent(new CustomEvent("migrainz:page-enter", { detail: { direction, animated, from, to: pathname } }));
  }, [pathname]);

  // After every layout effect of this render (batch 14): the app has hydrated, and the page now shown is the one the
  // next arrival comes from.
  useEffect(() => {
    arrival.hydrated = true;
    arrival.lastPath = pathname;
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
