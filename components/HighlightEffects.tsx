"use client";

import { useEffect } from "react";

// Side effects for the shared hover/focus highlight (globals.css "SHARED HIGHLIGHT"). Renders nothing.
export default function HighlightEffects() {
  useEffect(() => {
    // iOS Safari applies :active only when a touchstart listener exists, so the reticle shows while pressed.
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
  return null;
}
