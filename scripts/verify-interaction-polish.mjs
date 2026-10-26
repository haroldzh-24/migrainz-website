// Phase 1 interaction checks against a running seeded fixture (npm run test:regression starts one; so does
// node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-interaction-polish.mjs
//   PLAYWRIGHT_MODULE=<path to playwright/index.mjs> overrides how Playwright is found.
// Checks: shared highlight (reticle, Win95 bars/bevels/dotted focus, touch, forced colours, reduced motion, no layout
// shift or overflow), SYSTEM menu, amber persistence before first paint, and that classified fixture titles never reach
// the boot checklist, the HTML or the RSC payload. Writes screenshots to test-results/interaction-screens/.
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
const out = path.resolve('test-results/interaction-screens');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const SENTINELS = ['SENTINEL-PHASE-TITLE-7Q', 'SENTINEL-CHAPTER-TITLE-7Q', 'sentinel-chapter-7q'];
const announcementKey = 'migrainz-announcement:studio-transmission-001';
const errors = [];
// Contexts that skip the boot (already dismissed this session) unless a test needs it; phosphor and crt preset the
// saved display modes.
const open = async (options = {}, { boot = false, phosphor, crt } = {}) => {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, ...options });
  await context.addInitScript(([key, skip, colour, mode]) => {
    try {
      if (skip) sessionStorage.setItem(key, 'studio-transmission-001');
      if (colour) localStorage.setItem('crt-phosphor', colour);
      if (mode) localStorage.setItem('crt-effects', mode);
    } catch {}
  }, [announcementKey, !boot, phosphor, crt]);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const afterStyle = (locator, property) => locator.evaluate((el, prop) => getComputedStyle(el, '::after')[prop], property);
const pass = message => console.log('PASS ' + message);
// The checklist closes ~0.5s after its last line, so read every line in one step the moment the clearance line exists.
const bootSnapshot = page => page.waitForFunction(() => {
  const lines = [...document.querySelectorAll('.boot-line')].map(li => ({ status: li.dataset.status, text: li.textContent }));
  return lines.some(line => line.text.includes('clearance')) ? lines : null;
}).then(handle => handle.jsonValue());
// The server renders the opaque boot gate; a dismissed session only drops it after hydration. Wait for that before
// interacting, or a press can land on the gate (seen on the slower regression server).
const visit = async (page, url) => { await page.goto(url); await page.locator('.startup-sequence').waitFor({ state: 'hidden' }); };

