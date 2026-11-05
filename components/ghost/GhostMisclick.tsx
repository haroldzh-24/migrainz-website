"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ghost } from "@/lib/ghost";

// Batch 20: on the grey-window desktop, once in a long while, a tiny tty0.exe window blinks open ("sorry. misclick.")
// and closes itself about 1.2 s later. A plain box, not a desktop window: it never takes focus, makes no sound, and
// is hidden from screen readers. Never over the comic reader or the Art Viewer. One of the visit's ambient events.
const SHOW_MS = 1200;

export default function GhostMisclick() {
  const pathname = usePathname();
  const [spot, setSpot] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    let showTimer = 0, hideTimer = 0;
    const wait = ghost.delay("misclick", 6000 + Math.random() * 9000);
    showTimer = window.setTimeout(() => {
      if (!document.querySelector(".graphics-route") || document.hidden) return;
      if (document.querySelector(".comic-reader-window, .art-viewer-window")) return;
      if (!ghost.claim("misclick")) return;
      const width = Math.min(220, window.innerWidth - 32);
      setSpot({ left: 16 + Math.random() * Math.max(0, window.innerWidth - width - 32), top: 96 + Math.random() * Math.max(0, window.innerHeight - 260) });
      window.dispatchEvent(new CustomEvent("migrainz:ghost", { detail: { name: "misclick" } }));
      hideTimer = window.setTimeout(() => setSpot(null), SHOW_MS);
    }, wait);
    return () => { window.clearTimeout(showTimer); window.clearTimeout(hideTimer); setSpot(null); };
  }, [pathname]);
  if (!spot) return null;
  return (
    <div className="ghost-misclick" aria-hidden="true" style={{ left: spot.left, top: spot.top }}>
      <div className="ghost-misclick-title"><span>tty0.exe</span><span className="ghost-misclick-x">×</span></div>
      <p>sorry. misclick.</p>
    </div>
  );
}
