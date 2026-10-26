"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SystemMenu from "@/components/SystemMenu";

export default function TerminalHeader() {
  const [clock, setClock] = useState("--:--:--");
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
      {/* Phase 2 puts the menu-bar navigation here. */}
      <div className="topbar-nav" />
      <div className="topbar-meta">
        <span>NODE 01</span>
        <span id="clock">{clock}</span>
        <span className="online">
          <i aria-hidden="true" />
          ONLINE
        </span>
        <SystemMenu />
      </div>
    </header>
  );
}
