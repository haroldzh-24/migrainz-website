"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useSound } from "@/components/SoundProvider";
import CrtToggle, { PhosphorToggle } from "@/components/CrtToggle";

/**
 * Header SYSTEM menu: display settings behind a disclosure button. The panel stays mounted while closed (hidden)
 * so the toggles re-apply saved modes on load. Phase 2 adds the navigation to the same header bar.
 */
export default function SystemMenu() {
  const { enabled, setEnabled } = useSound();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = () => Array.from(root.current?.querySelectorAll<HTMLButtonElement>(".system-menu-panel button") ?? []);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && open) {
      // Handled here only: the announcement window also closes on Escape unless the event was already handled.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      button.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!open) { setOpen(true); requestAnimationFrame(() => items()[0]?.focus()); return; }
    const list = items(), index = list.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    list[(index + step + list.length) % list.length]?.focus();
  };

  return (
    <div ref={root} className="system-menu" data-open={open || undefined} onKeyDown={onKeyDown}
      // Close when focus moves to another control. A null target (a click on padding, or Safari, where buttons don't take
      // focus on click) is left to the outside-pointerdown listener, so a click on a toggle is never lost.
      onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button ref={button} className="system-menu-button" type="button" aria-expanded={open} aria-controls={panelId}
        data-sound={open ? "close" : "open"} onClick={() => setOpen((value) => !value)}>
        SYSTEM<span aria-hidden="true"> ▾</span>
      </button>
      <div id={panelId} className="system-menu-panel" hidden={!open}>
        <CrtToggle />
        <button className="sound-toggle" type="button" data-sound-toggle aria-pressed={enabled} onClick={() => setEnabled(!enabled)}>
          SND: {enabled ? "ON" : "OFF"}
        </button>
        <PhosphorToggle />
      </div>
    </div>
  );
}
