// The ghost in the machine (rework plan, batches 18 to 20; Harold, 2026-11-04). A second "user" haunts the public
// terminal and, now and then, tries to sell you something. What it knows lives only in this browser:
//   localStorage  migrainz-ghost-v1          visits, the visit of the last ambient event, exorcised, milestones shown,
//                                            whether an ad was ever opened, chapters finished, the last activity time
//                                            and a copy of the current visit (so a new tab can join it)
//   sessionStorage migrainz-ghost-session-v1 this visit's number and its stored roll (a reload never re-rolls), the
//                                            ambient event used, an ad opened this visit, lines already shown
// A visit (batch 21, Harold 2026-11-12) ends after 30 minutes with no recorded activity in this browser: a page load,
// or a pointer, key, scroll or tab switch (written at most once a minute, and when the tab is hidden). A new tab or a
// reload within 30 minutes continues the same visit, with its roll; after the gap, the next page load is a new visit.
// Before batch 21 a visit was a tab session, so links opened in new tabs inflated the count. A tab whose record has no
// activity time yet (stored before batch 21) keeps its own visit. Blocked or corrupt storage: the ghost stays quiet;
// hidden terminal commands still answer. Nothing is sent anywhere.
//
// Rarity (Harold: "the key is not to have these happen all the time"): never on a first visit; at most one ambient
// event per visit, on about 1 visit in 8 (1 in 4 between midnight and 4 a.m. local time); after one, none for the next
// 2 visits; never while the page is busy (a page turn, typing, the mode switch, the boot), with reduced motion or CRT
// off (visual stunts only), or once `exorcise`d (until `summon`). Tests: outside production builds, localStorage
// migrainz-ghost-test = "block" or "force:<name>,<name>" decides every roll.

export type Ambient = "second-user" | "slip" | "idle" | "second-cursor" | "misclick" | "watcher" | "amber" | "boot-ad";
export type Line = "tails" | "console" | "tab" | "not-found" | "welcome" | "archive" | "chapter";
/** The ambient events a visit can draw (one at most, picked with the roll so no event always wins the race). */
export const AMBIENT: Ambient[] = ["second-user", "slip", "idle", "second-cursor", "misclick", "watcher", "amber", "boot-ad"];

type Stored = {
  visits: number; lastEvent: number; exorcised: boolean; milestones: number[]; adEver: boolean; chapters: string[];
  /** Last recorded activity in this browser (ms since 1970; 0 = unknown, a record from before batch 21). */
  lastActive: number;
  /** The current visit, shared so a new tab within the gap joins it (batch 21). */
  current: Session | null;
};
type Session = { visit: number; roll: boolean; pick: Ambient | null; event: string | null; ad: boolean; shown: string[]; noteTries: number };

const LOCAL_KEY = "migrainz-ghost-v1";
const SESSION_KEY = "migrainz-ghost-session-v1";
const TEST_KEY = "migrainz-ghost-test";
export const MILESTONES = [3, 7, 13];
export const ARCHIVE_VISIT = 5;
/** A new visit starts only after this long with no recorded activity in this browser (Harold, 2026-11-12). */
export const VISIT_GAP_MS = 30 * 60 * 1000;
/** Activity is written to storage at most this often (and always when the tab is hidden). */
const TOUCH_EVERY_MS = 60 * 1000;

let local: Stored | null = null;
let session: Session | null = null;
let broken = false;

const fresh = (): Stored => ({ visits: 0, lastEvent: -10, exorcised: false, milestones: [], adEver: false, chapters: [], lastActive: 0, current: null });

