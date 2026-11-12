"use client";

import { useEffect, useState } from "react";
import { isMac } from "@/lib/palette";

/** The palette's key as this system writes it: ⌘K on a Mac, CTRL+K elsewhere (23b; same rule as the palette's key line).
 * The server renders CTRL+K; a Mac switches after hydration. Decorative (aria-hidden): the button carries aria-keyshortcuts. */
export default function ShortcutKey({ className, prefix = "" }: { className: string; prefix?: string }) {
  const [label, setLabel] = useState("CTRL+K");
  useEffect(() => { if (isMac()) setLabel("⌘K"); }, []);
  return <span className={className} aria-hidden="true">{prefix}{label}</span>;
}
