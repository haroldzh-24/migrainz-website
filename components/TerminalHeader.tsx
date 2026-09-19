"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSound } from "@/components/SoundProvider";

export default function TerminalHeader() {
  const [clock, setClock] = useState("--:--:--");
  const { enabled, setEnabled, playSound } = useSound();
  useEffect(() => {
    const update = () =>
      setClock(new Date().toLocaleTimeString([], { hour12: false }));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <header className="topbar shell">
      <Link className="brand" href="/#top" aria-label="Home">
        MIGRAINZ // PUBLIC ACCESS TERMINAL
      </Link>
      <div className="topbar-meta">
        <span>NODE 01</span>
        <span id="clock">{clock}</span>
        <span className="online">
          <i aria-hidden="true" />
          ONLINE
        </span>
        <button
          className="sound-toggle"
          type="button"
          data-sound-toggle
          aria-pressed={enabled}
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            if (next) playSound("toggle");
          }}
        >
          SND: {enabled ? "ON" : "OFF"}
        </button>
      </div>
    </header>
  );
}
