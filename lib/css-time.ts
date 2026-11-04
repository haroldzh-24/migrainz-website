// A CSS time token in milliseconds (14b). Browsers may serialize a custom property's value in their own form (Chrome
// gives "--motion-page-flip: 550ms" back as ".55s"), so both units are read; anything else falls back.
export function cssTime(name: string, fallback: number): number {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const match = /^(\d*\.?\d+)(ms|s)$/i.exec(raw);
  if (!match) return fallback;
  const value = parseFloat(match[1]) * (match[2].toLowerCase() === "s" ? 1000 : 1);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
