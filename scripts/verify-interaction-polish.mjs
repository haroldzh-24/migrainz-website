// Phase 1 interaction checks against a running seeded fixture (npm run test:regression starts one; so does
// node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-interaction-polish.mjs
//   PLAYWRIGHT_MODULE=<path to playwright/index.mjs> overrides how Playwright is found.
// Checks: shared highlight (reticle, Win95 bars/bevels/dotted focus, touch, forced colours, reduced motion, no layout
// shift or overflow), SYSTEM menu, amber persistence before first paint, and that classified fixture titles never reach
// the boot checklist, the HTML or the RSC payload. Writes screenshots to test-results/interaction-screens/.
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
const out = path.resolve('test-results/interaction-screens');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const SENTINELS = ['SENTINEL-PHASE-TITLE-7Q', 'SENTINEL-CHAPTER-TITLE-7Q', 'sentinel-chapter-7q'];
const announcementKey = 'migrainz-announcement:studio-transmission-001';
const errors = [];
// Contexts that skip the boot (already dismissed this session) unless a test needs it.
const open = async (options = {}, { boot = false, phosphor } = {}) => {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, ...options });
  await context.addInitScript(([key, skip, colour]) => {
    try { if (skip) sessionStorage.setItem(key, 'studio-transmission-001'); if (colour) localStorage.setItem('crt-phosphor', colour); } catch {}
  }, [announcementKey, !boot, phosphor]);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const afterStyle = (locator, property) => locator.evaluate((el, prop) => getComputedStyle(el, '::after')[prop], property);
const pass = message => console.log('PASS ' + message);
// The server renders the opaque boot gate; a dismissed session only drops it after hydration. Wait for that before
// interacting, or a press can land on the gate (seen on the slower regression server).
const visit = async (page, url) => { await page.goto(url); await page.locator('.startup-sequence').waitFor({ state: 'hidden' }); };

