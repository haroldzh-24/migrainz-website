// Fresh private fixture only. Does not load .env.local or touch the editing DB.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { byteRange, privateFileResponse } from '../cms/range-response';
import { privateBlobAdapter } from '../cms/blob-storage';

await mkdir('test-results', { recursive: true });
const fixture = await mkdtemp(path.resolve('test-results/equipment-'));
Object.assign(process.env, { NODE_ENV: 'development', CMS_DATABASE: 'sqlite', DATABASE_URL: pathToFileURL(path.join(fixture, 'content.db')).href,
  CMS_MEDIA_DIR: path.join(fixture, 'media'), PAYLOAD_SECRET: randomBytes(32).toString('hex') });
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.VERCEL;
await mkdir(process.env.CMS_MEDIA_DIR!);
console.log(`Isolated Equipment fixture: ${fixture}`);
const { getPayload, handleEndpoints } = await import('payload');
const { default: config } = await import('../payload.config');
const cms = await getPayload({ config });
const validation = (pattern: RegExp) => (error: unknown) => pattern.test(String(error) + JSON.stringify((error as { data?: unknown }).data));
const pub = { _status: 'published' as const, accessLevel: 'public' as const, listingVisibility: 'public' as const };
try {
  const user = await cms.create({ collection: 'users', data: { email: 'equipment-fixture@example.invalid', password: randomBytes(24).toString('hex') } });
  const staff = { ...user, collection: 'users' as const };
  const a = await cms.create({ collection: 'projects', data: { title: 'A', slug: 'a', projectCode: 'A', status: 'TEST', ...pub } });
  const b = await cms.create({ collection: 'projects', data: { title: 'B', slug: 'b', projectCode: 'B', status: 'TEST', ...pub } });
  const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#256b38' } }).png().toBuffer();
  const art = await cms.create({ collection: 'media', data: { alt: 'Concept', ...pub }, file: { data: png, name: 'concept.png', mimetype: 'image/png', size: png.length } });
  // A small ISO BMFF file exercises upload/storage MIME handling, not codec decoding.
  const mp4 = Buffer.from('000000206674797069736f6d0000020069736f6d69736f32617663316d703431000000086d646174', 'hex');
  const video = await cms.create({ collection: 'media', data: { alt: 'Schematic', ...pub }, file: { data: mp4, name: 'schematic.mp4', mimetype: 'video/mp4', size: mp4.length } });
  assert.equal(video.mimeType, 'video/mp4');
  assert(!video.sizes?.viewer?.filename, 'Videos must not get Sharp derivatives');
  let pdfText = '%PDF-1.4\n';
  const offsets = [0];
  for (const [i, body] of ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Contents 4 0 R >>', '<< /Length 0 >>\nstream\n\nendstream'].entries()) {
    offsets.push(Buffer.byteLength(pdfText)); pdfText += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
  }
  const xref = Buffer.byteLength(pdfText);
  pdfText += 'xref\n0 5\n0000000000 65535 f \n' + offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  const pdf = Buffer.from(pdfText);
  const document = await cms.create({ collection: 'media', data: { alt: 'Document', ...pub }, file: { data: pdf, name: 'test.pdf', mimetype: 'application/pdf', size: pdf.length } });
  assert.equal(document.mimeType, 'application/pdf');
  const equipment = await cms.create({ collection: 'equipment', data: { name: 'Scanner', slug: 'scanner', project: a.id, category: 'Sensor', manufacturer: 'Studio', capacity: '2 cells', technicalSpecifications: [{ label: 'Mass', value: '1 kg' }],
    schematicEnabled: true, schematicVideo: video.id, schematicPoster: art.id, images: [{ media: art.id, caption: 'First' }, { media: art.id, caption: 'Second' }], ...pub } });
  const plain = await cms.create({ collection: 'equipment', data: { name: 'Bag', slug: 'bag', project: a.id, images: [{ media: art.id }], ...pub } });
  assert.equal(plain.schematicEnabled, false);
  const faction = await cms.create({ collection: 'factions', data: { name: 'Other faction', slug: 'other', type: 'Faction', project: a.id, ...pub } });
  const first = await cms.create({ collection: 'characters', user: staff, data: { name: 'One', slug: 'one', project: a.id, primaryFaction: faction.id,
    equipmentAssignments: [{ equipment: equipment.id, designation: 'Unit 7', quantity: 2, notes: 'Personal assignment', order: 2 }, { equipment: plain.id, order: 1 }], ...pub } });
  await cms.create({ collection: 'characters', user: staff, data: { name: 'Two', slug: 'two', project: a.id, equipmentAssignments: [{ equipment: equipment.id }], ...pub } });
  const reverse = await cms.find({ collection: 'characters', overrideAccess: false, depth: 0, where: { 'equipmentAssignments.equipment': { equals: equipment.id } } });
  assert.equal(reverse.totalDocs, 2);
  await assert.rejects(cms.create({ collection: 'characters', data: { name: 'Wrong', slug: 'wrong', project: b.id, equipmentAssignments: [{ equipment: equipment.id }], ...pub } }), validation(/project/i));
  await assert.rejects(cms.update({ collection: 'equipment', id: equipment.id, data: { project: b.id } }), validation(/project/i));
  await assert.rejects(cms.update({ collection: 'characters', id: first.id, data: { project: b.id } }), validation(/project/i));
  await assert.rejects(cms.delete({ collection: 'equipment', id: equipment.id }), /references/i);
  await assert.rejects(cms.delete({ collection: 'media', id: video.id }), /references/i);
  await assert.rejects(cms.update({ collection: 'equipment', id: equipment.id, data: { schematicVideo: art.id } }), validation(/MP4/i));
  await assert.rejects(cms.update({ collection: 'equipment', id: equipment.id, data: { schematicPoster: video.id } }), validation(/image/i));
  await assert.rejects(cms.update({ collection: 'equipment', id: plain.id, data: { images: [{ media: video.id }] } }), validation(/image/i));
  const tooLarge = Buffer.alloc(3 * 1024 * 1024 + 1); mp4.copy(tooLarge);
  await assert.rejects(cms.create({ collection: 'media', data: { alt: 'Too large', ...pub }, file: { data: tooLarge, name: 'large.mp4', mimetype: 'video/mp4', size: tooLarge.length } }), validation(/3 MiB/i));
  const visibleMedia = async (id: number) => (await cms.find({ collection: 'media', overrideAccess: false, depth: 0, where: { id: { equals: id } } })).totalDocs;
  assert.equal(await visibleMedia(video.id), 1);
  const upload = cms.collections.media.config.upload;
  assert(upload);
  let blobReads = 0;
  const adapter = privateBlobAdapter('fixture-not-a-token', {
    del: async () => {}, put: async () => { throw new Error('Fixture does not write Blob storage'); },
    get: async () => {
      blobReads++;
      return { statusCode: 200 as const, headers: new Headers(), stream: new ReadableStream<Uint8Array>({ start(c) { c.enqueue(mp4); c.close(); } }),
        blob: { url: 'https://private.invalid/never-expose', downloadUrl: 'https://private.invalid/never-expose', pathname: 'media/fixture', contentDisposition: 'inline', cacheControl: 'private', uploadedAt: new Date(), etag: 'fixture', contentType: 'video/mp4', size: mp4.length } };
    },
  })({ collection: cms.collections.media.config });
  upload.handlers!.push((req, args) => args.params.filename === video.filename ? adapter.staticHandler(req, args) : undefined);
  const fileRequest = (range = 'bytes=0-1') => handleEndpoints({ config: cms.config,
    request: new Request(`http://localhost/api/media/file/${video.filename}`, { headers: { Range: range } }) });
  const partial = await fileRequest();
  assert.equal(partial.status, 206); assert.deepEqual([...new Uint8Array(await partial.arrayBuffer())], [...mp4.subarray(0, 2)]);
  assert.equal(partial.headers.get('Content-Range'), `bytes 0-1/${mp4.length}`);
  assert.equal(partial.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(partial.headers.get('Location'), null);
  assert.equal((await fileRequest('bytes=9999-')).status, 416);
  await cms.update({ collection: 'equipment', id: equipment.id, data: { schematicEnabled: false } });
  assert.equal(await visibleMedia(video.id), 0);
  const beforeDeniedRead = blobReads;
  assert([401, 403, 404].includes((await fileRequest()).status));
  assert.equal(blobReads, beforeDeniedRead, 'Authorization must run before private storage reads');
  const retained = await cms.findByID({ collection: 'equipment', id: equipment.id, depth: 0 });
  assert.equal(retained.schematicVideo, video.id);
  assert.deepEqual(retained.images?.map(row => row.caption), ['First', 'Second']);
  await cms.update({ collection: 'equipment', id: equipment.id, data: { schematicEnabled: true } });
  for (const accessLevel of ['hidden', 'redacted', 'patron'] as const) {
    await cms.update({ collection: 'equipment', id: equipment.id, data: { accessLevel } });
    const character = await cms.findByID({ collection: 'characters', id: first.id, overrideAccess: false, depth: 1 });
    assert.equal(character.equipmentAssignments?.length, 1);
    assert(!JSON.stringify(character).includes('Personal assignment'));
    assert.equal(await visibleMedia(video.id), 0);
  }
  await cms.update({ collection: 'equipment', id: equipment.id, data: { accessLevel: 'public' } });
  await cms.update({ collection: 'media', id: video.id, data: { accessLevel: 'patron' } });
  assert.equal(await visibleMedia(video.id), 0);
  // Offline verified-membership fixture: encrypted session + mocked Patreon API,
  // exercising the real per-record tier checks without contacting Patreon.
  Object.assign(process.env, { PATREON_CLIENT_ID: 'fixture', PATREON_CLIENT_SECRET: 'fixture', PATREON_REDIRECT_URI: 'https://fixture.invalid/auth/patreon/callback', PATREON_CAMPAIGN_ID: '1' });
  const { seal, sessionCookie } = await import('../lib/patreon/server');
  const savedFetch = globalThis.fetch;
  let tier = '10';
  globalThis.fetch = async input => {
    assert.equal(new URL(String(input)).hostname, 'www.patreon.com');
    return Response.json({ data: { type: 'user', id: 'fixture', relationships: { memberships: { data: [{ type: 'member', id: 'm' }] } } },
      included: [{ type: 'member', id: 'm', attributes: { patron_status: 'active_patron', last_charge_status: 'Paid', currently_entitled_amount_cents: 500 },
        relationships: { campaign: { data: { type: 'campaign', id: '1' } }, currently_entitled_tiers: { data: [{ type: 'tier', id: tier }] } } }] });
  };
  try {
    const token = seal({ accessToken: 'fixture', userID: 'fixture', campaignID: '1', exp: Date.now() + 60000 }, 'session');
    const patronReq = () => ({ headers: new Headers({ cookie: `${sessionCookie}=${token}` }) });
    await cms.update({ collection: 'media', id: video.id, data: { patreonTierIDs: ['10'] } });
    assert.equal((await cms.find({ collection: 'media', req: patronReq(), overrideAccess: false, depth: 0, where: { id: { equals: video.id } } })).totalDocs, 1);
    tier = '11';
    assert.equal((await cms.find({ collection: 'media', req: patronReq(), overrideAccess: false, depth: 0, where: { id: { equals: video.id } } })).totalDocs, 0);
    tier = '10';
    await cms.update({ collection: 'equipment', id: equipment.id, data: { accessLevel: 'patron', patreonTierIDs: ['11'] } });
    assert.equal((await cms.find({ collection: 'media', req: patronReq(), overrideAccess: false, depth: 0, where: { id: { equals: video.id } } })).totalDocs, 0);
    await cms.update({ collection: 'equipment', id: equipment.id, data: { accessLevel: 'public' } });
  } finally { globalThis.fetch = savedFetch; }
  await cms.update({ collection: 'media', id: video.id, data: { accessLevel: 'public', _status: 'draft' } });
  assert.equal(await visibleMedia(video.id), 0);
  await cms.update({ collection: 'media', id: video.id, data: { _status: 'published' } });
  await cms.update({ collection: 'characters', id: first.id, data: { listingVisibility: 'hidden' } });
  const publicReverse = await cms.find({ collection: 'characters', overrideAccess: false, depth: 0, where: { 'equipmentAssignments.equipment': { equals: equipment.id } } });
  assert.equal(publicReverse.totalDocs, 1);
  // Optional video field absent, unpublished equipment, and inherited faction denial.
  await cms.update({ collection: 'equipment', id: equipment.id, data: { faction: faction.id } });
  await cms.update({ collection: 'factions', id: faction.id, data: { _status: 'draft' } });
  assert.equal((await cms.find({ collection: 'equipment', overrideAccess: false, where: { id: { equals: equipment.id } } })).totalDocs, 0);
  console.log('PASS: optional fields; shared assignments; cross-project rejection; reverse reads; hidden/patron/draft/faction media and assignment isolation; deletion; MP4/image/PDF upload rules; retained order and disabled relationships.');
} finally { await cms.destroy(); }

const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
for (const [range, status, expected] of [
  [undefined, 200, [...bytes]], ['bytes=0-1', 206, [0, 1]], ['bytes=3-', 206, [3, 4, 5, 6, 7, 8, 9]], ['bytes=-3', 206, [7, 8, 9]],
  ['bytes=7-999', 206, [7, 8, 9]], ['bytes=20-', 416, []], ['bytes=-0', 416, []], ['bytes=3-2', 416, []],
] as const) {
  const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(bytes.slice(0, 4)); c.enqueue(bytes.slice(4)); c.close(); } });
  const response = await privateFileResponse(stream, bytes.length, 'video/mp4', { headers: new Headers(range ? { Range: range } : {}) }, new Headers({ 'Cache-Control': 'private, no-store' }));
  assert.equal(response.status, status); assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], expected);
  assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
}
assert.equal(byteRange('bytes=0-1,3-4', 10), undefined);
console.log('PASS: private full/partial/open/suffix/clamped/unsatisfiable range responses across stream chunks.');
