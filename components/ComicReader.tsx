"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import { projectHref, type Project, type Chapter } from "@/data/projects";

export default function ComicReader({
  project,
  chapter,
}: {
  project: Project;
  chapter: Chapter;
}) {
  const [page, setPage] = useState(0);
  const current = chapter.pages[page];
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (
      (event.target as HTMLElement).tagName === "SELECT" ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setPage((value) => Math.min(chapter.pages.length - 1, value + 1));
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPage((value) => Math.max(0, value - 1));
    }
  }
  if (!current)
    return (
      <p>
        No public pages filed yet.{" "}
        <Link href={projectHref(project)}>Return to {project.title}</Link>
      </p>
    );
  const controls = (
    <>
      <button
        className="terminal-button"
        disabled={page === 0}
        onClick={() => setPage(page - 1)}
      >
        ← PREVIOUS
      </button>
      <span>
        PAGE {page + 1} / {chapter.pages.length}
      </span>
      <button
        className="terminal-button"
        disabled={page === chapter.pages.length - 1}
        onClick={() => setPage(page + 1)}
      >
        NEXT →
      </button>
    </>
  );
  return (
    <section
      className="comic-reader"
      aria-label="Comic reader"
      tabIndex={0}
      onKeyDown={keyboard}
    >
      <Link className="section-link" href={projectHref(project)}>
        ← RETURN TO {project.title}
      </Link>
      <div className="reader-toolbar">
        <label htmlFor="page-select">GO TO PAGE </label>
        <select
          id="page-select"
          value={page}
          onChange={(event) => setPage(Number(event.target.value))}
        >
          {chapter.pages.map((_, index) => (
            <option key={index} value={index}>
              {index + 1}
            </option>
          ))}
        </select>
        <span>SINGLE PAGE / LEFT & RIGHT ARROW KEYS</span>
      </div>
      <nav
        className="reader-controls"
        aria-label="Page navigation above artwork"
      >
        {controls}
      </nav>
      <figure className="comic-figure">
        <img src={current.src} alt={current.alt} width={900} height={1200} />
        <figcaption aria-live="polite" aria-atomic="true">
          PAGE {page + 1} / {chapter.pages.length} — {current.alt}
        </figcaption>
      </figure>
      <nav
        className="reader-controls"
        aria-label="Page navigation below artwork"
      >
        {controls}
      </nav>
      {page === chapter.pages.length - 1 && (
        <p className="reader-end">
          END OF SAMPLE CHAPTER /{" "}
          <Link href={projectHref(project)}>RETURN TO {project.title} →</Link>
        </p>
      )}
    </section>
  );
}
