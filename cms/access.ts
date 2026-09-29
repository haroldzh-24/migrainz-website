import type { Access, CollectionSlug, PayloadRequest, Where } from 'payload';
import { APIError } from 'payload';
import { viewerAccessFromHeaders } from '@/lib/patreon/server';
import { entitledTo } from '@/lib/patreon/types';

export const staff = ({ req }: { req: PayloadRequest }): boolean => Boolean(req.user?.collection === 'users');
export const publishedPublic: Where = {
  and: [{ _status: { equals: 'published' } }, { accessLevel: { equals: 'public' } }, { listingVisibility: { equals: 'public' } }],
};

// Return IDs only for entitled patron records. Never trust a client-supplied role,
// request body or JWT claim as proof of membership; verify the Patreon session.
export async function readableContent(req: PayloadRequest, collection: CollectionSlug): Promise<Where> {
  // Attached media need not appear in listings. Publication, access/tier policy
  // and the accessible-parent reference below still authorize every file read.
  const publication: Where[] = [{ _status: { equals: 'published' } }];
  if (collection !== 'media') publication.push({ listingVisibility: { equals: 'public' } });
  const publicRule: Where = { and: [...publication, { accessLevel: { equals: 'public' } }] };
  const viewer = await viewerAccessFromHeaders(req.headers);
  if (!viewer.activePatron) return publicRule;
  const candidates = await req.payload.find({ collection, req, overrideAccess: true, depth: 0, pagination: false,
    where: { and: [...publication, { accessLevel: { equals: 'patron' } }] },
    select: { patreonTierIDs: true } });
  const ids = candidates.docs.filter(doc => entitledTo((doc as unknown as { patreonTierIDs?: unknown }).patreonTierIDs, viewer)).map(doc => doc.id);
  return { or: [publicRule, { and: [...publication, { accessLevel: { equals: 'patron' } }, { id: { in: ids } }] }] };
}

export function publicContent(parent?: CollectionSlug, field = 'project', optional = false, collection: CollectionSlug = 'projects'): Access {
  return async ({ req }) => {
    if (req.user?.collection === 'users') return true;
    const readable = await readableContent(req, collection);
    if (!parent) return readable;
    const records = await req.payload.find({
      collection: parent, depth: 0, pagination: false, overrideAccess: false,
      req,
    });
    const relation: Where = { [field]: { in: records.docs.map((doc) => doc.id) } };
    return { and: [readable, optional ? { or: [relation, { [field]: { exists: false } }] } : relation] };
  };
}

export const editorialAccess = (read: Access) => ({
  read, create: staff, update: staff, delete: staff, readVersions: staff,
});

// Media has its own access classification AND must be attached to published,
// accessible content. Hiding a chapter also hides files used only by that chapter.
const mediaRules = new WeakMap<PayloadRequest, Promise<Where>>();
export const mediaRead: Access = ({ req }) => {
  if (req.user?.collection === 'users') return true;
  // Many pages can reference media in one response. Share the rule only within
  // that request, never across requests or across publish/unpublish operations.
  let rule = mediaRules.get(req);
  if (!rule) { rule = buildMediaRule(req); mediaRules.set(req, rule); }
  return rule;
};
async function buildMediaRule(req: PayloadRequest): Promise<Where> {
  const ids = new Set<number | string>();
  const add = (value: unknown) => {
    if (typeof value === 'number' || typeof value === 'string') ids.add(value);
  };
  for (const collection of ['projects', 'factions', 'equipment', 'characters', 'comics', 'chapters', 'galleries', 'archive-items', 'project-updates'] as CollectionSlug[]) {
    const result = await req.payload.find({ collection, req, overrideAccess: false, depth: 0, pagination: false });
    for (const doc of result.docs) {
      const record = doc as unknown as Record<string, unknown>;
      add(record.heroImage); add(record.cover); add(record.emblem);
      for (const field of ['pages', 'images', 'files']) {
        const rows = record[field];
        if (Array.isArray(rows)) for (const row of rows) add(row.media);
      }
    }
  }
  return { and: [await readableContent(req, 'media'), { id: { in: [...ids] } }] };
}

export async function preventReferencedDelete(req: PayloadRequest, collection: CollectionSlug, id: number | string) {
  const references: Partial<Record<CollectionSlug, [CollectionSlug, string][]>> = {
    projects: [['factions', 'project'], ['equipment', 'project'], ['characters', 'project'], ['comics', 'project'], ['project-updates', 'project'], ['tracker-items', 'project'], ['galleries', 'project'], ['archive-items', 'project']],
    factions: [['characters', 'primaryFaction'], ['characters', 'affiliations'], ['equipment', 'faction']],
    comics: [['chapters', 'comic']],
    chapters: [['characters', 'relatedChapters']],
    media: [['factions', 'emblem'], ['equipment', 'images.media'], ['projects', 'heroImage'], ['characters', 'images.media'], ['comics', 'cover'], ['chapters', 'pages.media'], ['galleries', 'images.media'], ['archive-items', 'files.media'], ['project-updates', 'images.media']],
    galleries: [['projects', 'galleries']],
    tags: [['projects', 'tags'], ['characters', 'tags'], ['galleries', 'tags'], ['archive-items', 'tags']],
    categories: [['projects', 'categories'], ['archive-items', 'category']],
  };
  for (const [target, field] of references[collection] ?? []) {
    const result = await req.payload.find({ collection: target, req, overrideAccess: true, depth: 0,
      limit: 1, where: { [field]: { equals: id } } });
    if (result.totalDocs) throw new APIError(`Remove references in ${target} before deleting this ${collection} record.`, 409);
    if (req.payload.collections[target].config.versions) {
      const drafts = await req.payload.find({ collection: target, req, overrideAccess: true, depth: 0,
        draft: true, limit: 1, where: { [field]: { equals: id } } });
      if (drafts.totalDocs) throw new APIError(`Remove draft references in ${target} before deleting this ${collection} record.`, 409);
    }
  }
}
