"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { arrival, visitRecord } from "@/lib/arrival";
import { isGraphicsPath } from "@/lib/graphics-mode";

// Board 18, 01 DECODE (batch 14): a terminal page's heading decodes in when you arrive on it by a link or Back, once
// per page per visit: characters settle left to right over --motion-decode (1100 ms) while the rest shows noise. Plain
// on the server, on the first load, inside grey windows and on the grey-window desktop, on "/" (the homepage has its
// own title decode), coming from the grey-window desktop (the reverse switch plays), during the boot's power-on, with
// reduced motion or CRT off. Screen readers get the real words throughout: the real text stays in one span that never
// changes (visually hidden while decoding) and the noise is an aria-hidden sibling. Monospace and a break-free noise set
// keep the width and line breaks unchanged.

// GLYPHS from lib/home/text-graphics.ts without the characters a line may break at ("-", "/", "\\", "|", "_", "%", "+",
// "<", ">"), so the noise wraps exactly like the real heading.
const NOISE = "#&*=01ABCDEFHKMNRSXZ";
const PRINTABLE = /^[\x20-\x7e]+$/;
const decoded = typeof window === "undefined" ? null : visitRecord("migrainz-decoded-v1");

const scramble = (text: string) => {
  let out = "";
  for (const c of text) out += c === " " ? c : NOISE[Math.floor(Math.random() * NOISE.length)];
  return out;
};
const duration = () => {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--motion-decode"));
  return Number.isFinite(value) && value > 0 ? value : 1100;
};

function shouldDecode(element: HTMLElement | null, text: string) {
  if (!element || !decoded || !arrival.hydrated) return false;
  const path = location.pathname;
  const root = document.documentElement;
  if (path === "/" || isGraphicsPath(path) || isGraphicsPath(arrival.lastPath ?? "/")) return false;
  if (root.dataset.power !== "on" || document.querySelector("main#top.power-on")) return false;
  if (element.closest(".retro-window") || document.querySelector(".graphics-route")) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.crt === "off") return false;
  return PRINTABLE.test(text) && !decoded.has(path);
}

export default function DecodeText({ text }: { text: string }) {
  const real = useRef<HTMLSpanElement>(null);
  // Decided once per mount (StrictMode's second effect run keeps the decision).
  const decision = useRef<boolean | null>(null);
  const [shown, setShown] = useState<{ done: string; noise: string } | null>(null);

  // A layout effect, so the full heading never shows for a frame first.
  useLayoutEffect(() => {
    if (decision.current === null) decision.current = shouldDecode(real.current, text);
    if (!decision.current) return;
    const path = location.pathname;
    const length = duration();
    let frame = 0, start = 0, lastScramble = 0, settled = 0, noise = scramble(text);
    setShown({ done: "", noise });
    const step = (now: number) => {
      if (!start) {
        start = now;
        decoded?.add(path); // marked only once a frame has really run (a StrictMode cleanup may cancel the first)
        window.dispatchEvent(new CustomEvent("migrainz:decode", { detail: { state: "start", text } }));
      }
      const t = Math.min(1, (now - start) / length);
      if (t >= 1) {
        decision.current = false;
        setShown(null);
        window.dispatchEvent(new CustomEvent("migrainz:decode", { detail: { state: "end", text } }));
        return;
      }
      // Ease out: most characters settle early; the noise re-rolls every 50 ms, not every frame.
      const count = Math.floor(text.length * (1 - (1 - t) ** 2));
      if (count !== settled || now - lastScramble > 50) {
        settled = count;
        lastScramble = now;
        noise = scramble(text.slice(count));
        setShown({ done: text.slice(0, count), noise });
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      setShown(null);
    };
  }, [text]);

  return <>
    <span ref={real} className={shown ? "visually-hidden" : undefined}>{text}</span>
    {shown && <span className="decode-text" aria-hidden="true">{shown.done}<span className="decode-noise">{shown.noise}</span></span>}
  </>;
}
