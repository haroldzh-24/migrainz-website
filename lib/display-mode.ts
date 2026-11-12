// Display settings from code (the homepage terminal's commands, the command palette; batch 23): written the same way
// the SYSTEM menu's buttons write them (components/CrtToggle.tsx), then announced so those buttons catch up.
export type DisplayAttribute = "crt" | "phosphor" | "view" | "motion";
export const DISPLAY_KEYS: Record<DisplayAttribute, string> = { crt: "crt-effects", phosphor: "crt-phosphor", view: "migrainz-view", motion: "migrainz-motion" };

export function setDisplayMode(attribute: DisplayAttribute, value: string) {
  document.documentElement.dataset[attribute] = value;
  try { localStorage.setItem(DISPLAY_KEYS[attribute], value); } catch { /* storage may be blocked */ }
  window.dispatchEvent(new CustomEvent("migrainz:display-mode", { detail: { attribute, value } }));
}
