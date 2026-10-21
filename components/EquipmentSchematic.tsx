'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Looping schematic that behaves like an animated image: no controls, no pause, no menu.
 * If the video cannot autoplay, fails, or motion/data preferences ask for less, the poster stays
 * as a still. There is never a play button. `children` fill the specs panel attached underneath.
 */
export default function EquipmentSchematic({ src, poster, ratio, name, children }: { src?: string; poster?: string; ratio?: number; name: string; children?: ReactNode }) {
  const container = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  const animating = useRef(false);
  const [load, setLoad] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [measured, setMeasured] = useState<number>();

  const hasPoster = Boolean(poster) && !posterFailed;
  const animate = Boolean(src) && !failed && !blocked && !reduced;
  // Reduced motion with no poster: show the first frame of the video, paused.
  const firstFrame = Boolean(src) && !failed && reduced && !hasPoster;
  animating.current = animate;

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const data = matchMedia('(prefers-reduced-data: reduce)');
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const preference = () => setReduced(motion.matches || data.matches || Boolean(connection?.saveData));
    preference();
    motion.addEventListener('change', preference);
    data.addEventListener('change', preference);
    connection?.addEventListener('change', preference);
    return () => {
      motion.removeEventListener('change', preference);
      data.removeEventListener('change', preference);
      connection?.removeEventListener('change', preference);
    };
  }, []);

  const play = () => {
    const player = video.current;
    if (player && animating.current && visible.current && !document.hidden && player.readyState >= 2) player.play().catch(() => setBlocked(true));
  };

  useEffect(() => {
    const element = container.current;
    if (!element || !animate) { video.current?.pause(); return; }
    const sync = () => {
      if (visible.current && !document.hidden) { setLoad(true); play(); } else video.current?.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; sync(); }, { threshold: 0.01 });
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, [animate]);

  useEffect(() => { if (!animate) setPlaying(false); }, [animate]);

  const showVideo = Boolean(src) && !failed && (animate || firstFrame);
  const hasMedia = showVideo || hasPoster;
  if (!hasMedia && !children) return null;
  return <section ref={container} className="equipment-module" aria-label={`${name} specifications`}>
    {hasMedia && <div className="equipment-schematic-display" role="img" aria-label={`${name} rotating schematic`}
      style={{ aspectRatio: measured ?? ratio ?? 16 / 9 }} data-playing={playing || undefined}>
      {hasPoster && <img src={poster} alt="" draggable={false} onError={() => setPosterFailed(true)}
        onLoad={event => { if (!ratio && event.currentTarget.naturalHeight) setMeasured(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight); }} />}
      {showVideo && <video ref={video} src={load || firstFrame ? src : undefined} muted loop playsInline tabIndex={-1} aria-hidden="true"
        disablePictureInPicture disableRemotePlayback controlsList="nodownload nofullscreen noremoteplayback"
        preload={firstFrame ? 'metadata' : load ? 'auto' : 'none'}
        onLoadedMetadata={event => { if (!ratio && event.currentTarget.videoHeight) setMeasured(event.currentTarget.videoWidth / event.currentTarget.videoHeight); }}
        onLoadedData={play} onError={() => setFailed(true)}
        onPlaying={() => setPlaying(true)}
        onPause={() => {
          // Paused while it should be playing (e.g. iOS Low Power Mode): try once more, else keep the still.
          setPlaying(false);
          if (animating.current && visible.current && !document.hidden) video.current?.play().catch(() => setBlocked(true));
        }} />}
    </div>}
    {children && <div className="equipment-panel">{children}</div>}
  </section>;
}
