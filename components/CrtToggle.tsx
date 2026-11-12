"use client";

import { useEffect, useLayoutEffect, useState } from "react";

type ModeToggleProps<Mode extends string> = {
  /** The <html data-*> attribute that holds the mode (set before first paint by the layout script). */
  attribute: "crt" | "phosphor" | "view" | "motion";
  storageKey: string;
  modes: readonly Mode[];
  label: string;
  description: string;
  className: string;
  /**
   * Two-mode settings (VIEW, MOTION; batch 22): the mode that counts as "on". The button then reports aria-pressed and
   * its visible text is its name (like SND). The first mode is the default, e.g. MOTION's "auto" (follow the OS).
   */
  pressed?: Mode;
};

/** Cycles a display mode stored on <html data-*> and in localStorage. */
function ModeToggle<Mode extends string>({ attribute, storageKey, modes, label, description, className, pressed }: ModeToggleProps<Mode>) {
  const [mode, setMode] = useState<Mode>(modes[0]);
  // Before paint. Also re-applies the saved mode after the dev-only Strict Mode remount resets <html> attributes.
  useLayoutEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(storageKey); } catch { /* storage may be blocked */ }
    const current = (saved ?? document.documentElement.dataset[attribute]) as Mode | undefined;
    if (current && modes.includes(current)) { document.documentElement.dataset[attribute] = current; setMode(current); }
  }, [attribute, storageKey, modes]);
  // The homepage terminal sets modes too (crt, phosphor commands); it announces the change so this button catches up.
  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ attribute: string; value: string }>).detail;
      if (detail?.attribute === attribute && modes.includes(detail.value as Mode)) setMode(detail.value as Mode);
    };
    window.addEventListener("migrainz:display-mode", changed);
    return () => window.removeEventListener("migrainz:display-mode", changed);
  }, [attribute, modes]);
  const next = () => {
    // Step from what the screen shows now (20b: the ghost's amber pitch changes it for a moment without saving).
    const live = document.documentElement.dataset[attribute] as Mode | undefined;
    const value = modes[(modes.indexOf(live && modes.includes(live) ? live : mode) + 1) % modes.length];
    setMode(value);
    document.documentElement.dataset[attribute] = value;
    try { localStorage.setItem(storageKey, value); } catch { /* storage may be blocked */ }
    // Same event as the homepage terminal's commands, so other listeners (and a second toggle) catch up.
    window.dispatchEvent(new CustomEvent("migrainz:display-mode", { detail: { attribute, value } }));
  };
  if (pressed) return (
    <button className={className} type="button" onClick={next} aria-pressed={mode === pressed} title={description}>
      {label}: {mode.toUpperCase()}
    </button>
  );
  return (
    <button className={className} type="button" onClick={next} aria-label={`${description}: ${mode}. Activate to change.`}>
      {label}: {mode.toUpperCase()}
    </button>
  );
}

const crtModes = ["on", "reduced", "off"] as const;
const phosphors = ["green", "amber"] as const;

/** CRT effects strength: on / reduced / off. */
export default function CrtToggle() {
  return <ModeToggle attribute="crt" storageKey="crt-effects" modes={crtModes} label="CRT" description="CRT effects" className="crt-toggle" />;
}

/** Phosphor colour: green (default) / amber. */
export function PhosphorToggle() {
  return <ModeToggle attribute="phosphor" storageKey="crt-phosphor" modes={phosphors} label="PHOSPHOR" description="Phosphor colour" className="phosphor-toggle" />;
}

const views = ["terminal", "plain"] as const;
const motions = ["auto", "reduced"] as const;

/**
 * Reading view (design canvas board 11; batch 22): TERMINAL (default) or PLAIN, a light page for long lore, screen
 * readers, slow phones and printing. Same URL; saved as `migrainz-view`.
 */
export function ViewToggle() {
  // Printing uses the plain view (light page, no CRT layers): switched on for the print only, never saved. The print
  // stylesheet in globals.css carries the same colours if this script cannot run.
  useEffect(() => {
    let restore: string | undefined;
    const before = () => {
      const root = document.documentElement;
      if (root.dataset.view === "plain") return;
      restore = root.dataset.view ?? "terminal";
      root.dataset.view = "plain";
    };
    const after = () => { if (restore !== undefined) { document.documentElement.dataset.view = restore; restore = undefined; } };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => { window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); };
  }, []);
  return <ModeToggle attribute="view" storageKey="migrainz-view" modes={views} label="VIEW" description="Plain reading view: dark text on a light page, no CRT effects or motion" className="view-toggle" pressed="plain" />;
}

/** Motion (board 18; batch 22): AUTO follows the system setting, REDUCED stops it here too. Saved as `migrainz-motion`. */
export function MotionToggle() {
  return <ModeToggle attribute="motion" storageKey="migrainz-motion" modes={motions} label="MOTION" description="Reduce motion on this site (AUTO follows your system setting)" className="motion-toggle" pressed="reduced" />;
}
