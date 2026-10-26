import 'server-only';
import { cache } from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { ViewerAccess } from '@/lib/patreon/types';
import { findListing } from './listings';

/** One line of the boot checklist: `[ OK ] label … value` or `[ !! ] label … value`. */
export type BootLine = { status: 'ok' | 'warn'; label: string; value: string };

const publicWhere = { listingVisibility: { equals: 'public' as const } };
const fileName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 28) || 'file';
const relationID = (value: unknown) => typeof value === 'number' ? value : (value as { id?: number } | null)?.id;

// Per request only (React cache, no shared cache): findListing reads with this visitor's own access, so a shared
// cache could hand one visitor's patron titles to the next. Classified records print only their safe label.
// The layout calls this on every route, so it never throws: an error just leaves the data lines out.
export const getBootStatus = cache(async (): Promise<BootLine[]> => {
  try {
    const cms = await getPayload({ config });
    const [projects, tracker, comics, chapters] = await Promise.all([
      findListing(cms, { collection: 'projects', overrideAccess: false, pagination: false, where: publicWhere, select: { slug: true } }),
      findListing(cms, { collection: 'tracker-items', overrideAccess: false, pagination: false, limit: 3, sort: '-lastUpdated',
        where: { and: [publicWhere, { kind: { equals: 'phase' } }] }, select: { project: true, title: true, percentage: true } }),
      findListing(cms, { collection: 'comics', overrideAccess: false, pagination: false, where: publicWhere, select: { slug: true } }),
      findListing(cms, { collection: 'chapters', overrideAccess: false, pagination: false, limit: 1, sort: '-createdAt',
        where: publicWhere, select: { comic: true, chapterNumber: true, pages: true } }),
    ]);
    const projectSlug = new Map(projects.docs.filter(doc => !doc.classification).map(doc => [doc.id, doc.slug]));
    const comicSlug = new Map(comics.docs.filter(doc => !doc.classification).map(doc => [doc.id, doc.slug]));
    const lines: BootLine[] = tracker.docs.slice(0, 3).map(item => {
      if (item.classification) return { status: 'warn', label: fileName(item.safeLabel || 'classified_file'), value: 'CLASSIFIED' };
      const percent = Math.round(item.percentage ?? 0);
      const project = projectSlug.get(relationID(item.project) ?? -1);
      return { status: percent >= 100 ? 'ok' : 'warn', label: fileName(project ? `${project}_${item.title}` : item.title),
        value: percent >= 100 ? '100%' : `${percent}% rendered` };
    });
    const chapter = chapters.docs[0];
    if (chapter?.classification) lines.push({ status: 'warn', label: fileName(chapter.safeLabel || 'classified_chapter'), value: 'CLASSIFIED' });
    else if (chapter) {
      const comic = comicSlug.get(relationID(chapter.comic) ?? -1);
      if (comic) lines.push({ status: 'ok', label: `${fileName(comic)}_ch${String(chapter.chapterNumber).padStart(2, '0')}`, value: `${chapter.pages?.length ?? 0} pages` });
    }
    return lines;
  } catch {
    return [];
  }
});

/** Clearance as the checklist prints it. A failed Patreon check wins over everything else. */
export function bootClearance(viewer: ViewerAccess): BootLine {
  if (viewer.verification === 'unavailable') return { status: 'warn', label: 'clearance', value: 'DEGRADED' };
  if (viewer.activePatron) return { status: 'ok', label: 'clearance', value: 'PATRON' };
  if (viewer.signedIn) return { status: 'ok', label: 'clearance', value: 'VERIFIED' };
  return { status: 'ok', label: 'clearance', value: 'PUBLIC' };
}
