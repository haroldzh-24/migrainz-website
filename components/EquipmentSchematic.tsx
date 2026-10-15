'use client';

import { useEffect, useRef, useState } from 'react';

export default function EquipmentSchematic({ src, poster, name }: { src?: string; poster?: string; name: string }) {
  const container = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  const wanted = useRef(true);
  const [load, setLoad] = useState(false);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [manual, setManual] = useState(true);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const data = matchMedia('(prefers-reduced-data: reduce)');
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const preference = () => {
      const reduced = motion.matches || data.matches || Boolean(connection?.saveData);
      setManual(reduced);
      if (reduced) { wanted.current = false; video.current?.pause(); }
    };
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
    if (!element || !src || failed) return;
    const sync = () => {
      const player = video.current;
      if (!visible.current || document.hidden) { player?.pause(); return; }
      if (manual && !requested) return;
      setLoad(true);
      if (wanted.current && player && player.readyState >= 2) void player.play().catch(() => { /* Native controls remain available when autoplay is denied. */ });
    };
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; sync(); }, { threshold: 0.01 });
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, [src, failed, manual, requested, load, ready]);

  if ((!src || failed) && (!poster || posterFailed)) return null;
  return <section ref={container} className="equipment-schematic" aria-label={`${name} rotating schematic`}>
    <p className="eyebrow">ROTATING SCHEMATIC</p>
    <div className="equipment-schematic-display">
      {poster && !posterFailed && (!ready || failed || !load) && <img src={poster} alt={`${name} schematic preview`} onError={() => setPosterFailed(true)} />}
      {src && !failed && <video ref={video} src={load ? src : undefined} poster={posterFailed ? undefined : poster} muted loop playsInline controls preload={load ? 'auto' : 'none'}
        aria-label={`${name} rotating schematic video`} style={{ display: ready ? 'block' : 'none' }}
        onLoadedData={() => { setReady(true); if (visible.current && !document.hidden && (!manual || requested) && wanted.current) void video.current?.play().catch(() => {}); }} onError={() => setFailed(true)}
        onPlay={() => { wanted.current = true; if (!visible.current || document.hidden) video.current?.pause(); }}
        onPause={() => { if (visible.current && !document.hidden) wanted.current = false; }} />}
      {src && !failed && !ready && <button className="terminal-button" type="button" onClick={() => {
        wanted.current = true; setRequested(true); setLoad(true);
        if (video.current && video.current.readyState >= 2) void video.current.play().catch(() => {});
      }}>{load ? 'LOAD / PLAY SCHEMATIC' : 'PLAY SCHEMATIC'}</button>}
    </div>
  </section>;
}
