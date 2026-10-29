// Batch 8 (design canvas boards 22, 4 and 5) against a running seeded fixture (npm run test:regression starts one; so
// does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-equipment-directory.mjs
// Checks: the equipment directory is a terminal page outside the project window, with section tabs, one card per item
// and the schematics turning in step with the shared clock (two real test clips of 6 s and 9 s); concept art keeps its
// colours; reduced motion shows posters; card into the window and back plays the switch both ways; a missing project's
// directory is a 404. The comic reader opens maximized with the page fitted to the height (to the width on a portrait
// screen), FIT WIDTH starts at the top of the page, the wheel scrolls it, arrows still turn pages, and the toolbar fits
// 320 px. The tab bar shows at 860 px and narrower on terminal pages only, never hides the focused control, and steps
// aside for an open window.
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
const out = path.resolve('test-results/batch-8-screens');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const SPIN_PERIOD_MS = 12000;
const DIRECTORY = '/projects/blushland/equipment';
const errors = [];
const pass = message => console.log('PASS ' + message);
const open = async ({ width = 1366, height = 768, reducedMotion = 'no-preference', hasTouch = false } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, hasTouch, isMobile: hasTouch });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); } catch {}
    // The switch announces every stage it starts (components/ModeSwitch.tsx).
    window.__stages = [];
    addEventListener('migrainz:mode-stage', event => window.__stages.push(event.detail));
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};

