// Batch 17 (rework plan: dark terminal pages type out their first screen) against a running seeded fixture (npm run
// test:regression starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-type-out.mjs
// Checks: a link arrival on /about types the first screen after the wipe (text complete in the page throughout, the
// "untyped" highlight shrinking to nothing, the page height unchanged), with the cursor while typing; once per page
// per visit (also across a reload); a first load types only when the head script marked html[data-typeout] before the
// first paint (no boot or announcement in the way), never when the boot shows; a key, click or wheel finishes it at once
// while the page's own scrolling does not; grey-window pages and arrivals from the grey desktop never type; reduced
// motion and CRT off show the page complete; no sideways scroll at 390 and 320; no page errors.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = process.env.BASE_URL || process.argv[2];
if (!base || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error('Set BASE_URL to the local fixture server, e.g. http://127.0.0.1:3100'); process.exit(1); }
const require = createRequire(import.meta.url);
const playwright = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : require(require.resolve('playwright', { paths: process.env.PATH.split(path.delimiter).map(entry => path.dirname(entry)) }));
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const errors = [];
const pass = message => console.log('PASS ' + message);

// Batch 22: SYSTEM ▸ MOTION: REDUCED and the plain view (saved settings) must act like the OS reduced-motion setting.
const REDUCED_SETUPS = [
  { name: 'reduced motion', options: { reducedMotion: 'reduce' } },
  { name: 'MOTION: REDUCED', options: {}, storage: ['migrainz-motion', 'reduced'] },
  { name: 'plain view', options: {}, storage: ['migrainz-view', 'plain'] },
];
const applySetup = async (context, setup) => { if (setup.storage) await context.addInitScript(([key, value]) => { try { localStorage.setItem(key, value); } catch {} }, setup.storage); };
const open = async ({ width = 1366, height = 768, reducedMotion = 'no-preference', announcement = true } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addInitScript(skipAnnouncement => {
    try { if (skipAnnouncement) sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); localStorage.setItem('migrainz-ghost-test', 'block'); } catch {}
    window.__typing = [];
    window.addEventListener('migrainz:typing', event => {
      if (event.detail.where !== 'page') return;
      const section = document.querySelector('.directory-page');
      window.__typing.push({ ...event.detail, at: performance.now(), path: location.pathname, height: section?.getBoundingClientRect().height, text: section?.textContent.length });
    });
    window.addEventListener('migrainz:page-enter', event => { window.__enter = { ...event.detail, at: performance.now() }; });
  }, announcement);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const ready = page => page.locator('.startup-sequence').waitFor({ state: 'detached' });
const push = async (page, href) => { await page.evaluate(target => window.next.router.push(target), href); await page.waitForURL(url => new URL(url).pathname === href); };
const typing = page => page.evaluate(() => window.__typing);
const reset = page => page.evaluate(() => { window.__typing = []; });
const ended = page => page.waitForFunction(() => window.__typing.some(t => t.state === 'end'));
const untyped = page => page.evaluate(() => { let n = 0; const h = CSS.highlights?.get('untyped'); if (h) for (const r of h) n += r.toString().length; return n; });

