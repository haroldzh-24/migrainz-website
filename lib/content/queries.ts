import 'server-only';
import { cache } from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { Media, Equipment } from '@/payload-types';
import { contentRequest } from '@/lib/patreon/viewer';
import { findListing } from './listings';
import type { Classified, ComicPage, Project } from './types';

const classificationOf = (value: Classified): Classified => ({ classification: value.classification, safeLabel: value.safeLabel });
const publicWhere = { listingVisibility: { equals: 'public' as const } };
const idOf = (value: number | { id: number } | null | undefined) => value == null ? -1 : typeof value === 'object' ? value.id : value;
function image(media?: number | Media | null, alt?: string | null, caption?: string | null): ComicPage | undefined {
  if (!media || typeof media !== 'object') return undefined;
  const restricted = media as Media & Classified;
  if (restricted.classification) return { ...classificationOf(restricted), src: '', alt: '' };
  if (!['public', 'patron'].includes(media.accessLevel) || media._status !== 'published') return undefined;
  const isPDF = media.mimeType === 'application/pdf';
  if (!isPDF && !media.mimeType?.startsWith('image/')) return undefined;
  const pathname = (url: string) => {
    try { return decodeURIComponent(new URL(url, 'https://media.invalid').pathname); }
    catch { return undefined; }
  };
  const originalPath = media.url ? pathname(media.url) : undefined;
  const derivative = (value?: string | null): string | undefined => {
    const url = value?.trim();
    if (!url) return undefined;
    const filePath = pathname(url);
    // Legacy thumbnailURL can alias the original. Keep originals out of the
    // derivative positions; only authorized PUBLIC images get one at the end.
    if (!filePath || filePath === originalPath || (media.filename && filePath.split('/').pop() === media.filename)) return undefined;
    return url;
  };
  const thumbnail = derivative(media.sizes?.thumbnail?.url);
  const legacyThumbnail = derivative(media.thumbnailURL);
  const sources = [...new Set([
    derivative(media.sizes?.viewer?.url), derivative(media.sizes?.preview?.url),
    thumbnail, legacyThumbnail,
    // Populated media came through overrideAccess:false (including parent and
    // entitlement checks). Only published PUBLIC images may use this fallback.
    // Entitled PATRON images remain derivative-only; PDF downloads are unchanged.
    isPDF || (media.accessLevel === 'public' && media.mimeType?.startsWith('image/')) ? media.url?.trim() : undefined,
  ].filter((url): url is string => Boolean(url)))];
  const src = sources[0];
  if (!src) return undefined;
  return { src, viewerSrc: src, thumbnailSrc: thumbnail ?? legacyThumbnail ?? src, sources,
    alt: alt || media.alt, caption: caption || media.caption || undefined,
    width: media.width || undefined, height: media.height || undefined };
}
function images(rows?: { media: number | Media; alt?: string | null; caption?: string | null }[] | null): ComicPage[] {
  return (rows ?? []).flatMap((row) => { const file = image(row.media, row.alt, row.caption); return file ? [file] : []; });
}
function chapterPages(rows?: { media: number | Media; alt?: string | null; caption?: string | null }[] | null): ComicPage[] {
  // A failed population or missing derivative must not renumber saved pages.
  // Keep inaccessible metadata out of the generic unavailable placeholder.
  return (rows ?? []).map(row => image(row.media, row.alt, row.caption) ?? { src: '', alt: '' });
}