// Reading: storage that throws means the ghost stays quiet (broken); a value that is not valid JSON or has the wrong
// shape is simply replaced by a fresh one (18b), field by field.
function read(storage: Storage, key: string): unknown {
  const raw = storage.getItem(key); // may throw: blocked storage
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
const int = (value: unknown, fallback: number) => (Number.isInteger(value) ? value as number : fallback);
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
const numbers = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is number => Number.isInteger(item)) : []);
function normaliseLocal(value: unknown): Stored {
  const record = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const base = fresh();
  return {
    visits: Math.max(0, int(record.visits, base.visits)), lastEvent: int(record.lastEvent, base.lastEvent),
    exorcised: record.exorcised === true, milestones: numbers(record.milestones), adEver: record.adEver === true, chapters: strings(record.chapters),
    lastActive: Math.max(0, int(record.lastActive, base.lastActive)), current: normaliseSession(record.current),
  };
}
function normaliseSession(value: unknown): Session | null {
  if (typeof value !== "object" || !value || !Number.isInteger((value as Session).visit)) return null;
  const record = value as Record<string, unknown>;
  return {
    visit: record.visit as number, roll: record.roll === true, pick: AMBIENT.includes(record.pick as Ambient) ? record.pick as Ambient : null,
    event: typeof record.event === "string" ? record.event : null, ad: record.ad === true, shown: strings(record.shown), noteTries: Math.max(0, int(record.noteTries, 0)),
  };
}
// Two tabs in the same visit (batch 21): what either has used or shown counts for both (one ambient event and one ad
// per visit, lines once per visit). The roll and pick are the visit's own and the same in both.
function mergeVisit(mine: Session, other: Session | null): Session {
  if (!other || other.visit !== mine.visit) return mine;
  return {
    ...mine, event: mine.event ?? other.event, ad: mine.ad || other.ad,
    shown: [...new Set([...mine.shown, ...other.shown])], noteTries: Math.max(mine.noteTries, other.noteTries),
  };
}
// A time stored by a clock that has since moved back is not trusted as "recent" for ever.
const sane = (time: number, now: number) => (time <= now + 60 * 1000 ? time : 0);