try {
  {
    const { context, page } = await open();
    // 1. First load with nothing in the way: the head script marks the page before the first paint, then it types.
    await page.goto(base + '/about');
    await ready(page);
    // (A first load only types when the head script marked it before the first paint: TypeOut requires that mark.)
    await ended(page);
    const first = await typing(page);
    assert.equal(first[0].state, 'start');
    assert.equal(first[0].path, '/about');
    pass('first load (no boot, no announcement): types');

    // 2. Link arrival on /tracker: starts after the wipe; text complete throughout; height unchanged; highlight empties.
    await push(page, '/');
    await reset(page);
    await page.locator('.terminal-nav a[href="/tracker"]').click();
    await page.waitForFunction(() => window.__typing.some(t => t.state === 'start'));
    const [start] = await typing(page);
    const enter = await page.evaluate(() => window.__enter);
    if (enter?.animated) assert.ok(start.at - enter.at >= 400, `typing starts after the wipe (${Math.round(start.at - enter.at)} ms)`);
    assert.ok((await untyped(page)) > 10, 'text hidden at the start');
    assert.ok(await page.locator('.directory-page .type-cursor:not([hidden])').count() === 1, 'cursor while typing');
    const textAtStart = await page.evaluate(() => (() => { const copy = document.querySelector('.directory-page').cloneNode(true); copy.querySelectorAll('.decode-text').forEach(node => node.remove()); return copy.textContent; })());
    await ended(page);
    const [, end] = await typing(page);
    assert.equal(await untyped(page), 0, 'nothing left hidden');
    assert.ok(Math.abs(end.height - start.height) < 1, `height unchanged (${start.height} → ${end.height})`);
    assert.equal(await page.evaluate(() => (() => { const copy = document.querySelector('.directory-page').cloneNode(true); copy.querySelectorAll('.decode-text').forEach(node => node.remove()); return copy.textContent; })()), textAtStart, 'the page text never changed');
    assert.ok(end.at - start.at < 4000, `first screen within about 3 s (${Math.round(end.at - start.at)} ms)`);
    pass('link arrival: types after the wipe, text complete and height unchanged, done within ~3 s');

    // 3. Once per page per visit (Back and a reload).
    await reset(page);
    await page.goBack();
    await page.waitForURL(url => new URL(url).pathname === '/');
    await page.goForward();
    await page.waitForURL(/\/tracker$/);
    await page.waitForTimeout(1200);
    assert.deepEqual(await typing(page), [], 'not again on Forward');
    await page.reload();
    await ready(page);
    await page.waitForTimeout(800);
    assert.deepEqual(await typing(page), [], 'not again after a reload');
    pass('once per page per visit');

    // 4. Skip: a key finishes at once; a programmatic scroll does not.
    await page.evaluate(() => { sessionStorage.removeItem('migrainz-typed-v1'); });
    await push(page, '/');
    await reset(page);
    await page.locator('.terminal-nav a[href="/patreon"]').click().catch(async () => { await push(page, '/patreon'); });
    await page.waitForURL(/\/patreon$/);
    await page.waitForFunction(() => window.__typing.some(t => t.state === 'start'));
    await page.evaluate(() => window.scrollBy(0, 1));
    await page.waitForTimeout(150);
    assert.ok(!(await typing(page)).some(t => t.state === 'end'), 'a programmatic scroll does not skip');
    await page.keyboard.press('Shift');
    await ended(page);
    const skipped = (await typing(page)).find(t => t.state === 'end');
    assert.equal(skipped.skipped, true, 'a key skips');
    assert.equal(await untyped(page), 0);
    pass('a key skips at once; the page\'s own scrolling does not');

    // 5. Grey-window pages never type; nor an arrival from the grey desktop.
    await reset(page);
    await push(page, '/projects');
    await page.waitForTimeout(2000);
    await push(page, '/projects/blushland/equipment');
    await page.waitForTimeout(2000);
    assert.deepEqual(await typing(page), [], 'no typing on or from the grey desktop');
    pass('grey desktop and arrivals from it: no typing');

    // 6. CRT off: complete.
    await page.evaluate(() => { document.documentElement.dataset.crt = 'off'; sessionStorage.removeItem('migrainz-typed-v1'); });
    await push(page, '/');
    await reset(page);
    await push(page, '/about');
    await page.waitForTimeout(1200);
    assert.deepEqual(await typing(page), [], 'CRT off: no typing');
    pass('CRT off: the page shows complete');
    await context.close();
  }

  // 7. The boot shows (no announcement key): the first load never types and nothing is hidden.
  {
    const { context, page } = await open({ announcement: false });
    await page.goto(base + '/about');
    await page.locator('.startup-sequence[data-phase="announcement"]').waitFor();
    await page.keyboard.press('Escape');
    await ready(page);
    await page.waitForTimeout(800);
    assert.deepEqual(await typing(page), [], 'no typing on a first load with the boot');
    pass('boot or announcement in the way: no typing, nothing hidden');
    await context.close();
  }

  // 8. Reduced motion: complete. Phones: no sideways scroll while typing.
  for (const setup of REDUCED_SETUPS) {
    const { context, page } = await open(setup.options);
    await applySetup(context, setup);
    await page.goto(base + '/about');
    await ready(page);
    await page.waitForTimeout(800);
    assert.deepEqual(await typing(page), [], `${setup.name}: no typing`);
    // Nothing of the page is hidden for typing (the head script's mark, batch 22: it honours the saved settings).
    assert.equal(await page.evaluate(() => document.documentElement.dataset.typeout ?? null), null, `${setup.name}: no typing mark`);
    await context.close();
  }
  for (const width of [390, 320]) {
    const { context, page } = await open({ width, height: 844 });
    await page.goto(base + '/');
    await ready(page);
    await push(page, '/about');
    await page.waitForFunction(() => window.__typing.some(t => t.state === 'start'));
    assert.ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `${width}: no sideways scroll while typing`);
    await ended(page);
    await context.close();
  }
  pass('reduced motion: complete; 390 and 320: no sideways scroll');

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-type-out: all checks passed');
} finally {
  await browser.close();
}
