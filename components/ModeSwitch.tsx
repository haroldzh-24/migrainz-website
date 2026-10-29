"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PrefetchOptions } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { GRAPHICS_LINES, LAST_TERMINAL_KEY, fileForPath, isGraphicsPath } from "@/lib/graphics-mode";

/**
 * The switch between the green terminal and the grey-window desktop (design canvas board 2; Harold, 2026-10-29: "the
 * terminal to windows grey transition everytime you go into the grey windows"). Following a link from a terminal page
 * to a route that opens a grey window prints the mount lines, collapses the screen to a bright line, shrinks the line,
 * goes black until the route is there, then fades the desktop in, every time. Coming back (the ◂ TERMINAL button, a
 * RETURN link, browser Back) runs it in reverse: black, the line grows, the screen opens. Arriving on the desktop any
 * other way (browser Forward, a push from code) is a short flick. Reduced motion or CRT "off": a plain crossfade.
 * A plain key, click or tap during the print, collapse or line skips to the end; other keys pass. Pages say which mode
 * they are in with <GraphicsRouteMarker /> (components/GraphicsRouteMarker.tsx); a link can opt out with data-mode-switch="off".
 * Durations are mirrored in globals.css ("The switch itself").
 */
export const MODE_TIMING = { step: 70, hold: 120, collapse: 200, line: 170, black: 140, reveal: 240, fade: 160, rblack: 60, rline: 170, ropen: 200, settle: 400, slow: 1200, wait: 15000, doubleClick: 250 };

type Stage = "idle" | "print" | "collapse" | "line" | "black" | "reveal" | "fade-in" | "fade-out" | "rblack" | "rline" | "ropen";
type Forward = { from: string; pushed: boolean; started: number; push: () => void };

const graphicsShown = () => Boolean(document.querySelector(".graphics-route"));
const plain = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.crt === "off";
const skippable = (stage: Stage) => stage === "print" || stage === "collapse" || stage === "line";

