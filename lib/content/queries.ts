import 'server-only';
import { cache } from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { Media } from '@/payload-types';
import type { ComicPage, Project } from './types';

const publicWhere = { listingVisibility: { equals: 'public' as const } };
const idOf = (value: number | { id: number } | null | undefined) => value == null ? -1 : typeof value === 'object' ? value.id : value;
function image(media?: number | Media | null, alt?: string | null, caption?: string | null): ComicPage | undefined {
  if (!media || typeof media !== 'object' || !media.url) return undefined;
  return { src: media.url, alt: alt || media.alt, caption: caption || media.caption || undefined,
    width: media.width || undefined, height: media.height || undefined };
}
function images(rows?: { media: number | Media; alt?: string | null; caption?: string | null }[] | null): ComicPage[] {
  return (rows ?? []).flatMap((row) => { const file = image(row.media, row.alt, row.caption); return file ? [file] : []; });
}

// One request-scoped read. No privileged user, access bypass, static fallback or
// cross-request cache. Publishing/unpublishing is reflected on the next request.
export const getProjects = cache(async (): Promise<Project[]> => {
  const cms = await getPayload({ config });
  const [projects, characters, comics, chapters, updates, tracker, galleries] = await Promise.all([
    cms.find({ collection: 'projects', overrideAccess: false, depth: 1, pagination: false, where: publicWhere, sort: 'id' }),
    cms.find({ collection: 'characters', overrideAccess: false, depth: 1, pagination: false, where: publicWhere }),
    cms.find({ collection: 'comics', overrideAccess: false, depth: 0, pagination: false, where: publicWhere }),
    cms.find({ collection: 'chapters', overrideAccess: false, depth: 1, pagination: false, where: publicWhere, sort: 'chapterNumber' }),
    cms.find({ collection: 'project-updates', overrideAccess: false, depth: 1, pagination: false, where: publicWhere, sort: '-date' }),
    cms.find({ collection: 'tracker-items', overrideAccess: false, depth: 0, pagination: false, where: publicWhere, sort: 'order' }),
    cms.find({ collection: 'galleries', overrideAccess: false, depth: 1, pagination: false, where: publicWhere }),
  ]);
  return projects.docs.map((project) => {
    const comicIDs = comics.docs.filter((comic) => idOf(comic.project) === project.id).map((comic) => comic.id);
    const projectChapters = chapters.docs.filter((chapter) => comicIDs.includes(idOf(chapter.comic)));
    const projectTracker = tracker.docs.filter((item) => idOf(item.project) === project.id);
    return {
      slug: project.slug, id: project.projectCode, title: project.title,
      category: project.categoryLabel || (project.categories ?? []).flatMap((c) => typeof c === 'object' ? [c.title] : []).join(' / '),
      status: project.status, art: project.placeholderArt || 'art-a', summary: project.summary || '',
      description: project.description || '', writing: project.writing,
      updated: (project.contentUpdated || project.updatedAt).slice(0, 10), hero: image(project.heroImage),
      galleries: (project.galleries ?? []).flatMap((value) => {
        const gallery = galleries.docs.find((g) => g.id === idOf(value));
        return gallery ? [{ slug: gallery.slug, title: gallery.title, description: gallery.description || '', images: images(gallery.images) }] : [];
      }),
      phases: projectTracker.filter((item) => item.kind === 'phase').map((item) => ({ label: item.title, percent: item.percentage ?? 0 })),
      milestones: projectTracker.filter((item) => item.kind === 'milestone').map((item) => ({ title: item.title, status: item.status || '' })),
      notes: updates.docs.filter((update) => idOf(update.project) === project.id).map((update) => ({
        date: update.date.slice(0, 10), text: update.description || update.title, title: update.title,
        writing: update.writing, images: images(update.images),
      })),
      characters: characters.docs.filter((character) => idOf(character.project) === project.id).map((character) => ({
        slug: character.slug, name: character.name, role: character.role || '', description: character.description || '',
        writing: character.writing, images: images(character.images),
        chapterSlugs: (character.relatedChapters ?? []).flatMap((value) => {
          const chapter = projectChapters.find((c) => c.id === idOf(value)); return chapter ? [chapter.slug] : [];
        }),
      })),
      chapters: projectChapters.map((chapter) => ({ slug: chapter.slug, title: chapter.title,
        description: chapter.description || '', pages: images(chapter.pages) })),
    };
  });
});
export const getProject = async (slug: string) => (await getProjects()).find((project) => project.slug === slug);

export const getArchiveItems = cache(async () => {
  const cms = await getPayload({ config });
  const result = await cms.find({ collection: 'archive-items', depth: 1, pagination: false, overrideAccess: false,
    where: publicWhere, sort: '-date' });
  return result.docs.map((item) => ({ title: item.title, slug: item.slug, description: item.description || '',
    category: typeof item.category === 'object' && item.category ? item.category.title : '',
    projectSlug: typeof item.project === 'object' && item.project ? item.project.slug : undefined,
    date: item.date?.slice(0, 10), files: images(item.files) }));
});
