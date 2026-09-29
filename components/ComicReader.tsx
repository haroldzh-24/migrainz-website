"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ArtworkCanvas, fitView, type View } from "@/components/ArtViewer";
import { RetroWindow, useWindowManager } from "@/components/WindowManager";
import ClassifiedPlaceholder from "@/components/ClassifiedPlaceholder";
import { projectHref, type Project, type Chapter } from "@/lib/content/types";

const windowID = "comic-reader";

export default function ComicReader({
  project,
  chapter,
}: {
  project: Pick<Project, "slug" | "title">;
  chapter: Chapter;
}) {
  const [page, setPage] = useState(0);
  const [view, setView] = useState<View>(fitView);
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

  function goToPage(nextPage: number) {
    const bounded = Math.max(0, Math.min(chapter.pages.length - 1, nextPage));
    if (bounded === page) return;
    setPage(bounded);
    setView(fitView);
  }

  function keyboard(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (event.defaultPrevented || target.closest("select, input, textarea, [contenteditable='true']") || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToPage(page + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPage(page - 1);
    }
  }

  return (
    <RetroWindow
      id={windowID}
      title="COMIC READER"
      className="comic-reader-window"
      defaultPosition={{ x: 32, y: 24 }}
      defaultSize={{ width: 1040, height: 700 }}
      titlebarContent={titlebar}
      onToggleMaximize={() => toggleMaximizeWindow(windowID)}
    >
      <section className="comic-reader-content" aria-label="Comic reader" tabIndex={0} onKeyDown={keyboard}>
        <div className="comic-page-stage">
          {current?.classification ? <ClassifiedPlaceholder classification={current.classification} label={current.safeLabel} variant="media" />
            : current?.src ? <ArtworkCanvas key={`${page}-${current.src}`} image={current} view={view} onChange={setView} />
            : <p className="comic-page-empty" role="status">{current ? "PAGE UNAVAILABLE" : "NO PUBLIC PAGES FILED"}</p>}
        </div>
        <footer className="comic-reader-navigation">
          <button type="button" disabled={page === 0 || !current} onClick={() => goToPage(page - 1)}>PREV</button>
          <output aria-live="polite">PAGE {chapter.pages.length ? page + 1 : 0} / {chapter.pages.length}</output>
          <label htmlFor={pageSelectID}>GO TO
            <select id={pageSelectID} aria-label="Go to page" value={page}
              onChange={(event) => goToPage(Number(event.target.value))} disabled={!chapter.pages.length}>
              {chapter.pages.map((_, index) => <option key={index} value={index}>{index + 1}</option>)}
            </select>
          </label>
          <button type="button" disabled={page >= chapter.pages.length - 1 || !current} onClick={() => goToPage(page + 1)}>NEXT</button>
        </footer>
      </section>
    </RetroWindow>
  );
}
