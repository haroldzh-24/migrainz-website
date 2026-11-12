// Batch 23 (design canvas board 7, the command palette) against a running seeded fixture (npm run test:regression
// starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-command-palette.mjs
// Checks: /search-index answers `private, no-store` with public records only (no fixture sentinel, safe label or
// classified slug) and is fetched only when the palette first opens; Ctrl+K opens the dialog (aria-modal, label,
// combobox and listbox, RECORDS / COMMANDS, the key line), typing filters, ↑↓ move the selection, Tab stays inside,
// Escape closes and gives focus back to the opener; the empty state; Enter on a record runs the terminal → desktop switch
// (mode-stage events) and lands on the record; Enter on a command (cd, view plain); the homepage terminal's `search`
// and the palette's `help`; the header SEARCH button and SYSTEM ▸ SEARCH (phone); Ctrl+K is ignored in the terminal
// input, during the boot, during a mode switch, in the comic reader and the Art Viewer and on /admin; MOTION: REDUCED and the plain view
// (light dialog); axe clean on the open dialog; no sideways scroll at 390; no page errors. The signed-in patron case of
// the index is scripts/verify-search-index.ts (the fixture server cannot sign in a patron).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = process.env.BASE_URL || process.argv[2];
if (!base || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error('Set BASE_URL to the local fixture server, e.g. http://127.0.0.1:3100'); process.exit(1); }
const require = createRequire(import.meta.url);
const searchPaths = process.env.PATH.split(path.delimiter).map(entry => path.dirname(entry));
const playwright = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : require(require.resolve('playwright', { paths: searchPaths }));
const axeSource = readFileSync(process.env.AXE_MODULE || require.resolve('axe-core/axe.min.js', { paths: searchPaths }), 'utf8');
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const errors = [];
const pass = message => console.log('PASS ' + message);
const CHARACTER = '/projects/blushland/characters/fixture-operative';

