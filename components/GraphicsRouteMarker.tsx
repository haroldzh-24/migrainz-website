/**
 * Server-rendered marker for pages that open a grey window (design canvas board 2): CSS switches the page to the teal
 * desktop on it from the first paint (`:root:has(.graphics-route)` in globals.css), and components/ModeSwitch.tsx reads
 * it to decide whether a route change crossed between the terminal and the desktop. Kept in its own file so route
 * windows don't import the router-bound switch.
 */
export function GraphicsRouteMarker() {
  return <span className="graphics-route" hidden />;
}
