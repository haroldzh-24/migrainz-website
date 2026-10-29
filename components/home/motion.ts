/**
 * Calls `change(true)` while the homepage's moving text layers may run and `change(false)` when they must stop: the element
 * is on screen, the tab is visible, reduced motion is off and CRT effects are "on". Reacts to scrolling, tab switches,
 * the reduced-motion setting and CRT mode changes (SYSTEM menu or terminal), so no timer keeps polling while nothing is
 * drawn. Returns the cleanup.
 */
export function watchMotion(element: Element, change: (running: boolean) => void): () => void {
  let visible = false, last: boolean | null = null, disposed = false;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const update = () => {
    if (disposed) return;
    const running = visible && !document.hidden && !motion.matches && (document.documentElement.dataset.crt ?? "on") === "on";
    if (running !== last) { last = running; change(running); }
  };
  // Entries can arrive batched: the last one is the current state.
  const seen = new IntersectionObserver(entries => { visible = entries[entries.length - 1].isIntersecting; update(); });
  seen.observe(element);
  const mode = new MutationObserver(update);
  mode.observe(document.documentElement, { attributes: true, attributeFilter: ["data-crt"] });
  document.addEventListener("visibilitychange", update);
  motion.addEventListener("change", update);
  return () => {
    disposed = true;
    seen.disconnect();
    mode.disconnect();
    document.removeEventListener("visibilitychange", update);
    motion.removeEventListener("change", update);
  };
}

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const crtMode = () => document.documentElement.dataset.crt ?? "on";
export const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
