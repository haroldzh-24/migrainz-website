// Batch 14 (design canvas board 18, 01 DECODE) against a running seeded fixture (npm run test:regression starts one; so
// does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-decode.mjs
// Checks: a terminal page's heading decodes on a client-side arrival (noise first, the real title at the end), with the
// real title as its accessible name throughout and its size unchanged; once per page per visit (also across a reload);
// nothing on a first load, on "/", for headings in grey windows or on the grey-window desktop, for a missing page under
// a grey-window path (a missing terminal path does decode), with reduced motion or CRT off; blocked storage decodes
// once per page in that tab without errors; no sideways scroll at 390 and 320; no page errors.
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

const open = async ({ width = 1366, height = 768, reducedMotion = 'no-preference', blockStorage = false } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addInitScript(blocked => {
    try { sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); } catch {}
    if (blocked) {
      // After the announcement key, so the boot stays out of the way; then every storage call throws.
      const fail = () => { throw new DOMException('blocked', 'SecurityError'); };
      Storage.prototype.getItem = fail; Storage.prototype.setItem = fail;
    }
    // Each decode start/end, with the heading's box and what it showed at that moment.
    window.__decodes = [];
    window.addEventListener('migrainz:decode', event => {
      const h1 = document.querySelector('main#top h1');
      const box = h1?.getBoundingClientRect();
      const noise = h1?.querySelector('.decode-text');
      window.__decodes.push({ ...event.detail, path: location.pathname, width: box?.width, height: box?.height, visible: noise?.textContent ?? null,
        noiseHidden: noise?.getAttribute('aria-hidden') ?? null, real: h1?.querySelector(':scope > span:not(.decode-text)')?.textContent ?? null });
    });
  }, blockStorage);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const ready = page => page.locator('.startup-sequence').waitFor({ state: 'detached' });
const push = async (page, href) => { await page.evaluate(target => window.next.router.push(target), href); await page.waitForURL(url => new URL(url).pathname === href); };
const decodes = page => page.evaluate(() => window.__decodes);
const reset = page => page.evaluate(() => { window.__decodes = []; });
const ended = (page, text) => page.waitForFunction(title => window.__decodes.some(d => d.state === 'end' && d.text === title) && !document.querySelector('.decode-text'), text);
const heading = page => page.evaluate(() => { const h1 = document.querySelector('main#top h1'); const box = h1.getBoundingClientRect(); return { text: h1.textContent, width: box.width, height: box.height }; });

