import type { CollectionConfig, CollectionSlug, Field } from 'payload';
import { editorialAccess, mediaRead, preventReferencedDelete, publicContent, staff } from '@/cms/access';
import { mediaRows, projectRelation, publishingFields, slugField, tags, writing } from '@/cms/fields';
import { validatePublishedMedia } from '@/cms/validate-content';

function content(slug: CollectionSlug, fields: Field[], parent?: CollectionSlug, relation = 'project', optional = false): CollectionConfig {
  return {
    slug, admin: { useAsTitle: slug === 'characters' ? 'name' : 'title', group: 'Studio content' },
    access: editorialAccess(publicContent(parent, relation, optional)),
    versions: { drafts: true, maxPerDoc: 25 },
    fields: [...fields, ...publishingFields],
    hooks: { beforeChange: [validatePublishedMedia], beforeDelete: [({ req, id }) => preventReferencedDelete(req, slug, id)] },
  };
}
const title: Field = { name: 'title', type: 'text', required: true };
const description: Field = { name: 'description', type: 'textarea' };

export const Users: CollectionConfig = {
  slug: 'users', auth: true, admin: { useAsTitle: 'email', group: 'Administration' },
  access: { admin: staff, create: staff, read: staff, update: staff, delete: staff, unlock: staff },
  fields: [{ name: 'name', type: 'text' }],
};

export const Projects = content('projects', [
  title, { ...slugField, unique: true },
  { name: 'projectCode', label: 'Project ID', type: 'text', required: true, unique: true },
  { name: 'yearsActive', type: 'text' }, { name: 'status', type: 'text', required: true, defaultValue: 'IN DEVELOPMENT' },
  { name: 'productionPhase', type: 'text' }, { name: 'summary', type: 'textarea' }, description, writing,
  { name: 'heroImage', type: 'upload', relationTo: 'media' },
  { name: 'galleries', type: 'relationship', relationTo: 'galleries', hasMany: true },
  { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true }, tags,
  { name: 'categoryLabel', type: 'text', admin: { description: 'Optional display label, preserved from the prototype.' } },
  { name: 'placeholderArt', type: 'select', options: ['art-a', 'art-b', 'art-c'], defaultValue: 'art-a' },
  { name: 'contentUpdated', type: 'date' },
]);
export const Comics = content('comics', [title, { ...slugField, unique: true }, projectRelation, description,
  { name: 'cover', type: 'upload', relationTo: 'media' }], 'projects');
export const Chapters = content('chapters', [
  title, slugField, { name: 'comic', type: 'relationship', relationTo: 'comics', required: true, index: true },
  { name: 'chapterNumber', type: 'number', required: true, min: 0 }, description,
  { name: 'batchPages', type: 'ui', admin: { components: { Field: { path: '/cms/admin/BatchMedia#BatchMedia', clientProps: { targetPath: 'pages' } } } } },
  mediaRows('pages', true),
  { name: 'routeKey', type: 'text', unique: true, admin: { hidden: true } },
], 'comics', 'comic');
Chapters.hooks!.beforeValidate = [async ({ data, req, originalDoc }) => {
  if (!data) return data;
  const comicValue = data.comic ?? originalDoc?.comic;
  const comicID = typeof comicValue === 'object' ? comicValue.id : comicValue;
  const slug = data.slug ?? originalDoc?.slug;
  if (comicID && slug) {
    const comic = await req.payload.findByID({ collection: 'comics', id: comicID, depth: 0, req });
    data.routeKey = `${typeof comic.project === 'object' ? comic.project.id : comic.project}/${slug}`;
  }
  return data;
}];
export const Characters = content('characters', [
  { name: 'name', type: 'text', required: true }, slugField, projectRelation,
  { name: 'role', type: 'text' }, description, writing, mediaRows('images'),
  { name: 'relatedChapters', type: 'relationship', relationTo: 'chapters', hasMany: true }, tags,
], 'projects');
Characters.indexes = [{ fields: ['project', 'slug'], unique: true }];
export const ProjectUpdates = content('project-updates', [title, projectRelation,
  { name: 'date', type: 'date', required: true }, writing, description, mediaRows('images'),
  { name: 'milestone', type: 'relationship', relationTo: 'tracker-items' }, { name: 'statusInfo', type: 'text' },
], 'projects');
export const TrackerItems = content('tracker-items', [title, projectRelation,
  { name: 'kind', type: 'select', options: ['phase', 'milestone'], required: true, defaultValue: 'phase' },
  { name: 'percentage', type: 'number', min: 0, max: 100 }, { name: 'order', type: 'number', defaultValue: 0, required: true },
  { name: 'status', type: 'text' }, { name: 'lastUpdated', type: 'date' },
], 'projects');
export const Galleries = content('galleries', [title, { ...slugField, unique: true },
  { ...projectRelation, required: false }, description,
  { name: 'batchImages', type: 'ui', admin: { components: { Field: { path: '/cms/admin/BatchMedia#BatchMedia', clientProps: { targetPath: 'images' } } } } },
  mediaRows('images'), tags], 'projects', 'project', true);
export const ArchiveItems = content('archive-items', [title, { ...slugField, unique: true },
  { ...projectRelation, required: false }, { name: 'category', type: 'relationship', relationTo: 'categories' },
  tags, description, { name: 'date', type: 'date' }, mediaRows('files')], 'projects', 'project', true);

export function mediaCollection(directory: string): CollectionConfig {
  return {
    ...content('media', [
      { name: 'alt', type: 'text', required: true }, { name: 'caption', type: 'text' },
      { name: 'uploadKey', type: 'text', unique: true, admin: { hidden: true } },
      { ...projectRelation, required: false },
    ]),
    admin: { useAsTitle: 'filename', group: 'Media library', description: 'Files become public only when published, PUBLIC, and attached to published public content.' },
    access: editorialAccess(mediaRead),
    upload: { staticDir: directory, mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'],
      imageSizes: [{ name: 'thumbnail', width: 320, height: 320, fit: 'inside', withoutEnlargement: true }],
    },
  };
}
export const taxonomies: CollectionConfig[] = (['tags', 'categories'] as const).map((slug) => ({
  slug, admin: { useAsTitle: 'title', group: 'Organization' },
  access: { read: () => true, create: staff, update: staff, delete: staff },
  fields: [title, { ...slugField, unique: true }, description],
  hooks: { beforeDelete: [({ req, id }) => preventReferencedDelete(req, slug, id)] },
}));