try {
  // 1. Classified records: safe labels in the checklist, titles nowhere in HTML or RSC.
  {
    const { context, page } = await open({}, { boot: true });
    const html = await (await context.request.get(base + '/')).text();
    const rsc = await (await context.request.get(base + '/', { headers: { RSC: '1' } })).text();
    const bootResponse = await context.request.get(base + '/boot-status');
    assert.match(bootResponse.headers()['cache-control'] ?? '', /no-store/, 'boot data is never cached');
    const bootJSON = await bootResponse.text();
    for (const sentinel of SENTINELS) {
      assert.ok(!html.includes(sentinel), `${sentinel} must not be in the HTML`);
      assert.ok(!rsc.includes(sentinel), `${sentinel} must not be in the RSC payload`);
      assert.ok(!bootJSON.includes(sentinel), `${sentinel} must not be in /boot-status`);
    }
    await page.goto(base + '/');
    const lines = await bootSnapshot(page);
    // Best effort: the screenshot may already show the announcement on a slow machine.
    await page.screenshot({ path: path.join(out, 'boot-checklist-1366.png') });
    const text = lines.map(line => line.text).join(' | ');
    for (const sentinel of SENTINELS) assert.ok(!text.toLowerCase().includes(sentinel.toLowerCase()), `${sentinel} must not be in the checklist`);
    assert.equal(lines.filter(line => line.text.includes('sealed_phase') && line.text.includes('CLASSIFIED')).length, 1, 'redacted phase shows its safe label');
    assert.equal(lines.filter(line => line.text.includes('sealed_chapter') && line.text.includes('CLASSIFIED')).length, 1, 'redacted chapter shows its safe label');
    await context.close();
    pass('classified titles absent from checklist, HTML and RSC; safe labels shown');
  }

  // 2. Reticle on hover and keyboard focus, no layout shift; Win95 styles inside windows.
  {
    const { context, page } = await open();
    // Once the boot has been seen, ordinary page loads never ask for boot data (no boot query per page).
    const bootRequests = [];
    page.on('request', request => { if (new URL(request.url()).pathname === '/boot-status') bootRequests.push(request.url()); });
    await visit(page, base + '/');
    await page.locator('.terminal-nav a').first().waitFor();
    const nav = page.locator('.terminal-nav a').first();
    const before = await nav.boundingBox();
    await nav.hover();
    await page.waitForTimeout(250);
    assert.equal(await afterStyle(nav, 'opacity'), '1', 'reticle shows on hover');
    assert.deepEqual(await nav.boundingBox(), before, 'hover does not move the item');
    await page.mouse.move(2, 760);
    await page.waitForTimeout(50);
    assert.equal(await afterStyle(nav, 'opacity'), '0', 'reticle leaves instantly');
    await page.locator('#top').focus();
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.activeElement?.closest('.terminal-nav'))); i++) await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await page.waitForTimeout(250);
    assert.equal(await afterStyle(focused, 'opacity'), '1', 'reticle shows on keyboard focus');
    assert.equal(await focused.evaluate(el => getComputedStyle(el).outlineColor), 'rgba(0, 0, 0, 0)', 'one indicator: the outline is transparent outside High Contrast');
    await page.screenshot({ path: path.join(out, 'reticle-focus-1366.png'), clip: { x: 60, y: 520, width: 620, height: 240 } });
    await visit(page, base + '/projects/blushland/equipment');
    const tab = page.locator('.project-app-nav a:not([aria-current])').first();
    await tab.hover();
    assert.equal(await tab.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 128)', 'Win95 menu item gets the navy bar');
    assert.equal(await afterStyle(tab, 'content'), 'none', 'no reticle inside Win95 chrome');
    const file = page.locator('.desktop-file-open').first();
    await file.focus();
    assert.equal(await file.evaluate(el => getComputedStyle(el).outlineStyle), 'dotted', 'Win95 dotted focus rectangle');
    assert.equal(await file.locator('.desktop-file-copy strong').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 128)', 'desktop icon label turns navy');
    // Project-window title bar controls are Win95 chrome: no reticle, dotted focus, pressed bevel.
    const control = page.locator('.project-application .retro-window-controls button').last();
    await control.hover();
    assert.equal(await afterStyle(control, 'content'), 'none', 'no reticle on window controls');
    await control.focus();
    assert.equal(await control.evaluate(el => getComputedStyle(el).outlineStyle), 'dotted', 'window control dotted focus');
    await page.mouse.down();
    assert.equal(await control.evaluate(el => getComputedStyle(el).borderTopColor), 'rgb(64, 64, 64)', 'window control presses in');
    await page.mouse.move(2, 2);
    await page.mouse.up();
    assert.deepEqual(bootRequests, [], 'no /boot-status request outside the boot checklist');
    await context.close();
    pass('reticle hover/focus without layout shift; Win95 bar, dotted focus, navy icon label, window controls');
  }

  // 3. Touch: no sticky reticle after a tap. Forced colours: a real outline. Reduced motion: no animation.
  {
    const { context, page } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await visit(page, base + '/');
    const trigger = page.getByRole('button', { name: 'Requisitions / shop 03 / requisitions.exe', exact: true });
    // Press state: in this no-hover phone context only :active can show the reticle (headless Chrome does not turn raw
    // DevTools touch events into a press, so a held mouse button stands in for the finger; real touch is unverified).
    const box = await page.locator('.terminal-nav a').first().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(await afterStyle(page.locator('.terminal-nav a').first(), 'opacity'), '0', 'no hover reticle without a hovering pointer');
    await page.mouse.down();
    await page.waitForTimeout(200);
    assert.equal(await afterStyle(page.locator('.terminal-nav a').first(), 'opacity'), '1', 'reticle shows while pressed');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 400);
    await page.mouse.up();
    await trigger.tap();
    await page.waitForTimeout(300);
    assert.equal(await afterStyle(trigger, 'opacity'), '0', 'no sticky reticle after a tap');
    for (const route of ['/', '/projects/blushland/equipment/fixture-scanner']) {
      await visit(page, base + route);
      await page.waitForTimeout(500);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390), `no sideways overflow at 390px on ${route}`);
    }
    await context.close();
    const forced = await open({ forcedColors: 'active' });
    await visit(forced.page, base + '/');
    await forced.page.locator('.terminal-nav a').first().waitFor();
    await forced.page.locator('#top').focus();
    for (let i = 0; i < 40 && !(await forced.page.evaluate(() => document.activeElement?.closest('.terminal-nav'))); i++) await forced.page.keyboard.press('Tab');
    const forcedFocus = await forced.page.evaluate(() => { const style = getComputedStyle(document.activeElement); return [style.outlineStyle, style.outlineWidth]; });
    assert.deepEqual(forcedFocus, ['solid', '2px'], 'forced colours show an outline');
    await forced.context.close();
    const reduced = await open({ reducedMotion: 'reduce' });
    const nav = reduced.page.locator('.terminal-nav a').first();
    await visit(reduced.page, base + '/');
    await nav.hover();
    assert.equal(await afterStyle(nav, 'animationName'), 'none', 'reduced motion: the reticle just appears');
    assert.equal(await afterStyle(nav, 'transform'), 'none');
    assert.equal(await afterStyle(nav, 'opacity'), '1');
    await reduced.context.close();
    pass('touch (no sticky hover, no overflow), forced colours and reduced motion');
  }

  // 4. SYSTEM menu: keyboard path; Esc during the announcement closes only the menu.
  {
    const { context, page } = await open({}, { boot: true });
    await page.goto(base + '/');
    await page.getByRole('button', { name: 'ENTER', exact: true }).waitFor();
    const menu = page.getByRole('button', { name: 'SYSTEM', exact: true });
    await menu.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => document.activeElement?.classList.contains('crt-toggle'));
    assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('sound-toggle')));
    await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('system-menu-button')), 'focus returns to SYSTEM');
    assert.equal(await page.locator('.startup-sequence').getAttribute('data-phase'), 'announcement', 'the ad stays open');
    await context.close();
    pass('SYSTEM menu keyboard path and Escape');
  }

  // 5. Amber: chosen in the menu, persists across reload and applies before first paint.
  {
    const { context, page } = await open();
    await visit(page, base + '/');
    await page.getByRole('button', { name: 'SYSTEM', exact: true }).click();
    await page.locator('.phosphor-toggle').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('crt-phosphor')), 'amber');
    await page.reload({ waitUntil: 'commit' });
    const first = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve(getComputedStyle(document.body).color))));
    assert.equal(first, 'rgb(235, 196, 140)', 'amber on the first frame after reload');
    await page.locator('.watcher-base').waitFor();
    assert.match(await page.locator('.watcher-base').evaluate(el => getComputedStyle(el).backgroundImage), /watcher-base\.amber\.webp/);
    await context.close();
    pass('amber persists and applies before first paint');
  }

  // 6. CRT modes (fix/crt-glow): glow by mode, phosphor and context; overlay vignette; scanlines; bezel; Watcher motion.
  {
    const read = page => page.evaluate(() => {
      const style = (selector, prop, pseudo) => { const el = document.querySelector(selector); return el ? getComputedStyle(el, pseudo)[prop] : null; };
      return {
        body: style('.hero .lede', 'textShadow'), head: style('.hero h1', 'textShadow'), ui: style('.menu-name', 'textShadow'),
        lede: style('.hero .lede', 'color'), vignette: /at 50% 45%/.test(style('body', 'backgroundImage', '::before')),
        scanlines: Number(getComputedStyle(document.documentElement).getPropertyValue('--crt-scanline-alpha')),
        bezel: style('.crt-bezel', 'display'), bezelEvents: style('.crt-bezel', 'pointerEvents'), flicker: style('.watcher-flicker', 'animationName'), flickerTiming: style('.watcher-flicker', 'animationTimingFunction'), flickerDuration: style('.watcher-flicker', 'animationDuration'),
      };
    });
    const cases = [
      ['on', {}, { crt: 'on' }], ['reduced', {}, { crt: 'reduced' }], ['off', {}, { crt: 'off' }],
      ['amber-on', {}, { crt: 'on', phosphor: 'amber' }], ['amber-off', {}, { crt: 'off', phosphor: 'amber' }],
      ['reduced-motion', { reducedMotion: 'reduce' }, { crt: 'on' }], ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { crt: 'on' }],
    ];
    const seen = {};
    for (const [label, options, modes] of cases) {
      const { context, page } = await open(options, modes);
      await visit(page, base + '/');
      seen[label] = await read(page);
      await context.close();
    }
    const { on, reduced, off } = seen;
    assert.match(on.body, /2\.8px/, 'body glow in "on"');
    assert.match(on.head, /18px/, 'heading glow in "on"');
    assert.match(on.ui, /6px/, 'menu-name glow in "on"');
    assert.equal(on.lede, 'rgb(168, 216, 176)', 'hero description uses --crt-text');
    assert.equal(on.vignette, true, 'the screen vignette (a radial gradient on the fixed background layer) is on in "on"');
    assert.equal(on.scanlines, 0.07);
    assert.deepEqual([on.bezel, on.bezelEvents], ['block', 'none'], 'bezel shown in "on" on a wide screen and never takes clicks');
    assert.equal(on.flicker, 'watcher-flicker');
    assert.ok(/^steps\(1(, (end|jump-end))?\)$/.test(on.flickerTiming), `the flicker is stepped, not eased (got ${on.flickerTiming})`);
    assert.equal(on.flickerDuration, '1.3s');
    assert.equal(reduced.body, 'none', 'no body glow in "reduced"');
    assert.match(reduced.head, /18px/, '"reduced" keeps heading glow');
    assert.deepEqual([reduced.vignette, reduced.scanlines, reduced.bezel, reduced.flicker], [false, 0.03, 'none', 'none']);
    assert.deepEqual([off.body, off.head, off.ui, off.vignette, off.scanlines, off.bezel, off.flicker], ['none', 'none', 'none', false, 0, 'none', 'none']);
    assert.match(seen['amber-on'].head, /rgba\(255, 224, 176, 0\.8\)/, 'amber heading glow uses amber colours');
    assert.match(seen['amber-on'].body, /rgba\(235, 196, 140, 0\.24\)/, 'amber body glow uses amber colours');
    assert.deepEqual([seen['amber-off'].head, seen['amber-off'].body], ['none', 'none'], 'amber never turns glow back on in "off"');
    assert.equal(seen['reduced-motion'].flicker, 'none', 'reduced motion stops the flicker');
    assert.equal(seen.phone.bezel, 'none', 'no bezel at phone width');

    // Contexts: light project windows and the Win95 promo stay unglowed; the equipment panel is a terminal island.
    const { context, page } = await open({}, { crt: 'on' });
    await visit(page, base + '/');
    const keyframes = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        for (const rule of rules) if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === 'watcher-flicker')
          return [...rule.cssRules].map(frame => [frame.keyText, Number(frame.style.opacity)]);
      }
      return null;
    });
    assert.ok(keyframes && keyframes.every(([, opacity]) => opacity >= 0.94 && opacity <= 1), 'flicker never dims more than 6%');
    assert.deepEqual(keyframes.filter(([, opacity]) => opacity < 1).length, 3, 'three dips per loop');
    for (const [key, opacity] of keyframes) if (opacity < 1) {
      const at = parseFloat(key), back = keyframes.find(([k, o]) => parseFloat(k) > at && o === 1);
      assert.ok(back && parseFloat(back[0]) - at <= 3, 'each dip returns to full just after');
    }
    // Hit-test the centre of the first menu link and the brand: the bezel must never be the element that gets the click.
    const hits = await page.evaluate(() => ['.terminal-nav a', '.brand'].map(selector => {
      const box = document.querySelector(selector).getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return [selector, !!hit?.closest(selector), !!hit?.closest('.crt-bezel')];
    }));
    assert.deepEqual(hits, [['.terminal-nav a', true, false], ['.brand', true, false]], 'clicks reach content, not the bezel');
    // The flicker loop pauses while the Watcher is scrolled away and resumes when it is back.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(() => document.querySelector('.watcher').hasAttribute('data-offscreen'));
    assert.equal(await page.locator('.watcher-flicker').evaluate(el => getComputedStyle(el).animationPlayState), 'paused', 'flicker pauses off-screen');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => !document.querySelector('.watcher').hasAttribute('data-offscreen'));
    assert.equal(await page.locator('.watcher-flicker').evaluate(el => getComputedStyle(el).animationPlayState), 'running', 'flicker resumes on-screen');
    // Keyboard, not click: a mouse click hovers first, which opens the shop ad, and the click would then close it.
    await page.getByRole('button', { name: 'Requisitions / shop 03 / requisitions.exe', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.promo-window h2').first().evaluate(el => getComputedStyle(el).textShadow), 'none', 'the Win95 promo headline has no glow');
    await visit(page, base + '/projects/blushland');
    assert.deepEqual(await page.locator('.project-application .lede').first().evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).textShadow]),
      ['rgb(51, 51, 51)', 'none'], 'project-window descriptions stay dark grey (.retro-window-body p) without glow');
    await visit(page, base + '/projects/blushland/equipment/fixture-scanner');
    assert.match(await page.locator('.equipment-panel p').first().evaluate(el => getComputedStyle(el).textShadow), /2\.8px/, 'the equipment panel keeps body glow');
    await context.close();

    // The boot/announcement window body is terminal text: its headline keeps the glow.
    const boot = await open({}, { boot: true, crt: 'on' });
    await boot.page.goto(base + '/');
    await boot.page.getByRole('button', { name: 'ENTER', exact: true }).waitFor();
    assert.match(await boot.page.locator('.startup-announcement h2').evaluate(el => getComputedStyle(el).textShadow), /18px/, 'the announcement headline keeps its glow');
    await boot.context.close();

    // Jitter: watched for 10.5s at once in "on", "off" and under reduced motion.
    const watch = async (options, modes) => {
      const run = await open(options, modes);
      await visit(run.page, base + '/');
      await run.page.evaluate(() => {
        const el = document.querySelector('.watcher-jitter');
        window.__jitters = []; let started = 0;
        new MutationObserver(() => {
          if (el.dataset.jitter) { started = performance.now(); window.__jitters.push({ side: el.dataset.jitter, at: started, ms: null, x: new DOMMatrix(getComputedStyle(el).transform).m41 }); }
          else if (window.__jitters.length) window.__jitters.at(-1).ms = performance.now() - started;
        }).observe(el, { attributes: true, attributeFilter: ['data-jitter'] });
      });
      return run;
    };
    const watched = await Promise.all([watch({}, { crt: 'on' }), watch({}, { crt: 'off' }), watch({ reducedMotion: 'reduce' }, { crt: 'on' })]);
    await new Promise(resolve => setTimeout(resolve, 10500));
    // Let a jitter that started at the very end finish its 90ms before reading.
    await new Promise(resolve => setTimeout(resolve, 300));
    const [jOn, jOff, jMotion] = await Promise.all(watched.map(run => run.page.evaluate(() => window.__jitters)));
    await Promise.all(watched.map(run => run.context.close()));
    assert.ok(jOn.length >= 1, 'the Watcher jitters within 10.5s in "on"');
    assert.ok(jOn.every(j => ['left', 'right'].includes(j.side) && j.ms !== null && j.ms < 250), 'each jitter snaps back within ~90ms');
    assert.ok(jOn.every(j => Math.abs(j.x) === 2 && (j.side === 'left') === (j.x < 0)), 'each jitter moves the art exactly 2px, left or right');
    assert.ok(jOn.every((j, i) => i === 0 || j.at - jOn[i - 1].at >= 3400), 'jitters are at least 3.5s apart');
    assert.deepEqual([jOff.length, jMotion.length], [0, 0], 'no jitter in "off" or under reduced motion');
    pass('CRT modes: glow per mode/phosphor/context, vignette, scanlines, bezel, flicker and jitter gating');
  }

  // 6. Review screenshots: four sizes, both phosphors, CRT on and off.
  for (const [size, width, height] of [['1366', 1366, 768], ['1440', 1440, 900], ['390', 390, 844], ['320', 320, 640]]) for (const phosphor of ['green', 'amber']) {
    const { context, page } = await open({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 }, { phosphor });
    for (const [label, route] of [['home', '/'], ['scanner', '/projects/blushland/equipment/fixture-scanner']]) {
      await visit(page, base + route);
      await page.waitForTimeout(600);
      for (const crt of ['on', 'off']) {
        await page.evaluate(value => { document.documentElement.dataset.crt = value; }, crt);
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(out, `${label}-${size}-${phosphor}-crt-${crt}.png`) });
      }
    }
    await context.close();
  }
  pass('screenshots written to ' + out);
  assert.deepEqual(errors, [], 'no page errors');
} finally {
  await browser.close();
}
