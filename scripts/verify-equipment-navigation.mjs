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
import RouteApplication from '@/components/RouteApplication';
import { Directory } from '@/components/Directory';
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
  description: 'Company custom MP5 chambered in 10mm with a collapsing stock and bayonet. Issued to forward patrols that need a compact, quiet-handling carbine with more stopping power than the standard 9mm pattern. The bayonet lug is a field modification and is not part of the original company pattern.',
  specifications: [{ label: 'MANUFACTURER', value: 'H&K' }, { label: 'MODEL / DESIGNATION', value: 'MP-5' }, { label: 'TYPE', value: 'Small Arms' }, { label: 'CALIBER / CARTRIDGE', value: '10 mm' }, { label: 'CAPACITY', value: '30' }] };
const sixSpecs = [...real.specifications, { label: 'YEAR / PERIOD', value: '2019' }];
items.push({ ...real, slug: 'laptop', specifications: sixSpecs, poster: { src: '/poster-wide.svg', alt: 'poster' } },
  { ...real, slug: 'laptop-short', description: '', poster: { src: '/poster-wide.svg', alt: 'poster' } },
  { ...real, slug: 'real-169', poster: { src: '/real-169.png', alt: 'poster' } }, { ...real, slug: 'real-21', poster: { src: '/real-21.png', alt: 'poster' } });
