import { ValidationError, type CollectionBeforeChangeHook } from 'payload';

export const validatePublishedMedia: CollectionBeforeChangeHook = async ({ data, originalDoc, collection, req }) => {
  const record = { ...originalDoc, ...data };
  if (record._status !== 'published') return data;
  const references: { id: number; path: string }[] = [];
  for (const field of ['heroImage', 'cover']) {
    const value = record[field];
    if (value) references.push({ id: typeof value === 'object' ? value.id : value, path: field });
  }
  for (const field of ['pages', 'images', 'files']) {
    for (const [index, row] of (record[field] ?? []).entries()) {
      if (row.media) references.push({ id: typeof row.media === 'object' ? row.media.id : row.media, path: `${field}.${index}.media` });
    }
  }
  for (const reference of references) {
    const file = await req.payload.findByID({ collection: 'media', id: reference.id, depth: 0, overrideAccess: true, req });
    if (file._status !== 'published' || (record.accessLevel === 'public' && file.accessLevel !== 'public')) {
      throw new ValidationError({ collection: collection.slug, errors: [{ path: reference.path,
        message: 'Publish this media first. PUBLIC content must use PUBLIC media.' }] });
    }
    if (collection.slug === 'chapters' && !file.mimeType?.startsWith('image/')) {
      throw new ValidationError({ collection: collection.slug, errors: [{ path: reference.path, message: 'Comic pages must be images.' }] });
    }
  }
  return data;
};
