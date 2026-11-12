// Batch 24: lore links (design canvas board 8). The records that may be linked in lore text (getLoreIndex in
// lib/content/queries.ts, filtered by loreEntries in lib/content/lore.ts) are PUBLIC only, for an anonymous visitor AND
// for a signed-in, verified patron who may read patron records; a redacted record whose name contains a public name
// is never linked or previewed (the public part may link to the public record); and the linker keeps the matching and
// rich-text rules (whole word, case-sensitive, longest first, first mention per paragraph, not the page's own record,
// never inside a link, heading or code, formatting kept). Runs the real getLoreIndex() (findListing, overrideAccess:false,
// Payload's access rules) on a fresh private SQLite fixture with an offline Patreon fixture (as verify-search-index.ts).
//   node --import tsx --import ./scripts/stubs/register.mjs scripts/verify-lore-index.ts
// Never loads .env files and never contacts Patreon, a database server or Blob storage.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';

await mkdir('test-results', { recursive: true });
const fixture = await mkdtemp(path.resolve('test-results/lore-index-'));
Object.assign(process.env, { NODE_ENV: 'development', CMS_DATABASE: 'sqlite', DATABASE_URL: pathToFileURL(path.join(fixture, 'content.db')).href,
  CMS_MEDIA_DIR: path.join(fixture, 'media'), PAYLOAD_SECRET: randomBytes(32).toString('hex'),
  PATREON_CLIENT_ID: 'fixture', PATREON_CLIENT_SECRET: 'fixture', PATREON_REDIRECT_URI: 'https://fixture.invalid/auth/patreon/callback', PATREON_CAMPAIGN_ID: '1' });
