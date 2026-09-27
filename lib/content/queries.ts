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
        writing: character.writing, images: images(character.images), updated: character.updatedAt.slice(0, 10),
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

// Faction routes fetch only their project and selected directory, never getProjects().
export const getProjectIdentity = cache(async (slug: string) => {
  const cms = await getPayload({ config });
  const result = await cms.find({ collection: 'projects', overrideAccess: false, depth: 0, limit: 1,
    where: { and: [publicWhere, { slug: { equals: slug } }] },
    select: { id: true, slug: true, title: true } });
  return result.docs[0];
});

export const getFactions = cache(async (project: number) => {
  const cms = await getPayload({ config });
  const result = await cms.find({ collection: 'factions', overrideAccess: false, depth: 0, pagination: false,
    where: { and: [publicWhere, { project: { equals: project } }] }, sort: ['order', 'name'],
    select: { name: true, slug: true, type: true, status: true, description: true, updatedAt: true } });
  return result.docs;
});

export const getFaction = cache(async (project: number, slug: string) => {
  const cms = await getPayload({ config });
  const result = await cms.find({ collection: 'factions', overrideAccess: false, depth: 1, limit: 1,
    where: { and: [publicWhere, { project: { equals: project } }, { slug: { equals: slug } }] } });
  const faction = result.docs[0];
  return faction ? { ...faction, emblemImage: image(faction.emblem) } : undefined;
});

export const getFactionContents = cache(async (project: number, faction: number) => {
  const cms = await getPayload({ config });
  const [characters, equipment] = await Promise.all([
    cms.find({ collection: 'characters', overrideAccess: false, depth: 1, pagination: false, sort: 'name',
      where: { and: [publicWhere, { project: { equals: project } },
        { or: [{ primaryFaction: { equals: faction } }, { affiliations: { contains: faction } }] }] },
      select: { slug: true, name: true, role: true, description: true, images: true, updatedAt: true } }),
    cms.find({ collection: 'equipment', overrideAccess: false, depth: 1, pagination: false, sort: ['order', 'name'],
      where: { and: [publicWhere, { project: { equals: project } }, { faction: { equals: faction } }] },
      select: { slug: true, name: true, category: true, description: true, images: true, updatedAt: true } }),
  ]);
  return {
    characters: characters.docs.map(character => ({ slug: character.slug, name: character.name,
      role: character.role || '', description: character.description || '', images: images(character.images),
      updated: character.updatedAt.slice(0, 10) })),
    equipment: equipment.docs.map(item => ({ slug: item.slug, name: item.name, category: item.category || '',
      description: item.description || '', images: images(item.images), updated: item.updatedAt.slice(0, 10) })),
  };
});

export const getEquipment = cache(async (project: number, slug: string) => {
  const cms = await getPayload({ config });
  const result = await cms.find({ collection: 'equipment', overrideAccess: false, depth: 1, limit: 1,
    where: { and: [publicWhere, { project: { equals: project } }, { slug: { equals: slug } }] } });
  const item = result.docs[0];
  return item ? { slug: item.slug, name: item.name, category: item.category || '', description: item.description || '',
    images: images(item.images), updated: item.updatedAt.slice(0, 10) } : undefined;
});

export const getHomepageData = cache(async () => {
  const cms = await getPayload({ config });
  const [projects, comics, chapters, updates, tracker, archive] = await Promise.all([
    cms.find({ collection: 'projects', overrideAccess: false, depth: 0, pagination: false, where: publicWhere, sort: 'id',
      select: { id: true, slug: true, projectCode: true, title: true, status: true, placeholderArt: true, contentUpdated: true, updatedAt: true } }),
    cms.find({ collection: 'comics', overrideAccess: false, depth: 0, pagination: false, where: publicWhere,
      select: { id: true, project: true } }),
    cms.find({ collection: 'chapters', overrideAccess: false, depth: 0, pagination: false, where: publicWhere, sort: 'chapterNumber',
      select: { slug: true, title: true, comic: true, pages: true } }),
    cms.find({ collection: 'project-updates', overrideAccess: false, depth: 0, pagination: false, where: publicWhere, sort: '-date',
      select: { project: true, date: true, title: true, description: true } }),
    cms.find({ collection: 'tracker-items', overrideAccess: false, depth: 0, pagination: false, where: publicWhere, sort: 'order',
      select: { project: true, kind: true, title: true, percentage: true } }),
    cms.find({ collection: 'archive-items', overrideAccess: false, depth: 1, pagination: false, where: publicWhere, sort: '-date',
      select: { title: true, slug: true, category: true, date: true } }),
  ]);
  const projectIDByComicID = new Map(comics.docs.map((comic) => [comic.id, idOf(comic.project)]));
  const chaptersByProjectID = new Map<number, typeof chapters.docs>();
  for (const chapter of chapters.docs) {
    const projectID = projectIDByComicID.get(idOf(chapter.comic));
    if (projectID === undefined || projectID < 0) continue;
    const projectChapters = chaptersByProjectID.get(projectID) ?? [];
    projectChapters.push(chapter);
    chaptersByProjectID.set(projectID, projectChapters);
  }
  const updatesByProjectID = new Map<number, typeof updates.docs>();
  for (const update of updates.docs) {
    const projectID = idOf(update.project);
    const projectUpdates = updatesByProjectID.get(projectID) ?? [];
    projectUpdates.push(update);
    updatesByProjectID.set(projectID, projectUpdates);
  }
  const trackerByProjectID = new Map<number, typeof tracker.docs>();
  for (const item of tracker.docs) {
    const projectID = idOf(item.project);
    const projectItems = trackerByProjectID.get(projectID) ?? [];
    projectItems.push(item);
    trackerByProjectID.set(projectID, projectItems);
  }
  return {
    projects: projects.docs.map((project) => ({
      slug: project.slug, id: project.projectCode, title: project.title,
      status: project.status, art: project.placeholderArt || 'art-a',
      updated: (project.contentUpdated || project.updatedAt).slice(0, 10),
      phases: (trackerByProjectID.get(project.id) ?? []).filter((item) => item.kind === 'phase')
        .map((item) => ({ label: item.title, percent: item.percentage ?? 0 })),
      notes: (updatesByProjectID.get(project.id) ?? []).map((update) => ({
        date: update.date.slice(0, 10), text: update.description || update.title,
      })),
      chapters: (chaptersByProjectID.get(project.id) ?? []).map((chapter) => ({
        slug: chapter.slug, title: chapter.title, pages: chapter.pages ?? [],
      })),
    })),
    archiveItems: archive.docs.map((item) => ({
      title: item.title, slug: item.slug,
      category: typeof item.category === 'object' && item.category ? item.category.title : '',
      date: item.date?.slice(0, 10),
    })),
  };
});

export const getArchiveItems = cache(async () => {
  const cms = await getPayload({ config });
  const result = await cms.find({ collection: 'archive-items', depth: 1, pagination: false, overrideAccess: false,
    where: publicWhere, sort: '-date' });
  return result.docs.map((item) => ({ title: item.title, slug: item.slug, description: item.description || '',
    category: typeof item.category === 'object' && item.category ? item.category.title : '',
    projectSlug: typeof item.project === 'object' && item.project ? item.project.slug : undefined,
    date: item.date?.slice(0, 10), files: images(item.files) }));
});
