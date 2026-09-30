// In-memory config/SDK mocks only; no database, network, uploads or file mutation.
import assert from 'node:assert/strict';
import { buildConfig } from 'payload';
import { blobStoragePlugin, privateBlobAdapter } from '../cms/blob-storage.ts';
import { mediaCollection } from '../collections/index.ts';
import { blobPathname } from '../cms/blob-files.ts';

const local = { collections: [mediaCollection('/private/media'), { slug: 'projects', fields: [] }] };
assert.equal(blobStoragePlugin({})(local), local);
assert.throws(() => blobStoragePlugin({ VERCEL: '1' }), /BLOB_READ_WRITE_TOKEN/);
const hosted = blobStoragePlugin({ VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'test-only' })(local);
const media = hosted.collections[0];
assert.equal(media.upload.disableLocalStorage, true);
assert.equal(media.access.read, local.collections[0].access.read);
assert.equal(media.upload.handlers[0], local.collections[0].upload.handlers[0]);
assert.equal(media.upload.handlers.length, local.collections[0].upload.handlers.length + 1);
assert(!media.fields.some(field => field.name === 'prefix'));
// Compare sanitized persisted field paths: cloud hooks must add no DB columns.
const normalize = config => buildConfig({ ...config, secret: 'test-only-secret-for-storage-config-check',
  admin: { disable: true }, telemetry: false, typescript: { autoGenerate: false } });
const paths = (fields, base = '') => fields.flatMap(field => {
  const key = field.name ? `${base}${field.name}` : base;
  return [...(field.name ? [`${key}:${field.type}`] : []), ...(field.fields ? paths(field.fields, `${key}.`) : [])];
}).sort();
const [localConfig, blobConfig] = await Promise.all([normalize(local), normalize(hosted)]);
assert.deepEqual(paths(blobConfig.collections.find(c=>c.slug==='media').fields), paths(localConfig.collections.find(c=>c.slug==='media').fields));
for (const filename of ['../secret', 'a/b', 'a\\b', '%2e%2e', 'a?x']) assert.throws(() => blobPathname(filename));

const calls = [];
let missing = false;
const adapter = privateBlobAdapter('test-only', {
  put: async (...args) => { calls.push(args); }, del: async () => {},
  get: async (key, options) => {
    assert.equal(key, 'media/page.jpg'); assert.equal(options.access, 'private'); assert.equal(options.useCache, false);
    return missing ? null : { statusCode: 200, stream: new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1])); c.close(); } }), blob: { contentType: 'image/jpeg', size: 1 } };
  },
})({ collection: media });
const guard = media.upload.handlers[0];
for (const accessLevel of ['redacted', 'patron', 'hidden']) {
  const response = guard({ user: null }, { doc: { filename: 'page.jpg', mimeType: 'image/jpeg', accessLevel, _status: 'published' }, params: { filename: 'page.jpg' } });
  assert.equal(response.status, 404);
}
assert.equal(guard({ user: null }, { doc: { filename: 'page.jpg', mimeType: 'image/jpeg', accessLevel: 'public', _status: 'published', listingVisibility: 'hidden' }, params: { filename: 'page.jpg' } }), undefined);
for (const filename of ['page.jpg', 'page-thumbnail.webp', 'page-preview.webp', 'page-viewer.webp']) {
  await adapter.handleUpload({ file: { filename, buffer: Buffer.from('x'), filesize: 1, mimeType: 'image/jpeg' } });
}
assert.equal(calls.length, 4);
for (const [, , options] of calls) { assert.equal(options.access, 'private'); assert.equal(options.addRandomSuffix, false); }
const req = { payload: { logger: { error() {} } } };
const response = await adapter.staticHandler(req, { params: { filename: 'page.jpg' } });
assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
assert.equal(response.headers.get('Location'), null); assert.equal((await response.arrayBuffer()).byteLength, 1);
missing = true;
assert.equal((await adapter.staticHandler(req, { params: { filename: 'page.jpg' } })).status, 404);
console.log('PASS: local/hosted storage config, unchanged schema fields, private writes/proxy, original guard, missing-file response. No external mutations.');
