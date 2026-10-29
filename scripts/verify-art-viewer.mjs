// Batch 9 (design canvas boards 9 and 10) against a running seeded fixture (npm run test:regression starts one; so does
// node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-art-viewer.mjs
// Checks: the Art Viewer's caption panel (right of the canvas in a wide window, below it in a narrow one), the image
// position, the filmstrip's labels and current image, Left / Right between images (a zoomed image pans first), + / - / 0
// on the canvas, OPEN RECORD only away from the record's own page; artwork that is slow to arrive shows a blurred
// thumbnail and a DECODING label, then scans in (simply appears with reduced motion; a cached image shows at once), with
// the main image found by its class; media requests per image view counted.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = process.env.BASE_URL || process.argv[2];
if (!base || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error('Set BASE_URL to the local fixture server, e.g. http://127.0.0.1:3100'); process.exit(1); }
const require = createRequire(import.meta.url);
const playwright = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : require(require.resolve('playwright', { paths: process.env.PATH.split(path.delimiter).map(entry => path.dirname(entry)) }));
const out = path.resolve('test-results/batch-9-screens');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const ITEM = '/projects/blushland/equipment/fixture-scanner';
const errors = [];
const pass = message => console.log('PASS ' + message);
const open = async ({ width = 1366, height = 768, reducedMotion = 'no-preference' } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); } catch {}
    // Every time the decoding layers appear, note it (they can come and go between two checks).
    window.__seen = { decode: 0, label: 0, reveal: 0, scan: [] };
    new MutationObserver(() => {
      if (document.querySelector('.art-viewer-decode')) window.__seen.decode++;
      if (document.querySelector('.art-viewer-decoding')) window.__seen.label++;
      if (document.querySelector('img.art-viewer-image[data-reveal]')) window.__seen.reveal++;
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-reveal'] });
    // The scan lives 460 ms: its animation is recorded when it starts, not looked for afterwards (10b).
    addEventListener('animationstart', event => { if (event.target.matches?.('img.art-viewer-image')) window.__seen.scan.push(event.animationName); }, true);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const viewer = page => page.locator('.art-viewer-window');
const openViewer = async page => {
  await page.goto(base + ITEM);
  await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: /OPEN IN ART VIEWER/i }).click();
  await viewer(page).locator('img.art-viewer-image[style*="width"]').waitFor();
};

