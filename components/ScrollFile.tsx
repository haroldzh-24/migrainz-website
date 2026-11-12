"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { crtMode, onMotionChange, reducedMotion } from "@/components/home/motion";

export type ScrollFileSection = { id: string; label: string };

// The scroll-told project file (design canvas board 21; batch 26). Inside the project window the scrolling element is
// the window's content area (.project-app-content, remounted per pathname), so everything here measures against it:
// - SCROLL nnn% in the header strip (aria-hidden) and a 2 px progress rail beside the index, from one passive,
//   rAF-throttled scroll listener;
// - the ON THIS PAGE index (a nav of real #id links): the current section gets aria-current="location"; a click scrolls
//   the window to the section (smoothly only when motion is allowed) and moves focus to its heading;
// - the big outlined section numbers drift and the key art shifts a little with the scroll (transform only, at most
//   --motion-max-travel, 24 px), and picture frames below the first screen reveal once (clip-path and opacity over
//   --motion-reveal) when they come 78% of the way up the window (IntersectionObserver, root = the window).
// Nothing moves with reduced motion, SYSTEM ▸ MOTION: REDUCED, the plain view (reducedMotion()), CRT not "on", or
// in print; the hidden start state is only added here, after hydration, below the fold, so the page reads in full
// without script. Titles and text never animate (DECODE does not run inside grey windows).
export default function ScrollFile({ name, code, phase, updated, sections, children }: {
  name: string; code: string; phase: string; updated: string; sections: ScrollFileSection[]; children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLOListElement>(null);
  const [pct, setPct] = useState(0);
  const [current, setCurrent] = useState(sections[0]?.id);
  const ids = sections.map(section => section.id).join(" ");

  useEffect(() => {
    const file = root.current;
    const box = file?.closest<HTMLElement>(".project-app-content");
    if (!file || !box) return;
    const parts = ids.split(" ").flatMap(id => { const element = document.getElementById(id); return element ? [element] : []; });
    const travel = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--motion-max-travel")) || 24;
    const printing = window.matchMedia("print");
    const moving = () => !reducedMotion() && crtMode() === "on" && !printing.matches;
    const art = file.querySelector<HTMLElement>("[data-scroll-art] > *");
    const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

    let frame = 0;
    const measure = () => {
      frame = 0;
      const max = box.scrollHeight - box.clientHeight;
      const progress = max <= 1 ? 1 : Math.min(1, Math.max(0, box.scrollTop / max));
      setPct(Math.round(progress * 100));
      const top = box.getBoundingClientRect().top, view = box.clientHeight;
      // The current section: the last one whose top has passed 30% of the window; at the very end, the last one.
      let now = parts[0]?.id;
      for (const part of parts) if (part.getBoundingClientRect().top - top <= view * 0.3) now = part.id;
      if (progress >= 0.999 && parts.length) now = parts[parts.length - 1].id;
      setCurrent(now);
      // Frames still waiting that are already past the 78% line (a jump skipped over them) reveal now.
      for (const element of file.querySelectorAll<HTMLElement>('[data-reveal="pending"]'))
        if (element.getBoundingClientRect().top - top < view * 0.78) element.dataset.reveal = "in";
      const limit = travel();
      for (const part of parts) {
        const number = part.querySelector<HTMLElement>(".scroll-file-num");
        if (!number) continue;
        // 0.35x the scroll, centred on the section's top sitting 40% down the window, clamped to ±24 px.
        number.style.transform = moving() ? `translate3d(0, ${clamp((view * 0.4 - (part.getBoundingClientRect().top - top)) * 0.35, limit).toFixed(1)}px, 0)` : "";
      }
      if (art) art.style.transform = moving() ? `translate3d(0, ${(-Math.min(limit, box.scrollTop * 0.18)).toFixed(1)}px, 0)` : "";
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };

    // Reveal once: frames below the first screen start hidden (only when motion may run) and open at the 78% line.
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { (entry.target as HTMLElement).dataset.reveal = "in"; reveal.unobserve(entry.target); }
    }, { root: box, rootMargin: "0px 0px -22% 0px" });
    const frames = [...file.querySelectorAll<HTMLElement>(".scroll-reveal")];
    if (moving()) {
      const bottom = box.getBoundingClientRect().bottom;
      for (const element of frames) if (element.getBoundingClientRect().top > bottom) { element.dataset.reveal = "pending"; reveal.observe(element); }
    }
    const settle = () => {
      if (!moving()) for (const element of frames) { delete element.dataset.reveal; reveal.unobserve(element); }
      measure();
    };

    box.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const resized = new ResizeObserver(onScroll);
    resized.observe(file);
    const stopSettings = onMotionChange(settle);
    printing.addEventListener("change", settle);
    measure();
    return () => {
      box.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      resized.disconnect();
      reveal.disconnect();
      stopSettings();
      printing.removeEventListener("change", settle);
      if (frame) cancelAnimationFrame(frame);
      for (const element of frames) delete element.dataset.reveal;
      for (const part of parts) part.querySelector<HTMLElement>(".scroll-file-num")?.style.removeProperty("transform");
      art?.style.removeProperty("transform");
    };
  }, [ids]);

  // Phones: keep the current entry of the index strip in view (the strip scrolls sideways; the window is left alone).
  useEffect(() => {
    const list = strip.current;
    const link = list?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!list || !link || list.scrollWidth <= list.clientWidth + 1) return;
    const left = link.offsetLeft - list.offsetLeft, right = left + link.offsetWidth;
    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) list.scrollLeft = Math.max(0, left - 12);
  }, [current]);

  const go = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const box = root.current?.closest<HTMLElement>(".project-app-content");
    const target = document.getElementById(id);
    if (!box || !target) return;
    event.preventDefault();
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const top = box.scrollTop + target.getBoundingClientRect().top - box.getBoundingClientRect().top - margin;
    box.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
    target.querySelector<HTMLElement>(".scroll-file-title")?.focus({ preventScroll: true });
    setCurrent(id);
  };

  return <div ref={root} className="scroll-file" style={{ "--scroll-progress": pct / 100 } as CSSProperties}>
    <div className="scroll-file-head">
      <p className="eyebrow directory-path">SYS:/PROJECTS/<b>{name}</b>/</p>
      <span className="scroll-file-pct" aria-hidden="true">SCROLL {String(pct).padStart(3, "0")}%</span>
    </div>
    <div className="scroll-file-body">
      <nav className="scroll-file-index" aria-label="On this page">
        <div className="scroll-file-index-label" aria-hidden="true">ON THIS PAGE</div>
        <div className="scroll-file-index-track">
          <span className="scroll-file-rail" aria-hidden="true"><span className="scroll-file-rail-fill" /></span>
          <ol ref={strip}>
            {sections.map((section, index) => <li key={section.id}>
              <a href={`#${section.id}`} aria-current={current === section.id ? "location" : undefined} onClick={event => go(event, section.id)}>
                <span className="scroll-file-index-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span>{section.label}</span>
              </a>
            </li>)}
          </ol>
        </div>
        <div className="scroll-file-index-meta">{code} · {phase}<br />UPDATED <time dateTime={updated}>{updated}</time></div>
      </nav>
      <div className="scroll-file-main">{children}</div>
    </div>
  </div>;
}
