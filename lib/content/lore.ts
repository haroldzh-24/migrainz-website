// Lore links with hover previews (design canvas board 8; batch 24). Pure functions, no server-only import, so the
// isolated test (scripts/verify-lore-index.ts) runs the same code as the pages.
//
// loreEntries() turns findListing rows (lib/content/queries.ts getLoreIndex) into the records that may be linked: PUBLIC
// only. A row is kept when its accessLevel is exactly `public`, it is not a classified placeholder (classification set,
// safe label, `classified:*` slug), it has a name and a slug, and the parent it hangs under (an equipment item's faction)
// is itself kept. A signed-in patron gets the same list: patron records they may read are never linked or previewed.
//
// createLoreLinker() finds those names in text. Rules (plan, batch 24): whole word (no letter, digit or underscore on
// either side), case-sensitive on the record's display name, longest name first, only the first mention per paragraph,
// never the page's own record. Rich text (Lexical `writing`): never inside an existing link, a heading, code (code
// blocks or inline code), an upload, a relationship or a block; formatting is kept (the matched piece keeps its text
// node, format bits included). A name split across two differently formatted text nodes is not matched.

export type LoreKind = 'character' | 'faction' | 'equipment';
/** One linkable record, as the preview card and the CROSS-REFERENCES aside show it. Only public fields. */
export type LoreEntry = {
  key: string; kind: LoreKind; name: string; href: string;
  /** One line from the record's description (plain text, at most ~140 characters). */
  summary?: string;
  /** Character: its primary faction's name (only when that faction is itself public). */
  faction?: string;
  /** Faction: how many public characters list it (primary faction or affiliation). */
  members?: number;
  /** Equipment: the `.EQP` file name. */
  file?: string;
  /** Character: a public portrait thumbnail (/api/media/file/...). */
  portrait?: string;
  /** Equipment: its public schematic poster (schematicPoster(), /api/media/file/...). */
  poster?: string;
};

type Relation = number | { id: number } | null | undefined;
const idOf = (value: Relation) => (value == null ? -1 : typeof value === 'object' ? value.id : value);
type Row = { id: number; slug?: string | null; name?: string | null; description?: string | null; accessLevel?: string | null; classification?: unknown; safeLabel?: unknown };
const isPublic = (row: Row) => row.accessLevel === 'public' && !row.classification && !row.safeLabel
  && typeof row.slug === 'string' && row.slug !== '' && !row.slug.startsWith('classified:') && typeof row.name === 'string' && row.name.trim() !== '';

/** The first sentence (or line) of a description, cut to about 140 characters. */
export function loreSummary(text?: string | null): string | undefined {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return undefined;
  const sentence = /^(.+?[.!?])(?:\s|$)/.exec(flat)?.[1] ?? flat;
  return sentence.length > 140 ? sentence.slice(0, 139).replace(/\s+\S*$/, '') + '…' : sentence;
}

export const equipmentFile = (name: string) => `${name.replace(/\s+/g, '_')}.EQP`;

export function loreEntries(projectSlug: string, lists: {
  characters: (Row & { primaryFaction?: Relation; affiliations?: Relation[] | null; portrait?: string })[];
  factions: Row[];
  equipment: (Row & { faction?: Relation; poster?: string })[];
}): LoreEntry[] {
  const base = `/projects/${projectSlug}`;
  const factions = lists.factions.filter(isPublic);
  const factionByID = new Map(factions.map(row => [row.id, row]));
  const characters = lists.characters.filter(isPublic);
  const entries: LoreEntry[] = [];
  for (const row of characters) {
    const faction = factionByID.get(idOf(row.primaryFaction));
    entries.push({ key: `character:${row.slug}`, kind: 'character', name: row.name!.trim(), href: `${base}/characters/${row.slug}`,
      summary: loreSummary(row.description), faction: faction?.name?.trim(), portrait: row.portrait });
  }
  for (const row of factions) {
    const members = characters.filter(character => idOf(character.primaryFaction) === row.id
      || (character.affiliations ?? []).some(value => idOf(value) === row.id)).length;
    entries.push({ key: `faction:${row.slug}`, kind: 'faction', name: row.name!.trim(), href: `${base}/factions/${row.slug}`,
      summary: loreSummary(row.description), members });
  }
  for (const row of lists.equipment) {
    const faction = idOf(row.faction);
    if (!isPublic(row) || (faction >= 0 && !factionByID.has(faction))) continue;
    entries.push({ key: `equipment:${row.slug}`, kind: 'equipment', name: row.name!.trim(), href: `${base}/equipment/${row.slug}`,
      summary: loreSummary(row.description), file: equipmentFile(row.name!.trim()), poster: row.poster });
  }
  return entries;
}

