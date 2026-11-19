"use client";

import { reducedMotion } from "@/components/home/motion";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { setBusy } from "@/lib/busy";
import { cssTime } from "@/lib/css-time";

// Comic reader page flip (rework plan batch 15; Harold, 2026-11-04: "a page flip effect when you click next page ...
// slightly pixelated"; his picks in the preview: 550 ms, curl 100, pixel size 1, 24 frames a second). A canvas laid over
// the page area, drawn only while a page turns: NEXT turns the page that was on screen over its left edge, revealing
// the new page underneath (the real page, already in place); PREV brings the earlier page back over the current one.
// The turning sheet is drawn in thin vertical strips bent around the hinge with a little perspective, shaded in six
// steps (the pixel-art touch that stays at pixel size 1), and it throws a stepped shadow on the page below. Drawing
// only, from images already on screen: no new request, no pixel read-back. Reduced motion or CRT off: no flip (an
// instant turn). Never takes focus or input (pointer-events: none, aria-hidden); a new turn, a change in the reader's
// size, or panning, zooming or another key on the page finishes the one running (15b). The sheet is drawn in at most
// 640 strips at up to twice the CSS pixel size, so on a wide page or a 3x screen a strip is 2-3 device pixels wide.
// Batch 28: the turn plays while pages are still loading. A page that is not on screen yet turns as its visible decoding
// placeholder (the blurred thumbnail at the page's box), or else as a plain sheet (the page area's colour with a 1 px
// darker edge) at the page's fitted box when known, else over the page area. PREV whose earlier page is not ready within
// READY_WAIT_MS brings back that page's placeholder or a plain sheet; the real page appears underneath when it loads.

export type FlipStart = {
  /** The page image on screen before the turn (it may still be loading, hidden). */
  image: HTMLImageElement | null;
  /** Its box, and the page area's box, in viewport pixels, measured before the page changes. */
  imageRect: DOMRect | null;
  area: DOMRect;
  /** The reader's content box the overlay is placed in. */
  container: DOMRect;
  direction: "next" | "prev";
  /** The page area's background (drawn under the current page for PREV, and the plain sheet's colour). */
  background: string;
  /** While the outgoing page loads: its visible decoding placeholder, and its fitted box (from the CMS size). */
  placeholder?: HTMLImageElement | null;
  placeholderRect?: DOMRect | null;
  pageRect?: DOMRect | null;
  /** PREV: the earlier page's fitted box, for a plain sheet when it is not ready in time. */
  targetRect?: DOMRect | null;
};
export type PageFlipHandle = { start: (flip: FlipStart) => boolean; finish: () => void };
export type SheetKind = "page" | "placeholder" | "plain";

const FPS = 24;
const CURL = 0.9; // curl 100 in the preview
const MAX_STRIPS = 640;
const READY_WAIT_MS = 300; // PREV: how long the earlier page may take to be ready before its placeholder or a plain sheet turns
const DEFAULT_MS = 550;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const plain = () => reducedMotion() || document.documentElement.dataset.crt === "off";
const flipMs = () => cssTime("--motion-page-flip", DEFAULT_MS);
const loaded = (image: HTMLImageElement | null | undefined): image is HTMLImageElement => Boolean(image && image.complete && image.naturalWidth > 0);
const usable = (image: HTMLImageElement | null | undefined): image is HTMLImageElement => loaded(image) && image.style.visibility !== "hidden";

type Box = { x: number; y: number; w: number; h: number };
const intersect = (a: Box, b: Box): Box | null => {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 2 && h > 2 ? { x, y, w, h } : null;
};
const boxOf = (rect: DOMRect, origin: DOMRect): Box => ({ x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height });

