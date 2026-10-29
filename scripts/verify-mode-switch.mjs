// Terminal ↔ desktop switch (design canvas boards 2 and 14, batch 7) against a running seeded fixture (npm run
// test:regression starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node --import tsx scripts/verify-mode-switch.mjs (tsx: it imports lib/graphics-mode.ts)
// Checks: a link from the terminal to a grey-window route plays the whole forward run every time (print, collapse,
// line, black, reveal) and lands on the teal desktop with the window below the header and the ◂ TERMINAL button; the
// button, browser Back and RETURN TO TERMINAL play the reverse; browser Forward plays the flick; a key skips; links
// between desktop routes and a direct load play nothing; reduced motion and CRT off crossfade; the homepage terminal
// uses the switch; the route list (lib/graphics-mode.ts) matches the pages' own markers; phone width.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import { isGraphicsPath } from '../lib/graphics-mode.ts';

const base = process.env.BASE_URL || process.argv[2];
if (!base || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error('Set BASE_URL to the local fixture server, e.g. http://127.0.0.1:3100'); process.exit(1); }
const require = createRequire(import.meta.url);
const playwright = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : require(require.resolve('playwright', { paths: process.env.PATH.split(path.delimiter).map(entry => path.dirname(entry)) }));
const out = path.resolve('test-results/mode-switch-screens');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const announcementKey = 'migrainz-announcement:studio-transmission-001';
const DESKTOP = 'rgb(46, 70, 70)';
const errors = [];
const pass = message => console.log('PASS ' + message);

