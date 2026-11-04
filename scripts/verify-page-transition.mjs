// Batch 13 (design canvas board 19) against a running seeded fixture (npm run test:regression starts one; so does
// node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-page-transition.mjs
// Checks: moving between terminal pages wipes the new page in from the top when going deeper or to the same depth and
// from the bottom when going back up, only across the part on screen, with the band leading the clip edge (CRT "on");
// the attribute, clip and band are gone when the animation ends; nothing for the first load, the boot's power-on
// (simulated by its class), arrival at "/", or the grey-window desktop; reduced motion and CRT off: a cut; CRT "reduced":
// no band; two quick moves restart; Enter on a link works the same; amber band colours; no sideways scroll at 320 px.
// 13b: Back always wipes up (also at the same depth, also without the Navigation API), Forward down; query-only changes
// and grey → terminal moves never wipe; a move to "/" cancels a running wipe.
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
const out = path.resolve('test-results/batch-13-screens');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const errors = [];
const pass = message => console.log('PASS ' + message);
const open = async ({ width = 1366, height = 768, reducedMotion = 'no-preference', noNavigationApi = false } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  // Browsers without the Navigation API: Back is told from a trail of visited paths instead (13b).
  if (noNavigationApi) await context.addInitScript(() => { Object.defineProperty(window, 'navigation', { value: undefined, configurable: true }); });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); } catch {}
    // Each page-enter event, with what the page showed one frame later. window.__pauseAt (ms) freezes the wipe and band
    // animations at that point for measuring.
    window.__enters = [];
    window.addEventListener('migrainz:page-enter', event => {
      const record = { ...event.detail, at: performance.now() };
      window.__enters.push(record);
      requestAnimationFrame(() => {
        const main = document.querySelector('main#top');
        record.attr = main.getAttribute('data-page-enter');
        record.animation = getComputedStyle(main).animationName;
        record.band = Boolean(document.querySelector('.page-band'));
        if (typeof window.__pauseAt === 'number') for (const animation of wipes()) { animation.pause(); animation.currentTime = window.__pauseAt; }
      });
    });
    const wipes = () => document.getAnimations().filter(animation => /^page-(enter|band)-/.test(animation.animationName ?? ''));
    window.finishWipes = () => { for (const animation of wipes()) animation.finish(); };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const ready = async page => { await page.locator('.startup-sequence').waitFor({ state: 'detached' }); };
const enters = page => page.evaluate(() => window.__enters.map(({ direction, animated, from, to, attr, animation, band }) => ({ direction, animated, from, to, attr, animation, band })));
const reset = page => page.evaluate(() => { window.__enters = []; });
const push = async (page, href) => { await page.evaluate(target => window.next.router.push(target), href); await page.waitForURL(url => new URL(url).pathname === href); };
const settled = page => page.waitForFunction(() => !document.querySelector('main#top').hasAttribute('data-page-enter') && !document.querySelector('.page-band') && getComputedStyle(document.querySelector('main#top')).clipPath === 'none');
const last = async page => { await page.waitForFunction(() => window.__enters.length && 'attr' in window.__enters.at(-1)); return (await enters(page)).at(-1); };