/** A piece of linked plain text: a string, or a name that links to its record. */
export type LoreSegment = string | { text: string; entry: LoreEntry };

const WORD = /[\p{L}\p{N}_]/u;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Node types whose text is never linked (an existing link, a heading, code, media, embedded records and blocks).
const SKIP = new Set(['link', 'autolink', 'heading', 'code', 'code-block', 'codeBlock', 'upload', 'relationship', 'block', 'inlineBlock', 'loreLink']);
// Block nodes that start a new paragraph for the "first mention per paragraph" rule.
const PARAGRAPHS = new Set(['paragraph', 'listitem', 'quote', 'tablecell']);
const IS_CODE = 1 << 4;

type LexicalNode = { type?: string; text?: string; format?: number | string; children?: LexicalNode[]; [key: string]: unknown };
type Writing = { root: LexicalNode } & Record<string, unknown>;

/**
 * Links record names in one page's text. `self` is the page's own record key (never linked). `used()` lists every record
 * linked so far on the page, in first-link order, for the CROSS-REFERENCES aside.
 */
export function createLoreLinker(entries: readonly LoreEntry[], options: { self?: string } = {}) {
  const byName = new Map<string, LoreEntry>();
  // Same name twice (a character and a faction, say): the first kept wins (characters, then factions, then equipment).
  for (const entry of entries) if (entry.key !== options.self && entry.name.length >= 2 && !byName.has(entry.name)) byName.set(entry.name, entry);
  const names = [...byName.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b));
  const pattern = names.length ? new RegExp(names.map(escape).join('|'), 'gu') : undefined;
  const used = new Map<string, LoreEntry>();

  /** Splits one run of text; `seen` holds the record keys already linked in this paragraph. */
  function split(text: string, seen: Set<string>): LoreSegment[] {
    if (!pattern || !text) return text ? [text] : [];
    const out: LoreSegment[] = [];
    let last = 0;
    for (let from = 0; from <= text.length;) {
      pattern.lastIndex = from;
      const match = pattern.exec(text);
      if (!match) break;
      const start = match.index;
      const before = start > 0 ? text.slice(0, start).at(-1)! : '';
      // Whole word only: a longer alternative failing the boundary must not hide a shorter one at the same place, so
      // try every name at this position, longest first.
      let hit: string | undefined;
      if (!WORD.test(before)) {
        for (const name of names) {
          if (!text.startsWith(name, start)) continue;
          const next = text.slice(start + name.length, start + name.length + 2);
          if (!next || !WORD.test([...next][0])) { hit = name; break; }
        }
      }
      if (!hit) { from = start + 1; continue; }
      const entry = byName.get(hit)!;
      const stop = start + hit.length;
      if (!seen.has(entry.key)) {
        if (start > last) out.push(text.slice(last, start));
        out.push({ text: hit, entry });
        seen.add(entry.key);
        if (!used.has(entry.key)) used.set(entry.key, entry);
        last = stop;
      }
      from = stop;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  /** Plain text (a textarea field): one paragraph per blank-line-separated block. */
  function text(value?: string | null): LoreSegment[] {
    if (!value) return [];
    return value.split(/(\n\s*\n)/).flatMap(part => /^\n\s*\n$/.test(part) ? [part] : split(part, new Set()));
  }

  function walk(node: LexicalNode, seen: Set<string>): LexicalNode[] {
    if (node.type === 'text' && typeof node.text === 'string') {
      if (typeof node.format === 'number' && node.format & IS_CODE) return [node];
      const parts = split(node.text, seen);
      if (parts.length === 1 && typeof parts[0] === 'string') return [node];
      return parts.map(part => typeof part === 'string' ? { ...node, text: part }
        : { type: 'loreLink', version: 1, entry: part.entry, children: [{ ...node, text: part.text }] });
    }
    if (!Array.isArray(node.children) || SKIP.has(node.type ?? '')) return [node];
    const scope = PARAGRAPHS.has(node.type ?? '') ? new Set<string>() : seen;
    return [{ ...node, children: node.children.flatMap(child => walk(child, scope)) }];
  }

  /** Rich text (Lexical `writing`): a copy with `loreLink` nodes around matched names; the input is not changed. */
  function writing<T>(value: T): T {
    const data = value as unknown as Writing | null | undefined;
    if (!data || typeof data !== 'object' || !data.root || !pattern) return value;
    return { ...data, root: walk(data.root, new Set())[0] } as unknown as T;
  }

  return { text, writing, used: () => [...used.values()] };
}
