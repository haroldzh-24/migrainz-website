"use client";

import { useLayoutEffect, useState } from "react";

const modes = ["on", "reduced", "off"] as const;
type Mode = (typeof modes)[number];

/** Cycles the CRT effects strength. The mode lives on <html data-crt> (set before first paint by the layout script). */
export default function CrtToggle() {
  const [mode, setMode] = useState<Mode>("on");
  // Before paint. Also re-applies the saved mode after the dev-only Strict Mode remount resets <html> attributes.
  useLayoutEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("crt-effects"); } catch { /* storage may be blocked */ }
    const current = (saved ?? document.documentElement.dataset.crt) as Mode | undefined;
    if (current && modes.includes(current)) { document.documentElement.dataset.crt = current; setMode(current); }
  }, []);
  const next = () => {
    const value = modes[(modes.indexOf(mode) + 1) % modes.length];
    setMode(value);
    document.documentElement.dataset.crt = value;
    try { localStorage.setItem("crt-effects", value); } catch { /* storage may be blocked */ }
  };
  return (
    <button className="crt-toggle" type="button" onClick={next} aria-label={`CRT effects: ${mode}. Activate to change.`}>
      CRT: {mode.toUpperCase()}
    </button>
  );
}
