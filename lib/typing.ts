// Terminal typing (rework plan, batches 16 and 17; Harold, 2026-11-04: "displays one letter/space at a time like a
// system is typing it out with that strobing dash thing"). Untyped characters are hidden with the CSS Custom Highlight
// API: Ranges over the page's own text, styled ::highlight(untyped) { color: transparent }. The DOM text never changes,
// so React is untouched, the layout is final from the first frame, textContent and screen readers always get the full
// text, and search engines and no-JS visitors see everything. Where the API is missing (or forced colours are on), text
// simply shows complete. Client-only.
import { reducedMotion } from "@/components/home/motion";

export const TYPE_CPS = 55;

export const typingSupported = () =>
  typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight === "function" && !window.matchMedia("(forced-colors: active)").matches;

/** Typing may run: supported, motion allowed, CRT not off. */
export const typingAllowed = () =>
  typingSupported() && !reducedMotion() && document.documentElement.dataset.crt !== "off";

let shared: Highlight | null = null;
/** The one "untyped" highlight; each user adds and removes its own ranges. */
export function untypedHighlight(): Highlight {
  if (!shared) {
    shared = new Highlight();
    CSS.highlights.set("untyped", shared);
  }
  return shared;
}

/** The viewport box of the point just after `offset` characters into a text node (for a cursor overlay). */
export function caretBox(node: Text, offset: number): DOMRect | null {
  const range = document.createRange();
  const at = Math.max(0, Math.min(offset, node.length));
  if (at > 0) {
    // The box of the last typed character: its right edge is where the next one goes (also across a line wrap).
    range.setStart(node, at - 1);
    range.setEnd(node, at);
    const rects = range.getClientRects();
    const last = rects[rects.length - 1];
    return last ? new DOMRect(last.right, last.top, 0, last.height) : null;
  }
  range.setStart(node, 0);
  range.setEnd(node, Math.min(1, node.length));
  const first = range.getClientRects()[0];
  return first ? new DOMRect(first.left, first.top, 0, first.height) : null;
}
