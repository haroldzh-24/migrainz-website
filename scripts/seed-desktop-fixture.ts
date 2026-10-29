import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { pathToFileURL } from 'node:url';
import { getPayload } from 'payload';
import config from '../payload.config';

// Only the isolated regression runner supplies this directory. Never edit the
// studio database to make browser tests pass.
const fixture = path.resolve(process.env.DESKTOP_TEST_FIXTURE || '.');
assert.equal(path.dirname(fixture), path.resolve('test-results'));
assert.ok(path.basename(fixture).startsWith('regression-'));
assert.equal(process.env.DATABASE_URL, pathToFileURL(path.join(fixture, 'content.db')).href);
const cms = await getPayload({ config });
try {
  const project = (await cms.find({ collection: 'projects', depth: 0, where: { slug: { equals: 'blushland' } } })).docs[0];
  const media = (await cms.find({ collection: 'media', depth: 0, limit: 1 })).docs[0];
  assert.ok(project && media);
  const other = (await cms.find({ collection: 'projects', depth: 0, where: { slug: { equals: 'stalker' } } })).docs[0];
  assert.ok(other);
  for (const data of [
    { name: 'REGRESSION EMBLEM', slug: 'regression-emblem', project: project.id, emblem: media.id, order: 1 },
    { name: 'REGRESSION NO EMBLEM', slug: 'regression-no-emblem', project: project.id, order: 2 },
    { name: 'OTHER PROJECT FACTION', slug: 'other-project-faction', project: other.id, order: 1 },
  ]) await cms.create({ collection: 'factions', data: { ...data, type: 'Faction',
    _status: 'published', accessLevel: 'public', listingVisibility: 'public' } });
  const gallery = await cms.create({ collection: 'galleries', data: {
    title: 'REGRESSION ART', slug: 'regression-art', project: project.id,
    description: 'Isolated browser fixture', images: [{ media: media.id }],
    _status: 'published', accessLevel: 'public', listingVisibility: 'public',
  } });
  await cms.update({ collection: 'projects', id: project.id, data: { galleries: [gallery.id] } });

  // Synthetic equipment for the review server: one item with a schematic (poster plus a stub video that never plays,
  // so the page shows its poster fallback), one plain item, one character issued both. Nothing here is real content.
  const pub = { _status: 'published' as const, accessLevel: 'public' as const, listingVisibility: 'public' as const };
  const lines = Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${60 + i * 60}" x2="1200" y2="${60 + i * 60}" stroke="#2f5b3c" stroke-width="1"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="1200" height="600" fill="#0a0e0b"/>${lines}<rect x="380" y="200" width="440" height="200" fill="none" stroke="#a8d8b0" stroke-width="3"/><circle cx="600" cy="300" r="70" fill="none" stroke="#a8d8b0" stroke-width="3"/><line x1="380" y1="300" x2="820" y2="300" stroke="#a8d8b0" stroke-width="2"/></svg>`;
  const posterPng = await sharp(Buffer.from(svg)).png().toBuffer();
  const poster = await cms.create({ collection: 'media', data: { alt: 'Synthetic schematic poster', ...pub }, file: { data: posterPng, name: 'fixture-schematic-poster.png', mimetype: 'image/png', size: posterPng.length } });
  const stubMp4 = Buffer.from('000000206674797069736f6d0000020069736f6d69736f32617663316d703431000000086d646174', 'hex');
  const video = await cms.create({ collection: 'media', data: { alt: 'Synthetic schematic video (stub)', ...pub }, file: { data: stubMp4, name: 'fixture-schematic.mp4', mimetype: 'video/mp4', size: stubMp4.length } });
  const scanner = await cms.create({ collection: 'equipment', data: { name: 'Fixture Scanner', slug: 'fixture-scanner', project: project.id, category: 'Sensor', manufacturer: 'Studio Fixture',
    capacity: '2 cells', technicalSpecifications: [{ label: 'Mass', value: '1 kg' }, { label: 'Range', value: '40 m' }], schematicEnabled: true, schematicVideo: video.id, schematicPoster: poster.id,
    images: [{ media: poster.id, caption: 'Synthetic concept one' }, { media: media.id, caption: 'Synthetic concept two' }], ...pub } });
  // Two items whose schematics really play (tiny VP9-in-MP4 test clips, scripts/fixtures/): the equipment directory's
  // cards must turn in step on the shared 12 s clock (scripts/verify-equipment-directory.mjs). 6 s and 9 s on purpose.
  for (const [name, slug, seconds] of [['Fixture Beacon', 'fixture-beacon', 6], ['Fixture Lamp', 'fixture-lamp', 9]] as const) {
    const clip = await readFile(path.resolve(`scripts/fixtures/schematic-${seconds}s.mp4`));
    const clipMedia = await cms.create({ collection: 'media', data: { alt: `Synthetic ${seconds} s schematic clip`, ...pub }, file: { data: clip, name: `fixture-${slug}.mp4`, mimetype: 'video/mp4', size: clip.length } });
    await cms.create({ collection: 'equipment', data: { name, slug, project: project.id, category: 'Signal', schematicEnabled: true, schematicVideo: clipMedia.id, schematicPoster: poster.id, ...pub } });
  }
  // A schematic video with no poster but with concept art (8c): its card shows the art until the clip's first frame plays.
  {
    const clip = await readFile(path.resolve('scripts/fixtures/schematic-6s.mp4'));
    const clipMedia = await cms.create({ collection: 'media', data: { alt: 'Synthetic 6 s schematic clip (no poster)', ...pub }, file: { data: clip, name: 'fixture-fixture-relay.mp4', mimetype: 'video/mp4', size: clip.length } });
    await cms.create({ collection: 'equipment', data: { name: 'Fixture Relay', slug: 'fixture-relay', project: project.id, category: 'Signal', schematicEnabled: true, schematicVideo: clipMedia.id,
      images: [{ media: poster.id, caption: 'Synthetic relay concept' }], ...pub } });
  }
  const satchel = await cms.create({ collection: 'equipment', data: { name: 'Fixture Satchel', slug: 'fixture-satchel', project: project.id, category: 'Carry', images: [{ media: media.id, caption: 'Synthetic satchel' }], ...pub } });
  await cms.create({ collection: 'characters', data: { name: 'Fixture Operative', slug: 'fixture-operative', project: project.id,
    equipmentAssignments: [{ equipment: scanner.id, designation: 'Unit 7', quantity: 1, notes: 'Synthetic assignment', order: 1 }, { equipment: satchel.id, order: 2 }], ...pub } });
  // Access-control fixtures for route windows (scripts/verify-site-health.mjs): a PATRON character answers 200 with the
  // locked page and none of its protected text; REDACTED character, equipment and faction answer 404 like missing
  // records. Their SENTINEL-* text must never reach any page or response.
  await cms.create({ collection: 'characters', data: { name: 'SENTINEL-PATRON-NAME-7Q', slug: 'patron-dossier', project: project.id,
    role: 'SENTINEL-PATRON-ROLE-7Q', description: 'SENTINEL-PATRON-DESC-7Q', listingSummary: 'sealed patron dossier',
    _status: 'published', accessLevel: 'patron', listingVisibility: 'public' } });
  const sealed = { _status: 'published' as const, accessLevel: 'redacted' as const, listingVisibility: 'public' as const };
  await cms.create({ collection: 'characters', data: { name: 'SENTINEL-REDACTED-CHARACTER-7Q', slug: 'redacted-dossier', project: project.id, description: 'SENTINEL-REDACTED-DESC-7Q', ...sealed } });
  await cms.create({ collection: 'equipment', data: { name: 'SENTINEL-REDACTED-EQUIPMENT-7Q', slug: 'redacted-equipment', project: project.id, category: 'Sealed', ...sealed } });
  await cms.create({ collection: 'factions', data: { name: 'SENTINEL-REDACTED-FACTION-7Q', slug: 'redacted-faction', project: project.id, type: 'Faction', order: 9, ...sealed } });
  // Classified sentinels for scripts/verify-interaction-polish.mjs: the newest tracker phase and the newest chapter are
  // REDACTED, so the boot checklist must print their safe labels and never these titles or slugs.
  const comic = (await cms.find({ collection: 'comics', depth: 0, where: { project: { equals: project.id } } })).docs[0];
  assert.ok(comic);
  const redacted = { _status: 'published' as const, accessLevel: 'redacted' as const, listingVisibility: 'public' as const };
  await cms.create({ collection: 'tracker-items', data: { title: 'SENTINEL-PHASE-TITLE-7Q', project: project.id, kind: 'phase', percentage: 40, order: 99,
    lastUpdated: '2099-01-01T00:00:00.000Z', listingSummary: 'sealed phase', ...redacted } });
  await cms.create({ collection: 'chapters', data: { title: 'SENTINEL-CHAPTER-TITLE-7Q', slug: 'sentinel-chapter-7q', comic: comic.id, chapterNumber: 99,
    pages: [{ media: media.id }], listingSummary: 'sealed chapter', ...redacted } });
  console.log('Review fixture equipment: /projects/blushland/equipment, /projects/blushland/equipment/fixture-scanner (schematic), /projects/blushland/equipment/fixture-satchel, /projects/blushland/characters/fixture-operative');
} finally {
  await cms.destroy();
}
