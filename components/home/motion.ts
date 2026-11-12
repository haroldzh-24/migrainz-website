// Motion settings, one place (batch 22). Motion is reduced when the OS asks for it, when the visitor picked
// SYSTEM ▸ MOTION: REDUCED (html[data-motion="reduced"], saved as `migrainz-motion`) or when the page is in the plain
// reading view (html[data-view="plain"], saved as `migrainz-view`). There is no override that turns motion back on
// against the OS setting: MOTION offers AUTO (follow the OS) and REDUCED only. CRT "off" is checked separately where it
// already applied (crtMode()).

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
/** The <html> attributes that change whether motion may run; watchers observe these. */
export const MOTION_ATTRIBUTES = ["data-crt", "data-motion", "data-view"];

/** The plain reading view is on (SYSTEM ▸ VIEW: PLAIN). */
export const plainView = () => document.documentElement.dataset.view === "plain";

/** Motion is reduced: the OS setting, SYSTEM ▸ MOTION: REDUCED or the plain view. */
export const reducedMotion = () =>
  window.matchMedia(REDUCE_QUERY).matches || document.documentElement.dataset.motion === "reduced" || plainView();

export const crtMode = () => document.documentElement.dataset.crt ?? "on";
export const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * Calls `change()` whenever any input of reducedMotion() or crtMode() may have changed: the OS setting, or the
 * html data-crt / data-motion / data-view attributes (SYSTEM menu, terminal commands). Returns the cleanup.
 */
export function onMotionChange(change: () => void): () => void {
  const query = window.matchMedia(REDUCE_QUERY);
  const mode = new MutationObserver(change);
  mode.observe(document.documentElement, { attributes: true, attributeFilter: MOTION_ATTRIBUTES });
  query.addEventListener("change", change);
  return () => { mode.disconnect(); query.removeEventListener("change", change); };
}

/**
 * Calls `change(true)` while the homepage's moving text layers may run and `change(false)` when they must stop: the element
 * is on screen, the tab is visible, motion is not reduced (reducedMotion()) and CRT effects are "on". Reacts to scrolling,
 * tab switches, the reduced-motion setting, SYSTEM ▸ MOTION, the plain view and CRT mode changes (SYSTEM menu or
 * terminal), so no timer keeps polling while nothing is drawn. Returns the cleanup.
 */
export function watchMotion(element: Element, change: (running: boolean) => void): () => void {
  let visible = false, last: boolean | null = null, disposed = false;
  const update = () => {
    if (disposed) return;
    const running = visible && !document.hidden && !reducedMotion() && crtMode() === "on";
    if (running !== last) { last = running; change(running); }
  };
  // Entries can arrive batched: the last one is the current state.
  const seen = new IntersectionObserver(entries => { visible = entries[entries.length - 1].isIntersecting; update(); });
  seen.observe(element);
  const stopSettings = onMotionChange(update);
  document.addEventListener("visibilitychange", update);
  return () => {
    disposed = true;
    seen.disconnect();
    stopSettings();
    document.removeEventListener("visibilitychange", update);
  };
}
