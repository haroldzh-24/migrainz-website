"use client";

import { useEffect, useLayoutEffect, useState } from "react";

type ModeToggleProps<Mode extends string> = {
  /** The <html data-*> attribute that holds the mode (set before first paint by the layout script). */
  attribute: "crt" | "phosphor";
  storageKey: string;
  modes: readonly Mode[];
  label: string;
  description: string;
  className: string;
};

/** Cycles a display mode stored on <html data-*> and in localStorage. */
function ModeToggle<Mode extends string>({ attribute, storageKey, modes, label, description, className }: ModeToggleProps<Mode>) {
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
    const value = modes[(modes.indexOf(mode) + 1) % modes.length];
    setMode(value);
    document.documentElement.dataset[attribute] = value;
    try { localStorage.setItem(storageKey, value); } catch { /* storage may be blocked */ }
  };
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
