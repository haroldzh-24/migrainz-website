// The command palette's records, built from findListing rows (lib/content/search.ts). No server-only import, so the
// isolated test (scripts/verify-search-index.ts) runs the same filter. PUBLIC rows only: a row is kept when its
// accessLevel is exactly `public`, it is not a classified placeholder (classification set, `classified:*` slug, safe
// label) and every parent it hangs under (project, comic, faction) is itself a kept public row.

export type SearchKind = 'project' | 'chapter' | 'character' | 'faction' | 'equipment' | 'archive';
/** One record in /search-index: what the palette shows (label, hint) and where it goes (href). */
export type SearchEntry = { kind: SearchKind; label: string; hint: string; href: string };

type Row = { id: number; slug?: string | null; accessLevel?: string | null; classification?: unknown; safeLabel?: unknown };
type Relation = number | { id: number } | null | undefined;
const idOf = (value: Relation) => (value == null ? -1 : typeof value === 'object' ? value.id : value);
const isPublic = (row: Row) => row.accessLevel === 'public' && !row.classification && !row.safeLabel
  && typeof row.slug === 'string' && row.slug !== '' && !row.slug.startsWith('classified:');

export function searchEntries(lists: {
  projects: (Row & { title?: string | null; projectCode?: string | null })[];
  comics: (Row & { title?: string | null; project?: Relation })[];
  chapters: (Row & { title?: string | null; chapterNumber?: number | null; comic?: Relation })[];
  characters: (Row & { name?: string | null; project?: Relation })[];
  factions: (Row & { name?: string | null; project?: Relation })[];
  equipment: (Row & { name?: string | null; project?: Relation; faction?: Relation })[];
  archive: (Row & { title?: string | null; project?: Relation })[];
}): SearchEntry[] {
  const projects = new Map(lists.projects.filter(row => isPublic(row) && row.title).map(row => [row.id, row]));
  // Comics have a slug too, but findListing's comic rows here are selected without one: they only qualify chapters.
  const comics = new Map(lists.comics.filter(row => row.accessLevel === 'public' && !row.classification && !row.safeLabel && projects.has(idOf(row.project)))
    .map(row => [row.id, { ...row, projectRow: projects.get(idOf(row.project))! }]));
  const factions = new Map(lists.factions.filter(row => isPublic(row) && row.name && projects.has(idOf(row.project))).map(row => [row.id, row]));
  const entries: SearchEntry[] = [];
  for (const project of projects.values()) {
    entries.push({ kind: 'project', label: project.title!, hint: `project · ${project.projectCode ?? ''}`.trim(), href: `/projects/${project.slug}` });
  }
  for (const chapter of lists.chapters) {
    const comic = comics.get(idOf(chapter.comic));
    if (!isPublic(chapter) || !chapter.title || !comic) continue;
    const number = typeof chapter.chapterNumber === 'number' ? ` · ch ${String(chapter.chapterNumber).padStart(2, '0')}` : '';
    entries.push({ kind: 'chapter', label: `${comic.projectRow.title} / ${chapter.title}`, hint: `comic${number}`,
      href: `/comics/${comic.projectRow.slug}/${chapter.slug}` });
  }
  for (const character of lists.characters) {
    const project = projects.get(idOf(character.project));
    if (!isPublic(character) || !character.name || !project) continue;
    entries.push({ kind: 'character', label: character.name, hint: `character · ${project.title}`, href: `/projects/${project.slug}/characters/${character.slug}` });
  }
  for (const faction of factions.values()) {
    const project = projects.get(idOf(faction.project))!;
    entries.push({ kind: 'faction', label: faction.name!, hint: `faction · ${project.title}`, href: `/projects/${project.slug}/factions/${faction.slug}` });
  }
  for (const item of lists.equipment) {
    const project = projects.get(idOf(item.project));
    const faction = idOf(item.faction);
    if (!isPublic(item) || !item.name || !project || (faction >= 0 && !factions.has(faction))) continue;
    entries.push({ kind: 'equipment', label: item.name, hint: `equipment · ${item.name.replace(/\s+/g, '_')}.EQP`, href: `/projects/${project.slug}/equipment/${item.slug}` });
  }
  for (const item of lists.archive) {
    const project = idOf(item.project);
    if (!isPublic(item) || !item.title || (project >= 0 && !projects.has(project))) continue;
    entries.push({ kind: 'archive', label: item.title, hint: 'archive', href: `/archive#item-${item.slug}` });
  }
  return entries;
}
