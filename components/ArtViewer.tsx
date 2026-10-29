"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type MutableRefObject, type PointerEvent } from "react";
import { RetroWindow, useWindowManager, viewerClosedKey, type ViewerImage } from "@/components/WindowManager";

// scale null = fitted: to the whole frame by default, or to the frame's height or width (the comic reader's FIT HEIGHT
// and FIT WIDTH, design canvas board 4). `top` starts a fitted page that is taller than the frame at its top edge.
export type View = { scale: number | null; x: number; y: number; fit?: "height" | "width"; top?: boolean };
export const fitView: View = { scale: null, x: 0, y: 0 };
export const fitHeightView: View = { scale: null, x: 0, y: 0, fit: "height" };
export const fitWidthView: View = { scale: null, x: 0, y: 0, fit: "width", top: true };

/** A key the canvas can act on (zoom, fit, pan); returns true when it did. */
export type CanvasKeys = (key: string) => boolean;

/** The file name the DECODING label shows: the last part of the media path, without a query. */
function fileLabel(src?: string) {
  if (!src) return "";
  const last = src.split("?")[0].split("/").filter(Boolean).pop() ?? "";
  try { return decodeURIComponent(last); } catch { return last; }
}

/**
 * `keys`: filled with the canvas's key handler, so a window can let the canvas act on a key wherever focus is inside it.
 * `scan`: a slow image scans in when it arrives (Art Viewer); the comic reader shows it at once, so page turns stay quick.
 */
