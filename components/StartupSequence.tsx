"use client";

import { useEffect, useRef, useState } from "react";

import StartupArt from "@/components/StartupArt";

const messages = [
  "BOOTING PUBLIC NODE... OK",
  "INSTALLING definitely_normal.pkg [##########] 100%",
  "ERROR / UNAUTHORIZED PROCESS DETECTED: helmet_girl.exe",
  "SYSTEM COMPROMISED",
];

export default function StartupSequence() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState(0);
  const [blink, setBlink] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (finished) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let seen = false;
    try {
      seen = sessionStorage.getItem("migrainz-startup") === "seen";
    } catch { /* Storage is optional. */ }
    if (motion.matches || seen) return;

    const windowElement = dialog.current;
    windowElement?.showModal();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (action: () => void, delay: number) => {
      timers.push(setTimeout(action, delay));
    };
    // Defer the session marker so Strict Mode's trial effect can clean up.
    later(() => {
      try { sessionStorage.setItem("migrainz-startup", "seen"); } catch { /* Optional. */ }
    }, 0);
    later(() => setStage(1), 450);
    later(() => setStage(2), 1000);
    later(() => setStage(3), 1500);
    later(() => setStage(4), 1850);
    for (const at of [2250, 2800, 3350]) {
      later(() => setBlink(true), at);
      later(() => setBlink(false), at + 120);
    }
    later(() => setFinished(true), 3900);
    const reduce = () => { if (motion.matches) setFinished(true); };
    motion.addEventListener("change", reduce);
    return () => {
      timers.forEach(clearTimeout);
      motion.removeEventListener("change", reduce);
      windowElement?.close();
    };
  }, [finished]);

  if (finished) return null;
  return (
    <dialog
      ref={dialog}
      className="startup-sequence"
      aria-label="Silly fictional terminal startup. Press Enter or Space to skip."
      onClick={() => setFinished(true)}
      onCancel={() => setFinished(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setFinished(true);
        }
      }}
    >
      <div className="startup-content">
        <p className="eyebrow">MIGRAINZ / EXTREMELY FAKE BOOT SEQUENCE</p>
        <div className="startup-log" aria-hidden="true">
          {messages.slice(0, Math.min(stage + 1, 4)).map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
        {stage === 4 && (
          <div className="startup-takeover">
            <div className="promo-title">
              <span>SYSTEM COMPROMISED</span>
              <span className="window-controls">
                <span aria-hidden="true">_ &#9633;</span>
                <button type="button" aria-label="Close startup joke">&#215;</button>
              </span>
            </div>
            <div className="startup-takeover-body">
              <div className="startup-gear-labels" aria-label="Portrait equipment">
                <span>[ OPS-CORE ]</span>
                <span>[ PVS-31 / STOWED ]</span>
              </div>
              <div className="startup-portrait-stage">
                <StartupArt blink={blink} />
              </div>
              <div className="startup-gear-labels startup-gear-footer">
                <span>[ PELTOR ]</span>
                <span>helmet_girl.exe</span>
              </div>
              <p>YOUR TERMINAL IS MINE. i installed a little hat.</p>
            </div>
          </div>
        )}
        <button type="button" className="terminal-button" autoFocus>
          CLICK / TAP / ENTER / SPACE TO SKIP
        </button>
      </div>
    </dialog>
  );
}
