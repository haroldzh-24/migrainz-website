"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { RetroWindow, useWindowManager, type ViewerImage } from "@/components/WindowManager";

export type View = { scale: number | null; x: number; y: number };
export const fitView: View = { scale: null, x: 0, y: 0 };

export function ArtworkCanvas({ image, view, onChange }: { image: ViewerImage; view: View; onChange: (view: View) => void }) {
  const canvas = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const sources = image.sources ?? [...new Set([image.viewerSrc, image.src, image.thumbnailSrc].filter((src): src is string => Boolean(src)))];
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const frame = useRef<number | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSpace({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const ready = natural.width > 0 && natural.height > 0 && space.width > 0 && space.height > 0;
  const fit = ready ? Math.min(space.width / natural.width, space.height / natural.height) : 1;
  const minimum = Math.min(0.1, fit);
  const maximum = Math.max(4, fit);
  const scale = view.scale === null ? fit : Math.max(minimum, Math.min(maximum, view.scale));
  const limitX = Math.max(0, (natural.width * scale - space.width) / 2);
  const limitY = Math.max(0, (natural.height * scale - space.height) / 2);
  const x = Math.max(-limitX, Math.min(limitX, view.x));
  const y = Math.max(-limitY, Math.min(limitY, view.y));
  const pannable = ready && (limitX > 0 || limitY > 0);
  const live = useRef({ scale, x, y });
  if (frame.current === null) live.current = { scale, x, y };
  const transform = (factor: number, from: { x: number; y: number }, to = from) => {
    if (!ready) return;
    const current = live.current;
    const bounded = Math.max(minimum, Math.min(maximum, current.scale * factor));
    const ratio = bounded / current.scale;
    const lx = Math.max(0, (natural.width * bounded - space.width) / 2);
    const ly = Math.max(0, (natural.height * bounded - space.height) / 2);
    live.current = { scale: bounded, x: Math.max(-lx, Math.min(lx, to.x - (from.x - current.x) * ratio)), y: Math.max(-ly, Math.min(ly, to.y - (from.y - current.y) * ratio)) };
    if (frame.current === null) frame.current = requestAnimationFrame(() => {
      frame.current = null;
      change.current(live.current);
    });
  };
  const zoom = (next: number) => transform(next / live.current.scale, { x: 0, y: 0 });
  const reset = (next: View) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    live.current = { scale: next.scale ?? fit, x: next.x, y: next.y };
    onChange(next);
  };
  const stopPan = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    setDragging(pointers.current.size > 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const input = useRef({ transform, ready });
  input.current = { transform, ready };
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let safariScale: number | null = null;
    const point = (clientX: number, clientY: number) => {
      const rect = element.getBoundingClientRect();
      return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
    };
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey || !event.cancelable || !input.current.ready) return;
      event.preventDefault();
      if (safariScale !== null) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      input.current.transform(Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.01), point(event.clientX, event.clientY));
    };
    type Gesture = Event & { scale: number; clientX: number; clientY: number };
    const start = (raw: Event) => {
      if (!raw.cancelable || !input.current.ready) return;
      raw.preventDefault();
      safariScale = (raw as Gesture).scale;
    };
    const gesture = (raw: Event) => {
      if (safariScale === null || !raw.cancelable) return;
      raw.preventDefault();
      const event = raw as Gesture;
      if (event.scale > 0 && safariScale > 0) input.current.transform(event.scale / safariScale, point(event.clientX, event.clientY));
      safariScale = event.scale;
    };
    const end = (event: Event) => {
      if (safariScale !== null && event.cancelable) event.preventDefault();
      safariScale = null;
    };
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("gesturestart", start, { passive: false });
    element.addEventListener("gesturechange", gesture, { passive: false });
    element.addEventListener("gestureend", end, { passive: false });
    return () => {
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("gesturestart", start);
      element.removeEventListener("gesturechange", gesture);
      element.removeEventListener("gestureend", end);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  return <>
    <div className="art-viewer-toolbar" role="group" aria-label="Artwork zoom">
      <button type="button" disabled={!ready} aria-pressed={view.scale === null} onClick={() => reset(fitView)}>FIT</button>
      <button type="button" disabled={!ready} aria-pressed={view.scale === 1} onClick={() => reset({ scale: 1, x: 0, y: 0 })}>100%</button>
      <button type="button" aria-label="Zoom out" disabled={!ready || scale <= minimum} onClick={() => zoom(scale / 1.25)}>−</button>
      <button type="button" aria-label="Zoom in" disabled={!ready || scale >= maximum} onClick={() => zoom(scale * 1.25)}>+</button>
      <output aria-label="Artwork scale">{failed ? "UNAVAILABLE" : ready ? `${Math.round(scale * 100)}%` : "LOADING"}</output>
    </div>
    <div ref={canvas} className="art-viewer-canvas" data-pannable={pannable} data-dragging={dragging}
      tabIndex={pannable ? 0 : undefined} role="group" aria-label="Artwork canvas; drag or use arrow keys to pan when zoomed"
      onKeyDown={(event) => {
        if (!pannable || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        onChange({ scale, x: Math.max(-limitX, Math.min(limitX, x + (event.key === "ArrowLeft" ? 40 : event.key === "ArrowRight" ? -40 : 0))), y: Math.max(-limitY, Math.min(limitY, y + (event.key === "ArrowUp" ? 40 : event.key === "ArrowDown" ? -40 : 0))) });
      }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (!ready || event.button !== 0 || (event.pointerType !== "touch" && !pannable) || pointers.current.size >= 2) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.focus({ preventScroll: true });
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        if (!pointers.current.has(event.pointerId)) return;
        const before = [...pointers.current.values()];
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const after = [...pointers.current.values()];
        const rect = event.currentTarget.getBoundingClientRect();
        const midpoint = (points: typeof before) => ({ x: points.reduce((sum, p) => sum + p.x, 0) / points.length - rect.left - rect.width / 2, y: points.reduce((sum, p) => sum + p.y, 0) / points.length - rect.top - rect.height / 2 });
        const distance = (points: typeof before) => points.length === 2 ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) : 1;
        const previousDistance = distance(before);
        transform(previousDistance > 0 ? distance(after) / previousDistance : 1, midpoint(before), midpoint(after));
      }}
      onPointerUp={stopPan} onPointerCancel={stopPan} onLostPointerCapture={stopPan}>
      <img src={sources[sourceIndex]} alt={image.alt} draggable={false}
        onError={() => {
          if (sourceIndex + 1 < sources.length) setSourceIndex(sourceIndex + 1);
          else setFailed(true);
        }}
        onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        style={ready ? { width: natural.width * scale, height: natural.height * scale, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` } : { visibility: "hidden" }} />
      {failed && <div className="art-viewer-placeholder">ARTWORK UNAVAILABLE</div>}
    </div>
  </>;
}

export default function ArtViewer() {
  const { viewerTabs, activeViewerTab, switchViewerTab, closeViewerTab, closeWindow, windows, toggleMaximizeWindow } = useWindowManager();
  const [imageIndex, setImageIndex] = useState(0);
  const [views, setViews] = useState<Record<string, View>>({});
  const normalViews = useRef<Record<string, View>>({});
  const record = windows.find((window) => window.id === "art-viewer");
  const maximized = record?.maximized;
  const active = viewerTabs.find((tab) => tab.id === activeViewerTab) ?? viewerTabs[0];

  useEffect(() => setImageIndex(0), [active?.id]);
  const closeable = Boolean(active && record?.open && !record.minimized && record.focused);
  useEffect(() => {
    if (!closeable) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) closeWindow("art-viewer"); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [closeable, closeWindow]);
  if (!active) return null;
  const artwork = active.images[imageIndex] ?? active.images[0];
  // With no artwork, fall back to the poster; with neither, offer the item page instead of a dead end.
  const image = artwork ?? active.poster;
  const viewKey = JSON.stringify([active.id, image?.src, imageIndex]);
  const tabs = <div className="art-viewer-tabs" role="tablist" aria-label="Open artwork">
    {viewerTabs.map((tab) => <div className={`art-viewer-tab${tab.id === active.id ? " is-active" : ""}`} key={tab.id}>
      <button type="button" role="tab" aria-selected={tab.id === active.id} onClick={() => switchViewerTab(tab.id)}>{tab.title}</button>
      <button type="button" className="art-viewer-tab-close" aria-label={`Close ${tab.title}`} onClick={() => closeViewerTab(tab.id)}>×</button>
    </div>)}
  </div>;

  return <RetroWindow
    id="art-viewer"
    title="ART VIEWER"
    className="art-viewer-window"
    defaultPosition={{ x: 70, y: 50 }}
    defaultSize={{ width: 900, height: 650 }}
    titlebarContent={tabs}
    onToggleMaximize={() => {
      if (maximized) setViews(normalViews.current);
      else normalViews.current = views;
      toggleMaximizeWindow("art-viewer");
    }}
  >
    {image ? <ArtworkCanvas key={viewKey} image={image} view={views[viewKey] ?? fitView} onChange={(view) => setViews((current) => ({ ...current, [viewKey]: view }))} /> : <div className="art-viewer-canvas"><div className="art-viewer-placeholder">NO PUBLIC ARTWORK FILED<br /><Link className="art-viewer-page-link" href={active.href} prefetch={false} onClick={() => closeWindow("art-viewer")}>OPEN {active.title.toUpperCase()} PAGE</Link></div></div>}
    {active.images.length > 1 && <div className="art-viewer-thumbs" aria-label={`${active.title} artwork pages`}>
      {active.images.map((item, index) => <button type="button" key={`${item.src}-${index}`} className={index === imageIndex ? "is-active" : ""} aria-label={`Show image ${index + 1}`} onClick={() => setImageIndex(index)}>
        <img src={item.thumbnailSrc ?? item.src} alt="" loading="lazy" />
      </button>)}
    </div>}
    <div className="art-viewer-meta">
      <div><strong>{active.title}</strong><span>{active.project}{active.role ? ` / ${active.role}` : ""}</span></div>
      {active.description && <p>{active.description}</p>}
      {image?.caption && <small>{image.caption}</small>}
      {!artwork && <small>{image ? "NO CONCEPT ART FILED. SHOWING SCHEMATIC POSTER. " : ""}{image && <Link className="art-viewer-page-link" href={active.href} prefetch={false} onClick={() => closeWindow("art-viewer")}>OPEN ITEM PAGE</Link>}</small>}
    </div>
  </RetroWindow>;
}
