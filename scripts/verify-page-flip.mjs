// Batch 15 (rework plan: comic reader page flip) against a running seeded fixture (npm run test:regression starts one;
// so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-page-flip.mjs
// Checks: NEXT turns the page (overlay drawn over the page area only, gone at its end event, about 550 ms); the counter
// and the page underneath change at once; a second NEXT mid-flip ends two pages on with one overlay; PREV brings the
// earlier page back (drawn), PREV after GO TO with the page ready also flips; arrow keys and GO TO flip; the overlay sits
// inside the page row in the wide (one bar row) and narrow layouts, never over the title bar or toolbars; reduced motion
// and CRT off: no overlay; focus stays where it was (also the first/last page case); the busy flag is set while
// turning; no sideways scroll at 390 and 320; no page errors.
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
const out = path.resolve('test-results/batch-15-screens');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const errors = [];
const pass = message => console.log('PASS ' + message);
const READER = '/comics/blushland/chapter-01';

const open = async ({ width = 1366, height = 768, reducedMotion = 'no-preference' } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); } catch {}
    // Each flip start/end, with what was on screen at that moment. window.__holdFlip stops time at the first frame.
    window.__flips = [];
    // 15b: a frame after each start, whether the canvas really has pixels drawn (the fixture pages are same-origin).
    window.__drawn = [];
    window.addEventListener('migrainz:page-flip', event => {
      if (event.detail.state === 'start') setTimeout(() => {
        const canvas = document.querySelector('.page-flip canvas');
        let painted = 0;
        try {
          const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
          for (let i = 3; i < data.length; i += 64) if (data[i] > 0) painted++;
        } catch { painted = -1; }
        window.__drawn.push(painted);
      }, 120);
      const holder = document.querySelector('.page-flip');
      const box = holder && !holder.hidden ? holder.getBoundingClientRect() : null;
      window.__flips.push({ ...event.detail, at: performance.now(), shown: Boolean(box), box: box && { x: box.x, y: box.y, w: box.width, h: box.height },
        busy: document.documentElement.dataset.busy ?? null, src: document.querySelector('.comic-page-stage img.art-viewer-image')?.getAttribute('src') ?? null });
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const ready = page => page.locator('.startup-sequence').waitFor({ state: 'detached' });
const flips = page => page.evaluate(() => window.__flips);
const reset = page => page.evaluate(() => { window.__flips = []; });
const ended = (page, count = 1) => page.waitForFunction(n => window.__flips.filter(f => f.state === 'end').length >= n && document.querySelector('.page-flip')?.hidden !== false, count);
const loaded = page => page.waitForFunction(() => { const image = document.querySelector('.comic-page-stage img.art-viewer-image'); return image && image.complete && image.naturalWidth > 0 && image.style.visibility !== 'hidden'; });
const boxes = page => page.evaluate(() => {
  const rect = selector => { const element = document.querySelector(selector); if (!element) return null; const box = element.getBoundingClientRect(); return { x: box.x, y: box.y, w: box.width, h: box.height, bottom: box.bottom, right: box.right }; };
  return { area: rect('.comic-page-stage .art-viewer-canvas'), title: rect('.comic-reader-window .retro-window-titlebar'), toolbar: rect('.comic-reader-window .reader-toolbar'), bar: rect('.comic-reader-navigation') };
});
const next = page => page.getByRole('button', { name: 'NEXT', exact: true }).first();
const prev = page => page.getByRole('button', { name: 'PREV', exact: true }).first();
const near = (a, b) => Math.abs(a - b) < 1.5;

try {
  for (const [width, height, layout] of [[1366, 768, 'wide'], [390, 844, 'narrow']]) {
    const { context, page } = await open({ width, height });
    await page.goto(base + READER);
    await ready(page);
    await loaded(page);
    // 1. NEXT: the overlay covers exactly the page area, the new page is underneath at once, gone at the end.
    await reset(page);
    await next(page).click();
    await page.waitForFunction(() => window.__flips.some(f => f.state === 'start'));
    const [start] = await flips(page);
    const area = (await boxes(page)).area;
    assert.equal(start.direction, 'next');
    assert.ok(start.shown && near(start.box.x, area.x) && near(start.box.y, area.y) && near(start.box.w, area.w) && near(start.box.h, area.h), `${layout}: overlay over the page area only (${JSON.stringify({ start, area })})`);
    // The start event fires just before the page changes (the outgoing page is captured first); a frame later the new
    // page is in place under the still-turning overlay.
    await page.waitForFunction(() => /02\.svg/.test(document.querySelector('.comic-page-stage img.art-viewer-image')?.getAttribute('src') ?? '') && document.querySelector('.page-flip')?.hidden === false);
    assert.equal(start.busy, 'page-turn', 'busy while turning');
    await page.waitForFunction(() => window.__drawn.length > 0);
    assert.ok((await page.evaluate(() => window.__drawn[0])) > 50, 'the turning page is really drawn on the canvas');
    assert.equal(await page.locator('.comic-reader-navigation output').textContent(), 'PAGE 2 / 3', 'counter changes at once');
    const parts = await boxes(page);
    assert.ok(start.box.y >= parts.title.bottom - 0.5, `${layout}: not over the title bar`);
    if (parts.toolbar) assert.ok(start.box.y >= parts.toolbar.bottom - 0.5, `${layout}: not over the size toolbar`);
    await ended(page);
    const end = (await flips(page)).find(f => f.state === 'end');
    const took = end.at - start.at;
    assert.ok(took > 400 && took < 1200, `${layout}: about 550 ms (${Math.round(took)} ms)`);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.busy ?? null), null, 'busy cleared');
    if (layout === 'wide') {
      // 2. Mid-flip screenshot for the record, then a second NEXT mid-flip ends two pages on (one overlay).
      await prev(page).click();
      await ended(page, 2);
      await loaded(page);
      await reset(page);
      await next(page).click();
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, 'page-flip-1366-mid.png') });
      await next(page).click();
      await ended(page, 2);
      assert.equal(await page.locator('.comic-reader-navigation output').textContent(), 'PAGE 3 / 3', 'two NEXTs: page 3');
      // 15b: the second click really finished the first turn (its end comes with the second start, not ~550 ms later).
      const pair = await flips(page);
      const firstEnd = pair.find(f => f.state === 'end'), secondStart = pair.filter(f => f.state === 'start')[1];
      if (secondStart.at - pair[0].at < 500) assert.ok(Math.abs(firstEnd.at - secondStart.at) < 50, 'the first turn ended when the second began');
      pass('wide: a second NEXT mid-flip finishes the first and ends on page 3');
      // 3. PREV brings the earlier page back (drawn), and focus stays on PREV.
      await reset(page);
      await prev(page).focus();
      await page.keyboard.press('Enter');
      await ended(page);
      const back = await flips(page);
      assert.deepEqual(back.map(f => [f.state, f.direction]), [['start', 'prev'], ['end', 'prev']], 'PREV flips back');
      // 15b: PREV really animated (a timed-out wait would end within ~300 ms).
      assert.ok(back[1].at - back[0].at > 450, `PREV turned for its full length (${Math.round(back[1].at - back[0].at)} ms)`);
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'PREV', 'focus stays on PREV');
      // 4. Arrow keys and GO TO flip; GO TO is one flip in the direction of travel.
      await loaded(page);
      await reset(page);
      await page.locator('.comic-page-stage .art-viewer-canvas').focus();
      await page.keyboard.press('ArrowRight');
      await ended(page);
      await loaded(page);
      await page.getByLabel('Go to page').selectOption({ value: '0' });
      await ended(page, 2);
      assert.deepEqual((await flips(page)).filter(f => f.state === 'start').map(f => f.direction), ['next', 'prev'], 'arrow key and GO TO flip');
      // 5. At the last page NEXT is disabled; focus kept (11b), no flip.
      await page.getByLabel('Go to page').selectOption({ value: '2' });
      await ended(page, 3);
      await reset(page);
      await page.locator('.comic-page-stage .art-viewer-canvas').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
      assert.deepEqual(await flips(page), [], 'no flip past the last page');
      assert.ok(await page.evaluate(() => document.activeElement?.closest('.comic-page-stage, .comic-reader-content') !== null), 'focus stays in the reader');
      // 15b: panning or a click on the page during a turn finishes it at once.
      await page.getByLabel('Go to page').selectOption({ value: '0' });
      await ended(page, 1);
      await loaded(page);
      await reset(page);
      await next(page).click();
      await page.waitForFunction(() => window.__flips.some(f => f.state === 'start'));
      await page.locator('.comic-page-stage .art-viewer-canvas').dispatchEvent('pointerdown');
      await ended(page);
      const cut = await flips(page);
      assert.ok(cut[1].at - cut[0].at < 300, `a press on the page ends the turn at once (${Math.round(cut[1].at - cut[0].at)} ms)`);
      // The canvas memory is released between turns.
      assert.deepEqual(await page.evaluate(() => { const c = document.querySelector('.page-flip canvas'); return [c.width, c.height]; }), [0, 0], 'canvas memory released');
      pass('wide: PREV, arrow keys and GO TO flip; focus kept; nothing past the last page');
    }
    if (layout === 'narrow') {
      await loaded(page);
      await reset(page);
      await next(page).click().catch(() => {});
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, 'page-flip-390-mid.png') });
      await ended(page).catch(() => {});
    }
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.ok(!sideways, `${layout}: no sideways scroll`);
    pass(`${layout}: NEXT flips over the page area only, the new page underneath at once, gone after ~550 ms`);
    await context.close();
  }

  // 6. 320 px: no sideways scroll during a flip.
  {
    const { context, page } = await open({ width: 320, height: 640 });
    await page.goto(base + READER);
    await ready(page);
    await loaded(page);
    await next(page).click();
    await page.waitForTimeout(200);
    assert.ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), '320: no sideways scroll mid-flip');
    await ended(page);
    pass('320 px: no sideways scroll mid-flip');
    await context.close();
  }

  // 7. Reduced motion and CRT off: the page turns at once, no overlay.
  {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await page.goto(base + READER);
    await ready(page);
    await loaded(page);
    await next(page).click();
    await page.waitForTimeout(300);
    assert.deepEqual(await flips(page), [], 'reduced motion: no flip');
    await context.close();
  }
  {
    const { context, page } = await open();
    await page.goto(base + READER);
    await ready(page);
    await loaded(page);
    await page.evaluate(() => { document.documentElement.dataset.crt = 'off'; });
    await next(page).click();
    await page.waitForTimeout(300);
    assert.deepEqual(await flips(page), [], 'CRT off: no flip');
    assert.equal(await page.locator('.comic-reader-navigation output').textContent(), 'PAGE 2 / 3');
    await context.close();
  }
  pass('reduced motion and CRT off: an instant turn');

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-page-flip: all checks passed');
} finally {
  await browser.close();
}
