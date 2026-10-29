// Batch 11 (design canvas board 10, left half) against a running seeded fixture (npm run test:regression starts one; so
// does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-nav-status.mjs
// Checks: a terminal page that is slow to arrive shows the ACCESSING status after about 300 ms (and screen readers get
// "Loading ..." from a status region that is always there), and it goes when the page arrives; a fast (already compiled)
// page never shows it; nor does the switch to the grey-window desktop, a link marked data-mode-switch="off" that only
// runs its own handler, or a file or admin link; the homepage terminal's cd to a terminal page shows it when slow.
// 11b: the switch's mode-stage event and a page restored from the back/forward cache end it (both simulated by
// dispatching the event); after 20 s it says so and goes; at 320 px every line fits and the waiting time shows; reduced
// motion: no fade or blink.
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
const out = path.resolve('test-results/batch-11-screens');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const errors = [];
const pass = message => console.log('PASS ' + message);
const open = async ({ width = 1366, height = 768 } = {}) => {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); } catch {}
    // Every time the status panel appears, note it (it can come and go between two checks).
    window.__status = 0;
    new MutationObserver(() => { if (document.querySelector('.nav-status')) window.__status++; }).observe(document, { childList: true, subtree: true });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const ready = async page => { await page.locator('.startup-sequence').waitFor({ state: 'detached' }); };
// A same-origin link added to the page, so each case clicks a plain anchor (next/link-free) to a chosen href.
const probe = (page, href, attributes = {}) => page.evaluate(([target, extra]) => {
  document.getElementById('probe-link')?.remove();
  const link = document.createElement('a');
  link.id = 'probe-link'; link.href = target; link.textContent = 'probe';
  for (const [name, value] of Object.entries(extra)) link.setAttribute(name, value);
  document.querySelector('main').prepend(link);
}, [href, attributes]);
const seen = page => page.evaluate(() => window.__status);
// One predicate object, so unroute removes exactly the route it added (Playwright matches routes by reference).
const aboutData = url => url.pathname === '/about';
const hold = ms => async request => { await new Promise(resolve => setTimeout(resolve, ms)); await request.continue().catch(() => {}); };
const linesFit = page => page.locator('.nav-status p').evaluateAll(lines => lines.every(line => line.scrollWidth <= line.clientWidth + 1));
const reset = page => page.evaluate(() => { window.__status = 0; });

