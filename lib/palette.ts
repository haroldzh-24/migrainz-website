// The command palette (design canvas board 7; batch 23): how other parts of the site open it or hand it work.
// - `migrainz:open-palette` { query?, opener? } opens it (the SYSTEM menu's SEARCH, the header button, the homepage
//   terminal's `search`); focus goes back to `opener` (or the element that had focus) when it closes.
// - `migrainz:terminal-run` { command } asks the homepage terminal to run a command (the palette's `help`).
// - PENDING_KEY: the same request across a navigation home (sessionStorage, one shot, only "help" is honoured).
export const OPEN_PALETTE_EVENT = "migrainz:open-palette";
export const TERMINAL_RUN_EVENT = "migrainz:terminal-run";
export const PENDING_KEY = "migrainz-terminal-run";

export function openPalette(query = "", opener?: Element | null) {
  window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT, { detail: { query, opener: opener ?? document.activeElement } }));
}
