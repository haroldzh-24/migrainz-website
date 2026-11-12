// Batch 23: the command palette's record index (lib/content/search.ts, served by /search-index) contains PUBLIC records
// only, for an anonymous visitor AND for a signed-in, verified patron who may read patron records. Runs the real
// getSearchIndex() (findListing, overrideAccess:false, Payload's access rules) on a fresh private SQLite fixture with an
// offline Patreon fixture (encrypted session cookie, mocked Patreon API; the same approach as verify-equipment.ts).
// The browser fixture server cannot sign in a patron (scripts/fixture-env.mjs refuses Patreon credentials), so this is
// where the patron case is tested; scripts/verify-command-palette.mjs checks the route, its headers and the UI.
//   node --import tsx --import ./scripts/stubs/register.mjs scripts/verify-search-index.ts
// Never loads .env files and never contacts Patreon, a database server or Blob storage.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';

await mkdir('test-results', { recursive: true });
const fixture = await mkdtemp(path.resolve('test-results/search-index-'));
Object.assign(process.env, { NODE_ENV: 'development', CMS_DATABASE: 'sqlite', DATABASE_URL: pathToFileURL(path.join(fixture, 'content.db')).href,
  CMS_MEDIA_DIR: path.join(fixture, 'media'), PAYLOAD_SECRET: randomBytes(32).toString('hex'),
  PATREON_CLIENT_ID: 'fixture', PATREON_CLIENT_SECRET: 'fixture', PATREON_REDIRECT_URI: 'https://fixture.invalid/auth/patreon/callback', PATREON_CAMPAIGN_ID: '1' });
for (const name of ['BLOB_READ_WRITE_TOKEN', 'VERCEL', 'PATREON_URL']) delete process.env[name];
await mkdir(process.env.CMS_MEDIA_DIR!);
console.log(`Isolated search index fixture: ${fixture}`);

const savedFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input instanceof Request ? input.url : input));
  assert.equal(url.hostname, 'www.patreon.com', `unexpected request to ${url.hostname}`);
  return Response.json({ data: { type: 'user', id: 'fixture', relationships: { memberships: { data: [{ type: 'member', id: 'm' }] } } },
    included: [{ type: 'member', id: 'm', attributes: { patron_status: 'active_patron', last_charge_status: 'Paid', currently_entitled_amount_cents: 500 },
      relationships: { campaign: { data: { type: 'campaign', id: '1' } }, currently_entitled_tiers: { data: [{ type: 'tier', id: '10' }] } } }] });
}) as typeof fetch;