const character = { slug: 'nobody', name: 'Character Without Art', role: 'Scout', description: '', images: [], updated: '2026-10-21' };
const faction = { slug: 'crew', name: 'Crew', description: 'No emblem', type: 'Group', status: '', updatedAt: '2026-10-21T00:00:00Z' };
const path = location.pathname;
const page = path.startsWith('/projects/fixture/equipment/') ? items.find(item => path.endsWith('/' + item.slug)) : null;
createRoot(document.getElementById('root')).render(<SoundProvider><WindowManagerProvider><main className="shell">
  {page ? <RouteApplication id="project" title="PROJECT: Fixture Project" navigation={[{ label: 'OVERVIEW', href: '/projects/fixture' }, { label: 'FACTIONS', href: '/projects/fixture#factions' }, { label: 'CHARACTERS', href: '/projects/fixture/characters' }, { label: 'EQUIPMENT', href: '/projects/fixture/equipment' }]}>
    <Directory path={'SYS:/PROJECTS/FIXTURE/EQUIPMENT/' + page.slug.toUpperCase()} title={page.name} compact>
      <a className="section-link" href="/projects/fixture/equipment">RETURN TO EQUIPMENT</a>
      <EquipmentSchematic name={page.name} src={page.slug.startsWith('real-') ? '/' + page.slug + '.mp4' : page.slug === 'poster-only' ? '/poster-only.mp4' : undefined} poster={page.poster?.src}>
        <p className="eyebrow">{page.category} / UPDATED {page.updated}</p>{page.description && <p className="lede">{page.description}</p>}
        <EquipmentSpecifications rows={page.specifications} />
      </EquipmentSchematic>
      <EquipmentViewerButton project={project} equipment={page} />
    </Directory></RouteApplication>
    : path === '/projects/fixture/factions/company' ? <RouteApplication id="project" title="PROJECT: Fixture Project" navigation={[{ label: 'EQUIPMENT', href: '/projects/fixture/equipment' }]}>
      <Directory path="SYS:/PROJECTS/FIXTURE/FACTIONS/COMPANY/" title="The Company">
        <section className="section-block"><h2>CHARACTERS</h2><div className="directory-list desktop-file-list"><CharacterViewerLink project={project} character={character} /></div></section>
        <section className="section-block"><h2>EQUIPMENT</h2><div className="directory-list desktop-file-list">{items.filter(item => ['poster-only', 'with-art', 'bare'].includes(item.slug)).map(item => <EquipmentViewerLink key={item.slug} project={project} equipment={item} />)}</div></section>
      </Directory></RouteApplication>
    : <section className="directory-page"><h1>Fixture directory</h1>
      <div className="directory-list desktop-file-list">{items.map(item => <EquipmentViewerLink key={item.slug} project={project} equipment={item} />)}</div>
      <div className="directory-list desktop-file-list"><CharacterViewerLink project={project} character={character} /></div>
      <FactionGrid project={project} factions={[faction] as never} />
      <EquipmentCards projectSlug="fixture" equipment={items.map(item => ({ ...item }))} />
      <CharacterViewerButton project={project} character={character} /></section>}
</main><PublicWindowWorkspace /><ArtViewer /></WindowManagerProvider></SoundProvider>);` },
  plugins: [{ name: 'router', setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'test' }));
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'test' }));
    b.onLoad({ filter: /^link$/, namespace: 'test' }, () => ({ contents: 'export default function Link({children,prefetch,...props}) {return <a {...props}>{children}</a>}', loader: 'jsx', resolveDir: process.cwd() }));
    b.onLoad({ filter: /^navigation$/, namespace: 'test' }, () => ({ contents: 'export const usePathname = () => location.pathname; export const useRouter = () => ({ push: href => { location.href = href; } });', loader: 'js', resolveDir: process.cwd() }));
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
  if (req.url === '/poster-wide.svg') { res.setHeader('Content-Type', 'image/svg+xml'); return res.end(svg('#193', 'WIDE POSTER', 1280, 640)); }
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
    assert.equal(await page.locator('.directory-page h1').textContent(), 'MP5 10MM Company Custom');

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
      // Description and category line live inside the panel, softer than the bright spec values, with generous line height.
      const copy = await shotPage.evaluate(() => {
        const lede = document.querySelector('.equipment-panel .lede'), value = document.querySelector('.equipment-panel dd'), eyebrow = document.querySelector('.equipment-panel .eyebrow');
        const style = el => getComputedStyle(el);
        return { inPanel: Boolean(lede && eyebrow), color: style(lede).color, valueColor: style(value).color, font: style(lede).fontFamily, ratio: parseFloat(style(lede).lineHeight) / parseFloat(style(lede).fontSize), outside: document.querySelectorAll('.lede').length - document.querySelectorAll('.equipment-panel .lede').length,
          order: [...document.querySelector('.equipment-panel').children].map(el => el.className || el.tagName) };
      });
      assert(copy.inPanel && copy.outside === 0, 'description and category line must be inside the panel');
      // Real contrast and hue, even inside the light .project-application theme that redefines --green, --green2 and --hot.
      const readable = await shotPage.evaluate(() => {
        const rgb = value => { const n = (value.match(/[\d.]+/g) || []).map(Number); return value.startsWith('color(') ? [n[0] * 255, n[1] * 255, n[2] * 255, n[3] ?? 1] : n; };
        const lum = ([r, g, b]) => { const c = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
        const panel = document.querySelector('.equipment-panel'), bg = rgb(getComputedStyle(panel).backgroundColor);
        const probe = (name, el) => { const style = getComputedStyle(el), [r, g, b, a = 1] = rgb(style.color); const alpha = a * parseFloat(style.opacity); const mixed = [r, g, b].map((v, i) => v * alpha + bg[i] * (1 - alpha));
          const [hi, lo] = [Math.max(lum(mixed), lum(bg)), Math.min(lum(mixed), lum(bg))]; return { name, color: style.color, contrast: (hi + 0.05) / (lo + 0.05), green: mixed[1] > mixed[0] * 1.3 && mixed[1] > mixed[2] * 1.3 && mixed[1] >= 120 }; };
        const all = [...panel.querySelectorAll('dt')].map((el, i) => probe('label ' + i, el)).concat([...panel.querySelectorAll('dd')].map((el, i) => probe('value ' + i, el)), [probe('description', panel.querySelector('.lede')), probe('category line', panel.querySelector('.eyebrow'))]);
        const module = getComputedStyle(document.querySelector('.equipment-module'));
        return { all, bg: getComputedStyle(panel).backgroundColor, inProjectWindow: Boolean(document.querySelector('.project-application .equipment-module')), border: module.borderTopColor };
      });
      assert(readable.inProjectWindow, 'fixture must render the module inside .project-application');
      assert.equal(readable.bg, 'rgb(1, 3, 0)');
      for (const item of readable.all) { assert(item.contrast >= 4.5, item.name + ' contrast ' + item.contrast.toFixed(2) + ' (' + item.color + ')'); assert(item.green, item.name + ' is not green: ' + item.color); }
      assert.match(readable.border, /rgba?\(114, 255, 98/);
      console.log(`  ${key} ${shot} panel contrast: ` + ['label 0', 'value 0', 'description', 'category line'].map(n => n + ' ' + readable.all.find(item => item.name === n).contrast.toFixed(1)).join(', '));
      assert.notEqual(copy.color, copy.valueColor); assert.match(copy.font, /monospace|Courier/i); assert(copy.ratio >= 1.6, 'line height ' + copy.ratio);
      assert.deepEqual(copy.order.slice(0, 3), ['eyebrow', 'lede', 'equipment-specifications']);
      const back = shotPage.getByRole('link', { name: 'RETURN TO EQUIPMENT' });
      assert.equal(await back.getAttribute('href'), '/projects/fixture/equipment');
      assert.equal(await shotPage.getByText('RETURN TO FACTIONS').count(), 0);
      assert(await shotPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const display = await shotPage.locator('.equipment-schematic-display').boundingBox();
      const panel = await shotPage.locator('.equipment-panel').boundingBox();
      assert(Math.abs(panel.y - (display.y + display.height)) < 1.01);
      await shotPage.screenshot({ path: path.join(output, `module-${key}-${shot}.png`), fullPage: true });
      await context.close();
    }
    console.log('PASS module screenshots', key);
  }

  // Laptop fit: the whole schematic and the whole spec list sit inside the project window without scrolling.
  for (const [label, width, height, scale] of [['1366x768', 1366, 768, 1], ['1440x900', 1440, 900, 1], ['1536x864', 1536, 864, 1], ['1920x1080@125%', 1536, 864, 1.25]]) {
    for (const slug of ['laptop-short', 'laptop']) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
      const lap = await context.newPage();
      await lap.goto(base + '/projects/fixture/equipment/' + slug);
      await lap.waitForSelector('.equipment-panel');
      await lap.waitForFunction(() => document.querySelector('.equipment-module')?.style.getPropertyValue('--video-max-h'));
      await lap.waitForTimeout(250);
      const m = await lap.evaluate(() => {
        const scroller = document.querySelector('.project-app-content'), rect = el => el.getBoundingClientRect();
        const module = document.querySelector('.equipment-module'), display = document.querySelector('.equipment-schematic-display'), panel = document.querySelector('.equipment-panel'), cols = getComputedStyle(document.querySelector('.equipment-specifications')).gridTemplateColumns.split(' ').length;
        const lastRow = [...document.querySelectorAll('.equipment-specifications > div')].pop();
        return { scrollable: scroller.scrollHeight - scroller.clientHeight, viewBottom: rect(scroller).bottom, moduleBottom: rect(module).bottom, displayBottom: rect(display).bottom, panelTop: rect(panel).top, lastRowBottom: rect(lastRow).bottom, displayTop: rect(display).top,
          moduleW: rect(module).width, displayW: rect(display).width, displayH: rect(display).height, cols, topSpace: rect(display).top - rect(scroller).top, hOverflow: document.documentElement.scrollWidth - innerWidth };
      });
      console.log(`  ${label} ${slug}: video ${Math.round(m.displayW)}x${Math.round(m.displayH)}, top space ${Math.round(m.topSpace)}px, window scroll ${Math.round(m.scrollable)}px, gap below module ${Math.round(m.viewBottom - m.moduleBottom)}px`);
      // Video and the whole spec list always fit; a long description sits below the specs and may extend past the fold.
      assert(m.displayBottom <= m.viewBottom, `${label} ${slug}: video bottom ${m.displayBottom} below the window bottom ${m.viewBottom}`);
      if (slug === 'laptop-short') assert(m.moduleBottom <= m.viewBottom, `${label} ${slug}: module bottom ${m.moduleBottom} below the window bottom ${m.viewBottom}`);
      assert(m.lastRowBottom <= m.viewBottom, label + ': last spec row not visible');
      if (slug === 'laptop-short') assert(m.scrollable <= 1, `${label}: window scrolls by ${m.scrollable}px`);
      assert(Math.abs(m.displayW / m.displayH - 2) < 0.03, label + ' ratio ' + m.displayW / m.displayH);
      assert(Math.abs(m.moduleW - m.displayW) <= 2.01, label + ': module width must follow the video');
      assert(Math.abs(m.panelTop - m.displayBottom) < 1.01, label + ': panel must stay flush');
      assert.equal(m.cols, 2, label + ': two spec columns');
      assert(m.hOverflow <= 0);
      if (slug === 'laptop-short' || label === '1366x768') await lap.screenshot({ path: path.join(output, `laptop-${label.replace('@', 'at')}-${slug}.png`) });
      await context.close();
    }
  }
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 1300 }, hasTouch: true });
    const mob = await context.newPage();
    await mob.goto(base + '/projects/fixture/equipment/laptop');
    await mob.waitForSelector('.equipment-panel');
    await mob.waitForTimeout(250);
    const m = await mob.evaluate(() => ({ cols: getComputedStyle(document.querySelector('.equipment-specifications')).gridTemplateColumns, capped: document.querySelector('.equipment-module').style.getPropertyValue('--video-max-h'), hOverflow: document.documentElement.scrollWidth - innerWidth }));
    assert(m.cols === 'none' || m.cols.split(' ').length === 1, 'mobile specs stay one column: ' + m.cols);
    assert.equal(m.capped, '', 'mobile is not height-capped');
    assert(m.hOverflow <= 0);
    await mob.screenshot({ path: path.join(output, 'laptop-390-mobile.png'), fullPage: true });
    await context.close();
    // Faction page: equipment cards fall back to the schematic poster, and the viewer-only "NO IMAGE" only appears with neither.
    const fac = await (await browser.newContext({ viewport: { width: 1440, height: 1400 } })).newPage();
    await fac.goto(base + '/projects/fixture/factions/company');
    await fac.waitForSelector('.desktop-file');
    const thumbs = await fac.locator('.desktop-file').evaluateAll(els => els.map(el => ({ text: el.textContent, src: el.querySelector('img')?.getAttribute('src') ?? null })));
    assert.equal(thumbs.find(t => /MP5/.test(t.text)).src, '/poster.svg', 'faction page card uses the poster');
    await fac.screenshot({ path: path.join(output, 'faction-company.png') });
    console.log('PASS laptop fit, mobile stack, faction poster cards');
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
