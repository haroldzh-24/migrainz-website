"use client";

import { useEffect, useRef } from "react";
import { useWindowManager, WindowTaskbar } from "@/components/WindowManager";

/** Presentation only: windows and dock share the public WindowManager. */
export default function PixelMonitorDesktop() {
  const { desktopVisible, showDesktop, hideDesktop, setWorkspace } = useWindowManager();
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
    <div className="shell monitor-launcher">
      <button type="button" className="terminal-button" aria-controls="pixel-monitor" aria-expanded={desktopVisible} onClick={showDesktop}>[ OPEN DESKTOP ]</button>
    </div>
    <section ref={monitor} id="pixel-monitor" className="pixel-monitor" hidden={!desktopVisible} aria-label="Studio Migrainz computer desktop">
      <div className="pixel-monitor-header">
        <span>MGZ / STUDIO COMPUTER</span>
        <button ref={hideButton} type="button" onClick={hideDesktop} aria-label="Hide desktop and return to terminal">RETURN TO TERMINAL [×]</button>
      </div>
      <div className="pixel-monitor-screen">
        <div ref={setWorkspace} className="desktop-windows" aria-label="Desktop window workspace" />
        <div className="pixel-monitor-dock"><WindowTaskbar /></div>
      </div>
      <div className="pixel-monitor-hardware" aria-hidden="true">
        <span className="pixel-monitor-vents" />
        <span>STUDIO MIGRAINZ <b>•</b> POWER</span>
        <span className="pixel-monitor-switch" />
      </div>
    </section>
  </>;
}
