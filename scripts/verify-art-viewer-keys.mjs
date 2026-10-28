// Art Viewer keyboard checks against a running seeded fixture (npm run test:regression starts one; so does
// node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-art-viewer-keys.mjs
// bugs.md 2026-10-22: Escape only closed the viewer while it was the focused window. Now Escape closes it whenever it
// is open, unless something else handled the key first (one Escape closes one thing). bugs.md 2026-10-27: a closed
// viewer reopened on the next full page load.
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
  console.log('PASS the announcement takes the first Escape, the restored viewer the second');

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('PASS no CSP or Permissions-Policy reports in the Art Viewer cases');
} finally {
  await browser.close();
}
