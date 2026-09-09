import path from 'node:path';
import fs from 'node:fs';
import { getPayload, type CollectionSlug, type RequiredDataFromCollectionSlug } from 'payload';
import config from '../payload.config';
import { projects } from '../data/projects';

async function main() {
  if (!process.argv.includes('--apply')) {
    console.log('DRY RUN: no database or files changed.');
    console.log(JSON.stringify({ projects: projects.length, characters: projects.flatMap(p => p.characters).length,
      comics: projects.filter(p => p.chapters.length).length, chapters: projects.flatMap(p => p.chapters).length,
      media: projects.flatMap(p => p.chapters.flatMap(c => c.pages)).length,
      updates: projects.flatMap(p => p.notes).length, tracker: projects.flatMap(p => [...p.phases, ...p.milestones]).length }, null, 2));
    console.log('Use npm run cms:migrate -- --apply to import. Existing legacy keys are never overwritten.');
    return;
  }
  const cms = await getPayload({ config });
  const visibility = { _status: 'published', accessLevel: 'public', listingVisibility: 'public' };
  const stats = { created: 0, preserved: 0 };
  async function seed<T extends CollectionSlug>(collection: T, legacyKey: string, data: Record<string, unknown>, filePath?: string) {
    const existing = await cms.find({ collection, where: { legacyKey: { equals: legacyKey } }, depth: 0, limit: 1, overrideAccess: true });
    if (existing.docs[0]) { stats.preserved++; return existing.docs[0]; }
    const record = await cms.create({ collection, overrideAccess: true,
      data: { ...visibility, ...data, legacyKey } as RequiredDataFromCollectionSlug<T>, filePath });
    stats.created++;
    return record;
  }
  try {
    for (const project of projects) {
      const record = await seed('projects', `project:${project.slug}`, {
        title: project.title, slug: project.slug, projectCode: project.id, status: project.status,
        summary: project.summary, description: project.description, placeholderArt: project.art,
        categoryLabel: project.category, contentUpdated: `${project.updated}T00:00:00.000Z`,
      });
      const chapterIDs = new Map<string, number>();
      if (project.chapters.length) {
        const comic = await seed('comics', `comic:${project.slug}`, {
          title: project.title, slug: project.slug, project: record.id, description: project.description,
        });
        for (const [index, chapter] of project.chapters.entries()) {
          const pages = [];
          for (const page of chapter.pages) {
            const filePath = path.resolve('public', page.src.replace(/^\//, ''));
            if (!filePath.startsWith(path.resolve('public') + path.sep) || !fs.existsSync(filePath)) throw new Error(`Missing sample file: ${page.src}`);
            const media = await seed('media', `media:${page.src}`, { alt: page.alt, project: record.id }, filePath);
            pages.push({ media: media.id });
          }
          const result = await seed('chapters', `chapter:${project.slug}/${chapter.slug}`, {
            title: chapter.title, slug: chapter.slug, comic: comic.id, chapterNumber: index + 1,
            description: chapter.description, pages,
          });
          chapterIDs.set(chapter.slug, result.id);
        }
      }
      for (const character of project.characters) await seed('characters', `character:${project.slug}/${character.slug}`, {
        name: character.name, slug: character.slug, project: record.id, role: character.role,
        description: character.description, relatedChapters: character.chapterSlugs.map(slug => chapterIDs.get(slug)),
      });
      for (const [index, phase] of project.phases.entries()) await seed('tracker-items', `phase:${project.slug}/${index}`, {
        title: phase.label, project: record.id, kind: 'phase', percentage: phase.percent, order: index,
        lastUpdated: `${project.updated}T00:00:00.000Z`,
      });
      for (const [index, milestone] of project.milestones.entries()) await seed('tracker-items', `milestone:${project.slug}/${index}`, {
        title: milestone.title, project: record.id, kind: 'milestone', status: milestone.status, order: index,
      });
      for (const [index, note] of project.notes.entries()) await seed('project-updates', `update:${project.slug}/${index}`, {
        title: note.text, description: note.text, date: `${note.date}T00:00:00.000Z`, project: record.id,
      });
    }
    console.log('Legacy import complete:', stats);
  } finally { await cms.destroy(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
