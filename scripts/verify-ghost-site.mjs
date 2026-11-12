// Batch 20 (rework plan: the ghost across the site) against a running seeded fixture (npm run test:regression starts
// one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-ghost-site.mjs
// Stunts are forced with localStorage migrainz-ghost-test = "force:<name>" (outside production builds only; forced waits
// are short). Checks: the Watcher looks at the shop item; the amber pitch switches to amber and back, never touching the
// saved setting, and a change by the visitor wins; the boot ad hijack (kept across a reload of the visit); the misclick
// box opens and closes itself without focus; the archive's unlisted.txt from visit 5 (opens in place); the
// end-of-chapter line only by reading to the last page with a next chapter, never by GO TO; reduced motion: no stunts
// (also no misclick); exorcised: nothing even when forced; the PHOSPHOR button during the amber pitch.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

const open = async (force, { width = 1366, height = 768, reducedMotion = 'no-preference', href = '/', announcement = true, pre = null } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, timezoneId: 'America/Chicago' });
  await context.addInitScript(([value, skip, stored]) => {
    try { if (skip) sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); localStorage.setItem('migrainz-ghost-test', value); if (stored && !sessionStorage.getItem('pre-set')) { localStorage.setItem('migrainz-ghost-v1', JSON.stringify(stored)); sessionStorage.setItem('pre-set', '1'); } } catch {}
    window.__ghost = [];
    window.addEventListener('migrainz:ghost', event => window.__ghost.push(event.detail.name));
    window.__glances = [];
    window.addEventListener('migrainz:watcher-glance', event => window.__glances.push(event.detail));
  }, [`force:${force}`, announcement, pre]);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + href);
  if (announcement) await page.locator('.startup-sequence').waitFor({ state: 'detached' });
  return { context, page };
};