try {
  // 1. Caption panel, position, filmstrip, keys.
  {
    const { context, page } = await open();
    await openViewer(page);
    const v = viewer(page);
    assert.equal(await v.locator('.art-viewer-position').textContent(), 'IMAGE 1 / 2');
    assert.equal(await v.locator('.art-viewer-meta h2').textContent(), 'Fixture Scanner');
    assert.equal(await v.getByRole('group', { name: 'Fixture Scanner', exact: true }).count(), 1, 'caption group named by the record');
    assert.equal(await v.locator('.art-viewer-caption').textContent(), 'Synthetic concept one');
    const side = async () => v.evaluate(win => { const canvas = win.querySelector('.art-viewer-canvas').getBoundingClientRect(), meta = win.querySelector('.art-viewer-meta').getBoundingClientRect(); return { right: meta.left >= canvas.right - 1 && meta.top < canvas.bottom, below: meta.top >= canvas.bottom - 1 }; });
    // The window opens 900 px wide: the caption sits beside the canvas; maximized too.
    assert.ok((await side()).right, 'caption right of the canvas in a wide window');
    await v.getByRole('button', { name: /maximize/i }).first().click();
    assert.ok((await side()).right, 'caption right of the canvas when maximized');
    // Filmstrip.
    const thumbs = v.locator('.art-viewer-thumbs button');
    assert.equal(await v.locator('.art-viewer-thumbs').getAttribute('role'), 'group');
    assert.deepEqual(await thumbs.evaluateAll(buttons => buttons.map(button => [button.getAttribute('aria-label'), button.getAttribute('aria-current')])),
      [['Image 1 of 2: Synthetic schematic poster', 'true'], [await thumbs.nth(1).getAttribute('aria-label'), null]]);
    assert.match(await thumbs.nth(1).getAttribute('aria-label'), /^Image 2 of 2/);
    // Right shows the next image when the canvas is fitted; the strip follows; Right at the end does nothing.
    await thumbs.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.art-viewer-position').textContent === 'IMAGE 2 / 2');
    assert.equal(await thumbs.nth(1).getAttribute('aria-current'), 'true');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-current') === 'true', null, { timeout: 2000 });
    await page.keyboard.press('ArrowRight');
    assert.equal(await v.locator('.art-viewer-position').textContent(), 'IMAGE 2 / 2', 'stops at the last image');
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.querySelector('.art-viewer-position').textContent === 'IMAGE 1 / 2');
    // On the canvas: + zooms, a zoomed image pans with the arrows before any image change, 0 fits again.
    await v.locator('img.art-viewer-image[style*="width"]').waitFor();
    const canvas = v.locator('.art-viewer-canvas');
    await canvas.focus();
    const scale = () => v.locator('.art-viewer-toolbar output').getAttribute('data-scale').then(Number);
    const fitted = await scale();
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await page.waitForFunction(value => Number(document.querySelector('.art-viewer-window .art-viewer-toolbar output').dataset.scale) > value, fitted);
    await page.keyboard.press('ArrowRight');
    assert.equal(await v.locator('.art-viewer-position').textContent(), 'IMAGE 1 / 2', 'a zoomed image pans before the image changes');
    await page.keyboard.press('-');
    await page.keyboard.press('0');
    await page.waitForFunction(() => document.querySelector('.art-viewer-window .art-viewer-toolbar button[aria-pressed="true"]')?.textContent === 'FIT');
    // Keys work with focus anywhere in the window, not only on the canvas: + from a toolbar button zooms; a zoomed
    // image pans before the image changes.
    await v.getByRole('button', { name: 'FIT', exact: true }).focus();
    await page.keyboard.press('+');
    await page.waitForFunction(value => Number(document.querySelector('.art-viewer-window .art-viewer-toolbar output').dataset.scale) > value, fitted);
    await page.keyboard.press('0');
    // 10b: after a key changes the image, keyboard focus stays in the viewer (the picture and its toolbar are new
    // elements), so the next keys still work: click the picture, Right, then Left.
    await v.locator('.art-viewer-canvas').click();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.art-viewer-position').textContent === 'IMAGE 2 / 2');
    await page.waitForFunction(() => document.activeElement?.closest('.art-viewer-window') !== null && document.activeElement !== document.body);
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.querySelector('.art-viewer-position').textContent === 'IMAGE 1 / 2');
    // Filmstrip tiles keep their raised grey look with a mouse (board 9; the hover rule had made them transparent).
    assert.equal(await thumbs.nth(1).evaluate(button => getComputedStyle(button).backgroundColor), 'rgb(141, 145, 141)', 'filmstrip tile grey');
    // A short caption is not a tab stop; it takes focus only when it scrolls.
    assert.equal(await v.locator('.art-viewer-meta').getAttribute('tabindex'), null, 'short caption not focusable');
    // OPEN RECORD: absent on the record's own page, present elsewhere (the viewer reopens after a page load).
    assert.equal(await v.getByRole('link', { name: 'OPEN RECORD' }).count(), 0, 'no link to the page already shown');
    await page.screenshot({ path: path.join(out, 'art-viewer-1366-maximized.png') });
    await page.goto(base + '/about');
    await viewer(page).waitFor();
    assert.equal(await viewer(page).getByRole('link', { name: 'OPEN RECORD', exact: true }).getAttribute('href'), ITEM);
    pass('Art Viewer: caption beside the canvas, position, filmstrip labels and current image, ← → between images, + − 0, OPEN RECORD away from the record');
    await context.close();
  }

  // 2. Narrow window: caption below the canvas.
  {
    const { context, page } = await open({ width: 390, height: 844 });
    await openViewer(page);
    const below = await viewer(page).evaluate(win => { const canvas = win.querySelector('.art-viewer-canvas').getBoundingClientRect(), meta = win.querySelector('.art-viewer-meta').getBoundingClientRect(); return meta.top >= canvas.bottom - 1; });
    assert.ok(below, 'caption below the canvas at 390 px');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no sideways scroll');
    await page.screenshot({ path: path.join(out, 'art-viewer-390.png') });
    pass('Art Viewer at 390 px: caption below the canvas, no sideways scroll');
    await context.close();
  }

  // 3. Decoding: a slow image shows the blurred thumbnail and DECODING, then scans in; reduced motion just shows it.
  // The viewer is restored on /about from its saved tab in a fresh browser context, so nothing is cached (the item page
  // itself shows the same poster).
  const savedTabs = await (async () => {
    const { context, page } = await open();
    await openViewer(page);
    const value = await page.evaluate(() => sessionStorage.getItem('migrainz-art-viewer-tabs-v2'));
    await context.close();
    return value;
  })();
  assert.ok(savedTabs, 'viewer tab saved');
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const { context, page } = await open({ reducedMotion });
    await context.addInitScript(value => { try { sessionStorage.setItem('migrainz-art-viewer-tabs-v2', value); } catch {} }, savedTabs);
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let viewerSrc = null;
    const requested = [];
    page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/api/media/file/')) requested.push(url.pathname); });
    await page.route('**/api/media/file/**', async route => {
      const url = new URL(route.request().url());
      // Hold only the first large image, the one the canvas loads (400 px thumbnails must arrive to be the placeholder).
      if (route.request().resourceType() === 'image' && !/-400x\d+\./.test(url.pathname) && !viewerSrc) { viewerSrc = url.pathname; await gate; }
      await route.continue();
    });
    // The held image keeps the load event from firing until it is released.
    await page.goto(base + '/about', { waitUntil: 'domcontentloaded' });
    const v = viewer(page);
    await v.locator('.art-viewer-decoding').waitFor();
    assert.match(await v.locator('.art-viewer-decoding').textContent(), /^DECODING \S+/);
    await v.locator('img.art-viewer-decode').waitFor();
    const placeholder = await v.locator('img.art-viewer-decode').evaluate(el => ({ filter: getComputedStyle(el).filter, hidden: el.getAttribute('aria-hidden'), alt: el.getAttribute('alt'), src: new URL(el.src).pathname, width: el.getBoundingClientRect().width }));
    assert.match(placeholder.filter, /blur/);
    assert.deepEqual([placeholder.hidden, placeholder.alt], ['true', ''], 'placeholder is decoration');
    assert.ok(placeholder.width > 100, 'placeholder takes the image size');
    assert.notEqual(placeholder.src, viewerSrc, 'placeholder is the thumbnail, not the image being loaded');
    assert.equal(await v.locator('.art-viewer-toolbar output').textContent(), 'LOADING', 'screen readers hear LOADING');
    if (reducedMotion === 'no-preference') await page.screenshot({ path: path.join(out, 'art-viewer-decoding.png') });
    release();
    await v.locator('img.art-viewer-image[style*="width"]').waitFor();
    await page.waitForTimeout(100);
    const seenScan = await page.evaluate(() => ({ reveal: window.__seen.reveal, scan: window.__seen.scan }));
    if (reducedMotion === 'reduce') assert.deepEqual(seenScan.scan, [], 'reduced motion: no scan');
    else assert.ok(seenScan.reveal > 0 && seenScan.scan.includes('art-decode'), `the image scans in (${JSON.stringify(seenScan)})`);
    await page.waitForFunction(() => !document.querySelector('.art-viewer-decode, .art-viewer-scan, .art-viewer-decoding'));
    assert.ok(viewerSrc, 'the viewer derivative was held');
    // Cost (media is served private, no-store): one request per file; the placeholder reuses the copy the filmstrip
    // already loaded instead of fetching the thumbnail again.
    const repeats = requested.filter((file, index) => requested.indexOf(file) !== index);
    assert.deepEqual(repeats, [], 'no media file requested twice in one image view');
    if (reducedMotion === 'no-preference') console.log(`  media requests for one image view with the strip: ${requested.length} (${[...new Set(requested)].map(file => file.split('/').pop()).join(', ')})`);
    await context.close();
  }
  // A cached image shows at once: no placeholder, no label, no scan.
  {
    const { context, page } = await open();
    await openViewer(page);
    await viewer(page).getByRole('button', { name: /Close Fixture Scanner/ }).click();
    await page.evaluate(() => { window.__seen = { decode: 0, label: 0, reveal: 0, scan: [] }; });
    await page.getByRole('button', { name: /OPEN IN ART VIEWER/i }).click();
    await viewer(page).locator('img.art-viewer-image[style*="width"]').waitFor();
    await page.waitForTimeout(400);
    assert.deepEqual(await page.evaluate(() => ({ decode: window.__seen.decode, label: window.__seen.label })), { decode: 0, label: 0 }, 'cached image: no decoding layers');
    assert.equal(await viewer(page).locator('img.art-viewer-image[data-reveal]').count(), 0);
    await context.close();
  }
  pass('decoding: blurred thumbnail and DECODING while the image is slow, then the scan (none with reduced motion, none from cache)');

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-art-viewer: all checks passed');
} finally {
  await browser.close();
}