const { getPayload } = await import('payload');
const { default: config } = await import('../payload.config');
const { seal, sessionCookie } = await import('../lib/patreon/server');
const { getSearchIndex } = await import('../lib/content/search');
const { searchEntries } = await import('../lib/content/search-entries');
const cms = await getPayload({ config });
const as = (headers: Record<string, string>) => { (globalThis as { __fixtureRequestHeaders?: Record<string, string> }).__fixtureRequestHeaders = headers; };
try {
  const pub = { _status: 'published' as const, accessLevel: 'public' as const, listingVisibility: 'public' as const };
  const patron = { ...pub, accessLevel: 'patron' as const };
  const redacted = { ...pub, accessLevel: 'redacted' as const };
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#256b38' } }).png().toBuffer();
  const media = await cms.create({ collection: 'media', data: { alt: 'Page', ...pub }, file: { data: png, name: 'page.png', mimetype: 'image/png', size: png.length } });
  const pages = [{ media: media.id }];

  const a = await cms.create({ collection: 'projects', data: { title: 'Search Alpha', slug: 'search-alpha', projectCode: 'SA-01', status: 'TEST', ...pub } });
  const p = await cms.create({ collection: 'projects', data: { title: 'SENTINEL-SI-PATRON-PROJECT', slug: 'sentinel-si-patron-project', projectCode: 'SNT-P', status: 'TEST', ...patron } });
  await cms.create({ collection: 'projects', data: { title: 'SENTINEL-SI-REDACTED-PROJECT', slug: 'sentinel-si-redacted-project', projectCode: 'SNT-R', status: 'TEST', listingSummary: 'SENTINEL-SI-SAFE-LABEL', ...redacted } });
  await cms.create({ collection: 'projects', data: { title: 'SENTINEL-SI-HIDDEN-LISTING', slug: 'sentinel-si-hidden-listing', projectCode: 'SNT-H', status: 'TEST', ...pub, listingVisibility: 'hidden' } });
  await cms.create({ collection: 'projects', data: { title: 'SENTINEL-SI-DRAFT', slug: 'sentinel-si-draft', projectCode: 'SNT-D', status: 'TEST', ...pub, _status: 'draft' } });

  const comic = await cms.create({ collection: 'comics', data: { title: 'Alpha Comic', slug: 'alpha-comic', project: a.id, ...pub } });
  const patronComic = await cms.create({ collection: 'comics', data: { title: 'SENTINEL-SI-PATRON-COMIC', slug: 'sentinel-si-patron-comic', project: a.id, ...patron } });
  await cms.create({ collection: 'chapters', data: { title: 'First Light', slug: 'first-light', comic: comic.id, chapterNumber: 1, pages, ...pub } });
  await cms.create({ collection: 'chapters', data: { title: 'SENTINEL-SI-PATRON-CHAPTER', slug: 'sentinel-si-patron-chapter', comic: comic.id, chapterNumber: 2, pages, ...patron } });
  await cms.create({ collection: 'chapters', data: { title: 'SENTINEL-SI-REDACTED-CHAPTER', slug: 'sentinel-si-redacted-chapter', comic: comic.id, chapterNumber: 3, pages, listingSummary: 'SENTINEL-SI-SAFE-CHAPTER', ...redacted } });
  await cms.create({ collection: 'chapters', data: { title: 'SENTINEL-SI-CHILD-OF-PATRON-COMIC', slug: 'sentinel-si-child-of-patron-comic', comic: patronComic.id, chapterNumber: 1, pages, ...pub } });

  await cms.create({ collection: 'characters', data: { name: 'Ada Search', slug: 'ada-search', project: a.id, ...pub } });
  await cms.create({ collection: 'characters', data: { name: 'SENTINEL-SI-PATRON-CHARACTER', slug: 'sentinel-si-patron-character', project: a.id, ...patron } });
  await cms.create({ collection: 'characters', data: { name: 'SENTINEL-SI-REDACTED-CHARACTER', slug: 'sentinel-si-redacted-character', project: a.id, ...redacted } });
  await cms.create({ collection: 'characters', data: { name: 'SENTINEL-SI-HIDDEN-CHARACTER', slug: 'sentinel-si-hidden-character', project: a.id, ...pub, accessLevel: 'hidden' } });
  await cms.create({ collection: 'characters', data: { name: 'SENTINEL-SI-CHILD-OF-PATRON-PROJECT', slug: 'sentinel-si-child-of-patron-project', project: p.id, ...pub } });

  const guild = await cms.create({ collection: 'factions', data: { name: 'Search Guild', slug: 'search-guild', project: a.id, type: 'Faction', ...pub } });
  const patronFaction = await cms.create({ collection: 'factions', data: { name: 'SENTINEL-SI-PATRON-FACTION', slug: 'sentinel-si-patron-faction', project: a.id, type: 'Faction', ...patron } });
  await cms.create({ collection: 'equipment', data: { name: 'Search Rifle Mk 2', slug: 'search-rifle', project: a.id, faction: guild.id, ...pub } });
  await cms.create({ collection: 'equipment', data: { name: 'SENTINEL-SI-PATRON-EQUIPMENT', slug: 'sentinel-si-patron-equipment', project: a.id, ...patron } });
  await cms.create({ collection: 'equipment', data: { name: 'SENTINEL-SI-UNDER-PATRON-FACTION', slug: 'sentinel-si-under-patron-faction', project: a.id, faction: patronFaction.id, ...pub } });

  await cms.create({ collection: 'archive-items', data: { title: 'Search Archive Note', slug: 'search-archive-note', ...pub } });
  await cms.create({ collection: 'archive-items', data: { title: 'SENTINEL-SI-PATRON-ARCHIVE', slug: 'sentinel-si-patron-archive', ...patron } });
  await cms.create({ collection: 'archive-items', data: { title: 'SENTINEL-SI-ARCHIVE-OF-PATRON-PROJECT', slug: 'sentinel-si-archive-of-patron-project', project: p.id, ...pub } });

  const expected = [
    { kind: 'project', label: 'Search Alpha', hint: 'project · SA-01', href: '/projects/search-alpha' },
    { kind: 'chapter', label: 'Search Alpha / First Light', hint: 'comic · ch 01', href: '/comics/search-alpha/first-light' },
    { kind: 'character', label: 'Ada Search', hint: 'character · Search Alpha', href: '/projects/search-alpha/characters/ada-search' },
    { kind: 'faction', label: 'Search Guild', hint: 'faction · Search Alpha', href: '/projects/search-alpha/factions/search-guild' },
    { kind: 'equipment', label: 'Search Rifle Mk 2', hint: 'equipment · Search_Rifle_Mk_2.EQP', href: '/projects/search-alpha/equipment/search-rifle' },
    { kind: 'archive', label: 'Search Archive Note', hint: 'archive', href: '/archive#item-search-archive-note' },
  ];
  const sorted = (list: { href: string }[]) => [...list].sort((x, y) => x.href.localeCompare(y.href));

  // Anonymous visitor.
  as({});
  const anonymous = await getSearchIndex();
  assert.deepEqual(sorted(anonymous), sorted(expected), `anonymous index: ${JSON.stringify(anonymous)}`);
  assert.ok(!JSON.stringify(anonymous).includes('SENTINEL'), 'no restricted title, slug or safe label for an anonymous visitor');
  console.log('PASS anonymous visitor: exactly the six public records; no patron, redacted, hidden, draft, safe-label or child-of-restricted entries');

  // Signed-in, verified patron (tier 10): the fixture really grants patron access (Payload returns the patron
  // character), and still the index holds public records only.
  const token = seal({ accessToken: 'fixture', userID: 'fixture', campaignID: '1', exp: Date.now() + 60000 }, 'session');
  const cookie = { cookie: `${sessionCookie}=${token}` };
  const granted = await cms.find({ collection: 'characters', req: { headers: new Headers(cookie) }, overrideAccess: false, depth: 0,
    where: { slug: { equals: 'sentinel-si-patron-character' } } });
  assert.equal(granted.totalDocs, 1, 'the patron fixture can read the patron character (the fixture is a real patron)');
  as(cookie);
  const { findListing } = await import('../lib/content/listings');
  const listed = await findListing(cms, { collection: 'characters', overrideAccess: false, pagination: false, select: { name: true, slug: true, accessLevel: true } });
  assert.ok(listed.docs.some(doc => doc.name === 'SENTINEL-SI-PATRON-CHARACTER'), 'the listing hands the patron its patron record in full, so the index filter is what keeps it out');
  const patronIndex = await getSearchIndex();
  assert.deepEqual(sorted(patronIndex), sorted(expected), `patron index: ${JSON.stringify(patronIndex)}`);
  assert.ok(!JSON.stringify(patronIndex).includes('SENTINEL'), 'no patron, redacted or classified entry for a signed-in patron');
  console.log('PASS signed-in patron: the same six public records; patron records the patron may read are left out');

  // The filter on its own: placeholders and malformed rows never pass.
  const filtered = searchEntries({
    projects: [{ id: 1, slug: 'ok', title: 'OK', projectCode: 'OK-1', accessLevel: 'public' },
      { id: 2, slug: 'classified:2', title: '', accessLevel: 'patron', classification: 'patron', safeLabel: 'x' },
      { id: 3, slug: 'sneaky', title: 'SENTINEL-UNIT', accessLevel: 'public', classification: 'redacted' },
      { id: 4, slug: 'classified:4', title: 'SENTINEL-UNIT-2', accessLevel: 'public' },
      { id: 5, slug: 'no-level', title: 'SENTINEL-UNIT-3' }],
    comics: [], chapters: [], factions: [], equipment: [],
    characters: [{ id: 9, slug: 'c', name: 'SENTINEL-UNIT-4', project: 2, accessLevel: 'public' }],
    archive: [{ id: 10, slug: 'z', title: 'SENTINEL-UNIT-5', accessLevel: 'public', safeLabel: 'label' }],
  });
  assert.deepEqual(filtered.map(entry => entry.label), ['OK'], 'only the public, unclassified row is kept');
  console.log('PASS filter: classified placeholders, classified:* slugs, rows without accessLevel, safe labels and children of dropped parents are dropped');
} finally {
  globalThis.fetch = savedFetch;
  await cms.destroy();
}
