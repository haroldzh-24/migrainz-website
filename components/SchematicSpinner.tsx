"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Every turning schematic on the site shares one clock, so all of them show the same angle at the same moment, and each
 * loop starts on the item's right side (the start of the schematic video). A video longer or shorter than the shared
 * period is sped up or slowed down to fit it; drift is corrected once a second. Reduced motion, a data-saver setting, a
 * missing video or a failed load show the poster still instead; off-screen videos pause. The video is not requested
 * until it comes within 200px of the screen (each media request is a function call and Blob read).
 */
export const SPIN_PERIOD_MS = 12000;

const MIN_RATE = 0.25;
const MAX_RATE = 4;

function quiet() {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const data = window.matchMedia("(prefers-reduced-data: reduce)").matches;
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  return motion || data || saveData;
}

export default function SchematicSpinner({ src, poster, label }: { src?: string; poster?: string; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [still, setStill] = useState(true);
  const [failed, setFailed] = useState(false);
  const [near, setNear] = useState(false);
  const holder = useRef<HTMLElement | null>(null);
  const hold = useCallback((element: HTMLElement | null) => { holder.current = element; }, []);

  useEffect(() => { setStill(!src || quiet()); }, [src]);

  // Swap the still for the video only once it is about to be seen.
  useEffect(() => {
    const element = holder.current;
    if (still || near || !element) return;
    const seen = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: "200px" });
    seen.observe(element);
    return () => seen.disconnect();
  }, [still, near]);

  useEffect(() => {
    const element = video.current;
    if (!element || still || failed) return;
    let visible = false, timer = 0;
    const sync = () => {
      const duration = element.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      const rate = Math.min(MAX_RATE, Math.max(MIN_RATE, duration / (SPIN_PERIOD_MS / 1000)));
      if (element.playbackRate !== rate) element.playbackRate = rate;
      const expected = (Date.now() % SPIN_PERIOD_MS) / SPIN_PERIOD_MS * duration;
      const drift = Math.abs(element.currentTime - expected);
      if (Math.min(drift, duration - drift) > 0.12) element.currentTime = expected;
    };
    const play = () => {
      if (!visible || document.hidden) { element.pause(); return; }
      sync();
      element.play().catch(() => setStill(true));
    };
    const seen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; play(); });
    seen.observe(element);
    element.addEventListener("loadedmetadata", play);
    document.addEventListener("visibilitychange", play);
    timer = window.setInterval(() => { if (visible && !element.paused) sync(); }, 1000);
    return () => {
      seen.disconnect();
      clearInterval(timer);
      element.removeEventListener("loadedmetadata", play);
      document.removeEventListener("visibilitychange", play);
    };
  }, [still, failed, near]);

  if (still || failed || !src || !near) {
    const waiting = !still && !failed && Boolean(src);
    return poster
      ? <img ref={hold} className="schematic-spinner" src={poster} alt={label} loading="lazy" />
      : <span ref={hold} className="schematic-spinner schematic-spinner-empty" role="img" aria-label={label}>{waiting ? "" : "NO SCHEMATIC"}</span>;
  }
  return (
    <video ref={video} className="schematic-spinner" src={src} poster={poster} muted loop playsInline preload="metadata"
      aria-label={label} onError={() => setFailed(true)} disablePictureInPicture />
  );
}
