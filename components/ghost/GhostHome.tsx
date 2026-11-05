"use client";

import { useEffect } from "react";
import { WATCHER_GLANCE_EVENT } from "@/components/Watcher";
import { ghost } from "@/lib/ghost";
import { afterIdle } from "@/lib/idle";

// Batch 20: two of the ghost's homepage stunts (each one of the visit's ambient events, so at most one of them, and
// rarely). The Watcher: after 30 s idle its eyes slide to the REQUISITIONS item and hold there about 4 s (any pointer
// move hands them back, as the Watcher follows the pointer). Amber: after 12 s on the page the screen goes amber while
// the ghost says "this is my good side.", then back; the visitor's saved phosphor setting is never touched, and if they
// change it meanwhile, their choice wins. Leaving the page mid-pitch puts the colour back.
const WATCHER_IDLE_MS = 30000;
const WATCHER_HOLD_MS = 4000;
const AMBER_AFTER_MS = 12000;
const AMBER_MS = 4500;
const AMBER_FILES = ["/images/watcher/watcher-base.amber.webp", "/images/watcher/watcher-eyes.amber.webp", "/images/watcher/crt-noise.amber.png"];

// Quiet: shown in the terminal but hidden from screen readers (a stunt, not output; 20b).
const say = (lines: string[]) => window.dispatchEvent(new CustomEvent("migrainz:ghost-say", { detail: { lines, quiet: true } }));
// The PHOSPHOR button follows the screen during the pitch (20b).
const announce = (value: string) => window.dispatchEvent(new CustomEvent("migrainz:display-mode", { detail: { attribute: "phosphor", value } }));
// The page is still booting, turning, typing or switching: wait for it (the stunt must never land on top of those).
const unsettled = () => {
  const root = document.documentElement;
  return Boolean(root.dataset.busy) || root.dataset.power !== "on" || Boolean(document.querySelector(".startup-sequence, main#top.power-on"));
};

function preload(sources: string[], timeout: number): Promise<boolean> {
  return Promise.race([
    Promise.all(sources.map(src => new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(); image.onerror = reject; image.src = src; }))).then(() => true, () => false),
    new Promise<boolean>(resolve => window.setTimeout(() => resolve(false), timeout)),
  ]);
}

export default function GhostHome() {
  useEffect(() => {
    let cancelled = false, retry = 0, amberTimer = 0, restoreTimer = 0;
    // Activity cancels a pending retry of the Watcher's look; afterIdle then waits the full idle time again (20b).
    const cancelRetry = () => window.clearTimeout(retry);
    const ACTIVITY = ["keydown", "pointermove", "pointerdown", "wheel", "touchstart"] as const;
    const watching = ghost.drawn("watcher"); // only the visit that drew the Watcher's look listens (20c)
    if (watching) for (const type of ACTIVITY) window.addEventListener(type, cancelRetry, { passive: true, capture: true });
    let stopWatch = () => {}, restore = () => {};

    // The Watcher looks at the shop.
    const stopIdle = !watching ? () => {} : afterIdle(ghost.delay("watcher", WATCHER_IDLE_MS), function look() {
      if (cancelled) return;
      if (unsettled()) { retry = window.setTimeout(look, 1000); return; }
      const target = document.querySelector<HTMLElement>("#shop .nav-trigger");
      if (!target || !ghost.claim("watcher")) return;
      stopIdle();
      const box = target.getBoundingClientRect();
      window.dispatchEvent(new CustomEvent(WATCHER_GLANCE_EVENT, { detail: { x: box.left + box.width / 2, y: box.top + box.height / 2, hold: WATCHER_HOLD_MS } }));
      window.dispatchEvent(new CustomEvent("migrainz:ghost", { detail: { name: "watcher" } }));
    });

    // The amber pitch.
    const pitch = async () => {
      if (cancelled) return;
      if (unsettled()) { amberTimer = window.setTimeout(pitch, 1000); return; }
      const root = document.documentElement;
      if ((root.dataset.phosphor ?? "green") !== "green" || root.dataset.crt === "off") return;
      if (!ghost.claim("amber")) return;
      // The amber Watcher face and grain are only fetched when amber is on: load them first, or skip the pitch.
      if (!(await preload(AMBER_FILES, 2000)) || cancelled || root.dataset.phosphor !== "green") return;
      root.dataset.phosphor = "amber";
      announce("amber");
      say(["this is my good side."]);
      window.dispatchEvent(new CustomEvent("migrainz:ghost", { detail: { name: "amber" } }));
      // Someone else changing the phosphor (the SYSTEM menu, the terminal) ends the pitch and keeps their choice.
      let mine = true;
      const watch = new MutationObserver(() => { if (root.dataset.phosphor !== "amber") mine = false; });
      watch.observe(root, { attributes: true, attributeFilter: ["data-phosphor"] });
      stopWatch = () => watch.disconnect();
      restore = () => {
        stopWatch();
        restore = () => {};
        let saved: string | null = null;
        try { saved = localStorage.getItem("crt-phosphor"); } catch { /* none saved */ }
        if (mine && root.dataset.phosphor === "amber" && saved !== "amber") { root.dataset.phosphor = "green"; announce("green"); }
      };
      restoreTimer = window.setTimeout(() => restore(), AMBER_MS);
    };
    amberTimer = window.setTimeout(pitch, ghost.delay("amber", AMBER_AFTER_MS));

    return () => {
      cancelled = true;
      stopIdle();
      for (const type of ACTIVITY) window.removeEventListener(type, cancelRetry, { capture: true });
      window.clearTimeout(retry);
      window.clearTimeout(amberTimer);
      window.clearTimeout(restoreTimer);
      restore();
    };
  }, []);
  return null;
}
