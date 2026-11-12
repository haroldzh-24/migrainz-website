// Batch 24 (design canvas board 8, lore links with hover previews) against a running seeded fixture (npm run
// test:regression starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-lore-links.mjs
// Checks, on the fixture's lore text (scripts/seed-desktop-fixture.ts): record names are links to the right records in
// the server HTML (whole words, longest name first, first mention per paragraph, never the page's own record, never
// inside an existing link, heading or inline code, bold kept); no restricted fixture text anywhere on the pages; hover
// shows the preview card under the link (never over it), inside the window, without moving anything (no layout shift);
// the card's content per kind (character: portrait box, `character.rec · <faction>`, summary; equipment: `.EQP` and the
// poster from /api/media/file; faction: `faction.dir · n members`); keyboard focus shows it and describes the link,
// Escape hides it without closing the window; touch: first tap shows it, second tap opens the record; a link that wraps
// at 390 keeps its card inside the window; the CROSS-REFERENCES aside (kinds, appears in); the plain view (light card)
// and MOTION: REDUCED (no fade); axe clean in the window with a card open; no page errors. The patron and redacted-name
// access cases are scripts/verify-lore-index.ts (the fixture server cannot sign in a patron).
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
const P = '/projects/blushland';
const CHARACTER = `${P}/characters/fixture-operative`;
const FACTION = `${P}/factions/regression-emblem`;
const OBSERVER = `${P}/characters/the-observer`;