export function ArtworkCanvas({ image, view, onChange, schematic = false, reader = false, onFitChosen, keys, scan = false }: { image: ViewerImage; view: View; onChange: (view: View) => void; schematic?: boolean; reader?: boolean; onFitChosen?: (fit: "height" | "width") => void; keys?: MutableRefObject<CanvasKeys | null>; scan?: boolean }) {
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
  // Decoding (design canvas board 10): an image still loading after 150 ms gets a blurred copy of its thumbnail at the
  // size it will have and a DECODING label; a cached image shows neither. In the Art Viewer a slow image then scans in
  // from the top (CRT "on", motion allowed); otherwise it simply appears.
  const [slow, setSlow] = useState(false);
  const [decode, setDecode] = useState<"loading" | "scan" | "done">("loading");
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 150);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (decode !== "scan") return;
    const timer = window.setTimeout(() => setDecode("done"), 460);
    return () => window.clearTimeout(timer);
  }, [decode]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSpace({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const ready = natural.width > 0 && natural.height > 0 && space.width > 0 && space.height > 0;
  const fitFor = (width: number, height: number) => view.fit === "height" ? space.height / height : view.fit === "width" ? space.width / width
    : Math.min(space.width / width, space.height / height);
  const fit = !ready ? 1 : fitFor(natural.width, natural.height);
  const minimum = Math.min(0.1, fit);
  // Zoom in up to 4x, or 4x the fitted size for a small image fitted large (the reader's FIT HEIGHT), so pinching in always works.
  const maximum = Math.max(4, fit * 4);
  const scale = view.scale === null ? fit : Math.max(minimum, Math.min(maximum, view.scale));
  const limitX = Math.max(0, (natural.width * scale - space.width) / 2);
  const limitY = Math.max(0, (natural.height * scale - space.height) / 2);
  const x = Math.max(-limitX, Math.min(limitX, view.x));
  const y = view.scale === null && view.top ? limitY : Math.max(-limitY, Math.min(limitY, view.y));
  const pannable = ready && (limitX > 0 || limitY > 0);
  const live = useRef({ scale, x, y });
  if (frame.current === null) live.current = { scale, x, y };
  const viewNow = useRef(view);
  viewNow.current = view;
  // Moves are batched into one change per frame. A pure pan (drag, wheel, keys) keeps a fitted view fitted, so FIT WIDTH
  // stays FIT WIDTH while the page scrolls; any zoom makes the scale explicit.
  const pending = useRef<"pan" | "zoom" | null>(null);
  const schedule = (kind: "pan" | "zoom") => {
    pending.current = pending.current === "zoom" || kind === "zoom" ? "zoom" : "pan";
    if (frame.current === null) frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const zoomed = pending.current === "zoom";
      pending.current = null;
      const now = viewNow.current;
      change.current(zoomed || now.scale !== null ? live.current : { scale: null, fit: now.fit, x: live.current.x, y: live.current.y });
    });
  };
  const pan = (dx: number, dy: number) => {
    if (!ready) return false;
    const current = live.current;
    const lx = Math.max(0, (natural.width * current.scale - space.width) / 2);
    const ly = Math.max(0, (natural.height * current.scale - space.height) / 2);
    const nx = Math.max(-lx, Math.min(lx, current.x - dx));
    const ny = Math.max(-ly, Math.min(ly, current.y - dy));
    if (nx === current.x && ny === current.y) return false;
    live.current = { scale: current.scale, x: nx, y: ny };
    schedule("pan");
    return true;
  };
  const transform = (factor: number, from: { x: number; y: number }, to = from) => {
    if (!ready) return;
    const current = live.current;
    const bounded = Math.max(minimum, Math.min(maximum, current.scale * factor));
    const ratio = bounded / current.scale;
    const lx = Math.max(0, (natural.width * bounded - space.width) / 2);
    const ly = Math.max(0, (natural.height * bounded - space.height) / 2);
    live.current = { scale: bounded, x: Math.max(-lx, Math.min(lx, to.x - (from.x - current.x) * ratio)), y: Math.max(-ly, Math.min(ly, to.y - (from.y - current.y) * ratio)) };
    schedule(factor === 1 ? "pan" : "zoom");
  };
  const zoom = (next: number) => transform(next / live.current.scale, { x: 0, y: 0 });
  const reset = (next: View) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    pending.current = null;
    live.current = { scale: next.scale ?? fit, x: next.x, y: next.y };
    onChange(next);
  };
  const stopPan = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    setDragging(pointers.current.size > 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const input = useRef({ transform, ready, pan, reader });
  input.current = { transform, ready, pan, reader };
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let safariScale: number | null = null;
    const point = (clientX: number, clientY: number) => {
      const rect = element.getBoundingClientRect();
      return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
    };
    const wheel = (event: WheelEvent) => {
      // Reader: the wheel (without Ctrl) scrolls a page that is larger than the frame; at its edge the page scrolls.
      if (!event.ctrlKey && input.current.reader && event.cancelable) {
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
        if (input.current.pan(event.deltaX * unit, event.deltaY * unit)) event.preventDefault();
        return;
      }
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

  // + (with or without Shift) and = zoom in, - zooms out, 0 fits (the reader handles 0 itself: back to its own fit);
  // arrows pan a zoomed image. An arrow that cannot move the artwork further is left alone: the reader turns the page and
  // the Art Viewer shows the next image with it.
  const act: CanvasKeys = (key) => {
    if (!ready) return false;
    if (key === "+" || key === "=") { zoom(live.current.scale * 1.25); return true; }
    if (key === "-" || key === "_") { zoom(live.current.scale / 1.25); return true; }
    if (key === "0" && !reader) { reset(fitView); return true; }
    if (!pannable || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return false;
    const nx = Math.max(-limitX, Math.min(limitX, x + (key === "ArrowLeft" ? 40 : key === "ArrowRight" ? -40 : 0)));
    const ny = Math.max(-limitY, Math.min(limitY, y + (key === "ArrowUp" ? 40 : key === "ArrowDown" ? -40 : 0)));
    if (nx === x && ny === y) return false;
    onChange({ scale: view.scale, fit: view.fit, x: nx, y: ny });
    return true;
  };
  useEffect(() => {
    if (!keys) return;
    keys.current = act;
    return () => { if (keys.current === act) keys.current = null; };
  });

  const box = { width: natural.width * scale, height: natural.height * scale, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` };
  // The placeholder takes the size the image will have: from the CMS's width and height before it arrives (the
  // derivative being loaded has the same proportions), with the same fit, FIT WIDTH from the top.
  const source = sources[sourceIndex];
  const placeholderSrc = !schematic && image.thumbnailSrc && image.thumbnailSrc !== source ? image.thumbnailSrc : undefined;
  const placeholderBox = (() => {
    if (!placeholderSrc || failed) return null;
    if (ready) return box;
    const width = image.width ?? 0, height = image.height ?? 0;
    if (!width || !height || !space.width || !space.height) return null;
    const f = fitFor(width, height);
    const top = view.top ? Math.max(0, (height * f - space.height) / 2) : 0;
    return { width: width * f, height: height * f, transform: `translate(-50%, calc(-50% + ${top}px))` };
  })();
  const decoding = slow && !failed && decode !== "done";

  return <>
    {reader ? <div className="art-viewer-toolbar reader-toolbar" role="group" aria-label="Page size">
      {/* Short labels on phones (CSS), so the row fits 320 px; the visible text is the accessible name either way. */}
      <button type="button" disabled={!ready} aria-pressed={view.scale === null && view.fit === "height"} onClick={() => { onFitChosen?.("height"); reset(fitHeightView); }}><span className="label-long">FIT HEIGHT</span><span className="label-short">HEIGHT</span></button>
      <button type="button" disabled={!ready} aria-pressed={view.scale === null && view.fit === "width"} onClick={() => { onFitChosen?.("width"); reset(fitWidthView); }}><span className="label-long">FIT WIDTH</span><span className="label-short">WIDTH</span></button>
      <button type="button" disabled={!ready} aria-pressed={view.scale === 1} onClick={() => reset({ scale: 1, x: 0, y: 0 })}><span className="label-long">ACTUAL SIZE</span><span className="label-short">1:1</span></button>
      <button type="button" aria-label="Zoom out" disabled={!ready || scale <= minimum} onClick={() => zoom(scale / 1.25)}>−</button>
      <button type="button" aria-label="Zoom in" disabled={!ready || scale >= maximum} onClick={() => zoom(scale * 1.25)}>+</button>
      <output aria-label="Page size" data-scale={ready ? Math.round(scale * 100) : undefined}>{failed ? "UNAVAILABLE" : !ready ? "LOADING" : view.scale === null ? (view.fit === "width" ? "FIT WIDTH" : "FIT HEIGHT") : view.scale === 1 ? "ACTUAL SIZE" : `ZOOM ${Math.round(scale * 100)}%`}</output>
    </div> : <div className="art-viewer-toolbar" role="group" aria-label="Artwork zoom">
      <button type="button" disabled={!ready} aria-pressed={view.scale === null} onClick={() => reset(fitView)}>FIT</button>
      <button type="button" disabled={!ready} aria-pressed={view.scale === 1} onClick={() => reset({ scale: 1, x: 0, y: 0 })}>100%</button>
      <button type="button" aria-label="Zoom out" disabled={!ready || scale <= minimum} onClick={() => zoom(scale / 1.25)}>−</button>
      <button type="button" aria-label="Zoom in" disabled={!ready || scale >= maximum} onClick={() => zoom(scale * 1.25)}>+</button>
      <output aria-label="Artwork scale" data-scale={ready ? Math.round(scale * 100) : undefined}>{failed ? "UNAVAILABLE" : ready ? `${Math.round(scale * 100)}%` : "LOADING"}</output>
    </div>}
    <div ref={canvas} className="art-viewer-canvas" data-pannable={pannable} data-dragging={dragging}
      tabIndex={ready ? 0 : undefined} role="group" aria-label="Artwork canvas; plus and minus zoom; drag or use arrow keys to pan when zoomed"
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
        if (act(event.key)) event.preventDefault();
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
      {decoding && placeholderBox && <img className="art-viewer-decode" src={placeholderSrc} alt="" aria-hidden="true" draggable={false} style={placeholderBox} />}
      <img className="art-viewer-image" data-schematic={schematic || undefined} data-reveal={decode === "scan" || undefined} src={source} alt={image.alt} draggable={false}
        onError={() => {
          if (sourceIndex + 1 < sources.length) setSourceIndex(sourceIndex + 1);
          else setFailed(true);
        }}
        onLoad={(event) => {
          setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
          const motion = scan && slow && document.documentElement.dataset.crt === "on" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          setDecode(motion ? "scan" : "done");
        }}
        style={ready ? box : { visibility: "hidden" }} />
      {decode === "scan" && ready && <span className="art-viewer-scan" aria-hidden="true" style={box} />}
      {decoding && !ready && <span className="art-viewer-decoding" aria-hidden="true">DECODING {fileLabel(source)}</span>}
      {failed && <div className="art-viewer-placeholder">ARTWORK UNAVAILABLE</div>}
    </div>
  </>;
}

export default function ArtViewer() {
  const { viewerTabs, activeViewerTab, switchViewerTab, closeViewerTab, closeWindow, windows, toggleMaximizeWindow } = useWindowManager();
  const pathname = usePathname();
  const headingId = useId();
  const [imageIndex, setImageIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const canvasKeys = useRef<CanvasKeys | null>(null);
  const [views, setViews] = useState<Record<string, View>>({});
  const normalViews = useRef<Record<string, View>>({});
  // Restored tabs reopen the viewer after a reload only if it was open (bugs.md 2026-10-27).
  const [startOpen] = useState(() => { try { return window.sessionStorage.getItem(viewerClosedKey) !== "1"; } catch { return true; } });
  const record = windows.find((window) => window.id === "art-viewer");
  const maximized = record?.maximized;
  const active = viewerTabs.find((tab) => tab.id === activeViewerTab) ?? viewerTabs[0];

  useEffect(() => setImageIndex(0), [active?.id]);
  const count = active?.images.length ?? 0;
  // The shown image's thumbnail stays in view in the filmstrip; only the strip scrolls, never the page.
  useEffect(() => {
    const row = strip.current, current = row?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!row || !current) return;
    const outer = row.getBoundingClientRect(), inner = current.getBoundingClientRect();
    const left = inner.left < outer.left ? row.scrollLeft + inner.left - outer.left - 8 : inner.right > outer.right ? row.scrollLeft + inner.right - outer.right + 8 : null;
    if (left !== null) row.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [imageIndex, active?.id]);
  // Escape closes the viewer whenever it is open, also after another window took focus (bugs.md 2026-10-22). One Escape
  // closes one thing: it listens on window, after the document-level handlers (inspector, promo and monitor windows),
  // skips keys they already handled, leaves the boot/announcement window and text fields alone, and ignores auto-repeat.
  const closeable = Boolean(active && record?.open && !record.minimized);
  useEffect(() => {
    if (!closeable) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.repeat || event.isComposing) return;
      if (event.target instanceof Element && event.target.closest("select, input, textarea, [contenteditable]")) return;
      if (document.querySelector(".startup-sequence")) return;
      event.preventDefault();
      closeWindow("art-viewer");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [closeable, closeWindow]);
  // Keys inside the viewer window (design canvas board 9), wherever focus is in it: the canvas acts first (zoom, fit, a
  // zoomed image pans); otherwise Left / Right show the previous / next image (not on auto-repeat, so holding an arrow
  // to pan never races through the images). Tabs, form fields, shortcuts and keys already handled are left alone.
  const position = useRef({ index: imageIndex, count });
  position.current = { index: imageIndex, count };
  useEffect(() => {
    if (!closeable) return;
    let frame: number | null = null;
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest(".art-viewer-window") || target.closest('[role="tab"], input, select, textarea, [contenteditable]')) return;
      if (canvasKeys.current?.(event.key)) { event.preventDefault(); return; }
      if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight") || event.shiftKey || event.repeat) return;
      const { index, count: total } = position.current;
      const next = index + (event.key === "ArrowRight" ? 1 : -1);
      if (next < 0 || next >= total) return;
      event.preventDefault();
      setImageIndex(next);
      // From the filmstrip, focus follows the shown image.
      if (target.closest(".art-viewer-thumbs")) frame = requestAnimationFrame(() => strip.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus());
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [closeable]);
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
    defaultOpen={startOpen}
    defaultPosition={{ x: 70, y: 50 }}
    defaultSize={{ width: 900, height: 650 }}
    titlebarContent={tabs}
    onToggleMaximize={() => {
      if (maximized) setViews(normalViews.current);
      else normalViews.current = views;
      toggleMaximizeWindow("art-viewer");
    }}
  >
    {image ? <ArtworkCanvas key={viewKey} schematic={!artwork} scan keys={canvasKeys} image={image} view={views[viewKey] ?? fitView} onChange={(view) => setViews((current) => ({ ...current, [viewKey]: view }))} /> : <div className="art-viewer-canvas"><div className="art-viewer-placeholder">NO PUBLIC ARTWORK FILED<br /><Link className="art-viewer-page-link" href={active.href} prefetch={false} onClick={() => closeWindow("art-viewer")}>OPEN {active.title.toUpperCase()} PAGE</Link></div></div>}
    {/* Caption (board 9): beside the canvas in a window at least 760 px wide, under it otherwise (CSS container query).
        A plain group, not a landmark: it sits inside the window's own region. It scrolls when the text is long, so it
        takes focus for keyboard scrolling. */}
    <div className="art-viewer-meta" role="group" aria-labelledby={headingId} tabIndex={0}>
      {count > 1 && <output className="art-viewer-position">IMAGE {imageIndex + 1} / {count}</output>}
      <h2 id={headingId}>{active.title}</h2>
      <p className="art-viewer-context">{active.project}{active.role ? ` / ${active.role}` : ""}</p>
      {image?.caption && <p className="art-viewer-caption">{image.caption}</p>}
      {active.description && <p className="art-viewer-description">{active.description}</p>}
      {!artwork && image && <p className="art-viewer-note">NO CONCEPT ART FILED. SHOWING SCHEMATIC POSTER.</p>}
      {/* Every page but the record's own (a gallery tab's link carries a #hash). */}
      {image && pathname !== active.href.split("#")[0] && <p><Link className="art-viewer-page-link" href={active.href} prefetch={false} onClick={() => closeWindow("art-viewer")}>OPEN RECORD<span aria-hidden="true"> ▸</span></Link></p>}
      {image && <p className="art-viewer-hint" aria-hidden="true">drag to pan{count > 1 ? " · ← → images" : ""} · + − zoom</p>}
    </div>
    {count > 1 && <div className="art-viewer-thumbs" role="group" aria-label={`${active.title} images`} ref={strip}>
      {active.images.map((item, index) => <button type="button" key={`${item.src}-${index}`} className={index === imageIndex ? "is-active" : ""}
        aria-current={index === imageIndex ? "true" : undefined}
        aria-label={`Image ${index + 1} of ${count}${item.alt && item.alt !== active.title ? `: ${item.alt}` : ""}`}
        onClick={() => setImageIndex(index)}>
        <img src={item.thumbnailSrc ?? item.src} alt="" loading="lazy" />
      </button>)}
    </div>}
  </RetroWindow>;
}
