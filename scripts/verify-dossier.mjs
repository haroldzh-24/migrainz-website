// Batch 25 (design canvas board 3, the dossier template) against a running seeded fixture (npm run test:regression
// starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-dossier.mjs
// Checks, on the fixture's equipment item (Fixture Scanner) and character (Fixture Operative): one heading, carried by the
// dossier; file name and project code; the fields table (TECHNICAL SPECIFICATIONS / RECORD) with only existing fields
// (the faction only when public); at 1366x768 the media and the whole fields table are in view without scrolling and
// the record sits beside the media; ISSUED TO / EQUIPMENT CARRIED cards link to the right records in order, with the
// assignment's designation and quantity; at 390 the record stacks under the media with no sideways scroll; the plain
// view keeps the light panel with serif values; axe clean inside the window (terminal and plain); no restricted fixture
// text. The schematic loop's own behaviour is scripts/verify-equipment-browser.mjs; the laptop fit at more sizes and a
// vertical item are scripts/verify-equipment-navigation.mjs.
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
const ITEM = `${P}/equipment/fixture-scanner`;
const CHARACTER = `${P}/characters/fixture-operative`;

const open = async ({ width = 1366, height = 768, storage = {} } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });
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
  await page.locator('.project-application .dossier').waitFor();
  await page.locator('.startup-sequence').waitFor({ state: 'detached' });
  await page.waitForTimeout(800); // hydration and the window's arrival
};
const layout = page => page.evaluate(() => {
  const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
  const rows = [...document.querySelectorAll('.dossier-fields tr')];
  return { window: rect('.project-app-content'), media: rect('.dossier-media'), record: rect('.dossier-record'), lastRow: rows.at(-1)?.getBoundingClientRect().toJSON(),
    scrollTop: document.querySelector('.project-app-content').scrollTop, headings: [...document.querySelectorAll('h1')].map(h => h.textContent),
    fields: rows.map(row => [row.querySelector('th').innerText, row.querySelector('td').textContent]), file: document.querySelector('.dossier-file').textContent,
    caption: document.querySelector('.dossier-fields caption').textContent, hOverflow: document.documentElement.scrollWidth - innerWidth };
});
const cards = page => page.locator('.dossier-card').evaluateAll(links => links.map(link => ({ href: link.getAttribute('href'), name: link.querySelector('strong').textContent,
  line: link.querySelector('.dossier-card-line')?.textContent ?? null, image: link.querySelector('img')?.getAttribute('src') ?? null })));
