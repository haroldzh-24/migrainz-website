"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ArtworkCanvas, fitHeightView, fitWidthView, keepFocusAfterChange, type View } from "@/components/ArtViewer";
import { RetroWindow, useWindowManager } from "@/components/WindowManager";
import ClassifiedPlaceholder from "@/components/ClassifiedPlaceholder";
import PageFlip, { type PageFlipHandle } from "@/components/PageFlip";
import { ghost } from "@/lib/ghost";
import { pagePreloads } from "@/lib/page-preload";
import { projectHref, type Project, type Chapter } from "@/lib/content/types";

const windowID = "comic-reader";

export default function ComicReader({
  project,
  chapter,
  next = null,
}: {
  project: Pick<Project, "slug" | "title">;
  chapter: Chapter;
  next?: { href: string; number: number } | null;
}) {
  const [page, setPage] = useState(0);
  // Board 4: a page fits the frame's height on a landscape screen and its width on a portrait one (phones). A reader who
  // picks FIT HEIGHT or FIT WIDTH keeps it for the next pages; zoom and pan start over on each page.
  const [view, setView] = useState<View>(fitHeightView);
  const chosenFit = useRef<"height" | "width" | null>(null);
  const fitted = () => (chosenFit.current ?? (window.innerHeight > window.innerWidth ? "width" : "height")) === "width" ? fitWidthView : fitHeightView;
  useEffect(() => setView(fitted()), []); // eslint-disable-line react-hooks/exhaustive-deps
  // Only the FIT buttons choose a fit; scrolling a fitted page does not.
  const chooseFit = (fit: "height" | "width") => { chosenFit.current = fit; };
  const pageSelectID = useId();
  const { toggleMaximizeWindow, unregisterWindow } = useWindowManager();
  const unregisterRef = useRef(unregisterWindow);
  unregisterRef.current = unregisterWindow;
  useEffect(() => () => unregisterRef.current(windowID), []);
  const current = chapter.pages[page];
  const titlebar = <>
    <span className="comic-reader-title-context" title={`${project.title} / ${chapter.title}`}>
      {project.title} / {chapter.chapterNumber !== undefined ? `CHAPTER ${chapter.chapterNumber} / ` : "CHAPTER / "}{chapter.title}
    </span>
    <Link className="comic-reader-return" href={projectHref(project)}>PROJECT</Link>
  </>;

  // Batch 15: the page turns over (PageFlip). The page on screen is captured here, before the page changes: the keyed
  // ArtworkCanvas below replaces its image in the same commit. No flip from or to a classified or missing page. Batch 28:
  // also while the page is still loading (PageFlip then turns its decoding placeholder or a plain sheet at its box).
  const flip = useRef<PageFlipHandle>(null);
  /** Where a page sits in the page area with a fitted view, from its CMS size (the same sum as ArtworkCanvas). */
  function fittedRect(area: HTMLElement, target: Chapter["pages"][number] | undefined, shown: View) {
    const width = target?.width ?? 0, height = target?.height ?? 0;
    if (!width || !height) return null;
    const rect = area.getBoundingClientRect(), style = getComputedStyle(area);
    const left = rect.left + area.clientLeft + parseFloat(style.paddingLeft), top = rect.top + area.clientTop + parseFloat(style.paddingTop);
    const spaceW = area.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const spaceH = area.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (spaceW <= 0 || spaceH <= 0) return null;
    const scale = shown.scale ?? (shown.fit === "height" ? spaceH / height : shown.fit === "width" ? spaceW / width : Math.min(spaceW / width, spaceH / height));
    const w = width * scale, h = height * scale;
    const limitX = Math.max(0, (w - spaceW) / 2), limitY = Math.max(0, (h - spaceH) / 2);
    const x = Math.max(-limitX, Math.min(limitX, shown.x));
    const y = shown.scale === null && shown.top ? limitY : Math.max(-limitY, Math.min(limitY, shown.y));
    return new DOMRect(left + spaceW / 2 - w / 2 + x, top + spaceH / 2 - h / 2 + y, w, h);
  }
  function startFlip(to: number) {
    const target = chapter.pages[to];
    const area = content.current?.querySelector<HTMLElement>(".comic-page-stage .art-viewer-canvas");
    const image = area?.querySelector<HTMLImageElement>("img.art-viewer-image") ?? null;
    if (!flip.current || !content.current || !area || !current?.src || current.classification || !target?.src || target.classification) {
      flip.current?.finish();
      return;
    }
    const placeholder = area.querySelector<HTMLImageElement>("img.art-viewer-decode");
    flip.current.start({
      image, imageRect: image?.getBoundingClientRect() ?? null, area: area.getBoundingClientRect(), container: content.current.getBoundingClientRect(),
      direction: to > page ? "next" : "prev", background: getComputedStyle(area).backgroundColor,
      placeholder, placeholderRect: placeholder?.getBoundingClientRect() ?? null,
      pageRect: fittedRect(area, current, view), targetRect: fittedRect(area, target, fitted()),
    });
  }
  // The last few page images stay referenced, so the browser keeps them decoded for a quick PREV (no new request).
  const shownImages = useRef<HTMLImageElement[]>([]);
  useEffect(() => {
    const image = content.current?.querySelector<HTMLImageElement>(".comic-page-stage img.art-viewer-image");
    if (image) shownImages.current = [image, ...shownImages.current.filter(item => item !== image)].slice(0, 3);
  }, [page]);
  // Batch 28: once the page on screen has loaded (or failed), the next and the previous page are preloaded with exactly
  // the source the reader will use, so a turn finds them ready. Within one document the browser's list of available
  // images reuses a loaded image even though media is sent "no-store". Never more than one ahead and one behind; not
  // classified or missing pages; not under Save-Data. Preloads no longer next to the page are dropped (an unfinished one
  // is cancelled), and all of them when the chapter changes or the reader closes.
  const preloads = useRef(new Map<string, HTMLImageElement>());
  const [settled, setSettled] = useState<number | null>(null);
  const shownSettled = !current?.src || Boolean(current.classification) || settled === page;
  useEffect(() => {
    if (!shownSettled) return;
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    const { wanted, keep } = pagePreloads(chapter.pages, page, saveData);
    for (const [src, image] of preloads.current) if (!keep.has(src)) { image.removeAttribute("src"); preloads.current.delete(src); }
    for (const src of wanted) {
      if (preloads.current.has(src)) continue;
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      preloads.current.set(src, image);
    }
  }, [page, chapter, shownSettled]);
  useEffect(() => () => {
    for (const image of preloads.current.values()) image.removeAttribute("src");
    preloads.current.clear();
  }, [chapter]);

  // Batch 20: reaching the last page by reading (NEXT or arrow keys, after at least half the pages were on screen in
  // this visit) counts as finishing the chapter; the ghost then says it has read what happens next, once per chapter,
  // when the next chapter of the same comic is readable. A strip over the bottom of the page for 6 s; no page height.
  const seen = useRef(new Set<number>([0]));
  const [ghostLine, setGhostLine] = useState(false);
  // 20b: the strip stays while the pointer is on it or focus is in it, and gives focus back to the reader if it goes.
  // Hover and focus are held apart (20c): leaving with the mouse never ends a hold that focus still has.
  const [ghostHover, setGhostHover] = useState(false);
  const [ghostFocus, setGhostFocus] = useState(false);
  const ghostHeld = ghostHover || ghostFocus;
  const strip = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!ghostLine || ghostHeld) return;
    const timer = window.setTimeout(() => {
      if (strip.current?.contains(document.activeElement)) content.current?.focus({ preventScroll: true });
      setGhostLine(false);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [ghostLine, ghostHeld]);
  function goToPage(nextPage: number, by: "read" | "jump" = "read") {
    const bounded = Math.max(0, Math.min(chapter.pages.length - 1, nextPage));
    if (bounded === page) return;
    seen.current.add(bounded);
    const last = chapter.pages.length - 1;
    if (by === "read" && bounded === last && last > 0 && seen.current.size * 2 >= chapter.pages.length) {
      const label = `${project.title} ${chapter.chapterNumber !== undefined ? `chapter ${String(chapter.chapterNumber).padStart(2, "0")}` : chapter.title}`;
      ghost.chapterFinished(label);
      if (next && ghost.allows("chapter") && ghost.once(`chapter:${project.slug}/${chapter.slug}`)) setGhostLine(true);
    }
    startFlip(bounded);
    // PREV or NEXT turns disabled at the first or last page; focus on it would drop to the page body (11b).
    const navigation = content.current?.querySelector(".comic-reader-navigation") ?? null;
    if (navigation?.contains(document.activeElement)) {
      cancelKeep.current();
      cancelKeep.current = keepFocusAfterChange(navigation, content.current);
    }
    setPage(bounded);
    setView(fitted());
  }

  // A page turned by key replaces the page and its toolbar; focus that was on them moves to the new page (10b).
  const content = useRef<HTMLElement>(null);
  const cancelKeep = useRef(() => {});
  useEffect(() => () => cancelKeep.current(), []);
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (event.defaultPrevented || target.closest("select, input, textarea, [contenteditable='true']") || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      if (target.closest(".comic-page-stage")) {
        cancelKeep.current();
        cancelKeep.current = keepFocusAfterChange(target.closest(".comic-page-stage"), content.current);
      }
      goToPage(page + (event.key === "ArrowRight" ? 1 : -1));
    }
    // 0: back to the reader's own fit (FIT HEIGHT on a landscape screen, FIT WIDTH on a portrait one, or the one chosen).
    if (event.key === "0") {
      event.preventDefault();
      setView(fitted());
    }
  }

  return (
    <RetroWindow
      id={windowID}
      title="COMIC READER"
      className="comic-reader-window"
      routeWindow
      defaultPosition={{ x: 32, y: 24 }}
      defaultSize={{ width: 1040, height: 700 }}
      defaultMaximized
      titlebarContent={titlebar}
      onToggleMaximize={() => toggleMaximizeWindow(windowID)}
    >
      <section ref={content} className="comic-reader-content" aria-label="Comic reader" tabIndex={0} onKeyDown={keyboard}>
        <div className="comic-page-stage">
          {current?.classification ? <ClassifiedPlaceholder classification={current.classification} label={current.safeLabel} variant="media" />
            : current?.src ? <ArtworkCanvas key={`${page}-${current.src}`} reader image={current} view={view} onChange={setView} onFitChosen={chooseFit} onSettled={() => setSettled(page)} />
            : <p className="comic-page-empty" role="status">{current ? "PAGE UNAVAILABLE" : "NO PUBLIC PAGES FILED"}</p>}
        </div>
        <footer className="comic-reader-navigation">
          <button type="button" disabled={page === 0 || !current} onClick={() => goToPage(page - 1)}>PREV</button>
          <output aria-live="polite">PAGE {chapter.pages.length ? page + 1 : 0} / {chapter.pages.length}</output>
          <label htmlFor={pageSelectID}>GO TO
            <select id={pageSelectID} aria-label="Go to page" value={page}
              onChange={(event) => goToPage(Number(event.target.value), "jump")} disabled={!chapter.pages.length}>
              {chapter.pages.map((_, index) => <option key={index} value={index}>{index + 1}</option>)}
            </select>
          </label>
          <button type="button" disabled={page >= chapter.pages.length - 1 || !current} onClick={() => goToPage(page + 1)}>NEXT</button>
        </footer>
        <PageFlip ref={flip} />
        {/* Mounted before the strip appears, so screen readers announce its words (20b). */}
        <span className="visually-hidden" role="status">{ghostLine && next ? `i've read what happens next. Link: chapter ${next.number}.` : ""}</span>
        {ghostLine && next && <p ref={strip} className="ghost-chapter"
          onPointerEnter={event => { if (event.pointerType === "mouse") setGhostHover(true); }} onPointerLeave={() => setGhostHover(false)}
          onFocus={() => setGhostFocus(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setGhostFocus(false); }}>
          <span aria-hidden="true">i&apos;ve read what happens next.</span> <Link href={next.href}>{`CHAPTER ${String(next.number).padStart(2, "0")} →`}</Link>
        </p>}
      </section>
    </RetroWindow>
  );
}
