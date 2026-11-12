// Batch 22 (design canvas board 11, plain reading view; SYSTEM ▸ MOTION) against a running seeded fixture
// (npm run test:regression starts one; so does node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-plain-motion.mjs
// Checks: the SYSTEM menu's VIEW and MOTION buttons (aria-pressed, keyboard, saved, the terminal's `view` / `motion`
// commands keep them in step); both settings are on <html> before the first frame of a reload (the server HTML's head
// script reads them); the plain view on /about, a character window and the homepage: light page, no scanlines, bezel or
// vignette, no glow, serif reading text, visible focus, axe colour contrast clean inside windows, no sideways scroll at
// 390; no boot or announcement in the plain view; switching back restores the terminal; MOTION: REDUCED and the plain
// view stop the homepage's moving layers (watchMotion) at once and the Watcher jitter; forced ghost events do not fire
// in the plain view (but do in the terminal view); printing uses the plain view (beforeprint/afterprint) and the print
// stylesheet is light without script; no page errors. Other scripts (decode, page transitions, page flip, typing,
// type-out, mode switch) run their reduced-motion case with MOTION: REDUCED and the plain view too.
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
const LIGHT = 'rgb(251, 250, 247)';

const open = async ({ width = 1366, height = 768, storage = {}, boot = false } = {}) => {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(([values, showBoot]) => {
    try {
      if (!showBoot) sessionStorage.setItem('migrainz-announcement:studio-transmission-001', 'studio-transmission-001');
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    } catch {}
    // What <html> carries at the first animation frame (before the first paint) of every load.
    window.__firstFrame = null;
    requestAnimationFrame(() => {
      const root = document.documentElement;
      window.__firstFrame = { view: root.dataset.view, motion: root.dataset.motion, background: getComputedStyle(root).backgroundColor };
    });
    window.__ghost = [];
    addEventListener('migrainz:ghost', event => window.__ghost.push(event.detail?.name ?? '?'));
  }, [storage, boot]);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const ready = page => page.locator('.startup-sequence').waitFor({ state: 'detached' });
const html = page => page.evaluate(() => ({ ...document.documentElement.dataset }));
const openSystem = async page => { if (!(await page.locator('.system-menu-panel').isVisible())) await page.locator('.system-menu-button').click(); };
const viewButton = page => page.locator('.system-menu-panel .view-toggle');
const motionButton = page => page.locator('.system-menu-panel .motion-toggle');
const looks = page => page.evaluate(() => {
  const css = (element, pseudo) => element ? getComputedStyle(element, pseudo) : null;
  const h1 = document.querySelector('main#top h1, .project-app-content h1');
  const paragraph = [...document.querySelectorAll('main#top p, .project-app-content p')].find(p => p.textContent.trim().length > 30 && !p.closest('.eyebrow, .directory-path, .home-screen'));
  return {
    background: css(document.documentElement).backgroundColor,
    scanlines: css(document.querySelector('.crt'))?.display,
    bezel: css(document.querySelector('.crt-bezel'))?.display,
    vignette: css(document.body, '::before').backgroundImage,
    headingShadow: css(h1)?.textShadow,
    headingColour: css(h1)?.color,
    paragraphFont: css(paragraph)?.fontFamily ?? null,
    paragraphSize: css(paragraph)?.fontSize ?? null,
    overflow: document.documentElement.scrollWidth > innerWidth,
  };
});
const contrast = async (page, include) => {
  await page.evaluate(axeSource);
  return page.evaluate(async selector => {
    const result = await window.axe.run({ include: [selector] }, { runOnly: { type: 'rule', values: ['color-contrast'] } });
    return result.violations.flatMap(v => v.nodes.map(n => `${n.target.join(' ')}: ${n.failureSummary.split('\n').slice(0, 2).join(' ')}`));
  }, include);
};

try {
  // 1. SYSTEM ▸ VIEW and MOTION: two-state buttons with aria-pressed; keyboard; saved; applied before the first frame.
  {
    const { context, page } = await open();
    await page.goto(base + '/about');
    await ready(page);
    assert.deepEqual([(await html(page)).view, (await html(page)).motion], ['terminal', 'auto'], 'defaults: terminal view, motion follows the OS');
    await page.locator('.system-menu-button').focus();
    await page.keyboard.press('ArrowDown');
    await viewButton(page).waitFor();
    assert.equal(await viewButton(page).getAttribute('aria-pressed'), 'false');
    assert.equal(await motionButton(page).getAttribute('aria-pressed'), 'false');
    assert.equal((await viewButton(page).textContent()).trim(), 'VIEW: TERMINAL');
    assert.equal((await motionButton(page).textContent()).trim(), 'MOTION: AUTO');
    // Keyboard: arrow down to VIEW, Enter.
    for (let i = 0; i < 10 && !(await viewButton(page).evaluate(element => element === document.activeElement)); i += 1) await page.keyboard.press('ArrowDown');
    assert.ok(await viewButton(page).evaluate(element => element === document.activeElement), 'VIEW is reachable with the arrow keys');
    await page.keyboard.press('Enter');
    assert.equal((await html(page)).view, 'plain');
    assert.equal(await viewButton(page).getAttribute('aria-pressed'), 'true');
    assert.equal((await viewButton(page).textContent()).trim(), 'VIEW: PLAIN');
    const ring = await viewButton(page).evaluate(element => { const style = getComputedStyle(element); return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) }; });
    assert.ok(ring.style !== 'none' && ring.width >= 1, `focus stays visible in the plain view (${JSON.stringify(ring)})`);
    await motionButton(page).click();
    assert.equal((await html(page)).motion, 'reduced');
    assert.equal(await motionButton(page).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await page.evaluate(() => [localStorage.getItem('migrainz-view'), localStorage.getItem('migrainz-motion')]), ['plain', 'reduced'], 'both saved');
    pass('SYSTEM ▸ VIEW and MOTION: aria-pressed buttons, keyboard, saved');

    await page.reload();
    await ready(page);
    const first = await page.evaluate(() => window.__firstFrame);
    assert.deepEqual(first, { view: 'plain', motion: 'reduced', background: LIGHT }, 'applied before the first frame: no dark flash');
    const source = await (await fetch(base + '/about')).text();
    assert.match(source, /<script[^>]*>[^<]*localStorage\.getItem\("migrainz-view"\)[^<]*localStorage\.getItem\("migrainz-motion"\)/, 'the server HTML\'s head script reads both settings');
    pass('reload: both settings on <html> before the first frame (head script)');

    // The homepage terminal's commands set the same settings, and the SYSTEM buttons catch up.
    await page.goto(base + '/');
    await ready(page);
    const input = page.locator('#home-terminal-input');
    await input.fill('view terminal');
    await input.press('Enter');
    await input.fill('motion auto');
    await input.press('Enter');
    assert.deepEqual([(await html(page)).view, (await html(page)).motion], ['terminal', 'auto']);
    await openSystem(page);
    assert.equal((await viewButton(page).textContent()).trim(), 'VIEW: TERMINAL');
    assert.equal(await motionButton(page).getAttribute('aria-pressed'), 'false');
    assert.deepEqual(await page.evaluate(() => [localStorage.getItem('migrainz-view'), localStorage.getItem('migrainz-motion')]), ['terminal', 'auto']);
    await input.fill('view sepia');
    await input.press('Enter');
    await page.locator('.home-term-log p', { hasText: 'usage: view terminal|plain' }).waitFor();
    pass('terminal commands `view` and `motion` set the same settings; the SYSTEM buttons follow');
    await context.close();
  }

  // 2. The plain view: /about, a character window, the homepage; and back to the terminal.
  for (const width of [1366, 390]) {
    const { context, page } = await open({ width, height: width < 700 ? 844 : 768, storage: { 'migrainz-view': 'plain' } });
    await page.goto(base + '/about');
    await ready(page);
    let look = await looks(page);
    assert.equal(look.background, LIGHT, `${width}: light page`);
    assert.equal(look.scanlines, 'none', `${width}: no scanlines layer`);
    assert.equal(look.bezel, 'none', `${width}: no bezel`);
    assert.ok(!/gradient/.test(look.vignette), `${width}: no vignette (${look.vignette})`);
    assert.equal(look.headingShadow, 'none', `${width}: no glow on the heading`);
    assert.equal(look.headingColour, 'rgb(27, 27, 27)', `${width}: dark heading`);
    assert.match(look.paragraphFont, /Georgia/, `${width}: serif reading text`);
    assert.equal(look.paragraphSize, '19px', `${width}: 19 px reading text`);
    assert.equal(look.overflow, false, `${width}: no sideways scroll on /about`);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.typeout ?? null), null, `${width}: nothing hidden for typing`);
    assert.deepEqual(await contrast(page, 'main#top'), [], `${width}: /about contrast`);

    await page.goto(base + CHARACTER);
    await page.locator('.project-app-content h1').waitFor();
    look = await looks(page);
    assert.equal(look.scanlines, 'none', `${width}: character page: no scanlines`);
    assert.equal(look.headingShadow, 'none', `${width}: character page: no glow`);
    assert.equal(look.overflow, false, `${width}: character page: no sideways scroll`);
    assert.equal(await page.locator('.project-app-content').evaluate(element => getComputedStyle(element).backgroundColor), LIGHT, `${width}: window content is the light page`);
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), 'rgb(46, 70, 70)', `${width}: no dark teal desktop`);
    assert.deepEqual(await contrast(page, '.project-application'), [], `${width}: contrast inside the window`);

    await page.goto(base + '/');
    await page.locator('.home-screen').waitFor();
    look = await looks(page);
    assert.equal(look.background, LIGHT, `${width}: homepage light`);
    assert.equal(look.overflow, false, `${width}: homepage: no sideways scroll`);
    assert.deepEqual(await contrast(page, '.home-screen'), [], `${width}: homepage contrast`);
    pass(`${width}: plain view on /about, a character window and the homepage (light, no CRT layers or glow, serif, contrast)`);

    // Back to the terminal: dark again, layers back.
    await openSystem(page);
    await viewButton(page).click();
    look = await looks(page);
    assert.equal(look.background, 'rgb(10, 14, 11)', `${width}: terminal again`);
    assert.equal(look.scanlines, 'block', `${width}: scanlines back`);
    await context.close();
  }
  pass('VIEW: TERMINAL restores the terminal look');

  // 3. No boot and no announcement in the plain view; the terminal view still has them.
  {
    const { context, page } = await open({ boot: true, storage: { 'migrainz-view': 'plain' } });
    await page.goto(base + '/');
    await page.waitForFunction(() => document.documentElement.dataset.power === 'on');
    await page.waitForTimeout(800);
    assert.equal(await page.locator('.startup-sequence').count(), 0, 'plain view: no boot or announcement');
    assert.ok(await page.locator('.home-screen').isVisible(), 'plain view: the page shows at once');
    const seen = await page.evaluate(() => Object.keys(sessionStorage).filter(key => /boot|announcement/.test(key)));
    assert.deepEqual(seen, [], 'plain view: the boot and announcement are not marked as seen');
    await context.close();
    const terminal = await open({ boot: true });
    await terminal.page.goto(base + '/');
    await terminal.page.locator('.startup-sequence').waitFor();
    pass('plain view: no boot or announcement, nothing marked as seen (the terminal view keeps them)');
    await terminal.context.close();
  }

  // 4. MOTION: REDUCED and the plain view stop the homepage's moving layers at once (watchMotion) and the Watcher jitter.
  {
    const { context, page } = await open();
    await page.goto(base + '/');
    await ready(page);
    const globe = () => page.locator('.home-globe-map').textContent();
    const moves = async () => { const before = await globe(); await page.waitForTimeout(1200); return before !== await globe(); };
    await page.locator('.home-globe-map').scrollIntoViewIfNeeded();
    assert.ok(await moves(), 'MOTION: AUTO: the globe turns');
    await openSystem(page);
    await motionButton(page).click();
    await page.waitForTimeout(200);
    assert.equal(await moves(), false, 'MOTION: REDUCED: the globe stops at once');
    await page.evaluate(() => { window.__jitter = 0; new MutationObserver(() => { if (document.querySelector('[data-jitter]')) window.__jitter += 1; }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-jitter'] }); });
    await motionButton(page).click();
    assert.ok(await moves(), 'MOTION: AUTO again: the globe turns again');
    await viewButton(page).click();
    await page.waitForTimeout(200);
    await page.evaluate(() => { window.__jitter = 0; });
    assert.equal(await moves(), false, 'plain view: the globe stops');
    await page.waitForTimeout(9500); // the jitter fires every 3.5 to 9 s with motion allowed
    assert.equal(await page.evaluate(() => window.__jitter), 0, 'plain view: no Watcher jitter');
    pass('MOTION: REDUCED and the plain view stop watchMotion layers and the Watcher jitter at once');
    await context.close();
  }

  // 5. Ghost: forced events fire in the terminal view, not in the plain view.
  const FORCE = 'force:second-user,second-cursor,welcome,tails';
  {
    const { context, page } = await open({ storage: { 'migrainz-ghost-test': 'force:second-user' } });
    await page.goto(base + '/');
    await ready(page);
    await page.locator('.home-terminal-panel .ghost-terminal').waitFor({ state: 'attached', timeout: 60000 });
    pass('terminal view: a forced ghost event fires (control)');
    await context.close();
  }
  {
    const { context, page } = await open({ storage: { 'migrainz-ghost-test': FORCE, 'migrainz-view': 'plain' } });
    await page.goto(base + '/');
    await page.locator('.home-screen').waitFor();
    const input = page.locator('#home-terminal-input');
    await input.fill('help');
    await input.press('Enter');
    await page.waitForTimeout(6000);
    assert.equal(await page.locator('.ghost-terminal').count(), 0, 'plain view: no second user or cursor');
    assert.equal(await page.locator('.home-term-log p[data-kind="ghost"]').count(), 0, 'plain view: no ghost lines (welcome, tails)');
    assert.deepEqual(await page.evaluate(() => window.__ghost), [], 'plain view: no ghost events');
    pass('plain view: forced ghost events do not fire');
    await context.close();
  }

  // 6. Printing uses the plain view; the print stylesheet is light without script.
  {
    const { context, page } = await open();
    await page.goto(base + '/about');
    await ready(page);
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), 'rgb(255, 255, 255)', 'print stylesheet: white page');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.crt')).display), 'none', 'print stylesheet: no scanlines');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('main#top h1')).color), 'rgb(27, 27, 27)', 'print stylesheet: dark heading');
    await page.evaluate(() => dispatchEvent(new Event('beforeprint')));
    assert.equal((await html(page)).view, 'plain', 'beforeprint: plain view');
    await page.evaluate(() => dispatchEvent(new Event('afterprint')));
    assert.equal((await html(page)).view, 'terminal', 'afterprint: back to the terminal view');
    assert.equal(await page.evaluate(() => localStorage.getItem('migrainz-view')), null, 'printing saves nothing');
    await page.emulateMedia({ media: 'screen' });
    pass('print = plain view (beforeprint/afterprint; print stylesheet without script)');
    await context.close();
  }

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-plain-motion: all checks passed');
} finally {
  await browser.close();
}
