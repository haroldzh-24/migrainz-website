"use client";

import { useEffect, useRef, useState } from "react";
import Watcher from "@/components/Watcher";
import { CELL_H, CELL_W, imageToText, noise, renderStatic, GLYPHS } from "@/lib/home/text-graphics";
import { crtMode, finePointer, reducedMotion, watchMotion } from "@/components/home/motion";

export type HomeChannel = { name: string; ext: string; caption: string; lines: string[] };

const TITLE = ["MIGRAINZ", "ARCHIVE & PROJECTS"] as const;
// The idle line says what the visitor can do here: move over the Watcher only where the lens runs (a mouse, motion
// allowed, CRT "on"); otherwise preview files by hover or focus; on touch a tap simply opens the file.
const IDLE = "Move over the Watcher to read its signal. Hover a file to preview it.";
const IDLE_STILL = "Hover or focus a file to preview it.";
const IDLE_TOUCH = "Signal steady. Tap a file to open it.";
const idleText = () => !finePointer() ? IDLE_TOUCH : !reducedMotion() && crtMode() === "on" ? IDLE : IDLE_STILL;
const LENS_RADIUS = 84;
// The Watcher base layer's box inside .watcher: art inset 7%, 86% wide, plus 80px of glow padding per 1200px each side.
const BASE_INSET = 0.07 - 0.86 * 80 / 1200;
const BASE_SIZE = 0.86 * 1360 / 1200;


/**
 * The homepage's centre panel (design canvas board 23): the Watcher with a one-line glowing title over it, a layer of
 * text-mode static behind it, a "text lens" that redraws the Watcher as characters around the mouse, and a dark preview
 * panel for the directory row being hovered or focused. Everything is decoration over the existing Watcher: the title is
 * read by screen readers as plain text, while the moving characters, the previews and the caption are hidden from them
 * (the directory links themselves carry the names). The title and the caption keep their own state, so their
 * per-frame updates never re-render the Watcher.
 */
export default function HomeSignal({ channels }: { channels: Record<string, HomeChannel> }) {
  const [channel, setChannel] = useState<string | null>(null);
  const [wipe, setWipe] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const current = useRef<string | null>(null);
  const staticRef = useRef<HTMLPreElement>(null);
  const lensRef = useRef<HTMLPreElement>(null);

  // Static: sparse dots scattered again every 220ms while the panel is on screen and CRT effects are "on"; held still
  // under reduced motion or CRT "reduced", gone with CRT "off" (CSS hides the layer).
  useEffect(() => {
    const pre = staticRef.current, box = stage.current?.querySelector<HTMLElement>(".watcher");
    if (!pre || !box) return;
    let step = 0, timer = 0;
    const size = () => ({ cols: Math.ceil(box.clientWidth / CELL_W) + 1, rows: Math.ceil(box.clientHeight / CELL_H) + 1 });
    const draw = () => { const { cols, rows } = size(); pre.textContent = renderStatic(cols, rows, step); };
    draw();
    const resize = new ResizeObserver(draw);
    resize.observe(box);
    // The re-scatter timer runs only while the layer may move (watchMotion); nothing polls while it is held or hidden.
    const stop = watchMotion(box, running => {
      clearInterval(timer);
      timer = running ? window.setInterval(() => { step += 1; draw(); }, 220) : 0;
    });
    return () => { clearInterval(timer); resize.disconnect(); stop(); };
  }, []);

  // Text lens: the Watcher's base layer sampled into characters once, shown inside a circle around a mouse pointer. The
  // art underneath is masked out of that circle (CSS variables on .watcher, no React renders while the mouse moves).
  useEffect(() => {
    const box = stage.current?.querySelector<HTMLElement>(".watcher");
    const pre = lensRef.current;
    const base = box?.querySelector<HTMLElement>(".watcher-base");
    if (!box || !pre || !base) return;
    let lines: string[] | null = null, frame = 0, flicker = 0, sampledFor = "";
    let pending: { x: number; y: number } | null = null;
    const sample = () => {
      const url = /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(base).backgroundImage)?.[1];
      const width = box.clientWidth * BASE_SIZE, height = box.clientHeight * BASE_SIZE;
      const cols = Math.max(4, Math.floor(width / CELL_W)), rows = Math.max(4, Math.floor(height / CELL_H));
      const key = `${url}|${cols}x${rows}`;
      if (!url || key === sampledFor) return;
      sampledFor = key;
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = cols; canvas.height = rows;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) return;
          context.drawImage(image, 0, 0, cols, rows);
          lines = imageToText(context.getImageData(0, 0, cols, rows).data, cols, rows);
          pre.style.paddingLeft = `${box.clientWidth * BASE_INSET}px`;
          pre.style.paddingTop = `${box.clientHeight * BASE_INSET}px`;
          pre.textContent = lines.join("\n");
        } catch { lines = null; }
      };
      image.src = url;
    };
    const allowed = () => !reducedMotion() && crtMode() === "on" && finePointer();
    const off = () => {
      delete box.dataset.lens;
      clearInterval(flicker); flicker = 0;
    };
    const apply = () => {
      frame = 0;
      if (!pending || !lines) return;
      box.style.setProperty("--lens-x", `${pending.x}px`);
      box.style.setProperty("--lens-y", `${pending.y}px`);
      box.style.setProperty("--lens-r", `${LENS_RADIUS}px`);
      box.dataset.lens = "";
      if (!flicker) flicker = window.setInterval(() => {
        if (!lines) return;
        pre.textContent = lines.map(line => {
          if (Math.random() > 0.3) return line;
          const at = Math.floor(Math.random() * line.length);
          return line[at] === " " ? line : line.slice(0, at) + GLYPHS[Math.floor(Math.random() * GLYPHS.length)] + line.slice(at + 1);
        }).join("\n");
      }, 60);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !allowed()) { off(); return; }
      if (!lines) { sample(); return; }
      const rect = box.getBoundingClientRect();
      const scale = rect.width / (box.offsetWidth || rect.width);
      pending = { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const leave = () => { pending = null; cancelAnimationFrame(frame); frame = 0; off(); };
    // Sampled lazily, on the first mouse move where the lens may run, and again after a resize or a phosphor switch
    // (the base image changes with the colour).
    const stale = () => { lines = null; sampledFor = ""; };
    const resize = new ResizeObserver(stale);
    resize.observe(box);
    const phosphor = new MutationObserver(stale);
    phosphor.observe(document.documentElement, { attributes: true, attributeFilter: ["data-phosphor"] });
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerleave", leave);
    return () => {
      leave();
      resize.disconnect();
      phosphor.disconnect();
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerleave", leave);
    };
  }, []);

  // Previews: the directory row under the mouse or keyboard focus picks the channel; leaving the list goes back to idle.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".terminal-nav");
    if (!nav) return;
    let leaveTimer = 0;
    const pick = (event: Event) => {
      const key = (event.target as Element | null)?.closest<HTMLElement>("[data-channel]")?.dataset.channel ?? null;
      if (!key || !channels[key]) return;
      clearTimeout(leaveTimer);
      if (current.current === key) return;
      current.current = key;
      setChannel(key);
      setWipe(value => value + 1);
    };
    const leave = () => { clearTimeout(leaveTimer); leaveTimer = window.setTimeout(() => { current.current = null; setChannel(null); }, 120); };
    const blur = (event: FocusEvent) => { if (!nav.contains(event.relatedTarget as Node | null)) leave(); };
    nav.addEventListener("pointerover", pick);
    nav.addEventListener("focusin", pick);
    nav.addEventListener("pointerleave", leave);
    nav.addEventListener("focusout", blur);
    return () => {
      clearTimeout(leaveTimer);
      nav.removeEventListener("pointerover", pick);
      nav.removeEventListener("focusin", pick);
      nav.removeEventListener("pointerleave", leave);
      nav.removeEventListener("focusout", blur);
    };
  }, [channels]);

  const active = channel ? channels[channel] : null;
  return (
    <div className="home-signal" ref={stage} data-channel={channel ?? undefined}>
      <HomeTitle />
      <Watcher>
        <pre ref={staticRef} className="home-static" aria-hidden="true" />
        <pre ref={lensRef} className="home-lens" aria-hidden="true" />
        <span className="home-lens-ring" aria-hidden="true" />
        {active && (
          <div key={wipe} className="home-preview" aria-hidden="true">
            <div className="pnl">
              <div className="pnl-h"><span><b>{active.name}</b><i> {active.ext}</i></span><span className="pnl-end">END. PROGRAM</span></div>
              <div className="home-preview-lines">{active.lines.map((line, index) => <p key={index}>{line}</p>)}</div>
            </div>
          </div>
        )}
      </Watcher>
      <HomeCaption active={active} />
    </div>
  );
}

