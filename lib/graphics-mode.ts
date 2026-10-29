// Graphics mode (design canvas board 2; docs/redesign-plan.md "Decided: terminal ↔ desktop mode switch"): routes that open
// a grey Win95 window sit on a dark teal desktop instead of the green terminal. Pages mark themselves with
// <GraphicsRouteMarker /> (CSS keys the desktop on it, so a direct load never flashes the terminal); this list only
// decides, before a link is followed, whether the switch animation should play. scripts/verify-mode-switch.mjs checks
// that the two agree on every route the fixture serves.

/**
 * Paths that render a route window (RouteApplication) or the comic reader. The equipment directory
 * (/projects/<slug>/equipment) is the one project page outside the window (design canvas board 22).
 */
export function isGraphicsPath(pathname: string): boolean {
  if (/^\/projects\/[^/]+\/equipment\/?$/.test(pathname)) return false;
  return /^\/(projects|comics|archive)(\/|$)/.test(pathname);
}

/** The file name the terminal prints when it opens a path: `$ open blushland.prj`. */
export function fileForPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean).map(part => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  const [root, first, second] = parts;
  if (root === "projects") return first ? `${first}.prj` : "projects.db";
  if (root === "comics") return second ? `${first}_${second}.cbz` : first ? `${first}/` : "comics/";
  if (root === "archive") return "archive/";
  return `${root ?? "home"}/`;
}

export const GRAPHICS_LINES = ["mounting volume ........ ok", "image data detected", "switching to graphics mode ..."] as const;

/** Session key for the last terminal page, where the desktop's ◂ TERMINAL button goes back to. */
export const LAST_TERMINAL_KEY = "migrainz-last-terminal";

/**
 * Navigate from code (the homepage terminal): asks ModeSwitch to run the switch when the target is a grey-window route,
 * otherwise (or if nothing handles the request) calls `push` directly.
 */
export function openRoute(push: (href: string) => void, href: string) {
  const request = new CustomEvent("migrainz:open-route", { detail: { href }, cancelable: true });
  if (window.dispatchEvent(request)) push(href);
}