export default function ModeSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const [stage, setStage] = useState<Stage>("idle");
  const [lines, setLines] = useState<string[]>([]);
  // A slow server: after a moment of black, a small "LOADING VOLUME" line shows the switch is still working.
  const [slow, setSlow] = useState(false);
  const timers = useRef<number[]>([]);
  const forward = useRef<Forward | null>(null);
  const wasGraphics = useRef<boolean | null>(null);
  const routerRef = useRef(router);
  routerRef.current = router;

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (ms: number, run: () => void) => { timers.current.push(window.setTimeout(run, ms)); };
  const finish = () => { clear(); forward.current = null; setStage("idle"); setLines([]); setSlow(false); };
  // After the reverse, focus that sat on a control that is gone or hidden now (◂ TERMINAL, RETURN TO TERMINAL) goes to
  // the page's main section instead of falling to <body>.
  const settleFocus = () => {
    const active = document.activeElement;
    if (!active || active === document.body || !(active as HTMLElement).isConnected || !(active as HTMLElement).getClientRects().length) {
      document.getElementById("top")?.focus({ preventScroll: true });
    }
  };

  // Calls `done` once the pushed route has replaced the page: the URL changed and the desktop marker is there (or the
  // new page settled without one, e.g. a missing record's 404), or the wait ran out.
  const whenArrived = (run: Forward, done: () => void) => {
    const start = performance.now();
    let moved = 0;
    later(MODE_TIMING.slow, () => { if (forward.current === run) setSlow(true); });
    const check = () => {
      if (forward.current !== run) return;
      const now = performance.now();
      if (!moved && window.location.pathname !== run.from) moved = now;
      if ((moved && (graphicsShown() || now - moved > MODE_TIMING.settle)) || now - start > MODE_TIMING.wait) {
        // Two frames so the route window (portalled after hydration effects) is painted under the cover.
        requestAnimationFrame(() => requestAnimationFrame(() => { if (forward.current === run) done(); }));
        return;
      }
      later(30, check);
    };
    check();
  };

  // Forward: terminal page to a grey-window route.
  const open = (href: string) => {
    const url = new URL(href, window.location.href);
    const path = url.pathname + url.search + url.hash;
    clear();
    // The routes are dynamic, which Next does not prefetch on its own: ask for the full route now (what
    // <Link prefetch={true}> does), so the server works while the animation runs and the push finds it ready.
    try { routerRef.current.prefetch(path, { kind: "full" } as unknown as PrefetchOptions); } catch { /* best effort */ }
    const run: Forward = { from: window.location.pathname, pushed: false, started: performance.now(), push: () => { if (!run.pushed) { run.pushed = true; routerRef.current.push(path); } } };
    forward.current = run;
    if (plain()) {
      setLines([]);
      setStage("fade-in");
      later(MODE_TIMING.fade, () => {
        run.push();
        whenArrived(run, () => { setStage("fade-out"); later(MODE_TIMING.fade, finish); });
      });
      return;
    }
    const all = [`$ open ${fileForPath(url.pathname)}`, ...GRAPHICS_LINES];
    setLines([]);
    setStage("print");
    all.forEach((line, index) => later(MODE_TIMING.step * (index + 1), () => setLines(all.slice(0, index + 1))));
    let at = MODE_TIMING.step * all.length + MODE_TIMING.hold;
    later(at, () => setStage("collapse"));
    at += MODE_TIMING.collapse;
    later(at, () => { setStage("line"); setLines([]); });
    at += MODE_TIMING.line;
    later(at, () => {
      setStage("black");
      run.push();
      later(MODE_TIMING.black, () => whenArrived(run, () => { setStage("reveal"); later(MODE_TIMING.reveal, finish); }));
    });
  };

  // Skip: during the print, collapse and line stages, go straight to black and show the desktop as soon as it is there.
  const skip = () => {
    const run = forward.current;
    if (!run || run.pushed) return;
    clear();
    setLines([]);
    setStage("black");
    run.push();
    whenArrived(run, finish);
  };
  const skipRef = useRef(skip);
  skipRef.current = skip;
  const openRef = useRef(open);
  openRef.current = open;

  // Links and the homepage terminal. Capture on window runs before React's handlers, so next/link sees the click as
  // handled (defaultPrevented) and leaves the navigation to this component.
  useEffect(() => {
    const follow = (href: string) => {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || !isGraphicsPath(url.pathname) || url.pathname === window.location.pathname) return false;
      if (graphicsShown() || forward.current) return false;
      openRef.current(url.href);
      return true;
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download") || anchor.closest('[data-mode-switch="off"]')) return;
      if (follow(anchor.href)) event.preventDefault();
    };
    const onOpenRoute = (event: Event) => {
      const href = (event as CustomEvent<{ href?: string }>).detail?.href;
      if (href && follow(href)) event.preventDefault();
    };
    // Browser Back or Forward before the push: the switch is abandoned.
    const onPop = () => { if (forward.current && !forward.current.pushed) finish(); };
    window.addEventListener("click", onClick, true);
    window.addEventListener("migrainz:open-route", onOpenRoute);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("migrainz:open-route", onOpenRoute);
      window.removeEventListener("popstate", onPop);
      clear();
    };
    // finish only touches refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keys while the switch runs: plain keys never reach the page underneath (focus is still on the link or the terminal
  // input); during the print, collapse and line they skip. Shortcuts with Ctrl, Alt or Meta, function keys, auto-repeat
  // (the held Enter that followed the link) and IME composition pass through untouched.
  useEffect(() => {
    if (stage === "idle") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing || /^F\d{1,2}$/.test(event.key) || ["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat && skippable(stage)) skipRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [stage]);

  // Every route change: remember the last terminal page, tell the taskbar, and play the reverse (or the flick) when the
  // mode changed without the forward run. Layout effect: the cover goes up before the new page is painted.
  useLayoutEffect(() => {
    const now = graphicsShown();
    const before = wasGraphics.current;
    wasGraphics.current = now;
    if (!now && !document.querySelector("[data-not-found]")) {
      try { sessionStorage.setItem(LAST_TERMINAL_KEY, pathname); } catch { /* optional storage */ }
    }
    window.dispatchEvent(new CustomEvent("migrainz:mode", { detail: { graphics: now } }));
    if (before === null || before === now || forward.current) return;
    clear();
    setLines([]);
    const done = () => { finish(); if (!now) settleFocus(); };
    if (plain()) {
      setStage("fade-out");
      later(MODE_TIMING.fade, done);
    } else if (now) {
      setStage("black");
      later(MODE_TIMING.black, () => { setStage("reveal"); later(MODE_TIMING.reveal, done); });
    } else {
      setStage("rblack");
      later(MODE_TIMING.rblack, () => setStage("rline"));
      later(MODE_TIMING.rblack + MODE_TIMING.rline, () => setStage("ropen"));
      later(MODE_TIMING.rblack + MODE_TIMING.rline + MODE_TIMING.ropen, done);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Windows start below the header on the desktop (design canvas board 14): the window layer reads the header's bottom
  // edge as it is on screen (it scrolls with the page), so a maximized window never covers SYSTEM.
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".topbar");
    if (!header) return;
    let frame = 0;
    const measure = () => { frame = 0; document.documentElement.style.setProperty("--header-bottom", `${Math.max(0, Math.round(header.getBoundingClientRect().bottom))}px`); };
    const soon = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    const resize = new ResizeObserver(soon);
    resize.observe(header);
    window.addEventListener("scroll", soon, { passive: true });
    window.addEventListener("resize", soon);
    return () => { resize.disconnect(); window.removeEventListener("scroll", soon); window.removeEventListener("resize", soon); cancelAnimationFrame(frame); };
  }, []);

  return (
    <div className="mode-switch" data-stage={stage} hidden={stage === "idle"} aria-hidden="true"
      onPointerDown={event => {
        // A primary press skips, except the second click of a double-click right after the run started.
        const run = forward.current;
        if (!skippable(stage) || event.button !== 0 || !event.isPrimary || (run && performance.now() - run.started < MODE_TIMING.doubleClick)) return;
        skip();
      }}>
      {lines.length > 0 && <ol className="mode-switch-log">{lines.map((line, index) => <li key={index}>{line}</li>)}</ol>}
      {slow && <p className="mode-switch-wait">LOADING VOLUME<span>_</span></p>}
      <i className="mode-switch-bar" data-edge="top" />
      <i className="mode-switch-bar" data-edge="bottom" />
      <i className="mode-switch-line" />
    </div>
  );
}