// Full records use server-verified viewer access. Locked entries use only the metadata
// projection in findListing; React cache is scoped to the current request.
export const getProjects = cache(async (): Promise<Project[]> => {
  const cms = await getPayload({ config });
  const [projects, characters, comics, chapters, updates, tracker, galleries] = await Promise.all([
    findListing(cms, { collection: 'projects', overrideAccess: false, depth: 1, pagination: false, where: publicWhere, sort: 'id' }),
    findListing(cms, { collection: 'characters', overrideAccess: false, depth: 1, pagination: false, where: publicWhere }),
    findListing(cms, { collection: 'comics', overrideAccess: false, depth: 0, pagination: false, where: publicWhere }),
    findListing(cms, { collection: 'chapters', overrideAccess: false, depth: 1, pagination: false, where: publicWhere, sort: 'chapterNumber' }),
    findListing(cms, { collection: 'project-updates', overrideAccess: false, depth: 1, pagination: false, where: publicWhere, sort: '-date' }),
    findListing(cms, { collection: 'tracker-items', overrideAccess: false, depth: 0, pagination: false, where: publicWhere, sort: 'order' }),
    findListing(cms, { collection: 'galleries', overrideAccess: false, depth: 1, pagination: false, where: publicWhere }),
  ]);
  return projects.docs.map((project) => {
    const projectComics = comics.docs.filter((comic) => idOf(comic.project) === project.id);
    const comicIDs = projectComics.map((comic) => comic.id);
    const projectChapters = chapters.docs.filter((chapter) => comicIDs.includes(idOf(chapter.comic)));
    const projectTracker = tracker.docs.filter((item) => idOf(item.project) === project.id);
    return {
      ...classificationOf(project), slug: project.slug, id: project.projectCode, title: project.title,
      category: project.categoryLabel || (project.categories ?? []).flatMap((c) => typeof c === 'object' ? [c.title] : []).join(' / '),
      status: project.status, art: project.placeholderArt || 'art-a', summary: project.summary || '',
      description: project.description || '', writing: project.writing,
      updated: (project.contentUpdated || project.updatedAt).slice(0, 10), hero: image(project.heroImage),
      galleries: (project.galleries ?? []).flatMap((value) => {
        const gallery = galleries.docs.find((g) => g.id === idOf(value));
        return gallery ? [{ ...classificationOf(gallery), slug: gallery.slug, title: gallery.title, description: gallery.description || '', images: images(gallery.images) }] : [];
      }),
      phases: projectTracker.filter((item) => item.kind === 'phase').map((item) => ({ ...classificationOf(item), label: item.title, percent: item.percentage ?? 0 })),
      milestones: projectTracker.filter((item) => item.kind === 'milestone').map((item) => ({ ...classificationOf(item), title: item.title, status: item.status || '' })),
      notes: updates.docs.filter((update) => idOf(update.project) === project.id).map((update) => ({
        ...classificationOf(update), listingOrder: update.listingOrder, date: update.date.slice(0, 10), text: update.description || update.title, title: update.title,
        writing: update.writing, images: images(update.images),
      })),
      characters: characters.docs.filter((character) => idOf(character.project) === project.id).map((character) => ({
        ...classificationOf(character), slug: character.slug, name: character.name, role: character.role || '', description: character.description || '',
        writing: character.writing, images: images(character.images), updated: character.updatedAt.slice(0, 10),
        chapterSlugs: (character.relatedChapters ?? []).flatMap((value) => {
          const chapter = projectChapters.find((c) => c.id === idOf(value)); return chapter ? [chapter.slug] : [];
        }),
      })),
      chapters: [...projectComics.filter(comic => comic.classification).map(comic => ({ ...classificationOf(comic), slug: `comic-${comic.id}`, title: '', description: '', pages: [] })), ...projectChapters.map((chapter) => {
        const comic = projectComics.find((entry) => entry.id === idOf(chapter.comic));
        return { ...classificationOf(chapter), slug: chapter.slug, title: chapter.title, chapterNumber: chapter.chapterNumber,
          comicTitle: comic?.title, description: chapter.description || '', pages: chapterPages(chapter.pages) };
      })],
    };
  });
});
export const getProject = async (slug: string) => (await getProjects()).find((project) => project.slug === slug && !project.classification);

// Faction routes fetch only their project and selected directory, never getProjects().
export const getProjectIdentity = cache(async (slug: string) => {
  const cms = await getPayload({ config });
  const result = await cms.find({ req: await contentRequest(), collection: 'projects', overrideAccess: false, depth: 0, limit: 1,
    where: { and: [publicWhere, { slug: { equals: slug } }] },
    select: { slug: true, title: true } });
  return result.docs[0];
});

