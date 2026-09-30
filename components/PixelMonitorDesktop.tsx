"use client";

import Link from "next/link";
import { PatronLocked } from "./PatreonAccess";
import { useEffect, useRef } from "react";
import { RetroWindow, useWindowManager, WindowTaskbar } from "@/components/WindowManager";

/** Presentation only: windows and dock share the public WindowManager. */
export default function PixelMonitorDesktop() {
  const { desktopVisible, hideDesktop, setSystemWorkspace, windows, focusWindow } = useWindowManager();
  const systemFocused = windows.some(window => window.id === "system" && window.focused);
  const hideButton = useRef<HTMLButtonElement>(null);
  const monitor = useRef<HTMLElement>(null);

  useEffect(() => {
    if (desktopVisible) hideButton.current?.focus({ preventScroll: true });
  }, [desktopVisible]);

  useEffect(() => {
    if (!desktopVisible) return;
    // Native bubbling includes windows portaled from other React ancestors.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && event.target instanceof Node && monitor.current?.contains(event.target)) {
        event.preventDefault();
        hideDesktop();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [desktopVisible, hideDesktop]);

  return <>
    <RetroWindow id="system" title="SYSTEM" defaultOpen={false} defaultPosition={{ x: 24, y: 24 }} defaultSize={{ width: 430, height: 360 }}>
      <div className="terminal-panel-head"><h2>SYSTEM</h2><span>NODE STATUS</span></div>
      <p><b>VERSION</b> 0.2.0 / <b>STATUS</b> ONLINE</p>
      <p><b>ACCESS</b> PUBLIC / UNAUTHENTICATED</p>
      <div className="system-apps">
        {[['PROJECT DATABASE', '/projects'], ['PERSONNEL', '/projects?directory=characters'], ['FACTION INTEL', '/projects?directory=factions'], ['ARMORY', '/projects?directory=equipment'], ['COMIC ARCHIVE', '/comics'], ['ARCHIVE', '/archive']].map(([label, href]) => <Link key={href} href={href} onClick={() => { hideDesktop(); window.dispatchEvent(new Event("migrainz:restore-route")); }} aria-label={`Launch ${label}`}><span aria-hidden="true">&#9635;</span>{label}</Link>)}
        <PatronLocked className="system-classified">CLASSIFIED</PatronLocked>
      </div>
      <Link className="system-link" href="/about">READ SYSTEM INFORMATION →</Link>
    </RetroWindow>
    <section ref={monitor} id="pixel-monitor" className="pixel-monitor" hidden={!desktopVisible} aria-label="SYSTEM diagnostic environment" onPointerDown={() => { if (!systemFocused) focusWindow("system", "click"); }} onFocusCapture={() => { if (!systemFocused) focusWindow("system", "click"); }}>
      <div className="pixel-monitor-header">
        <span>MGZ / STUDIO COMPUTER</span>
        <button ref={hideButton} type="button" onClick={hideDesktop} aria-label="Hide desktop and return to terminal">RETURN TO TERMINAL [×]</button>
      </div>
      <div className="pixel-monitor-screen">
        <div ref={setSystemWorkspace} className="desktop-windows" aria-label="SYSTEM monitor workspace" />
        <div className="pixel-monitor-dock"><WindowTaskbar system /></div>
      </div>
      <div className="pixel-monitor-hardware" aria-hidden="true">
        <span className="pixel-monitor-vents" />
        <span>STUDIO MIGRAINZ <b>•</b> POWER</span>
        <span className="pixel-monitor-switch" />
      </div>
    </section>
  </>;
}
