"use client";

import { useEffect, useRef, useState } from "react";
import { CELL_H, CELL_W, renderGlobe } from "@/lib/home/text-graphics";
import { watchMotion } from "@/components/home/motion";

const pad = (value: number) => String(value).padStart(2, "0");

/** Time since this page was opened, and a strip of 12 cells that fills once a second. */
export function SessionClock() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="home-session">
      <p className="home-session-time"><time dateTime={`PT${seconds}S`}>{pad(Math.floor(seconds / 3600))}:{pad(Math.floor(seconds / 60) % 60)}:{pad(seconds % 60)}</time></p>
      <p className="home-session-label">SINCE YOU CONNECTED</p>
      <div className="home-session-ticks" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => <i key={index} data-on={index <= seconds % 12 || undefined} />)}
      </div>
    </div>
  );
}

// 34 x 21 cells (245 x 252 px) keeps the globe round; on the narrowest right-hand card (240 px at tablet width) the
// panel clips the empty margin around it, never the globe (its diameter is about 33 cells).
const GLOBE_COLS = 34;
const GLOBE_ROWS = 21;

/**
 * Text globe of the real world (lib/home/land-mask.ts) with NODE 01 pinned on Texas. The view swings slowly over the
 * Americas so the pin stays in sight; it holds still under reduced motion, with CRT effects not "on", off screen and in a
 * hidden tab.
 */
export function SignalGlobe() {
  const [globe, setGlobe] = useState(() => renderGlobe(GLOBE_COLS, GLOBE_ROWS, 0, false));
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!box.current) return;
    let timer = 0;
    const start = performance.now();
    // The 80 ms redraw runs only while the globe may move (watchMotion); it is not polled while held or hidden.
    const stop = watchMotion(box.current, running => {
      clearInterval(timer);
      timer = running ? window.setInterval(() => setGlobe(renderGlobe(GLOBE_COLS, GLOBE_ROWS, performance.now() - start)), 80) : 0;
    });
    return () => { clearInterval(timer); stop(); };
  }, []);
  const longitude = Math.round(Math.abs(globe.centerLon));
  return (
    <div className="home-globe" ref={box}>
      {/* Server and browser compute the same globe; suppressHydrationWarning covers a last-digit difference in a
          browser's trigonometry that could flip one character. */}
      <pre className="home-globe-map" aria-hidden="true" suppressHydrationWarning>{globe.text}</pre>
      {globe.pin.visible && (
        <span className="home-globe-pin" aria-hidden="true" suppressHydrationWarning
          style={{ left: `calc(50% - ${(GLOBE_COLS * CELL_W) / 2}px + ${(globe.pin.col * CELL_W).toFixed(1)}px)`, top: `${(globe.pin.row * CELL_H + 6).toFixed(1)}px` }}>
          <i /><span>NODE 01</span>
        </span>
      )}
      <p className="visually-hidden">A world globe drawn in text, with NODE 01 marked in Texas.</p>
      <p className="home-globe-readout" aria-hidden="true" suppressHydrationWarning>LON {String(longitude).padStart(3, "0")}°{globe.centerLon < 0 ? "W" : "E"} · TX 31°N 99°W</p>
    </div>
  );
}