export const getFactions = cache(async (project: number) => {
  const cms = await getPayload({ config });
  const result = await findListing(cms, { collection: 'factions', overrideAccess: false, depth: 1, pagination: false,
    where: { and: [publicWhere, { project: { equals: project } }] }, sort: ['order', 'name'],
    select: { name: true, slug: true, type: true, status: true, description: true, updatedAt: true, emblem: true } });
  return result.docs.map(({ emblem, ...faction }) => ({ ...faction, emblemImage: image(emblem) }));
});

export const getFaction = cache(async (project: number, slug: string) => {
  const cms = await getPayload({ config });
  const result = await findListing(cms, { collection: 'factions', overrideAccess: false, depth: 1, limit: 1,
    where: { and: [publicWhere, { project: { equals: project } }, { slug: { equals: slug } }] } });
  const faction = result.docs.find(doc => !doc.classification);
  return faction ? { ...faction, emblemImage: image(faction.emblem) } : undefined;
});

export const getFactionContents = cache(async (project: number, faction: number) => {
  const cms = await getPayload({ config });
  const [characters, equipment] = await Promise.all([
    findListing(cms, { collection: 'characters', overrideAccess: false, depth: 1, pagination: false, sort: 'name',
      where: { and: [publicWhere, { project: { equals: project } },
        { or: [{ primaryFaction: { equals: faction } }, { affiliations: { contains: faction } }] }] },
      select: { slug: true, name: true, role: true, description: true, images: true, updatedAt: true } }),
    findListing(cms, { collection: 'equipment', overrideAccess: false, depth: 1, pagination: false, sort: ['order', 'name'],
      where: { and: [publicWhere, { project: { equals: project } }, { faction: { equals: faction } }] },
      select: equipmentListingSelect }),
  ]);
  return {
    characters: characters.docs.map(character => ({ ...classificationOf(character), slug: character.slug, name: character.name,
      role: character.role || '', description: character.description || '', images: images(character.images),
      updated: character.updatedAt.slice(0, 10) })),
    equipment: equipment.docs.map(equipmentListing),
  };
});

export function equipmentSpecifications(item: Equipment) {
  const fields = [['manufacturer', 'MANUFACTURER'], ['model', 'MODEL / DESIGNATION'], ['equipmentType', 'TYPE'], ['caliber', 'CALIBER / CARTRIDGE'], ['capacity', 'CAPACITY'], ['period', 'YEAR / PERIOD']] as const;
  return [...fields.flatMap(([key, label]) => item[key]?.trim() ? [{ label, value: item[key]!.trim() }] : []),
    ...(item.technicalSpecifications ?? []).filter(row => row.label?.trim() && row.value?.trim()).map(row => ({ label: row.label, value: row.value }))];
}
// Card/viewer fallback for equipment without concept art; same authorization as the schematic poster.
function schematicPoster(item: Pick<Equipment, 'schematicEnabled' | 'schematicPoster'>) {
  const poster = item.schematicEnabled ? image(item.schematicPoster) : undefined;
  return poster && !poster.classification && poster.src ? poster : undefined;
}
// Fields every equipment card needs, including the poster fallback for items without concept art.
const equipmentListingSelect = { slug: true, name: true, category: true, description: true, images: true, schematicEnabled: true, schematicPoster: true, updatedAt: true } as const;
function equipmentListing(item: Pick<Equipment, 'slug' | 'name' | 'category' | 'description' | 'images' | 'schematicEnabled' | 'schematicPoster' | 'updatedAt'> & Classified) {
  return { ...classificationOf(item), slug: item.slug, name: item.name, category: item.category || '', description: item.description || '',
    images: images(item.images), poster: schematicPoster(item), updated: item.updatedAt.slice(0, 10) };
}
function equipmentSummary(item: Equipment) {
  return { slug: item.slug, name: item.name, category: item.category || item.equipmentType || '', description: item.description || '',
    specifications: equipmentSpecifications(item), images: images(item.images).filter(file => !file.classification),
    poster: schematicPoster(item), updated: item.updatedAt.slice(0, 10) };
}

