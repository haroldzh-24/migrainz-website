"use client";

import { useEffect, useRef, useState } from "react";
import { STARTUP_ART, COMPROMISED_EYES } from "@/data/startup-art";

export default function StartupArt({ blink }: { blink: boolean }) {
  const frames = STARTUP_ART.isPlaceholder ? COMPROMISED_EYES : STARTUP_ART;
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 1, height: 0 });

  useEffect(() => {
    const frame = viewport.current;
    const art = canvas.current;
    if (!frame || !art) return;
    const measure = () => {
      const scale = Math.min(1, frame.clientWidth / Math.max(1, art.offsetWidth));
      setSize({ scale, height: art.offsetHeight * scale });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(art);
    measure();
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="startup-art-viewport"
      ref={viewport}
      style={{ height: size.height || undefined }}
      role="img"
      aria-label={STARTUP_ART.isPlaceholder
        ? "A pair of ASCII eyes watches from the compromised terminal."
        : "Original anime girl bust with helmet, ear protection and night vision goggles flipped up."}
      data-eye-state={blink ? "closed" : "open"}
      data-placeholder={STARTUP_ART.isPlaceholder}
    >
      <div ref={canvas} className="startup-art-canvas" style={{ transform: `scale(${size.scale})` }} aria-hidden="true">
        <pre className="startup-face" style={{ visibility: blink ? "hidden" : "visible" }}>{frames.eyesOpen}</pre>
        <pre className="startup-face" style={{ visibility: blink ? "visible" : "hidden" }}>{frames.eyesClosed}</pre>
      </div>
    </div>
  );
}
