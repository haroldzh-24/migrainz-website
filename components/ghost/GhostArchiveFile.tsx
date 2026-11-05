"use client";

import { useEffect, useId, useState } from "react";
import { ghost } from "@/lib/ghost";

// Batch 20: from a browser's fifth visit on, the archive lists one more file, unlisted.txt, filed by the ghost. It opens
// in place (a small notepad under the row), so nothing above it moves and focus stays with the visitor. The note is a
// draft for Harold to rewrite or approve (rework plan, question 7).
// Harold has not approved the wording yet: until he does, the row shows only outside production builds (20b review).
export const UNLISTED_APPROVED = false;
export const UNLISTED_NOTE = [
  "you found it. most people never scroll this far.",
  "i've been filing things here since 1999. nobody reads them.",
  "the good stuff is in requisitions.exe. the better stuff is behind patreon.key.",
  "don't tell the studio i left this here.",
  "— tty0",
];

export default function GhostArchiveFile() {
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const noteId = useId();
  useEffect(() => { setShown((UNLISTED_APPROVED || process.env.NODE_ENV !== "production") && ghost.archiveUnlocked()); }, []);
  if (!shown) return null;
  return <>
    <div className="directory-row ghost-file-row">
      <span aria-hidden="true">↳</span>
      <strong><button type="button" className="ghost-file" aria-expanded={open} aria-controls={noteId} onClick={() => setOpen(value => !value)}>unlisted.txt</button></strong>
      <span>FILED BY tty0</span>
    </div>
    {open && <div className="ghost-note" id={noteId} role="document" aria-label="unlisted.txt">
      <div className="ghost-note-title" aria-hidden="true">unlisted.txt - Notepad</div>
      <pre>{UNLISTED_NOTE.join("\n")}</pre>
    </div>}
  </>;
}
