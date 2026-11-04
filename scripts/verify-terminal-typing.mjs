// Batch 16 (rework plan: the homepage terminal types its output) against a running seeded fixture (npm run
// test:regression starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-terminal-typing.mjs
// Checks: a command's output lines are complete in the page (textContent, the log region) the moment they are added,
// while the "untyped" highlight hides the not-yet-typed part and shrinks to nothing; the visitor's own command line is
// never hidden; the log does not grow while typing; the cursor rides the typing point and hides at the end; `help`
// finishes within about 2 s; Enter and `clear` during typing finish it at once; the busy flag; reduced motion and CRT
// off print complete lines; no page errors.
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

const open = async ({ reducedMotion = 'no-preference', width = 1366, height = 768 } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); localStorage.setItem('migrainz-ghost-test', 'block'); } catch {}
    window.__typing = [];
    window.addEventListener('migrainz:typing', event => {
      if (event.detail.where !== 'terminal') return;
      window.__typing.push({ ...event.detail, at: performance.now(), busy: document.documentElement.dataset.busy ?? null });
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/');
  await page.locator('.startup-sequence').waitFor({ state: 'detached' });
  return { context, page };
};
const run = async (page, command) => { const input = page.locator('#home-terminal-input'); await input.fill(command); await input.press('Enter'); };
// The untyped characters left (sum over the highlight's ranges) and what the log holds.
const state = page => page.evaluate(() => {
  const highlight = CSS.highlights?.get('untyped');
  let untyped = 0;
  if (highlight) for (const range of highlight) untyped += range.toString().length;
  const log = document.querySelector('.home-term-log');
  const cursor = document.querySelector('.home-terminal-panel .type-cursor');
  return { untyped, text: log.textContent, height: log.scrollHeight, lines: [...log.querySelectorAll('p')].map(p => ({ kind: p.dataset.kind, text: p.textContent, typing: p.hasAttribute('data-typing') })), cursor: cursor && !cursor.hidden, busy: document.documentElement.dataset.busy ?? null };
});
const ended = page => page.waitForFunction(() => window.__typing.some(t => t.state === 'end'));

try {
  {
    const { context, page } = await open();
    // 1. `ls`: complete text at once, hidden then typed, cursor while typing, busy flag.
    await run(page, 'ls');
    await page.waitForFunction(() => window.__typing.some(t => t.state === 'start'));
    const early = await state(page);
    assert.ok(early.text.includes('01  projects.db') && early.text.includes('07  patreon.key'), 'all output is in the page from the start');
    assert.ok(early.untyped > 20, `most of it is still hidden (${early.untyped} characters)`);
    const commandLine = early.lines.find(line => line.kind === 'in');
    assert.ok(commandLine && !commandLine.typing, 'the visitor\'s command line is never hidden');
    assert.ok(early.cursor, 'the cursor shows while typing');
    assert.equal(early.busy, 'typing');
    await ended(page);
    const done = await state(page);
    assert.equal(done.untyped, 0, 'nothing left hidden');
    assert.equal(done.text, early.text, 'the text never changed');
    assert.equal(done.height, early.height, 'the log did not grow while typing');
    assert.ok(!done.cursor, 'cursor hidden at the end');
    assert.equal(done.busy, null, 'busy cleared');
    pass('ls: output complete in the page at once, typed out, cursor and busy flag while typing');

    // 2. `help` (long output) finishes within about 2 s.
    await page.evaluate(() => { window.__typing = []; });
    await run(page, 'help');
    await ended(page);
    const [start, end] = await page.evaluate(() => window.__typing);
    assert.ok(end.at - start.at < 2600, `help typed within ~2 s (${Math.round(end.at - start.at)} ms)`);
    pass('help: long output typed within about 2 s');

    // 3. Enter during typing finishes it at once; `clear` during typing leaves nothing hidden.
    await page.evaluate(() => { window.__typing = []; });
    await run(page, 'help');
    await page.waitForFunction(() => window.__typing.some(t => t.state === 'start'));
    await run(page, 'whoami');
    await page.waitForFunction(() => window.__typing.filter(t => t.state === 'end').length >= 1);
    const after = await state(page);
    assert.ok(after.lines.filter(line => line.text.startsWith('ls ')).every(line => !line.typing), 'the earlier help lines are complete');
    await ended(page);
    await page.evaluate(() => { window.__typing = []; });
    await run(page, 'help');
    await page.waitForFunction(() => window.__typing.some(t => t.state === 'start'));
    await run(page, 'clear');
    await page.waitForFunction(() => window.__typing.some(t => t.state === 'end'));
    const cleared = await state(page);
    assert.equal(cleared.untyped, 0, 'clear leaves nothing hidden');
    assert.equal(cleared.busy, null);
    pass('Enter and clear during typing finish it at once');

    // 4. CRT off: complete at once.
    await page.evaluate(() => { document.documentElement.dataset.crt = 'off'; window.__typing = []; });
    await run(page, 'ls');
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => window.__typing), [], 'CRT off: no typing');
    assert.equal((await state(page)).untyped, 0);
    pass('CRT off: lines appear complete');
    await context.close();
  }
  // 5. Reduced motion: complete at once; phone width: no sideways scroll while typing.
  {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await run(page, 'help');
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => window.__typing), [], 'reduced motion: no typing');
    await context.close();
  }
  {
    const { context, page } = await open({ width: 390, height: 844 });
    await run(page, 'help');
    await page.waitForFunction(() => window.__typing.some(t => t.state === 'start'));
    assert.ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), '390: no sideways scroll while typing');
    await ended(page);
    await context.close();
  }
  pass('reduced motion: complete at once; 390 px: no sideways scroll');

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-terminal-typing: all checks passed');
} finally {
  await browser.close();
}
