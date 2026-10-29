"use client";
import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { announcement } from "@/data/announcement";
import { useSound } from "@/components/SoundProvider";
import type { BootLine } from "@/lib/content/boot";

const storageKey = `migrainz-announcement:${announcement.id}`;
// Set once the checklist has run (or been skipped): a reload before dismissing the ad goes straight to the ad.
const bootSeenKey = "migrainz-boot-seen";
const LINE_MS = 250, FIRST_LINE_MS = 300, HOLD_MS = 500, REDUCED_HOLD_MS = 1200;
// End of the boot (design canvas board 17): the checklist collapses to a line, then the page powers on. CSS runs both;
// this is how long the collapse takes before the page is shown. Reduced motion or CRT effects off: a plain cut.
const COLLAPSE_MS = 320;
const POWER_ON_MS = 900;
const COUNTER_CELLS = 20;

/** Tells the page the screen is on: html[data-power="on"] and a migrainz:power-on event (the homepage title listens). */
function powerOn() {
  document.documentElement.dataset.power = "on";
  window.dispatchEvent(new Event("migrainz:power-on"));
}
// The data lines come from /boot-status, fetched only when the checklist shows; the boot never waits longer than this.
const DATA_WAIT_MS = 2000;
// Keys that never skip the checklist (S toggles sound instead).
const passiveKeys = new Set(["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock", "s", "S"]);

