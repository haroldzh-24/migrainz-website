// Idle time for the ghost (batches 19 and 20): `afterIdle(ms, run)` calls `run` once nothing has happened for `ms`
// (no key, pointer move or press, wheel or touch, and the tab visible; scrolling by wheel, touch or keys counts through
// those, while the page's own programmatic scrolling, like the terminal log following new lines, does not). Returns the cleanup. `onActivity`
// calls back on the next activity (to stop a stunt the moment the visitor moves). Client-only.
const ACTIVITY = ["keydown", "pointermove", "pointerdown", "wheel", "touchstart"] as const;

export function afterIdle(ms: number, run: () => void): () => void {
  let timer = 0;
  const restart = () => {
    window.clearTimeout(timer);
    if (!document.hidden) timer = window.setTimeout(run, ms);
  };
  for (const type of ACTIVITY) window.addEventListener(type, restart, { passive: true, capture: true });
  document.addEventListener("visibilitychange", restart);
  restart();
  return () => {
    window.clearTimeout(timer);
    for (const type of ACTIVITY) window.removeEventListener(type, restart, { capture: true });
    document.removeEventListener("visibilitychange", restart);
  };
}

export function onActivity(run: () => void): () => void {
  const fire = () => { stop(); run(); };
  const stop = () => { for (const type of ACTIVITY) window.removeEventListener(type, fire, { capture: true }); };
  for (const type of ACTIVITY) window.addEventListener(type, fire, { passive: true, capture: true });
  return stop;
}