try {
  // 1. Classified records: safe labels in the checklist, titles nowhere in HTML or RSC.
  {
    const { context, page } = await open({}, { boot: true });
    const html = await (await context.request.get(base + '/')).text();
    const rsc = await (await context.request.get(base + '/', { headers: { RSC: '1' } })).text();
    for (const sentinel of SENTINELS) {
      assert.ok(!html.includes(sentinel), `${sentinel} must not be in the HTML`);
      assert.ok(!rsc.includes(sentinel), `${sentinel} must not be in the RSC payload`);
    }
    await page.goto(base + '/');
    await page.locator('.boot-line', { hasText: 'clearance' }).waitFor();
    const text = await page.locator('.boot-checklist').textContent();
    for (const sentinel of SENTINELS) assert.ok(!text.toLowerCase().includes(sentinel.toLowerCase()), `${sentinel} must not be in the checklist`);
    assert.equal(await page.locator('.boot-line', { hasText: 'sealed_phase' }).filter({ hasText: 'CLASSIFIED' }).count(), 1, 'redacted phase shows its safe label');
    assert.equal(await page.locator('.boot-line', { hasText: 'sealed_chapter' }).filter({ hasText: 'CLASSIFIED' }).count(), 1, 'redacted chapter shows its safe label');
    await page.screenshot({ path: path.join(out, 'boot-checklist-1366.png') });
    await context.close();
    pass('classified titles absent from checklist, HTML and RSC; safe labels shown');
  }

  // 2. Reticle on hover and keyboard focus, no layout shift; Win95 styles inside windows.
  {
    const { context, page } = await open();
    await visit(page, base + '/');
    await page.locator('.terminal-nav a').first().waitFor();
    const nav = page.locator('.terminal-nav a').first();
    const before = await nav.boundingBox();
    await nav.hover();
    await page.waitForTimeout(250);
    assert.equal(await afterStyle(nav, 'opacity'), '1', 'reticle shows on hover');
    assert.deepEqual(await nav.boundingBox(), before, 'hover does not move the item');
    await page.mouse.move(2, 760);
    await page.waitForTimeout(50);
    assert.equal(await afterStyle(nav, 'opacity'), '0', 'reticle leaves instantly');
    await page.locator('#top').focus();
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.activeElement?.closest('.terminal-nav'))); i++) await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await page.waitForTimeout(250);
    assert.equal(await afterStyle(focused, 'opacity'), '1', 'reticle shows on keyboard focus');
    assert.equal(await focused.evaluate(el => getComputedStyle(el).outlineColor), 'rgba(0, 0, 0, 0)', 'one indicator: the outline is transparent outside High Contrast');
    await page.screenshot({ path: path.join(out, 'reticle-focus-1366.png'), clip: { x: 60, y: 520, width: 620, height: 240 } });
    await visit(page, base + '/projects/blushland/equipment');
    const tab = page.locator('.project-app-nav a:not([aria-current])').first();
    await tab.hover();
    assert.equal(await tab.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 128)', 'Win95 menu item gets the navy bar');
    assert.equal(await afterStyle(tab, 'content'), 'none', 'no reticle inside Win95 chrome');
    const file = page.locator('.desktop-file-open').first();
    await file.focus();
    assert.equal(await file.evaluate(el => getComputedStyle(el).outlineStyle), 'dotted', 'Win95 dotted focus rectangle');
    assert.equal(await file.locator('.desktop-file-copy strong').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 128)', 'desktop icon label turns navy');
    // Project-window title bar controls are Win95 chrome: no reticle, dotted focus, pressed bevel.
    const control = page.locator('.project-application .retro-window-controls button').last();
    await control.hover();
    assert.equal(await afterStyle(control, 'content'), 'none', 'no reticle on window controls');
    await control.focus();
    assert.equal(await control.evaluate(el => getComputedStyle(el).outlineStyle), 'dotted', 'window control dotted focus');
    await page.mouse.down();
    assert.equal(await control.evaluate(el => getComputedStyle(el).borderTopColor), 'rgb(64, 64, 64)', 'window control presses in');
    await page.mouse.move(2, 2);
    await page.mouse.up();
    await context.close();
    pass('reticle hover/focus without layout shift; Win95 bar, dotted focus, navy icon label, window controls');
  }

  // 3. Touch: no sticky reticle after a tap. Forced colours: a real outline. Reduced motion: no animation.
  {
    const { context, page } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await visit(page, base + '/');
    const trigger = page.getByRole('button', { name: '03 / requisitions.exe Requisitions / shop', exact: true });
    // Press state: in this no-hover phone context only :active can show the reticle (headless Chrome does not turn raw
    // DevTools touch events into a press, so a held mouse button stands in for the finger; real touch is unverified).
    const box = await page.locator('.terminal-nav a').first().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(await afterStyle(page.locator('.terminal-nav a').first(), 'opacity'), '0', 'no hover reticle without a hovering pointer');
    await page.mouse.down();
    await page.waitForTimeout(200);
    assert.equal(await afterStyle(page.locator('.terminal-nav a').first(), 'opacity'), '1', 'reticle shows while pressed');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 400);
    await page.mouse.up();
    await trigger.tap();
    await page.waitForTimeout(300);
    assert.equal(await afterStyle(trigger, 'opacity'), '0', 'no sticky reticle after a tap');
    for (const route of ['/', '/projects/blushland/equipment/fixture-scanner']) {
      await visit(page, base + route);
      await page.waitForTimeout(500);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390), `no sideways overflow at 390px on ${route}`);
    }
    await context.close();
    const forced = await open({ forcedColors: 'active' });
    await visit(forced.page, base + '/');
    await forced.page.locator('.terminal-nav a').first().waitFor();
    await forced.page.locator('#top').focus();
    for (let i = 0; i < 40 && !(await forced.page.evaluate(() => document.activeElement?.closest('.terminal-nav'))); i++) await forced.page.keyboard.press('Tab');
    const forcedFocus = await forced.page.evaluate(() => { const style = getComputedStyle(document.activeElement); return [style.outlineStyle, style.outlineWidth]; });
    assert.deepEqual(forcedFocus, ['solid', '2px'], 'forced colours show an outline');
    await forced.context.close();
    const reduced = await open({ reducedMotion: 'reduce' });
    const nav = reduced.page.locator('.terminal-nav a').first();
    await visit(reduced.page, base + '/');
    await nav.hover();
    assert.equal(await afterStyle(nav, 'animationName'), 'none', 'reduced motion: the reticle just appears');
    assert.equal(await afterStyle(nav, 'transform'), 'none');
    assert.equal(await afterStyle(nav, 'opacity'), '1');
    await reduced.context.close();
    pass('touch (no sticky hover, no overflow), forced colours and reduced motion');
  }

  // 4. SYSTEM menu: keyboard path; Esc during the announcement closes only the menu.
  {
    const { context, page } = await open({}, { boot: true });
    await page.goto(base + '/');
    await page.getByRole('button', { name: 'ENTER', exact: true }).waitFor();
    const menu = page.getByRole('button', { name: 'SYSTEM', exact: true });
    await menu.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => document.activeElement?.classList.contains('crt-toggle'));
    assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('sound-toggle')));
    await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('system-menu-button')), 'focus returns to SYSTEM');
    assert.equal(await page.locator('.startup-sequence').getAttribute('data-phase'), 'announcement', 'the ad stays open');
    await context.close();
    pass('SYSTEM menu keyboard path and Escape');
  }

  // 5. Amber: chosen in the menu, persists across reload and applies before first paint.
  {
    const { context, page } = await open();
    await visit(page, base + '/');
    await page.getByRole('button', { name: 'SYSTEM', exact: true }).click();
    await page.locator('.phosphor-toggle').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('crt-phosphor')), 'amber');
    await page.reload({ waitUntil: 'commit' });
    const first = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve(getComputedStyle(document.body).color))));
    assert.equal(first, 'rgb(235, 196, 140)', 'amber on the first frame after reload');
    await page.locator('.watcher-base').waitFor();
    assert.match(await page.locator('.watcher-base').evaluate(el => getComputedStyle(el).backgroundImage), /watcher-base\.amber\.png/);
    await context.close();
    pass('amber persists and applies before first paint');
  }

  // 6. Review screenshots: four sizes, both phosphors, CRT on and off.
  for (const [size, width, height] of [['1366', 1366, 768], ['1440', 1440, 900], ['390', 390, 844], ['320', 320, 640]]) for (const phosphor of ['green', 'amber']) {
    const { context, page } = await open({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 }, { phosphor });
    for (const [label, route] of [['home', '/'], ['scanner', '/projects/blushland/equipment/fixture-scanner']]) {
      await visit(page, base + route);
      await page.waitForTimeout(600);
      for (const crt of ['on', 'off']) {
        await page.evaluate(value => { document.documentElement.dataset.crt = value; }, crt);
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(out, `${label}-${size}-${phosphor}-crt-${crt}.png`) });
      }
    }
    await context.close();
  }
  pass('screenshots written to ' + out);
  assert.deepEqual(errors, [], 'no page errors');
} finally {
  await browser.close();
}
