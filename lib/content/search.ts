import 'server-only';
import { getPayload } from 'payload';
import config from '@payload-config';
import { findListing } from './listings';
import { searchEntries, type SearchEntry } from './search-entries';

export type { SearchEntry } from './search-entries';

const publicWhere = { listingVisibility: { equals: 'public' as const } };

/**
 * The command palette's records (design canvas board 7; batch 23): PUBLIC records only. Every list goes through
 * findListing with overrideAccess:false and a lean select (names, slugs, codes and relations; no text, media or dates).
 * `accessLevel` is selected so searchEntries() can keep only `public` rows: patron records a signed-in patron may read
 * are left out too, as are classified placeholders (`classified:*` slugs, safe labels). Children of a parent that is
 * not public (a chapter of a patron comic, equipment of a patron faction) are left out as well.
 * Only /search-index calls this, when the palette is opened for the first time on a page.
 */
export async function getSearchIndex(): Promise<SearchEntry[]> {
  const cms = await getPayload({ config });
  const [projects, comics, chapters, characters, factions, equipment, archive] = await Promise.all([
    findListing(cms, { collection: 'projects', overrideAccess: false, pagination: false, where: publicWhere, sort: 'id',
      select: { slug: true, title: true, projectCode: true, accessLevel: true } }),
    findListing(cms, { collection: 'comics', overrideAccess: false, pagination: false, where: publicWhere,
      select: { title: true, project: true, accessLevel: true } }),
    findListing(cms, { collection: 'chapters', overrideAccess: false, pagination: false, where: publicWhere, sort: 'chapterNumber',
      select: { slug: true, title: true, chapterNumber: true, comic: true, accessLevel: true } }),
    findListing(cms, { collection: 'characters', overrideAccess: false, pagination: false, where: publicWhere, sort: 'name',
      select: { slug: true, name: true, project: true, accessLevel: true } }),
    findListing(cms, { collection: 'factions', overrideAccess: false, pagination: false, where: publicWhere, sort: ['order', 'name'],
      select: { slug: true, name: true, project: true, accessLevel: true } }),
    findListing(cms, { collection: 'equipment', overrideAccess: false, pagination: false, where: publicWhere, sort: ['order', 'name'],
      select: { slug: true, name: true, project: true, faction: true, accessLevel: true } }),
    findListing(cms, { collection: 'archive-items', overrideAccess: false, pagination: false, where: publicWhere, sort: '-date',
      select: { slug: true, title: true, project: true, accessLevel: true } }),
  ]);
  return searchEntries({
    projects: projects.docs, comics: comics.docs, chapters: chapters.docs, characters: characters.docs,
    factions: factions.docs, equipment: equipment.docs, archive: archive.docs,
  });
}
