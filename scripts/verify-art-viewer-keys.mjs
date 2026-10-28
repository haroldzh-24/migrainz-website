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
  await page.keyboard.press('Escape');
  await viewer.waitFor({ state: 'hidden', timeout: 3000 });
  // A restored viewer has no opener: focus goes to the project window, never the page body.
  await page.waitForFunction(() => document.activeElement?.closest('.retro-window, #top') != null, null, { timeout: 3000 })
    .catch(async () => assert.fail(`a restored viewer closed: focus is on <${await page.evaluate(() => document.activeElement?.tagName)}>, not the project window`));
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

  // 6b. A file in a project window opened by mouse: closing the viewer by mouse hands focus back without popping the
  // file's Properties panel (it only opens for keyboard focus), at desktop and phone widths, and without scrolling the
  // window workspace.
  for (const size of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.evaluate(() => sessionStorage.removeItem('migrainz-art-viewer-tabs-v2')); // one tab: its × closes the viewer
    await page.goto(base + '/projects/blushland');
    await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
    const file = page.locator('.desktop-file.artwork-file .desktop-file-open').first();
    await file.scrollIntoViewIfNeeded();
    await file.click();
    await viewer.waitFor();
    const scrollBefore = await page.evaluate(() => document.querySelector('.public-windows')?.scrollTop ?? 0);
    await viewer.locator('.art-viewer-tab-close').last().click();
    await viewer.waitFor({ state: 'hidden', timeout: 3000 });
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.desktop-inspector').count(), 0, `${size.width}px: no Properties panel after a mouse close`);
    assert.ok(await page.evaluate(() => document.activeElement?.matches('.desktop-file-open')), `${size.width}px: focus back on the file (${await focusedText()})`);
    const scrollAfter = await page.evaluate(() => document.querySelector('.public-windows')?.scrollTop ?? 0);
    assert.ok(Math.abs(scrollAfter - scrollBefore) < 2, `${size.width}px: the workspace did not scroll (${scrollBefore} -> ${scrollAfter})`);
  }
  console.log('PASS a file opened and closed by mouse gets focus back without its Properties panel or a scroll jump (1366 and 390 px)');

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
