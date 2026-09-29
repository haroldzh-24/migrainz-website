import 'server-only';
import { contentRequest } from '@/lib/patreon/viewer';
import type { DataFromCollectionSlug, Payload, TypedCollectionSelect, Where } from 'payload';
import type { Classified } from './types';

type Collection = 'projects' | 'factions' | 'characters' | 'equipment' | 'comics' | 'chapters' | 'project-updates' | 'tracker-items' | 'galleries' | 'archive-items';
type ListingDoc<C extends Collection> = DataFromCollectionSlug<C> & Classified & { listingOrder: number };
const visible: Where = { and: [{ _status: { equals: 'published' } }, { listingVisibility: { equals: 'public' } }] };

// Internal compatibility shape for existing public adapters. No source title,
// slug, text, dates, filenames or URLs are selected for a classified record.
function placeholder(meta: Record<string, unknown>): Record<string, unknown> {
  return {
    id: meta.id, classification: meta.accessLevel, safeLabel: meta.listingSummary || undefined,
    slug: `classified:${meta.id}`, title: '', name: '', projectCode: '',
    project: meta.project, comic: meta.comic, kind: meta.kind,
    status: '', type: '', role: '', description: '', summary: '',
    date: '', updatedAt: '', createdAt: '', images: [], pages: [], files: [],
    galleries: [], relatedChapters: [], categories: [],
  };
}

// The only privileged read here is a depth-zero, explicit metadata projection.
// It cannot be used as a public document/file endpoint. Parents must independently
// pass server-verified viewer access; inaccessible descendants stay out of lists.
export async function findListing<C extends Collection>(cms: Payload, options: {
  collection: C; where?: Where; sort?: string | string[]; depth?: number;
  overrideAccess?: false; pagination?: false; limit?: number; select?: TypedCollectionSelect[C];
}): Promise<{ docs: ListingDoc<C>[] }> {
  const { collection, where, sort, depth = 0 } = options;
  const req = await contentRequest();
  const parent = collection === 'chapters' ? 'comics' : collection === 'projects' ? undefined : 'projects';
  const scope: Where[] = [visible, { accessLevel: { in: ['public', 'redacted', 'patron'] } }];
  const parentSlugs = new Map<number, string>();
  if (where) scope.push(where);
  if (parent) {
    const parents = await cms.find({ req, collection: parent, overrideAccess: false, depth: 0, pagination: false, select: { slug: true } });
    for (const doc of parents.docs) parentSlugs.set(doc.id, doc.slug);
    const field = parent === 'comics' ? 'comic' : 'project';
    const relation: Where = { [field]: { in: parents.docs.map(doc => doc.id) } };
    scope.push(['galleries', 'archive-items'].includes(collection) ? { or: [relation, { [field]: { exists: false } }] } : relation);
  }
  if (collection === 'equipment') {
    const factions = await cms.find({ req, collection: 'factions', overrideAccess: false, depth: 0, pagination: false, select: { _status: true } });
    scope.push({ or: [{ faction: { exists: false } }, { faction: { in: factions.docs.map(doc => doc.id) } }] });
  }
  const select = {
    accessLevel: true, listingSummary: true,
    ...(parent === 'projects' ? { project: true } : {}),
    ...(parent === 'comics' ? { comic: true } : {}),
    ...(collection === 'tracker-items' ? { kind: true } : {}),
  } as TypedCollectionSelect[C];
  const metadata = await cms.find({ req, collection, overrideAccess: true, depth: 0, pagination: false,
    where: { and: scope }, sort, select });
  const publicIDs = metadata.docs.filter(doc => doc.accessLevel === 'public' || doc.accessLevel === 'patron').map(doc => doc.id);
  const publicDocs = publicIDs.length ? await cms.find({ req, collection, overrideAccess: false, depth,
    pagination: false, where: { id: { in: publicIDs } }, select: options.select }) : { docs: [] };
  const byID = new Map(publicDocs.docs.map(doc => [doc.id, doc]));

  // Depth-zero public rows retain relationship IDs even when Payload refuses to
  // populate restricted media. Only those authorized references can get teasers.
  if (depth > 0 && publicIDs.length) {
    const raw = await cms.find({ req, collection, overrideAccess: false, depth: 0, pagination: false, where: { id: { in: publicIDs } }, select: options.select });
    const referenced = new Set<number>();
    for (const value of raw.docs) {
      const doc = value as unknown as Record<string, unknown>;
      for (const field of ['heroImage', 'cover', 'emblem']) if (typeof doc[field] === 'number') referenced.add(doc[field]);
      for (const field of ['images', 'pages', 'files']) {
        for (const row of (doc[field] ?? []) as { media: number }[]) if (typeof row.media === 'number') referenced.add(row.media);
      }
    }
    const media = referenced.size ? await cms.find({ req, collection: 'media', overrideAccess: true, depth: 0, pagination: false,
      where: { and: [visible, { id: { in: [...referenced] } }, { accessLevel: { in: ['redacted', 'patron'] } }] },
      select: { accessLevel: true, listingSummary: true } }) : { docs: [] };
    const placeholders = new Map(media.docs.map(doc => [doc.id, placeholder(doc as unknown as Record<string, unknown>)]));
    for (const value of raw.docs) {
      const doc = byID.get(value.id) as unknown as Record<string, unknown> | undefined;
      if (!doc) continue;
      const source = value as unknown as Record<string, unknown>;
      for (const field of ['heroImage', 'cover', 'emblem']) {
        const teaser = placeholders.get(source[field] as number);
        const populated = doc[field] as { accessLevel?: string } | undefined;
        if (teaser && !['public', 'patron'].includes(populated?.accessLevel ?? '')) doc[field] = teaser;
      }
      for (const field of ['images', 'pages', 'files']) {
        if (!Array.isArray(source[field])) continue;
        const populated = (doc[field] ?? []) as { id?: string; media?: unknown }[];
        doc[field] = (source[field] as { id?: string; media: number }[]).map((row, index) => {
          const teaser = placeholders.get(row.media);
          const resolved = row.id ? populated.find(entry => entry.id === row.id) : populated[index];
          const access = (resolved?.media as { accessLevel?: string } | null)?.accessLevel;
          return teaser && !['public', 'patron'].includes(access ?? '') ? { media: teaser } : resolved ?? (field === 'pages' ? { media: null } : undefined);
        }).filter(Boolean);
      }
      // Public projects may reference classified galleries without exposing them.
      if (collection === 'projects') doc.galleries = source.galleries;
    }
  }
  return { docs: metadata.docs.flatMap((meta, listingOrder) => {
    const value = byID.get(meta.id) ?? (meta.accessLevel !== 'public' ? placeholder(meta as unknown as Record<string, unknown>) : undefined);
    if (value && 'classification' in value && parent === 'projects' && 'project' in value && typeof value.project === 'number') {
      value.project = { id: value.project, slug: parentSlugs.get(value.project) };
    }
    return value ? [{ ...value, listingOrder } as ListingDoc<C>] : [];
  }) };
}
