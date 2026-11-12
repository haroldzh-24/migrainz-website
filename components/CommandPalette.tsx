"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSound } from "@/components/SoundProvider";
import { openRoute } from "@/lib/graphics-mode";
import { setDisplayMode } from "@/lib/display-mode";
import { OPEN_PALETTE_EVENT, TERMINAL_RUN_EVENT, isMac, setPendingRun } from "@/lib/palette";
import type { SearchEntry } from "@/lib/content/search-entries";

/**
 * The command palette (design canvas board 7; batch 23; Harold, 2026-11-12: "okay on all", which reversed the earlier
 * "no search control yet"). Ctrl+K / Cmd+K anywhere, the header's SEARCH button, SYSTEM ▸ SEARCH and the homepage
 * terminal's `search` open it. One input over grouped results, RECORDS and COMMANDS: ↑↓ move, Enter opens, Escape closes
 * and gives focus back to whatever opened it. Records come from /search-index (public records only), fetched the first
 * time it opens on a page. Opening a record goes through openRoute, so grey-window routes get the full mode switch.
 * No motion of its own (it simply appears), so reduced motion, MOTION: REDUCED and the plain view need nothing extra;
 * the plain view restyles it as a light page (globals.css). The ghost never appears in it.
 */

type Command = { id: string; label: string; hint: string; run: () => void; keep?: boolean };
type Item = { id: string; group: "RECORDS" | "COMMANDS"; label: string; hint: string; record?: SearchEntry; command?: Command };
type IndexState = { status: "idle" | "loading" | "ready" | "error"; records: SearchEntry[] };

const RECORD_LIMIT = 20;
const SECTIONS = [["/projects", "projects"], ["/comics", "comics"], ["/tracker", "tracker"], ["/archive", "archive"], ["/about", "about"], ["/patreon", "patreon"]] as const;

/** Where Ctrl+K is left to the page (plan review, batch 23). */
function shortcutBlocked(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  // The boot checklist and the announcement, the screen's power-on, and the terminal ↔ desktop switch.
  if (document.querySelector(".startup-sequence, main#top.power-on, .mode-switch:not([hidden])")) return true;
  const active = document.activeElement;
  if (!(active instanceof Element)) return false;
  // The Art Viewer and the comic reader keep their keys; so do the homepage terminal and every other text field.
  if (active.closest(".art-viewer-window, .comic-reader-window")) return true;
  return Boolean(active.closest("input, textarea, select, [contenteditable]:not([contenteditable=\"false\"])"));
}


