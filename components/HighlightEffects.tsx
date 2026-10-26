"use client";

import { useEffect } from "react";
import { useSound } from "@/components/SoundProvider";
import { WATCHER_GLANCE_EVENT, type WatcherGlanceDetail } from "@/components/Watcher";

// Everything the shared highlight (globals.css "SHARED HIGHLIGHT") draws on.
const HIGHLIGHT_TARGET = 'a, button, [role="tab"], summary, select';
const TICK_GAP_MS = 80;

// Side effects for the shared hover/focus highlight. Renders nothing.
export default function HighlightEffects() {
  const { playSound } = useSound();
  useEffect(() => {
    // iOS Safari applies :active only when a touchstart listener exists, so the reticle shows while pressed.
    const noop = () => {};
    let last: Element | null = null, lastTick = 0;
    const tick = () => {
      const now = performance.now();
      if (now - lastTick < TICK_GAP_MS) return;
      lastTick = now;
      playSound("tick");
    };
    // Soft tick when a real mouse enters a new control (touch already gets the click sound).
    const over = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = (event.target as Element | null)?.closest(HIGHLIGHT_TARGET) ?? null;
      if (target === last) return;
      last = target;
      if (target && !(target as HTMLButtonElement).disabled) tick();
    };
    // Keyboard focus: tick, and the Watcher glances at the focused control. Mouse focus is already tracked by the pointer.
    const focus = (event: FocusEvent) => {
      const target = (event.target as Element | null)?.closest(HIGHLIGHT_TARGET);
      if (!target || !target.matches(":focus-visible")) return;
      tick();
      const rect = target.getBoundingClientRect();
      const detail: WatcherGlanceDetail = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      window.dispatchEvent(new CustomEvent(WATCHER_GLANCE_EVENT, { detail }));
    };
    document.addEventListener("touchstart", noop, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("touchstart", noop);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("focusin", focus);
    };
  }, [playSound]);
  return null;
}