const axe = async page => {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const result = await window.axe.run({ include: ['.project-application'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return result.violations.flatMap(v => v.nodes.map(n => `${v.id} ${n.target.join(' ')}: ${n.failureSummary.split('\n').slice(0, 2).join(' ')}`));
  });
};
const fits = (m, label) => {
  assert.equal(m.scrollTop, 0, `${label}: window not scrolled`);
  assert.ok(m.lastRow.bottom <= m.window.bottom, `${label}: the whole fields table is in view (${m.lastRow.bottom} > ${m.window.bottom})`);
  assert.ok(m.record.left >= m.media.right - 0.5 && Math.abs(m.record.top - m.media.top) < 1, `${label}: the record sits beside the media`);
  assert.ok(m.hOverflow <= 0, `${label}: no sideways scroll`);
};

try {
  // 1. Equipment item at 1366x768, terminal view.
  {
    const { context, page } = await open();
    await visit(page, ITEM);
    const m = await layout(page);
    assert.deepEqual(m.headings, ['Fixture Scanner'], 'one heading, in the dossier');
    assert.equal(m.file, 'Fixture_Scanner.EQP · BL-001');
    assert.equal(m.caption, 'TECHNICAL SPECIFICATIONS');
    assert.deepEqual(m.fields.slice(0, -1), [['CATEGORY', 'Sensor'], ['MANUFACTURER', 'Studio Fixture'], ['CAPACITY', '2 cells'], ['MASS', '1 kg'], ['RANGE', '40 m']], 'labels read in capitals (25b: text-transform on the labels)');
    assert.equal(m.fields.at(-1)[0], 'UPDATED');
    fits(m, 'equipment 1366x768');
    const display = await page.locator('.dossier-figure .equipment-schematic-display').boundingBox();
    assert.ok(display && display.y + display.height <= m.window.bottom, 'the whole schematic is in view');
    assert.ok(Math.abs(display.width / display.height - 2) < 0.05, 'the fixture poster keeps its 2:1 frame');
    assert.equal(await page.locator('.dossier-figure figcaption').textContent(), 'SCHEMATIC · Fixture_Scanner.EQP');
    assert.equal(await page.getByRole('region', { name: 'Issued to' }).locator('h2').textContent(), 'ISSUED TO');
    assert.deepEqual(await cards(page), [{ href: CHARACTER, name: 'Fixture Operative', line: 'Unit 7 · ×1', image: null }]);
    assert.equal(await page.getByRole('link', { name: 'RETURN TO EQUIPMENT' }).getAttribute('href'), `${P}/equipment`);
    // 25b: the schematic's region is named for what it holds (no specs panel inside it any more).
    assert.equal(await page.getByRole('region', { name: 'Fixture Scanner schematic' }).count(), 1, 'the schematic region is "<name> schematic"');
    assert.equal(await page.getByRole('region', { name: 'Fixture Scanner specifications' }).count(), 0, 'no "specifications" region holding only the image');
    // 25b: keyboard focus stays visible on a card under the mouse (white dotted rectangle on the navy hover).
    const card = page.locator('.dossier-card').first();
    await card.focus();
    await card.hover();
    assert.deepEqual(await card.evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el).outlineColor, getComputedStyle(el).outlineStyle]),
      ['rgb(0, 0, 128)', 'rgb(255, 255, 255)', 'dotted'], 'hover + focus: navy card, white dotted focus rectangle');
    await page.mouse.move(0, 0);
    assert.ok(!/SENTINEL/.test(await page.content()), 'no restricted fixture text');
    assert.deepEqual(await axe(page), [], 'axe: equipment dossier');
    await page.screenshot({ path: 'test-results/batch-25/verify-equipment-1366x768.png' });
    pass('equipment dossier at 1366x768: one heading, file and code, specs table, schematic and specs in view, record beside, ISSUED TO card, axe clean');
    // The card opens the character.
    await page.getByRole('link', { name: /Fixture Operative/ }).click();
    await page.waitForURL(`**${CHARACTER}`);
    await context.close();
  }

  // 2. Character at 1366x768, terminal view.
  {
    const { context, page } = await open();
    await visit(page, CHARACTER);
    const m = await layout(page);
    assert.deepEqual(m.headings, ['Fixture Operative'], 'one heading, in the dossier');
    assert.equal(m.file, 'Fixture_Operative.CHR · BL-001');
    assert.equal(m.caption, 'RECORD');
    assert.deepEqual(m.fields.map(([label]) => label), ['FACTION', 'CHAPTERS', 'RECORD STATUS', 'UPDATED']);
    assert.deepEqual(m.fields[0], ['FACTION', 'REGRESSION EMBLEM'], 'the public primary faction');
    assert.deepEqual(m.fields[2], ['RECORD STATUS', 'PUBLIC'], 'record status from the record\'s access level (25b)');
    fits(m, 'character 1366x768');
    assert.equal(await page.getByRole('region', { name: 'Equipment carried' }).locator('h2').textContent(), 'EQUIPMENT CARRIED');
    const carried = await cards(page);
    assert.deepEqual(carried.map(card => [card.href, card.name, card.line]), [
      [`${P}/equipment/fixture-scanner`, 'Fixture Scanner', 'Fixture_Scanner.EQP · Unit 7 · ×1'],
      [`${P}/equipment/fixture-satchel`, 'Fixture Satchel', 'Fixture_Satchel.EQP'],
    ], 'assignments in order, with designation and quantity');
    assert.ok(carried.every(card => card.image?.startsWith('/api/media/file/')), 'card pictures through the media route');
    assert.ok(await page.getByRole('button', { name: 'OPEN IN ART VIEWER' }).isVisible(), 'the action is in the record column');
    // The lore text and its aside follow the dossier (batch 24 unchanged).
    const notes = await page.locator('.dossier-notes').boundingBox(), dossier = await page.locator('.dossier').boundingBox();
    assert.ok(notes.y >= dossier.y + dossier.height, 'record notes under the dossier');
    assert.ok((await page.locator('.dossier-notes .lore-link').count()) >= 5, 'lore links kept');
    assert.ok(!/SENTINEL/.test(await page.content()), 'no restricted fixture text');
    assert.deepEqual(await axe(page), [], 'axe: character dossier');
    await page.screenshot({ path: 'test-results/batch-25/verify-character-1366x768.png' });
    pass('character dossier at 1366x768: one heading, file and code, RECORD fields with the public faction, in view, EQUIPMENT CARRIED cards in order, notes and lore links below, axe clean');
    await context.close();
  }

  // 3. Phones: the record stacks under the media.
  for (const route of [ITEM, CHARACTER]) {
    const { context, page } = await open({ width: 390, height: 844 });
    await visit(page, route);
    const m = await layout(page);
    assert.ok(m.record.top >= m.media.bottom, `${route} 390: the record stacks under the media`);
    assert.ok(m.hOverflow <= 0, `${route} 390: no sideways scroll`);
    const grid = await page.locator('.dossier-cards').evaluate(list => getComputedStyle(list).gridTemplateColumns.split(' ').length);
    assert.equal(grid, 1, `${route} 390: one card per row`);
    // 25b: no navy hover without a real hover pointer (a tap left the card navy).
    assert.equal(await page.evaluate(() => matchMedia('(hover: hover)').matches), false, 'the phone context has no hover pointer');
    await page.locator('.dossier-card').first().hover();
    assert.notEqual(await page.locator('.dossier-card').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 128)', `${route} 390: no navy hover on touch`);
    await context.close();
  }
  pass('390: the record stacks under the media, one card per row, no sideways scroll, no hover colour on touch');

  // 4. Plain view: the light panel stays, values in the serif, axe clean.
  for (const route of [ITEM, CHARACTER]) {
    const { context, page } = await open({ storage: { 'migrainz-view': 'plain' } });
    await visit(page, route);
    const look = await page.evaluate(() => ({ panel: getComputedStyle(document.querySelector('.dossier')).backgroundColor, value: getComputedStyle(document.querySelector('.dossier-fields td')).fontFamily,
      name: getComputedStyle(document.querySelector('.dossier-name')).fontFamily, file: getComputedStyle(document.querySelector('.dossier-file')).fontFamily }));
    assert.equal(look.panel, 'rgb(255, 255, 255)', 'plain view: white panel');
    assert.match(look.value, /Georgia/, 'plain view: serif values');
    assert.match(look.name, /Georgia/, 'plain view: serif name');
    assert.match(look.file, /Arial/, 'plain view: Arial file line');
    fits(await layout(page), `${route} plain 1366x768`);
    assert.deepEqual(await axe(page), [], `axe: ${route} plain view`);
    await context.close();
  }
  pass('plain view: white panel, serif name and values, Arial labels, still fits 1366x768, axe clean');

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-dossier: all checks passed');
} finally {
  await browser.close();
}
