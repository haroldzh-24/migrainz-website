import { ValidationError, type CollectionBeforeChangeHook, type CollectionAfterReadHook } from 'payload';

const id = (value: unknown): number | string | undefined => {
  if (value && typeof value === 'object' && 'id' in value) return id(value.id);
  return typeof value === 'number' || typeof value === 'string' ? value : undefined;
};

// REST reads need the same isolation as page projections: even custom assignment
// notes and raw equipment IDs disappear when the related record is unreadable.
export const hideInaccessibleAssignments: CollectionAfterReadHook = async ({ doc, req, overrideAccess }) => {
  if (overrideAccess || req.user?.collection === 'users' || !doc.equipmentAssignments?.length) return doc;
  const ids = doc.equipmentAssignments.map((row: { equipment: unknown }) => id(row.equipment)).filter((value: unknown) => value != null);
  const equipment = await req.payload.find({ collection: 'equipment', req, overrideAccess: false, depth: 0, pagination: false,
    where: { and: [{ id: { in: ids } }, ...(id(doc.project) == null ? [] : [{ project: { equals: id(doc.project) } }])] }, select: { project: true } });
  const allowed = new Set(equipment.docs.map(item => item.id));
  doc.equipmentAssignments = doc.equipmentAssignments.filter((row: { equipment: unknown }) => allowed.has(id(row.equipment) as number));
  return doc;
};

// Validate both ends: changing Equipment.project must not invalidate existing assignments.
export const validateEquipmentRelations: CollectionBeforeChangeHook = async ({ data, originalDoc, collection, req }) => {
  const record = { ...originalDoc, ...data };
  const project = id(record.project);
  const fail = (path: string, message: string): never => {
    throw new ValidationError({ collection: collection.slug, errors: [{ path, message }] });
  };
  if (collection.slug === 'characters') {
    for (const [index, row] of (record.equipmentAssignments ?? []).entries()) {
      const equipmentID = id(row.equipment);
      if (equipmentID == null) continue; // Required field validation handles incomplete rows.
      const equipment = await req.payload.findByID({ collection: 'equipment', id: equipmentID, depth: 0, overrideAccess: true, req });
      if (id(equipment.project) !== project) fail(`equipmentAssignments.${index}.equipment`, 'Select equipment from the character’s project. Factions may differ.');
    }
  } else if (collection.slug === 'equipment' && originalDoc?.id != null && id(originalDoc.project) !== project) {
    for (const draft of [false, true]) {
      const characters = await req.payload.find({ collection: 'characters', req, overrideAccess: true, depth: 0, draft, pagination: false,
        where: { 'equipmentAssignments.equipment': { equals: originalDoc.id } } });
      if (characters.docs.some(character => id(character.project) !== project)) fail('project', 'Remove character assignments in the previous project before moving this equipment.');
    }
  }
  return data;
};

export const validateSchematicMedia: CollectionBeforeChangeHook = async ({ data, originalDoc, req, collection }) => {
  const record = { ...originalDoc, ...data };
  for (const field of ['schematicVideo', 'schematicPoster'] as const) {
    const mediaID = id(record[field]);
    if (mediaID == null) continue;
    const media = await req.payload.findByID({ collection: 'media', id: mediaID, overrideAccess: true, depth: 0, req });
    const valid = field === 'schematicVideo' ? media.mimeType === 'video/mp4' : ['image/webp', 'image/png', 'image/jpeg'].includes(media.mimeType ?? '');
    if (!valid) throw new ValidationError({ collection: collection.slug, errors: [{ path: field, message: field === 'schematicVideo' ? 'Select an MP4 video.' : 'Select a WebP, PNG or JPEG image.' }] });
  }
  return data;
};

export const validateVideoUpload: CollectionBeforeChangeHook = ({ data, originalDoc, collection }) => {
  // generateFileData has already sniffed and normalized these values. Nested
  // Local API calls can replace req.file, so validate the resulting file metadata.
  const record = { ...originalDoc, ...data };
  if (record.mimeType === 'video/mp4' && record.filesize > 3 * 1024 * 1024) {
    throw new ValidationError({ collection: collection.slug, errors: [{ path: 'file', message: 'Schematic MP4 videos must be 3 MiB or smaller. Export as H.264 MP4.' }] });
  }
  return data;
};