const open = async ({ width = 1366, height = 768, storage = {}, boot = false, reducedMotion } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, ...(reducedMotion ? { reducedMotion } : {}) });
  await context.addInitScript(([values, showBoot]) => {
    try {
      if (!showBoot) sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001');
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    } catch {}
    window.__stages = [];
    addEventListener('migrainz:mode-stage', event => window.__stages.push(event.detail));
  }, [storage, boot]);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  page.__index = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/search-index') page.__index += 1; });
  return { context, page };
};
const ready = page => page.locator('.startup-sequence').waitFor({ state: 'detached' });
const dialog = page => page.getByRole('dialog', { name: 'Command palette' });
const input = page => dialog(page).getByRole('combobox');
const ctrlK = page => page.keyboard.press('Control+k');
const options = page => page.evaluate(() => [...document.querySelectorAll('.command-palette [role="option"]')].map(o => ({ label: o.querySelector('.command-palette-label').textContent, hint: o.querySelector('.command-palette-hint').textContent, selected: o.getAttribute('aria-selected') === 'true', id: o.id })));
const groups = page => page.evaluate(() => [...document.querySelectorAll('.command-palette .command-palette-group')].map(g => g.textContent));
const loaded = page => page.waitForFunction(() => !document.querySelector('.command-palette-note') && document.querySelectorAll('.command-palette [role="option"]').length > 0);
const typeQuery = async (page, text) => { await input(page).fill(text); await page.waitForTimeout(50); };
const axe = async page => {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const result = await window.axe.run({ include: ['.command-palette'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return result.violations.flatMap(v => v.nodes.map(n => `${v.id} ${n.target.join(' ')}: ${n.failureSummary.split('\n').slice(0, 2).join(' ')}`));
  });
};

try {
  // 1. The index route: public records only, never cached, not crawled.
  {
    const context = await browser.newContext();
    const response = await context.request.get(base + '/search-index');
    assert.equal(response.status(), 200);
    assert.equal(response.headers()['cache-control'], 'private, no-store', '/search-index is private, no-store');
    const body = await response.text();
    const { records } = JSON.parse(body);
    assert.ok(records.length >= 10, `records listed (${records.length})`);
    for (const word of ['sentinel', 'classified:', 'sealed', 'patron-dossier', 'redacted-']) assert.ok(!body.toLowerCase().includes(word), `${word} must not be in /search-index`);
    for (const kind of ['project', 'chapter', 'character', 'faction', 'equipment']) assert.ok(records.some(record => record.kind === kind), `a ${kind} record is listed`);
    assert.ok(records.every(record => record.href.startsWith('/') && !record.href.startsWith('//')), 'every record links inside the site');
    const robots = await (await context.request.get(base + '/robots.txt')).text();
    assert.ok(robots.includes('Disallow: /search-index'), 'robots.txt disallows /search-index');
    await context.close();
    pass('/search-index: private, no-store; public records of every kind; no sentinel, safe label or classified slug; robots.txt disallows it');
  }

  // 2. Ctrl+K on the homepage: the dialog, filtering, moving, Tab, Escape back to the opener; one fetch per page.
  {
    const { context, page } = await open();
    await page.goto(base + '/');
    await ready(page);
    await page.waitForTimeout(500);
    assert.equal(page.__index, 0, 'no /search-index request before the palette opens');
    const opener = page.locator('.topbar-nav a', { hasText: 'PROJECTS' });
    await opener.focus();
    await ctrlK(page);
    await dialog(page).waitFor();
    assert.equal(await dialog(page).getAttribute('aria-modal'), 'true');
    assert.ok(await input(page).evaluate(element => element === document.activeElement), 'the input has focus');
    assert.equal(await input(page).getAttribute('placeholder'), '> search records or type a command (try: blush, open, help)');
    await loaded(page);
    assert.deepEqual(await groups(page), ['RECORDS', 'COMMANDS'], 'grouped RECORDS / COMMANDS');
    const first = await options(page);
    assert.ok(first.some(o => o.label === 'BLUSHLAND' && o.hint === 'project · BL-001'), `projects listed with their code (${JSON.stringify(first.slice(0, 3))})`);
    assert.ok(first.some(o => o.label === 'help'), 'help is offered');
    assert.match(await page.locator('.command-palette-keys').textContent(), /↑↓ MOVE\s*ENTER OPEN\s*ESC CLOSE\s*(CTRL\+K|⌘K) ANYWHERE/);
    assert.equal(page.__index, 1, 'the index is fetched once, on the first open');
    await typeQuery(page, 'fixture');
    let shown = await options(page);
    assert.ok(shown.length >= 5 && shown.filter(o => !['cd', 'crt', 'view', 'motion', 'phosphor', 'sound', 'open', 'help'].some(c => o.label.startsWith(c))).every(o => /fixture/i.test(o.label + o.hint)), `filtered to fixture records (${JSON.stringify(shown.map(o => o.label))})`);
    assert.ok(shown[0].selected, 'the first result is selected');
    assert.equal(await input(page).getAttribute('aria-activedescendant'), shown[0].id);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    shown = await options(page);
    assert.ok(shown[2].selected && !shown[0].selected, 'ArrowDown moves the selection');
    assert.equal(await input(page).getAttribute('aria-activedescendant'), shown[2].id, 'aria-activedescendant follows');
    await page.keyboard.press('ArrowUp');
    assert.ok((await options(page))[1].selected, 'ArrowUp moves back');
    await page.keyboard.press('Tab');
    assert.ok(await input(page).evaluate(element => element === document.activeElement), 'Tab keeps focus in the dialog');
    await typeQuery(page, 'equipment');
    assert.ok((await options(page)).some(o => o.hint === 'equipment · Fixture_Scanner.EQP'), 'matching by kind and file name');
    await typeQuery(page, 'BL-001');
    assert.equal((await options(page))[0]?.label, 'BLUSHLAND', 'matching by project code');
    // The empty state, and no classified fixture title in the page.
    await typeQuery(page, 'sentinel');
    assert.equal(await page.locator('.command-palette-empty').textContent(), 'NO MATCHING RECORDS. Type help for commands.');
    assert.equal(await page.locator('.command-palette [role="listbox"]').count(), 0, 'no empty listbox');
    assert.ok(!(await page.content()).toLowerCase().includes('sentinel-'), 'no sentinel in the page');
    const violations = await axe(page);
    assert.deepEqual(violations, [], 'axe: empty state');
    await typeQuery(page, '');
    await loaded(page);
    assert.deepEqual(await axe(page), [], 'axe: results');
    await page.keyboard.press('Escape');
    await dialog(page).waitFor({ state: 'detached' });
    await page.waitForTimeout(100);
    assert.ok(await opener.evaluate(element => element === document.activeElement), 'Escape gives focus back to the opener');
    await ctrlK(page);
    await dialog(page).waitFor();
    await loaded(page);
    assert.equal(page.__index, 1, 'reopening does not fetch again');
    await ctrlK(page);
    await dialog(page).waitFor({ state: 'detached' });
    pass('Ctrl+K: dialog, grouped results, filter by name/kind/file/code, ↑↓, Tab trapped, empty state, axe clean, Escape and Ctrl+K close back to the opener, one fetch');
    await context.close();
  }

  // 3. Enter on a record: the terminal → desktop switch, then the record. Enter on commands.
  {
    const { context, page } = await open();
    await page.goto(base + '/about');
    await ready(page);
    await ctrlK(page);
    await loaded(page);
    await typeQuery(page, 'fixture operative');
    assert.equal((await options(page))[0].label, 'Fixture Operative');
    await page.keyboard.press('Enter');
    await page.waitForURL(base + CHARACTER);
    await page.locator('.graphics-route').waitFor({ state: 'attached' });
    await page.waitForFunction(() => window.__stages.includes('idle'));
    const stages = await page.evaluate(() => window.__stages);
    for (const stage of ['print', 'collapse', 'line', 'black', 'reveal']) assert.ok(stages.includes(stage), `mode switch stage ${stage} (${stages.join(',')})`);
    assert.equal(await page.locator('.command-palette').count(), 0, 'closed after opening a record');
    await page.waitForFunction(() => document.querySelector('.mode-switch')?.hidden);
    pass('Enter on a record opens it through the full terminal → desktop switch');
    // A directory command from the desktop.
    await ctrlK(page);
    await loaded(page);
    await typeQuery(page, 'cd /tracker');
    assert.equal((await options(page))[0].label, 'cd /tracker');
    await page.keyboard.press('Enter');
    await page.waitForURL(base + '/tracker');
    // A display command, once the reverse switch is over (Ctrl+K is left alone while it runs).
    await page.waitForFunction(() => document.querySelector('.mode-switch')?.hidden);
    await ctrlK(page);
    await dialog(page).waitFor();
    await typeQuery(page, 'view plain');
    await page.keyboard.press('Enter');
    await dialog(page).waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.view), 'plain', 'view plain applies');
    assert.equal(await page.evaluate(() => localStorage.getItem('migrainz-view')), 'plain', 'and is saved');
    assert.equal(await page.locator('.system-menu-panel .view-toggle').getAttribute('aria-pressed'), 'true', 'the SYSTEM menu button catches up');
    pass('Enter on commands: cd /tracker navigates; view plain applies, is saved and the SYSTEM button follows');
    await context.close();
  }

  // 4. The homepage terminal's `search`, and the palette's `help` from another page.
  {
    const { context, page } = await open();
    await page.goto(base + '/');
    await ready(page);
    const terminal = page.locator('#home-terminal-input');
    await terminal.fill('search blush');
    await terminal.press('Enter');
    await dialog(page).waitFor();
    assert.equal(await input(page).inputValue(), 'blush', 'search passes its text');
    await loaded(page);
    assert.equal((await options(page))[0].label, 'BLUSHLAND');
    await page.keyboard.press('Escape');
    await dialog(page).waitFor({ state: 'detached' });
    await page.waitForTimeout(100);
    assert.ok(await terminal.evaluate(element => element === document.activeElement), 'Escape returns to the terminal input');
    // Ctrl+K in the terminal input belongs to the terminal.
    await terminal.focus();
    await ctrlK(page);
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.command-palette').count(), 0, 'Ctrl+K is ignored in the terminal input');
    // help from /about: home, then the terminal prints its help.
    await page.goto(base + '/about');
    await ready(page);
    await ctrlK(page);
    await dialog(page).waitFor();
    await typeQuery(page, 'help');
    await page.keyboard.press('Enter');
    await page.waitForURL(base + '/');
    await page.waitForFunction(() => [...document.querySelectorAll('.home-term-log p')].some(p => p.textContent.startsWith('search <text>')));
    assert.ok(await terminal.evaluate(element => element === document.activeElement), 'help leaves focus in the terminal');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('migrainz-terminal-run')), null, 'the pending command is used once');
    pass('terminal `search <text>` opens the palette; Escape returns to the terminal; help runs in the homepage terminal');
    await context.close();
  }

  // 5. Where Ctrl+K is left alone: the boot, a running mode switch, the comic reader, /admin.
  {
    const { context, page } = await open({ boot: true });
    await page.goto(base + '/');
    await page.locator('.startup-sequence').waitFor();
    await ctrlK(page);
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.command-palette').count(), 0, 'not during the boot or the announcement');
    await context.close();
  }
  {
    const { context, page } = await open();
    await page.goto(base + '/about');
    await ready(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('migrainz:open-route', { detail: { href: '/projects/blushland' }, cancelable: true })));
    await page.waitForFunction(() => window.__stages.includes('print'));
    await ctrlK(page);
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.command-palette').count(), 0, 'not during a mode switch');
    await page.waitForURL(base + '/projects/blushland');
    await page.goto(base + '/comics/blushland/chapter-01');
    await ready(page);
    await page.locator('.comic-reader-content').focus();
    await ctrlK(page);
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.command-palette').count(), 0, 'not while the comic reader has focus');
    // The Art Viewer keeps its keys too.
    await page.goto(base + '/projects/blushland/equipment/fixture-scanner');
    await ready(page);
    await page.getByRole('button', { name: /OPEN IN ART VIEWER/i }).click();
    await page.locator('.art-viewer-window').waitFor();
    await page.waitForFunction(() => Boolean(document.activeElement?.closest('.art-viewer-window')));
    await ctrlK(page);
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.command-palette').count(), 0, 'not while the Art Viewer has focus');
    await page.goto(base + '/admin/login');
    await page.waitForLoadState('domcontentloaded');
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.command-palette').count(), 0, 'not on /admin');
    pass('Ctrl+K is ignored during the boot, a mode switch, in the comic reader, in the Art Viewer and on /admin');
    await context.close();
  }

  // 6. The plain view and MOTION: REDUCED; the header button.
  {
    const { context, page } = await open({ storage: { 'migrainz-view': 'plain', 'migrainz-motion': 'reduced' } });
    await page.goto(base + '/about');
    await ready(page);
    await page.locator('.topbar-search').click();
    await dialog(page).waitFor();
    await loaded(page);
    const look = await page.evaluate(() => ({ dialog: getComputedStyle(document.querySelector('.command-palette-dialog')).backgroundColor, text: getComputedStyle(document.querySelector('.command-palette-option')).color, font: getComputedStyle(document.querySelector('.command-palette-input')).fontFamily }));
    assert.equal(look.dialog, 'rgb(251, 250, 247)', 'plain view: light dialog');
    assert.equal(look.text, 'rgb(27, 27, 27)', 'plain view: dark text');
    assert.match(look.font, /Arial/, 'plain view: Arial input');
    assert.deepEqual(await axe(page), [], 'axe: plain view');
    await typeQuery(page, 'fixture operative');
    await page.keyboard.press('Enter');
    await page.waitForURL(base + CHARACTER);
    await page.waitForFunction(() => window.__stages.includes('idle'));
    const stages = await page.evaluate(() => window.__stages);
    assert.ok(stages.includes('fade-in') && !stages.includes('collapse'), `reduced motion: crossfade, no collapse (${stages.join(',')})`);
    pass('plain view: light dialog, axe clean; MOTION: REDUCED: records open with the crossfade; header SEARCH opens it');
    await context.close();
  }

  // 7. Phone: SYSTEM ▸ SEARCH, no header button, fits 390, focus back to SYSTEM.
  {
    const { context, page } = await open({ width: 390, height: 844 });
    await page.goto(base + '/');
    await ready(page);
    assert.equal(await page.locator('.topbar-search').isVisible(), false, 'no header button on phones');
    await page.locator('.system-menu-button').click();
    await page.locator('.system-menu-panel .palette-toggle').click();
    await dialog(page).waitFor();
    await loaded(page);
    await typeQuery(page, 'fixture');
    const box = await page.locator('.command-palette-dialog').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, `dialog inside the screen (${JSON.stringify(box)})`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no sideways scroll');
    assert.deepEqual(await axe(page), [], 'axe: phone');
    await page.keyboard.press('Escape');
    await dialog(page).waitFor({ state: 'detached' });
    await page.waitForTimeout(100);
    assert.ok(await page.locator('.system-menu-button').evaluate(element => element === document.activeElement), 'focus returns to SYSTEM');
    // A tap on the dimmed page closes it.
    await page.locator('.system-menu-button').click();
    await page.locator('.system-menu-panel .palette-toggle').click();
    await dialog(page).waitFor();
    await page.mouse.click(195, 830);
    await dialog(page).waitFor({ state: 'detached' });
    pass('phone: SYSTEM ▸ SEARCH, fits 390 with no sideways scroll, axe clean, focus back to SYSTEM, backdrop closes');
    await context.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-command-palette: all checks passed');
} finally {
  await browser.close();
}