export const getCharacterEquipment = cache(async (projectSlug: string, characterSlug: string) => {
  const project = await getProjectIdentity(projectSlug);
  if (!project) return [];
  const cms = await getPayload({ config });
  const req = await contentRequest();
  const characters = await cms.find({ collection: 'characters', req, overrideAccess: false, depth: 0, limit: 1,
    where: { and: [{ project: { equals: project.id } }, { slug: { equals: characterSlug } }] } });
  const rows = characters.docs[0]?.equipmentAssignments ?? [];
  if (!rows.length) return [];
  const equipment = await cms.find({ collection: 'equipment', req, overrideAccess: false, depth: 1, pagination: false,
    where: { and: [{ project: { equals: project.id } }, { id: { in: rows.map(row => idOf(row.equipment)) } }] } });
  const byID = new Map(equipment.docs.map(item => [item.id, item]));
  return rows.map((row, index) => ({ row, index })).sort((a, b) => (a.row.order ?? a.index) - (b.row.order ?? b.index) || a.index - b.index).flatMap(({ row }) => {
    const item = byID.get(idOf(row.equipment));
    return item ? [{ ...equipmentSummary(item), designation: row.designation || undefined, quantity: row.quantity ?? undefined, notes: row.notes || undefined }] : [];
  });
});

export const getEquipment = cache(async (project: number, slug: string) => {
  const cms = await getPayload({ config });
  const req = await contentRequest();
  const result = await cms.find({ req, collection: 'equipment', overrideAccess: false, depth: 1, limit: 1,
    where: { and: [publicWhere, { project: { equals: project } }, { slug: { equals: slug } }] } });
  const item = result.docs[0];
  if (!item) return undefined;
  const characters = await cms.find({ collection: 'characters', req, overrideAccess: false, depth: 0, pagination: false, sort: 'name',
    where: { and: [{ project: { equals: project } }, { 'equipmentAssignments.equipment': { equals: item.id } }] },
    select: { name: true, slug: true, role: true } });
  return { ...equipmentSummary(item), schematic: schematicOf(item),
    characters: characters.docs.map(character => ({ name: character.name, slug: character.slug, role: character.role || '' })) };
});

// The schematic video and poster of an equipment record fetched with overrideAccess:false: only a published public or
// patron mp4 plays, and only an authorized poster image is used.
function schematicOf(item: Equipment) {
  if (!item.schematicEnabled) return undefined;
  const video = item.schematicVideo;
  const authorizedVideo = video && typeof video === 'object' && video.mimeType === 'video/mp4' && video._status === 'published' && ['public', 'patron'].includes(video.accessLevel);
  const poster = image(item.schematicPoster);
  return { src: authorizedVideo && video.filename ? '/api/media/file/' + encodeURIComponent(video.filename) : undefined,
    poster: poster && !poster.classification ? poster.src : undefined,
    ratio: poster && !poster.classification && poster.width && poster.height ? poster.width / poster.height : undefined };
}

/** The most recently updated equipment record this visitor may see (public, or patron for entitled patrons) with a
 * schematic, for the homepage's turning thumbnail. */
export const getNewestSchematic = cache(async () => {
  const cms = await getPayload({ config });
  const req = await contentRequest();
  // A few candidates: the newest item may have no video or poster this visitor can load; then the next one is used.
  const result = await cms.find({ req, collection: 'equipment', overrideAccess: false, depth: 1, limit: 5, sort: '-updatedAt',
    where: { and: [publicWhere, { schematicEnabled: { equals: true } }] } });
  for (const item of result.docs) {
    const project = typeof item.project === 'object' && item.project ? item.project : undefined;
    const schematic = schematicOf(item);
    if (!project?.slug || !schematic || (!schematic.src && !schematic.poster)) continue;
    return { name: item.name, file: `${item.name.replace(/\s+/g, '_')}.EQP`, href: `/projects/${project.slug}/equipment/${item.slug}`,
      src: schematic.src, poster: schematic.poster };
  }
  return undefined;
});

