// Batch 26 (design canvas board 21, the scroll-told project page; with the 24b lore-card fixes) against a running seeded
// fixture (npm run test:regression starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-scroll-file.mjs
// Checks on /projects/blushland:
// - sections and anchors in order (OVERVIEW, CHARACTERS, EQUIPMENT, CHAPTERS, then the page's earlier sections FACTIONS,
//   ARTWORK with #gallery-*, FILES with the archive rows, PRODUCTION); empty sections left out (no WRITING in the
//   fixture); counts and cards count only non-classified rows; classified placeholders stay; no restricted text; at most
//   one turning schematic; the server HTML has no hidden start state;
// - the ON THIS PAGE nav: real #id links, aria-current="location", a click scrolls the window (not the page) to the
//   section and focuses its heading; SCROLL nnn% (aria-hidden) and the rail reach 100% at the end with PRODUCTION current;
// - motion: the numbers and key art move by transform only, never more than 24 px; frames below the first screen
//   reveal once; nothing transformed or hidden with MOTION: REDUCED, the plain view, CRT off, OS reduced motion or print;
// - the scroll listener goes with the window's content area when the route changes; 390: one-row index strip, 44 px
//   targets, header strip not sticky, one card per row, no sideways scroll; axe clean (terminal and plain);
// - 24b: a lore card at the bottom of the window opens above its link, inside the window, without growing the scroll
//   height; a resize places it again; Escape on a hover-shown card is handled before any other listener.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
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
const P = '/projects/blushland';
const SHOTS = 'test-results/batch-26';
mkdirSync(SHOTS, { recursive: true });

