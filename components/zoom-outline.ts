// The Win95 zoom outline and the phone sheet (design canvas board 2, docs/redesign-plan.md "Decided: terminal ↔ desktop
// mode switch"; batch 27). A dotted rectangle steps from one box to another in 7 frames over 280 ms: from the clicked
// item to the window as the desktop is revealed, and from a window to its taskbar button when it is closed or
// minimized. On phones the route window slides up from the bottom as a sheet instead of the opening outline.
// Decoration only: aria-hidden, pointer-events none, never focused, nothing waits for it. Only opacity (the outline's
// frames) and transform (the sheet) animate. Off with reduced motion, SYSTEM ▸ MOTION: REDUCED, the plain view and CRT
// not "on" (components/home/motion.ts).
import { crtMode, reducedMotion } from "@/components/home/motion";

/** Frames and duration of the outline; the sheet's slide. Mirrored in globals.css ("Zoom outline"). */
export const ZOOM = { steps: 7, frame: 40, duration: 280, sheet: 280 };

export type Box = { x: number; y: number; width: number; height: number };

export const zoomAllowed = () => !reducedMotion() && crtMode() === "on";
export const phoneWidth = () => window.matchMedia("(max-width: 700px)").matches;

export const boxOf = (element: Element | null | undefined): Box | null => {
  if (!element || !element.isConnected) return null;
  const { x, y, width, height } = element.getBoundingClientRect();
  return width > 0 && height > 0 ? { x, y, width, height } : null;
};

let current: { layer: HTMLElement; timer: number } | null = null;
const removeCurrent = () => {
  if (!current) return;
  clearTimeout(current.timer);
  current.layer.remove();
  current = null;
};

/** Plays the outline from `from` to `to` (viewport boxes). Returns the outline's element, or null when it does not play. */
export function playZoomOutline(from: Box | null, to: Box | null, kind: "open" | "close" | "minimize"): HTMLElement | null {
  if (!from || !to || !zoomAllowed()) return null;
  removeCurrent();
  const layer = document.createElement("div");
  layer.className = "zoom-outline";
  layer.setAttribute("aria-hidden", "true");
  layer.dataset.kind = kind;
  layer.dataset.from = [from.x, from.y, from.width, from.height].map(Math.round).join(",");
  layer.dataset.to = [to.x, to.y, to.width, to.height].map(Math.round).join(",");
  for (let step = 0; step < ZOOM.steps; step += 1) {
    const t = step / (ZOOM.steps - 1);
    const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
    const frame = document.createElement("i");
    frame.style.cssText = `left:${mix(from.x, to.x)}px;top:${mix(from.y, to.y)}px;width:${mix(from.width, to.width)}px;height:${mix(from.height, to.height)}px;--zoom-step:${step}`;
    layer.append(frame);
  }
  document.body.append(layer);
  const entry = { layer, timer: window.setTimeout(() => { if (current === entry) removeCurrent(); }, ZOOM.duration + 40) };
  current = entry;
  return layer;
}

/** Phones: the route window slides up from the bottom (transform only). Returns the animation, or null. */
export function slideSheetUp(element: HTMLElement | null): Animation | null {
  if (!element || !phoneWidth() || !zoomAllowed() || typeof element.animate !== "function") return null;
  element.dataset.sheet = "in";
  const animation = element.animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: ZOOM.sheet, easing: "cubic-bezier(.2, .7, 0, 1)" });
  const done = () => { delete element.dataset.sheet; };
  animation.addEventListener("finish", done, { once: true });
  animation.addEventListener("cancel", done, { once: true });
  return animation;
}

/** The window a route opened (RouteApplication, the comic reader), as it is on screen. */
export const routeWindow = () => document.querySelector<HTMLElement>(".public-windows > .retro-window[data-route-window]");

/** Window → its taskbar button on the desktop (close, minimize). Measured before the window goes. */
export function zoomToTaskbar(id: string, kind: "close" | "minimize") {
  if (!document.querySelector(".graphics-route")) return null;
  const selector = `[data-window-id="${CSS.escape(id)}"]`;
  return playZoomOutline(boxOf(document.querySelector(`.public-windows > .retro-window${selector}`)), boxOf(document.querySelector(`.public-window-dock button${selector}`)), kind);
}
