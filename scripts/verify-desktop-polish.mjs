// Win95 desktop polish (P2-2, batch 27) against a running seeded fixture (npm run test:regression starts one; so does
// node scripts/serve-fixture.mjs). Never point it at production.
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-desktop-polish.mjs
// Checks: the stepping zoom outline starts at the clicked item's box and ends at the window, 7 frames over ~280 ms, and
// is removed after; it never takes pointer input or focus. Every open window has a taskbar button (named by the window,
// pressed while active; pressing the active one minimizes it with an outline to the button). Closing a window plays the
// outline window → its button; closing the route's window goes back to the terminal with the reverse. Phones: the
// window slides up as a sheet, no outline, no extra terminal button. Reduced motion, MOTION: REDUCED, the plain view
// and CRT "reduced" / "off": no outline and no sheet. ModeSwitch's window listeners are not duplicated by navigation.
// 27b: minimizing the Art Viewer from its taskbar button keeps focus there; at 390 two window buttons are fully
// visible; the comic reader as the route window turns pages with ←/→ after the sheet and closes back to /.
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
const out = path.resolve('test-results/desktop-polish');
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const policies = require('./policy-watch.cjs').watchBrowser(browser);
const announcementKey = 'migrainz-announcement:studio-transmission-001';
const errors = [];
const pass = message => console.log('PASS ' + message);
const FORWARD = ['print', 'collapse', 'line', 'black', 'reveal', 'idle'];

const open = async ({ width = 1366, height = 768, reducedMotion = 'no-preference', storage = [] } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addInitScript(([key, storage]) => {
    try {
      sessionStorage.setItem(key, 'studio-transmission-001');
      for (const [name, value] of storage) localStorage.setItem(name, value);
    } catch {}
    window.__stages = [];
    addEventListener('migrainz:mode-stage', event => { window.__stages.push(event.detail); });
    // Every zoom outline and phone sheet, as it starts and ends.
    window.__zoom = []; window.__sheets = [];
    const box = element => { const { x, y, width, height } = element.getBoundingClientRect(); return [x, y, width, height].map(Math.round); };
    new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement) || !node.classList.contains('zoom-outline')) continue;
          const frames = [...node.children];
          const centre = frames.at(-1).getBoundingClientRect();
          const hit = document.elementFromPoint(centre.x + centre.width / 2, centre.y + centre.height / 2);
          node.__entry = {
            kind: node.dataset.kind, from: node.dataset.from, to: node.dataset.to, frames: frames.length,
            first: box(frames[0]), last: box(frames.at(-1)), delays: frames.map(frame => getComputedStyle(frame).animationDelay),
            pointer: getComputedStyle(node).pointerEvents, hidden: node.getAttribute('aria-hidden'), focusable: node.querySelectorAll('[tabindex], a, button').length,
            hit: Boolean(hit?.closest('.zoom-outline')), active: document.activeElement?.closest('.zoom-outline') ? 'outline' : 'page', added: performance.now(),
          };
          window.__zoom.push(node.__entry);
        }
        for (const node of record.removedNodes) if (node.__entry) node.__entry.removed = performance.now();
        if (record.type === 'attributes' && record.target.dataset.sheet === 'in') {
          window.__sheets.push({ id: record.target.dataset.windowId, animations: record.target.getAnimations().length, transform: getComputedStyle(record.target).transform });
        }
      }
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-sheet'] });
  }, [announcementKey, storage]);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
};
const idle = page => page.locator('.mode-switch').waitFor({ state: 'hidden' });
const reset = page => page.evaluate(() => { window.__stages = []; window.__zoom = []; window.__sheets = []; });
const zooms = page => page.evaluate(() => window.__zoom);
const settle = page => page.waitForFunction(() => !document.querySelector('.zoom-outline'), null, { timeout: 5000 });
const near = (a, b, slack, label) => a.forEach((value, index) => assert.ok(Math.abs(value - b[index]) <= slack, `${label}: ${a} vs ${b}`));
const numbers = text => text.split(',').map(Number);
const dockButtons = page => page.locator('.public-window-dock button[data-window-id]').evaluateAll(buttons => buttons.map(button => ({ id: button.dataset.windowId, name: button.getAttribute('aria-label'), pressed: button.getAttribute('aria-pressed') })));
// Window listeners registered by the page for one event type (Chrome DevTools Protocol).
const windowListeners = async (page, type) => {
  const client = await page.context().newCDPSession(page);
  const { result } = await client.send('Runtime.evaluate', { expression: 'window' });
  const { listeners } = await client.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
  await client.detach();
  return listeners.filter(listener => listener.type === type).length;
};

