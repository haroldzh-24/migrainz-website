"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSound } from "@/components/SoundProvider";
import CrtToggle from "@/components/CrtToggle";

export default function TerminalHeader() {
  const [clock, setClock] = useState("--:--:--");
  const { enabled, setEnabled } = useSound();
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
        MIGRAINZ<span className="brand-full"> // PUBLIC ACCESS TERMINAL</span>
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
          onClick={() => setEnabled(!enabled)}
        >
          SND: {enabled ? "ON" : "OFF"}
        </button>
        <CrtToggle />
      </div>
    </header>
  );
}
