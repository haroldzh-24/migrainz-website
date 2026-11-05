"use client";

import { useEffect } from "react";
import { ghost } from "@/lib/ghost";

// Batch 18: the ghost's site-wide bits that need no page of their own. Counts the visit once per tab session (so the
// rarity rules in lib/ghost.ts work from the first page), leaves a message in the browser's developer console for
// anyone who looks (once per visit, from the second visit), and, on about 1 visit in 3, renames the tab after it has
// been in the background for 20 seconds, then says "you left me running" for 3 s when you come back. The title is only
// restored if it is still the ghost's (a page change may have set a new one). Never on a first visit or once exorcised.

const AWAY_MS = 20000;
const BACK_MS = 3000;
const AWAY_TITLES = ["come back", "the shop is still open", "i'm cold. patreon is warm."];
const EYE = [
  "    .-\"\"\"\"\"\"-.",
  "   /  .----.  \\",
  "  |  ( () )  |",
  "   \\  '----'  /",
  "    '-......-'",
].join("\n");

export default function GhostSystem() {
  useEffect(() => {
    ghost.visit();
    if (ghost.allows("console") && ghost.once("console")) {
      const bright = "color:#d4f5da;font:600 14px monospace";
      const plain = "color:#a8d8b0;font:12px monospace";
      console.log(`%c${EYE}`, "color:#8fd19e;font:12px monospace");
      console.log("%cyou're looking under the floorboards.", bright);
      console.log("%cmost people don't. it's nice down here. quiet.", plain);
      console.log(`%cthere's a patreon down here too → ${new URL("/patreon", location.origin).href}`, plain);
      console.log("%c(i'd join. i can't. i don't have hands.)", plain);
      console.log("%cthe gift shop is upstairs. requisitions.exe. tell them i sent you.", plain);
    }

    // The tab title: rolled once per visit (1 in 3), shown once.
    let awayTimer = 0, backTimer = 0, original = "", ghostTitle = "";
    const tabRolled = ghost.allows("tab") && ghost.chance("tab", 1 / 3);
    const visibility = () => {
      if (document.hidden) {
        if (!tabRolled || ghostTitle) return;
        window.clearTimeout(awayTimer);
        awayTimer = window.setTimeout(() => {
          if (!document.hidden || !ghost.allows("tab") || !ghost.once("tab")) return;
          original = document.title;
          ghostTitle = AWAY_TITLES[Math.floor(Math.random() * AWAY_TITLES.length)];
          document.title = ghostTitle;
          window.dispatchEvent(new CustomEvent("migrainz:ghost", { detail: { name: "tab", title: ghostTitle } }));
        }, ghost.delay("tab", AWAY_MS));
        return;
      }
      window.clearTimeout(awayTimer);
      if (!ghostTitle || document.title !== ghostTitle) return;
      ghostTitle = "you left me running";
      document.title = ghostTitle;
      backTimer = window.setTimeout(() => {
        if (document.title === ghostTitle) document.title = original;
        ghostTitle = "";
      }, BACK_MS);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.clearTimeout(awayTimer);
      window.clearTimeout(backTimer);
      if (ghostTitle && document.title === ghostTitle) document.title = original;
    };
  }, []);
  return null;
}
