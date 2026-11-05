// The ghost in the machine (rework plan, batches 18 to 20; Harold, 2026-11-04). A second "user" haunts the public
// terminal and, now and then, tries to sell you something. What it knows lives only in this browser:
//   localStorage  migrainz-ghost-v1          visits, the visit of the last ambient event, exorcised, milestones shown,
//                                            whether an ad was ever opened, chapters finished, the archive file unlocked
//   sessionStorage migrainz-ghost-session-v1 this visit's number and its stored roll (a reload never re-rolls), the
//                                            ambient event used, an ad opened this visit, lines already shown
// A visit is a tab session (as the boot and the shop ad). Blocked or corrupt storage: the ghost stays quiet; hidden
// terminal commands still answer. Nothing is sent anywhere.
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

type Stored = { visits: number; lastEvent: number; exorcised: boolean; milestones: number[]; adEver: boolean; chapters: string[] };
type Session = { visit: number; roll: boolean; pick: Ambient | null; event: string | null; ad: boolean; shown: string[]; noteTries: number };

const LOCAL_KEY = "migrainz-ghost-v1";
const SESSION_KEY = "migrainz-ghost-session-v1";
const TEST_KEY = "migrainz-ghost-test";
export const MILESTONES = [3, 7, 13];
export const ARCHIVE_VISIT = 5;

let local: Stored | null = null;
let session: Session | null = null;
let broken = false;

const fresh = (): Stored => ({ visits: 0, lastEvent: -10, exorcised: false, milestones: [], adEver: false, chapters: [] });

function read<T>(storage: Storage, key: string): unknown {
  const raw = storage.getItem(key);
  return raw ? JSON.parse(raw) as T : null;
}
function save() {
  if (broken || !local || !session) return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { broken = true; }
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

/** Loads the record and counts this visit (once per tab session). False when storage is unusable. */
function load(): boolean {
  if (typeof window === "undefined" || broken) return false;
  if (local && session) return true;
  try {
    const stored = read<Stored>(localStorage, LOCAL_KEY);
    const base = fresh();
    local = typeof stored === "object" && stored ? { ...base, ...(stored as Partial<Stored>) } : base;
    if (!Number.isInteger(local.visits) || local.visits < 0) local.visits = 0;
    if (!Array.isArray(local.milestones)) local.milestones = [];
    if (!Array.isArray(local.chapters)) local.chapters = [];
    const current = read<Session>(sessionStorage, SESSION_KEY);
    if (typeof current === "object" && current && Number.isInteger((current as Session).visit)) {
      session = { ...{ pick: null, event: null, ad: false, shown: [], noteTries: 0 }, ...(current as Session) };
    } else {
      local.visits += 1;
      const visit = local.visits;
      const chance = lateNight() ? 1 / 4 : 1 / 8;
      const roll = visit > 1 && !local.exorcised && visit - local.lastEvent > 2 && Math.random() < chance;
      const pick = roll ? AMBIENT[Math.floor(Math.random() * AMBIENT.length)] : null;
      session = { visit, roll, pick, event: null, ad: false, shown: [], noteTries: 0 };
    }
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
  exorcised(): boolean { return load() ? local!.exorcised : false; },
  exorcise() { if (load()) { local!.exorcised = true; save(); } },
  summon() { if (load()) { local!.exorcised = false; save(); } },

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

  adOpened() { if (load()) { session!.ad = true; local!.adEver = true; save(); } },
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