export default function StartupSequence({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"boot" | "announcement" | "closed">("boot");
  // The boot screen's collapse is playing; the page powers on (CSS) once it ends.
  const [collapsing, setCollapsing] = useState(false);
  const [count, setCount] = useState(0);
  const [stage, setStage] = useState(0);
  const [phosphor, setPhosphor] = useState("green");
  // True once this page load actually runs the checklist; null data = still waiting for /boot-status.
  const [running, setRunning] = useState(false);
  const [dataLines, setDataLines] = useState<BootLine[] | null>(null);
  const { enabled: soundOn, setEnabled: setSound } = useSound();
  // Fixed driver lines first, then the real data lines and clearance from the server.
  const lines: BootLine[] = [
    { status: "ok", label: "crt.drv", value: phosphor },
    { status: "ok", label: "watcher.sys", value: "awake" },
    { status: "ok", label: "snd.drv", value: soundOn ? "on" : "off" },
    ...(dataLines ?? []),
  ];
  const windowRef = useRef<HTMLDivElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    if (state !== 'announcement') return;
    const lower = () => setForeground(false);
    window.addEventListener('migrainz:window-activated', lower);
    return () => window.removeEventListener('migrainz:window-activated', lower);
  }, [state]);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const clamp = (x: number, y: number) => {
    const bounds = windowRef.current?.getBoundingClientRect();
    return { x: Math.max(8, Math.min(x, document.documentElement.clientWidth - (bounds?.width ?? 0) - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - (bounds?.height ?? 0) - 8)) };
  };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (state !== "announcement" || event.button !== 0 || !event.isPrimary || window.matchMedia("(max-width: 700px)").matches || (event.target as HTMLElement).closest("button, a, .window-controls")) return;
    const bounds = windowRef.current?.getBoundingClientRect();
    if (!bounds) return;
    drag.current = { id: event.pointerId, x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    setPosition(clamp(bounds.left, bounds.top));
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  useEffect(() => {
    if (state !== "announcement") return;
    const resize = () => {
      drag.current = null;
      setPosition(current => window.matchMedia("(max-width: 700px)").matches ? null : current ? clamp(current.x, current.y) : null);
    };
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); drag.current = null; };
  }, [state]);
  // Line and end-of-boot timers; a skip cancels them so nothing fires (or writes storage) after the boot is over.
  const bootTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // The boot finishes once: a second key or click during the collapse, or the boot data arriving then, changes nothing.
  const finishing = useRef(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(showTimer.current), []);
  const finishBoot = () => {
    if (finishing.current) return;
    finishing.current = true;
    bootTimers.current.forEach(clearTimeout);
    bootTimers.current = [];
    try { sessionStorage.setItem(bootSeenKey, "1"); } catch { /* Optional storage. */ }
    const plain = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.crt === "off";
    const show = () => {
      setCollapsing(false);
      setState(current => current === "boot" ? "announcement" : current);
      // Power-on (board 17): only the page's <main> scales up from a line, never the wrapper with the fixed layers
      // (CRT overlay, header, windows); the class goes again once every staggered panel has risen (560ms for <main>, up
      // to 300 + 520ms for the panels). A timer, not animationend: the panels' own animationend events bubble to <main>.
      const main = !plain ? contentRef.current?.querySelector<HTMLElement>("main.shell") : null;
      if (main) {
        main.classList.add("power-on");
        setTimeout(() => main.classList.remove("power-on"), POWER_ON_MS);
      }
      powerOn();
    };
    if (plain) { show(); return; }
    setCount(100);
    setCollapsing(true);
    showTimer.current = setTimeout(show, COLLAPSE_MS);
  };
  useEffect(() => {
    let dismissed = false, seen = false;
    try {
      dismissed = sessionStorage.getItem(storageKey) === announcement.id;
      seen = sessionStorage.getItem(bootSeenKey) === "1";
    } catch { /* Optional storage. */ }
    if (!announcement.enabled || dismissed) { setState("closed"); powerOn(); return; }
    if (seen) { setState("announcement"); powerOn(); return; }
    setPhosphor(document.documentElement.dataset.phosphor === "amber" ? "amber" : "green");
    windowRef.current?.focus();
    setRunning(true);
    // Only now, with the checklist about to show, ask for this visitor's boot data (never cached; once per session).
    let cancelled = false;
    const controller = new AbortController();
    const giveUp = setTimeout(() => controller.abort(), DATA_WAIT_MS);
    fetch("/boot-status", { cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() : { lines: [] })
      .then((data: { lines?: unknown }) => { if (!cancelled) setDataLines(Array.isArray(data.lines) ? data.lines as BootLine[] : []); })
      .catch(() => { if (!cancelled) setDataLines([]); })
      .finally(() => clearTimeout(giveUp));
    return () => { cancelled = true; controller.abort(); clearTimeout(giveUp); bootTimers.current.forEach(clearTimeout); bootTimers.current = []; };
  }, []);
  // Reveal one line at a time; once every line is out and the data has arrived (or the wait ended), hold, then the ad.
  // Reduced motion: every line at once.
  useEffect(() => {
    if (state !== "boot" || !running || finishing.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (reduced && stage !== lines.length) setStage(lines.length);
    else if (!reduced && stage < lines.length) timer = setTimeout(() => setStage(value => value + 1), stage === 0 ? FIRST_LINE_MS : LINE_MS);
    else if (dataLines !== null) timer = setTimeout(finishBoot, reduced ? REDUCED_HOLD_MS : HOLD_MS);
    bootTimers.current = timer ? [timer] : [];
    return () => { if (timer) clearTimeout(timer); };
    // finishBoot only touches refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, running, stage, lines.length, dataLines]);
  // The big counter follows the checklist: it eases toward the share of lines printed so far (all of them at the end).
  useEffect(() => {
    if (state !== "boot" || !running) return;
    // Until /boot-status answers the list can still grow, so the counter holds below 100. When the data lines arrive
    // the list gets longer and the share can fall; the counter then waits for the list to catch up and never goes back.
    const share = lines.length ? Math.min(stage, lines.length) / lines.length : 0;
    const target = Math.round(dataLines === null ? Math.min(90, share * 90) : share * 100);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setCount(value => Math.max(value, target)); return; }
    const timer = setInterval(() => setCount(value => {
      if (target - value < 1) { clearInterval(timer); return Math.max(value, target); }
      return value + (target - value) * 0.25;
    }), 30);
    return () => clearInterval(timer);
  }, [state, running, stage, lines.length, dataLines]);
  // Boot keys: S toggles sound (without skipping); any other key skips on release, so the same press can't also
  // activate ENTER once focus moves to it. Esc, Enter and Space skip too.
  useEffect(() => {
    if (state !== "boot") return;
    const down = (event: KeyboardEvent) => {
      if ((event.key === "s" || event.key === "S") && !event.repeat && !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setSound(!soundOn);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (passiveKeys.has(event.key) || event.isComposing) return;
      finishBoot();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [state, soundOn, setSound]);
  useEffect(() => {
    if (state === "announcement") enterRef.current?.focus();
    if (state === "closed" && restoreFocus.current) contentRef.current?.querySelector<HTMLElement>("#top")?.focus({ preventScroll: true });
  }, [state]);
  const close = () => {
    if (state !== "announcement") return;
    restoreFocus.current = true;
    try { sessionStorage.setItem(storageKey, announcement.id); } catch { /* Dismissal works without storage. */ }
    setState("closed");
  };
  useEffect(() => {
    if (state !== "announcement") return;
    const dismiss = (event: KeyboardEvent) => {
      if (!["Enter", "Escape"].includes(event.key) || event.defaultPrevented || event.isComposing || event.repeat) return;
      event.preventDefault();
      try { sessionStorage.setItem(storageKey, announcement.id); } catch { /* Optional storage. */ }
      // Preserve focus if the visitor has already moved into the page.
      restoreFocus.current = !!windowRef.current?.contains(document.activeElement);
      setState("closed");
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [state]);
  return <>
    {state !== "closed" && <div className="startup-sequence" data-phase={state} data-collapsing={collapsing || undefined} onClick={state === "boot" ? finishBoot : undefined} style={{ position: "fixed", inset: 0, background: state === "boot" ? "var(--crt-deep-lo)" : "transparent", zIndex: state === "boot" ? 10000 : foreground ? 42 : 40, pointerEvents: state === "boot" ? "auto" : "none" }}>
      <div ref={windowRef} className="startup-takeover startup-window" role="dialog" aria-modal={state === "boot" ? true : undefined} aria-labelledby="startup-title" tabIndex={-1}
        style={state === "announcement" && position ? { left: position.x, top: position.y, right: "auto", bottom: "auto", transform: "none" } : undefined}
        onKeyDown={event => {
          if (event.key === "Escape") { event.preventDefault(); close(); }
          if (event.key === "Tab" && state === "boot") {
            const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
            const first = buttons[0], last = buttons[buttons.length - 1];
            if (!first) { event.preventDefault(); return; }
            if (event.shiftKey && (document.activeElement === first || document.activeElement === windowRef.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}>
        <div className="promo-title" onPointerDown={startDrag} onPointerMove={event => {
          if (drag.current?.id === event.pointerId) setPosition(clamp(event.clientX - drag.current.x, event.clientY - drag.current.y));
        }} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}>
          <span id="startup-title">MIGRAINZ / PUBLIC TRANSMISSION</span>
          <span className="window-controls"><span aria-hidden="true">_ &#9633;</span><button type="button" aria-label="Close announcement" data-sound="close" disabled={state === "boot"} onClick={close}>&#215;</button></span>
        </div>
        <div className="startup-takeover-body startup-window-body">
          {state === "boot" ? <div className="startup-log">
            <p className="eyebrow">MIGRAINZ SYSTEM BIOS v0.3 / BOOT CHECK</p>
            {/* Progress (board 17): a counter driven by the checklist, a 20-cell bar and SIGNAL LOCKED at the end. The list
                below is what screen readers follow; this block is hidden from them. */}
            <div className="boot-progress" aria-hidden="true">
              <span className="boot-count">{String(Math.round(count)).padStart(3, "0")}</span>
              <span className="boot-progress-side">
                <span className="boot-progress-label">% LOADED · {Math.min(stage, lines.length)} / {lines.length} CHECKS</span>
                <span className="boot-cells">{Array.from({ length: COUNTER_CELLS }, (_, index) => <i key={index} data-on={index < Math.round(count / (100 / COUNTER_CELLS)) || undefined} />)}</span>
                <span className="boot-locked">{Math.round(count) >= 100 ? "SIGNAL LOCKED" : "\u00a0"}</span>
              </span>
            </div>
            <ol className="boot-checklist" aria-live="polite">
              {/* Append-only list; labels can repeat (e.g. two classified rows), so the position is the key. */}
              {lines.slice(0, stage).map((line, index) => <li key={index} className="boot-line" data-status={line.status}>
                <span className="boot-status">{line.status === "ok" ? "[ OK ]" : "[ !! ]"}</span>
                <span className="boot-label">{line.label}</span>
                <span className="boot-leader" aria-hidden="true" />
                <span className="boot-value">{line.value}</span>
              </li>)}
            </ol>
            <p className="boot-hint">ANY KEY / CLICK OR TAP TO SKIP &middot; S = SOUND</p>
          </div> : <div className="startup-announcement">
            <p className="eyebrow"><span className="startup-blink">[ NEW ]</span> / INCOMING STUDIO AD</p>
            {announcement.image ? <img className="startup-announcement-image" src={announcement.image} alt="" /> : <div className="startup-ad-placeholder" aria-hidden="true">MIGRAINZ<br />PUBLIC ACCESS<br />[ TRANSMISSION 001 ]</div>}
            <h2>{announcement.title}</h2>
            <p>{announcement.copy}</p>
            <button ref={enterRef} type="button" className="terminal-button" data-sound="close" onClick={close}>{announcement.buttonLabel}</button>
            <p className="startup-status">AWAITING INPUT <span className="startup-blink" aria-hidden="true">_</span></p>
          </div>}
        </div>
      </div>
    </div>}
    <div ref={contentRef} inert={state === "boot"} aria-hidden={state === "boot" ? true : undefined} style={{ visibility: state === "boot" ? "hidden" : "visible" }}>{children}</div>
  </>;
}
