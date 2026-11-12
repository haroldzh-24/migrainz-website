// Batch 18 (rework plan: the ghost's core and hidden shell) against a running seeded fixture (npm run test:regression
// starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-ghost-core.mjs
// Every other browser script runs with the ghost blocked (policy-watch.cjs); this one turns it back on per context with
// localStorage migrainz-ghost-test ("" = the real rules, "force:<names>" = those always on).
// Checks: a first visit gets no tails, console message or 404 line, while the hidden commands answer; a visit counted
// once (a reload keeps its stored roll; batch 21: a new tab within 30 minutes of the last activity joins the same visit,
// after 30 minutes the next load is a new visit, in a new tab or the same one; a tab whose record predates the activity
// time keeps its visit); the rarity rules (cooldown after an event,
// a forced roll picks one event); forced tails, console message, 404 line and tab title; exorcise and summon; the third
// try of .ghost/note.txt; blocked storage keeps the ghost quiet without errors; ghost lines are not in Tab completion.
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
    // Batch 21: a new tab within 30 minutes is the same visit, with the same roll; activity is stored.
    const second = await openPage(created);
    const joined = await stored(second);
    assert.equal(joined.session.visit, 1, 'a new tab within 30 minutes continues the visit');
    assert.deepEqual([joined.session.roll, joined.session.pick], [before.session.roll, before.session.pick], 'the new tab shares the visit\'s roll');
    assert.ok(Math.abs(Date.now() - joined.local.lastActive) < 5 * 60 * 1000, `the last activity time is stored (${joined.local.lastActive})`);
    assert.equal(joined.local.current?.visit, 1, 'the current visit is shared in localStorage');
    await second.close();
    pass('first visit: quiet, hidden commands answer, third note try gives in, not in Tab completion; a new tab within 30 min is the same visit');
    await created.close();
  }

  // 1b. Batch 21: the 30-minute gap. Times are moved back in storage from a page with no app code (robots.txt).
  {
    const created = await context('');
    const page = await openPage(created);
    const age = async minutes => {
      await page.goto(base + '/robots.txt');
      await page.evaluate(ms => { const record = JSON.parse(localStorage.getItem('migrainz-ghost-v1')); record.lastActive = Date.now() - ms; localStorage.setItem('migrainz-ghost-v1', JSON.stringify(record)); }, minutes * 60 * 1000);
    };
    await age(29);
    const fresh = await openPage(created);
    assert.equal((await stored(fresh)).session.visit, 1, 'a new tab 29 minutes after the last activity: same visit');
    await fresh.close();
    await age(31);
    const later = await openPage(created);
    assert.equal((await stored(later)).session.visit, 2, 'a new tab 31 minutes after the last activity: a new visit');
    await later.close();
    // The same tab after the gap: a new visit too, with a new roll.
    await age(31);
    await page.goto(base + '/');
    await page.locator('.startup-sequence').waitFor({ state: 'detached' });
    assert.equal((await stored(page)).session.visit, 3, 'the same tab after 31 minutes: a new visit');
    // A reload within 30 minutes keeps the visit; a tab switch records activity (real keys and pointers: block 1c).
    await age(29);
    await page.goto(base + '/');
    await page.locator('.startup-sequence').waitFor({ state: 'detached' });
    assert.equal((await stored(page)).session.visit, 3, 'a reload within 30 minutes: same visit');
    await page.evaluate(() => { const record = JSON.parse(localStorage.getItem('migrainz-ghost-v1')); record.lastActive = Date.now() - 29 * 60 * 1000; localStorage.setItem('migrainz-ghost-v1', JSON.stringify(record)); });
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    assert.ok(Date.now() - (await stored(page)).local.lastActive < 60 * 1000, 'hiding or showing the tab records activity');
    // A record from before batch 21 (no activity time): the tab keeps its visit; a new tab starts the next one.
    await page.goto(base + '/robots.txt');
    await page.evaluate(() => { const record = JSON.parse(localStorage.getItem('migrainz-ghost-v1')); delete record.lastActive; delete record.current; localStorage.setItem('migrainz-ghost-v1', JSON.stringify(record)); });
    await page.goto(base + '/');
    await page.locator('.startup-sequence').waitFor({ state: 'detached' });
    assert.equal((await stored(page)).session.visit, 3, 'an old record without an activity time: the tab keeps its visit');
    await page.goto(base + '/robots.txt');
    await page.evaluate(() => { const record = JSON.parse(localStorage.getItem('migrainz-ghost-v1')); delete record.lastActive; delete record.current; localStorage.setItem('migrainz-ghost-v1', JSON.stringify(record)); });
    const next = await openPage(created);
    assert.equal((await stored(next)).session.visit, 4, 'an old record without an activity time: a new tab is the next visit');
    pass('visits: a new one only after 30 minutes without activity (new tab or same tab); activity is recorded; old records keep working');
    await created.close();
  }

  // 1c. 21b: real activity, and two tabs. Tab B (robots.txt, no app code) writes the shared record, which fires a storage
  // event in tab A; A's next real key or pointer press reads the record again and records the activity (before 21b it
  // was ignored until some ghost call reloaded the record), the read itself stamps nothing, and the once-a-minute
  // throttle holds.
  {
    const created = await context('');
    const a = await openPage(created);
    const b = await created.newPage();
    await b.goto(base + '/robots.txt');
    const write = (minutes, shared = false) => b.evaluate(([ms, share]) => {
      const record = JSON.parse(localStorage.getItem('migrainz-ghost-v1'));
      record.lastActive = Date.now() - ms;
      if (share) record.current = { ...record.current, ad: true, event: 'shared-test-event', shown: [...record.current.shown, 'shared-test-line'] };
      localStorage.setItem('migrainz-ghost-v1', JSON.stringify(record));
    }, [minutes * 60 * 1000, shared]);
    // A real mouse press on plain text (the header's NODE 01 label), so it opens nothing.
    const press = async () => { const box = await a.locator('.topbar-meta span').first().boundingBox(); await a.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await a.mouse.down(); await a.mouse.up(); };
    const visit = (await stored(a)).session.visit;
    await write(29);
    await a.waitForTimeout(1500); // the storage event reaches A; nothing there may stamp a new time without activity
    const untouched = (await stored(a)).local.lastActive;
    assert.ok(Date.now() - untouched > 28 * 60 * 1000, `re-reading after another tab saved stamps no activity (${Date.now() - untouched} ms old)`);
    await a.keyboard.press('Shift');
    const keyed = (await stored(a)).local.lastActive;
    assert.ok(Date.now() - keyed < 60 * 1000, 'a key press after another tab saved records the activity');
    await a.waitForTimeout(300);
    await a.keyboard.press('Shift');
    await press();
    assert.equal((await stored(a)).local.lastActive, keyed, 'within a minute, further keys and pointer presses write nothing (throttle)');
    // A pointer press alone records activity too (after the time was moved back by the other tab).
    await write(10);
    await a.waitForTimeout(500);
    await press();
    assert.ok(Date.now() - (await stored(a)).local.lastActive < 60 * 1000, 'a pointer press records the activity');
    // Activity prevents a new visit: 31 minutes without activity, then a key press in A, then a new tab: same visit.
    await write(31);
    await a.waitForTimeout(500);
    await a.keyboard.press('Shift');
    const c = await openPage(created);
    assert.equal((await stored(c)).session.visit, visit, 'activity in an open tab keeps the visit going for a new tab');
    await c.close();
    // Two tabs share what the visit has used (mergeVisit): another tab's ad and shown lines reach A's own copy.
    await write(5, true);
    await a.waitForTimeout(500);
    await a.keyboard.press('Shift');
    const merged = (await stored(a)).session;
    assert.equal(merged.ad, true, 'the other tab\'s ad counts for this tab');
    assert.equal(merged.event, 'shared-test-event', 'the other tab\'s ambient event counts for this tab');
    assert.ok(merged.shown.includes('shared-test-line'), 'the other tab\'s shown lines count for this tab');
    pass('activity: keys and pointer presses record it after another tab saved (throttled), a re-read stamps nothing, activity keeps the visit, two tabs share the visit\'s event and ad');
    await created.close();
  }

  // 2. Rarity: right after an event, the next two visits never roll; a lucky roll picks one event for the visit.
  {
    const created = await context('');
    const page = await created.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { Math.random = () => 0.01; });
    // Storage is set from a page with no app code (robots.txt), so no ghost timer of the previous page can save over it.
    const preset = async set => {
      await page.goto(base + '/robots.txt');
      await page.evaluate(set);
      await page.goto(base + '/');
      await page.locator('.startup-sequence').waitFor({ state: 'detached' });
    };
    await page.goto(base + '/');
    await preset(`localStorage.setItem('migrainz-ghost-v1', JSON.stringify({ visits: 5, lastEvent: 5, exorcised: false, milestones: [], adEver: false, chapters: [] })); sessionStorage.removeItem('migrainz-ghost-session-v1');`);
    let record = await stored(page);
    assert.deepEqual([record.session.visit, record.session.roll], [6, false], 'the visit after an event never rolls');
    // 18b: the edges. Two visits after an event: still quiet; three after: may roll. A first visit and an exorcised
    // browser never roll, even with the luckiest draw.
    const visitWith = async (record, expected, message) => {
      await preset(`localStorage.setItem('migrainz-ghost-v1', ${JSON.stringify(JSON.stringify(record))}); sessionStorage.removeItem('migrainz-ghost-session-v1');`);
      const got = await stored(page);
      assert.equal(got.session.roll, expected, `${message} (${JSON.stringify(got)})`);
    };
    await visitWith({ visits: 6, lastEvent: 5 }, false, 'two visits after an event: quiet');
    await visitWith({ visits: 7, lastEvent: 5 }, true, 'three visits after an event: may roll');
    await visitWith({ visits: 0, lastEvent: -10 }, false, 'a first visit never rolls');
    await visitWith({ visits: 20, lastEvent: 0, exorcised: true }, false, 'an exorcised browser never rolls');
    // Corrupt or odd stored values are replaced, not left to silence the ghost.
    await preset(`localStorage.setItem('migrainz-ghost-v1', '{not json'); sessionStorage.setItem('migrainz-ghost-session-v1', JSON.stringify({ visit: 3, shown: null, roll: 'yes' }));`);
    record = await stored(page);
    assert.equal(typeof record.local.visits, 'number', 'corrupt record replaced');
    assert.deepEqual([record.session.visit, record.session.roll], [3, false], 'odd session values normalised');
    await preset(`localStorage.setItem('migrainz-ghost-v1', JSON.stringify({ visits: 9, lastEvent: 2, exorcised: false, milestones: [], adEver: false, chapters: [] })); sessionStorage.removeItem('migrainz-ghost-session-v1');`);
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
    // requisitions.exe links to the store only once its real address is set (data/site.ts).
    const placeholder = /shopIsPlaceholder:\s*true/.test(readFileSync('data/site.ts', 'utf8'));
    assert.equal(await page.locator('.ghost-line a').count(), placeholder ? 0 : 1, 'requisitions.exe links only to a real store address');
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

    // 18b: two tabs. Exorcise in one; the other's saves never undo it.
    const other = await openPage(created);
    await run(page, 'exorcise');
    await run(other, 'cat .ghost/note.txt');
    await run(other, 'help');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('migrainz-ghost-v1')).exorcised), true, 'still exorcised after the other tab saved');
    assert.deepEqual(ghostLines(await run(other, 'who')), [], 'the other tab knows (who without tty0)');
    pass('two tabs: an exorcise in one is not undone by the other');
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
