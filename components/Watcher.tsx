"use client";

import { useEffect, useRef } from "react";
import WatcherArt from "./WatcherArt";

export default function Watcher() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = root.current!;
    const head = container.querySelector<HTMLElement>(".watcher-art")!;
    const eyes = container.querySelector<SVGImageElement>(".watcher-eyes")!;
    const readoutX = container.querySelector<HTMLElement>("#readout-x")!;
    const readoutY = container.querySelector<HTMLElement>("#readout-y")!;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activePointer: number | null = null;
    let position: { x: number; y: number } | null = null;
    let target = { x: 0, y: 0 };
    const eye = { x: 0, y: 0 }, body = { x: 0, y: 0 };
    let frame = 0, previous = 0, dirty = false;
    const setReadout = (element: HTMLElement, value: string) => {
      if (element.textContent !== value) element.textContent = value;
    };
    const draw = () => {
      // Write transforms only on their own elements, without inherited variables.
      head.style.transform = `perspective(1000px) translate(${body.x * 4}px, ${body.y * 3}px) rotateY(${body.x * 2}deg) rotateX(${body.y * -1.25}deg)`;
      eyes.style.transform = `translate(${eye.x * 10}px, ${eye.y * 5}px)`;
    };
    const tick = (now: number) => {
      frame = 0;
      if (dirty) {
        dirty = false;
        // At most one geometry read per animation frame, before any writes.
        if (position) {
          const rect = container.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (position.x - rect.left) / rect.width));
          const y = Math.max(0, Math.min(1, (position.y - rect.top) / rect.height));
          const dx = (x - 0.5) * 2, dy = (y - 0.5) * 2;
          const radius = Math.max(1, Math.hypot(dx, dy));
          target = { x: dx / radius, y: dy / radius };
          setReadout(readoutX, String(Math.round(x * 999)).padStart(3, "0"));
          setReadout(readoutY, String(Math.round(y * 999)).padStart(3, "0"));
        } else {
          target = { x: 0, y: 0 };
          setReadout(readoutX, "000"); setReadout(readoutY, "000");
        }
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
      const captured = activePointer;
      activePointer = null;
      if (captured !== null && container.hasPointerCapture(captured)) container.releasePointerCapture(captured);
      position = null; dirty = true;
      if (preference.matches || document.hidden) {
        cancelAnimationFrame(frame); frame = 0;
        target = { x: 0, y: 0 }; eye.x = eye.y = body.x = body.y = 0;
        setReadout(readoutX, "000"); setReadout(readoutY, "000");
        draw();
      } else wake();
    };
    const move = (event: PointerEvent) => {
      if (preference.matches || document.hidden || (event.pointerType !== "mouse" && activePointer !== event.pointerId)) return;
      position = { x: event.clientX, y: event.clientY }; dirty = true; wake();
    };
    const start = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || !event.isPrimary || preference.matches) return;
      activePointer = event.pointerId;
      container.setPointerCapture(event.pointerId);
      move(event);
    };
    const end = (event: PointerEvent) => { if (activePointer === event.pointerId) reset(); };
    const leave = (event: PointerEvent) => { if (event.pointerType === "mouse") reset(); };
    container.addEventListener("pointermove", move, { passive: true });
    container.addEventListener("pointerdown", start, { passive: true });
    container.addEventListener("pointerup", end);
    container.addEventListener("pointercancel", end);
    container.addEventListener("lostpointercapture", end);
    container.addEventListener("pointerleave", leave);
    preference.addEventListener("change", reset);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("pointermove", move);
      container.removeEventListener("pointerdown", start);
      container.removeEventListener("pointerup", end);
      container.removeEventListener("pointercancel", end);
      container.removeEventListener("lostpointercapture", end);
      container.removeEventListener("pointerleave", leave);
      preference.removeEventListener("change", reset);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);
      if (activePointer !== null && container.hasPointerCapture(activePointer)) container.releasePointerCapture(activePointer);
    };
  }, []);
  return (
    <div ref={root} className="watcher" id="watcher" aria-label="Cursor-reactive watcher artwork">
      <div className="watcher-label">VISUAL NODE / CURSOR TEST</div>
      <WatcherArt />
      <div className="watcher-static" aria-hidden="true"><div className="watcher-interference" /></div>
      <div className="scan-readout">
        <span>X <b id="readout-x">000</b></span>
        <span>Y <b id="readout-y">000</b></span>
      </div>
    </div>
  );
}
