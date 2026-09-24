"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { RetroWindow, useWindowManager, type ViewerImage } from "@/components/WindowManager";

type View = { scale: number | null; x: number; y: number };
const fitView: View = { scale: null, x: 0, y: 0 };

function ArtworkCanvas({ image, view, onChange }: { image: ViewerImage; view: View; onChange: (view: View) => void }) {
  const canvas = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ id: number; clientX: number; clientY: number; x: number; y: number } | null>(null);
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
  const zoom = (next: number) => {
    const bounded = Math.max(minimum, Math.min(maximum, next));
    onChange({ scale: bounded, x: x * bounded / scale, y: y * bounded / scale });
  };
  const stopPan = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <>
    <div className="art-viewer-toolbar" role="group" aria-label="Artwork zoom">
      <button type="button" disabled={!ready} aria-pressed={view.scale === null} onClick={() => onChange(fitView)}>FIT</button>
      <button type="button" disabled={!ready} aria-pressed={view.scale === 1} onClick={() => onChange({ scale: 1, x: 0, y: 0 })}>100%</button>
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
      onPointerDown={(event) => {
        if (!pannable || event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        event.currentTarget.focus();
        drag.current = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY, x, y };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || start.id !== event.pointerId) return;
        onChange({ scale, x: Math.max(-limitX, Math.min(limitX, start.x + event.clientX - start.clientX)), y: Math.max(-limitY, Math.min(limitY, start.y + event.clientY - start.clientY)) });
      }}
      onPointerUp={stopPan} onPointerCancel={stopPan} onLostPointerCapture={stopPan}>
      <img src={image.src} alt={image.alt} draggable={false}
        onError={() => setFailed(true)}
        onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        style={ready ? { width: natural.width * scale, height: natural.height * scale, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` } : { visibility: "hidden" }} />
      {failed && <div className="art-viewer-placeholder">ARTWORK UNAVAILABLE</div>}
    </div>
  </>;
}

export default function ArtViewer() {
  const { viewerTabs, activeViewerTab, switchViewerTab, closeViewerTab, windows, toggleMaximizeWindow } = useWindowManager();
  const [imageIndex, setImageIndex] = useState(0);
  const [views, setViews] = useState<Record<string, View>>({});
  const normalViews = useRef<Record<string, View>>({});
  const maximized = windows.find((window) => window.id === "art-viewer")?.maximized;
  const active = viewerTabs.find((tab) => tab.id === activeViewerTab) ?? viewerTabs[0];

  useEffect(() => setImageIndex(0), [active?.id]);
  if (!active) return null;
  const image = active.images[imageIndex] ?? active.images[0];
  const viewKey = JSON.stringify([active.id, image?.src, imageIndex]);

  return <RetroWindow
    id="art-viewer"
    title="ART VIEWER"
    className="art-viewer-window"
    defaultPosition={{ x: 70, y: 50 }}
    defaultSize={{ width: 900, height: 650 }}
    onToggleMaximize={() => {
      if (maximized) setViews(normalViews.current);
      else normalViews.current = views;
      toggleMaximizeWindow("art-viewer");
    }}
  >
    <div className="art-viewer-tabs" role="tablist" aria-label="Open artwork">
      {viewerTabs.map((tab) => <div className={`art-viewer-tab${tab.id === active.id ? " is-active" : ""}`} key={tab.id}>
        <button type="button" role="tab" aria-selected={tab.id === active.id} onClick={() => switchViewerTab(tab.id)}>{tab.title}</button>
        <button type="button" className="art-viewer-tab-close" aria-label={`Close ${tab.title}`} onClick={() => closeViewerTab(tab.id)}>×</button>
      </div>)}
    </div>
    {image ? <ArtworkCanvas key={viewKey} image={image} view={views[viewKey] ?? fitView} onChange={(view) => setViews((current) => ({ ...current, [viewKey]: view }))} /> : <div className="art-viewer-canvas"><div className="art-viewer-placeholder">NO PUBLIC ARTWORK FILED</div></div>}
    {active.images.length > 1 && <div className="art-viewer-thumbs" aria-label={`${active.title} artwork pages`}>
      {active.images.map((item, index) => <button type="button" key={`${item.src}-${index}`} className={index === imageIndex ? "is-active" : ""} aria-label={`Show image ${index + 1}`} onClick={() => setImageIndex(index)}>
        <img src={item.src} alt="" loading="lazy" />
      </button>)}
    </div>}
    <div className="art-viewer-meta">
      <div><strong>{active.title}</strong><span>{active.project}{active.role ? ` / ${active.role}` : ""}</span></div>
      {active.description && <p>{active.description}</p>}
      {image?.caption && <small>{image.caption}</small>}
    </div>
  </RetroWindow>;
}
