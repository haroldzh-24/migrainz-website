// A CSS time token in milliseconds (14b). The served CSS may hold a token in another form than the source (the
// "--motion-page-flip: 550ms" written in globals.css reads back as ".55s" in the browser, most likely rewritten by the
// CSS build step), so both units are read; anything else falls back.
export function cssTime(name: string, fallback: number): number {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const match = /^(\d*\.?\d+)(ms|s)$/i.exec(raw);
  if (!match) return fallback;
  const value = parseFloat(match[1]) * (match[2].toLowerCase() === "s" ? 1000 : 1);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
