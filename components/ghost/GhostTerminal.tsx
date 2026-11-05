"use client";

import { useEffect, useRef, useState } from "react";
import { useSound } from "@/components/SoundProvider";
import { ghost, lateNight } from "@/lib/ghost";
import { afterIdle, onActivity } from "@/lib/idle";

// Batch 19: the ghost's stunts in the homepage terminal. Each is one of the visit's ambient events (lib/ghost.ts decides
// if one happens at all; at most one per visit, rarely), except the welcome-back lines on visits 3, 7 and 13.
// - A second user: a ????@migrainz line under the log types a message, waits, erases itself (SESSIONS: 2 meanwhile).
// - A second cursor: a faint "_" one line under the prompt for about a second.
// - Idle takeover: after a minute with no input the prompt types by itself (`open requisitions.exe`, which opens the
//   shop ad if none opened this visit and the screen is 480 px or wider; else `cd /archive/.unlisted`), then "go on.
//   i'll wait."; any move, key or touch stops it ("^C", "(input returned to public)").
// - Welcome back: "welcome back. visit N from this browser." ... printed in the terminal as ghost lines.
// All of it is decoration (aria-hidden, outside the log), never takes focus or blocks typing; keyboard clatter only
// when the site's sound is on. Reduced motion or CRT off: no stunts (welcome-back lines still print).

const SECOND_USER_AFTER_MS = 8000;
const SECOND_CURSOR_AFTER_MS = 10000;
const IDLE_MS = 60000;
const MESSAGES = ["don't open 04", "you're not the only one reading this", "i can see your cursor"];

type Show = { prompt: string; text: string; cursor: boolean; faint?: boolean; after?: string[] } | null;

export const say = (lines: string[]) => window.dispatchEvent(new CustomEvent("migrainz:ghost-say", { detail: { lines } }));

export default function GhostTerminal({ onSessions }: { onSessions: (count: number | null) => void }) {
  const { enabled: soundOn, playSound } = useSound();
  const sound = useRef(soundOn);
  sound.current = soundOn;
  const [show, setShow] = useState<Show>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const later = (ms: number, run: () => void) => { timers.current.push(window.setTimeout(run, ms)); };
    const clearAll = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
    const click = () => { if (sound.current) playSound("tick"); };
    let stopActivity = () => {};
    // Types `text` into the shown line, one character at a time at a person's uneven pace, then calls `done`.
    const typeInto = (prompt: string, text: string, done: () => void, after: string[] = []) => {
      let at = 0;
      const step = () => {
        at++;
        setShow({ prompt, text: text.slice(0, at), cursor: true, after });
        click();
        if (at >= text.length) { later(0, done); return; }
        later(90 + Math.random() * 170 + (text[at] === " " ? 120 : 0), step);
      };
      later(500, step);
    };
    const eraseThen = (prompt: string, text: string, done: () => void) => {
      let left = text.length;
      const step = () => {
        left--;
        setShow({ prompt, text: text.slice(0, Math.max(0, left)), cursor: true });
        if (left <= 0) { later(300, done); return; }
        later(40, step);
      };
      later(40, step);
    };
    const end = () => { clearAll(); stopActivity(); setShow(null); onSessions(null); };

    // Welcome back (milestones, not an ambient event).
    later(1500, () => {
      const visit = ghost.milestone();
      if (visit === null) return;
      const chapter = ghost.lastChapter();
      say([
        lateNight() ? "you're up late too." : `welcome back. visit ${visit} from this browser.`,
        ...(ghost.adEver() ? [] : ["you still haven't opened requisitions.exe."]),
        ...(chapter ? [`you read all of ${chapter} though. i saw.`] : []),
        "(i keep count. nobody asked me to.)",
      ]);
    });

    // A second user types.
    later(ghost.delay("second-user", SECOND_USER_AFTER_MS), () => {
      if (!ghost.claim("second-user")) return;
      const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      onSessions(2);
      window.dispatchEvent(new CustomEvent("migrainz:ghost", { detail: { name: "second-user" } }));
      // The visitor typing (or pressing anything) wins at once.
      stopActivity = onActivity(end);
      typeInto("????@migrainz:~$ ", message, () => later(1700, () => eraseThen("????@migrainz:~$ ", message, end)));
    });

    // A second cursor.
    later(ghost.delay("second-cursor", SECOND_CURSOR_AFTER_MS), () => {
      if (!ghost.claim("second-cursor")) return;
      window.dispatchEvent(new CustomEvent("migrainz:ghost", { detail: { name: "second-cursor" } }));
      setShow({ prompt: "", text: "", cursor: true, faint: true });
      later(1100, () => setShow(null));
    });

    // Idle takeover.
    const stopIdle = afterIdle(ghost.delay("idle", IDLE_MS), () => {
      if (document.querySelector(".startup-sequence") || !ghost.claim("idle")) return;
      stopIdle();
      const shop = window.innerWidth >= 480 && !ghost.adThisVisit() && Boolean(document.querySelector("#shop .nav-trigger"));
      const command = shop ? "open requisitions.exe" : "cd /archive/.unlisted";
      window.dispatchEvent(new CustomEvent("migrainz:ghost", { detail: { name: "idle", command } }));
      const prompt = "public@migrainz:~$ ";
      const interrupted = () => {
        clearAll();
        setShow({ prompt, text: command, cursor: false, after: ["^C", "(input returned to public)"] });
        later(2500, () => setShow(null));
      };
      stopActivity = onActivity(interrupted);
      typeInto(prompt, command, () => {
        if (shop) {
          window.dispatchEvent(new CustomEvent("migrainz:ghost-ad"));
          document.querySelector<HTMLButtonElement>("#shop .nav-trigger")?.click();
        }
        setShow({ prompt, text: command, cursor: false, after: shop ? ["go on. i'll wait."] : [`cd: ${command.slice(3)}: permission denied`, "(not yet.)"] });
        later(6000, () => { stopActivity(); setShow(null); });
      });
    });

    return () => { clearAll(); stopIdle(); stopActivity(); onSessions(null); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;
  return (
    <div className="ghost-terminal" data-faint={show.faint || undefined} aria-hidden="true">
      <p>{show.prompt && <span className="ghost-terminal-prompt">{show.prompt}</span>}{show.text}{show.cursor && <span className="ghost-terminal-cursor">_</span>}</p>
      {show.after?.map(line => <p key={line}>{line}</p>)}
    </div>
  );
}
