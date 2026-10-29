"use client";

import { useEffect, useRef, type ReactNode } from "react";
import WatcherArt from "./WatcherArt";

// Full deflection distance, and the eye sockets' centre as a fraction of the 1200px source canvas.
const FULL_DEFLECTION = 180;
const EYE_CENTER = { x: 560 / 1200, y: 610 / 1200 };
// How long a touch gaze holds after the finger lifts, and a keyboard glance holds on its target.
const TOUCH_HOLD_MS = 1200;

// CRT jitter (CRT "on" only, never under reduced motion): at a random moment every 3.5-9s the art shifts 2px for 90ms.
const JITTER_MIN_MS = 3500;
const JITTER_MAX_MS = 9000;
const JITTER_MS = 90;

// Dispatched by HighlightEffects when keyboard focus lands on a control: the Watcher glances at that point.
export type WatcherGlanceDetail = { x: number; y: number };
export const WATCHER_GLANCE_EVENT = "migrainz:watcher-glance";

/** `children` are extra layers drawn inside the Watcher box (the homepage adds its text-mode layers there). */
export default function Watcher({ children }: { children?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const jitter = useRef<HTMLDivElement>(null);
  // Jitter: written straight to the wrapper's data-jitter (no React state, so the jitter itself never re-renders the
  // Watcher; on the homepage it re-renders only when the hovered directory row changes its children).
  // The checks run at each tick, so switching CRT mode or reduced motion takes effect without a reload.
  useEffect(() => {
    const element = jitter.current!;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let next = 0, back = 0;
    const schedule = () => { next = window.setTimeout(jolt, JITTER_MIN_MS + Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS)); };
    const jolt = () => {
      if (document.documentElement.dataset.crt === "on" && !motion.matches && !document.hidden) {
        element.dataset.jitter = Math.random() < 0.5 ? "left" : "right";
        back = window.setTimeout(() => { delete element.dataset.jitter; }, JITTER_MS);
      }
      schedule();
    };
    schedule();
    // The flicker loop pauses (CSS) while the Watcher is scrolled out of view; written straight to the DOM, no state.
    const watcher = element.closest<HTMLElement>(".watcher");
    const visibility = watcher && "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => { if (entry.isIntersecting) delete watcher.dataset.offscreen; else watcher.dataset.offscreen = ""; })
      : null;
    if (watcher) visibility?.observe(watcher);
    return () => { clearTimeout(next); clearTimeout(back); visibility?.disconnect(); delete element.dataset.jitter; };
  }, []);
  useEffect(() => {
    const container = root.current!;
    const readoutX = container.querySelector<HTMLElement>("#readout-x")!;
    const readoutY = container.querySelector<HTMLElement>("#readout-y")!;
    const head = container.querySelector<HTMLElement>(".watcher-art")!;
    const eyes = container.querySelector<SVGGElement>(".watcher-eyes")!;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let position: { x: number; y: number } | null = null;
    let target = { x: 0, y: 0 };
    const eye = { x: 0, y: 0 }, body = { x: 0, y: 0 };
    let frame = 0, previous = 0, dirty = false, hold = 0;
    const setReadout = (element: HTMLElement, value: string) => {
      if (element.textContent !== value) element.textContent = value;
    };
    const draw = () => {
      // Write transforms only on their own elements, without inherited variables.
      head.style.transform = `perspective(1000px) translate(${body.x * 4}px, ${body.y * 3}px) rotateY(${body.x * 2}deg) rotateX(${body.y * -1.25}deg)`;
      eyes.style.transform = `translate(${eye.x * 10}px, ${eye.y * 5}px)`;
    };
    const readout = () => {
      if (!position) { setReadout(readoutX, "000"); setReadout(readoutY, "000"); return; }
      setReadout(readoutX, String(Math.round((target.x + 1) / 2 * 999)).padStart(3, "0"));
      setReadout(readoutY, String(Math.round((target.y + 1) / 2 * 999)).padStart(3, "0"));
    };
    const tick = (now: number) => {
      frame = 0;
      if (dirty) {
        dirty = false;
        if (position) {
          // At most one geometry read per animation frame, before any writes. The art sits in 86% of the box, inset 7%.
          const rect = container.getBoundingClientRect();
          const cx = rect.left + rect.width * (0.07 + 0.86 * EYE_CENTER.x);
          const cy = rect.top + rect.height * (0.07 + 0.86 * EYE_CENTER.y);
          const dx = position.x - cx, dy = position.y - cy;
          const distance = Math.hypot(dx, dy);
          const strength = Math.min(1, distance / FULL_DEFLECTION);
          target = distance < 0.5 ? { x: 0, y: 0 } : { x: dx / distance * strength, y: dy / distance * strength };
        } else target = { x: 0, y: 0 };
        readout();
      }
      const elapsed = Math.max(0, now - previous);
      previous = now;
      // Reach ~95% in 140/250ms, independent of display/event frequency.
      const eyeAlpha = 1 - Math.exp(-elapsed / (140 / 3));
      const headAlpha = 1 - Math.exp(-elapsed / (250 / 3));
      let moving = false;
      for (const axis of ["x", "y"] as const) {
        eye[axis] += (target[axis] - eye[axis]) * eyeAlpha;
        body[axis] += (target[axis] - body[axis]) * headAlpha;
        if (Math.abs(target[axis] - eye[axis]) < 0.0001) eye[axis] = target[axis];
        if (Math.abs(target[axis] - body[axis]) < 0.0001) body[axis] = target[axis];
        moving ||= eye[axis] !== target[axis] || body[axis] !== target[axis];
      }
      draw();
      if (moving) frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame && !preference.matches && !document.hidden) {
        previous = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const reset = () => {
      clearTimeout(hold);
      position = null; dirty = true;
      if (preference.matches || document.hidden) {
        cancelAnimationFrame(frame); frame = 0;
        target = { x: 0, y: 0 }; eye.x = eye.y = body.x = body.y = 0;
        readout();
        draw();
      } else wake();
    };
    const track = (event: PointerEvent) => {
      if (preference.matches || document.hidden) return;
      clearTimeout(hold);
      position = { x: event.clientX, y: event.clientY }; dirty = true; wake();
    };
    // Touch: keep looking where the finger last was, then recentre.
    const release = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      clearTimeout(hold);
      hold = window.setTimeout(reset, TOUCH_HOLD_MS);
    };
    const leave = (event: PointerEvent) => { if (event.pointerType === "mouse") reset(); };
    // Keyboard focus: look at the focused control for a moment, then recentre.
    const glance = (event: Event) => {
      const detail = (event as CustomEvent<WatcherGlanceDetail>).detail;
      if (!detail || preference.matches || document.hidden) return;
      clearTimeout(hold);
      position = { x: detail.x, y: detail.y }; dirty = true; wake();
      hold = window.setTimeout(reset, TOUCH_HOLD_MS);
    };
    // Scrolling moves the watcher under a still pointer.
    const rescroll = () => { if (position) { dirty = true; wake(); } };
    const root_ = document.documentElement;
    window.addEventListener("pointermove", track, { passive: true });
    window.addEventListener("pointerdown", track, { passive: true });
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("scroll", rescroll, { passive: true });
    window.addEventListener(WATCHER_GLANCE_EVENT, glance);
    root_.addEventListener("pointerleave", leave);
    preference.addEventListener("change", reset);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(hold);
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerdown", track);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("scroll", rescroll);
      window.removeEventListener(WATCHER_GLANCE_EVENT, glance);
      root_.removeEventListener("pointerleave", leave);
      preference.removeEventListener("change", reset);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);
    };
  }, []);
  return (
    <div ref={root} className="watcher" id="watcher" aria-label="Cursor-reactive watcher artwork">
      <div className="watcher-label">VISUAL NODE / CURSOR TEST</div>
      {/* Motion wrappers (CRT "on" only): jitter outermost, flicker inside, the eye-tracked art inside both. */}
      <div ref={jitter} className="watcher-jitter">
        <div className="watcher-flicker">
          <WatcherArt />
        </div>
      </div>
      <div className="watcher-static" aria-hidden="true" />
      <div className="scan-readout">
        <span>X <b id="readout-x">000</b></span>
        <span>Y <b id="readout-y">000</b></span>
      </div>
      {children}
    </div>
  );
}
