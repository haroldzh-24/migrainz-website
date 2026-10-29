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
      <Link className="brand" href="/#top">
        MIGRAINZ<span className="brand-full"> // PUBLIC ACCESS TERMINAL</span>
      </Link>
      {/* Menu bar (phase 2, design canvas board 23); hidden on phones, where the homepage directory comes first. */}
      <nav className="topbar-nav" aria-label="Sections">
        <Link href="/projects">PROJECTS</Link>
        <Link href="/comics">COMICS</Link>
        <Link href="/archive">ARCHIVE</Link>
        <Link href="/tracker">TRACKER</Link>
      </nav>
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
