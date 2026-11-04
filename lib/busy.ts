// What the page is busy with right now (rework plan, from batch 15): a page turn, terminal typing. Kept as a space-
// separated list on html[data-busy] and announced with a migrainz:busy event, so later features (the ghost) can wait
// for a quiet moment without reaching into each component. Client-only.
const reasons = new Set<string>();

export function setBusy(reason: string, on: boolean) {
  if (typeof document === "undefined") return;
  const had = reasons.has(reason);
  if (on === had) return;
  if (on) reasons.add(reason); else reasons.delete(reason);
  const root = document.documentElement;
  if (reasons.size) root.dataset.busy = [...reasons].join(" ");
  else delete root.dataset.busy;
  window.dispatchEvent(new CustomEvent("migrainz:busy", { detail: { reason, on, reasons: [...reasons] } }));
}

export const isBusy = () => reasons.size > 0;