try {
  {
    const { context, page } = await open();
    await page.goto(base + '/');
    await ready(page);
    assert.deepEqual(await enters(page), [], 'nothing on the first load');
    // 1. Home → tracker: deeper, wipe down with the band; gone after the animation.
    await page.locator('.terminal-nav a[href="/tracker"]').click();
    let enter = await last(page);
    assert.deepEqual([enter.direction, enter.animated, enter.attr, enter.animation, enter.band], ['down', true, 'down', 'page-enter-down', true], JSON.stringify(enter));
    await settled(page);
    const took = await page.evaluate(() => performance.now() - window.__enters.at(-1).at);
    assert.ok(took >= 400 && took < 1500, `gone when the animation ends (${Math.round(took)} ms after the move)`);
    pass('home → tracker: wipe down with the band, gone at the end');

    // 2. Same depth (tracker → about) wipes down; deeper (about → equipment directory) down; Back up a level wipes up.
    await reset(page);
    await push(page, '/about');
    enter = await last(page);
    assert.deepEqual([enter.direction, enter.attr], ['down', 'down'], 'same depth wipes down');
    await settled(page);
    await push(page, '/projects/blushland/equipment');
    enter = await last(page);
    assert.equal(enter.direction, 'down', 'deeper wipes down');
    await settled(page);
    await page.goBack();
    await page.waitForURL(/\/about$/);
    enter = await last(page);
    assert.deepEqual([enter.direction, enter.attr, enter.animation, enter.band], ['up', 'up', 'page-enter-up', true], 'Back up a level wipes up');
    await settled(page);
    pass('same depth and deeper wipe down; Back up a level wipes up');

    // 2b (13b, Harold 2026-11-04: Back always from the bottom). Back to a page at the same depth wipes up; Forward again
    // wipes down; a link up to a shallower page wipes up.
    await reset(page);
    await page.goBack();
    await page.waitForURL(/\/tracker$/);
    enter = await last(page);
    assert.deepEqual([enter.direction, enter.attr], ['up', 'up'], 'Back at the same depth wipes up');
    await settled(page);
    await page.goForward();
    await page.waitForURL(/\/about$/);
    enter = await last(page);
    assert.equal(enter.direction, 'down', 'Forward at the same depth wipes down');
    await settled(page);
    await push(page, '/projects/blushland/equipment');
    await settled(page);
    await page.locator('.breadcrumbs a[href="/tracker"]').click();
    await page.waitForURL(/\/tracker$/);
    enter = await last(page);
    assert.equal(enter.direction, 'up', 'a link up to a shallower page wipes up');
    await settled(page);
    pass('Back always wipes up (also at the same depth); Forward wipes down; a link up a level wipes up');

    // 2c (13b). A query-only change is not a move; a wipe still running is cancelled by a move to "/" (no wipe there).
    await push(page, '/patreon');
    await settled(page);
    await reset(page);
    await page.evaluate(() => window.next.router.push('/patreon?status=signed-out'));
    await page.waitForURL(/status=signed-out/);
    await page.waitForTimeout(600);
    assert.deepEqual(await enters(page), [], 'no wipe for a query-only change');
    // 14b: Back to "/" (a history move, quick) while the tracker's wipe is held: the wipe must be gone well before its
    // 1200 ms safety timer could have ended it (a held animation never finishes by itself).
    await push(page, '/');
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.__pauseAt = 100; });
    await push(page, '/tracker');
    await last(page);
    assert.equal(await page.locator('main#top').getAttribute('data-page-enter'), 'down', 'the held wipe is running');
    await page.evaluate(() => { window.__pauseAt = undefined; });
    await page.goBack();
    await page.waitForURL(url => new URL(url).pathname === '/');
    await page.waitForFunction(() => !document.querySelector('main#top').hasAttribute('data-page-enter') && !document.querySelector('.page-band'));
    const gone = await page.evaluate(() => performance.now() - window.__enters.at(-1).at);
    assert.ok(gone < 1100, `the held wipe was cancelled by the move, not by its safety timer (${Math.round(gone)} ms)`);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('main#top')).clipPath), 'none', 'no clip left on the home screen');
    pass('query-only change: no wipe; a move to the home screen cancels a running wipe');

    // 3. Nothing on arrival at "/" or for the grey-window desktop (the switch plays there).
    await reset(page);
    await push(page, '/');
    await page.waitForTimeout(600);
    assert.deepEqual(await enters(page), [], 'no wipe into the main open screen');
    await page.locator('.terminal-nav a[href="/projects"]').click();
    await page.waitForURL(/\/projects$/);
    await page.waitForTimeout(1500);
    assert.deepEqual(await enters(page), [], 'no wipe into the grey-window desktop');
    pass('nothing on arrival at the home screen or the grey-window desktop');

    // 4. During the boot's power-on (its class on <main>, simulated): nothing.
    await page.goto(base + '/');
    await ready(page);
    await page.evaluate(() => document.querySelector('main#top').classList.add('power-on'));
    await push(page, '/tracker');
    await page.waitForTimeout(600);
    assert.deepEqual(await enters(page), [], 'no wipe during the power-on');
    await page.evaluate(() => document.querySelector('main#top').classList.remove('power-on'));
    pass('nothing during the boot power-on (simulated by its class)');

    // 5. Two quick moves: the first wipe is held mid-way (so the second move surely lands during it); the second
    // restarts the wipe, and the first one's end does not cut it short (13b: no fixed sleep).
    await reset(page);
    await page.evaluate(() => { window.__pauseAt = 150; });
    await push(page, '/about');
    await last(page);
    assert.equal(await page.locator('main#top').getAttribute('data-page-enter'), 'down', 'the first wipe is running');
    await page.evaluate(() => { window.__pauseAt = undefined; });
    await push(page, '/patreon');
    await page.waitForFunction(() => window.__enters.length === 2 && 'attr' in window.__enters[1]);
    assert.equal((await enters(page))[1].attr, 'down', 'the second wipe starts');
    await settled(page);
    pass('two quick moves: the second wipe restarts and runs to its end');

    // 5b (13b). From the grey-window desktop back to a terminal page: the switch plays, never a wipe.
    await push(page, '/projects');
    await page.waitForTimeout(1500);
    await reset(page);
    await push(page, '/tracker');
    await page.waitForTimeout(1500);
    assert.deepEqual(await enters(page), [], 'no wipe from the grey-window desktop');
    pass('grey-window desktop → terminal page: no wipe');

    // 6. Enter on a focused link works the same.
    await page.goto(base + '/');
    await ready(page);
    await reset(page);
    await page.locator('.terminal-nav a[href="/about"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/about$/);
    enter = await last(page);
    assert.deepEqual([enter.direction, enter.animated], ['down', true], 'Enter on a link wipes down');
    await settled(page);
    pass('Enter on a link: the same wipe');

    // 7. CRT "reduced": the wipe without the band; CRT "off": a cut. Amber: the band uses the amber colours.
    for (const [crt, animated, band] of [['reduced', true, false], ['off', false, false]]) {
      await page.evaluate(mode => { document.documentElement.dataset.crt = mode; }, crt);
      await reset(page);
      await push(page, '/tracker');
      enter = await last(page);
      assert.deepEqual([enter.animated, enter.band, enter.attr], [animated, band, animated ? 'down' : null], `CRT ${crt}`);
      await settled(page);
      await push(page, '/');
    }
    await page.evaluate(() => { document.documentElement.dataset.crt = 'on'; document.documentElement.dataset.phosphor = 'amber'; window.__pauseAt = 200; });
    await reset(page);
    await push(page, '/tracker');
    await last(page);
    const colour = await page.evaluate(() => getComputedStyle(document.querySelector('.page-band i')).backgroundImage);
    assert.match(colour, /rgba\(255, 224, 176, 0\.95\)/, `amber band (${colour})`);
    await page.evaluate(() => { finishWipes(); window.__pauseAt = undefined; document.documentElement.dataset.phosphor = 'green'; });
    await settled(page);
    pass('CRT reduced: no band; CRT off: a cut; amber band colours');
    await context.close();
  }

  // 8. A tall page on a phone: only the part on screen is wiped, and the band leads the clip edge (both paused at
  // 230 ms). No sideways scroll at 390 or 320 during the wipe.
  for (const width of [390, 320]) {
    const { context, page } = await open({ width, height: 844 });
    await page.goto(base + '/');
    await ready(page);
    await page.evaluate(() => { window.__pauseAt = 230; });
    await push(page, '/tracker');
    await last(page);
    const measure = await page.evaluate(() => {
      const main = document.querySelector('main#top'), box = main.getBoundingClientRect();
      // The bottom inset mid-wipe: "inset(0px 0px calc(100% - 691px))" (edge 691 px below main's top) or plain px.
      // 13b: the other three sides sit far outside main, e.g. "inset(-844px -844px calc(100% - 691px) -844px)".
      const clip = getComputedStyle(main).clipPath;
      const fromTop = clip.match(/calc\(100% - ([\d.]+)px\)/);
      const parts = clip.replace(/^inset\(|\)$/g, '').split(/\s+/).map(parseFloat);
      const edge = fromTop ? box.top + parseFloat(fromTop[1]) : box.bottom - parts[2];
      const tabs = document.querySelector('.phone-tabs').getBoundingClientRect();
      return { clip, edge, band: document.querySelector('.page-band i').getBoundingClientRect().bottom, mainHeight: box.height, view: innerHeight, tabsTop: tabs.top, sideways: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(measure.mainHeight > measure.view, `the tracker is taller than the screen (${JSON.stringify(measure)})`);
    assert.ok(measure.edge > 100 && measure.edge < measure.tabsTop, `the clip edge is on screen mid-wipe (${JSON.stringify(measure)})`);
    assert.ok(Math.abs(measure.band - measure.edge) <= 2, `the band leads the clip edge (${JSON.stringify(measure)})`);
    // 13b/14b: only the moving edge clips; the other sides sit outside main (negative insets).
    const sides = measure.clip.replace(/calc\([^)]*\)/, 'X').replace(/^inset\(|\)$/g, '').split(/\s+/).filter(part => part !== 'X').map(parseFloat);
    assert.ok(sides.length >= 2 && sides.every(value => value < 0), `the other three sides are outside main (${measure.clip})`);
    assert.ok(!measure.sideways, `no sideways scroll at ${width}`);
    if (width === 390) await page.screenshot({ path: path.join(out, 'page-wipe-390.png') });
    await page.evaluate(() => { finishWipes(); window.__pauseAt = undefined; });
    await settled(page);
    await context.close();
  }
  pass('tall page on phones: the visible part is wiped, the band leads the edge, no sideways scroll at 390 and 320');

  // 8b (13b). A first load straight onto a terminal page: no wipe. Without the Navigation API, Back at the same depth
  // still wipes up (the trail of visited paths).
  {
    const { context, page } = await open({ noNavigationApi: true });
    await page.goto(base + '/tracker');
    await ready(page);
    assert.equal(await page.evaluate(() => window.navigation), undefined, 'the Navigation API is really hidden (the fallback runs)');
    await page.waitForTimeout(800);
    assert.deepEqual(await enters(page), [], 'nothing on a first load of /tracker');
    await push(page, '/about');
    await settled(page);
    await reset(page);
    await page.goBack();
    await page.waitForURL(/\/tracker$/);
    const enter = await last(page);
    assert.equal(enter.direction, 'up', 'without the Navigation API, Back still wipes up');
    await settled(page);
    pass('first load of a terminal page: no wipe; without the Navigation API, Back still wipes up');
    await context.close();
  }

  // 9. Reduced motion: a cut (the event says so; no attribute, no band).
  {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await page.goto(base + '/');
    await ready(page);
    await page.locator('.terminal-nav a[href="/tracker"]').click();
    const enter = await last(page);
    assert.deepEqual([enter.animated, enter.attr, enter.band], [false, null, false], 'reduced motion: a cut');
    pass('reduced motion: a cut');
    await context.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-page-transition: all checks passed');
} finally {
  await browser.close();
}
