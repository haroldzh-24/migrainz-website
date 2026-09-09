import type { Field, TextField, RelationshipField } from 'payload';

export const publishingFields: Field[] = [
  { name: 'listingVisibility', type: 'select', required: true, defaultValue: 'public',
    options: [{ label: 'PUBLIC listing (future locked previews)', value: 'public' }, { label: 'Hidden listing', value: 'hidden' }],
    admin: { position: 'sidebar', description: 'Metadata visibility only. Does not grant access to writing or files. Locked listings are not exposed in this foundation.' } },
  { name: 'accessLevel', type: 'select', required: true, defaultValue: 'public',
    options: [{ label: 'PUBLIC', value: 'public' }, { label: 'PATRON (staff only until membership is implemented)', value: 'patron' }],
    admin: { position: 'sidebar' } },
  { name: 'listingSummary', type: 'textarea', admin: { description: 'Optional safe teaser for future directory listings. Never put restricted writing here.' } },
  { name: 'legacyKey', type: 'text', unique: true, index: true, admin: { hidden: true } },
];
export const slugField: TextField = { name: 'slug', type: 'text', required: true, index: true,
  validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || 'Use lowercase letters, numbers and single hyphens.' };
export const projectRelation: RelationshipField = { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true };
export const writing: Field = { name: 'writing', type: 'richText' };
export const tags: Field = { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true };
export function mediaRows(name: string, required = false): Field {
  return { name, type: 'array', required, minRows: required ? 1 : 0,
    admin: { description: 'Add existing uploads or upload a file in each row. Row order is display order.' },
    fields: [
      { name: 'media', type: 'upload', relationTo: 'media', required: true },
      { name: 'caption', type: 'text' }, { name: 'alt', type: 'text', label: 'Alt text override (optional)' },
    ] };
}