/** Paints a whole sheet into the box (x, y, w, h) of a 2D context. */
type Paint = (context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void;
type Sheet = { kind: SheetKind; paint: Paint; box: Box };

const imagePaint = (image: HTMLImageElement): Paint => (context, x, y, w, h) => {
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, x, y, w, h);
};
/** The decoding placeholder as it looks on screen: blurred, desaturated and faint over the page area. */
const placeholderPaint = (image: HTMLImageElement, background: string, blur: number): Paint => (context, x, y, w, h) => {
  context.save();
  context.fillStyle = background;
  context.fillRect(x, y, w, h);
  context.globalAlpha = 0.55;
  context.filter = `blur(${Math.max(1, Math.round(blur))}px) saturate(.4)`; // 8 CSS px on screen, in canvas pixels
  context.imageSmoothingEnabled = true;
  context.drawImage(image, x, y, w, h);
  context.restore();
};
/** A darker shade of a CSS rgb()/rgba() colour (the plain sheet's 1 px edge). */
const darker = (colour: string) => {
  const parts = colour.match(/[\d.]+/g)?.map(Number) ?? [];
  if (parts.length < 3) return "rgba(0,0,0,.45)";
  return `rgb(${parts.slice(0, 3).map(value => Math.round(value * 0.6)).join(",")})`;
};
const plainPaint = (background: string, edge: number): Paint => (context, x, y, w, h) => {
  context.fillStyle = darker(background);
  context.fillRect(x, y, w, h);
  context.fillStyle = background;
  context.fillRect(x + edge, y + edge, Math.max(0, w - 2 * edge), Math.max(0, h - 2 * edge));
};

/** The visible part of a sheet, painted at the strip resolution (one strip per column). */
function sheetCopy(sheet: Sheet, visible: Box, scale: number) {
  const columns = Math.max(1, Math.min(MAX_STRIPS, Math.round(visible.w * scale)));
  const copy = document.createElement("canvas");
  copy.width = columns;
  copy.height = Math.max(1, Math.round(visible.h * scale));
  const context = copy.getContext("2d");
  if (!context) return null;
  const kx = copy.width / visible.w, ky = copy.height / visible.h;
  sheet.paint(context, (sheet.box.x - visible.x) * kx, (sheet.box.y - visible.y) * ky, sheet.box.w * kx, sheet.box.h * ky);
  return copy;
}

type Running = {
  direction: "next" | "prev";
  kind: SheetKind | null;
  area: Box;
  sheet: Box;
  copy: HTMLCanvasElement;
  scale: number;
  under: { sheet: Sheet; background: string } | null;
  start: number;
  duration: number;
  lastFrame: number;
};

