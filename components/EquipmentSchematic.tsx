'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useBeforeWorkspace } from '@/components/WindowManager';

/**
 * Looping schematic that behaves like an animated image: no controls, no pause, no menu.
 * If the video cannot autoplay, fails, or motion/data preferences ask for less, the poster stays
 * as a still. There is never a play button. `children` fill the specs panel attached underneath.
 *
 * On wide screens the video is capped so the video and the spec list fit the visible area of the window
 * without scrolling (a long description sits below the specs and may extend past the fold): the cap is written to --video-max-h and the module width follows the video
 * (height x ratio), keeping the panel flush underneath. Narrow screens stay stacked at full width.
 */
export default function EquipmentSchematic({ src, poster, ratio, name, children }: { src?: string; poster?: string; ratio?: number; name: string; children?: ReactNode }) {
  const container = useRef<HTMLElement>(null);
  const panelBox = useRef<HTMLDivElement>(null);
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
  const hidden = useBeforeWorkspace(); // a route window's hidden first copy: the poster must not load from there

  const shape = measured ?? ratio ?? 16 / 9;
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

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const wide = matchMedia('(min-width: 701px)');
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!wide.matches || !element.querySelector('.equipment-schematic-display')) { element.style.removeProperty('--video-max-h'); return; }
        const scroller = element.closest<HTMLElement>('.project-app-content');
        const here = element.getBoundingClientRect().top;
        let space: number;
        if (scroller) {
          const style = getComputedStyle(scroller);
          space = scroller.clientHeight - (here - scroller.getBoundingClientRect().top + scroller.scrollTop) - parseFloat(style.paddingBottom || '0') - parseFloat(getComputedStyle(element).marginBottom || '0');
        } else space = innerHeight - (here + scrollY) - 16 - parseFloat(getComputedStyle(element).marginBottom || '0');
        // The panel's height depends on the module width, which follows the video: settle in a few passes.
        // A description that sits below the specs (wide modules) is not counted, so the specs stay in view.
        const panelHeight = () => {
          const box = panelBox.current, lede = box?.querySelector<HTMLElement>('.lede');
          if (!box) return 0;
          if (!lede || getComputedStyle(lede).order === '0') return box.offsetHeight;
          const style = getComputedStyle(lede);
          return box.offsetHeight - lede.offsetHeight - parseFloat(style.marginTop) - parseFloat(style.marginBottom);
        };
        let max = Math.max(200, Math.floor(space - panelHeight() - 2));
        for (let pass = 0; pass < 5; pass++) {
          element.style.setProperty('--video-max-h', max + 'px');
          const next = Math.max(200, Math.floor(space - panelHeight() - 2));
          if (Math.abs(next - max) < 2) break;
          max = next;
        }
      });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(document.documentElement);
    const scroller = element.closest('.project-app-content');
    if (scroller) observer.observe(scroller);
    if (panelBox.current) observer.observe(panelBox.current);
    wide.addEventListener('change', fit);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); wide.removeEventListener('change', fit); };
  }, [shape, children]);

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
  return <section ref={container} className="equipment-module" aria-label={`${name} specifications`}
    style={hasMedia ? { '--schematic-ratio': shape } as CSSProperties : undefined}>
    {hasMedia && <div className="equipment-schematic-display" role="img" aria-label={`${name} rotating schematic`}
      style={{ aspectRatio: shape }} data-playing={playing || undefined}>
      {hasPoster && <img src={poster} alt="" draggable={false} loading={hidden ? "lazy" : undefined} onError={() => setPosterFailed(true)}
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
    {children && <div ref={panelBox} className="equipment-panel">{children}</div>}
  </section>;
}
