// Batch 19 (rework plan: the ghost's stunts in the terminal) against a running seeded fixture (npm run test:regression
// starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-ghost-terminal.mjs
// Each stunt is forced with localStorage migrainz-ghost-test = "force:<name>" (outside production builds only; forced
// waits are short). Checks: the second user types, shows SESSIONS: 2, erases itself, and the visitor's typing wins at
// once; the second cursor; the idle takeover opens the shop ad tagged "[opened by tty0]" once per visit and is cut short
// by a pointer move ("^C"); the narrow-screen takeover never opens an ad; welcome-back lines; the typing slip on /about
// leaves the real text untouched; reduced motion: no stunts; nothing is announced (aria-hidden); no page errors.
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
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const errors = [];
const pass = message => console.log('PASS ' + message);

const open = async (force, { width = 1366, height = 768, reducedMotion = 'no-preference', href = '/' } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, timezoneId: 'America/Chicago' });
  await context.addInitScript(value => {
    try { sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); localStorage.setItem('migrainz-ghost-test', value); } catch {}
  }, `force:${force}`);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + href);
  await page.locator('.startup-sequence').waitFor({ state: 'detached' });
  return { context, page };
};
const ghostBox = page => page.locator('.home-terminal-panel .ghost-terminal');
const header = page => page.locator('.home-terminal-panel .pnl-end').textContent();

try {
  // 1. Second user: types, SESSIONS: 2, erases itself, decoration only.
  {
    const { context, page } = await open('second-user');
    await page.waitForFunction(() => /\?\?\?\?@migrainz/.test(document.querySelector('.ghost-terminal')?.textContent ?? '') && document.querySelector('.ghost-terminal').textContent.length > 22);
    assert.equal(await header(page), 'SESSIONS: 2');
    assert.equal(await ghostBox(page).getAttribute('aria-hidden'), 'true', 'decoration, hidden from screen readers');
    assert.equal(await page.locator('.home-term-log .ghost-terminal').count(), 0, 'not inside the log region');
    await ghostBox(page).waitFor({ state: 'detached', timeout: 20000 });
    assert.equal(await header(page), 'TYPE help');
    pass('second user: types a message, SESSIONS: 2, erases itself; aria-hidden, outside the log');
    await context.close();
  }
  // 1b. The visitor's typing wins at once.
  {
    const { context, page } = await open('second-user');
    await ghostBox(page).waitFor();
    await page.locator('#home-terminal-input').focus();
    await page.keyboard.type('ls');
    await ghostBox(page).waitFor({ state: 'detached', timeout: 1000 });
    assert.equal(await page.locator('#home-terminal-input').inputValue(), 'ls', 'the visitor\'s text arrives intact');
    pass('second user: typing makes it vanish at once, the input keeps the text');
    await context.close();
  }
  // 2. Second cursor.
  {
    const { context, page } = await open('second-cursor');
    await page.locator('.ghost-terminal[data-faint]').waitFor();
    await page.locator('.ghost-terminal[data-faint]').waitFor({ state: 'detached', timeout: 3000 });
    pass('second cursor: a faint "_" for about a second');
    await context.close();
  }
  // 3. Idle takeover, wide: opens the shop ad tagged, once per visit.
  {
    const { context, page } = await open('idle');
    await page.waitForFunction(() => document.querySelector('.ghost-terminal')?.textContent.includes('open requisitions.exe'), null, { timeout: 30000 });
    await page.locator('#shop-promo').waitFor();
    assert.match(await page.locator('#shop-promo .promo-title').textContent(), /BEST_DEALS\.exe \[opened by tty0\]/);
    await page.waitForFunction(() => document.querySelector('.ghost-terminal')?.textContent.includes("go on. i'll wait."));
    assert.ok(!(await page.locator('#home-terminal-input').evaluate(input => input.value)), 'the visitor\'s input is untouched');
    // Same visit: no second takeover, no second ad.
    await page.reload();
    await page.locator('.startup-sequence').waitFor({ state: 'detached' });
    await page.waitForTimeout(2500);
    assert.equal(await page.locator('#shop-promo').count(), 0, 'no second ad in the visit');
    pass('idle takeover: types open requisitions.exe, opens the ad tagged [opened by tty0], once per visit');
    await context.close();
  }
  // 3b. Interrupted by a pointer move; narrow screens never open the ad.
  {
    const { context, page } = await open('idle', { width: 390, height: 844 });
    await page.waitForFunction(() => /c|cd/.test(document.querySelector('.ghost-terminal')?.textContent ?? ''), null, { timeout: 30000 });
    await page.mouse.move(50, 50);
    await page.mouse.move(60, 70);
    await page.waitForFunction(() => document.querySelector('.ghost-terminal')?.textContent.includes('(input returned to public)'));
    assert.equal(await page.locator('#shop-promo').count(), 0, 'no ad on a narrow screen');
    pass('idle takeover: a pointer move stops it with ^C; narrow screens use cd /archive/.unlisted, never the ad');
    await context.close();
  }
  // 4. Welcome back lines in the log.
  {
    const { context, page } = await open('welcome');
    await page.waitForFunction(() => [...document.querySelectorAll('.home-term-log p[data-kind="ghost"]')].some(p => p.textContent === '(i keep count. nobody asked me to.)'), null, { timeout: 15000 });
    const lines = await page.locator('.home-term-log p[data-kind="ghost"]').allTextContents();
    assert.ok(lines.some(line => /^welcome back\. visit \d+ from this browser\.$|^you're up late too\.$/.test(line)), JSON.stringify(lines));
    assert.ok(lines.includes("you still haven't opened requisitions.exe."));
    pass('welcome back: the ghost keeps count in the terminal');
    await context.close();
  }
  // 5. The typing slip on /about: the wrong words show in the overlay, the page text never changes.
  {
    const { context, page } = await open('slip');
    await page.evaluate(() => window.next.router.push('/about'));
    await page.waitForURL(/\/about$/);
    const before = await page.evaluate(() => document.querySelector('.about-copy p')?.textContent ?? '');
    await page.waitForFunction(() => { const line = document.querySelector('.ghost-slip'); return line && !line.hidden && /that can't|subscribe to/.test(line.textContent); }, null, { timeout: 20000 });
    assert.equal(await page.locator('.ghost-slip').getAttribute('aria-hidden'), 'true');
    await page.waitForFunction(() => document.querySelector('.ghost-slip')?.hidden === true, null, { timeout: 20000 });
    assert.equal(await page.evaluate(() => document.querySelector('.about-copy p')?.textContent ?? ''), before, 'the real text is untouched');
    assert.ok(before.includes('things still taking shape'));
    pass('typing slip on /about: wrong words in the overlay, erased; the real text never changes');
    await context.close();
  }
  // 6. Reduced motion: no stunts even when forced.
  {
    const { context, page } = await open('second-user,second-cursor,idle', { reducedMotion: 'reduce' });
    await page.waitForTimeout(3000);
    assert.equal(await ghostBox(page).count(), 0, 'reduced motion: no stunts');
    pass('reduced motion: no stunts');
    await context.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-ghost-terminal: all checks passed');
} finally {
  await browser.close();
}
