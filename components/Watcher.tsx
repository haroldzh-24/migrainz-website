"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import WatcherArt from "./WatcherArt";

export default function Watcher() {
  const [pointer, setPointer] = useState({ x: 0, y: 0, rx: "000", ry: "000" });
  const activePointer = useRef<number | null>(null);
  function reset() {
    activePointer.current = null;
    setPointer({ x: 0, y: 0, rx: "000", ry: "000" });
  }
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    preference.addEventListener("change", reset);
    window.addEventListener("blur", reset);
    return () => {
      preference.removeEventListener("change", reset);
      window.removeEventListener("blur", reset);
    };
  }, []);
  function move(event: PointerEvent<HTMLDivElement>) {
    if (
      (event.pointerType !== "mouse" && activePointer.current !== event.pointerId) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - rect.top) / rect.height),
    );
    // Normalize to a disk so scaling produces a 10 by 5 source-pixel ellipse.
    const dx = (x - 0.5) * 2;
    const dy = (y - 0.5) * 2;
    const radius = Math.max(1, Math.hypot(dx, dy));
    setPointer({
      x: dx / radius,
      y: dy / radius,
      rx: String(Math.round(x * 999)).padStart(3, "0"),
      ry: String(Math.round(y * 999)).padStart(3, "0"),
    });
  }
  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || !event.isPrimary) return;
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    move(event);
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    if (activePointer.current !== event.pointerId) return;
    reset();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }
  return (
    <div
      className="watcher"
      id="watcher"
      aria-label="Cursor-reactive watcher artwork"
      style={{ "--mx": pointer.x, "--my": pointer.y } as CSSProperties}
      onPointerMove={move}
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") reset();
      }}
    >
      <div className="watcher-label">VISUAL NODE / CURSOR TEST</div>
      <WatcherArt />
      <div className="watcher-static" aria-hidden="true">
        <div className="watcher-interference" />
      </div>
      <div className="scan-readout">
        <span>
          X <b id="readout-x">{pointer.rx}</b>
        </span>
        <span>
          Y <b id="readout-y">{pointer.ry}</b>
        </span>
      </div>
    </div>
  );
}