for (const name of ['BLOB_READ_WRITE_TOKEN', 'VERCEL', 'PATREON_URL']) delete process.env[name];
await mkdir(process.env.CMS_MEDIA_DIR!);
console.log(`Isolated lore index fixture: ${fixture}`);

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
const { getLoreIndex } = await import('../lib/content/queries');
const { createLoreLinker, loreEntries } = await import('../lib/content/lore');
const cms = await getPayload({ config });
const as = (headers: Record<string, string>) => { (globalThis as { __fixtureRequestHeaders?: Record<string, string> }).__fixtureRequestHeaders = headers; };
type Entry = Awaited<ReturnType<typeof getLoreIndex>>[number];
const byKey = (list: Entry[]) => [...list].sort((a, b) => a.key.localeCompare(b.key));
try {
  const pub = { _status: 'published' as const, accessLevel: 'public' as const, listingVisibility: 'public' as const };
  const patron = { ...pub, accessLevel: 'patron' as const };
  const redacted = { ...pub, accessLevel: 'redacted' as const };
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#256b38' } }).png().toBuffer();
  const media = (name: string, level: typeof pub | typeof patron = pub) => cms.create({ collection: 'media', data: { alt: name, ...level }, file: { data: png, name: `${name}.png`, mimetype: 'image/png', size: png.length } });
  const portrait = await media('portrait');
  const patronPortrait = await media('sentinel-lore-patron-portrait', patron);
  const poster = await media('poster');
  const patronPoster = await media('sentinel-lore-patron-poster', patron);

  const a = await cms.create({ collection: 'projects', data: { title: 'Lore Alpha', slug: 'lore-alpha', projectCode: 'LA-01', status: 'TEST', ...pub } });
  const p = await cms.create({ collection: 'projects', data: { title: 'SENTINEL-LORE-PATRON-PROJECT', slug: 'sentinel-lore-patron-project', projectCode: 'SLP', status: 'TEST', ...patron } });
  const guild = await cms.create({ collection: 'factions', data: { name: 'Lore Guild', slug: 'lore-guild', project: a.id, type: 'Faction', description: 'A guild of record keepers. Second sentence.', ...pub } });
  const patronFaction = await cms.create({ collection: 'factions', data: { name: 'SENTINEL-LORE-PATRON-FACTION', slug: 'sentinel-lore-patron-faction', project: a.id, type: 'Faction', ...patron } });
  await cms.create({ collection: 'characters', data: { name: 'Ada Vale', slug: 'ada-vale', project: a.id, primaryFaction: guild.id, description: 'Keeps the ledger.',
    images: [{ media: portrait.id }], ...pub } });
  await cms.create({ collection: 'characters', data: { name: 'Bo Reed', slug: 'bo-reed', project: a.id, affiliations: [guild.id], images: [{ media: patronPortrait.id }], ...pub } });
  await cms.create({ collection: 'characters', data: { name: 'Cy Moss', slug: 'cy-moss', project: a.id, primaryFaction: patronFaction.id, ...pub } });
  await cms.create({ collection: 'characters', data: { name: 'SENTINEL-LORE-PATRON-CHARACTER', slug: 'sentinel-lore-patron-character', project: a.id, primaryFaction: guild.id, ...patron } });
  // A redacted record whose name contains a public name ("Ada Vale").
  await cms.create({ collection: 'characters', data: { name: 'Ada Vale SENTINEL-LORE-REDACTED', slug: 'sentinel-lore-redacted', project: a.id, listingSummary: 'SENTINEL-LORE-SAFE-LABEL', ...redacted } });
  await cms.create({ collection: 'characters', data: { name: 'SENTINEL-LORE-HIDDEN', slug: 'sentinel-lore-hidden', project: a.id, ...pub, listingVisibility: 'hidden' } });
  await cms.create({ collection: 'characters', data: { name: 'SENTINEL-LORE-OTHER-PROJECT', slug: 'sentinel-lore-other-project', project: p.id, ...pub } });
  await cms.create({ collection: 'equipment', data: { name: 'Lore Rifle', slug: 'lore-rifle', project: a.id, faction: guild.id, description: 'A long rifle.',
    schematicEnabled: true, schematicPoster: poster.id, ...pub } });
  await cms.create({ collection: 'equipment', data: { name: 'Lore Lamp', slug: 'lore-lamp', project: a.id, schematicEnabled: true, schematicPoster: patronPoster.id, ...pub } });
  await cms.create({ collection: 'equipment', data: { name: 'SENTINEL-LORE-UNDER-PATRON-FACTION', slug: 'sentinel-lore-under-patron-faction', project: a.id, faction: patronFaction.id, ...pub } });
  await cms.create({ collection: 'equipment', data: { name: 'SENTINEL-LORE-PATRON-EQUIPMENT', slug: 'sentinel-lore-patron-equipment', project: a.id, ...patron } });

  const base = '/projects/lore-alpha';
  const check = (index: Entry[], who: string) => {
    assert.ok(!JSON.stringify(index).includes('SENTINEL') && !JSON.stringify(index).toLowerCase().includes('sentinel-lore'), `${who}: no restricted name, slug, safe label or media: ${JSON.stringify(index)}`);
    assert.deepEqual(byKey(index).map(entry => entry.key), ['character:ada-vale', 'character:bo-reed', 'character:cy-moss', 'equipment:lore-lamp', 'equipment:lore-rifle', 'faction:lore-guild'], `${who}: exactly the public records`);
    const get = (key: string) => index.find(entry => entry.key === key)!;
    assert.equal(get('character:ada-vale').href, `${base}/characters/ada-vale`);
    assert.equal(get('character:ada-vale').faction, 'Lore Guild');
    assert.equal(get('character:ada-vale').summary, 'Keeps the ledger.');
    assert.match(get('character:ada-vale').portrait ?? '', /^\/api\/media\/file\//, `${who}: a public portrait through the media route`);
    assert.equal(get('character:bo-reed').portrait, undefined, `${who}: no portrait from a patron image`);
    assert.equal(get('character:cy-moss').faction, undefined, `${who}: a patron faction is never named`);
    assert.equal(get('faction:lore-guild').members, 2, `${who}: members = public characters (primary or affiliation)`);
    assert.equal(get('faction:lore-guild').summary, 'A guild of record keepers.');
    assert.equal(get('equipment:lore-rifle').file, 'Lore_Rifle.EQP');
    assert.match(get('equipment:lore-rifle').poster ?? '', /^\/api\/media\/file\//, `${who}: a public poster through schematicPoster()`);
    assert.equal(get('equipment:lore-lamp').poster, undefined, `${who}: no poster from a patron image`);
  };

  as({});
  const anonymous = await getLoreIndex(a.id);
  check(anonymous, 'anonymous');
  assert.deepEqual(await getLoreIndex(p.id), [], 'anonymous: nothing for a patron project');
  console.log('PASS anonymous visitor: only public records of a public project; public portrait and poster only; no restricted names');

  const token = seal({ accessToken: 'fixture', userID: 'fixture', campaignID: '1', exp: Date.now() + 60000 }, 'session');
  const cookie = { cookie: `${sessionCookie}=${token}` };
  const granted = await cms.find({ collection: 'characters', req: { headers: new Headers(cookie) }, overrideAccess: false, depth: 0,
    where: { slug: { equals: 'sentinel-lore-patron-character' } } });
  assert.equal(granted.totalDocs, 1, 'the patron fixture can read the patron character (the fixture is a real patron)');
  as(cookie);
  const patronIndex = await getLoreIndex(a.id);
  check(patronIndex, 'signed-in patron');
  assert.deepEqual(await getLoreIndex(p.id), [], 'signed-in patron: nothing for a patron project either');
  console.log('PASS signed-in patron: the same public records; patron records, faction names, portraits and posters left out');

  // The redacted record's name contains "Ada Vale": the text links the public Ada Vale only, never the redacted record.
  const linker = createLoreLinker(anonymous, { self: 'character:cy-moss' });
  const segments = linker.text('Ada Vale SENTINEL-LORE-REDACTED met Cy Moss and Ada Vale. Ada Valeria is not a record; ada vale is lower case.\n\nAda Vale again with the Lore Rifle.');
  const links = segments.filter(segment => typeof segment !== 'string') as { text: string; entry: Entry }[];
  assert.deepEqual(links.map(link => [link.text, link.entry.key]), [['Ada Vale', 'character:ada-vale'], ['Ada Vale', 'character:ada-vale'], ['Lore Rifle', 'equipment:lore-rifle']],
    'first mention per paragraph, own record (Cy Moss) never, whole words, case-sensitive');
  assert.equal(segments.map(segment => typeof segment === 'string' ? segment : segment.text).join(''), 'Ada Vale SENTINEL-LORE-REDACTED met Cy Moss and Ada Vale. Ada Valeria is not a record; ada vale is lower case.\n\nAda Vale again with the Lore Rifle.', 'text kept as written');
  assert.ok(!links.some(link => /sentinel/i.test(link.entry.href + link.entry.key)), 'the redacted record is never a link target');
  assert.deepEqual(linker.used().map(entry => entry.key), ['character:ada-vale', 'equipment:lore-rifle'], 'cross-references in first-link order');
  console.log('PASS redacted name containing a public name: only the public record is linked; matching rules hold');

  // Longest name first; a longer name that fails the word boundary does not hide a shorter one.
  const overlap = createLoreLinker(loreEntries('x', { characters: [], equipment: [], factions: [
    { id: 1, slug: 'unit', name: 'Red Unit', accessLevel: 'public' }, { id: 2, slug: 'unit-two', name: 'Red Unit Two', accessLevel: 'public' }] }));
  const pieces = overlap.text('Red Unit Two and Red Unit Twofold.').filter(segment => typeof segment !== 'string') as { text: string; entry: Entry }[];
  assert.deepEqual(pieces.map(piece => piece.entry.key), ['faction:unit-two', 'faction:unit'], 'longest first; boundary falls back to the shorter name');

  // Rich text: formatting kept, never inside a link, heading or code, first mention per paragraph, input untouched.
  const t = (text: string, format = 0) => ({ type: 'text', text, format, detail: 0, mode: 'normal', style: '', version: 1 });
  const node = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({ type, children, version: 1, ...extra });
  const writing = { root: node('root', [
    node('paragraph', [t('The '), t('Ada Vale', 3), t(' file; Ada Vale twice.')]),
    node('heading', [t('Lore Rifle notes')], { tag: 'h2' }),
    node('paragraph', [t('Lore Rifle', 16), t(' and '), node('link', [t('Lore Guild')], { fields: { url: '/x' } }), t(' then Lore Guild.')]),
    node('list', [node('listitem', [t('Ada Vale in a list.')])]),
  ]) };
  const before = JSON.stringify(writing);
  const rich = createLoreLinker(anonymous);
  const linked = rich.writing(writing) as typeof writing;
  assert.equal(JSON.stringify(writing), before, 'the input is not changed');
  const found: { text: string; format: number; key: string; parent: string }[] = [];
  const walk = (value: { type?: string; children?: unknown[]; entry?: Entry; text?: string; format?: number }, parent: string) => {
    if (value.type === 'loreLink') { const child = value.children![0] as { text: string; format: number }; found.push({ text: child.text, format: child.format, key: value.entry!.key, parent }); }
    for (const child of (value.children ?? []) as typeof value[]) walk(child, value.type ?? '');
  };
  walk(linked.root, 'root');
  assert.deepEqual(found, [
    { text: 'Ada Vale', format: 3, key: 'character:ada-vale', parent: 'paragraph' },
    { text: 'Lore Guild', format: 0, key: 'faction:lore-guild', parent: 'paragraph' },
    { text: 'Ada Vale', format: 0, key: 'character:ada-vale', parent: 'listitem' },
  ], 'bold+italic kept; second mention plain; heading, inline code and link untouched; new paragraph links again');
  console.log('PASS rich text: formatting kept, never inside a link, heading or code, first mention per paragraph');
} finally {
  globalThis.fetch = savedFetch;
  await cms.destroy();
}
