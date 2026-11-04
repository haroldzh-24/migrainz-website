"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Operations log (design canvas board 12): the newest public project updates, with NEW on the ones this browser has not
// seen before. "Seen" lives only on this device (localStorage, a list of update IDs); nothing about the visitor goes to the
// server. The first visit on a device marks nothing new.
export type OperationsEntry = { id: number; code: string; href: string; title: string; date: string; thumb?: { src: string } };

const SEEN_KEY = "migrainz-operations-seen-v1";
// This visit's baseline: copied from SEEN_KEY on the first mount of a visit, so a second mount (React's dev double run,
// or coming Back from a project) shows the same NEW marks. A tab lives on (reloads, phones restoring tabs), so the
// baseline counts as a new visit after VISIT_MS (12b).
const BASELINE_KEY = "migrainz-operations-baseline-v1";
const VISIT_MS = 30 * 60 * 1000;
const SEEN_LIMIT = 300;

function readIDs(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is number => Number.isInteger(id)) : null;
  } catch { return null; }
}

export default function OperationsLog({ entries, allIDs }: { entries: OperationsEntry[]; allIDs: number[] }) {
  // null until mounted (the server knows nothing about this browser), then the IDs that are new on this visit.
  const [fresh, setFresh] = useState<Set<number> | null>(null);
  useEffect(() => {
    let marks = new Set<number>();
    try {
      // The visit's copy: {"seen": [...], "at": ms} for a returning device, {"seen": null, ...} for its first visit.
      let stored: unknown = null;
      try { stored = JSON.parse(sessionStorage.getItem(BASELINE_KEY) ?? "null"); } catch { stored = null; }
      let visit = typeof stored === "object" && stored && "seen" in stored && "at" in stored && typeof stored.at === "number"
        ? stored as { seen: unknown; at: number } : null;
      // A visit older than VISIT_MS, or one dated in the future (the clock moved back), starts a new visit (13b).
      const age = visit ? Date.now() - visit.at : NaN;
      if (!visit || !(age >= 0 && age <= VISIT_MS)) {
        visit = { seen: readIDs(localStorage.getItem(SEEN_KEY)), at: Date.now() };
        // Its own try (13b): a failed write still keeps the marks just worked out for this page.
        try { sessionStorage.setItem(BASELINE_KEY, JSON.stringify(visit)); } catch { /* this tab only */ }
      }
      const baseline = Array.isArray(visit.seen) ? visit.seen.filter((id): id is number => Number.isInteger(id)) : null;
      const known = new Set(baseline ?? []);
      // A device that has never seen the log: nothing is "new".
      marks = new Set(baseline ? allIDs.filter(id => !known.has(id)) : []);
    } catch { /* Storage blocked: the log works, without NEW. */ }
    setFresh(marks);
    // Recorded on its own, so a full storage keeps the marks just read; nothing to record without public updates (an
    // empty list would make the next visit count every update as new).
    if (!allIDs.length) return;
    try {
      const seen = [...new Set([...allIDs, ...(readIDs(localStorage.getItem(SEEN_KEY)) ?? [])])].slice(0, SEEN_LIMIT);
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    } catch { /* not recorded this time */ }
  }, [allIDs]);

  if (!entries.length) return null;
  const count = fresh?.size ?? 0;
  return (
    <section className="operations-log" aria-labelledby="operations-log-title">
      <h2 id="operations-log-title">OPERATIONS LOG</h2>
      <p className="operations-log-status">{count ? `${count} NEW SINCE YOUR LAST VISIT` : `LATEST ${entries[0].date}`}</p>
      <ol role="list">
        {entries.map(entry => {
          const isNew = fresh?.has(entry.id) ?? false;
          return (
            <li key={entry.id} data-new={isNew || undefined}>
              <time dateTime={entry.date}>{entry.date}</time>{" "}
              <span className="operations-log-code">{entry.code}</span>{" "}
              <span className="operations-log-new">{isNew ? "NEW" : ""}</span>{" "}
              <span className="operations-log-text">
                {entry.title}{" "}
                <Link href={entry.href}>{`OPEN\u00a0${entry.code}`}<span aria-hidden="true">{"\u00a0▸"}</span></Link>
              </span>
              {entry.thumb ? <img className="operations-log-thumb" src={entry.thumb.src} alt="" loading="lazy" /> : <span className="operations-log-thumb" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
