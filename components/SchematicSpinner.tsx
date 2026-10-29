"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Every turning schematic on the site shares one clock, so all of them show the same angle at the same moment, and each
 * loop starts on the item's right side (the start of the schematic video). A video longer or shorter than the shared
 * period is sped up or slowed down to fit it (between 0.25x and 4x, so videos from 3 s to 48 s keep exact step; outside
 * that range the drift check re-aligns them once a second); drift is corrected once a second. Reduced motion, a data-saver setting, a
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

/**
 * The shared clock's angle in degrees, for a readout next to the spinners (board 22). "000" on the server and while
 * motion is held (reduced motion, data saver), paused in a hidden tab.
 */
export function SpinAngle() {
  const [degrees, setDegrees] = useState(0);
  // Follows a change of the reduced-motion or reduced-data setting while the page is open, like the spinners.
  const [held, setHeld] = useState(true);
  useEffect(() => {
    const update = () => setHeld(quiet());
    update();
    const queries = ["(prefers-reduced-motion: reduce)", "(prefers-reduced-data: reduce)"].map(query => window.matchMedia(query));
    queries.forEach(query => query.addEventListener("change", update));
    return () => queries.forEach(query => query.removeEventListener("change", update));
  }, []);
  useEffect(() => {
    if (held) { setDegrees(0); return; }
    const timer = window.setInterval(() => { if (!document.hidden) setDegrees(Math.floor((Date.now() % SPIN_PERIOD_MS) / SPIN_PERIOD_MS * 360)); }, 250);
    return () => clearInterval(timer);
  }, [held]);
  return <>{String(degrees).padStart(3, "0")}</>;
}

/** `decorative`: inside a link or card that already names the item, the media is hidden from screen readers. */
/**
 * `fallback`: shown instead of "NO SCHEMATIC" when there is no poster (for example the item's concept art), also while the
 * video is on its way and under it until its first frame plays, so the card never goes blank (8c).
 */
export default function SchematicSpinner({ src, poster, label, decorative = false, fallback }: { src?: string; poster?: string; label: string; decorative?: boolean; fallback?: ReactNode }) {
  const video = useRef<HTMLVideoElement>(null);
  const [still, setStill] = useState(true);
  const [failed, setFailed] = useState(false);
  const [near, setNear] = useState(false);
  const [playing, setPlaying] = useState(false);
  const holder = useRef<HTMLElement | null>(null);
  const hold = useCallback((element: HTMLElement | null) => { holder.current = element; }, []);

  // Re-checked when the reduced-motion or reduced-data setting changes while the page is open.
  useEffect(() => {
    const update = () => setStill(!src || quiet());
    update();
    const queries = ["(prefers-reduced-motion: reduce)", "(prefers-reduced-data: reduce)"].map(query => window.matchMedia(query));
    queries.forEach(query => query.addEventListener("change", update));
    return () => queries.forEach(query => query.removeEventListener("change", update));
  }, [src]);

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
    // While waiting, the holder still needs an element for its IntersectionObserver.
    if (!poster && fallback) return waiting ? <span ref={hold} className="schematic-spinner-layered">{fallback}</span> : fallback;
    return poster
      ? <img ref={hold} className="schematic-spinner" src={poster} alt={decorative ? "" : label} loading="lazy" />
      : <span ref={hold} className="schematic-spinner schematic-spinner-empty" role={decorative ? undefined : "img"} aria-label={decorative ? undefined : label} aria-hidden={decorative || undefined}>{waiting ? "" : "NO SCHEMATIC"}</span>;
  }
  const clip = <video ref={video} className="schematic-spinner" src={src} poster={poster} muted loop playsInline preload="metadata"
    data-playing={playing || undefined} onPlaying={() => setPlaying(true)}
    aria-label={decorative ? undefined : label} aria-hidden={decorative || undefined} onError={() => setFailed(true)} disablePictureInPicture />;
  // No poster: the fallback stays under the video until its first frame plays.
  return !poster && fallback ? <span className="schematic-spinner-layered">{fallback}{clip}</span> : clip;
}
