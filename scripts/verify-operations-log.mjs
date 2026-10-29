// Batch 12 (design canvas board 12) against a running seeded fixture (npm run test:regression starts one; so does
// node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-operations-log.mjs
// Checks: the tracker's operations log lists the public updates of every public project newest first, one line each,
// with a link to its project and the update's own thumbnail when it has one, and never the REDACTED or PATRON sentinel
// text; a first visit marks nothing new; a returning visit marks the updates this browser had not seen, keeps the marks
// after opening a project and coming Back, and records them as seen; blocked storage still shows the log; 390 and 320 px
// have no sideways scroll; no duplicate-key errors from two updates on one day.
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
const out = path.resolve('test-results/batch-12-screens');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const errors = [];
const pass = message => console.log('PASS ' + message);
const SEEN = 'migrainz-operations-seen-v1';
const open = async ({ width = 1366, height = 768, blockStorage = false } = {}) => {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(([block]) => {
    try { sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); } catch {}
    if (block) Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage blocked'); } });
  }, [blockStorage]);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /same key|unique "key"/i.test(message.text())) errors.push(message.text()); });
  return { context, page };
};
const ready = async page => { await page.locator('.startup-sequence').waitFor({ state: 'detached' }); await page.locator('.operations-log').waitFor(); };
const rows = page => page.locator('.operations-log li').evaluateAll(items => items.map(item => ({
  date: item.querySelector('time')?.getAttribute('datetime'), text: item.querySelector('.operations-log-text').textContent.replace(/\s+/g, ' ').trim(),
  href: item.querySelector('a').getAttribute('href'), link: item.querySelector('a').textContent, isNew: item.hasAttribute('data-new'), thumb: Boolean(item.querySelector('img.operations-log-thumb')),
})));

try {
  // 1. First visit: the list, no NEW.
  {
    const { context, page } = await open();
    const response = await page.goto(base + '/tracker');
    const html = await response.text();
    for (const sentinel of ['SENTINEL-UPDATE-REDACTED-7Q', 'SENTINEL-UPDATE-REDACTED-DESC-7Q', 'SENTINEL-UPDATE-PATRON-7Q', 'SENTINEL-UPDATE-PATRON-DESC-7Q'])
      assert.ok(!html.includes(sentinel), `${sentinel} not in the page`);
    await ready(page);
    await page.waitForTimeout(300);
    const list = await rows(page);
    assert.ok(list.length >= 6, `the public updates are listed (${list.length})`);
    const dates = list.map(row => row.date);
    assert.deepEqual(dates, [...dates].sort().reverse(), 'newest first');
    assert.ok(list.some(row => row.href === '/projects/stalker') && list.some(row => row.href === '/projects/blushland'), 'updates of both projects');
    assert.equal(list.filter(row => row.date === '2026-08-20').length, 2, 'two updates on one day');
    assert.ok(list.some(row => row.thumb && /cover rough/.test(row.text)), 'the update with an image shows its thumbnail');
    assert.ok(list.every(row => !row.isNew), 'first visit: nothing new');
    assert.match(list[0].link, /^OPEN [A-Z0-9-]+ ▸$/);
    assert.equal(await page.locator('.operations-log li a').first().evaluate(link => link.querySelector('[aria-hidden="true"]')?.textContent), ' ▸');
    assert.match(await page.locator('.operations-log-status').textContent(), /^LATEST \d{4}-\d{2}-\d{2}$/);
    assert.equal(await page.locator('.operations-log ol').getAttribute('role'), 'list');
    const seen = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SEEN);
    assert.ok(Array.isArray(seen) && seen.length >= list.length, 'the shown updates are recorded as seen');
    await page.screenshot({ path: path.join(out, 'operations-1366.png') });
    pass('operations log: public updates of every project newest first, link, thumbnail, no sentinels; first visit marks nothing new');

    // 2. Returning visit: two updates this browser had not seen are NEW, also after OPEN and Back; then seen.
    await page.evaluate(([key, list]) => { localStorage.setItem(key, JSON.stringify(list)); sessionStorage.removeItem('migrainz-operations-baseline-v1'); }, [SEEN, seen.slice(2)]);
    await page.reload();
    await ready(page);
    await page.waitForFunction(() => document.querySelectorAll('.operations-log li[data-new]').length === 2);
    assert.equal(await page.locator('.operations-log-status').textContent(), '2 NEW SINCE YOUR LAST VISIT');
    assert.equal(await page.locator('.operations-log li[data-new] .operations-log-new').first().textContent(), 'NEW');
    await page.screenshot({ path: path.join(out, 'operations-new-1366.png') });
    await page.locator('.operations-log li a').first().click();
    await page.waitForURL(url => new URL(url).pathname !== '/tracker');
    await page.goBack();
    await page.waitForURL(/\/tracker$/);
    await ready(page);
    await page.waitForFunction(() => document.querySelectorAll('.operations-log li[data-new]').length === 2);
    const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SEEN);
    assert.ok(seen.every(id => after.includes(id)), 'all updates now recorded as seen');
    pass('returning visit: unseen updates marked NEW (also after OPEN and Back), then recorded as seen');
    await context.close();
  }

  // 3. Storage blocked: the log still shows, without NEW.
  {
    const { context, page } = await open({ blockStorage: true });
    await page.goto(base + '/tracker');
    await ready(page);
    await page.waitForTimeout(300);
    assert.ok((await rows(page)).length >= 6 && (await rows(page)).every(row => !row.isNew), 'log without NEW');
    pass('blocked storage: the log works without NEW');
    await context.close();
  }

  // 4. Phones: no sideways scroll.
  for (const width of [390, 320]) {
    const { context, page } = await open({ width, height: 844 });
    await page.goto(base + '/tracker');
    await ready(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no sideways scroll at ${width}`);
    if (width === 390) await page.locator('.operations-log').screenshot({ path: path.join(out, 'operations-390.png') });
    await context.close();
  }
  pass('390 and 320 px: no sideways scroll');

  assert.deepEqual(errors, [], 'no page errors or duplicate-key errors');
  await policies.check();
  console.log('verify-operations-log: all checks passed');
} finally {
  await browser.close();
}
