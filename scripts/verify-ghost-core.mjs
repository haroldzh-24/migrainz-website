// Batch 18 (rework plan: the ghost's core and hidden shell) against a running seeded fixture (npm run test:regression
// starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-ghost-core.mjs
// Every other browser script runs with the ghost blocked (policy-watch.cjs); this one turns it back on per context with
// localStorage migrainz-ghost-test ("" = the real rules, "force:<names>" = those always on).
// Checks: a first visit gets no tails, console message or 404 line, while the hidden commands answer; a visit is a tab
// session, counted once (also across a reload, which keeps its stored roll); the rarity rules (cooldown after an event,
// a forced roll picks one event); forced tails, console message, 404 line and tab title; exorcise and summon; the third
// try of .ghost/note.txt; blocked storage keeps the ghost quiet without errors; ghost lines are not in Tab completion.
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

const context = async (mode = '', { blockStorage = false } = {}) => {
  const created = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await created.addInitScript(([value, blocked]) => {
    try { sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001'); } catch {}
    try { if (value === null) localStorage.removeItem('migrainz-ghost-test'); else localStorage.setItem('migrainz-ghost-test', value); } catch {}
    if (blocked) {
      const getItem = Storage.prototype.getItem, setItem = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) { if (String(key).startsWith('migrainz-ghost-v1') || String(key).startsWith('migrainz-ghost-session')) throw new DOMException('blocked', 'SecurityError'); return getItem.call(this, key); };
      Storage.prototype.setItem = function (key, value) { if (String(key).startsWith('migrainz-ghost-v1') || String(key).startsWith('migrainz-ghost-session')) throw new DOMException('blocked', 'SecurityError'); return setItem.call(this, key, value); };
    }
  }, [mode === '' ? null : mode, blockStorage]);
  return created;
};
const openPage = async (created, href = '/') => {
  const page = await created.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  page.__console = [];
  page.on('console', message => page.__console.push(message.text()));
  await page.goto(base + href);
  await page.locator('.startup-sequence').waitFor({ state: 'detached' });
  return page;
};
// The log keeps 80 lines at most, so new lines are told by their id (data-line), not by the count.
const lastId = page => page.evaluate(() => Math.max(-1, ...[...document.querySelectorAll('.home-term-log p')].map(p => Number(p.dataset.line))));
const run = async (page, command) => {
  const before = await lastId(page);
  const input = page.locator('#home-terminal-input');
  await input.fill(command);
  await input.press('Enter');
  await page.waitForFunction(n => [...document.querySelectorAll('.home-term-log p')].some(p => Number(p.dataset.line) > n), before);
  await page.waitForTimeout(80);
  return page.evaluate(n => [...document.querySelectorAll('.home-term-log p')].filter(p => Number(p.dataset.line) > n).map(p => ({ kind: p.dataset.kind, text: p.textContent })), before);
};
const ghostLines = lines => lines.filter(line => line.kind === 'ghost').map(line => line.text);
const stored = page => page.evaluate(() => ({ local: JSON.parse(localStorage.getItem('migrainz-ghost-v1') ?? 'null'), session: JSON.parse(sessionStorage.getItem('migrainz-ghost-session-v1') ?? 'null') }));

