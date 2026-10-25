import assert from 'node:assert/strict';
import path from 'node:path';
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
  const satchel = await cms.create({ collection: 'equipment', data: { name: 'Fixture Satchel', slug: 'fixture-satchel', project: project.id, category: 'Carry', images: [{ media: media.id, caption: 'Synthetic satchel' }], ...pub } });
  await cms.create({ collection: 'characters', data: { name: 'Fixture Operative', slug: 'fixture-operative', project: project.id,
    equipmentAssignments: [{ equipment: scanner.id, designation: 'Unit 7', quantity: 1, notes: 'Synthetic assignment', order: 1 }, { equipment: satchel.id, order: 2 }], ...pub } });
  console.log('Review fixture equipment: /projects/blushland/equipment, /projects/blushland/equipment/fixture-scanner (schematic), /projects/blushland/equipment/fixture-satchel, /projects/blushland/characters/fixture-operative');
} finally {
  await cms.destroy();
}