/** The one-line title over the Watcher; decodes once when the screen powers on (after the boot, or at once without). */
function HomeTitle() {
  const [title, setTitle] = useState<{ done: string; noise: string }[]>(TITLE.map(text => ({ done: text, noise: "" })));
  // Title: decodes once when the screen powers on (after the boot, or at once when there is no boot this visit).
  useEffect(() => {
    let timer = 0;
    const run = () => {
      clearTimeout(timer);
      if (reducedMotion() || crtMode() === "off") { setTitle(TITLE.map(text => ({ done: text, noise: "" }))); return; }
      const start = performance.now() + 250;
      const tick = () => {
        const now = performance.now();
        setTitle(TITLE.map((text, index) => {
          const progress = Math.max(0, Math.min(1, (now - start - index * 240) / 900));
          const shown = Math.floor(text.length * progress);
          return { done: text.slice(0, shown), noise: noise(text.slice(shown)) };
        }));
        if (now - start < 900 + 240) timer = window.setTimeout(tick, 40);
      };
      tick();
    };
    if (document.documentElement.dataset.power === "on") run();
    const onPower = () => run();
    window.addEventListener("migrainz:power-on", onPower);
    return () => { clearTimeout(timer); window.removeEventListener("migrainz:power-on", onPower); };
  }, []);

  return (
    <div className="home-title">
      <h1>
        <span className="visually-hidden">MIGRAINZ ARCHIVE &amp; PROJECTS</span>
        <span className="home-title-main" aria-hidden="true">{title[0].done}<span className="home-title-noise">{title[0].noise}</span></span>
        <span className="home-title-sub" aria-hidden="true">{title[1].done}<span className="home-title-noise">{title[1].noise}</span></span>
      </h1>
    </div>
  );
}

/** The caption under the Watcher: types out the active channel's line (all at once under reduced motion). */
function HomeCaption({ active }: { active: HomeChannel | null }) {
  const [caption, setCaption] = useState(IDLE);
  useEffect(() => {
    const text = active ? active.caption : idleText();
    if (reducedMotion()) { setCaption(text); return; }
    let shown = 0, timer = 0;
    const tick = () => {
      shown = Math.min(text.length, shown + 2);
      setCaption(text.slice(0, shown));
      if (shown < text.length) timer = window.setTimeout(tick, 16);
    };
    tick();
    return () => clearTimeout(timer);
  }, [active]);
  return <p className="home-caption" aria-hidden="true"><span>{active ? `▸ ${active.name.toLowerCase()}${active.ext.toLowerCase()}` : "▸ watcher"}</span> {caption}<span className="home-caret">_</span></p>;
}