try {
  // 1. First visit with the real rules: no tails, no console message, no 404 line; hidden commands answer.
  {
    const created = await context('');
    const page = await openPage(created);
    assert.equal((await stored(page)).session.visit, 1, 'first visit counted');
    for (let i = 0; i < 6; i++) assert.deepEqual(ghostLines(await run(page, 'help')), [], 'no tail on a first visit');
    assert.ok(!page.__console.some(text => text.includes('floorboards')), 'no console message on a first visit');
    const who = await run(page, 'who');
    assert.ok(ghostLines(who).some(text => /^\?\?\?\?\s+tty0\s+1999-12-31 23:59\s+[\d,]+ days$/.test(text)), `who lists tty0 (${JSON.stringify(who)})`);
    assert.ok(ghostLines(await run(page, 'ls -a')).some(text => text.includes('.ghost/')), 'ls -a shows .ghost/');
    assert.ok(ghostLines(await run(page, 'exit')).includes("there's no exit. there's a gift shop."));
    assert.ok(ghostLines(await run(page, 'sudo rm -rf /')).some(text => text.startsWith('clearance comes from patreon.key')));
    const notes = [];
    for (let i = 0; i < 3; i++) notes.push(ghostLines(await run(page, 'cat .ghost/note.txt'))[0]);
    assert.deepEqual(notes, ["(it's mine)", "(it's mine)", 'fine. it says: buy a print.'], 'the third try gives in');
    // Not offered by Tab completion.
    await page.locator('#home-terminal-input').fill('exo');
    await page.locator('#home-terminal-input').press('Tab');
    assert.equal(await page.locator('#home-terminal-input').inputValue(), 'exo', 'hidden commands are not completed');
    await page.goto(base + '/no-such-page');
    await page.locator('main#top h1', { hasText: 'RECORD NOT FOUND' }).waitFor();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.ghost-line').count(), 0, 'no 404 line on a first visit');
    // A reload in the same tab is the same visit, with the same stored roll.
    const before = await stored(page);
    await page.reload();
    await page.locator('.startup-sequence').waitFor({ state: 'detached' });
    assert.deepEqual((await stored(page)).session, before.session, 'a reload keeps the visit and its roll');
    // A new tab is a new visit.
    const second = await openPage(created);
    assert.equal((await stored(second)).session.visit, 2, 'a new tab is the next visit');
    pass('first visit: quiet, hidden commands answer, third note try gives in, not in Tab completion; visits counted per tab');
    await created.close();
  }

  // 2. Rarity: right after an event, the next two visits never roll; a lucky roll picks one event for the visit.
  {
    const created = await context('');
    const page = await created.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { Math.random = () => 0.01; });
    await page.goto(base + '/');
    await page.evaluate(() => { localStorage.setItem('migrainz-ghost-v1', JSON.stringify({ visits: 5, lastEvent: 5, exorcised: false, milestones: [], adEver: false, chapters: [] })); sessionStorage.removeItem('migrainz-ghost-session-v1'); });
    await page.reload();
    await page.locator('.startup-sequence').waitFor({ state: 'detached' });
    let record = await stored(page);
    assert.deepEqual([record.session.visit, record.session.roll], [6, false], 'the visit after an event never rolls');
    await page.evaluate(() => { localStorage.setItem('migrainz-ghost-v1', JSON.stringify({ visits: 9, lastEvent: 2, exorcised: false, milestones: [], adEver: false, chapters: [] })); sessionStorage.removeItem('migrainz-ghost-session-v1'); });
    await page.reload();
    await page.locator('.startup-sequence').waitFor({ state: 'detached' });
    record = await stored(page);
    assert.deepEqual([record.session.visit, record.session.roll, typeof record.session.pick], [10, true, 'string'], 'a lucky roll picks one event for the visit');
    pass('rarity: cooldown after an event; a roll picks the visit\'s one event');
    await created.close();
  }

  // 3. Forced lines on a later visit: tails, console message, 404 line, tab title.
  {
    const created = await context('force:tails,console,not-found,tab');
    const page = await openPage(created);
    const help = await run(page, 'help');
    assert.ok(ghostLines(help).includes('help yourself      run requisitions.exe'), 'help tail');
    assert.ok(ghostLines(await run(page, 'echo hello')).includes('... hello ... patreon.key'), 'echo tail');
    assert.ok(ghostLines(await run(page, 'date')).includes('a good day to support the arts.'), 'date tail');
    assert.ok(ghostLines(await run(page, 'whoami')).includes('could be a patron. just saying.'), 'whoami tail');
    assert.ok(page.__console.some(text => text.includes("you're looking under the floorboards.")), 'console message');
    assert.ok(page.__console.some(text => /patreon down here too → http:\/\/(127\.0\.0\.1|localhost):\d+\/patreon/.test(text)), 'console Patreon link on this site');
    // Tab title while hidden, then "you left me running" and back.
    const title = await page.title();
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => ['come back', 'the shop is still open', "i'm cold. patreon is warm."].includes(document.title));
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.title(), 'you left me running');
    await page.waitForFunction(original => document.title === original, title, { timeout: 6000 });
    await page.goto(base + '/no-such-page');
    await page.locator('.ghost-line').waitFor();
    assert.match(await page.locator('.ghost-line').textContent(), /this page doesn.t exist\. requisitions\.exe does\./);
    assert.equal(await page.locator('.ghost-line a').count(), 0, 'requisitions.exe is plain text while the store address is a placeholder');
    pass('forced: tails on help, echo, date, whoami; console message; tab title away and back; 404 line');

    // 4. exorcise: quiet (no tails, who without tty0, exit plain), console message not repeated; summon brings it back.
    await page.goto(base + '/');
    await page.locator('.startup-sequence').waitFor({ state: 'detached' });
    assert.ok(ghostLines(await run(page, 'exorcise')).some(text => text.startsWith("fine. i'll be quiet")));
    assert.deepEqual(ghostLines(await run(page, 'help')), [], 'no tails once exorcised');
    assert.deepEqual(ghostLines(await run(page, 'who')), [], 'who without tty0');
    assert.deepEqual(ghostLines(await run(page, 'exit')), [], 'exit is plain');
    assert.ok(ghostLines(await run(page, 'summon')).includes('missed me?'));
    assert.ok(ghostLines(await run(page, 'help')).length === 1, 'tails back after summon');
    pass('exorcise silences the ghost; summon brings it back');
    await created.close();
  }

  // 5. Storage blocked for the ghost: quiet (even when forced), hidden commands still answer, no errors.
  {
    const created = await context('force:tails,console', { blockStorage: true });
    const page = await openPage(created);
    assert.deepEqual(ghostLines(await run(page, 'help')), [], 'no tail without storage');
    assert.ok(ghostLines(await run(page, 'exit')).length === 1, 'hidden commands still answer');
    pass('blocked storage: quiet, hidden commands answer');
    await created.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-ghost-core: all checks passed');
} finally {
  await browser.close();
}
