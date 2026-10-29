// Homepage (design canvas board 23, batch 6) checks against a running seeded fixture (npm run test:regression starts
// one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-home.mjs
// Checks: one-line title; directory and Watcher in the first screen at 1366x768; the text-mode static (dots only), the
// text lens on mouse hover, the directory previews on hover and focus; the terminal (help, ls, unknown command, history,
// Tab completion, cd navigation, the SYSTEM monitor); the globe with its NODE 01 pin; the newest-schematic tile; reduced
// motion and CRT off hold or hide the moving layers; phone width has no sideways scroll; the boot counter only rises and
// hands over to the page powering on. Writes screenshots to test-results/home-screens/.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = process.env.BASE_URL || process.argv[2];
if (!base || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error('Set BASE_URL to the local fixture server, e.g. http://127.0.0.1:3100'); process.exit(1); }
const require = createRequire(import.meta.url);
const playwright = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : require(require.resolve('playwright', { paths: process.env.PATH.split(path.delimiter).map(entry => path.dirname(entry)) }));
const out = path.resolve('test-results/home-screens');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const SENTINELS = ['SENTINEL-PHASE-TITLE-7Q', 'SENTINEL-CHAPTER-TITLE-7Q', 'sentinel-chapter-7q'];
const announcementKey = 'migrainz-announcement:studio-transmission-001';
const errors = [];
const pass = message => console.log('PASS ' + message);
const open = async ({ width = 1366, height = 768, reducedMotion = 'no-preference', boot = false, crt } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addInitScript(([key, skip, mode]) => {
    try {
      if (skip) sessionStorage.setItem(key, 'studio-transmission-001');
      if (mode) localStorage.setItem('crt-effects', mode);
    } catch {}
  }, [announcementKey, !boot, crt]);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const home = async page => { await page.goto(base + '/'); await page.locator('.startup-sequence').waitFor({ state: 'hidden' }); await page.locator('.home-screen').waitFor(); };
const text = (page, selector) => page.locator(selector).evaluate(el => el.textContent ?? '');

try {
  // 1. Desktop first screen: one-line title, directory and Watcher visible without scrolling, no sentinel text.
  {
    const { context, page } = await open();
    const html = await (await context.request.get(base + '/')).text();
    for (const sentinel of SENTINELS) assert.ok(!html.includes(sentinel), `${sentinel} not in the homepage HTML`);
    await home(page);
    await page.waitForTimeout(1600); // the title finishes decoding
    const title = await page.locator('.home-title h1').evaluate(h1 => {
      const [main, sub] = [...h1.querySelectorAll('[aria-hidden="true"]')].map(el => el.getBoundingClientRect());
      return { sameLine: Math.abs(main.bottom - sub.bottom) < 14, text: h1.textContent };
    });
    assert.ok(title.sameLine, 'title fits on one line at 1366');
    assert.match(title.text, /MIGRAINZ ARCHIVE & PROJECTS/, 'screen-reader title text');
    const fold = await page.evaluate(() => ({
      watcher: document.querySelector('.home-signal .watcher').getBoundingClientRect().bottom,
      menu: [...document.querySelectorAll('.terminal-nav > *')].at(-1).getBoundingClientRect().bottom,
      height: innerHeight,
    }));
    assert.ok(fold.watcher <= fold.height && fold.menu <= fold.height, `directory and Watcher above the fold (${JSON.stringify(fold)})`);
    assert.equal(await page.locator('.desktop-launchers').count(), 0, 'old launcher row gone');
    await page.screenshot({ path: path.join(out, 'home-1366.png') });
    // Panels are headings for screen-reader navigation, and keyboard focus runs left to right: the first control after
    // the header is the directory's first file (the Watcher column comes first in the source but has no controls).
    const headings = await page.locator('.home-screen h2, .home-recent h2').allTextContents();
    for (const title of ['DIRECTORY', 'TERMINAL', 'SESSION', 'SIGNAL', 'CLEARANCE', 'RECENT FILES']) assert.ok(headings.some(text => text.startsWith(title)), `${title} is a heading (${headings})`);
    assert.equal(await page.locator('main :is(h1, h2, h3)').first().evaluate(el => el.tagName), 'H1', 'the page title is the first heading');
    await page.locator('.system-menu-button').focus(); // the header's last control
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('.terminal-nav')), 'after the header, focus goes to the directory');
    pass('one-line title; directory and Watcher fit 1366x768; no classified text; headings; focus order');

    // Static: dots only, and it changes over time with CRT on.
    const first = await text(page, '.home-static');
    assert.match(first, /^[ .\n]+$/, 'static layer holds only dots and spaces');
    assert.ok(first.includes('.'), 'static layer has dots');
    await page.waitForTimeout(700);
    assert.notEqual(await text(page, '.home-static'), first, 'static re-scatters with CRT on');
    pass('text-mode static: dots only, moving');

    // Lens: a mouse over the Watcher shows the text layer in a circle and masks the art there.
    const watcher = page.locator('.home-signal .watcher');
    const box = await watcher.boundingBox();
    // The first move samples the image (lazily); keep moving until the lens shows.
        for (let step = 0; step < 40 && !(await watcher.evaluate(el => el.hasAttribute('data-lens'))); step++) {
      await page.mouse.move(box.x + box.width / 2 + (step % 2), box.y + box.height / 2);
      await page.waitForTimeout(150);
    }
    await page.waitForFunction(() => document.querySelector('.home-signal .watcher').hasAttribute('data-lens'));
    assert.match(await text(page, '.home-lens'), /[.:=+*cxbXA#-]/, 'lens text drawn from the Watcher image');
    assert.notEqual(await page.locator('.home-signal .watcher-jitter').evaluate(el => getComputedStyle(el).maskImage), 'none', 'art masked under the lens');
    await page.mouse.move(5, 5);
    await page.waitForFunction(() => !document.querySelector('.home-signal .watcher').hasAttribute('data-lens'));
    pass('text lens follows the mouse and goes away when it leaves');

    // Previews: hover and keyboard focus.
    await page.locator('.terminal-nav a[data-channel="projects"]').hover();
    await page.locator('.home-preview').waitFor();
    assert.match(await text(page, '.home-preview'), /PROJECTS/);
    await page.mouse.move(5, 5);
    await page.locator('.home-preview').waitFor({ state: 'detached' });
    await page.locator('.terminal-nav a[data-channel="archive"]').focus();
    await page.locator('.home-preview').waitFor();
    assert.match(await text(page, '.home-preview'), /ARCHIVE/);
    pass('directory previews on hover and focus');

    // Globe: real land drawn, NODE 01 pin inside its panel.
    const globe = await text(page, '.home-globe-map');
    assert.match(globe, /[:=+*#-]/, 'globe draws land');
    const pin = await page.evaluate(() => {
      const panel = document.querySelector('.home-globe').getBoundingClientRect();
      const mark = document.querySelector('.home-globe-pin i')?.getBoundingClientRect();
      return mark ? mark.left >= panel.left && mark.right <= panel.right && mark.top >= panel.top && mark.bottom <= panel.bottom : false;
    });
    assert.ok(pin, 'NODE 01 pin shows inside the globe panel');
    pass('signal globe with NODE 01');

    // Newest schematic tile and the SYSTEM monitor launcher.
    const tile = page.locator('.home-tile', { hasText: 'NEWEST SCHEMATIC' });
    assert.match(await tile.getAttribute('href'), /\/projects\/[^/]+\/equipment\/[^/]+$/, 'schematic tile links to an equipment page');
    await page.locator('button[aria-controls="pixel-monitor"]').click();
    await page.locator('#pixel-monitor').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Hide desktop and return to terminal' }).click();
    pass('newest schematic tile; SYSTEM monitor still opens from the homepage');

    // Terminal.
    const input = page.locator('#home-terminal-input');
    const log = '.home-term-log';
    await input.fill('help'); await input.press('Enter');
    assert.match(await text(page, log), /ls\s+list files/);
    await input.fill('ls'); await input.press('Enter');
    assert.match(await text(page, log), /01\s+projects\.db/);
    await input.fill('frobnicate'); await input.press('Enter');
    assert.match(await text(page, log), /frobnicate: command not found/);
    await input.press('ArrowUp');
    assert.equal(await input.inputValue(), 'frobnicate', 'Up recalls the last command');
    await input.fill('he'); await input.press('Tab');
    assert.equal(await input.inputValue(), 'help ', 'Tab completes a command');
    await input.fill(''); await input.press('Tab');
    assert.ok(!(await input.evaluate(el => el === document.activeElement)), 'Tab with nothing to complete leaves the field');
    // Display commands write the same settings as the SYSTEM menu, and its buttons follow.
    await input.fill('crt reduced'); await input.press('Enter');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.crt), 'reduced');
    assert.match(await page.locator('.crt-toggle').first().textContent(), /CRT: REDUCED/, 'SYSTEM menu shows the mode the terminal set');
    await input.fill('phosphor amber'); await input.press('Enter');
    assert.equal(await page.evaluate(() => [document.documentElement.dataset.phosphor, localStorage.getItem('crt-phosphor')].join()), 'amber,amber');
    assert.match(await page.locator('.phosphor-toggle').first().textContent(), /PHOSPHOR: AMBER/);
    await input.fill('phosphor green'); await input.press('Enter');
    await input.fill('crt on'); await input.press('Enter');
    await input.fill('sound on'); await input.press('Enter');
    assert.equal(await page.locator('[data-sound-toggle]').first().getAttribute('aria-pressed'), 'true', 'sound on, as the SYSTEM menu shows');
    await input.fill('sound off'); await input.press('Enter');
    // cd 6 opens the store window (a promo, not a page).
    await input.fill('cd 6'); await input.press('Enter');
    await page.locator('#shop-promo').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await input.fill('open blushland'); await input.press('Enter');
    await page.waitForURL(/\/projects\/blushland$/);
    await page.goBack();
    await page.locator('#home-terminal-input').waitFor();
    await page.locator('.mode-switch').waitFor({ state: 'hidden' }); // keys are held while the reverse covers the page
    await page.locator('#home-terminal-input').fill('cd 4'); await page.locator('#home-terminal-input').press('Enter');
    await page.waitForURL(/\/archive$/);
    pass('terminal: help, ls, unknown command, history, Tab, crt/phosphor/sound with the SYSTEM menu following, cd 6 store, open project, cd navigation');
    await context.close();
  }

  // 2. Reduced motion: no lens, still static and globe.
  {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    await home(page);
    const before = [await text(page, '.home-static'), await text(page, '.home-globe-map')];
    const box = await page.locator('.home-signal .watcher').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(800);
    assert.ok(!(await page.locator('.home-signal .watcher').evaluate(el => el.hasAttribute('data-lens'))), 'no lens under reduced motion');
    assert.deepEqual([await text(page, '.home-static'), await text(page, '.home-globe-map')], before, 'static and globe hold still');
    pass('reduced motion: lens off, static and globe still');
    await context.close();
  }

  // 3. CRT off hides the static and the lens; CRT reduced holds them still.
  {
    const { context, page } = await open({ crt: 'off' });
    await home(page);
    for (const layer of ['.home-static', '.home-lens', '.home-lens-ring']) assert.equal(await page.locator(layer).evaluate(el => getComputedStyle(el).display), 'none', `CRT off hides ${layer}`);
    await context.close();
    const reduced = await open({ crt: 'reduced' });
    await home(reduced.page);
    const before = [await text(reduced.page, '.home-static'), await text(reduced.page, '.home-globe-map')];
    await reduced.page.waitForTimeout(700);
    assert.deepEqual([await text(reduced.page, '.home-static'), await text(reduced.page, '.home-globe-map')], before, 'CRT reduced holds the static and the globe');
    await reduced.context.close();
    pass('CRT off hides the text layers; CRT reduced holds them');
  }

  // 4. Phone width.
  {
    const { context, page } = await open({ width: 390, height: 844 });
    await home(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no sideways scroll at 390');
    assert.ok(Number.parseFloat(await page.locator('#home-terminal-input').evaluate(el => getComputedStyle(el).fontSize)) >= 16, 'terminal input at least 16px (no zoom on focus)');
    const order = await page.evaluate(() => ({
      title: document.querySelector('.home-title h1').getBoundingClientRect().top,
      directory: document.querySelector('.home-directory').getBoundingClientRect().top,
    }));
    assert.ok(order.title < order.directory, `phone starts with the Watcher and title (${JSON.stringify(order)})`);
    await page.screenshot({ path: path.join(out, 'home-390.png'), fullPage: true });
    pass('phone width: Watcher first, no sideways scroll; terminal input 16px');
    await context.close();
  }

  // 5. Boot: the counter only rises, then the page powers on.
  {
    const { context, page } = await open({ boot: true });
    await context.addInitScript(() => {
      window.__counts = []; window.__powered = false;
      new MutationObserver(() => {
        const count = document.querySelector('.boot-count');
        if (count) window.__counts.push(Number(count.textContent));
        if (document.querySelector('main.shell.power-on')) window.__powered = true;
      }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    });
    await page.goto(base + '/');
    await page.waitForFunction(() => document.documentElement.dataset.power === 'on', null, { timeout: 30000 });
    const { counts, powered } = await page.evaluate(() => ({ counts: window.__counts, powered: window.__powered }));
    assert.ok(counts.length > 3, 'counter was seen');
    for (let index = 1; index < counts.length; index++) assert.ok(counts[index] >= counts[index - 1], `counter never drops (${counts.slice(Math.max(0, index - 3), index + 2)})`);
    assert.equal(counts.at(-1), 100, 'counter ends at 100');
    assert.ok(powered, 'main powered on after the boot');
    pass('boot counter rises to 100; page powers on');
    await context.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-home: all checks passed');
} finally {
  await browser.close();
}
