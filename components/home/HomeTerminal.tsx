"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "@/components/SoundProvider";
import { openRoute } from "@/lib/graphics-mode";

type Line = { text: string; kind: "in" | "out" | "ok" | "err" | "dim"; id?: number };
export type TerminalProject = { slug: string; code: string; title: string; status: string };

// Directory names the shell knows, in the order `ls` prints them; each goes to an existing route or opens a promo window.
const SECTIONS = [
  { key: "projects", file: "projects.db", href: "/projects", aliases: ["project", "projects.db"] },
  { key: "comics", file: "comics/", href: "/comics", aliases: ["comic", "reader"] },
  { key: "operations", file: "operations.log", href: "/tracker", aliases: ["tracker", "operations.log", "ops"] },
  { key: "archive", file: "archive/", href: "/archive", aliases: ["archives"] },
  { key: "info", file: "info.txt", href: "/about", aliases: ["about", "info.txt", "about.txt"] },
  { key: "requisitions", file: "requisitions.exe", promo: "shop", aliases: ["shop", "store", "requisitions.exe"] },
  { key: "patreon", file: "patreon.key", promo: "patreon", aliases: ["patreon.key", "clearance"] },
] as const;
const COMMANDS = ["help", "ls", "cd", "open", "cat", "system", "whoami", "date", "echo", "clear", "crt", "phosphor", "sound", "boot"];
const HISTORY_LIMIT = 50;
const OUTPUT_LIMIT = 80;

/** Writes a display mode the same way the SYSTEM menu does, and tells its buttons to catch up. */
function setDisplayMode(attribute: "crt" | "phosphor", storageKey: string, value: string) {
  document.documentElement.dataset[attribute] = value;
  try { localStorage.setItem(storageKey, value); } catch { /* storage may be blocked */ }
  window.dispatchEvent(new CustomEvent("migrainz:display-mode", { detail: { attribute, value } }));
}

/**
 * The homepage terminal (design canvas board 23): a small shell that lists and opens the site's sections. It only
 * navigates to existing routes; nothing it prints comes from outside the page. Up/Down recall commands; Tab completes
 * a partial word and otherwise leaves the field as usual.
 */