export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { enabled: soundOn, setEnabled: setSound } = useSound();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<IndexState>({ status: "idle", records: [] });
  const [shortcut, setShortcut] = useState("CTRL+K");
  // Board 7's placeholder does not fit a phone's input; there it is shortened (read when the palette opens).
  const [narrow, setNarrow] = useState(false);
  // The display settings as they are when the palette opens, so each command offers the other setting.
  const [modes, setModes] = useState({ crt: "on", view: "terminal", motion: "auto", phosphor: "green" });
  const opener = useRef<Element | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const loading = useRef(false);
  const ids = useId();
  const listId = `${ids}-list`;
  const optionId = (n: number) => `${ids}-option-${n}`;
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => { if (isMac()) setShortcut("⌘K"); }, []);

  const load = useCallback(() => {
    if (loading.current) return;
    loading.current = true;
    setIndex(current => ({ ...current, status: "loading" }));
    fetch("/search-index", { cache: "no-store", credentials: "same-origin" })
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: { records?: SearchEntry[] }) => setIndex({ status: "ready", records: Array.isArray(data.records) ? data.records : [] }))
      // A failed fetch may be retried on the next open.
      .catch(() => { loading.current = false; setIndex({ status: "error", records: [] }); });
  }, []);

  const show = useCallback((text: string, from: Element | null) => {
    opener.current = from;
    const root = document.documentElement.dataset;
    setModes({ crt: root.crt ?? "on", view: root.view ?? "terminal", motion: root.motion ?? "auto", phosphor: root.phosphor ?? "green" });
    setNarrow(window.matchMedia("(max-width: 640px)").matches);
    setQuery(text);
    setActive(0);
    setOpen(true);
    load();
  }, [load]);

  // Openers: Ctrl+K / Cmd+K (capture, before the page's own key handlers) and the migrainz:open-palette event.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.repeat || event.isComposing) return;
      if (document.querySelector(".command-palette")) return; // open: its own handler closes it
      if (shortcutBlocked(pathRef.current)) return;
      event.preventDefault();
      show("", document.activeElement);
    };
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ query?: string; opener?: Element | null }>).detail;
      if (pathRef.current.startsWith("/admin")) return;
      show(detail?.query ?? "", detail?.opener ?? document.activeElement);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener(OPEN_PALETTE_EVENT, onOpen); };
  }, [show]);

  // Closing gives focus back to the opener; one in a closed menu (SYSTEM ▸ SEARCH) gives it to the menu's button, and
  // one that is gone to the page's main section.
  const close = useCallback((restore = true) => {
    setOpen(false);
    if (!restore) return;
    const from = opener.current as HTMLElement | null;
    opener.current = null;
    requestAnimationFrame(() => {
      let target: HTMLElement | null = from;
      if (target?.closest(".system-menu")) target = target.closest(".system-menu")!.querySelector<HTMLElement>(".system-menu-button");
      if (!target || !target.isConnected || !target.getClientRects().length || target === document.body) target = document.getElementById("top");
      target?.focus({ preventScroll: true });
    });
  }, []);

  const go = useCallback((href: string) => {
    close();
    // After focus is back on the page, so the mode switch starts from where the visitor was.
    requestAnimationFrame(() => requestAnimationFrame(() => openRoute(next => router.push(next), href, "palette")));
  }, [close, router]);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = SECTIONS.map(([href, name]) => ({ id: `cd-${name}`, label: `cd /${name}`, hint: "go to a directory", run: () => go(href) }));
    list.unshift({ id: "open", label: "open <record>", hint: "type a name to find it", keep: true, run: () => { setQuery("open "); setActive(0); input.current?.focus(); } });
    list.push({ id: "cd-home", label: "cd ~", hint: "home terminal", run: () => go("/") });
    const set = (attribute: "crt" | "phosphor" | "view" | "motion", value: string, hint: string) =>
      ({ id: `${attribute}-${value}`, label: `${attribute} ${value}`, hint, run: () => { setDisplayMode(attribute, value); close(); } });
    for (const value of ["on", "reduced", "off"]) if (value !== modes.crt) list.push(set("crt", value, "display settings"));
    list.push(set("view", modes.view === "plain" ? "terminal" : "plain", modes.view === "plain" ? "back to the terminal look" : "light page for reading"));
    list.push(set("motion", modes.motion === "reduced" ? "auto" : "reduced", modes.motion === "reduced" ? "follow the system setting" : "stop the site's motion"));
    list.push(set("phosphor", modes.phosphor === "amber" ? "green" : "amber", "display settings"));
    list.push({ id: "sound", label: `sound ${soundOn ? "off" : "on"}`, hint: "display settings", run: () => { setSound(!soundOn); close(); } });
    list.push({ id: "help", label: "help", hint: "list every command", run: () => {
      if (pathRef.current === "/") { close(false); requestAnimationFrame(() => window.dispatchEvent(new CustomEvent(TERMINAL_RUN_EVENT, { detail: { command: "help" } }))); return; }
      setPendingRun("help");
      go("/");
    } });
    return list;
  }, [modes, soundOn, setSound, close, go]);

  // Case-insensitive substring over label, kind and hint (the hint holds the project code or file name). "open x" and
  // "cd x" search records for x. Records whose name starts with the text come first.
  const items = useMemo<Item[]>(() => {
    const text = query.trim().toLowerCase();
    const recordText = text.replace(/^(open|cd)\s+/, "");
    const records = index.records
      .map(record => ({ record, haystack: `${record.label} ${record.kind} ${record.hint}`.toLowerCase(), name: record.label.toLowerCase() }))
      .filter(entry => (recordText ? entry.haystack.includes(recordText) : entry.record.kind === "project"))
      .sort((a, b) => Number(b.name.startsWith(recordText)) - Number(a.name.startsWith(recordText)))
      .slice(0, RECORD_LIMIT)
      .map((entry, n): Item => ({ id: `r${n}`, group: "RECORDS", label: entry.record.label, hint: entry.record.hint, record: entry.record }));
    const matched = text
      ? commands.filter(command => `${command.label} ${command.hint}`.toLowerCase().includes(text) || (text === "open" && command.id === "open"))
      : commands.filter(command => ["open", "cd-archive", "view-plain", "view-terminal", "help"].includes(command.id) || command.id.startsWith("crt-off"));
    // "open " followed by text is a record search: no commands under it.
    const shown = /^(open|cd)\s+\S/.test(text) && records.length ? [] : matched;
    return [...records, ...shown.map((command, n): Item => ({ id: `c${n}`, group: "COMMANDS", label: command.label, hint: command.hint, command }))];
  }, [query, index.records, commands]);

  useEffect(() => { setActive(0); }, [query]);
  useLayoutEffect(() => { if (open) input.current?.focus(); }, [open]);
  // The active row stays in view.
  useEffect(() => { if (open) list.current?.querySelector(`#${CSS.escape(optionId(active))}`)?.scrollIntoView({ block: "nearest" }); });
  // A route change closes it (Back, or a record opened from elsewhere).
  useEffect(() => { setOpen(false); }, [pathname]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    if (item.record) go(item.record.href);
    else item.command?.run();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    const count = items.length;
    if (event.key === "Escape" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (count) setActive(current => (current + (event.key === "ArrowDown" ? 1 : -1) + count) % count);
    } else if (event.key === "Home" && count && event.ctrlKey) { event.preventDefault(); setActive(0); }
    else if (event.key === "End" && count && event.ctrlKey) { event.preventDefault(); setActive(count - 1); }
    else if (event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat) choose(items[active]);
    } else if (event.key === "Tab") {
      // Focus stays in the dialog: its only control is the input (results are options of the listbox).
      event.preventDefault();
      input.current?.focus();
    }
  };

  // Escape reaches the page's own window-level handlers (Art Viewer, promo windows) only after this one, so it is
  // handled in the capture phase too while the palette is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  // 23b: while the palette is open the page behind it is inert (no Tab, click or screen-reader stop there). Every
  // sibling of the palette and of each of its ancestors up to <body> gets `inert`; only the ones this effect set are
  // cleared again on close, so a wrapper the boot made inert stays as it was.
  useLayoutEffect(() => {
    if (!open) return;
    const own = root.current;
    if (!own) return;
    const changed: Element[] = [];
    for (let node: Element | null = own; node && node !== document.body && node.parentElement; node = node.parentElement) {
      for (const sibling of Array.from(node.parentElement.children)) {
        if (sibling === node || sibling.hasAttribute("inert") || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(sibling.tagName)) continue;
        sibling.setAttribute("inert", "");
        changed.push(sibling);
      }
    }
    return () => { for (const element of changed) element.removeAttribute("inert"); };
  }, [open]);

  if (!open) return null;
  const records = items.filter(item => item.group === "RECORDS");
  const commandItems = items.filter(item => item.group === "COMMANDS");
  const recordsNote = index.status === "loading" || index.status === "idle" ? "LOADING RECORDS ..." : index.status === "error" ? "RECORDS UNAVAILABLE. Commands still work." : null;
  const position = (item: Item) => items.indexOf(item);
  const row = (item: Item) => {
    const n = position(item);
    return (
      <div key={item.id} id={optionId(n)} role="option" aria-selected={n === active} className="command-palette-option"
        data-kind={item.record?.kind ?? "command"} onMouseMove={() => { if (n !== active) setActive(n); }}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}>
        <span className="command-palette-label">{item.label}</span>
        <span className="command-palette-hint">{item.hint}</span>
      </div>
    );
  };
  const empty = !items.length && !recordsNote;

  return (
    <div ref={root} className="command-palette" onKeyDown={onKeyDown}>
      <div className="command-palette-backdrop" aria-hidden="true" onClick={() => close()} />
      <div className="command-palette-dialog" role="dialog" aria-modal="true" aria-label="Command palette">
        <label className="command-palette-field">
          <span className="visually-hidden">Search records or type a command</span>
          <input ref={input} className="command-palette-input" type="text" value={query} onChange={event => setQuery(event.target.value)}
            role="combobox" aria-expanded={items.length > 0} aria-controls={items.length ? listId : undefined} aria-autocomplete="list"
            aria-activedescendant={items.length ? optionId(active) : undefined}
            placeholder={narrow ? "> search or type a command (try: help)" : "> search records or type a command (try: blush, open, help)"} autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go" />
        </label>
        <div ref={list} className="command-palette-results">
          {recordsNote && !records.length && <><p className="command-palette-group">RECORDS</p><p className="command-palette-note">{recordsNote}</p></>}
          {items.length > 0 && <div id={listId} role="listbox" aria-label="Results">
            {records.length > 0 && <div role="group" aria-labelledby={`${ids}-records`}>
              <p className="command-palette-group" id={`${ids}-records`} role="presentation">RECORDS</p>
              {records.map(row)}
            </div>}
            {commandItems.length > 0 && <div role="group" aria-labelledby={`${ids}-commands`}>
              <p className="command-palette-group" id={`${ids}-commands`} role="presentation">COMMANDS</p>
              {commandItems.map(row)}
            </div>}
          </div>}
          {empty && <p className="command-palette-empty">NO MATCHING RECORDS. Type <b>help</b> for commands.</p>}
        </div>
        <p className="visually-hidden" role="status">{empty ? "No matching records" : `${items.length} results`}</p>
        <p className="command-palette-keys" aria-hidden="true"><span>↑↓ MOVE</span><span>ENTER OPEN</span><span>ESC CLOSE</span><span>{shortcut} ANYWHERE</span></p>
      </div>
    </div>
  );
}
