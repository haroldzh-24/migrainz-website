// Equipment card navigation, the item page module and Art Viewer dead ends, using the real components,
// window manager and global CSS with a minimal link shim. No CMS, database or network.
// Requires Playwright (PLAYWRIGHT_MODULE=path\to\playwright\index.mjs) and Chrome.
// Optional: SCHEMATIC_CLIP_169 / SCHEMATIC_CLIP_21 = path prefix of renderer output (X.mp4 and X-poster.png)
// to also capture module screenshots with the real encoded video.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('test-results/equipment-navigation');
const clips = { 'real-169': process.env.SCHEMATIC_CLIP_169, 'real-21': process.env.SCHEMATIC_CLIP_21 };
await mkdir(output, { recursive: true });
const bundle = await build({ bundle: true, write: false, outfile: 'bundle.js', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
import React from 'react'; import { createRoot } from 'react-dom/client';
import { SoundProvider } from '@/components/SoundProvider';
import { WindowManagerProvider, PublicWindowWorkspace } from '@/components/WindowManager';
import ArtViewer from '@/components/ArtViewer';
import { EquipmentViewerLink, EquipmentViewerButton } from '@/components/EquipmentViewerLink';
import { CharacterViewerLink, CharacterViewerButton } from '@/components/CharacterViewerLink';
import FactionGrid from '@/components/FactionGrid';
import EquipmentCards from '@/components/EquipmentCards';
import EquipmentSchematic from '@/components/EquipmentSchematic';
import EquipmentSpecifications from '@/components/EquipmentSpecifications';
const project = { slug: 'fixture', title: 'Fixture Project' };
const poster = { src: '/poster.svg', thumbnailSrc: '/poster.svg', alt: 'Schematic poster' };
const concept = { src: '/concept.svg', thumbnailSrc: '/concept.svg', alt: 'Concept art' };
const base = { category: 'Small Arms', description: '', updated: '2026-10-21', specifications: [] };
const items = [
  { ...base, slug: 'with-art', name: 'Equipment With Concept Art', images: [concept], poster },
  { ...base, slug: 'poster-only', name: 'MP5 10MM Company Custom', images: [], poster },
  { ...base, slug: 'bare', name: 'Equipment With Nothing Filed', images: [] },
  ...[1, 2, 3, 4, 5].map(n => ({ ...base, slug: 'extra-' + n, name: 'Extra Item With A Very Long Display Name ' + n, images: [] })),
];
const real = { ...base, name: 'MP5 10MM Company Custom', images: [], category: 'Small Arms',
  description: 'Company custom MP5 chambered in 10mm with a collapsing stock and bayonet.',
  specifications: [{ label: 'MANUFACTURER', value: 'H&K' }, { label: 'MODEL / DESIGNATION', value: 'MP-5' }, { label: 'TYPE', value: 'Small Arms' }, { label: 'CALIBER / CARTRIDGE', value: '10 mm' }, { label: 'CAPACITY', value: '30' }] };
items.push({ ...real, slug: 'real-169', poster: { src: '/real-169.png', alt: 'poster' } }, { ...real, slug: 'real-21', poster: { src: '/real-21.png', alt: 'poster' } });
const character = { slug: 'nobody', name: 'Character Without Art', role: 'Scout', description: '', images: [], updated: '2026-10-21' };
const faction = { slug: 'crew', name: 'Crew', description: 'No emblem', type: 'Group', status: '', updatedAt: '2026-10-21T00:00:00Z' };
const path = location.pathname;
const page = path.startsWith('/projects/fixture/equipment/') ? items.find(item => path.endsWith('/' + item.slug)) : null;
createRoot(document.getElementById('root')).render(<SoundProvider><WindowManagerProvider><main className="shell">
  {page ? <section className="directory-page"><h1 id="item-page">{page.name}</h1>
    <EquipmentSchematic name={page.name} src={page.slug.startsWith('real-') ? '/' + page.slug + '.mp4' : page.slug === 'poster-only' ? '/poster-only.mp4' : undefined} poster={page.poster?.src}>
      <p className="eyebrow">{page.category} / UPDATED {page.updated}</p>{page.description && <p className="lede">{page.description}</p>}
      <EquipmentSpecifications rows={page.specifications} />
    </EquipmentSchematic>
    <EquipmentViewerButton project={project} equipment={page} /></section>
    : <section className="directory-page"><h1>Fixture directory</h1>
      <div className="directory-list desktop-file-list">{items.map(item => <EquipmentViewerLink key={item.slug} project={project} equipment={item} />)}</div>
      <div className="directory-list desktop-file-list"><CharacterViewerLink project={project} character={character} /></div>
      <FactionGrid project={project} factions={[faction] as never} />
      <EquipmentCards projectSlug="fixture" equipment={items.map(item => ({ ...item }))} />
      <CharacterViewerButton project={project} character={character} /></section>}
</main><PublicWindowWorkspace /><ArtViewer /></WindowManagerProvider></SoundProvider>);` },
  plugins: [{ name: 'router', setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'test' }));
    b.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export default function Link({children,prefetch,...props}) {return <a {...props}>{children}</a>}', loader: 'jsx', resolveDir: process.cwd() }));
  } }],
});
const svg = (fill, label, w = 640, h = 360) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${fill}"/><text x="20" y="40" fill="#fff" font-size="28">${label}</text></svg>`;
const server = createServer(async (req, res) => {
  if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end(await readFile('app/(frontend)/globals.css')); }
  for (const [key, prefix] of Object.entries(clips)) {
    if (prefix && req.url === '/' + key + '.mp4') { res.setHeader('Content-Type', 'video/mp4'); return res.end(await readFile(prefix + '.mp4')); }
    if (prefix && req.url === '/' + key + '.png') { res.setHeader('Content-Type', 'image/png'); return res.end(await readFile(prefix + '-poster.png')); }
  }
  if (req.url === '/poster.svg') { res.setHeader('Content-Type', 'image/svg+xml'); return res.end(svg('#193', 'SCHEMATIC POSTER')); }
  if (req.url === '/concept.svg') { res.setHeader('Content-Type', 'image/svg+xml'); return res.end(svg('#613', 'CONCEPT ART', 3200, 2400)); }
  res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = `http://127.0.0.1:${server.address().port}`;
const viewer = page => page.locator('.art-viewer-window');
const tab = (slug, title, images, poster) => ({ id: 'equipment:fixture:' + slug, href: '/projects/fixture/equipment/' + slug, title, project: 'Fixture Project', role: 'Small Arms', description: '', images, poster });
const posterImage = { src: '/poster.svg', alt: 'Schematic poster' };
const conceptImage = { src: '/concept.svg', alt: 'Concept art' };
const seedTabs = tabs => page => page.addInitScript(value => sessionStorage.setItem('migrainz-art-viewer-tabs-v2', JSON.stringify(value)), tabs);
// Keyboard focus must already be inside the viewer when it opens, so Escape works without clicking in it.
const focusInViewer = async (page, label) => { await page.waitForFunction(() => document.querySelector('.art-viewer-window')?.contains(document.activeElement), null, { timeout: 3000 }).catch(() => { throw new Error('focus is not inside the Art Viewer after opening: ' + label); }); };
const onScreen = async (page, locator, label) => {
  const box = await locator.boundingBox();
  assert(box, `${label} has no box`);
  const size = page.viewportSize();
  assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width + 0.5 && box.y + box.height <= size.height + 0.5, `${label} is off-screen: ${JSON.stringify(box)} in ${JSON.stringify(size)}`);
};
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['narrow-670', 670, 800], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 700 });
    const errors = [];
    let page;
    // Each scenario starts in a fresh tab so persisted viewer tabs (sessionStorage) never leak between them.
    const fresh = async (url, seed) => { if (page) await page.close(); page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); if (seed) await seed(page); await page.goto(base + url); };
    await fresh('/projects/fixture/equipment');
    await page.waitForSelector('.desktop-file');

    // Thumbnails: concept art, then poster fallback, then the unavailable label only when nothing exists.
    const files = page.locator('.desktop-file');
    assert.equal(await files.nth(0).locator('img').getAttribute('src'), '/concept.svg');
    assert.equal(await files.nth(1).locator('img').getAttribute('src'), '/poster.svg');
    assert.match(await files.nth(2).textContent(), /NO IMAGE/);
    assert.equal(await page.locator('.equipment-card img').nth(1).getAttribute('src'), '/poster.svg');
    await page.screenshot({ path: path.join(output, `${name}-1-equipment-list.png`) });

    // Clicking the card image and the file name both open the item page, never the viewer.
    for (const target of ['img', 'strong']) {
      await fresh('/projects/fixture/equipment');
      await page.locator('.desktop-file').nth(1).locator(target).first().click();
      await page.waitForURL('**/projects/fixture/equipment/poster-only');
      assert.equal(await viewer(page).count(), 0, 'viewer must not open from card click');
    }
    assert.equal(await page.locator('#item-page').textContent(), 'MP5 10MM Company Custom');

    // A schematic with no concept art has no viewer button; the module and specs are the whole page.
    assert.equal(await page.getByRole('button', { name: 'OPEN IN ART VIEWER' }).count(), 0, 'no viewer button without concept art');
    await page.waitForSelector('.equipment-panel');
    await page.screenshot({ path: path.join(output, `${name}-2-item-page-poster-only.png`) });
    // A persisted tab with a poster (no artwork) shows the poster, not a dead end.
    await fresh('/projects/fixture/equipment/poster-only', seedTabs([tab('poster-only', 'MP5 10MM Company Custom', [], posterImage)]));
    await viewer(page).waitFor();
    await focusInViewer(page, 'restored tab');
    assert.equal(await viewer(page).locator('.art-viewer-canvas img').getAttribute('src'), '/poster.svg');
    assert.match(await viewer(page).textContent(), /SHOWING SCHEMATIC POSTER/);
    await onScreen(page, page.getByRole('button', { name: 'Close ART VIEWER' }), 'close button');
    await page.screenshot({ path: path.join(output, `${name}-3-viewer-poster.png`) });
    assert.equal(await page.getByRole('link', { name: 'OPEN ITEM PAGE' }).getAttribute('href'), '/projects/fixture/equipment/poster-only');

    // Nothing at all: placeholder plus a link to the item page; and no button to reach it from the page.
    await fresh('/projects/fixture/equipment/bare');
    assert.equal(await page.getByRole('button', { name: 'OPEN IN ART VIEWER' }).count(), 0);
    await fresh('/projects/fixture/equipment/bare', seedTabs([tab('bare', 'Equipment With Nothing Filed', [])]));
    await viewer(page).waitFor();
    await focusInViewer(page, 'restored tab');
    assert.match(await viewer(page).textContent(), /NO PUBLIC ARTWORK FILED/);
    assert.equal(await viewer(page).getByRole('link', { name: /PAGE$/ }).first().getAttribute('href'), '/projects/fixture/equipment/bare');
    await page.screenshot({ path: path.join(output, `${name}-4-viewer-empty.png`) });

    // Escape closes the viewer.
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.art-viewer-window'));

    // Concept art item still opens artwork, and several tabs keep the close button on screen.
    await fresh('/projects/fixture/equipment/with-art');
    await page.getByRole('button', { name: 'OPEN IN ART VIEWER' }).click();
    await viewer(page).waitFor();
    await focusInViewer(page, 'opened from the item page button');
    assert.equal(await viewer(page).locator('.art-viewer-canvas img').getAttribute('src'), '/concept.svg');
    await page.waitForFunction(() => document.querySelector('.art-viewer-canvas img')?.naturalWidth > 0 && document.querySelector('.art-viewer-canvas img').style.visibility !== 'hidden');
    for (const label of ['Close ART VIEWER', 'Minimize ART VIEWER']) await onScreen(page, page.getByRole('button', { name: label }), `${label} with large artwork`);
    await page.screenshot({ path: path.join(output, `${name}-5-viewer-artwork.png`) });
    await fresh('/projects/fixture/equipment/with-art', seedTabs([tab('with-art', 'Equipment With Concept Art', [conceptImage]), tab('poster-only', 'MP5 10MM Company Custom', [], posterImage), tab('bare', 'Equipment With Nothing Filed', [])]));
    await viewer(page).waitFor();
    assert((await viewer(page).locator('[role=tab]').count()) >= 3);
    for (const label of ['Close ART VIEWER', 'Minimize ART VIEWER']) await onScreen(page, page.getByRole('button', { name: label }), label);
    await page.screenshot({ path: path.join(output, `${name}-6-viewer-tabs.png`) });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.art-viewer-window'));

    // Character card with no art: same dead end, now with a way out. Faction cards navigate directly.
    // Opening from a character card (still a viewer card) also moves focus in, so Escape works at once.
    await fresh('/projects/fixture/equipment');
    await page.locator('.desktop-file-open', { hasText: 'Character_Without_Art' }).click();
    await viewer(page).waitFor();
    await focusInViewer(page, 'opened from a character card');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.art-viewer-window'));
    await fresh('/projects/fixture/equipment');
    await page.getByRole('button', { name: 'OPEN IN ART VIEWER' }).click();
    await viewer(page).waitFor();
    await focusInViewer(page, 'opened from the item page button');
    assert.match(await viewer(page).textContent(), /NO PUBLIC ARTWORK FILED/);
    assert.equal(await viewer(page).getByRole('link', { name: /PAGE$/ }).first().getAttribute('href'), '/projects/fixture/characters/nobody');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.faction-file .desktop-file-open').getAttribute('href'), '/projects/fixture/factions/crew');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${name} ${width}px`);
  }

  // Module screenshots with the real encoded clips (only when SCHEMATIC_CLIP_* are set).
  for (const [key, prefix] of Object.entries(clips)) {
    if (!prefix || !existsSync(prefix + '.mp4')) continue;
    for (const [shot, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 700 });
      const shotPage = await context.newPage();
      await shotPage.goto(base + '/projects/fixture/equipment/' + key);
      await shotPage.waitForFunction(() => { const v = document.querySelector('video'); return v && v.readyState >= 2 && !v.paused && v.currentTime > 0.2; }, null, { timeout: 15000 });
      assert.equal(await shotPage.getByRole('button', { name: 'OPEN IN ART VIEWER' }).count(), 0);
      assert(await shotPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const display = await shotPage.locator('.equipment-schematic-display').boundingBox();
      const panel = await shotPage.locator('.equipment-panel').boundingBox();
      assert(Math.abs(panel.y - (display.y + display.height)) < 1.01);
      await shotPage.screenshot({ path: path.join(output, `module-${key}-${shot}.png`) });
      await context.close();
    }
    console.log('PASS module screenshots', key);
  }

  // Resizing the browser with the viewer open (wide to narrow and back) keeps every title-bar control reachable.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await seedTabs([tab('with-art', 'Equipment With Concept Art', [conceptImage]), tab('poster-only', 'MP5 10MM Company Custom', [], posterImage), tab('bare', 'Equipment With Nothing Filed', []),
    ...[1, 2, 3, 4, 5].map(n => tab('extra-' + n, 'Extra Item With A Very Long Display Name ' + n, []))])(page);
  await page.goto(base + '/projects/fixture/equipment/with-art');
  await viewer(page).waitFor();
  assert((await viewer(page).locator('[role=tab]').count()) >= 8);
  const widths = [1440, 1100, 900, 800, 720, 700, 670, 640, 560, 480, 390, 360, 640, 900, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(120);
    for (const label of ['Close ART VIEWER', 'Minimize ART VIEWER']) await onScreen(page, page.getByRole('button', { name: label }), `${label} at ${width}px`);
    const box = await viewer(page).boundingBox();
    assert(box.x >= 0 && box.x + box.width <= width + 0.5, `viewer window off-screen at ${width}px: ${JSON.stringify(box)}`);
  }
  await context.close();
  console.log('PASS resize sweep');
} finally { await browser.close(); server.close(); }
