import type { Access, CollectionSlug, PayloadRequest, Where } from 'payload';
import { APIError } from 'payload';

export const staff = ({ req }: { req: PayloadRequest }): boolean => Boolean(req.user?.collection === 'users');
export const publishedPublic: Where = {
  and: [{ _status: { equals: 'published' } }, { accessLevel: { equals: 'public' } }],
};

// Listing visibility deliberately does not grant content access. A future listing
// endpoint must explicitly project only approved metadata, never full documents.
export function publicContent(parent?: CollectionSlug, field = 'project', optional = false): Access {
  return async ({ req }) => {
    if (req.user?.collection === 'users') return true;
    if (!parent) return publishedPublic;
    const records = await req.payload.find({
      collection: parent, depth: 0, pagination: false, overrideAccess: false,
      req,
    });
    const relation: Where = { [field]: { in: records.docs.map((doc) => doc.id) } };
    return { and: [publishedPublic, optional ? { or: [relation, { [field]: { exists: false } }] } : relation] };
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
  for (const collection of ['projects', 'characters', 'comics', 'chapters', 'galleries', 'archive-items', 'project-updates'] as CollectionSlug[]) {
    const result = await req.payload.find({ collection, req, overrideAccess: false, depth: 0, pagination: false });
    for (const doc of result.docs) {
      const record = doc as unknown as Record<string, unknown>;
      add(record.heroImage); add(record.cover);
      for (const field of ['pages', 'images', 'files']) {
        const rows = record[field];
        if (Array.isArray(rows)) for (const row of rows) add(row.media);
      }
    }
  }
  return { and: [publishedPublic, { id: { in: [...ids] } }] };
}

export async function preventReferencedDelete(req: PayloadRequest, collection: CollectionSlug, id: number | string) {
  const references: Partial<Record<CollectionSlug, [CollectionSlug, string][]>> = {
    projects: [['characters', 'project'], ['comics', 'project'], ['project-updates', 'project'], ['tracker-items', 'project'], ['galleries', 'project'], ['archive-items', 'project']],
    comics: [['chapters', 'comic']],
    chapters: [['characters', 'relatedChapters']],
    media: [['projects', 'heroImage'], ['characters', 'images.media'], ['comics', 'cover'], ['chapters', 'pages.media'], ['galleries', 'images.media'], ['archive-items', 'files.media'], ['project-updates', 'images.media']],
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
