// Batch 28: the comic page flip plays while pages load, and the next page is preloaded. Against a running seeded fixture
// (npm run test:regression starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-page-flip-slow.mjs
// Media requests are held or delayed with Playwright routes. Checks: NEXT pressed while the page on screen is still
// LOADING turns a plain sheet (drawn, about 550 ms); once a page has loaded the next page's request is made (preload),
// the previous page is not fetched again, and NEXT then shows the new page at once (no LOADING, no new request); PREV to
// an earlier page that is not ready within 300 ms still turns (a plain sheet, full length); OS reduced motion: an instant
// turn even while loading. The ±1 limit, classified pages and Save-Data are unit-tested in scripts/verify-page-preload.ts
// (the fixture chapter has three public pages).
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
const out = path.resolve('test-results/batch-28');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const errors = [];
const pass = message => console.log('PASS ' + message);
const READER = '/comics/blushland/chapter-01';
const PAGE = /\/api\/media\/file\/(0\d)\.svg$/;

const open = async ({ width = 1366, height = 768, reducedMotion = 'no-preference' } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); } catch {}
    window.__flips = [];
    window.__drawn = [];
    window.addEventListener('migrainz:page-flip', event => {
      window.__flips.push({ ...event.detail, at: performance.now(), output: document.querySelector('.comic-reader-window .reader-toolbar output')?.textContent ?? null });
      if (event.detail.state === 'start') setTimeout(() => {
        const canvas = document.querySelector('.page-flip canvas');
        let painted = 0;
        try {
          const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
          for (let i = 3; i < data.length; i += 64) if (data[i] > 0) painted++;
        } catch { painted = -1; }
        window.__drawn.push(painted);
      }, 120);
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  // Page image requests in order, by page number; and per page a gate (held until opened) or a delay.
  const requests = [];
  const gates = new Map();
  let delay = 0;
  page.on('request', request => { const match = new URL(request.url()).pathname.match(PAGE); if (match) requests.push(match[1]); });
  await page.route(url => PAGE.test(url.pathname), async route => {
    const number = new URL(route.request().url()).pathname.match(PAGE)[1];
    const gate = gates.get(number);
    if (gate) await gate.promise;
    else if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    await route.continue().catch(() => {});
  });
  const hold = number => { let open; const promise = new Promise(resolve => { open = resolve; }); gates.set(number, { promise, open }); };
  const release = number => { gates.get(number)?.open(); gates.delete(number); };
  return { context, page, requests, hold, release, setDelay: ms => { delay = ms; } };
};
const ready = page => page.locator('.startup-sequence').waitFor({ state: 'detached' });
const flips = page => page.evaluate(() => window.__flips);
const reset = page => page.evaluate(() => { window.__flips = []; window.__drawn = []; });
const ended = (page, count = 1) => page.waitForFunction(n => window.__flips.filter(f => f.state === 'end').length >= n && document.querySelector('.page-flip')?.hidden !== false, count);
const output = page => page.locator('.comic-reader-window .reader-toolbar output');
const shown = (page, number) => page.waitForFunction(n => {
  const image = document.querySelector('.comic-page-stage img.art-viewer-image');
  return image && image.getAttribute('src')?.endsWith(`/${n}.svg`) && image.complete && image.naturalWidth > 0 && image.style.visibility !== 'hidden';
}, number);
const next = page => page.getByRole('button', { name: 'NEXT', exact: true }).first();
const prev = page => page.getByRole('button', { name: 'PREV', exact: true }).first();
const count = (requests, number) => requests.filter(item => item === number).length;

try {
  // 1. NEXT while the page on screen is still LOADING: a plain sheet turns; then preloading.
  for (const [width, height] of [[1366, 768], [390, 844]]) {
    const { context, page, requests, hold, release, setDelay } = await open({ width, height });
    hold('01');
    await page.goto(base + READER, { waitUntil: 'domcontentloaded' });
    await ready(page);
    await page.waitForFunction(() => document.querySelector('.comic-reader-window .reader-toolbar output')?.textContent === 'LOADING');
    assert.deepEqual(requests, ['01'], `${width}: nothing preloaded before the page on screen has loaded (${requests})`);
    setDelay(700);
    await reset(page);
    await next(page).click();
    await page.waitForFunction(() => window.__flips.some(f => f.state === 'start'));
    const [start] = await flips(page);
    assert.equal(start.direction, 'next');
    assert.equal(start.sheet, 'plain', `${width}: the loading page turns as a plain sheet (${JSON.stringify(start)})`);
    assert.equal(start.output, 'LOADING', 'the turn started while the page was loading');
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(out, `page-flip-slow-${width}-mid.png`) });
    await page.waitForFunction(() => window.__drawn.length > 0);
    assert.ok((await page.evaluate(() => window.__drawn[0])) > 50, `${width}: the plain sheet is really drawn`);
    await ended(page);
    const end = (await flips(page)).find(f => f.state === 'end');
    assert.ok(end.at - start.at > 400 && end.at - start.at < 1500, `${width}: a full turn (${Math.round(end.at - start.at)} ms)`);
    assert.equal(await page.locator('.comic-reader-navigation output').textContent(), 'PAGE 2 / 3');
    pass(`${width}: NEXT while LOADING turns a plain sheet for its full length`);
    release('01');
    await shown(page, '02');
    // Page 2 is on screen: page 3 is preloaded; page 1 (already loaded in this document) is not fetched again.
    await page.waitForTimeout(200);
    assert.equal(count(requests, '03'), 1, `${width}: the next page is requested once page 2 is shown (${requests})`);
    assert.equal(count(requests, '01'), 1, `${width}: the previous page is not fetched again (${requests})`);
    assert.equal(count(requests, '02'), 1, `${width}: page 2 once (${requests})`);
    // After the preload has arrived, NEXT shows page 3 at once: no LOADING, no new request.
    await page.waitForTimeout(900);
    await reset(page);
    await next(page).click();
    await ended(page);
    const [turn] = await flips(page);
    assert.equal(turn.sheet, 'page', 'page 2 itself turns');
    await shown(page, '03');
    const toolbar = await output(page).textContent();
    assert.notEqual(toolbar, 'LOADING', 'page 3 shown without LOADING');
    assert.equal(count(requests, '03'), 1, `${width}: page 3 came from the preload, no second request (${requests})`);
    assert.deepEqual([...new Set(requests)].sort(), ['01', '02', '03'], 'only the chapter\'s pages');
    pass(`${width}: next page preloaded once the page is shown; NEXT shows it at once, no new request`);
    await context.close();
  }

  // 2. PREV to an earlier page that is not ready within 300 ms still turns (a plain sheet, full length).
  {
    const { context, page, requests, hold, release } = await open();
    hold('02');
    await page.goto(base + READER);
    await ready(page);
    await shown(page, '01');
    // Page 2's preload is held. Jump to page 3 (one turn), then PREV to page 2, still loading.
    await page.getByLabel('Go to page').selectOption({ value: '2' });
    await ended(page);
    await shown(page, '03');
    await reset(page);
    await prev(page).click();
    await page.waitForFunction(() => window.__flips.some(f => f.state === 'start'));
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(out, 'page-flip-slow-prev-1366-mid.png') });
    await ended(page);
    const back = await flips(page);
    assert.deepEqual(back.map(f => [f.state, f.direction]), [['start', 'prev'], ['end', 'prev']], 'PREV flips');
    assert.equal(back[1].sheet, 'plain', `the earlier page, not ready, comes back as a plain sheet (${JSON.stringify(back)})`);
    assert.ok(back[1].at - back[0].at > 700, `PREV waited up to 300 ms, then turned for its full length (${Math.round(back[1].at - back[0].at)} ms)`);
    assert.ok(await page.evaluate(() => window.__drawn[0] > 50), 'drawn');
    assert.equal(count(requests, '02'), 1, `page 2 requested once, by the preload (${requests})`);
    release('02');
    await shown(page, '02');
    pass('PREV with a slow earlier page turns a plain sheet; the real page appears when it loads');
    await context.close();
  }

  // 3. OS reduced motion: still an instant turn while loading.
  {
    const { context, page, hold, release } = await open({ reducedMotion: 'reduce' });
    hold('01');
    await page.goto(base + READER, { waitUntil: 'domcontentloaded' });
    await ready(page);
    await page.waitForFunction(() => document.querySelector('.comic-reader-window .reader-toolbar output')?.textContent === 'LOADING');
    await next(page).click();
    await page.waitForTimeout(300);
    assert.deepEqual(await flips(page), [], 'reduced motion: no flip');
    assert.equal(await page.locator('.comic-reader-navigation output').textContent(), 'PAGE 2 / 3');
    release('01');
    pass('reduced motion: an instant turn while loading');
    await context.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-page-flip-slow: all checks passed');
} finally {
  await browser.close();
}