try {
  {
    const { context, page } = await open();
    // 1. Fast: under `next dev` every dynamic page takes a second or more, so a fast arrival is simulated: the click is
    // kept from navigating and the address changes 100 ms later, as a quick page would. Nothing may show.
    await page.goto(base + '/');
    await ready(page);
    await reset(page);
    await probe(page, '/tracker');
    await page.locator('#probe-link').evaluate(link => link.addEventListener('click', event => {
      event.preventDefault();
      setTimeout(() => history.pushState(null, '', '/tracker'), 100);
    }));
    await page.locator('#probe-link').click();
    await page.waitForTimeout(800);
    assert.equal(await seen(page), 0, 'no status when the page arrives within 300 ms');
    // 2. Slow: hold the page data for /about for 1.5 s.
    await page.goto(base + '/');
    await ready(page);
    await page.route(aboutData, hold(1500));
    const started = Date.now();
    await page.locator('.terminal-nav a[href="/about"]').click(); // a real next/link: the page data comes from /about?_rsc
    await page.locator('.nav-status').waitFor();
    const after = Date.now() - started;
    assert.ok(after >= 250, `status waits about 300 ms (${after} ms)`);
    assert.equal(await page.locator('.nav-status p').first().textContent(), '> ACCESSING SYS:/ABOUT');
    assert.equal(await page.locator('.nav-status').getAttribute('aria-hidden'), 'true', 'the panel itself is decoration');
    assert.match(await page.locator('[role="status"].visually-hidden', { hasText: 'Loading' }).textContent(), /^Loading page: about$/);
    assert.ok(!(await page.locator('.nav-status').textContent()).includes(' ok'), 'no "ok" that nothing measured');
    await page.screenshot({ path: path.join(out, 'nav-status-1366.png') });
    await page.waitForURL(/\/about$/);
    await page.locator('.nav-status').waitFor({ state: 'detached' });
    await page.unroute(aboutData);
    pass('slow page: status after about 300 ms, announced, gone on arrival; fast page: no status');

    // 2b. The switch taking the screen, and a page shown again from the back/forward cache, end the status at once.
    for (const kind of ['mode-stage', 'pageshow']) {
      await page.goto(base + '/');
      await ready(page);
      await page.route(aboutData, hold(4000));
      await page.locator('.terminal-nav a[href="/about"]').click();
      await page.locator('.nav-status').waitFor();
      await page.evaluate(which => window.dispatchEvent(which === 'pageshow' ? new PageTransitionEvent('pageshow', { persisted: true }) : new Event('migrainz:mode-stage')), kind);
      await page.locator('.nav-status').waitFor({ state: 'detached', timeout: 500 });
      // After mode-stage the held request goes on and the page arrives. A (simulated) back/forward-cache restore also
      // resets Next's router to the shown page, which drops the pending navigation; wait out the hold either way.
      if (kind === 'mode-stage') await page.waitForURL(/\/about$/);
      else await page.waitForTimeout(4500);
      await page.unroute(aboutData);
    }
    pass('the switch starting and a back/forward-cache restore end the status (events simulated)');

    // 3. Not for the switch to the desktop, a data-mode-switch="off" link, a file or the admin.
    await page.goto(base + '/');
    await ready(page);
    await reset(page);
    await page.locator('.terminal-nav a[href="/projects"]').click();
    await page.waitForURL(/\/projects$/);
    await page.waitForTimeout(1200);
    assert.equal(await seen(page), 0, 'no status during the switch');
    await page.goto(base + '/about');
    await ready(page);
    await reset(page);
    await probe(page, '/tracker', { 'data-mode-switch': 'off' });
    await page.locator('#probe-link').evaluate(link => link.addEventListener('click', event => event.preventDefault()));
    await page.locator('#probe-link').click();
    await page.waitForTimeout(700);
    assert.equal(await seen(page), 0, 'a link that handles its own click shows nothing');
    for (const href of ['/robots.txt', '/admin']) {
      await probe(page, href);
      await page.locator('#probe-link').evaluate(link => link.addEventListener('click', event => event.preventDefault()));
      await page.locator('#probe-link').click();
      await page.waitForTimeout(500);
      assert.equal(await seen(page), 0, `no status for ${href}`);
    }
    pass('no status for the desktop switch, opted-out links, files or the admin');

    // 4. The homepage terminal's cd to a terminal page, slow.
    await page.goto(base + '/');
    await ready(page);
    await page.route(aboutData, hold(1500));
    await page.locator('#home-terminal-input').fill('cd about');
    await page.locator('#home-terminal-input').press('Enter');
    await page.locator('.nav-status').waitFor();
    await page.waitForURL(/\/about$/);
    await page.locator('.nav-status').waitFor({ state: 'detached' });
    await page.unroute(aboutData);
    pass('homepage terminal: a slow cd shows the status too');
    await context.close();
  }
  // 5. Phone: the panel fits and sits clear of the tab bar; reduced motion: no fade and no blink.
  {
    const { context, page } = await open({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base + '/');
    await ready(page);
    await page.route(aboutData, hold(1500));
    await page.locator('.terminal-nav a[href="/about"]').click();
    await page.locator('.nav-status').waitFor();
    const box = await page.locator('.nav-status').evaluate(el => { const r = el.getBoundingClientRect(), bar = document.querySelector('.phone-tabs').getBoundingClientRect(); return { left: r.left, right: r.right, bottom: r.bottom, bar: bar.top, width: innerWidth }; });
    assert.ok(box.left >= 0 && box.right <= box.width && box.bottom < box.bar, `panel on screen and above the tab bar (${JSON.stringify(box)})`);
    assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.querySelector('.nav-status')).animationName, getComputedStyle(document.querySelector('.nav-status-cursor')).animationName]), ['none', 'none'], 'reduced motion: no fade, no blink');
    assert.ok(await linesFit(page), 'every line fits at 390 px');
    await page.screenshot({ path: path.join(out, 'nav-status-390.png') });
    await page.waitForURL(/\/about$/);
    pass('phone: the status fits and stays clear of the tab bar; reduced motion: no fade or blink');
    await context.close();
  }
  // 6. 320 px, a page that does not answer: every line fits (the waiting time always shows); after 20 s the status says
  // so, then goes; the page may still arrive later.
  {
    const { context, page } = await open({ width: 320, height: 640 });
    await page.goto(base + '/');
    await ready(page);
    await page.route(aboutData, hold(26000));
    await page.locator('.terminal-nav a[href="/about"]').click();
    await page.locator('.nav-status').waitFor();
    await page.waitForTimeout(500);
    assert.ok(await linesFit(page), 'every line fits at 320 px');
    assert.match(await page.locator('.nav-status p').nth(2).innerText(), /waiting for node \d+\.\d s$/);
    await page.locator('.nav-status p', { hasText: 'no answer yet' }).waitFor({ timeout: 25000 });
    assert.ok(await linesFit(page), 'the 20 s line fits at 320 px');
    assert.match(await page.locator('[role="status"].visually-hidden', { hasText: 'Loading' }).textContent(), /no answer yet$/);
    await page.screenshot({ path: path.join(out, 'nav-status-320.png') });
    await page.locator('.nav-status').waitFor({ state: 'detached', timeout: 4000 });
    assert.ok(!/\/about$/.test(page.url()), 'gone after 22 s while the page is still on its way');
    pass('320 px: every line fits; after 20 s it says no answer yet, then goes');
    await page.unroute(aboutData);
    await context.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-nav-status: all checks passed');
} finally {
  await browser.close();
}
