"use client";
import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { announcement } from "@/data/announcement";
import { useSound } from "@/components/SoundProvider";
import type { BootLine } from "@/lib/content/boot";

const storageKey = `migrainz-announcement:${announcement.id}`;
// Set once the checklist has run (or been skipped): a reload before dismissing the ad goes straight to the ad.
const bootSeenKey = "migrainz-boot-seen";
const LINE_MS = 250, FIRST_LINE_MS = 300, HOLD_MS = 500, REDUCED_HOLD_MS = 1200;
// Keys that never skip the checklist (S toggles sound instead).
const passiveKeys = new Set(["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock", "s", "S"]);

export default function StartupSequence({ lines: dataLines, children }: { lines: BootLine[]; children: ReactNode }) {
  const [state, setState] = useState<"boot" | "announcement" | "closed">("boot");
  const [stage, setStage] = useState(0);
  const [phosphor, setPhosphor] = useState("green");
  const { enabled: soundOn, setEnabled: setSound } = useSound();
  // Fixed driver lines first, then the real data lines and clearance from the server.
  const lines: BootLine[] = [
    { status: "ok", label: "crt.drv", value: phosphor },
    { status: "ok", label: "watcher.sys", value: "awake" },
    { status: "ok", label: "snd.drv", value: soundOn ? "on" : "off" },
    ...dataLines,
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
  const finishBoot = () => {
    try { sessionStorage.setItem(bootSeenKey, "1"); } catch { /* Optional storage. */ }
    setState(current => current === "boot" ? "announcement" : current);
  };
  useEffect(() => {
    let dismissed = false, seen = false;
    try {
      dismissed = sessionStorage.getItem(storageKey) === announcement.id;
      seen = sessionStorage.getItem(bootSeenKey) === "1";
    } catch { /* Optional storage. */ }
    if (!announcement.enabled || dismissed) { setState("closed"); return; }
    if (seen) { setState("announcement"); return; }
    setPhosphor(document.documentElement.dataset.phosphor === "amber" ? "amber" : "green");
    windowRef.current?.focus();
    const count = lines.length;
    // Reduced motion: every line at once, then the ad.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage(count);
      const timer = setTimeout(finishBoot, REDUCED_HOLD_MS);
      return () => clearTimeout(timer);
    }
    const timers = Array.from({ length: count }, (_, index) => setTimeout(() => setStage(index + 1), FIRST_LINE_MS + index * LINE_MS));
    timers.push(setTimeout(finishBoot, FIRST_LINE_MS + (count - 1) * LINE_MS + HOLD_MS));
    return () => timers.forEach(clearTimeout);
    // The line count is fixed for this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    {state !== "closed" && <div className="startup-sequence" data-phase={state} onClick={state === "boot" ? finishBoot : undefined} style={{ position: "fixed", inset: 0, background: state === "boot" ? "var(--crt-deep-lo)" : "transparent", zIndex: state === "boot" ? 10000 : foreground ? 42 : 40, pointerEvents: state === "boot" ? "auto" : "none" }}>
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
            <ol className="boot-checklist" aria-live="polite">
              {lines.slice(0, stage).map(line => <li key={line.label} className="boot-line" data-status={line.status}>
                <span className="boot-status">{line.status === "ok" ? "[ OK ]" : "[ !! ]"}</span>
                <span className="boot-label">{line.label}</span>
                <span className="boot-leader" aria-hidden="true" />
                <span className="boot-value">{line.value}</span>
              </li>)}
            </ol>
            <p className="boot-hint">ANY KEY / CLICK TO SKIP &middot; S = SOUND</p>
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