const PageFlip = forwardRef<PageFlipHandle>(function PageFlip(_, handle) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const running = useRef<Running | null>(null);
  const frame = useRef(0);
  const waiting = useRef(0);
  const stopInput = useRef(() => {});

  const finish = () => {
    cancelAnimationFrame(frame.current);
    cancelAnimationFrame(waiting.current);
    const was = running.current;
    running.current = null;
    if (holder.current) { holder.current.hidden = true; delete holder.current.dataset.sheet; }
    stopInput.current();
    // Release the canvas memory between turns (15b): a full-area canvas at 2x is tens of MB.
    if (canvas.current) canvas.current.width = canvas.current.height = 0;
    if (was) {
      setBusy("page-turn", false);
      window.dispatchEvent(new CustomEvent("migrainz:page-flip", { detail: { state: "end", direction: was.direction, sheet: was.kind } }));
    }
  };

  const draw = (run: Running, progress: number) => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const k = run.scale;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.clearRect(0, 0, element.width, element.height);
    context.setTransform(k, 0, 0, k, 0, 0);
    // PREV: the page being covered is drawn here (the real page underneath is already the earlier one).
    if (run.under) {
      context.fillStyle = run.under.background;
      context.fillRect(0, 0, run.area.w, run.area.h);
      const { box } = run.under.sheet;
      run.under.sheet.paint(context, box.x, box.y, box.w, box.h);
    }
    const p = run.direction === "next" ? ease(progress) : 1 - ease(progress);
    const { sheet, copy } = run;
    const columns = copy.width, step = sheet.w / columns;
    const xs = new Float32Array(columns + 1), zs = new Float32Array(columns + 1), angles = new Float32Array(columns);
    let x = 0, z = 0;
    for (let i = 0; i < columns; i++) {
      const u = (i + 0.5) / columns;
      const angle = Math.min(Math.PI, Math.max(0, Math.PI * (p * (1 + CURL) - CURL * (1 - u))));
      angles[i] = angle; xs[i] = x; zs[i] = z;
      x += Math.cos(angle) * step;
      z += Math.sin(angle) * step;
    }
    xs[columns] = x; zs[columns] = z;
    const distance = sheet.w * 2.6, cx = sheet.x + sheet.w / 2, cy = sheet.y + sheet.h / 2;
    const sx = new Float32Array(columns + 1), sc = new Float32Array(columns + 1);
    let right = -Infinity;
    for (let i = 0; i <= columns; i++) {
      const s = distance / (distance - zs[i]);
      sc[i] = s;
      sx[i] = cx + (sheet.x + xs[i] - cx) * s;
      if (sx[i] > right) right = sx[i];
    }
    // The lifted page's shadow on the page below, in four hard bands.
    const lift = Math.sin(Math.PI * p);
    if (lift > 0.02) {
      const width = Math.max(2, sheet.w * 0.16 * lift), bands = 4;
      context.save();
      context.beginPath();
      context.rect(0, 0, run.area.w, run.area.h);
      context.clip();
      for (let band = 0; band < bands; band++) {
        const x0 = Math.round(right + (band * width) / bands), x1 = Math.round(right + ((band + 1) * width) / bands);
        context.fillStyle = `rgba(0,0,0,${(0.38 * lift * (1 - band / bands)).toFixed(3)})`;
        context.fillRect(x0, sheet.y, Math.max(1, x1 - x0), sheet.h);
      }
      context.restore();
    }
    const fade = 1 - smooth(0.8, 1, p);
    if (fade <= 0) return;
    const order = Array.from({ length: columns }, (_, i) => i).sort((a, b) => zs[a] + zs[a + 1] - (zs[b] + zs[b + 1]));
    context.imageSmoothingEnabled = false;
    context.globalAlpha = fade;
    for (const i of order) {
      const left = Math.min(sx[i], sx[i + 1]), width = Math.abs(sx[i + 1] - sx[i]) + 0.6 / k;
      if (width <= 0.05) continue;
      const height = sheet.h * ((sc[i] + sc[i + 1]) / 2), top = cy - height / 2;
      context.drawImage(copy, i, 0, 1, copy.height, left, top, width, height);
      // Light from the reader's side, rounded to six steps; the back of the page is darker.
      const facing = Math.cos(angles[i]);
      let dark = 1 - Math.round((0.3 + 0.7 * Math.abs(facing)) * 6) / 6;
      if (facing < 0) dark = 0.55 + 0.4 * dark;
      if (dark > 0.01) {
        context.fillStyle = `rgba(0,0,0,${dark.toFixed(3)})`;
        context.fillRect(left, top, width, height);
      }
    }
    context.globalAlpha = 1;
  };

  const tick = (now: number) => {
    const run = running.current;
    if (!run) return;
    if (!run.start) run.start = now;
    const elapsed = now - run.start;
    if (elapsed >= run.duration) { finish(); return; }
    const quantized = Math.floor(elapsed / (1000 / FPS));
    if (quantized !== run.lastFrame) {
      run.lastFrame = quantized;
      try { draw(run, Math.min(1, (quantized * 1000) / FPS / run.duration)); } catch { finish(); return; }
    }
    frame.current = requestAnimationFrame(tick);
  };

  useImperativeHandle(handle, () => ({
    finish,
    start: flip => {
      finish();
      const element = canvas.current, box = holder.current;
      if (!element || !box || plain()) return false;
      const area = boxOf(flip.area, flip.container);
      const local = (b: Box): Box => ({ x: b.x - area.x, y: b.y - area.y, w: b.w, h: b.h });
      const localRect = (rect: DOMRect | null | undefined, origin: DOMRect) => rect ? local(boxOf(rect, origin)) : null;
      if (area.w < 40 || area.h < 40) return false;
      const scale = Math.min(2, window.devicePixelRatio || 1);
      const areaLocal = { x: 0, y: 0, w: area.w, h: area.h };
      // What turns: the page itself when it is on screen; else its decoding placeholder; else a plain sheet at the page's
      // fitted box (or the page area).
      const plainSheet = (rect: Box | null): Sheet => ({ kind: "plain", paint: plainPaint(flip.background, 1), box: rect && intersect(rect, areaLocal) ? rect : areaLocal });
      const imageBox = localRect(flip.imageRect, flip.container);
      const placeholderBox = localRect(flip.placeholderRect, flip.container);
      const outgoing: Sheet = usable(flip.image) && imageBox ? { kind: "page", paint: imagePaint(flip.image), box: imageBox }
        : loaded(flip.placeholder) && placeholderBox ? { kind: "placeholder", paint: placeholderPaint(flip.placeholder, flip.background, 8 * scale), box: placeholderBox }
        : plainSheet(localRect(flip.pageRect, flip.container));
      if (!intersect(outgoing.box, areaLocal)) return false;
      Object.assign(box.style, { left: `${area.x}px`, top: `${area.y}px`, width: `${area.w}px`, height: `${area.h}px` });
      element.width = Math.round(area.w * scale);
      element.height = Math.round(area.h * scale);
      const begin = (sheet: Sheet, under: Running["under"]) => {
        try {
          const visibleSheet = intersect(sheet.box, areaLocal);
          const copy = visibleSheet && sheetCopy(sheet, visibleSheet, scale);
          if (!visibleSheet || !copy) { finish(); return; }
          running.current = { direction: flip.direction, kind: sheet.kind, area: areaLocal, sheet: visibleSheet, copy, scale, under, start: 0, duration: flipMs(), lastFrame: -1 };
          box.dataset.sheet = sheet.kind;
          draw(running.current, 0);
          frame.current = requestAnimationFrame(tick);
        } catch { finish(); } // never left marked running (17b)
      };
      const under = { sheet: outgoing, background: flip.background };
      // Marked running first (15b), so anything that finishes it from here on also clears the busy flag and ends it.
      running.current = { direction: flip.direction, kind: null, area: areaLocal, sheet: areaLocal, copy: element, scale, under: flip.direction === "prev" ? under : null, start: 0, duration: flipMs(), lastFrame: -1 };
      box.hidden = false;
      setBusy("page-turn", true);
      window.dispatchEvent(new CustomEvent("migrainz:page-flip", { detail: { state: "start", direction: flip.direction, sheet: flip.direction === "next" ? outgoing.kind : null } }));
      // Panning, zooming or any other key on the page ends the turn at once, so input is never hidden behind it (15b).
      const content = box.parentElement;
      if (content) {
        const stop = () => finish();
        const key = (event: KeyboardEvent) => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") finish(); };
        const sized = new ResizeObserver(entries => {
          const size = entries[entries.length - 1].contentRect;
          if (Math.abs(size.width - flip.container.width) > 1 || Math.abs(size.height - flip.container.height) > 1) finish();
        });
        content.addEventListener("pointerdown", stop, true);
        content.addEventListener("wheel", stop, { capture: true, passive: true });
        content.addEventListener("keydown", key, true);
        sized.observe(content);
        stopInput.current = () => {
          content.removeEventListener("pointerdown", stop, true);
          content.removeEventListener("wheel", stop, true);
          content.removeEventListener("keydown", key, true);
          sized.disconnect();
          stopInput.current = () => {};
        };
      }
      if (flip.direction === "next") {
        // The page on screen turns away; the new page is already in place underneath (or loading there).
        begin(outgoing, null);
        return true;
      }
      // PREV: hold the current page on screen (drawn under) until the earlier page's image is ready, then bring it back
      // over at the size the reader gives it. Not ready in time: its decoding placeholder, or a plain sheet, turns instead.
      const context = element.getContext("2d");
      try {
        if (context) {
          context.setTransform(scale, 0, 0, scale, 0, 0);
          context.fillStyle = flip.background;
          context.fillRect(0, 0, area.w, area.h);
          outgoing.paint(context, outgoing.box.x, outgoing.box.y, outgoing.box.w, outgoing.box.h);
        }
      } catch { finish(); return false; }
      const asked = performance.now();
      const wait = () => {
        if (!running.current) return;
        const stage = box.parentElement?.querySelector(".comic-page-stage");
        const next = stage?.querySelector<HTMLImageElement>("img.art-viewer-image") ?? null;
        const container = box.parentElement!.getBoundingClientRect();
        if (next && next !== flip.image && usable(next)) {
          begin({ kind: "page", paint: imagePaint(next), box: local(boxOf(next.getBoundingClientRect(), container)) }, under);
          return;
        }
        if (performance.now() - asked > READY_WAIT_MS) {
          const decode = stage?.querySelector<HTMLImageElement>("img.art-viewer-decode");
          begin(loaded(decode) ? { kind: "placeholder", paint: placeholderPaint(decode, flip.background, 8 * scale), box: local(boxOf(decode.getBoundingClientRect(), container)) }
            : plainSheet(localRect(flip.targetRect, flip.container)), under);
          return;
        }
        waiting.current = requestAnimationFrame(wait);
      };
      waiting.current = requestAnimationFrame(wait);
      return true;
    },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // The reader's own size (a ResizeObserver while turning, 15b) finishes a turn; so does leaving.
  useEffect(() => () => finish(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={holder} className="page-flip" aria-hidden="true" hidden><canvas ref={canvas} /></div>;
});

export default PageFlip;