const open = async ({ width = 1366, height = 768, storage = {}, touch = false } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, ...(touch ? { isMobile: true, hasTouch: true } : {}) });
  await context.addInitScript(values => {
    try {
      sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001');
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    } catch {}
  }, storage);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const visit = async (page, route) => {
  await page.goto(base + route);
  await page.locator('.project-app-content h1').waitFor();
  await page.locator('.startup-sequence').waitFor({ state: 'detached' });
  await page.waitForTimeout(800); // hydration and the window's arrival
};
const term = (page, kind, index = 0) => page.locator(`.lore-term:has(> .lore-link[data-lore-kind="${kind}"])`).nth(index);
const shown = locator => locator.locator('> .lore-preview').evaluate(element => getComputedStyle(element).display === 'block');
const geometry = locator => locator.evaluate(element => {
  const link = element.querySelector('.lore-link'), card = element.querySelector('.lore-preview');
  const frame = element.closest('.project-app-content').getBoundingClientRect();
  const first = link.getClientRects(), last = first[first.length - 1], rect = card.getBoundingClientRect();
  return { linkBottom: last.bottom, cardTop: rect.top, cardLeft: rect.left, cardRight: rect.right, cardWidth: rect.width, frameLeft: frame.left, frameRight: frame.right,
    overlaps: [...first].some(box => box.left < rect.right && box.right > rect.left && box.top < rect.bottom && box.bottom > rect.top) };
});
const axe = async page => {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const result = await window.axe.run({ include: ['.project-application'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return result.violations.flatMap(v => v.nodes.map(n => `${v.id} ${n.target.join(' ')}: ${n.failureSummary.split('\n').slice(0, 2).join(' ')}`));
  });
};

try {
  // 1. Server HTML: which names link where, and what stays plain.
  {
    const html = await (await fetch(base + CHARACTER)).text();
    const links = [...html.matchAll(/<a class="lore-link"[^>]*data-lore-kind="(\w+)"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)].map(([, kind, href, text]) => [kind, href, text.replace(/<[^>]+>/g, '')]);
    assert.deepEqual(links, [
      ['equipment', `${P}/equipment/fixture-scanner`, 'Fixture Scanner'],
      ['faction', `${P}/factions/regression-emblem`, 'REGRESSION EMBLEM'],
      ['character', `${P}/characters/the-observer`, 'THE OBSERVER'],
      ['equipment', `${P}/equipment/fixture-satchel`, 'Fixture Satchel'],
      ['equipment', `${P}/equipment/fixture-relay`, 'Fixture Relay'],
      ['faction', `${P}/factions/regression-no-emblem`, 'REGRESSION NO EMBLEM'],
    ], `links in order: ${JSON.stringify(links)}`);
    assert.match(html, /<a class="lore-link"[^>]*fixture-satchel"[^>]*><strong>Fixture Satchel<\/strong><\/a>/, 'bold kept inside the link');
    assert.match(html, /<h2>Fixture Lamp schedule<\/h2>/, 'no link inside a heading');
    assert.match(html, /<code>Fixture Relay<\/code>/, 'no link inside inline code');
    assert.match(html, /<a href="\/projects\/blushland\/equipment\/fixture-beacon">Fixture Beacon manual<\/a>/, 'an existing link is left alone');
    assert.match(html, /Fixture Satchel is checked twice/, 'second mention in a paragraph stays plain');
    assert.match(html, /Fixture Lampshade is not a record/, 'a name run into another word is not a name');
    assert.ok(!/class="lore-link"[^>]*fixture-operative/.test(html), 'the page\'s own record is never linked');
    for (const route of [CHARACTER, FACTION, OBSERVER, P]) {
      const body = await (await fetch(base + route)).text();
      assert.ok(!/SENTINEL/.test(body), `${route}: no restricted fixture text`);
    }
    pass('server HTML: six links in order; bold kept; heading, inline code and existing link untouched; first mention only; whole words; not the own record; no restricted text');
  }

  // 2. Hover (1366): the card shows under the link, inside the window, with no layout shift; content per kind.
  {
    const { context, page } = await open();
    await visit(page, CHARACTER);
    const equipment = term(page, 'equipment');
    assert.equal(await shown(equipment), false, 'hidden until hovered');
    // Batch 25: the dossier puts the lore text below the first screen, so bring the link into view before measuring
    // (hover() would scroll the window and move everything by the scroll, not by a layout shift).
    await equipment.locator('> .lore-link').scrollIntoViewIfNeeded();
    const after = page.locator('.lore-main .content-writing h2');
    const before = await after.boundingBox();
    const scroll = await page.locator('.project-app-content').evaluate(element => element.scrollHeight);
    await equipment.locator('> .lore-link').hover();
    await page.waitForTimeout(250);
    assert.equal(await shown(equipment), true, 'hover shows the card');
    const box = await geometry(equipment);
    assert.ok(box.cardTop >= box.linkBottom + 4 && !box.overlaps, `the card sits under the link, never over it (${JSON.stringify(box)})`);
    assert.ok(box.cardLeft >= box.frameLeft && box.cardRight <= box.frameRight, `inside the window (${JSON.stringify(box)})`);
    assert.ok(Math.abs(box.cardWidth - 280) < 1, `280 px wide (${box.cardWidth})`);
    assert.deepEqual(await after.boundingBox(), before, 'no layout shift');
    assert.equal(await page.locator('.project-app-content').evaluate(element => element.scrollHeight), scroll, 'no extra height in flow');
    const card = equipment.locator('> .lore-preview');
    assert.equal(await card.locator('b').textContent(), 'Fixture Scanner');
    assert.equal(await card.locator('.lore-preview-meta').textContent(), 'Fixture_Scanner.EQP');
    const poster = card.locator('.lore-preview-poster img');
    assert.match(await poster.getAttribute('src'), /^\/api\/media\/file\//, 'poster through the media route');
    await poster.evaluate(img => img.complete || new Promise(done => { img.onload = img.onerror = done; }));
    assert.ok(await poster.evaluate(img => img.naturalWidth > 0), 'poster loads');
    assert.equal(Math.round((await card.locator('.lore-preview-poster').boundingBox()).height), 70, 'poster strip 70 px');
    assert.equal(await card.locator('.lore-preview-open').getAttribute('href'), `${P}/equipment/fixture-scanner`);
    // The pointer can travel from the link onto the card (its OPEN RECORD) without the card closing.
    const openRecord = await card.locator('.lore-preview-open').boundingBox();
    await page.mouse.move(openRecord.x + 10, openRecord.y + openRecord.height / 2, { steps: 8 });
    assert.equal(await shown(equipment), true, 'still shown on the way to OPEN RECORD');
    await page.mouse.move(5, 300);
    await page.waitForTimeout(100);
    assert.equal(await shown(equipment), false, 'hidden when the pointer leaves');

    const character = term(page, 'character');
    await character.locator('> .lore-link').hover();
    const meta = await character.locator('.lore-preview-meta').textContent();
    assert.equal(meta, 'character.rec', 'THE OBSERVER has no public faction: the meta line is just the file kind');
    assert.equal(await character.locator('.lore-preview-portrait').count(), 1, 'portrait box');
    assert.match(await character.locator('.lore-preview-summary').textContent(), /^A traveler records the shapes and signals of an unfamiliar landscape\.$/, 'one-line summary');
    const faction = term(page, 'faction');
    await faction.locator('> .lore-link').hover();
    assert.equal(await faction.locator('.lore-preview-meta').textContent(), 'faction.dir · 1 member', 'faction: members count');
    assert.match(await faction.locator('.lore-preview-summary').textContent(), /^A synthetic field unit\.$/);
    assert.equal(await faction.locator('.lore-preview').evaluate(element => getComputedStyle(element).animationName), 'lore-preview-in', 'fades in when motion is allowed');
    assert.deepEqual(await axe(page), [], 'axe: window with a card open');
    pass('hover: card under the link, inside the window, 280 px, no layout shift; equipment (.EQP, 70 px poster), character, faction content; pointer reaches OPEN RECORD; axe clean');

    // 3. Keyboard: focus shows and describes; Escape hides without closing the window; leaving resets.
    await page.mouse.move(5, 300);
    const first = term(page, 'equipment');
    await first.locator('> .lore-link').focus();
    assert.equal(await shown(first), true, 'focus shows the card');
    const described = await first.locator('> .lore-link').evaluate(link => document.getElementById(link.getAttribute('aria-describedby'))?.classList.contains('lore-preview'));
    assert.ok(described, 'aria-describedby points at the card');
    await page.keyboard.press('Escape');
    assert.equal(await shown(first), false, 'Escape hides it');
    assert.ok(await first.locator('> .lore-link').evaluate(link => link === document.activeElement), 'focus stays on the link');
    assert.equal(await page.locator('.project-application').count(), 1, 'the window stays open');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await shown(first), true, 'focus back: shown again');
    assert.notEqual(await first.locator('> .lore-link').evaluate(link => getComputedStyle(link).outlineStyle), 'none', 'visible focus');
    await page.keyboard.press('Enter');
    await page.waitForURL(`**${P}/equipment/fixture-scanner`);
    pass('keyboard: focus shows and describes the card, Escape hides it (window stays, focus stays), Enter opens the record');

    // 4. CROSS-REFERENCES: every linked record with its kind; appears in on a character with chapters.
    await visit(page, CHARACTER);
    const rows = await page.locator('.lore-references li').evaluateAll(items => items.map(item => [item.querySelector('a').textContent, item.querySelector('.lore-references-kind').textContent]));
    assert.deepEqual(rows, [['Fixture Scanner', 'equipment'], ['REGRESSION EMBLEM', 'faction'], ['THE OBSERVER', 'character'], ['Fixture Satchel', 'equipment'], ['Fixture Relay', 'equipment'], ['REGRESSION NO EMBLEM', 'faction']]);
    assert.equal(await page.locator('.lore-references h2').textContent(), 'CROSS-REFERENCES');
    const aside = await page.locator('.lore-references').boundingBox(), main = await page.locator('.lore-main').boundingBox();
    // Batch 25: the character dossier puts the record notes full width under the dossier, so at 1366 the aside has room
    // beside the text (before, the text sat in the narrow right column and the aside went under it).
    assert.ok(aside.x >= main.x + main.width - 1 && Math.abs(aside.y - main.y) < 40, 'wide column: the aside sits beside the text');
    await page.setViewportSize({ width: 560, height: 768 });
    await page.waitForTimeout(200);
    const narrowAside = await page.locator('.lore-references').boundingBox(), narrowMain = await page.locator('.lore-main').boundingBox();
    assert.ok(narrowAside.y >= narrowMain.y + narrowMain.height - 1, 'narrow column: the aside sits under the text');
    await page.setViewportSize({ width: 1366, height: 768 });
    await visit(page, OBSERVER);
    assert.deepEqual(await page.locator('.lore-references li').evaluateAll(items => items.map(item => item.textContent)), ['BLUSHLAND ch. 01 appears in']);
    await visit(page, FACTION);
    assert.deepEqual(await page.locator('.lore-main .lore-link').evaluateAll(links => links.map(link => link.textContent)), ['Fixture Operative', 'THE OBSERVER'], 'faction page links');
    await term(page, 'character').locator('> .lore-link').hover();
    assert.equal(await term(page, 'character').locator('.lore-preview-meta').textContent(), 'character.rec · REGRESSION EMBLEM', 'a character\'s public primary faction');
    assert.equal(await page.locator('.lore-references li').count(), 2);
    pass('CROSS-REFERENCES: linked records with kinds in order, beside the text when wide and under it when narrow, appears in (chapters); faction page links and aside');
    await context.close();
  }

  // 5. Phone (390, touch): a wrapped link keeps its card inside the window; first tap shows, second tap opens.
  {
    const { context, page } = await open({ width: 390, height: 844, touch: true });
    await visit(page, FACTION);
    const operative = term(page, 'character');
    const lines = await operative.locator('> .lore-link').evaluate(link => link.getClientRects().length);
    await operative.locator('> .lore-link').scrollIntoViewIfNeeded();
    await operative.locator('> .lore-link').tap();
    await page.waitForTimeout(200);
    assert.equal(await shown(operative), true, 'first tap shows the card');
    assert.ok(page.url().endsWith(FACTION), 'first tap does not navigate');
    const box = await geometry(operative);
    assert.ok(box.cardLeft >= box.frameLeft - 0.5 && box.cardRight <= box.frameRight + 0.5, `inside the window at 390 (link on ${lines} line(s); ${JSON.stringify(box)})`);
    assert.ok(!box.overlaps, 'never over the link');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no sideways scroll');
    await page.locator('.project-app-content h1').tap();
    await page.waitForTimeout(150);
    assert.equal(await shown(operative), false, 'a tap elsewhere closes it');
    await operative.locator('> .lore-link').tap();
    await operative.locator('> .lore-link').tap();
    await page.waitForURL(`**${P}/characters/fixture-operative`);
    pass(`phone: tap shows (no navigation), card inside the window (wrapped link: ${lines} lines), tap elsewhere closes, second tap opens`);
    await context.close();
  }

  // 6. Plain view and MOTION: REDUCED.
  {
    const { context, page } = await open({ storage: { 'migrainz-view': 'plain' } });
    await visit(page, CHARACTER);
    const equipment = term(page, 'equipment');
    await equipment.locator('> .lore-link').hover();
    assert.equal(await shown(equipment), true);
    const look = await equipment.evaluate(element => ({ link: getComputedStyle(element.querySelector('.lore-link')).color, card: getComputedStyle(element.querySelector('.lore-preview')).backgroundColor,
      font: getComputedStyle(element.querySelector('.lore-preview')).fontFamily, animation: getComputedStyle(element.querySelector('.lore-preview')).animationName }));
    assert.deepEqual([look.link, look.card, look.animation], ['rgb(26, 79, 181)', 'rgb(255, 255, 255)', 'none'], `plain: link colour, white card, no fade (${JSON.stringify(look)})`);
    assert.match(look.font, /Arial/);
    assert.deepEqual(await axe(page), [], 'axe: plain view with a card open');
    await context.close();
    const reduced = await open({ storage: { 'migrainz-motion': 'reduced' } });
    await visit(reduced.page, CHARACTER);
    const faction = term(reduced.page, 'faction');
    await faction.locator('> .lore-link').hover();
    assert.equal(await shown(faction), true);
    assert.equal(await faction.locator('.lore-preview').evaluate(element => getComputedStyle(element).animationName), 'none', 'MOTION: REDUCED: no fade');
    await reduced.context.close();
    pass('plain view: light card, Arial, plain link colour, axe clean; plain view and MOTION: REDUCED: no fade');
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-lore-links: all checks passed');
} finally {
  await browser.close();
}
