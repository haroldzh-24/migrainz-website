// Comic reader preloading rules (lib/page-preload.ts, batch 28). No server, database or env.
//   node --import tsx scripts/verify-page-preload.ts
import assert from 'node:assert/strict';
import { artworkSources, pagePreloads, pageSource } from '../lib/page-preload';

const page = (n: number, extra: Record<string, unknown> = {}) => ({ src: `/p/${n}.png`, viewerSrc: `/p/${n}-1600.png`, thumbnailSrc: `/p/${n}-400.png`, ...extra });
const pages = [page(1), page(2), page(3), page(4), page(5)];

// The reader's own first source: viewerSrc, then src, then the thumbnail; an explicit `sources` list wins.
assert.deepEqual(artworkSources(page(1)), ['/p/1-1600.png', '/p/1.png', '/p/1-400.png']);
assert.deepEqual(artworkSources({ src: '/a.png', sources: ['/b.png'] }), ['/b.png']);
assert.deepEqual(artworkSources({ src: '/a.png', viewerSrc: '/a.png' }), ['/a.png'], 'duplicates dropped');
assert.equal(pageSource(page(2)), '/p/2-1600.png');
console.log('PASS: the preload uses exactly the source the reader shows');

// One ahead and one behind, never more.
assert.deepEqual(pagePreloads(pages, 2).wanted, ['/p/4-1600.png', '/p/2-1600.png']);
assert.deepEqual(pagePreloads(pages, 0).wanted, ['/p/2-1600.png'], 'first page: only the next');
assert.deepEqual(pagePreloads(pages, 4).wanted, ['/p/4-1600.png'], 'last page: only the previous');
for (let index = 0; index < pages.length; index++) assert.ok(pagePreloads(pages, index).wanted.length <= 2, 'never more than two');
// The page now shown is kept (its unfinished preload is not cancelled by turning onto it), nothing further.
assert.deepEqual([...pagePreloads(pages, 2).keep].sort(), ['/p/2-1600.png', '/p/3-1600.png', '/p/4-1600.png']);
console.log('PASS: one ahead and one behind; the page shown is kept');

// No classified or missing pages; nothing under Save-Data.
const mixed = [page(1), page(2, { classification: 'patron' }), page(3), { src: '' }, page(5)];
assert.deepEqual(pagePreloads(mixed, 0).wanted, [], 'classified next page: not preloaded');
assert.deepEqual(pagePreloads(mixed, 2).wanted, [], 'classified and missing neighbours: nothing');
assert.deepEqual(pagePreloads(mixed, 4).wanted, [], 'missing previous page: nothing');
assert.deepEqual([...pagePreloads(mixed, 1).keep].sort(), ['/p/1-1600.png', '/p/3-1600.png'], 'a classified page shown keeps no source of its own');
assert.deepEqual(pagePreloads(pages, 2, true).wanted, [], 'Save-Data: nothing');
assert.deepEqual([...pagePreloads(pages, 2, true).keep], ['/p/3-1600.png']);
console.log('PASS: no classified or missing pages, nothing under Save-Data');
console.log('verify-page-preload: all checks passed');