try {
  // 1. The Watcher looks at the shop item, holding about 4 s.
  {
    const { context, page } = await open('watcher');
    await page.waitForFunction(() => window.__ghost.includes('watcher'), null, { timeout: 15000 });
    const [glance] = await page.evaluate(() => window.__glances);
    const shop = await page.locator('#shop .nav-trigger').boundingBox();
    assert.ok(Math.abs(glance.x - (shop.x + shop.width / 2)) < 2 && Math.abs(glance.y - (shop.y + shop.height / 2)) < 2, 'the glance is at the shop item');
    assert.equal(glance.hold, 4000);
    pass('Watcher: looks at the shop item for about 4 s');
    await context.close();
  }
  // 2. Amber pitch: amber and back; the saved setting untouched; a change by the visitor wins.
  {
    const { context, page } = await open('amber');
    await page.waitForFunction(() => document.documentElement.dataset.phosphor === 'amber', null, { timeout: 20000 });
    await page.waitForFunction(() => [...document.querySelectorAll('.home-term-log p[data-kind="ghost"]')].some(p => p.textContent === 'this is my good side.'));
    assert.equal(await page.locator('.home-term-log p[data-kind="ghost"]').last().getAttribute('aria-hidden'), 'true', 'the stunt line is hidden from screen readers (20b)');
    assert.match(await page.locator('.phosphor-toggle').first().textContent(), /AMBER/, 'the PHOSPHOR button follows the screen (20b)');
    assert.equal(await page.evaluate(() => localStorage.getItem('crt-phosphor')), null, 'the saved setting is untouched');
    await page.waitForFunction(() => document.documentElement.dataset.phosphor === 'green', null, { timeout: 10000 });
    assert.match(await page.locator('.phosphor-toggle').first().textContent(), /GREEN/);
    pass('amber pitch: amber with "this is my good side." (hidden from screen readers), then green again; button follows; saved setting untouched');
    await context.close();
  }
  {
    const { context, page } = await open('amber');
    await page.waitForFunction(() => document.documentElement.dataset.phosphor === 'amber', null, { timeout: 20000 });
    // The visitor picks amber themselves (the terminal command saves it): it stays amber.
    await page.locator('#home-terminal-input').fill('phosphor amber');
    await page.locator('#home-terminal-input').press('Enter');
    await page.waitForTimeout(6000);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.phosphor), 'amber', 'the visitor\'s own choice wins');
    pass('amber pitch: the visitor\'s own phosphor choice is kept');
    await context.close();
  }
  {
    // 20b: the PHOSPHOR button pressed during the pitch steps from what the screen shows: green, saved, and it stays.
    const { context, page } = await open('amber');
    await page.waitForFunction(() => document.documentElement.dataset.phosphor === 'amber', null, { timeout: 20000 });
    await page.evaluate(() => document.querySelector('.phosphor-toggle').click());
    assert.equal(await page.evaluate(() => localStorage.getItem('crt-phosphor')), 'green');
    await page.waitForTimeout(5500);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.phosphor), 'green');
    pass('amber pitch: the PHOSPHOR button during the pitch goes to green and keeps it');
    await context.close();
  }
  // 3. Boot ad hijack, kept across a reload of the visit.
  {
    const { context, page } = await open('boot-ad', { announcement: false });
    await page.locator('.startup-sequence[data-phase="announcement"]').waitFor();
    assert.match(await page.locator('.startup-sequence .eyebrow').first().textContent(), /THIS AD WAS NOT APPROVED BY STUDIO MIGRAINZ/);
    await page.reload();
    await page.locator('.startup-sequence[data-phase="announcement"]').waitFor();
    assert.match(await page.locator('.startup-sequence .eyebrow').first().textContent(), /NOT APPROVED/, 'kept on reload');
    pass('boot ad hijack: "THIS AD WAS NOT APPROVED BY STUDIO MIGRAINZ", kept across a reload');
    await context.close();
  }
  // 4. Misclick on the grey-window desktop: opens and closes itself, no focus taken.
  {
    const { context, page } = await open('misclick', { href: '/projects' });
    const focused = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 60));
    await page.locator('.ghost-misclick').waitFor({ timeout: 15000 });
    assert.equal(await page.locator('.ghost-misclick').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 60)), focused, 'focus unchanged');
    await page.locator('.ghost-misclick').waitFor({ state: 'detached', timeout: 3000 });
    pass('misclick: tty0.exe "sorry. misclick." opens and closes itself, focus untouched');
    await context.close();
  }
  // 5. Archive file from visit 5, opening in place.
  {
    const { context, page } = await open('', { href: '/archive' });
    await page.waitForTimeout(800);
    assert.equal(await page.locator('.ghost-file').count(), 0, 'no unlisted.txt on an early visit');
    // Set from a page with no app code (robots.txt), so the archive page's own save on leaving cannot write over it; no
    // activity time in the record, so the next load is a new visit (batch 21).
    await page.goto(base + '/robots.txt');
    await page.evaluate(() => { localStorage.setItem('migrainz-ghost-v1', JSON.stringify({ visits: 4, lastEvent: -10 })); sessionStorage.removeItem('migrainz-ghost-session-v1'); localStorage.removeItem('migrainz-ghost-test'); });
    await context.addInitScript(() => { try { localStorage.removeItem('migrainz-ghost-test'); } catch {} });
    await page.goto(base + '/archive');
    await page.locator('.startup-sequence').waitFor({ state: 'detached' });
    const file = page.locator('.ghost-file');
    await file.waitFor();
    await file.click();
    assert.equal(await file.getAttribute('aria-expanded'), 'true');
    assert.match(await page.locator('.ghost-note pre').textContent(), /— tty0/);
    // Batch 21: Harold approved the note (2026-11-12); the row is no longer switched off in production builds.
    const source = readFileSync(new URL('../components/ghost/GhostArchiveFile.tsx', import.meta.url), 'utf8');
    assert.ok(!/NODE_ENV|UNLISTED_APPROVED/.test(source), 'unlisted.txt has no production-off switch');
    pass('archive: unlisted.txt from visit 5, opens in place; not switched off in production builds');
    await context.close();
  }
  // 6. End of a chapter: only by reading to the last page, and only with a readable next chapter.
  {
    const { context, page } = await open('chapter', { href: '/comics/blushland/chapter-01' });
    const next = page.getByRole('button', { name: 'NEXT', exact: true }).first();
    await page.getByLabel('Go to page').selectOption({ value: '2' });
    await page.waitForTimeout(800);
    assert.equal(await page.locator('.ghost-chapter').count(), 0, 'not by GO TO');
    await page.getByLabel('Go to page').selectOption({ value: '0' });
    await page.waitForTimeout(800);
    await next.click();
    await page.waitForTimeout(700);
    await next.click();
    await page.waitForTimeout(800);
    const line = await page.locator('.ghost-chapter').count();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('migrainz-ghost-v1') ?? '{}').chapters ?? []);
    assert.ok(stored.some(label => /chapter 01/i.test(label)), `the chapter is recorded as finished (${JSON.stringify(stored)})`);
    if (line) {
      assert.match(await page.locator('.ghost-chapter').textContent(), /i've read what happens next\. CHAPTER \d+ →/);
      const box = await page.locator('.ghost-chapter').boundingBox(), area = await page.locator('.comic-page-stage .art-viewer-canvas').boundingBox();
      assert.ok(box.y >= area.y && box.y + box.height <= area.y + area.height + 1, 'over the page, not over the bars');
    }
    pass(`end of chapter: recorded when read to the last page, never by GO TO; ${line ? 'the line shows (a next chapter exists)' : 'no line (no readable next chapter in the fixture)'}`);
    await context.close();
  }
  // 7. Reduced motion: no stunts.
  {
    const { context, page } = await open('watcher,amber,misclick', { reducedMotion: 'reduce' });
    await page.waitForTimeout(3000);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.phosphor), 'green');
    assert.deepEqual(await page.evaluate(() => window.__ghost), [], 'no stunts with reduced motion');
    pass('reduced motion: no stunts');
    await context.close();
  }
  {
    const { context, page } = await open('misclick', { reducedMotion: 'reduce', href: '/projects' });
    // Settled first, then 8 s: forced stunts wait at most 0.6 s (ghost.delay caps them), so a stunt would have shown by
    // then, and a slow boot cannot hide one (20c, 20d).
    await page.waitForFunction(() => document.documentElement.dataset.power === 'on' && !document.querySelector('.startup-sequence'));
    await page.waitForTimeout(8000);
    assert.equal(await page.locator('.ghost-misclick').count(), 0);
    pass('reduced motion: no misclick on the grey desktop');
    await context.close();
  }
  // 8. Exorcised: nothing, even when forced (20b).
  {
    const { context, page } = await open('watcher,amber,misclick,boot-ad', { pre: { visits: 6, lastEvent: -10, exorcised: true } });
    await page.waitForFunction(() => document.documentElement.dataset.power === 'on' && !document.querySelector('.startup-sequence'));
    await page.waitForTimeout(8000);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.phosphor), 'green');
    assert.deepEqual(await page.evaluate(() => window.__ghost), [], 'no stunts once exorcised');
    // The archive file too (visit 7 here), on the page where it would show.
    await page.goto(base + '/archive');
    // 20d: the boot first, then the wait (a slow boot could otherwise hide the row).
    await page.waitForFunction(() => document.documentElement.dataset.power === 'on' && !document.querySelector('.startup-sequence'));
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('.ghost-file').count(), 0, 'no unlisted.txt once exorcised');
    pass('exorcised: no stunts even when forced');
    await context.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-ghost-site: all checks passed');
} finally {
  await browser.close();
}
