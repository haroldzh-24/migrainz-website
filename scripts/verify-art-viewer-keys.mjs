// Art Viewer keyboard checks against a running seeded fixture (npm run test:regression starts one; so does
// node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-art-viewer-keys.mjs
// bugs.md 2026-10-22: Escape only closed the viewer while it was the focused window. Now Escape closes it whenever it
// is open, unless something else handled the key first (one Escape closes one thing). bugs.md 2026-10-27: a closed
// viewer reopened on the next full page load. Also: closing the viewer returns focus to its opener (bugs.md 2026-10-27),
// and its tab close buttons are at least 24x24 px (roadmap 2.7).
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
const policies = require('./policy-watch.cjs').watchBrowser(browser); // report-only CSP; see policy-watch.cjs
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  // Dismiss the announcement for this tab once; case 5 brings it back on purpose.
  await context.addInitScript(() => { try { if (!sessionStorage.getItem('escape-test-started')) { sessionStorage.setItem('escape-test-started', '1'); sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); } } catch {} });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  const viewer = page.locator('.art-viewer-window');
  const project = page.locator('.retro-window.project-application');
  const openViewer = async () => {
    await page.getByRole('button', { name: /OPEN IN ART VIEWER/i }).click();
    await viewer.waitFor();
  };
  await page.goto(base + '/projects/blushland/equipment/fixture-satchel');
  await page.locator('.startup-sequence').waitFor({ state: 'hidden' });

  // 1. Focused viewer: Escape closes it (unchanged behaviour).
  await openViewer();
  await page.keyboard.press('Escape');
  await viewer.waitFor({ state: 'hidden' });
  console.log('PASS Escape closes the focused viewer');

  // 2. The bug: after another window takes focus, Escape still closes the viewer.
  await openViewer();
  await project.locator('.retro-window-titlebar').click({ position: { x: 200, y: 8 } });
  assert.equal(await project.getAttribute('data-focused'), 'true', 'the project window took focus');
  await page.keyboard.press('Escape');
  await viewer.waitFor({ state: 'hidden', timeout: 3000 });
  console.log('PASS Escape closes the viewer after another window took focus');

  // 3. One Escape closes one thing: with a file inspector open, the first Escape closes only the inspector.
  await openViewer();
  await project.locator('.project-app-nav').getByRole('link', { name: 'OVERVIEW' }).click(); // client-side, viewer stays
  await page.waitForURL(/\/projects\/blushland$/);
  await viewer.waitFor();
  await project.locator('.desktop-file-info').first().click();
  const inspector = page.locator('.desktop-inspector');
  await inspector.waitFor();
  await page.keyboard.press('Escape');
  await inspector.waitFor({ state: 'hidden' });
  assert.ok(await viewer.isVisible(), 'the viewer stays open while Escape closes the inspector');
  await page.keyboard.press('Escape');
  await viewer.waitFor({ state: 'hidden', timeout: 3000 });
  console.log('PASS one Escape closes one thing (inspector first, then the viewer)');

  // 4. A closed viewer stays closed after a full page load (its tabs are kept), then: typing in a field never closes it.
  await page.goto(base + '/projects/blushland/equipment/fixture-satchel');
  await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
  await page.waitForLoadState('networkidle');
  assert.equal(await viewer.count(), 0, 'a closed viewer does not reopen on the next page load');
  console.log('PASS a closed viewer stays closed after a page load');
  await openViewer();
  await page.evaluate(() => { const input = document.createElement('input'); input.id = 'escape-probe'; document.body.append(input); input.focus(); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  assert.ok(await viewer.isVisible(), 'Escape in a text field leaves the viewer open');
  console.log('PASS Escape in a text field leaves the viewer open');
  // 5. The announcement owns Escape while it shows: viewer tabs restored after a reload with the announcement up, the
  // first Escape closes only the announcement.
  await page.evaluate(() => { sessionStorage.removeItem('migrainz-announcement:studio-transmission-001'); sessionStorage.setItem('migrainz-boot-seen', '1'); });
  await page.reload();
  const announcement = page.getByRole('button', { name: 'ENTER' });
  await announcement.waitFor();
  await viewer.waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
  assert.ok(await viewer.isVisible(), 'the viewer stays open while Escape closes the announcement');
  // A restored viewer has no opener: with focus inside it, Escape hands focus to the project window, never the body.
  await viewer.locator('.art-viewer-tab.is-active > button').first().focus();
  await page.keyboard.press('Escape');
  await viewer.waitFor({ state: 'hidden', timeout: 3000 });
  await page.waitForFunction(() => document.activeElement?.matches('.retro-window:not(.art-viewer-window)'), null, { timeout: 3000 })
    .catch(async () => assert.fail(`a restored viewer closed: focus is on <${await page.evaluate(() => document.activeElement?.tagName + '.' + document.activeElement?.className)}>, not the project window`));
  console.log('PASS the announcement takes the first Escape, the restored viewer the second (focus then on the project window)');

  // 6. Closing the viewer gives keyboard focus back to the control that opened it (bugs.md 2026-10-27), by Escape and
  // by the tab's close button.
  const opener = page.getByRole('button', { name: /OPEN IN ART VIEWER/i });
  const focusedText = () => page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
  await opener.focus();
  await page.keyboard.press('Enter');
  await viewer.waitFor();
  await page.keyboard.press('Escape');
  await viewer.waitFor({ state: 'hidden', timeout: 3000 });
  await page.waitForFunction(() => /OPEN IN ART VIEWER/i.test(document.activeElement?.textContent ?? ''), null, { timeout: 3000 })
    .catch(async () => assert.fail(`after Escape, focus is on "${await focusedText()}" instead of the opener`));
  await page.keyboard.press('Enter');
  await viewer.waitFor();
  await viewer.locator('.art-viewer-tab-close').last().click();
  await viewer.waitFor({ state: 'hidden', timeout: 3000 });
  await page.waitForFunction(() => /OPEN IN ART VIEWER/i.test(document.activeElement?.textContent ?? ''), null, { timeout: 3000 })
    .catch(async () => assert.fail(`after the tab's close button, focus is on "${await focusedText()}" instead of the opener`));
  // A stale opener is never used: opened while nothing had focus (as after a click in Safari), focus goes to the
  // project window, not to the button from the earlier open.
  await page.evaluate(() => { document.activeElement?.blur(); [...document.querySelectorAll('button')].find(b => /OPEN IN ART VIEWER/i.test(b.textContent ?? ''))?.click(); });
  await viewer.waitFor();
  await page.keyboard.press('Escape');
  await viewer.waitFor({ state: 'hidden', timeout: 3000 });
  await page.waitForFunction(() => document.activeElement?.matches('.retro-window'), null, { timeout: 3000 })
    .catch(async () => assert.fail(`stale opener: focus is on "${await focusedText()}" instead of the project window`));
  // Several tabs: closing one that isn't the last puts focus on the tab that is now active, not the page body.
  await page.evaluate(() => sessionStorage.setItem('migrainz-art-viewer-tabs-v2', JSON.stringify([
    { id: 'probe-a', href: '/projects/blushland', title: 'PROBE A', project: 'BLUSHLAND', images: [] },
    { id: 'probe-b', href: '/projects/blushland', title: 'PROBE B', project: 'BLUSHLAND', images: [] }])));
  await page.reload();
  await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
  await opener.focus();
  await page.keyboard.press('Enter');
  await viewer.waitFor();
  assert.ok(await viewer.locator('.art-viewer-tab').count() >= 3, 'three tabs open');
  await viewer.locator('.art-viewer-tab-close').first().click();
  await page.waitForFunction(() => document.activeElement?.matches('.art-viewer-tab.is-active > button:first-child'), null, { timeout: 3000 })
    .catch(async () => assert.fail(`after closing a tab, focus is on "${await focusedText()}" instead of the active tab`));
  await page.keyboard.press('Escape');
  await viewer.waitFor({ state: 'hidden', timeout: 3000 });
  console.log('PASS closing the viewer returns focus to the button that opened it (Escape and close button); a stale opener is not used; closing one tab focuses the active tab');

  // 6b. Focus handed back to a file in a project window, at desktop and phone widths: by mouse (the file clipped at the
  // bottom edge, so a hand-back that scrolled would move the reader's place), by keyboard, after minimizing and restoring
  // the viewer, and with the file scrolled out of view (then it is brought into view). The Properties panel never pops
  // open on a hand-back, but does for the very next keyboard focus.
  const focusIsOn = async (handle, what) => page.waitForFunction(element => document.activeElement === element, handle, { timeout: 3000 })
    .catch(async () => assert.fail(`${what}: focus is on ${await focusedText()}, not the file`));
  const panelStaysShut = async what => { await page.waitForTimeout(450); assert.equal(await page.locator('.desktop-inspector').count(), 0, `${what}: no Properties panel`); };
  const contentScroll = () => page.evaluate(() => document.querySelector('.project-app-content')?.scrollTop ?? -1);
  for (const size of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    const at = `${size.width}px`;
    await page.setViewportSize(size);
    await page.evaluate(() => sessionStorage.removeItem('migrainz-art-viewer-tabs-v2')); // one tab: its × closes the viewer
    await page.goto(base + '/projects/blushland');
    await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
    await page.locator('.retro-window-pending').waitFor({ state: 'detached' });
    const file = page.locator('.desktop-file.artwork-file .desktop-file-open').first();
    const handle = await file.elementHandle();
    // Mouse: put the file's top 14 px at the bottom edge of the scrolling window content and click that strip.
    const strip = await file.evaluate(element => {
      const content = element.closest('.project-app-content');
      content.scrollTop += element.getBoundingClientRect().top - (content.getBoundingClientRect().bottom - 14);
      const box = element.getBoundingClientRect(), clip = content.getBoundingClientRect();
      return { x: box.left + Math.min(40, box.width / 2), y: (box.top + Math.min(box.bottom, clip.bottom)) / 2, hidden: box.bottom - clip.bottom };
    });
    assert.ok(strip.hidden > 20, `${at}: the file is clipped at the bottom edge (${strip.hidden}px hidden)`);
    const scrollBefore = await contentScroll();
    assert.ok(scrollBefore > 0, `${at}: the window content is scrolled (${scrollBefore})`);
    await page.mouse.click(strip.x, strip.y);
    await viewer.waitFor();
    await viewer.locator('.art-viewer-tab-close').last().click();
    await viewer.waitFor({ state: 'hidden', timeout: 3000 });
    await focusIsOn(handle, `${at} mouse close`);
    await panelStaysShut(`${at} mouse close`);
    assert.ok(Math.abs(await contentScroll() - scrollBefore) < 2, `${at}: the reader's place stayed (${scrollBefore} -> ${await contentScroll()})`);
    // Keyboard: Enter opens, Escape closes; focus back on this file, no panel; the next Tab is ordinary keyboard focus.
    await file.focus();
    await page.keyboard.press('Enter');
    await viewer.waitFor();
    await page.keyboard.press('Escape');
    await viewer.waitFor({ state: 'hidden', timeout: 3000 });
    await focusIsOn(handle, `${at} keyboard close`);
    await page.keyboard.press('Tab');
    await page.locator('.desktop-inspector').waitFor({ timeout: 2000 })
      .catch(async () => assert.fail(`${at}: the Tab straight after a hand-back opens the Properties panel as usual (focus on ${await focusedText()})`));
    await page.keyboard.press('Escape'); // closes the panel
    // Minimize by keyboard: focus back on the file, no panel; restore from the dock, Escape: back on the file again.
    await file.focus();
    await page.keyboard.press('Enter');
    await viewer.waitFor();
    await viewer.locator('button[aria-label^="Minimize"]').focus();
    await page.keyboard.press('Enter');
    await viewer.waitFor({ state: 'hidden', timeout: 3000 });
    await focusIsOn(handle, `${at} minimize`);
    await panelStaysShut(`${at} minimize`);
    // Switching to another app and back keeps the file focused (no key or pointer press here): still quiet, no panel.
    // Replays the events the browser fires on the focused element when its window loses focus and gets it back.
    await page.evaluate(() => {
      const element = document.activeElement;
      for (const type of ['blur', 'focusout', 'focus', 'focusin']) element.dispatchEvent(new FocusEvent(type, { bubbles: type.startsWith('focus') && type !== 'focus' }));
    });
    await panelStaysShut(`${at} window blur and return`);
    await page.locator('.window-taskbar button', { hasText: 'ART VIEWER' }).click();
    await viewer.waitFor();
    await page.keyboard.press('Escape');
    await viewer.waitFor({ state: 'hidden', timeout: 3000 });
    await focusIsOn(handle, `${at} restore then Escape`);
    await panelStaysShut(`${at} restore then Escape`);
    // Quiet only while focus stays: once it leaves and comes back (here by script, no key or pointer press), the file is
    // an ordinary keyboard focus again and opens its panel.
    await page.evaluate(() => { const element = document.activeElement; element.blur(); element.focus(); });
    await page.locator('.desktop-inspector').waitFor({ timeout: 2000 })
      .catch(async () => assert.fail(`${at}: focus leaving and returning to a handed-back file opens its Properties panel as usual (focus on ${await focusedText()})`));
    await page.keyboard.press('Escape'); // closes the panel
    // Scrolled out of view while the viewer was open: the hand-back brings the file into view.
    await file.focus();
    await page.keyboard.press('Enter');
    await viewer.waitFor();
    await page.evaluate(() => { const content = document.querySelector('.project-app-content'); content.scrollTop = 0; });
    assert.ok(await file.evaluate(element => element.getBoundingClientRect().top >= element.closest('.project-app-content').getBoundingClientRect().bottom),
      `${at}: the file is out of view before the viewer closes`);
    await page.evaluate(() => document.querySelector('.art-viewer-window .art-viewer-tab-close')?.focus());
    await page.keyboard.press('Enter');
    await viewer.waitFor({ state: 'hidden', timeout: 3000 });
    await focusIsOn(handle, `${at} out of view`);
    assert.ok(await file.evaluate(element => { const box = element.getBoundingClientRect(), clip = element.closest('.project-app-content').getBoundingClientRect();
      return box.bottom > clip.top && box.top < clip.bottom; }), `${at}: a file scrolled out of view is brought into view when focus returns`);
  }
  console.log('PASS focus handed back to a file (mouse close with the file clipped at the edge, keyboard close, minimize and restore, scrolled out of view) at 1366 and 390 px: right file, no Properties panel, reader\'s place kept unless the file was out of view; the next Tab opens the panel as usual');

  // 7. Tab close buttons and tab titles are at least 24x24 px (WCAG 2.5.8; roadmap 2.7), on desktop and phone widths,
  // and the window controls stay inside the viewer.
  await page.evaluate(() => sessionStorage.setItem('migrainz-art-viewer-tabs-v2', JSON.stringify([
    { id: 'long-a', href: '/projects/blushland', title: 'A VERY LONG ARTWORK TITLE FOR THE TAB STRIP ONE', project: 'BLUSHLAND', images: [] },
    { id: 'long-b', href: '/projects/blushland', title: 'A VERY LONG ARTWORK TITLE FOR THE TAB STRIP TWO', project: 'BLUSHLAND', images: [] }])));
  await page.goto(base + '/projects/blushland/equipment/fixture-satchel');
  await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
  for (const [size, maximize] of [[{ width: 1366, height: 768 }, false], [{ width: 1366, height: 768 }, true], [{ width: 390, height: 844 }, false]]) {
    await page.setViewportSize(size);
    await openViewer();
    if (maximize) await viewer.locator('.art-viewer-maximize').click();
    const boxes = await viewer.evaluate(element => {
      const box = selector => [...element.querySelectorAll(selector)].map(node => { const r = node.getBoundingClientRect(); return { w: r.width, h: r.height, right: r.right }; });
      return { close: box('.art-viewer-tab-close'), title: box('.art-viewer-tab > button:first-child'), controls: box('.retro-window-controls'), window: element.getBoundingClientRect().right };
    });
    assert.ok(boxes.close.length >= 3 && boxes.close.every(b => b.w >= 24 && b.h >= 24), `${size.width}px: tab close buttons ${JSON.stringify(boxes.close)}`);
    assert.ok(boxes.title.every(b => b.h >= 24), `${size.width}px: tab titles ${JSON.stringify(boxes.title)}`);
    assert.ok(boxes.controls.every(b => b.right <= boxes.window + 0.5), `${size.width}px: window controls stay inside the viewer`);
    if (maximize) await viewer.locator('.art-viewer-maximize').click();
    await page.keyboard.press('Escape');
    await viewer.waitFor({ state: 'hidden', timeout: 3000 });
  }
  console.log('PASS tab close buttons and tab titles are at least 24x24 px with several long tabs at 1366 (normal and maximized) and 390 px; controls stay inside');

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('PASS no CSP or Permissions-Policy reports in the Art Viewer cases');
} finally {
  await browser.close();
}