try {
  // 1. Desktop: outline from the clicked item to the window; taskbar buttons; minimize, close, close the route window.
  {
    const { page, context } = await open();
    // The fixture runs `next dev`: compile the routes first so timings are not first-compile ones.
    for (const route of ['/projects', '/projects/blushland/equipment/fixture-satchel', '/']) await page.goto(base + route);
    await page.locator('.home-screen').waitFor();
    const baseline = { close: await windowListeners(page, 'migrainz:close-route'), open: await windowListeners(page, 'migrainz:open-route') };
    assert.equal(baseline.close, 1, 'ModeSwitch listens for close-route');
    const link = page.locator('.terminal-nav a[data-channel="projects"]');
    const clicked = await link.boundingBox();
    await reset(page);
    await link.click();
    await page.waitForURL(/\/projects$/);
    await idle(page);
    await settle(page);
    assert.deepEqual(await page.evaluate(() => window.__stages), FORWARD, 'the switch itself is unchanged');
    const [outline, ...more] = await zooms(page);
    assert.equal(more.length, 0, 'one outline on open');
    assert.equal(outline.kind, 'open');
    near(numbers(outline.from), [clicked.x, clicked.y, clicked.width, clicked.height], 2, 'outline starts at the clicked item');
    near(outline.first, numbers(outline.from), 2, 'first frame is the clicked box');
    const windowBox = await page.locator('.project-application').boundingBox();
    near(outline.last, [windowBox.x, windowBox.y, windowBox.width, windowBox.height], 2, 'last frame is the window');
    assert.equal(outline.frames, 7, '7 frames (steps(7))');
    assert.deepEqual(outline.delays, ['0s', '0.04s', '0.08s', '0.12s', '0.16s', '0.2s', '0.24s'], '40 ms a frame, 280 ms in all');
    assert.ok(outline.removed && outline.removed - outline.added >= 250 && outline.removed - outline.added < 1500, `outline removed after it played (${outline.removed - outline.added} ms)`);
    assert.equal(outline.pointer, 'none', 'outline takes no pointer input');
    assert.equal(outline.hit, false, 'clicks go through the outline');
    assert.equal(outline.hidden, 'true', 'outline hidden from screen readers');
    assert.equal(outline.focusable, 0, 'nothing focusable in the outline');
    assert.equal(outline.active, 'page', 'focus never in the outline');
    assert.equal(await page.locator('.zoom-outline').count(), 0, 'no outline left behind');
    pass('open: 7-frame outline from the clicked item to the window, removed after, no input or focus');

    // Taskbar: one button per open window, the active one pressed.
    await page.goto(base + '/projects/blushland/equipment/fixture-satchel');
    await page.locator('.project-application').waitFor();
    await page.getByRole('button', { name: /OPEN IN ART VIEWER/i }).click();
    await page.locator('.art-viewer-window').waitFor();
    let buttons = await dockButtons(page);
    assert.equal(buttons.length, 2, `two open windows, two taskbar buttons (${JSON.stringify(buttons)})`);
    const projectButton = buttons.find(button => button.id !== 'art-viewer');
    assert.deepEqual(buttons.map(button => button.pressed).sort(), ['false', 'true'], 'one pressed (the active window)');
    assert.equal(buttons.find(button => button.id === 'art-viewer').pressed, 'true', 'the viewer, just opened, is active');
    const projectTab = page.locator(`.public-window-dock button[data-window-id="${projectButton.id}"]`);
    assert.equal(await page.getByRole('button', { name: projectButton.name, exact: true }).count(), 1, 'the button is named by its window');
    assert.equal(await page.locator('.public-window-dock [role="group"]').getAttribute('aria-label'), 'Open windows');
    await page.screenshot({ path: path.join(out, 'taskbar-1366.png') });
    // Keyboard: Tab to the project's button and press it: that window comes to the front and its button is pressed.
    await projectTab.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(id => document.querySelector(`.public-window-dock button[data-window-id="${id}"]`)?.getAttribute('aria-pressed') === 'true', projectButton.id);
    assert.equal((await dockButtons(page)).find(button => button.id === 'art-viewer').pressed, 'false');
    pass('taskbar: a button per open window, named by it, pressed while active, keyboard works');

    // Pressing the active window's button minimizes it with an outline window → button; focus stays on the button.
    const before = await page.locator('.project-application').boundingBox();
    const tabBox = await projectTab.boundingBox();
    await reset(page);
    await projectTab.focus();
    await page.keyboard.press('Enter');
    await page.locator('.project-application').waitFor({ state: 'detached' });
    await settle(page);
    const [minimize] = await zooms(page);
    assert.equal(minimize?.kind, 'minimize', 'minimize plays the outline');
    near(numbers(minimize.from), [before.x, before.y, before.width, before.height], 2, 'minimize outline starts at the window');
    near(numbers(minimize.to), [tabBox.x, tabBox.y, tabBox.width, tabBox.height], 2, 'minimize outline ends at its button');
    assert.equal(await projectTab.getAttribute('aria-pressed'), 'false', 'minimized: not pressed');
    assert.equal(await page.evaluate(id => document.activeElement?.dataset.windowId, projectButton.id), projectButton.id, 'focus stays on the button');
    pass('pressing the active button minimizes it: outline window → button');

    // Closing the viewer: outline window → its button, then the button goes.
    const viewerTab = page.locator('.public-window-dock button[data-window-id="art-viewer"]');
    const viewerTabBox = await viewerTab.boundingBox();
    await reset(page);
    await page.getByRole('button', { name: 'Close ART VIEWER', exact: true }).click();
    await viewerTab.waitFor({ state: 'detached' });
    await settle(page);
    const [close] = await zooms(page);
    assert.equal(close?.kind, 'close', 'close plays the outline');
    near(numbers(close.to), [viewerTabBox.x, viewerTabBox.y, viewerTabBox.width, viewerTabBox.height], 2, 'close outline ends at the window\'s button');
    pass('close: outline window → its taskbar button, then the button goes');

    // Closing the route's window: outline to its button, then the reverse switch back to the terminal.
    await projectTab.click();
    await page.locator('.project-application').waitFor();
    await reset(page);
    await page.getByRole('button', { name: /^Close PROJECT/ }).click();
    await page.waitForURL(url => new URL(url).pathname === '/');
    await idle(page);
    await settle(page);
    const stages = await page.evaluate(() => window.__stages);
    assert.deepEqual(stages, ['rblack', 'rline', 'ropen', 'idle'], `closing the route window plays the reverse (${stages})`);
    assert.equal((await zooms(page))[0]?.kind, 'close', 'outline before the reverse');
    assert.notEqual(await page.evaluate(() => document.activeElement), null);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'top', 'focus lands on the page, not <body>');
    pass('closing the route window: outline, then the reverse to the terminal');

    // Listener cleanup: after several switches and page loads the window holds as many listeners as at the start.
    assert.deepEqual({ close: await windowListeners(page, 'migrainz:close-route'), open: await windowListeners(page, 'migrainz:open-route') }, baseline, 'no listeners piled up');
    pass('listeners: none piled up after several switches');
    await context.close();
  }

  // 2. Phones: the full switch, then the window sheet slides up; no outline; no extra terminal button.
  {
    const { page, context } = await open({ width: 390, height: 844 });
    for (const route of ['/projects', '/']) await page.goto(base + route);
    await page.locator('.home-screen').waitFor();
    await reset(page);
    await page.locator('.terminal-nav a[data-channel="projects"]').click();
    await page.waitForURL(/\/projects$/);
    await idle(page);
    await page.waitForFunction(() => !document.querySelector('[data-sheet]'), null, { timeout: 5000 });
    assert.deepEqual(await page.evaluate(() => window.__stages), FORWARD, 'phones: the full switch plays');
    const sheets = await page.evaluate(() => window.__sheets);
    assert.equal(sheets.length, 1, 'one sheet');
    assert.ok(sheets[0].animations >= 1, 'the window is animated');
    assert.notEqual(sheets[0].transform, 'none', 'the window starts moved down');
    assert.equal((await zooms(page)).filter(zoom => zoom.kind === 'open').length, 0, 'no opening outline on phones');
    assert.equal(await page.locator('.project-application').evaluate(el => getComputedStyle(el).transform), 'none', 'no transform left after the slide');
    assert.equal(await page.locator('.public-window-dock a').count(), 1, 'only ◂ TERMINAL as a link in the taskbar (no extra Terminal button)');
    const tab = page.locator('.public-window-dock button[data-window-id]');
    assert.equal(await tab.count(), 1);
    assert.ok((await tab.boundingBox()).height >= 44, 'window button is a 44px touch target');
    assert.ok(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), 'no sideways scroll at 390');
    pass('phones: full switch, sheet slides up, no outline, no extra terminal button');
    await context.close();
  }

  // 1b (27b). Minimizing the Art Viewer from its own taskbar button keeps focus on that button, also where a click
  // gives the button no focus (Safari: focus is still in the viewer, so the old hand-back sent it to the opener).
  {
    const { page, context } = await open();
    await page.goto(base + '/projects/blushland/equipment/fixture-satchel');
    await page.locator('.project-application').waitFor();
    const viewerTab = page.locator('.public-window-dock button[data-window-id="art-viewer"]');
    await page.getByRole('button', { name: /OPEN IN ART VIEWER/i }).click();
    for (const how of ['click', 'click without focus']) {
      await page.locator('.art-viewer-window').waitFor();
      await page.waitForFunction(() => document.querySelector('.public-window-dock button[data-window-id="art-viewer"]')?.getAttribute('aria-pressed') === 'true');
      if (how === 'click') await viewerTab.click();
      else {
        await page.locator('.art-viewer-window .art-viewer-canvas').first().focus();
        await viewerTab.dispatchEvent('click');
      }
      await page.locator('.art-viewer-window').waitFor({ state: 'detached' }).catch(() => {});
      await page.waitForFunction(() => document.querySelector('.public-window-dock button[data-window-id="art-viewer"]')?.getAttribute('aria-pressed') === 'false');
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.windowId), 'art-viewer', `${how}: focus stays on the viewer's taskbar button`);
      await viewerTab.click(); // restore for the next round
    }
    await page.locator('.art-viewer-window').waitFor();
    pass('27b: minimizing the Art Viewer from its taskbar button keeps focus on the button');
    await context.close();
  }

  // 2b (27b). Phones: two windows fit the taskbar (every button fully visible); the reader as the route window: ←/→ turn
  // pages after the sheet slides up, and closing it goes back to the terminal.
  {
    const { page, context } = await open({ width: 390, height: 844 });
    await page.goto(base + '/projects/blushland/equipment/fixture-satchel');
    await page.locator('.project-application').waitFor();
    await page.getByRole('button', { name: /OPEN IN ART VIEWER/i }).click();
    await page.locator('.art-viewer-window').waitFor();
    await page.waitForTimeout(300);
    const fit = await page.evaluate(() => {
      const bar = document.querySelector('.public-window-dock .window-taskbar');
      const dock = document.querySelector('.public-window-dock').getBoundingClientRect();
      const box = bar.getBoundingClientRect();
      const buttons = [...bar.querySelectorAll('button')].map(button => { const r = button.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, text: button.textContent }; });
      return { buttons, scrolls: bar.scrollWidth > bar.clientWidth + 1, bar: { left: box.left, right: box.right }, dock: { left: dock.left, right: dock.right } };
    });
    assert.equal(fit.buttons.length, 2, `two window buttons (${JSON.stringify(fit)})`);
    assert.ok(!fit.scrolls, `390: the window buttons fit without scrolling (${JSON.stringify(fit)})`);
    for (const button of fit.buttons) assert.ok(button.left >= fit.bar.left - 0.5 && button.right <= fit.bar.right + 0.5 && button.right <= 390 && button.width >= 60, `390: button fully visible (${JSON.stringify(button)})`);
    await mkdir(path.resolve('test-results/batch-28'), { recursive: true });
    await page.screenshot({ path: path.resolve('test-results/batch-28/taskbar-390-two-windows.png') });
    pass('27b: 390 with two windows: every taskbar button fully visible');
    await context.close();
  }
  {
    const { page, context } = await open({ width: 390, height: 844 });
    for (const route of ['/comics/blushland/chapter-01', '/']) await page.goto(base + route);
    await page.locator('.home-screen').waitFor();
    await reset(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('migrainz:open-route', { cancelable: true, detail: { href: '/comics/blushland/chapter-01' } })));
    await page.waitForURL(/\/comics\/blushland\/chapter-01$/);
    await idle(page);
    await page.waitForFunction(() => !document.querySelector('[data-sheet]'), null, { timeout: 5000 });
    assert.equal((await page.evaluate(() => window.__sheets)).length, 1, 'the reader slides up as a sheet');
    const counter = page.locator('.comic-reader-navigation output');
    await page.locator('.comic-page-stage .art-viewer-canvas').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.comic-reader-navigation output')?.textContent === 'PAGE 2 / 3');
    await page.waitForFunction(() => document.querySelector('.page-flip')?.hidden !== false);
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.querySelector('.comic-reader-navigation output')?.textContent === 'PAGE 1 / 3');
    assert.equal(await counter.textContent(), 'PAGE 1 / 3');
    await page.getByRole('button', { name: /^Close COMIC READER/ }).click();
    await page.waitForURL(url => new URL(url).pathname === '/');
    await idle(page);
    assert.equal(await page.locator('.comic-reader-window').count(), 0, 'the reader is gone');
    pass('27b: 390 reader route window: ←/→ turn pages after the sheet; closing goes back to /');
    await context.close();
  }

  // 3. Off: reduced motion, MOTION: REDUCED, plain view, CRT reduced and off: no outline, no sheet.
  for (const setup of [{ reducedMotion: 'reduce' }, { storage: [['migrainz-motion', 'reduced']] }, { storage: [['migrainz-view', 'plain']] }, { storage: [['crt-effects', 'off']] }, { storage: [['crt-effects', 'reduced']] }]) {
    for (const width of [1366, 390]) {
      const { page, context } = await open({ ...setup, width, height: width > 700 ? 768 : 844 });
      for (const route of ['/projects', '/']) await page.goto(base + route);
      await page.locator('.home-screen').waitFor();
      await reset(page);
      await page.locator('.terminal-nav a[data-channel="projects"]').click();
      await page.waitForURL(/\/projects$/);
      await idle(page);
      await page.getByRole('button', { name: /^Close PROJECT/ }).click();
      await page.waitForURL(url => new URL(url).pathname === '/');
      await idle(page);
      await page.waitForTimeout(400);
      assert.deepEqual(await zooms(page), [], `${JSON.stringify(setup)} at ${width}: no outline`);
      assert.deepEqual(await page.evaluate(() => window.__sheets), [], `${JSON.stringify(setup)} at ${width}: no sheet`);
      await context.close();
    }
  }
  pass('reduced motion, MOTION: REDUCED, plain view, CRT reduced/off: no outline, no sheet');

  assert.deepEqual(errors, [], 'no page errors');
  await policies.check();
  console.log('verify-desktop-polish: all checks passed');
} finally {
  await browser.close();
}
