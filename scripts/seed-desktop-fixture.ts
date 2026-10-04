import assert from 'node:assert/strict';
import path from 'node:path';
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
} finally {
  await cms.destroy();
}
