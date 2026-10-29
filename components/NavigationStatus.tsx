"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isGraphicsPath } from "@/lib/graphics-mode";

// Design canvas board 10 (left half): a terminal page that takes longer than about 300 ms to arrive gets an in-world
// status instead of a page that seems to ignore the click. Fast pages never show it. The lines are what is known (where
// the visitor is going; the request went out; how long the server has taken so far), never a made-up progress figure.
// Not for the grey-window desktop (the switch has its own LOADING VOLUME line, ModeSwitch), downloads, the admin or
// sign-in routes, files, or links marked data-mode-switch="off" (their own click handlers decide what happens).
const DELAY_MS = 300;
const GIVE_UP_MS = 20000;
const LAST_WORD_MS = 2000;

type Pending = { from: string; path: string; started: number };

const graphicsShown = () => document.querySelector(".graphics-route") !== null;
const keyOf = (url: URL) => url.pathname + url.search;
const moved = (run: Pending) => keyOf(new URL(window.location.href)) !== run.from;
/** Pages of this app that a link can open in place (no API, admin, sign-in, build files or file downloads). */
const appPage = (url: URL) => !/^\/(api|admin|auth|_next)(\/|$)/.test(url.pathname) && !/\.[a-z0-9]{1,5}$/i.test(url.pathname);
const readable = (path: string) => {
  let text = path;
  try { text = decodeURIComponent(path); } catch {}
  return text.replace(/^\/|\/$/g, "").toLowerCase().split("/").join(" / ");
};

export default function NavigationStatus() {
  const pathname = usePathname();
  const pending = useRef<Pending | null>(null);
  const timers = useRef<number[]>([]);
  const [shown, setShown] = useState<{ path: string; started: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [late, setLate] = useState(false);

  const clear = () => {
    timers.current.forEach(timer => window.clearTimeout(timer));
    timers.current = [];
  };
  const stop = () => {
    clear();
    pending.current = null;
    setShown(null);
    setLate(false);
  };
  const stopRef = useRef(stop);
  stopRef.current = stop;

  // Arrival: the address changed (to the target or anywhere else).
  useEffect(() => {
    if (pending.current && moved(pending.current)) stopRef.current();
  }, [pathname]);

  useEffect(() => {
    const begin = (href: string) => {
      const url = new URL(href, window.location.href);
      const here = new URL(window.location.href);
      if (url.origin !== here.origin || !appPage(url) || keyOf(url) === keyOf(here)) return;
      // The desktop and the switch into it have their own loading line.
      if (graphicsShown() || isGraphicsPath(url.pathname)) return;
      stopRef.current();
      const run: Pending = { from: keyOf(here), path: url.pathname, started: performance.now() };
      pending.current = run;
      timers.current.push(window.setTimeout(() => {
        if (pending.current !== run) return;
        if (moved(run)) { stopRef.current(); return; }
        setShown({ path: run.path, started: run.started });
      }, DELAY_MS));
      timers.current.push(window.setTimeout(() => {
        if (pending.current !== run) return;
        setLate(true);
        timers.current.push(window.setTimeout(() => { if (pending.current === run) stopRef.current(); }, LAST_WORD_MS));
      }, GIVE_UP_MS));
    };
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download") || anchor.closest('[data-mode-switch="off"]')) return;
      begin(anchor.href);
    };
    // The homepage terminal's cd/open: only when nothing took the request over (ModeSwitch cancels the event when it plays
    // the switch). Read once every listener has run, so the order the listeners were added in does not matter.
    const onOpenRoute = (event: Event) => {
      const href = (event as CustomEvent<{ href?: string }>).detail?.href;
      if (href) queueMicrotask(() => { if (!event.defaultPrevented) begin(href); });
    };
    // Any stage of the switch means it has the screen; Back or Forward means the visitor went elsewhere. A page restored
    // from the back/forward cache (after a full-page load, e.g. Next's reload when a tab meets a new deploy) fires no
    // popstate, so pageshow ends a status it was frozen with (11b).
    const onStage = () => stopRef.current();
    const onPop = () => stopRef.current();
    const onShow = (event: PageTransitionEvent) => { if (event.persisted) stopRef.current(); };
    window.addEventListener("click", onClick, true);
    window.addEventListener("migrainz:open-route", onOpenRoute);
    window.addEventListener("migrainz:mode-stage", onStage);
    window.addEventListener("popstate", onPop);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("migrainz:open-route", onOpenRoute);
      window.removeEventListener("migrainz:mode-stage", onStage);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pageshow", onShow);
      clear();
    };
  }, []);

  useEffect(() => {
    if (!shown) return;
    // A change of query only (same path) does not re-render this component, so the tick also watches the address.
    const tick = () => {
      if (pending.current && moved(pending.current)) { stopRef.current(); return; }
      setElapsed(performance.now() - shown.started);
    };
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [shown]);

  const sys = shown ? "SYS:" + (shown.path === "/" ? "/HOME" : shown.path.toUpperCase()) : "";
  // Plain words for screen readers ("Loading page: projects / blushland"), not the SYS: path read letter by letter.
  const place = shown ? (shown.path === "/" ? "home" : readable(shown.path)) : "";
  return <>
    {/* Always present, so screen readers announce the text when it is filled in. */}
    <div className="visually-hidden" role="status">{shown ? `Loading page: ${place}${late ? "; no answer yet" : ""}` : ""}</div>
    {shown && <div className="nav-status" aria-hidden="true">
      <p>&gt; ACCESSING {sys}</p>
      <p>  request sent</p>
      <p>  waiting for node <span className="nav-status-leader">........ </span>{(elapsed / 1000).toFixed(1)} s</p>
      {late ? <p>  no answer yet; the page may still arrive</p> : <p>&gt; <span className="nav-status-cursor">_</span></p>}
    </div>}
  </>;
}