const open = async ({ width = 1366, height = 768, reducedMotion = 'no-preference', crt } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addInitScript(([key, mode]) => {
    try {
      sessionStorage.setItem(key, 'studio-transmission-001');
      if (mode) localStorage.setItem('crt-effects', mode);
    } catch {}
    // Record every stage the switch starts, in order (ModeSwitch announces each one, also those too short to paint).
    window.__stages = [];
    addEventListener('migrainz:mode-stage', event => { window.__stages.push({ stage: event.detail, at: performance.now() }); });
  }, [announcementKey, crt]);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const stages = page => page.evaluate(() => window.__stages.map(entry => entry.stage));
const reset = page => page.evaluate(() => { window.__stages = []; });
const idle = page => page.locator('.mode-switch').waitFor({ state: 'hidden' });
const desktop = async page => {
  await page.locator('.graphics-route').waitFor({ state: 'attached' });
  return page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
};
// One screen pixel, read from a 1x1 PNG screenshot (decoded here: a data: image in the page would trip the CSP check).
const pixel = async (page, x, y) => {
  const png = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
  const chunks = [];
  let colourType = 0;
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at), type = png.toString('ascii', at + 4, at + 8);
    if (type === 'IHDR') colourType = png[at + 17];
    if (type === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  assert.ok(colourType === 2 || colourType === 6, 'RGB(A) screenshot');
  const row = inflateSync(Buffer.concat(chunks)); // one scanline: a filter byte, then the pixel (no neighbours to undo)
  return [row[1], row[2], row[3]];
};
const FORWARD = ['print', 'collapse', 'line', 'black', 'reveal', 'idle'];
const REVERSE = ['rblack', 'rline', 'ropen', 'idle'];

try {
  // 1. Forward from the homepage directory, every time; reverse from ◂ TERMINAL and from browser Back.
  {
    const { page } = await open();
    // The fixture runs `next dev`: compile every route this script opens first, so timings are not first-compile ones.
    for (const route of ['/projects', '/projects/blushland', '/archive', '/comics', '/about', '/']) await page.goto(base + route);
    await page.locator('.home-screen').waitFor();
    for (const round of [1, 2]) {
      await reset(page);
      await page.locator('.terminal-nav a[data-channel="projects"]').click();
      await page.locator('.mode-switch-log li', { hasText: '$ open projects.db' }).waitFor();
      await page.locator('.mode-switch[data-stage="black"]').waitFor({ state: 'attached' });
      assert.equal(await page.locator('.mode-switch-log').count(), 0, 'the mount log is gone once the screen is black');
      await page.waitForURL(/\/projects$/);
      await idle(page);
      assert.deepEqual(await stages(page), FORWARD, `round ${round}: the whole forward run plays`);
      assert.equal(await desktop(page), DESKTOP, 'teal desktop behind the window');
      const geometry = await page.evaluate(() => ({
        header: document.querySelector('.topbar').getBoundingClientRect().bottom,
        window: document.querySelector('.project-application').getBoundingClientRect().top,
        taskbar: getComputedStyle(document.querySelector('.taskbar-terminal')).display,
      }));
      assert.ok(geometry.window >= geometry.header, `window starts below the header (${JSON.stringify(geometry)})`);
      assert.notEqual(geometry.taskbar, 'none', '◂ TERMINAL shows on the desktop');
      if (round === 1) {
        await page.screenshot({ path: path.join(out, 'desktop-1366.png') });
        // The teal reaches the bottom of the screen: the strip between the maximized window and the taskbar.
        const [red, green, blue] = await pixel(page, 200, 715);
        assert.ok(green > 30 && Math.abs(green - blue) < 10 && green > red + 10, `teal below the window, not the terminal black (rgb ${red},${green},${blue})`);
        // SYSTEM stays usable over a maximized window (board 14): the dropdown opens whole and takes clicks.
        await page.locator('.system-menu-button').click();
        const menu = await page.locator('.system-menu-panel').boundingBox();
        assert.ok(menu && menu.height > 60, `SYSTEM menu opens in full (${JSON.stringify(menu)})`);
        assert.ok(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.system-menu-panel'), { x: menu.x + menu.width / 2, y: menu.y + menu.height - 8 }), 'the menu is on top of the window');
        await page.keyboard.press('Escape');
      }
      await reset(page);
      if (round === 1) { await page.locator('.taskbar-terminal').focus(); await page.keyboard.press('Enter'); }
      else await page.goBack();
      await page.waitForURL(url => new URL(url).pathname === '/');
      await idle(page);
      assert.deepEqual(await stages(page), REVERSE, `round ${round}: the reverse plays (${round === 1 ? '◂ TERMINAL' : 'Back'})`);
      assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), DESKTOP, 'terminal again');
      assert.equal(await page.locator('.taskbar-terminal').evaluate(el => getComputedStyle(el).display), 'none', '◂ TERMINAL hidden on the terminal');
      if (round === 1) assert.equal(await page.evaluate(() => document.activeElement?.id), 'top', 'keyboard focus lands on the page, not <body>');
    }
    pass('forward run every time; reverse from ◂ TERMINAL and from Back');

    // Forward button: the flick.
    await reset(page);
    await page.goForward();
    await page.waitForURL(/\/projects$/);
    await idle(page);
    assert.deepEqual(await stages(page), ['black', 'reveal', 'idle'], 'browser Forward plays the flick');
    pass('browser Forward: flick');

    // Desktop to desktop: nothing plays.
    await reset(page);
    const card = page.locator('.project-application a[href^="/projects/"]').first();
    await card.click();
    await page.waitForURL(/\/projects\/[^/]+$/);
    await page.waitForTimeout(500);
    assert.deepEqual(await stages(page), [], 'no switch between desktop routes');
    pass('links between desktop routes play nothing');

    // RETURN TO TERMINAL on the desktop (window minimized) plays the reverse.
    await page.goto(base + '/projects');
    await page.locator('.project-application').waitFor();
    await page.getByRole('button', { name: /^Minimize PROJECT/ }).click();
    await reset(page);
    await page.locator('.application-desktop a', { hasText: 'RETURN TO TERMINAL' }).click();
    await page.waitForURL(url => new URL(url).pathname === '/');
    await idle(page);
    assert.deepEqual(await stages(page), REVERSE, 'RETURN TO TERMINAL plays the reverse');
    pass('RETURN TO TERMINAL: reverse');

    // A key during the forward run skips to black and shows the desktop as soon as it is there.
    await page.goto(base + '/about');
    await reset(page);
    await page.locator('header a[href="/projects"]').click();
    await page.locator('.mode-switch[data-stage="print"]').waitFor();
    await page.keyboard.press('Space');
    await page.waitForURL(/\/projects$/);
    await idle(page);
    assert.deepEqual(await stages(page), ['print', 'black', 'idle'], 'a key skips to black, no collapse or fade');
    pass('a key skips the forward run');

    // During the print, a shortcut key (Alt+Left) is left alone (not prevented, no skip), and Escape cancels the run;
    // browser Back in the same document (popstate) abandons a run too. /tracker is reached by a link, so Back stays in
    // the same document.
    await page.goto(base + '/about');
    await page.locator('header a[href="/tracker"]').click();
    await page.waitForURL(/\/tracker$/);
    await page.evaluate(() => { window.__keys = []; document.addEventListener('keydown', event => window.__keys.push([event.key, event.defaultPrevented])); });
    await reset(page);
    await page.locator('header a[href="/archive"]').click();
    await page.locator('.mode-switch[data-stage="print"]').waitFor();
    await page.keyboard.press('Alt+ArrowLeft');
    assert.deepEqual(await page.evaluate(() => window.__keys.filter(([key]) => key === 'ArrowLeft')), [['ArrowLeft', false]], 'Alt+Left reaches the page unprevented');
    await page.waitForTimeout(300);
    assert.equal(new URL(page.url()).pathname, '/tracker', 'Alt+Left did not move this page');
    // Escape cancels the run before the push: nothing opens.
    await page.keyboard.press('Escape');
    await idle(page);
    assert.ok(!(await stages(page)).includes('black'), 'Escape cancelled the run before the push');
    assert.equal(new URL(page.url()).pathname, '/tracker', 'Escape opens nothing');
    // Browser Back (popstate in the same document) during the next print abandons that run too.
    await reset(page);
    await page.locator('header a[href="/archive"]').click();
    await page.locator('.mode-switch[data-stage="print"]').waitFor();
    await page.goBack();
    await page.waitForURL(/\/about$/);
    await idle(page);
    const abandoned = await stages(page);
    assert.ok(abandoned.includes('print') && !abandoned.includes('black'), `Back abandoned the run before the push (${abandoned})`);
    await page.waitForTimeout(1500);
    assert.equal(new URL(page.url()).pathname, '/about', 'the abandoned run never pushes');
    pass('Back during the print abandons the run');
  }

  // 2. Direct load of a desktop route: no switch, desktop from the start.
  {
    const { page } = await open();
    await page.goto(base + '/projects/blushland');
    await page.locator('.project-application').waitFor();
    await page.waitForTimeout(400);
    assert.deepEqual(await stages(page), [], 'direct load plays nothing');
    assert.equal(await desktop(page), DESKTOP);
    pass('direct load: desktop, no switch');
    await page.context().close();
  }

  // 3. Reduced motion and CRT off: crossfade only, no print.
  for (const setup of [{ reducedMotion: 'reduce' }, { crt: 'off' }]) {
    const { page, context } = await open(setup);
    await page.goto(base + '/');
    await page.locator('.home-screen').waitFor();
    await reset(page);
    await page.locator('.terminal-nav a[data-channel="archive"]').click();
    await page.waitForURL(/\/archive$/);
    await idle(page);
    assert.deepEqual(await stages(page), ['fade-in', 'fade-out', 'idle'], `${JSON.stringify(setup)}: crossfade`);
    await reset(page);
    await page.goBack();
    await page.waitForURL(url => new URL(url).pathname === '/');
    await idle(page);
    assert.deepEqual(await stages(page), ['fade-out', 'idle'], `${JSON.stringify(setup)}: crossfade back`);
    await context.close();
  }
  pass('reduced motion and CRT off: crossfade');

  // 4. The homepage terminal goes through the switch too.
  {
    const { page, context } = await open();
    await page.goto(base + '/');
    await page.locator('.home-screen').waitFor();
    await reset(page);
    const input = page.locator('#home-terminal-input');
    await input.fill('cd comics');
    await input.press('Enter');
    await page.waitForURL(/\/comics$/);
    await idle(page);
    assert.deepEqual(await stages(page), FORWARD, 'terminal cd plays the forward run');
    assert.match(await page.evaluate(() => [...document.querySelectorAll('.mode-switch-log li')].map(li => li.textContent).join('|')), /^$/, 'log cleared when done');
    // Back the moment the desktop page arrives (mid-fade): the run ends, the reverse plays, and the terminal takes
    // typing again right away (keys are held only while the page is covered).
    await page.goBack();
    await page.locator('#home-terminal-input').waitFor();
    await idle(page);
    await input.fill('cd 1');
    await input.press('Enter');
    await page.waitForURL(/\/projects$/);
    await page.goBack();
    await page.locator('#home-terminal-input').waitFor();
    await idle(page);
    await page.locator('#home-terminal-input').fill('cd 4');
    await page.locator('#home-terminal-input').press('Enter');
    await page.waitForURL(/\/archive$/, { timeout: 30000 });
    pass('homepage terminal: cd plays the switch; Back mid-fade ends it and the terminal works at once');
    await context.close();
  }

  // 5. The route list agrees with the pages' own markers.
  {
    const { page, context } = await open();
    const routes = ['/', '/about', '/tracker', '/patreon', '/projects', '/projects/blushland', '/projects/blushland/characters', '/projects/blushland/equipment', '/projects/blushland/equipment/fixture-scanner', '/comics', '/archive'];
    const chapter = await (async () => {
      await page.goto(base + '/comics');
      return page.locator('a[href^="/comics/"]').first().getAttribute('href');
    })();
    if (chapter) routes.push(chapter);
    for (const route of routes) {
      await page.goto(base + route);
      await page.waitForLoadState('domcontentloaded');
      const marked = await page.locator('.graphics-route').count() > 0;
      const expected = isGraphicsPath(route);
      assert.equal(marked, expected, `${route}: marker ${marked}, route list ${expected}`);
    }
    pass(`route list matches the markers on ${routes.length} routes`);
    await context.close();
  }

  // 6. Phone width.
  {
    const { page, context } = await open({ width: 390, height: 844 });
    await page.goto(base + '/');
    await page.locator('.home-screen').waitFor();
    await reset(page);
    await page.locator('.terminal-nav a[data-channel="projects"]').click();
    await page.waitForURL(/\/projects$/);
    await idle(page);
    assert.deepEqual(await stages(page), FORWARD);
    const phone = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      header: document.querySelector('.topbar').getBoundingClientRect().bottom,
      window: document.querySelector('.project-application').getBoundingClientRect().top,
      taskbar: document.querySelector('.taskbar-terminal').getBoundingClientRect().height,
    }));
    assert.ok(!phone.overflow, 'no sideways scroll on the desktop at 390');
    assert.ok(phone.window >= phone.header, 'window below the header at 390');
    assert.ok(phone.taskbar >= 44, `◂ TERMINAL is a 44px touch target (${phone.taskbar})`);
    await page.screenshot({ path: path.join(out, 'desktop-390.png') });
    pass('phone: switch, window below the header, 44px ◂ TERMINAL');
    await context.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-mode-switch: all checks passed');
} finally {
  await browser.close();
}