try {
  {
    const { context, page } = await open();
    // 1. First load: plain heading, no decode.
    await page.goto(base + '/tracker');
    await ready(page);
    await page.waitForTimeout(600);
    assert.deepEqual(await decodes(page), [], 'no decode on a first load');
    assert.equal((await heading(page)).text, 'PROJECT TRACKER');
    pass('first load: the heading is plain');

    // 2. Home → about by link: noise first, the real title at the end; accessible name and size unchanged.
    await push(page, '/');
    await reset(page);
    await page.locator('.terminal-nav a[href="/about"]').click();
    await page.waitForURL(/\/about$/);
    await ended(page, 'INFORMATION');
    const [start] = (await decodes(page)).filter(d => d.state === 'start');
    // At the first frame: noise of the same length is what shows; it is aria-hidden; the real title is still the
    // heading's own text (so its accessible name).
    assert.ok(start.visible !== null && start.visible !== 'INFORMATION', `noise shows first (${JSON.stringify(start)})`);
    assert.equal(start.visible.length, 'INFORMATION'.length, 'the noise has the title\'s length');
    assert.deepEqual([start.noiseHidden, start.real], ['true', 'INFORMATION'], 'noise hidden from screen readers; real title kept');
    const after = await heading(page);
    assert.equal(after.text, 'INFORMATION', 'plain text again at the end');
    assert.ok(Math.abs(start.width - after.width) < 1 && Math.abs(start.height - after.height) < 1, `same size during and after (${JSON.stringify({ start, after })})`);
    pass('client arrival: the heading decodes, keeps its accessible name and size, and ends as plain text');

    // 3. Once per page per visit: Back and forth, and a reload in the same tab, do not decode it again.
    await reset(page);
    await push(page, '/tracker');
    await ended(page, 'PROJECT TRACKER');
    await reset(page);
    await page.goBack();
    await page.waitForURL(/\/about$/);
    await page.waitForTimeout(1500);
    assert.deepEqual((await decodes(page)).filter(d => d.path === '/about'), [], 'no second decode of /about');
    await page.reload();
    await ready(page);
    await push(page, '/');
    await reset(page);
    await page.locator('.terminal-nav a[href="/about"]').click();
    await page.waitForURL(/\/about$/);
    await page.waitForTimeout(1500);
    assert.deepEqual(await decodes(page), [], 'no decode after a reload in the same visit');
    pass('once per page per visit (Back, and a reload in the same tab)');

    // 4. Grey windows and the grey-window desktop: never; a missing page under a grey path: no decode; a missing
    // terminal path: decodes.
    await reset(page);
    await push(page, '/projects');
    await page.waitForTimeout(2000);
    assert.equal(await page.locator('.decode-text').count(), 0, 'nothing decodes on the grey-window desktop');
    await push(page, '/tracker');
    await page.waitForTimeout(1500);
    assert.deepEqual(await decodes(page), [], 'arriving from the grey-window desktop: no decode (the switch plays)');
    await reset(page);
    await page.evaluate(() => window.next.router.push('/projects/no-such-project'));
    await page.waitForURL(/no-such-project/);
    await page.locator('main#top h1', { hasText: 'RECORD NOT FOUND' }).waitFor();
    await page.waitForTimeout(1500);
    assert.deepEqual(await decodes(page), [], 'missing page under a grey path: no decode');
    await push(page, '/tracker');
    await page.waitForTimeout(1500);
    await reset(page);
    await page.evaluate(() => window.next.router.push('/no-such-page'));
    await page.waitForURL(/no-such-page/);
    await ended(page, 'RECORD NOT FOUND');
    pass('grey-window desktop and grey-path 404: no decode; a missing terminal path: decodes');

    // 5. CRT off: no decode.
    await page.evaluate(() => { document.documentElement.dataset.crt = 'off'; });
    await reset(page);
    await push(page, '/patreon');
    await page.waitForTimeout(1500);
    assert.deepEqual(await decodes(page), [], 'CRT off: no decode');
    await page.evaluate(() => { document.documentElement.dataset.crt = 'on'; });
    pass('CRT off: no decode');
    await context.close();
  }

  // 6. Reduced motion: no decode.
  {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await page.goto(base + '/');
    await ready(page);
    await page.locator('.terminal-nav a[href="/tracker"]').click();
    await page.waitForURL(/\/tracker$/);
    await page.waitForTimeout(1500);
    assert.deepEqual(await decodes(page), [], 'reduced motion: no decode');
    pass('reduced motion: no decode');
    await context.close();
  }

  // 7. Blocked storage: decodes once per page in that tab, no errors.
  {
    const { context, page } = await open({ blockStorage: true });
    await page.goto(base + '/');
    // With storage blocked the announcement cannot remember being closed: it shows after the boot; Escape closes it.
    await page.locator('.startup-sequence[data-phase="announcement"]').waitFor();
    await page.keyboard.press('Escape');
    await ready(page);
    await page.locator('.terminal-nav a[href="/tracker"]').click();
    await page.waitForURL(/\/tracker$/);
    await ended(page, 'PROJECT TRACKER');
    await push(page, '/about');
    await ended(page, 'INFORMATION');
    await reset(page);
    await push(page, '/tracker');
    await page.waitForTimeout(1500);
    assert.deepEqual(await decodes(page), [], 'blocked storage: still once per page in this tab');
    pass('blocked storage: once per page in the tab, no errors');
    await context.close();
  }

  // 8. Phones: the heading keeps its height through the decode (wrapping included); no sideways scroll.
  for (const width of [390, 320]) {
    const { context, page } = await open({ width, height: 844 });
    await page.goto(base + '/');
    await ready(page);
    await push(page, '/tracker');
    await ended(page, 'PROJECT TRACKER');
    const [start] = (await decodes(page)).filter(d => d.state === 'start');
    const after = await heading(page);
    assert.ok(Math.abs(start.height - after.height) < 1, `height unchanged at ${width} (${start.height} → ${after.height})`);
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.ok(!sideways, `no sideways scroll at ${width}`);
    await context.close();
  }
  pass('phones: heading height unchanged through the decode, no sideways scroll at 390 and 320');

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-decode: all checks passed');
} finally {
  await browser.close();
}