const open = async ({ width = 1366, height = 768, storage = {}, reducedMotion } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}), ...(reducedMotion ? { reducedMotion } : {}) });
  await context.addInitScript(values => {
    try {
      sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001');
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    } catch {}
    // Listener bookkeeping for the cleanup check: scroll listeners added to and removed from the window content area.
    const net = new Map();
    window.__scrollListeners = net;
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === 'scroll' && this instanceof Element && this.classList.contains('project-app-content')) net.set(this, (net.get(this) ?? 0) + 1);
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      if (type === 'scroll' && this instanceof Element && this.classList.contains('project-app-content')) net.set(this, (net.get(this) ?? 0) - 1);
      return remove.call(this, type, listener, options);
    };
    // 24b: an Escape listener on the document added before the page's own (bubbling): it must never see an unhandled
    // Escape while a hover card is up.
    document.addEventListener('keydown', event => { if (event.key === 'Escape') window.__earlyEscape = event.defaultPrevented; });
  }, storage);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const visit = async (page, route = P, ready = '.project-application .scroll-file') => {
  await page.goto(base + route);
  await page.locator(ready).waitFor();
  await page.locator('.startup-sequence').waitFor({ state: 'detached' });
  await page.waitForTimeout(800); // hydration and the window's arrival
};
const box = page => page.locator('.project-app-content');
const scrollTo = (page, fraction) => box(page).evaluate((element, f) => { element.scrollTop = (element.scrollHeight - element.clientHeight) * f; }, fraction);
const state = page => page.evaluate(() => {
  const content = document.querySelector('.project-app-content');
  const rail = document.querySelector('.scroll-file-rail').getBoundingClientRect(), fill = document.querySelector('.scroll-file-rail-fill').getBoundingClientRect();
  const translate = element => { const value = getComputedStyle(element).transform; return value === 'none' ? 0 : new DOMMatrixReadOnly(value).m42; };
  return {
    pct: document.querySelector('.scroll-file-pct').textContent, current: document.querySelector('.scroll-file-index a[aria-current="location"]')?.getAttribute('href'),
    rail: rail.height > rail.width ? fill.height / rail.height : fill.width / rail.width,
    numbers: [...document.querySelectorAll('.scroll-file-num')].map(translate), art: translate(document.querySelector('.scroll-file-art > *')),
    transforms: [...document.querySelectorAll('.scroll-file-num, .scroll-file-art > *')].map(element => getComputedStyle(element).transform),
    pending: document.querySelectorAll('[data-reveal="pending"]').length, top: content.scrollTop, pageY: scrollY,
    hidden: [...document.querySelectorAll('.scroll-reveal')].filter(element => { const style = getComputedStyle(element); return style.opacity !== '1' || style.clipPath !== 'none'; }).length,
  };
});
const settle = page => page.waitForTimeout(400);
// The section's label and heading are below the sticky header strip (desktop) or index strip (phones) after a jump.
const clear = (page, id) => page.evaluate(id => {
  const section = document.getElementById(id), cover = [...document.querySelectorAll('.scroll-file-head, .scroll-file-index')].filter(el => getComputedStyle(el).position === 'sticky');
  const label = section.querySelector('.scroll-file-kicker, .scroll-file-title').getBoundingClientRect();
  // Only a sticky bar above the label's column counts (the desktop index sits beside the sections).
  const over = cover.map(el => el.getBoundingClientRect()).filter(r => r.left < label.right && r.right > label.left);
  const covered = Math.max(...over.map(r => r.bottom), document.querySelector('.project-app-content').getBoundingClientRect().top);
  return label.top >= covered - 0.5 ? true : `${label.top} < ${covered}`;
}, id);
const axe = async page => {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const result = await window.axe.run({ include: ['.project-application'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return result.violations.flatMap(v => v.nodes.map(n => `${v.id} ${n.target.join(' ')}: ${n.failureSummary.split('\n').slice(0, 2).join(' ')}`));
  });
};
// Everything still: no transform on the numbers or the key art, nothing waiting to reveal, every frame fully shown.
const still = async (page, label) => {
  for (const fraction of [0, 0.3, 0.7, 1]) {
    await scrollTo(page, fraction);
    await settle(page);
    const s = await state(page);
    assert.ok(s.transforms.every(value => value === 'none'), `${label}: no transforms at ${fraction} (${s.transforms.join(', ')})`);
    assert.equal(s.pending, 0, `${label}: nothing waiting to reveal`);
    assert.equal(s.hidden, 0, `${label}: every frame fully shown`);
  }
};

try {
  // 0. Server HTML: the content is all there, no hidden start state, no restricted text.
  {
    const html = await (await fetch(base + P)).text();
    assert.ok(!/data-reveal=/.test(html), 'no reveal start state in the server HTML');
    assert.ok(html.includes('scroll-file') && html.includes('id="production"'), 'the scroll file is server-rendered');
    assert.ok(!/SENTINEL/.test(html), 'no restricted fixture text in the server HTML');
    pass('server HTML: scroll file rendered, no hidden start state, no restricted text');
  }

  // 1. Desktop 1366x768, terminal view.
  {
    const { context, page } = await open();
    await visit(page);
    const ids = await page.locator('.scroll-file-section').evaluateAll(sections => sections.map(section => section.id));
    assert.deepEqual(ids, ['overview', 'characters', 'equipment', 'chapters', 'factions', 'artwork', 'files', 'production'], 'sections in order; WRITING (empty in the fixture) left out');
    const index = await page.locator('nav[aria-label="On this page"] a').evaluateAll(links => links.map(link => [link.getAttribute('href'), link.textContent]));
    assert.deepEqual(index, ids.map((id, i) => [`#${id}`, `${String(i + 1).padStart(2, '0')}${id === 'production' ? 'PRODUCTION' : id.toUpperCase()}`]), 'the index lists every section as a real #id link');
    assert.equal(await page.locator('.scroll-file-index-label').textContent(), 'ON THIS PAGE');
    for (const anchor of ['#factions', '#gallery-regression-art', '#production']) assert.equal(await page.locator(anchor).count(), 1, `anchor ${anchor} kept`);
    assert.equal(await page.locator('#files a[href="#production"]').count(), 1, 'the FILES list keeps the PRODUCTION NOTES row (and any archive rows)');
    assert.equal(await page.locator('#files .directory-row', { hasText: 'AWAITING FILES' }).count(), 2, 'the AWAITING FILES folders stay');
    assert.deepEqual(await page.locator('.scroll-file-section').evaluateAll(sections => sections.map(section => section.querySelector('.scroll-file-num').getAttribute('aria-hidden'))), ids.map(() => 'true'), 'the big numbers are decoration');
    // Cards and counts: non-classified rows only.
    assert.equal(await page.locator('#characters .scroll-file-kicker').textContent(), '2 RECORDS');
    assert.deepEqual(await page.locator('#characters .scroll-file-card').evaluateAll(cards => cards.map(card => [card.getAttribute('href'), card.querySelector('strong').textContent, card.querySelector('.scroll-file-card-line').textContent])),
      [[`${P}/characters/fixture-operative`, 'Fixture Operative', 'REGRESSION EMBLEM'], [`${P}/characters/the-observer`, 'THE OBSERVER', 'EXAMPLE CHARACTER / FIELD RECORDER']], 'public characters with role · public faction');
    const rows = await page.locator('#equipment .scroll-file-row').evaluateAll(links => links.map(link => link.textContent));
    assert.equal(await page.locator('#equipment .scroll-file-kicker').textContent(), `${rows.length} FILED`);
    assert.ok(rows.includes('Fixture ScannerFixture_Scanner.EQP'), 'equipment rows with their .EQP file');
    assert.equal(await page.locator('.scroll-file .scroll-file-schematic').count(), 1, 'one turning schematic at most');
    assert.equal(await page.locator('.scroll-file video, .scroll-file .schematic-spinner').count() <= 2, true, 'one spinner (a layered spinner holds two layers at most)');
    assert.deepEqual(await page.locator('#chapters .scroll-file-row').evaluateAll(links => links.map(link => [link.getAttribute('href'), link.textContent])),
      [['/comics/blushland/chapter-01', 'CH 01 · CHAPTER 01 / FIRST SIGNAL3 PAGES']], 'public chapter row with its page count');
    assert.equal(await page.locator('#chapters .classified-placeholder').count(), 1, 'the sealed chapter stays a placeholder in CHAPTERS');
    assert.ok(!/SENTINEL/.test(await page.content()), 'no restricted fixture text');
    // Start: 000%, OVERVIEW current, the scroll readout is not read out.
    let s = await state(page);
    assert.equal(s.pct, 'SCROLL 000%');
    assert.equal(await page.locator('.scroll-file-pct').getAttribute('aria-hidden'), 'true');
    assert.equal(s.current, '#overview');
    assert.ok(s.pending > 0, 'frames below the first screen wait to reveal');
    assert.deepEqual(await axe(page), [], 'axe: scroll file (terminal)');
    await page.screenshot({ path: `${SHOTS}/verify-scroll-1366-top.png` });
    // Index click: the window scrolls (not the page), the heading takes focus, the link becomes current.
    await page.locator('.scroll-file-index a[href="#equipment"]').click();
    await page.waitForFunction(() => { const c = document.querySelector('.project-app-content'), t = document.getElementById('equipment'); return Math.abs(t.getBoundingClientRect().top - c.getBoundingClientRect().top - parseFloat(getComputedStyle(t).scrollMarginTop)) < 4; }, null, { timeout: 5000 });
    s = await state(page);
    assert.equal(s.pageY, 0, 'the page itself did not scroll');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'equipment-title', 'focus on the section heading');
    assert.equal(await clear(page, 'equipment'), true, 'the label and heading are not under the sticky header');
    assert.equal(s.current, '#equipment', 'aria-current follows');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.scroll-file-head')).position), 'sticky', 'the header strip stays on desktop');
    pass('1366: sections, anchors, counts and cards (public only), one schematic, index scrolls the window and focuses the heading, axe clean');
    // Drift and reveal along the way; the end.
    let maxDrift = 0;
    for (let f = 0; f <= 1.0001; f += 0.1) {
      await scrollTo(page, f);
      await settle(page);
      s = await state(page);
      maxDrift = Math.max(maxDrift, ...s.numbers.map(Math.abs), Math.abs(s.art));
      assert.ok(s.numbers.every(n => Math.abs(n) <= 24.01) && Math.abs(s.art) <= 24.01, `drift within 24 px at ${f.toFixed(1)}`);
    }
    assert.ok(maxDrift > 1, 'the numbers do drift with the scroll');
    await page.waitForTimeout(600);
    s = await state(page);
    assert.equal(s.pct, 'SCROLL 100%');
    assert.equal(s.current, '#production', 'PRODUCTION current at the end');
    assert.ok(s.rail > 0.98, 'the rail is full');
    assert.equal(s.pending, 0, 'every frame revealed once scrolled past');
    assert.equal(s.hidden, 0, 'every frame fully shown');
    await page.screenshot({ path: `${SHOTS}/verify-scroll-1366-end.png` });
    // Back up: frames stay revealed (once only).
    await scrollTo(page, 0);
    await settle(page);
    assert.equal((await state(page)).pending, 0, 'no frame hides again');
    pass('1366: numbers and key art drift by transform only (max ' + maxDrift.toFixed(1) + ' px <= 24), frames reveal once, SCROLL 100% and the rail full with PRODUCTION current at the end');
    // Listener cleanup: the CHARACTERS tab changes the route; the old content area keeps no scroll listener.
    await page.locator('.project-app-nav a', { hasText: 'CHARACTERS' }).click();
    await page.waitForURL(`**${P}/characters`);
    await page.waitForTimeout(800);
    const leftOver = await page.evaluate(() => [...window.__scrollListeners].filter(([element]) => !element.isConnected).map(([, count]) => count));
    assert.ok(leftOver.length > 0 && leftOver.every(count => count === 0), `the old content area kept no scroll listener (${leftOver})`);
    pass('cleanup: the scroll listener is removed with the window content area');
    await context.close();
  }

  // 2. Nothing moves or hides: MOTION: REDUCED, the plain view, CRT off, OS reduced motion, print.
  for (const [label, options] of [['MOTION: REDUCED', { storage: { 'migrainz-motion': 'reduced' } }], ['plain view', { storage: { 'migrainz-view': 'plain' } }],
    ['CRT off', { storage: { 'crt-effects': 'off' } }], ['OS reduced motion', { reducedMotion: 'reduce' }]]) {
    const { context, page } = await open(options);
    await visit(page);
    await still(page, label);
    if (label === 'plain view') {
      assert.deepEqual(await axe(page), [], 'axe: scroll file (plain)');
      await scrollTo(page, 0);
      await page.screenshot({ path: `${SHOTS}/verify-scroll-plain-1366-top.png` });
    }
    // Index jumps are instant with reduced motion.
    if (label !== 'CRT off') {
      await page.locator('.scroll-file-index a[href="#chapters"]').click();
      const offset = await page.evaluate(() => { const c = document.querySelector('.project-app-content'), t = document.getElementById('chapters'); return t.getBoundingClientRect().top - c.getBoundingClientRect().top - parseFloat(getComputedStyle(t).scrollMarginTop); });
      assert.ok(Math.abs(offset) < 4, `${label}: the jump lands at once (${offset})`);
    }
    await context.close();
  }
  {
    const { context, page } = await open();
    await visit(page);
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(300);
    await still(page, 'print');
    await context.close();
  }
  pass('MOTION: REDUCED, plain view, CRT off, OS reduced motion and print: no transforms, nothing hidden, instant jumps; plain view axe clean');

  // 3. Phone 390.
  {
    const { context, page } = await open({ width: 390, height: 844 });
    await visit(page);
    const m = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.scroll-file-index a')].map(link => link.getBoundingClientRect());
      const list = document.querySelector('.scroll-file-index ol'), content = document.querySelector('.project-app-content');
      return { tops: [...new Set(links.map(r => Math.round(r.top)))].length, minHeight: Math.min(...links.map(r => r.height)), overflowX: getComputedStyle(list).overflowX,
        head: getComputedStyle(document.querySelector('.scroll-file-head')).position, index: getComputedStyle(document.querySelector('.scroll-file-index')).position,
        page: document.documentElement.scrollWidth - innerWidth, content: content.scrollWidth - content.clientWidth,
        columns: getComputedStyle(document.querySelector('.scroll-file-cards')).gridTemplateColumns.split(' ').length };
    });
    assert.equal(m.tops, 1, '390: the index is one row');
    assert.ok(m.minHeight >= 44, `390: 44 px targets (${m.minHeight})`);
    assert.equal(m.overflowX, 'auto', '390: the strip scrolls sideways on its own');
    assert.equal(m.head, 'static', '390: header strip not sticky');
    assert.equal(m.index, 'sticky', '390: the index strip stays at the top');
    assert.ok(m.page <= 0 && m.content <= 0, `390: no sideways scroll (${m.page}, ${m.content})`);
    assert.equal(m.columns, 1, '390: one card per row');
    await page.screenshot({ path: `${SHOTS}/verify-scroll-390-top.png` });
    await page.locator('.scroll-file-index a[href="#production"]').click();
    await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(() => document.querySelector('.scroll-file-index a[aria-current]')?.getAttribute('href')), '#production');
    await page.locator('.scroll-file-index a[href="#chapters"]').click();
    await page.waitForTimeout(1200);
    assert.equal(await clear(page, 'chapters'), true, '390: the label and heading are not under the index strip');
    await page.locator('.scroll-file-index a[href="#production"]').click();
    await page.waitForTimeout(1200);
    const inStrip = await page.evaluate(() => { const list = document.querySelector('.scroll-file-index ol').getBoundingClientRect(), link = document.querySelector('.scroll-file-index a[aria-current]').getBoundingClientRect(); return link.left >= list.left - 1 && link.right <= list.right + 1; });
    assert.ok(inStrip, '390: the current entry is scrolled into the strip');
    await page.screenshot({ path: `${SHOTS}/verify-scroll-390-production.png` });
    assert.deepEqual(await axe(page), [], 'axe: scroll file at 390');
    await context.close();
  }
  pass('390: one-row sticky index strip with 44 px targets, header not sticky, one card per row, no sideways scroll, axe clean');

  // 4. 24b: a lore card at the bottom of the window.
  {
    const { context, page } = await open();
    // The fixture's project description names no record, so the lore links of a character's notes are used.
    await visit(page, `${P}/characters/fixture-operative`, '.project-application .dossier');
    const link = page.locator('.project-application .dossier-notes .lore-link').first();
    // Put the link on the window's last visible line.
    await box(page).evaluate((content, selector) => {
      const target = content.querySelector(selector), c = content.getBoundingClientRect(), t = target.getBoundingClientRect();
      content.scrollTop += t.bottom - c.bottom + 12;
    }, '.project-application .dossier-notes .lore-link');
    await settle(page);
    const before = await box(page).evaluate(content => [content.scrollHeight, content.scrollTop]);
    await link.hover();
    const card = page.locator('.project-application .dossier-notes .lore-term').first().locator('.lore-preview');
    await card.waitFor({ state: 'visible' });
    const place = async () => page.evaluate(() => {
      const content = document.querySelector('.project-app-content').getBoundingClientRect();
      const term = document.querySelector('.project-application .dossier-notes .lore-term');
      const card = term.querySelector('.lore-preview').getBoundingClientRect(), first = term.getClientRects()[0];
      return { inside: card.top >= content.top - 0.5 && card.bottom <= content.bottom + 0.5 && card.left >= content.left - 0.5 && card.right <= content.right + 0.5,
        above: card.bottom <= first.top + 0.5, flip: term.dataset.flip ?? null };
    });
    let where = await place();
    assert.deepEqual(where, { inside: true, above: true, flip: 'up' }, 'the card opens above the link, inside the window');
    assert.deepEqual(await box(page).evaluate(content => [content.scrollHeight, content.scrollTop]), before, 'the window\'s scroll height did not grow');
    await page.waitForTimeout(300); // past the fade
    assert.equal(await page.evaluate(() => { const r = document.querySelector('.project-application .dossier-notes .lore-term .lore-preview').getBoundingClientRect();
      return Boolean(document.elementFromPoint(r.left + r.width / 2, r.top + 12)?.closest('.lore-preview')); }), true, 'the card is on top of what it covers');
    await page.screenshot({ path: `${SHOTS}/verify-lore-card-bottom-1366.png` });
    // A resize while it is up places it again (narrower window: still inside).
    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForTimeout(500);
    await link.hover();
    where = await place();
    assert.equal(where.inside, true, `after a resize the card is placed again inside the window (${JSON.stringify(where)})`);
    // Escape with the card shown by hover (focus elsewhere): handled before any other listener; the window stays.
    await page.evaluate(() => { document.activeElement?.blur?.(); window.__earlyEscape = undefined; });
    await page.keyboard.press('Escape');
    assert.equal(await card.isVisible(), false, 'Escape hides the hover card');
    assert.notEqual(await page.evaluate(() => window.__earlyEscape), false, 'no other listener saw the Escape unhandled');
    assert.equal(await page.locator('.retro-window.project-application').isVisible(), true, 'the project window stays');
    await context.close();
  }
  pass('24b: a lore card at the window\'s bottom opens above its link, inside the window, without growing the scroll height; resize re-places it; Escape is handled first');

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-scroll-file: all checks passed');
} finally {
  await browser.close();
}