export default function HomeTerminal({ projects, clearance }: { projects: TerminalProject[]; clearance: string }) {
  const router = useRouter();
  const { enabled: soundOn, setEnabled: setSound } = useSound();
  const [lines, setLines] = useState<Line[]>([
    { text: "MIGRAINZ PUBLIC TERMINAL v0.3", kind: "ok", id: 0 },
    { text: "Type help for commands, or ls to list files.", kind: "dim", id: 1 },
  ]);
  // Every printed line gets a stable id (its React key), so trimming old lines never rewrites the ones still shown and
  // screen readers in the log region hear only new lines.
  const nextId = useRef(2);
  const [value, setValue] = useState("");
  const [cwd, setCwd] = useState("~");
  const history = useRef<string[]>([]);
  const cursor = useRef(0);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [lines]);
  // Escape during the switch cancels the move: say so and stay home.
  useEffect(() => {
    const cancelled = () => { setCwd("~"); setLines(current => [...current, { text: "^C cancelled; still at ~", kind: "dim" as const, id: nextId.current++ }].slice(-OUTPUT_LIMIT)); };
    window.addEventListener("migrainz:open-route-cancelled", cancelled);
    return () => window.removeEventListener("migrainz:open-route-cancelled", cancelled);
  }, []);

  const print = (next: Line[], reset = false) => {
    const numbered = next.map(line => ({ ...line, id: nextId.current++ }));
    setLines(current => (reset ? numbered : [...current, ...numbered]).slice(-OUTPUT_LIMIT));
  };
  const find = (name: string) => {
    const wanted = name.toLowerCase().replace(/^\/+|\/+$/g, "");
    if (/^\d{1,2}$/.test(wanted)) return SECTIONS[Number(wanted) - 1];
    return SECTIONS.find(section => section.key === wanted || section.file.replace(/\/$/, "") === wanted || (section.aliases as readonly string[]).includes(wanted));
  };
  const go = (section: (typeof SECTIONS)[number], out: Line[]) => {
    if ("promo" in section) {
      out.push({ text: `> running ${section.file} ...`, kind: "ok" });
      document.querySelector<HTMLButtonElement>(`#${section.promo} .nav-trigger`)?.click();
      return;
    }
    out.push({ text: `> cd /${section.key} ............ OK`, kind: "ok" });
    setCwd(`~/${section.key}`);
    openRoute(href => router.push(href), section.href);
  };

  const run = (raw: string) => {
    const line = raw.trim();
    const prompt = `public@migrainz:${cwd}$`;
    if (!line) { print([{ text: prompt, kind: "in" }]); return; }
    history.current = [...history.current, line].slice(-HISTORY_LIMIT);
    cursor.current = history.current.length;
    const [first, ...rest] = line.split(/\s+/);
    const command = first.toLowerCase();
    const argument = rest.join(" ");
    const out: Line[] = [{ text: `${prompt} ${line}`, kind: "in" }];
    if (/^\d{1,2}$/.test(command)) {
      const section = find(command);
      if (section) go(section, out); else out.push({ text: `no file numbered ${command}. Try ls.`, kind: "err" });
    } else if (command === "help") {
      out.push(
        { text: "ls                 list files (ls projects lists projects)", kind: "out" },
        { text: "cd <name|1-7>      open a section; cd .. goes home", kind: "out" },
        { text: "open <project>     open a project, e.g. open " + (projects[0]?.slug ?? "blushland"), kind: "out" },
        { text: "cat info.txt       about the studio", kind: "out" },
        { text: "system             open the SYSTEM monitor", kind: "out" },
        { text: "whoami · date · echo <text> · clear", kind: "out" },
        { text: "crt on|reduced|off · phosphor green|amber · sound on|off · boot", kind: "out" },
        { text: "Up/Down recall commands; Tab completes a name.", kind: "dim" },
      );
    } else if (command === "ls" || command === "dir") {
      if (/^projects?(\.db)?\/?$/i.test(argument) || (!argument && cwd === "~/projects")) {
        if (!projects.length) out.push({ text: "no public projects mounted", kind: "dim" });
        for (const project of projects) out.push({ text: `${project.code.padEnd(8)}${(project.slug + "/").padEnd(18)}${project.status}`, kind: "out" });
      } else SECTIONS.forEach((section, index) => out.push({ text: `${String(index + 1).padStart(2, "0")}  ${section.file}`, kind: "out" }));
    } else if (command === "cd") {
      if (!argument || ["..", "~", "/"].includes(argument)) {
        out.push({ text: "> cd ~", kind: "ok" });
        setCwd("~");
        router.push("/");
      } else {
        const section = find(argument);
        if (section) go(section, out); else out.push({ text: `cd: ${argument}: no such directory. Try ls.`, kind: "err" });
      }
    } else if (command === "open" && argument.toLowerCase() !== "system") {
      const wanted = argument.toLowerCase();
      const project = projects.find(item => item.slug === wanted || item.code.toLowerCase() === wanted || item.title.toLowerCase() === wanted);
      if (project) {
        out.push({ text: `> opening /projects/${project.slug} ............ OK`, kind: "ok" });
        openRoute(href => router.push(href), `/projects/${project.slug}`);
      } else {
        const section = find(wanted);
        if (section) go(section, out); else out.push({ text: `open: ${argument || "?"}: not found. Try ls projects.`, kind: "err" });
      }
    } else if (command === "cat") {
      if (/^(info|about)(\.txt)?$|^readme$/i.test(argument)) {
        out.push({ text: "STUDIO MIGRAINZ", kind: "ok" }, { text: "Artwork, comics, objects and works in progress.", kind: "out" }, { text: "Full file: cd info", kind: "dim" });
      } else out.push({ text: `cat: ${argument || "?"}: not a text file`, kind: "err" });
    } else if (command === "system" || (command === "open" && argument.toLowerCase() === "system")) {
      const launcher = document.querySelector<HTMLButtonElement>('button[aria-controls="pixel-monitor"]');
      if (launcher) { out.push({ text: "> starting SYSTEM monitor ...", kind: "ok" }); launcher.click(); }
      else out.push({ text: "system: monitor not available on this page", kind: "err" });
    } else if (command === "whoami") {
      out.push({ text: `visitor · clearance ${clearance} · node 01`, kind: "out" });
    } else if (command === "date") {
      out.push({ text: new Date().toString(), kind: "out" });
    } else if (command === "echo") {
      out.push({ text: argument, kind: "out" });
    } else if (command === "clear" || command === "cls") {
      print([], true);
      return;
    } else if (command === "crt") {
      const mode = argument.toLowerCase();
      if (["on", "reduced", "off"].includes(mode)) { setDisplayMode("crt", "crt-effects", mode); out.push({ text: `crt.drv ......... ${mode}`, kind: "ok" }); }
      else out.push({ text: "usage: crt on|reduced|off", kind: "err" });
    } else if (command === "phosphor") {
      const mode = argument.toLowerCase();
      if (["green", "amber"].includes(mode)) { setDisplayMode("phosphor", "crt-phosphor", mode); out.push({ text: `phosphor ........ ${mode}`, kind: "ok" }); }
      else out.push({ text: "usage: phosphor green|amber", kind: "err" });
    } else if (command === "sound" || command === "snd") {
      const mode = argument.toLowerCase();
      if (mode === "on" || mode === "off") { setSound(mode === "on"); out.push({ text: `snd.drv ......... ${mode}`, kind: "ok" }); }
      else out.push({ text: `usage: sound on|off (now ${soundOn ? "on" : "off"})`, kind: "err" });
    } else if (command === "boot" || command === "reboot") {
      out.push({ text: "rebooting ...", kind: "dim" });
      try {
        sessionStorage.removeItem("migrainz-boot-seen");
        for (const key of Object.keys(sessionStorage)) if (key.startsWith("migrainz-announcement:")) sessionStorage.removeItem(key);
      } catch { /* optional storage */ }
      window.setTimeout(() => window.location.reload(), 300);
    } else if (command === "sudo") {
      out.push({ text: `nice try. clearance ${clearance}.`, kind: "err" });
    } else {
      out.push({ text: `${command}: command not found. Type help.`, kind: "err" });
    }
    print(out);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const command = value;
      setValue("");
      run(command);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (cursor.current > 0) { cursor.current -= 1; setValue(history.current[cursor.current]); }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (cursor.current < history.current.length - 1) { cursor.current += 1; setValue(history.current[cursor.current]); }
      else { cursor.current = history.current.length; setValue(""); }
    } else if (event.key === "Tab" && !event.shiftKey && value.trim() && !/\s$/.test(value)) {
      const parts = value.split(/\s+/);
      const last = parts[parts.length - 1].toLowerCase();
      const pool = parts.length === 1 ? COMMANDS : [...SECTIONS.map(section => section.key), ...projects.map(project => project.slug), "info.txt"];
      const match = pool.find(name => name.startsWith(last) && name !== last);
      if (match) {
        event.preventDefault();
        parts[parts.length - 1] = match;
        setValue(parts.join(" ") + (parts.length === 1 ? " " : ""));
      }
    } else if (event.key === "Escape" && value) {
      event.preventDefault();
      setValue("");
    }
  };

  return (
    <section className="pnl home-terminal-panel" aria-labelledby="home-terminal">
      <div className="pnl-h"><h2 className="pnl-title" id="home-terminal"><b>TERMINAL</b><i aria-hidden="true"> .SH</i></h2><span className="pnl-end" aria-hidden="true">TYPE help</span></div>
      <div className="home-term-log" ref={log} role="log" aria-live="polite" tabIndex={0} aria-label="Terminal output">
        {lines.map(line => <p key={line.id} data-kind={line.kind}>{line.text}</p>)}
      </div>
      <div className="home-term-input">
        <label htmlFor="home-terminal-input" className="visually-hidden">Terminal command</label>
        <span aria-hidden="true">public@migrainz:{cwd}$</span>
        <input id="home-terminal-input" value={value} onChange={event => setValue(event.target.value)} onKeyDown={onKeyDown}
          placeholder="help" autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go" />
      </div>
    </section>
  );
}