try {
  // 1. The directory: a terminal page, tabs, cards, no classified text.
  {
    const { context, page } = await open();
    const media = [];
    page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/api/media/file/') && url.pathname.endsWith('.mp4')) media.push(url.pathname); });
    const response = await page.goto(base + DIRECTORY);
    assert.equal(response.status(), 200);
    const html = await response.text();
    assert.ok(!html.includes('SENTINEL-REDACTED-EQUIPMENT-7Q'), 'no classified equipment text in the page');
    assert.equal(await page.locator('.project-application, .graphics-route').count(), 0, 'outside the project window, on the terminal');
    assert.equal(await page.locator('.equipment-tabs a[aria-current="page"]').textContent(), 'EQUIPMENT');
    const hrefs = await page.locator('a.equipment-tile').evaluateAll(links => links.map(link => link.getAttribute('href')));
    for (const slug of ['fixture-scanner', 'fixture-beacon', 'fixture-lamp', 'fixture-satchel']) assert.ok(hrefs.includes(`${DIRECTORY}/${slug}`), `card for ${slug}`);
    // Card names are the item's own text; the schematic media inside is decoration.
    assert.equal(await page.locator('a.equipment-tile video:not([aria-hidden="true"]), a.equipment-tile img:not([alt=""])').count(), 0, 'card media is decorative');
    // Concept art keeps its colours (no CRT recolour filter); the satchel has art but no schematic.
    const satchel = page.locator(`a.equipment-tile[href="${DIRECTORY}/fixture-satchel"] .equipment-tile-art`);
    assert.equal(await satchel.evaluate(el => getComputedStyle(el).filter), 'none', 'concept art unfiltered');

    // 2. Every turning schematic is in step with the shared clock: video time / duration = clock time / 12 s.
    const clips = page.locator(`a.equipment-tile:is([href$="fixture-beacon"], [href$="fixture-lamp"]) video`);
    await page.waitForFunction(() => [...document.querySelectorAll('a.equipment-tile video')].filter(video => !video.paused && video.currentTime > 0 && Number.isFinite(video.duration)).length >= 2, null, { timeout: 30000 });
    assert.equal(await clips.count(), 2, 'both test clips play');
    await page.waitForTimeout(2500); // the first drift correction lands within a second of playing
    const phases = await page.evaluate(period => {
      const clock = (Date.now() % period) / period;
      return [...document.querySelectorAll('a.equipment-tile video')].filter(video => Number.isFinite(video.duration) && video.duration > 1)
        .map(video => ({ phase: video.currentTime / video.duration, rate: video.playbackRate, duration: video.duration, clock }));
    }, SPIN_PERIOD_MS);
    for (const { phase, clock, rate, duration } of phases) {
      const apart = Math.min(Math.abs(phase - clock), 1 - Math.abs(phase - clock));
      assert.ok(apart < 0.03, `in step with the clock (phase ${phase.toFixed(3)} vs ${clock.toFixed(3)}, ${duration}s at ${rate}x)`);
      assert.ok(Math.abs(rate - duration / (SPIN_PERIOD_MS / 1000)) < 0.01, 'played at duration / 12 s');
    }
    assert.match(await page.locator('.equipment-sync span').textContent(), /ROTATION \d{3}° · LOOP START: RIGHT SIDE/);
    // The readout follows a live reduced-motion change (8b): it holds at 000 while motion is reduced.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => /ROTATION 000°/.test(document.querySelector('.equipment-sync span').textContent), null, { timeout: 2000 });
    // Held, not just passing through 000 (which a turning readout does for about 250 ms once per loop) (8c).
    await page.waitForTimeout(700);
    assert.match(await page.locator('.equipment-sync span').textContent(), /ROTATION 000°/, 'readout held at 000 under reduced motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // Turning again: two readings 500 ms apart differ (about 15° apart on the 12 s loop).
    await page.waitForTimeout(400);
    const first = await page.locator('.equipment-sync span').textContent();
    await page.waitForTimeout(500);
    assert.notEqual(await page.locator('.equipment-sync span').textContent(), first, 'readout turns again once motion is allowed');
    await page.screenshot({ path: path.join(out, 'equipment-1366.png') });
    // Requests over one more full loop: a looping clip should not be fetched again and again.
    const before = media.length;
    await page.waitForTimeout(SPIN_PERIOD_MS + 500);
    const perLoop = media.length - before;
    console.log(`  schematic video requests during one 12 s loop of ${phases.length} playing clips: ${perLoop} (first load: ${before})`);
    assert.ok(perLoop <= 4, `looping does not keep re-fetching the clips (${perLoop} requests in a loop)`);
    pass(`equipment directory: terminal page, tabs, ${hrefs.length} cards, decorative media, art unfiltered, clips in step (${phases.length})`);
    await context.close();
  }
  // A video with no poster (Fixture Relay, 8c): the card shows the concept art until the clip's first frame plays, and is
  // never blank on the way (the clip's request is held for a second to make the wait visible).
  {
    const { context, page } = await open();
    await context.addInitScript(() => {
      window.__relayBlank = 0;
      const check = () => {
        const card = document.querySelector('a.equipment-tile[href$="/fixture-relay"]');
        if (!card) return;
        const art = card.querySelector('img.equipment-tile-art'), playing = card.querySelector('video[data-playing]');
        if (card.querySelector('.schematic-spinner-empty') || (!art && !playing)) window.__relayBlank++;
      };
      new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true });
    });
    // Every request for the clip (the browser may cancel one and ask again with a range) waits until the test releases it.
    // A loading video delays the load event, so the page is only waited for up to DOMContentLoaded.
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/api/media/file/fixture-fixture-relay.mp4', async route => { await gate; await route.continue(); });
    await page.goto(base + DIRECTORY, { waitUntil: 'domcontentloaded' });
    const relay = page.locator(`a.equipment-tile[href="${DIRECTORY}/fixture-relay"]`);
    await relay.scrollIntoViewIfNeeded();
    await relay.locator('.schematic-spinner-layered img.equipment-tile-art').waitFor();
    // While the clip's request is held, the clip is in place but transparent over the art (9b: the rule now covers any
    // poster-less spinner video, the homepage tile too).
    await relay.locator('video').waitFor({ state: 'attached' });
    assert.equal(await relay.locator('video').evaluate(video => video.hasAttribute('data-playing') ? 'playing' : getComputedStyle(video).opacity), '0', 'the waiting clip is transparent');
    release();
    await relay.locator('video[data-playing]').waitFor({ timeout: 30000 });
    assert.equal(await page.evaluate(() => window.__relayBlank), 0, 'the relay card was never blank');
    assert.equal(await relay.locator('video').evaluate(video => getComputedStyle(video).opacity), '1', 'the clip shows once it plays');
    pass('a video with no poster: the card shows the concept art until the clip plays, never blank');

    // 3. Into the window and back: the switch plays forward, the window's EQUIPMENT tab plays the reverse.
    await page.evaluate(() => { window.__stages = []; });
    await page.locator(`a.equipment-tile[href="${DIRECTORY}/fixture-beacon"]`).click();
    await page.waitForURL(/fixture-beacon$/);
    await page.locator('.mode-switch').waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => window.__stages), ['print', 'collapse', 'line', 'black', 'reveal', 'idle'], 'card → item plays the forward switch');
    await page.locator('.project-application').waitFor();
    await page.evaluate(() => { window.__stages = []; });
    await page.locator('.project-app-nav a', { hasText: 'EQUIPMENT' }).click();
    await page.waitForURL(url => new URL(url).pathname === DIRECTORY);
    await page.locator('.mode-switch').waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => window.__stages), ['rblack', 'rline', 'ropen', 'idle'], 'EQUIPMENT tab → directory plays the reverse');
    pass('card into the window and the EQUIPMENT tab back play the switch both ways');
    await context.close();
  }

  // 4. Reduced motion: posters only, the angle readout holds at 000. A missing project's directory is a 404.
  {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await page.goto(base + DIRECTORY);
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('a.equipment-tile video').count(), 0, 'no video under reduced motion');
    assert.match(await page.locator('.equipment-sync span').textContent(), /ROTATION 000°/);
    const missing = await page.goto(base + '/projects/no-such-project/equipment');
    assert.equal(missing.status(), 404, 'missing project: 404');
    pass('reduced motion holds posters; missing project 404');
    await context.close();
  }

  // 5. Comic reader: maximized, fitted to the height; FIT WIDTH from the top; wheel scrolls; arrows turn pages.
  const reader = async (width, height) => {
    const { context, page } = await open({ width, height });
    await page.goto(base + '/comics/blushland/chapter-01');
    await page.locator('.comic-reader-window .art-viewer-canvas img.art-viewer-image[style*="width"]').waitFor();
    const measure = () => page.evaluate(() => {
      const canvas = document.querySelector('.comic-reader-window .art-viewer-canvas');
      const image = canvas.querySelector('img.art-viewer-image').getBoundingClientRect();
      const box = canvas.getBoundingClientRect(), style = getComputedStyle(canvas);
      const inner = { top: box.top + parseFloat(style.paddingTop), height: canvas.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom), width: canvas.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) };
      return { image: { top: image.top, height: image.height, width: image.width }, inner, readout: document.querySelector('.reader-toolbar output').textContent,
        maximized: document.querySelector('.comic-reader-window').dataset.maximized === 'true' };
    });
    return { context, page, measure };
  };
  {
    for (const [width, height] of [[1366, 768], [1440, 900]]) {
      const { context, page, measure } = await reader(width, height);
      const fit = await measure();
      assert.ok(fit.maximized, 'reader opens maximized');
      assert.equal(fit.readout, 'FIT HEIGHT');
      assert.ok(Math.abs(fit.image.height - fit.inner.height) <= 2, `page fills the frame's height (${JSON.stringify(fit)})`);
      console.log(`  reader at ${width}x${height}: page ${Math.round(fit.image.height)} px tall`);
      // Batch 9 (Harold: "taller reader page"): the size toolbar and the page bar share one row above the page, so the
      // page is at least 20 px taller than with two bars (533 px at 1366x768 and 665 px at 1440x900 in batch 8).
      const rows = await page.evaluate(() => {
        const box = selector => document.querySelector(selector).getBoundingClientRect();
        const tools = box('.comic-reader-window .reader-toolbar'), pages = box('.comic-reader-navigation'), canvas = box('.comic-reader-window .art-viewer-canvas');
        return { tools: tools.top, pages: pages.top, pagesBottom: pages.bottom, canvas: canvas.top };
      });
      assert.ok(Math.abs(rows.tools - rows.pages) <= 1 && rows.pagesBottom <= rows.canvas + 1, `one bar row above the page (${JSON.stringify(rows)})`);
      assert.ok(fit.image.height >= (width === 1366 ? 533 : 665) + 20, `page taller than with two bars (${Math.round(fit.image.height)} px)`);
      if (width === 1366) {
        await page.screenshot({ path: path.join(out, 'reader-1366.png') });
        await page.getByRole('button', { name: 'FIT WIDTH', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.reader-toolbar output').textContent === 'FIT WIDTH');
        let wide = await measure();
        assert.ok(Math.abs(wide.image.width - wide.inner.width) <= 2, 'FIT WIDTH fills the width');
        assert.ok(Math.abs(wide.image.top - wide.inner.top) <= 2, `FIT WIDTH starts at the top of the page (${JSON.stringify(wide)})`);
        await page.mouse.move(width / 2, height / 2);
        await page.mouse.wheel(0, 300);
        await page.waitForTimeout(200);
        const scrolled = await measure();
        assert.ok(scrolled.image.top < wide.image.top - 100, 'the wheel scrolls the page');
        // Batch 10: + on the focused page zooms; 0 goes back to the reader's own fit (here the chosen FIT WIDTH).
        await page.locator('.comic-reader-window .art-viewer-canvas').focus();
        await page.keyboard.press('+');
        await page.waitForFunction(() => /^ZOOM /.test(document.querySelector('.reader-toolbar output').textContent));
        await page.keyboard.press('0');
        await page.waitForFunction(() => document.querySelector('.reader-toolbar output').textContent === 'FIT WIDTH');
        assert.equal(scrolled.readout, 'FIT WIDTH', 'scrolling keeps FIT WIDTH');
        // The canvas has focus after a click; ArrowRight cannot pan sideways in FIT WIDTH, so it turns the page.
        await page.locator('.comic-reader-window .art-viewer-canvas').click();
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => /PAGE 2 \//.test(document.querySelector('.comic-reader-navigation output').textContent));
        await page.locator('.comic-reader-window .art-viewer-canvas img.art-viewer-image[style*="width"]').waitFor();
        await page.waitForTimeout(200);
        wide = await measure();
        assert.equal(wide.readout, 'FIT WIDTH', 'the chosen fit is kept for the next page');
        assert.ok(Math.abs(wide.image.top - wide.inner.top) <= 2, 'the next page starts at its top');
      }
      await context.close();
    }
    for (const width of [390, 320]) {
      const { context, page, measure } = await reader(width, 844);
      assert.equal((await measure()).readout, 'FIT WIDTH', 'portrait screen: FIT WIDTH');
      assert.ok(await page.locator('.reader-toolbar').evaluate(bar => [...bar.children].every(child => child.getBoundingClientRect().right <= bar.getBoundingClientRect().right + 0.5)), `toolbar fits ${width} px`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no sideways scroll at ${width}`);
      if (width === 390) {
        await page.screenshot({ path: path.join(out, 'reader-390.png') });
        // Phones keep the page bar at the bottom, within thumb reach.
        const below = await page.evaluate(() => document.querySelector('.comic-reader-navigation').getBoundingClientRect().top >= document.querySelector('.comic-reader-window .art-viewer-canvas').getBoundingClientRect().bottom - 1);
        assert.ok(below, 'page bar below the page at 390 px');
      }
      await context.close();
    }
    // Scrolling a fitted page does not choose that fit (8b; made a real test in 8c): on a portrait window where FIT WIDTH
    // makes the page taller than the frame, the wheel scrolls it; after turning to landscape, the next page is fitted to
    // the height again.
    {
      const { context, page, measure } = await reader(700, 1000);
      const before = await measure();
      assert.equal(before.readout, 'FIT WIDTH');
      assert.ok(before.image.height > before.inner.height + 20, `the page overflows the frame at 700x1000 (${JSON.stringify(before)})`);
      await page.mouse.move(350, 500);
      await page.mouse.wheel(0, 200);
      await page.waitForFunction(top => document.querySelector('.comic-reader-window .art-viewer-canvas img.art-viewer-image').getBoundingClientRect().top < top - 50, before.image.top);
      assert.equal((await measure()).readout, 'FIT WIDTH', 'still FIT WIDTH while scrolled');
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.getByRole('button', { name: 'NEXT', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.reader-toolbar output').textContent === 'FIT HEIGHT');
      await context.close();
    }
    // Just above the 760 px switch (a portrait tablet), every control of both bars stays inside the window.
    {
      const { context, page } = await reader(800, 1000);
      const inside = await page.evaluate(() => {
        const frame = document.querySelector('.comic-reader-window').getBoundingClientRect();
        return [...document.querySelectorAll('.comic-reader-window .reader-toolbar button, .comic-reader-window .reader-toolbar output, .comic-reader-navigation button, .comic-reader-navigation output, .comic-reader-navigation select')]
          .filter(el => { const r = el.getBoundingClientRect(); return r.left < frame.left - 0.5 || r.right > frame.right + 0.5 || r.width === 0; }).map(el => el.textContent);
      });
      assert.deepEqual(inside, [], 'every reader control inside the window at 800 px');
      await page.screenshot({ path: path.join(out, 'reader-800.png') });
      await context.close();
    }
    pass('reader: maximized, FIT HEIGHT on landscape, FIT WIDTH from the top on portrait, wheel, arrows, toolbar fits 320 px; one bar row on wide windows');
  }

  // 6. Tab bar: 860 px and narrower on terminal pages; the focused control is never under it; it steps aside for windows.
  {
    const { context, page } = await open({ width: 390, height: 844, hasTouch: true });
    await page.goto(base + DIRECTORY);
    const bar = page.locator('.phone-tabs');
    await bar.waitFor();
    assert.equal(await bar.locator('a[aria-current="true"]').textContent(), '▤PROJECTS', 'PROJECTS marked as the current section');
    assert.deepEqual(await bar.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href'))), ['/', '/projects', '/comics', '/archive', '/tracker'], 'five tabs, TRACKER last (batch 9)');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll at 390');
    await page.screenshot({ path: path.join(out, 'equipment-390.png'), fullPage: true });
    // The current section tab is scrolled into view in its sideways-scrolling row (8b).
    assert.ok(await page.locator('.equipment-tabs').evaluate(nav => { const tab = nav.querySelector('[aria-current]').getBoundingClientRect(), row = nav.getBoundingClientRect(); return tab.left >= row.left - 0.5 && tab.right <= row.right + 0.5; }), 'current tab visible in the row');
    // A keyboard-focused tab brightens and keeps its whole reticle inside the scrolling row (8b).
    {
      const first = page.locator('.equipment-tabs a').first();
      await first.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      const look = await first.evaluate(a => ({ focused: a.matches(':focus-visible'), color: getComputedStyle(a).color, bright: getComputedStyle(document.documentElement).getPropertyValue('--crt-bright').trim(), inset: getComputedStyle(a, '::after').top }));
      assert.ok(look.focused, 'tab focused by keyboard');
      assert.equal(look.inset, '0px', 'reticle drawn inside the tab');
      const probe = await page.evaluate(value => { const el = document.createElement('i'); el.style.color = value; document.body.append(el); const c = getComputedStyle(el).color; el.remove(); return c; }, look.bright);
      assert.equal(look.color, probe, 'focused tab uses the bright text shade');
    }
    await page.goto(base + '/');
    assert.equal(await bar.locator('a[aria-current="page"]').textContent(), '▣HOME');
    // A container focused by script (the main section, with preventScroll, after keyboard use) never scrolls the page (8b).
    await page.keyboard.press('Tab');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => document.getElementById('top').focus({ preventScroll: true }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => scrollY), 0, 'script focus on the main section does not scroll the page');
    const top = await bar.evaluate(el => el.getBoundingClientRect().top);
    await page.locator('#top').focus();
    for (let index = 0; index < 30; index++) {
      await page.keyboard.press('Tab');
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      // WCAG 2.4.11 (AA): the focused control is never entirely hidden by the bar (its top shows above it).
      // Page content only (main and footer; the dev server's own tools button is not part of the site).
      const focused = await page.evaluate(() => { const el = document.activeElement; const rect = el?.getBoundingClientRect(); return el?.closest('main, footer') && !el.closest('input') ? rect.top : null; });
      if (focused !== null) assert.ok(focused < top - 4, `focused control not hidden under the tab bar (top ${focused} vs bar ${top}, tab ${index})`);
    }
    // A text field with focus (the on-screen keyboard) and the SYSTEM monitor hide the bar.
    await page.locator('#home-terminal-input').focus();
    assert.equal(await bar.evaluate(el => getComputedStyle(el).display), 'none', 'hidden while typing');
    await page.locator('button[aria-controls="pixel-monitor"]').click();
    await page.locator('#pixel-monitor').waitFor({ state: 'visible' });
    assert.equal(await bar.evaluate(el => getComputedStyle(el).display), 'none', 'hidden under the SYSTEM monitor');
    await page.getByRole('button', { name: 'Hide desktop and return to terminal' }).click();
    // On the grey-window desktop the taskbar takes over.
    await page.goto(base + '/projects');
    await page.locator('.graphics-route').waitFor({ state: 'attached' });
    assert.equal(await bar.evaluate(el => getComputedStyle(el).display), 'none', 'hidden on the desktop');
    // 9b: a tall card in phone landscape (844x340: a card is taller than the space above the bar) whose top lands under
    // the bar is moved up when keyboard focus reaches it.
    await page.setViewportSize({ width: 844, height: 340 });
    await page.goto(base + DIRECTORY);
    await page.locator('.startup-sequence').waitFor({ state: 'detached' });
    const tall = page.locator('a.equipment-tile').first();
    const barTop = await bar.evaluate(el => el.getBoundingClientRect().top);
    assert.ok(await tall.evaluate((el, top) => el.getBoundingClientRect().height > top - 16, barTop), 'the card is taller than the space above the bar');
    await page.keyboard.press('Tab'); // keyboard modality, so a script focus counts as :focus-visible
    await tall.evaluate(el => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.top - (innerHeight - 30)); });
    assert.ok(await tall.evaluate((el, top) => el.getBoundingClientRect().top > top, barTop), 'the card starts under the bar');
    await tall.evaluate(el => el.focus({ preventScroll: true }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const moved = await tall.evaluate(el => el.getBoundingClientRect().top);
    assert.ok(moved >= 0 && moved < barTop - 4, `the tall card's top moved above the bar (${moved} vs ${barTop})`);
    // Five tabs at 320 px: every label fits inside its own tab (measured on the text itself, so overflow on either side counts).
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(base + '/tracker');
    assert.equal(await bar.locator('a[aria-current="page"]').textContent(), '▧TRACKER');
    const spill = await bar.locator('a').evaluateAll(links => links.flatMap(link => {
      const range = document.createRange(); range.selectNodeContents(link);
      const text = range.getBoundingClientRect(), tab = link.getBoundingClientRect();
      return text.left < tab.left - 0.5 || text.right > tab.right + 0.5 ? [`${link.textContent} ${Math.round(text.width)}/${Math.round(tab.width)}`] : [];
    }));
    assert.deepEqual(spill, [], 'tab labels fit at 320 px');
    await page.locator('.startup-sequence').waitFor({ state: 'detached' }); // the server renders the boot screen until hydration
    await page.screenshot({ path: path.join(out, 'tabs-320.png') });
    for (const [width, shown] of [[768, 'grid'], [1366, 'none']]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(base + '/about');
      assert.equal(await bar.evaluate(el => getComputedStyle(el).display), shown, `tab bar at ${width}: ${shown}`);
    }
    pass('tab bar: 860 px and narrower, current section, focus never fully under it, hidden while typing, under windows and on the desktop');
    await context.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-equipment-directory: all checks passed');
} finally {
  await browser.close();
}
