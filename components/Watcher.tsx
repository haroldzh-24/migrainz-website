"use client";

import { useEffect, useState, type CSSProperties, type PointerEvent } from "react";
import WatcherArt from "./WatcherArt";

export default function Watcher() {
  const [pointer, setPointer] = useState({ x: 0, y: 0, rx: "000", ry: "000" });
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reset = () => setPointer({ x: 0, y: 0, rx: "000", ry: "000" });
    preference.addEventListener("change", reset);
    window.addEventListener("blur", reset);
    return () => {
      preference.removeEventListener("change", reset);
      window.removeEventListener("blur", reset);
    };
  }, []);
  function move(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
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
    // Normalize to a disk so scaling produces a 6 by 3 source-pixel ellipse.
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
  return (
    <div
      className="watcher"
      id="watcher"
      aria-label="Cursor-reactive watcher artwork"
      style={{ "--mx": pointer.x, "--my": pointer.y } as CSSProperties}
      onPointerMove={move}
      onPointerLeave={() => setPointer({ x: 0, y: 0, rx: "000", ry: "000" })}
    >
      <div className="watcher-label">VISUAL NODE / CURSOR TEST</div>
      <WatcherArt />
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