export const getHomepageData = cache(async () => {
  const cms = await getPayload({ config });
  const [projects, comics, chapters, updates, tracker, archive] = await Promise.all([
    findListing(cms, { collection: 'projects', overrideAccess: false, depth: 0, pagination: false, where: publicWhere, sort: 'id',
      select: { slug: true, projectCode: true, title: true, status: true, placeholderArt: true, contentUpdated: true, updatedAt: true } }),
    findListing(cms, { collection: 'comics', overrideAccess: false, depth: 0, pagination: false, where: publicWhere,
      select: { project: true } }),
    findListing(cms, { collection: 'chapters', overrideAccess: false, depth: 1, pagination: false, where: publicWhere, sort: 'chapterNumber',
      select: { slug: true, title: true, comic: true, pages: true } }),
    findListing(cms, { collection: 'project-updates', overrideAccess: false, depth: 0, pagination: false, where: publicWhere, sort: '-date',
      select: { project: true, date: true, title: true, description: true } }),
    findListing(cms, { collection: 'tracker-items', overrideAccess: false, depth: 0, pagination: false, where: publicWhere, sort: 'order',
      select: { project: true, kind: true, title: true, percentage: true } }),
    findListing(cms, { collection: 'archive-items', overrideAccess: false, depth: 1, pagination: false, where: publicWhere, sort: '-date',
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
      ...classificationOf(project), slug: project.slug, id: project.projectCode, title: project.title,
      status: project.status, art: project.placeholderArt || 'art-a',
      updated: (project.contentUpdated || project.updatedAt).slice(0, 10),
      phases: (trackerByProjectID.get(project.id) ?? []).filter((item) => item.kind === 'phase')
        .map((item) => ({ ...classificationOf(item), label: item.title, percent: item.percentage ?? 0 })),
      notes: (updatesByProjectID.get(project.id) ?? []).map((update) => ({
        ...classificationOf(update), listingOrder: update.listingOrder, date: update.date.slice(0, 10), text: update.description || update.title,
      })),
      chapters: [...comics.docs.filter(comic => comic.classification && idOf(comic.project) === project.id).map(comic => ({ ...classificationOf(comic), slug: `comic-${comic.id}`, title: '', pages: [] })), ...(chaptersByProjectID.get(project.id) ?? []).map((chapter) => ({
        ...classificationOf(chapter), slug: chapter.slug, title: chapter.title, pages: chapterPages(chapter.pages),
      }))],
    })),
    archiveItems: archive.docs.map((item) => ({
      ...classificationOf(item), title: item.title, slug: item.slug,
      category: typeof item.category === 'object' && item.category ? item.category.title : '',
      date: item.date?.slice(0, 10),
    })),
  };
});

export const getArchiveItems = cache(async () => {
  const cms = await getPayload({ config });
  const result = await findListing(cms, { collection: 'archive-items', depth: 1, pagination: false, overrideAccess: false,
    where: publicWhere, sort: '-date' });
  return result.docs.map((item) => ({ ...classificationOf(item), title: item.title, slug: item.slug, description: item.description || '',
    category: typeof item.category === 'object' && item.category ? item.category.title : '',
    projectSlug: typeof item.project === 'object' && item.project ? item.project.slug : undefined,
    date: item.date?.slice(0, 10), files: images(item.files) }));
});

export const getEquipmentDirectory = cache(async (project: number) => {
  const cms = await getPayload({ config });
  const result = await findListing(cms, { collection: 'equipment', overrideAccess: false, depth: 1, pagination: false,
    where: { and: [publicWhere, { project: { equals: project } }] }, sort: ['order', 'name'], select: equipmentListingSelect });
  return result.docs.map(equipmentListing);
});
