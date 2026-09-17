"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import StartupArt from "@/components/StartupArt";
import { announcement } from "@/data/announcement";

const storageKey = `migrainz-announcement:${announcement.id}`;
const messages = [
  "MIGRAINZ SYSTEM BIOS v0.2", "MEMORY CHECK ... OK", "ARCHIVE NODE ... ONLINE",
  "PROJECT DATABASE ... MOUNTED", "COMIC READER ... READY", "CHECKING REMOTE PACKAGE...",
  "FOUND: MIGRAINZ_WORM.EXE", "INSTALLING ... 12%", "INSTALLING ... 47%",
  "INSTALLING ... 93%", "INSTALLING ... 100%", "INSTALLATION COMPLETE.",
  "VERIFYING PACKAGE.... ERROR", "UNAUTHORIZED PROCESS DETECTED", "SYSTEM COMPROMISED",
];

export default function StartupSequence({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"boot" | "announcement" | "closed">("boot");
  const [blink, setBlink] = useState(false);
  const [stage, setStage] = useState(0);
  const windowRef = useRef<HTMLDivElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(storageKey) === announcement.id; } catch { /* Optional storage. */ }
    if (!announcement.enabled || dismissed) { setState("closed"); return; }
    windowRef.current?.focus();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = messages.slice(1).map((_, index) =>
      setTimeout(() => setStage(index + 1), (index + 1) * 180));
    // Reuse the original three 120ms eye-frame swaps, spaced to avoid rapid flashing.
    for (const at of [2950, 3750, 4550]) {
      timers.push(setTimeout(() => { if (!motion.matches) setBlink(true); }, at));
      timers.push(setTimeout(() => setBlink(false), at + 120));
    }
    timers.push(setTimeout(() => setState("announcement"), 5200));
    const reduce = () => { if (motion.matches) setBlink(false); };
    motion.addEventListener("change", reduce);
    return () => {
      timers.forEach(clearTimeout);
      motion.removeEventListener("change", reduce);
    };
  }, []);
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
    {state !== "closed" && <div className="startup-sequence" data-phase={state} style={{ position: "fixed", inset: 0, background: state === "boot" ? "#010301" : "transparent", zIndex: 10000, pointerEvents: state === "boot" ? "auto" : "none" }}>
      <div ref={windowRef} className="startup-takeover startup-window" role="dialog" aria-modal={state === "boot" ? true : undefined} aria-labelledby="startup-title" tabIndex={-1}
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
        <div className="promo-title">
          <span id="startup-title">MIGRAINZ / PUBLIC TRANSMISSION</span>
          <span className="window-controls"><span aria-hidden="true">_ &#9633;</span><button type="button" aria-label="Close announcement" disabled={state === "boot"} onClick={close}>&#215;</button></span>
        </div>
        <div className="startup-takeover-body startup-window-body">
          {state === "boot" ? <div className="startup-log">
            <p className="eyebrow">SYSTEM STARTUP / PLEASE WAIT</p>
            {messages.slice(Math.max(0, stage - 7), stage + 1).map(message => <p key={message}>{message}</p>)}
            {stage === messages.length - 1 && <div className="startup-compromised">
              <StartupArt blink={blink} />
              <p>YOUR TERMINAL IS MINE. enjoy the ad.</p>
            </div>}
            <span className="startup-blink" aria-hidden="true">_</span>
          </div> : <div className="startup-announcement">
            <p className="eyebrow"><span className="startup-blink">[ NEW ]</span> / INCOMING STUDIO AD</p>
            {announcement.image ? <img className="startup-announcement-image" src={announcement.image} alt="" /> : <div className="startup-ad-placeholder" aria-hidden="true">MIGRAINZ<br />PUBLIC ACCESS<br />[ TRANSMISSION 001 ]</div>}
            <h2>{announcement.title}</h2>
            <p>{announcement.copy}</p>
            <button ref={enterRef} type="button" className="terminal-button" onClick={close}>{announcement.buttonLabel}</button>
            <p className="startup-status">AWAITING INPUT <span className="startup-blink" aria-hidden="true">_</span></p>
          </div>}
        </div>
      </div>
    </div>}
    <div ref={contentRef} inert={state === "boot"} aria-hidden={state === "boot" ? true : undefined} style={{ visibility: state === "boot" ? "hidden" : "visible" }}>{children}</div>
  </>;
}