// Another tab may have saved since this one loaded (18b): merge rather than overwrite, so an `exorcise` in one tab is
// never undone by an older tab, and the visit count never goes down. This tab's own change to `exorcised` wins.
let exorcisedHere: boolean | null = null;
function save() {
  if (broken || !local || !session) return;
  try {
    const other = normaliseLocal(read(localStorage, LOCAL_KEY));
    const now = Date.now();
    session = mergeVisit(session, other.current);
    local = {
      visits: Math.max(local.visits, other.visits), lastEvent: Math.max(local.lastEvent, other.lastEvent),
      exorcised: exorcisedHere ?? other.exorcised, milestones: [...new Set([...other.milestones, ...local.milestones])],
      adEver: local.adEver || other.adEver, chapters: [...new Set([...other.chapters, ...local.chapters])].slice(-50),
      lastActive: Math.max(sane(local.lastActive, now), sane(other.lastActive, now)),
      // A newer visit another tab started stays the shared one; this tab keeps its own until its next page load.
      current: other.current && other.current.visit > session.visit ? other.current : session,
    };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { broken = true; }
}
// A save in another tab: read again on next use.
if (typeof window !== "undefined") window.addEventListener("storage", event => { if (event.key === LOCAL_KEY) local = null; });

// Activity keeps the visit going (batch 21): written at most once a minute, and always when the tab is hidden or left,
// only once this page has loaded the ghost (no storage write from a page that never asked).
function touch(always = false) {
  if (broken || !local || !session) return;
  const now = Date.now();
  if (!always && now - local.lastActive < TOUCH_EVERY_MS && now >= local.lastActive) return;
  local.lastActive = now;
  save();
}
if (typeof window !== "undefined") {
  const options = { capture: true, passive: true } as const;
  for (const type of ["pointerdown", "keydown", "wheel", "scroll", "touchstart"]) window.addEventListener(type, () => touch(), options);
  document.addEventListener("visibilitychange", () => touch(true));
  window.addEventListener("pagehide", () => touch(true));
}

/** Test override (never in production builds): "block", or "force:<name>,<name>". */
function override(): { block: boolean; force: Set<string> } {
  if (process.env.NODE_ENV === "production") return { block: false, force: new Set() };
  try {
    const value = localStorage.getItem(TEST_KEY) ?? "";
    if (value === "block") return { block: true, force: new Set() };
    if (value.startsWith("force:")) return { block: false, force: new Set(value.slice(6).split(",").map(name => name.trim()).filter(Boolean)) };
  } catch { /* no override */ }
  return { block: false, force: new Set() };
}

export const lateNight = (date = new Date()) => date.getHours() < 4;

/**
 * Loads the record and counts this visit: a new one only after VISIT_GAP_MS with no recorded activity (batch 21). A
 * tab's own visit continues within the gap (or when the record has no activity time yet); a new tab within the gap
 * joins the current visit. False when storage is unusable.
 */
function load(): boolean {
  if (typeof window === "undefined" || broken) return false;
  if (local && session) return true;
  try {
    local = normaliseLocal(read(localStorage, LOCAL_KEY));
    if (exorcisedHere !== null) local.exorcised = exorcisedHere;
    const now = Date.now();
    const lastActive = sane(local.lastActive, now);
    const recent = lastActive > 0 && now - lastActive < VISIT_GAP_MS;
    const shared = local.current && local.current.visit === local.visits ? local.current : null;
    // Already loaded on this page (read again after another tab saved): the page keeps its visit, whatever the gap.
    const mine = session ?? normaliseSession(read(sessionStorage, SESSION_KEY));
    if (session) {
      session = mergeVisit(session, shared);
    } else if (mine && (recent || lastActive === 0)) {
      // This tab's visit goes on; if another tab has since started a newer one (after a gap), this page joins it.
      session = shared && shared.visit > mine.visit ? { ...shared } : mergeVisit(mine, shared);
    } else if (!mine && recent && shared) {
      session = { ...shared }; // a new tab within the gap: the same visit, its roll and what it has used
    } else {
      local.visits += 1;
      const visit = local.visits;
      const chance = lateNight() ? 1 / 4 : 1 / 8;
      const roll = visit > 1 && !local.exorcised && visit - local.lastEvent > 2 && Math.random() < chance;
      const pick = roll ? AMBIENT[Math.floor(Math.random() * AMBIENT.length)] : null;
      // The tab title's chance (about 1 visit in 3) is rolled once per visit too (18b).
      session = { visit, roll, pick, event: null, ad: false, shown: Math.random() < 1 / 3 ? [] : ["tab-roll-lost"], noteTries: 0 };
    }
    local.visits = Math.max(local.visits, session.visit);
    local.lastActive = now;
    local.current = session;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    broken = true;
    local = null;
    session = null;
    return false;
  }
}

const quietMode = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.crt === "off";
const busyNow = () => Boolean(document.documentElement.dataset.busy) || document.documentElement.dataset.power !== "on"
  || Boolean(document.querySelector(".startup-sequence, .mode-switch:not([hidden]), main#top.power-on"));

export const ghost = {
  /** This visit's number (1 for a first visit); 0 when storage is unusable. */
  visit(): number { return load() && session ? session.visit : 0; },
  /** Not exorcised, storage usable, not blocked by a test. */
  awake(): boolean { return load() && !local!.exorcised && !override().block; },
  /** The tab title won its once-per-visit chance (18b). */
  tabRolled(): boolean { return load() && !session!.shown.includes("tab-roll-lost"); },
  // Without usable storage the off switch still holds for this page (18b), it just cannot be remembered.
  exorcised(): boolean { return load() ? local!.exorcised : exorcisedHere === true; },
  exorcise() { exorcisedHere = true; if (load()) { local!.exorcised = true; save(); } },
  summon() { exorcisedHere = false; if (load()) { local!.exorcised = false; save(); } },
  /** Whether this browser can remember the ghost at all. */
  remembers(): boolean { return load(); },

  /** A quiet line or effect that is not an ambient event (tails, console, tab title, 404 line...): awake, from visit 2. */
  allows(name: Line): boolean {
    const test = override();
    if (test.force.has(name)) return load() && !local!.exorcised;
    return ghost.awake() && session!.visit >= 2;
  },
  /** A chance roll for `name` (tests force or block it). */
  chance(name: Line, probability: number): boolean {
    const test = override();
    if (test.force.has(name)) return true;
    if (test.block) return false;
    return Math.random() < probability;
  },
  /** Once per visit for a named line (e.g. the console message); records it as shown. */
  once(name: string): boolean {
    if (!load() || session!.shown.includes(name)) return false;
    session!.shown.push(name);
    save();
    return true;
  },

  /**
   * Claims this visit's one ambient event for `name`. True only if this visit's stored roll drew `name` (or a test
   * forces it), it was not used yet, nothing is busy, and motion is allowed.
   */
  claim(name: Ambient, { ignoreBusy = false } = {}): boolean {
    const test = override();
    if (!load() || local!.exorcised || test.block) return false;
    if (session!.event) return false;
    if (!test.force.has(name) && (!session!.roll || session!.pick !== name)) return false;
    if (quietMode() || (!ignoreBusy && busyNow())) return false;
    session!.event = name;
    local!.lastEvent = session!.visit;
    save();
    return true;
  },
  /**
   * Whether this visit drew `name` and has not used its event yet (or a test forces it): cheap to ask before arming
   * listeners, so the other visits arm nothing (19b). `claim` still decides at the moment.
   */
  drawn(name: Ambient): boolean {
    const test = override();
    if (test.force.has(name)) return true;
    return load() && !local!.exorcised && !test.block && session!.roll && session!.pick === name && !session!.event;
  },
  /** The ambient event this visit has used, if any (e.g. the boot ad hijack, decided once and kept across reloads). */
  used(): string | null { return load() ? session!.event : null; },

  /** Welcome-back milestone due on this visit (3, 7 or 13), once each. */
  milestone(): number | null {
    if (!ghost.allows("welcome")) return null;
    const visit = session!.visit;
    const test = override();
    const due = test.force.has("welcome") ? MILESTONES.find(n => !local!.milestones.includes(n)) ?? null : MILESTONES.includes(visit) && !local!.milestones.includes(visit) ? visit : null;
    if (due === null) return null;
    local!.milestones.push(due);
    save();
    return test.force.has("welcome") ? visit : due;
  },
  archiveUnlocked(): boolean {
    const test = override();
    if (test.force.has("archive")) return true;
    return ghost.awake() && session!.visit >= ARCHIVE_VISIT;
  },

  /** Note tries of `cat .ghost/note.txt` this visit (the third one gives in). */
  noteTry(): number { if (!load()) return 1; session!.noteTries += 1; save(); return session!.noteTries; },

  /** A promo window opened (any counts as this visit's ad; only the shop counts as requisitions.exe opened ever). */
  adOpened(shop = true) { if (load()) { session!.ad = true; if (shop) local!.adEver = true; save(); } },
  adThisVisit(): boolean { return load() ? session!.ad : false; },
  adEver(): boolean { return load() ? local!.adEver : false; },
  chapterFinished(id: string) { if (load() && !local!.chapters.includes(id)) { local!.chapters = [...local!.chapters, id].slice(-50); save(); } },
  lastChapter(): string | null { return load() ? local!.chapters.at(-1) ?? null : null; },
  chapterSeen(id: string): boolean { return load() ? local!.chapters.includes(id) : false; },

  /** A test forces `name` (never in production builds). */
  forced(name: Ambient | Line): boolean { return override().force.has(name); },
  /** A waiting time for `name`: as given, or short when a test forces it (so tests need not wait a minute). */
  delay(name: Ambient | Line, ms: number): number { return override().force.has(name) ? Math.min(ms, 600) : ms; },

  /** For tests and the dev tools only: forget the in-memory copy so the next call reads storage again. */
  reset() { local = null; session = null; broken = false; },
};
