import type { Field, TextField, RelationshipField } from 'payload';

export const publishingFields: Field[] = [
  { name: 'listingVisibility', type: 'select', required: true, defaultValue: 'public',
    options: [{ label: 'VISIBLE listing', value: 'public' }, { label: 'HIDDEN listing', value: 'hidden' }],
    admin: { position: 'sidebar', description: 'HIDDEN omits this record from public output. VISIBLE respects the access state below; it never grants access to protected content.' } },
  { name: 'accessLevel', type: 'select', required: true, defaultValue: 'public',
    options: [{ label: 'PUBLIC — visible and accessible', value: 'public' }, { label: 'REDACTED — visible censor bars, no access', value: 'redacted' }, { label: 'PATRON — visible locked placeholder, no public access', value: 'patron' }, { label: 'HIDDEN — omitted entirely', value: 'hidden' }],
    admin: { position: 'sidebar', description: 'PUBLIC is accessible to everyone. PATRON requires verified active membership and any tier restriction below. REDACTED remains censored for everyone. HIDDEN is omitted. Hidden listings override access.' } },
  { name: 'patreonTierIDs', type: 'json', label: 'Allowed Patreon tier IDs',
    admin: { position: 'sidebar', condition: (_, siblingData) => siblingData?.accessLevel === 'patron', description: 'Optional JSON array of numeric tier ID strings copied from Patreon. At least one listed tier must match. Empty/null allows any active paid Studio Migrainz patron. Use IDs, not tier names.' },
    validate: (value: unknown) => value == null || (Array.isArray(value) && value.length <= 100 && value.every(id => typeof id === 'string' && /^\d+$/.test(id))) || 'Enter a JSON array of numeric Patreon tier ID strings, or leave empty.' },
  { name: 'listingSummary', type: 'textarea', label: 'Safe public placeholder label', admin: { description: 'Optional text explicitly approved for public display on REDACTED/PATRON placeholders. Never include restricted titles, writing or file URLs.' } },
  { name: 'legacyKey', type: 'text', unique: true, index: true, admin: { hidden: true } },
];
export const slugField: TextField = { name: 'slug', type: 'text', required: true, index: true,
  validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || 'Use lowercase letters, numbers and single hyphens.' };
export const projectRelation: RelationshipField = { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true };
export function factionRelation(name: string, hasMany = false): RelationshipField {
  return { name, type: 'relationship', relationTo: 'factions', hasMany, index: true,
    admin: { description: 'Optional. Select a project first; only its factions are available.' },
    filterOptions: ({ data }) => {
      const project = data?.project;
      return project ? { project: { equals: typeof project === 'object' ? project.id : project } } : false;
    },
  };
}
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
