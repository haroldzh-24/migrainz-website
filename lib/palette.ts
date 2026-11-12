// The command palette (design canvas board 7; batch 23): how other parts of the site open it or hand it work.
// - `migrainz:open-palette` { query?, opener? } opens it (the SYSTEM menu's SEARCH, the header button, the homepage
//   terminal's `search`); focus goes back to `opener` (or the element that had focus) when it closes.
// - `migrainz:terminal-run` { command } asks the homepage terminal to run a command (the palette's `help`).
// - PENDING_KEY: the same request across a navigation home (sessionStorage, one shot, only "help" is honoured, and only
//   within PENDING_MS of being stored, so a trip home that never finished cannot fire it on a later visit home; 23b).
export const OPEN_PALETTE_EVENT = "migrainz:open-palette";
export const TERMINAL_RUN_EVENT = "migrainz:terminal-run";
export const PENDING_KEY = "migrainz-terminal-run";

export function openPalette(query = "", opener?: Element | null) {
  window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT, { detail: { query, opener: opener ?? document.activeElement } }));
}

export const PENDING_MS = 10_000;

/** Store a one-shot command for the homepage terminal across a navigation home (23b: with a timestamp). */
export function setPendingRun(command: string) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ command, at: Date.now() })); } catch { /* optional storage */ }
}

/** Take (and clear) the stored command: only a fresh one (at most PENDING_MS old) counts. */
export function takePendingRun(now = Date.now()): string | null {
  let raw: string | null = null;
  try { raw = sessionStorage.getItem(PENDING_KEY); sessionStorage.removeItem(PENDING_KEY); } catch { return null; }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { command?: unknown; at?: unknown };
    if (typeof value.command !== "string" || typeof value.at !== "number") return null;
    return now - value.at >= 0 && now - value.at <= PENDING_MS ? value.command : null;
  } catch { return null; }
}

/** Macs show ⌘K for the palette, every other system CTRL+K (shared by the palette, the header and SYSTEM; 23b). */
export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
